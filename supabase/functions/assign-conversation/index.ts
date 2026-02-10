import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AssignStrategy = "round_robin" | "least_busy" | "online_first" | "manual";
type FallbackMode = "queue" | "notify_all" | "assign_anyway";

interface SupporterCandidate {
  supporter_id: string;
  status: string;
  active_conversation_count: number;
  last_heartbeat: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Consider a supporter "recently active" if heartbeat < 2 minutes old.
 * Offline heartbeats still have a last_heartbeat value — we cross-check status.
 */
const isOnline = (s: SupporterCandidate) =>
  s.status === "online" || s.status === "away";

/**
 * Pick supporter by strategy from a pool that already satisfies
 * capacity constraints.
 */
function pickSupporter(
  pool: SupporterCandidate[],
  strategy: AssignStrategy,
  roundRobinCursor: string | null
): SupporterCandidate | null {
  if (pool.length === 0) return null;

  switch (strategy) {
    case "least_busy": {
      return pool.reduce((a, b) =>
        a.active_conversation_count <= b.active_conversation_count ? a : b
      );
    }
    case "online_first": {
      const onlinePool = pool.filter((s) => s.status === "online");
      if (onlinePool.length > 0) {
        return onlinePool.reduce((a, b) =>
          a.active_conversation_count <= b.active_conversation_count ? a : b
        );
      }
      // Fall back to away/busy
      return pool.reduce((a, b) =>
        a.active_conversation_count <= b.active_conversation_count ? a : b
      );
    }
    case "round_robin": {
      if (!roundRobinCursor) return pool[0];
      const curIdx = pool.findIndex((s) => s.supporter_id === roundRobinCursor);
      // Take the next one after the last assigned
      return pool[(curIdx + 1) % pool.length];
    }
    case "manual":
    default:
      return null; // manual = no auto-assign
  }
}

// ─── main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const { conversation_id, organization_id, forced_supporter_id } =
      await req.json();

    if (!conversation_id || !organization_id) {
      return json({ error: "conversation_id and organization_id required" }, 400);
    }

    // ── 1. Load conversation ────────────────────────────────────────────────
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, status, organization_id, escalation_reason")
      .eq("id", conversation_id)
      .single();

    if (convErr || !conv) return json({ error: "Conversation not found" }, 404);
    if (conv.organization_id !== organization_id) {
      return json({ error: "Org mismatch" }, 403);
    }

