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

    const { action, organizationId, name, email, sessionId, os, browser, location, timezone, conversationId: reqConvId, before, limit: reqLimit } = await req.json();

    if (action === "create") {
      // Validate org exists
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, widget_greeting")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) {
        return new Response(JSON.stringify({ error: "Invalid organization" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create contact session
      const { data: session, error: sessionError } = await supabase
        .from("contact_sessions")
        .insert({
          organization_id: organizationId,
          name, email,
          os: os || null,
          browser: browser || null,
          location: location || null,
          timezone: timezone || null,
        })
        .select()
        .single();

      if (sessionError) {
        console.error("Session creation error:", sessionError);
        return new Response(JSON.stringify({ error: "Failed to create session" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create initial conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          contact_session_id: session.id,
          organization_id: organizationId,
          status: "unresolved",
        })
        .select()
        .single();

      if (convError) {
        console.error("Conversation creation error:", convError);
        return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        sessionId: session.id,
        conversationId: conversation.id,
        orgName: org.name,
        greeting: org.widget_greeting,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "restore") {
      // Check if session is still valid
      const { data: session, error } = await supabase
        .from("contact_sessions")
        .select("*, conversations(*)")
        .eq("id", sessionId)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (error || !session) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const conversation = session.conversations?.[0];
      if (!conversation) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get org info
      const { data: org } = await supabase
        .from("organizations")
        .select("name, widget_greeting")
        .eq("id", session.organization_id)
        .single();

      // Get messages
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      return new Response(JSON.stringify({
        valid: true,
        sessionId: session.id,
        conversationId: conversation.id,
        orgName: org?.name,
        messages: messages || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "load_messages") {
      // Paginated loading of older messages
      const pageLimit = reqLimit || 20;
      let query = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", reqConvId)
        .order("created_at", { ascending: false })
        .limit(pageLimit);

      if (before) {
        query = query.lt("created_at", before);
      }

      const { data: msgs, error: msgErr } = await query;
      if (msgErr) {
        return new Response(JSON.stringify({ error: "Failed to load messages" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        messages: (msgs || []).reverse(),
        hasMore: (msgs || []).length === pageLimit,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-session error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
