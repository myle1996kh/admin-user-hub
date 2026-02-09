import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { conversationId, sessionId, message } = await req.json();

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from("contact_sessions")
      .select("id, organization_id")
      .eq("id", sessionId)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session expired or invalid" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate conversation belongs to session
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, status, organization_id")
      .eq("id", conversationId)
      .eq("contact_session_id", sessionId)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: "Invalid conversation" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save user message
    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
      content_type: "text",
    });

    if (msgError) {
      console.error("Message insert error:", msgError);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If conversation is escalated, don't auto-respond with AI
    if (conversation.status === "escalated") {
      return new Response(JSON.stringify({ aiResponse: null, escalated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get conversation history for AI context
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Get knowledge base docs for the org
    const { data: kbDocs } = await supabase
      .from("knowledge_base_documents")
      .select("title, content")
      .eq("organization_id", conversation.organization_id)
      .limit(5);

    const kbContext = kbDocs?.map(d => `[${d.title}]: ${d.content}`).join("\n") || "";

    // Get org settings
    const { data: org } = await supabase
      .from("organizations")
      .select("ai_model, name")
      .eq("id", conversation.organization_id)
      .single();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a helpful AI customer support assistant for "${org?.name || "the company"}". 
Be professional, concise, and helpful. Answer in the same language as the customer.

${kbContext ? `Knowledge Base:\n${kbContext}\n\nUse the knowledge base to answer questions accurately.` : ""}

IMPORTANT: If the customer expresses strong negative sentiment, frustration, or explicitly asks to speak to a human agent, respond with exactly: [ESCALATE]
Otherwise, provide helpful answers.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: org?.ai_model || "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI response failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let aiContent = aiData.choices?.[0]?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";

    // Check for escalation
    let escalated = false;
    if (aiContent.includes("[ESCALATE]")) {
      escalated = true;
      aiContent = "Tôi sẽ chuyển bạn đến nhân viên hỗ trợ trực tiếp. Vui lòng chờ trong giây lát.";
      
      // Update conversation status
      await supabase
        .from("conversations")
        .update({ status: "escalated" })
        .eq("id", conversationId);
    }

    // Save AI response
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: aiContent,
      content_type: "text",
    });

    return new Response(JSON.stringify({ aiResponse: aiContent, escalated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