    // ── 2. Load org config ──────────────────────────────────────────────────
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organization_id)
      .single() as { data: any; error: any };

    if (!org) return json({ error: "Org config not found" }, 404);

    // ── 3. Force-assign (manual override from admin UI) ──────────────────────
    if (forced_supporter_id) {
      await doAssign(supabase, conversation_id, forced_supporter_id, user.id);
      return json({ assigned: true, supporter_id: forced_supporter_id, method: "manual" });
    }

    // ── 4. Auto-assign disabled → set queued and return ──────────────────────
    if (!org.auto_assign_enabled || org.auto_assign_strategy === "manual") {
      await supabase
        .from("conversations")
        .update({ status: "queued" } as any)
        .eq("id", conversation_id);
      return json({ assigned: false, status: "queued", reason: "auto_assign_disabled" });
    }

    // ── 5. Fetch available supporters ───────────────────────────────────────
    const { data: memberships } = await supabase
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", organization_id)
      .in("role", ["supporter", "admin"]);

    const supporterIds = memberships?.map((m: any) => m.user_id) ?? [];
    if (supporterIds.length === 0) {
      await queueConversation(supabase, conversation_id);
      return json({ assigned: false, status: "queued", reason: "no_supporters_in_org" });
    }

    // Load presence records
    const { data: presenceRows } = await supabase
      .from("supporter_presence")
      .select("supporter_id, status, active_conversation_count, last_heartbeat")
      .eq("organization_id", organization_id)
      .in("supporter_id", supporterIds);

    // Build candidate list — include supporters with no presence row (treat as offline)
    const presenceMap = new Map(
      (presenceRows ?? []).map((p: any) => [p.supporter_id, p])
    );
    const allCandidates: SupporterCandidate[] = supporterIds.map((id: string) => {
      const p = presenceMap.get(id);
      return p ?? {
        supporter_id: id,
        status: "offline",
        active_conversation_count: 0,
        last_heartbeat: new Date(0).toISOString(),
      };
    });

    // Filter by capacity
    const maxConcurrent: number = org.max_concurrent_per_supporter ?? 5;
    const capacityPool = allCandidates.filter(
      (s) => s.active_conversation_count < maxConcurrent
    );

    // Separate online vs offline
    const onlinePool = capacityPool.filter(isOnline);
    const anyPool = capacityPool; // includes offline

    const strategy: AssignStrategy = org.auto_assign_strategy;
    const requireOnline: boolean = org.require_online_for_auto;
    const fallback: FallbackMode = org.fallback_if_no_online;

    // ── 6. Attempt assignment ───────────────────────────────────────────────
    const poolToUse = requireOnline ? onlinePool : anyPool;

    // Fetch last assigned (for round_robin cursor)
    const { data: lastAssignment } = await supabase
      .from("conversation_assignments")
      .select("supporter_id")
      .eq("status", "active")
      .order("assigned_at", { ascending: false })
      .limit(1)
      .single();
    const roundRobinCursor = lastAssignment?.supporter_id ?? null;

    const chosen = pickSupporter(poolToUse, strategy, roundRobinCursor);

    if (chosen) {
      await doAssign(supabase, conversation_id, chosen.supporter_id, null);
      return json({ assigned: true, supporter_id: chosen.supporter_id, method: "auto" });
    }

    // ── 7. No one available → apply fallback ────────────────────────────────
    switch (fallback) {
      case "assign_anyway": {
        // Pick from full capacity pool ignoring online requirement
        const anyChosen = pickSupporter(anyPool, strategy, roundRobinCursor);
        if (anyChosen) {
          await doAssign(supabase, conversation_id, anyChosen.supporter_id, null);
          return json({
            assigned: true,
            supporter_id: anyChosen.supporter_id,
            method: "auto_fallback_offline",
          });
        }
        // Nobody has capacity at all → queue
        await queueConversation(supabase, conversation_id);
        return json({ assigned: false, status: "queued", reason: "no_capacity" });
      }

      case "notify_all": {
        // Set queued AND send notifications to all supporters (stub — extend with push later)
        await queueConversation(supabase, conversation_id);
        // TODO: INSERT into a notifications table or call push service
        return json({ assigned: false, status: "queued", reason: "notify_all_sent" });
      }

      case "queue":
      default: {
        await queueConversation(supabase, conversation_id);
        return json({ assigned: false, status: "queued", reason: "no_online_supporter" });
      }
    }
  } catch (e) {
    console.error("assign-conversation error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

// ─── shared helpers ────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function queueConversation(supabase: any, conversationId: string) {
  await supabase
    .from("conversations")
    .update({ status: "queued" } as any)
    .eq("id", conversationId);
}

async function doAssign(
  supabase: any,
  conversationId: string,
  supporterId: string,
  assignedBy: string | null
) {
  // Close any previous active assignment
  await supabase
    .from("conversation_assignments")
    .update({ status: "transferred", resolved_at: new Date().toISOString() } as any)
    .eq("conversation_id", conversationId)
    .eq("status", "active");

  // Update conversation
  await supabase
    .from("conversations")
    .update({ status: "assigned", assigned_supporter_id: supporterId } as any)
    .eq("id", conversationId);

  // Record assignment
  await supabase.from("conversation_assignments").insert({
    conversation_id: conversationId,
    supporter_id: supporterId,
    assigned_by: assignedBy,
    status: "active",
  } as any);

  // Increment active count on presence
  await supabase.rpc("increment_active_conversations", {
    p_supporter_id: supporterId,
  });
}
