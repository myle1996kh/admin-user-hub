import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type PresenceStatus = "online" | "away" | "busy" | "offline";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30s

/**
 * Manages supporter online/offline presence for a given org.
 * - Upserts supporter_presence on mount → sets "online"
 * - Sends heartbeat every 30s
 * - Sets "offline" on unmount / beforeunload
 * - Exposes status toggle for the supporter to manually change
 */
export const usePresence = (supporterId: string | undefined, organizationId: string | undefined) => {
  const [status, setStatusState] = useState<PresenceStatus>("online");
  const statusRef = useRef<PresenceStatus>("online");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const upsertPresence = useCallback(
    async (newStatus: PresenceStatus) => {
      if (!supporterId || !organizationId) return;
      await supabase
        .from("supporter_presence")
        .upsert(
          {
            supporter_id: supporterId,
            organization_id: organizationId,
            status: newStatus,
            last_heartbeat: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "supporter_id" }
        );
    },
    [supporterId, organizationId]
  );

  /** Toggle status — called from UI */
  const setPresenceStatus = useCallback(
    (newStatus: PresenceStatus) => {
      statusRef.current = newStatus;
      setStatusState(newStatus);
      upsertPresence(newStatus);
    },
    [upsertPresence]
  );

  useEffect(() => {
    if (!supporterId || !organizationId) return;

    // Set online on mount
    upsertPresence("online");
    statusRef.current = "online";
    setStatusState("online");

    // Heartbeat — update last_heartbeat keeping current status
    intervalRef.current = setInterval(() => {
      upsertPresence(statusRef.current);
    }, HEARTBEAT_INTERVAL_MS);

    // Set offline on page close
    const handleUnload = () => {
      // Synchronous: use sendBeacon so it fires even as page closes
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/supporter_presence`;
      const body = JSON.stringify({
        supporter_id: supporterId,
        organization_id: organizationId,
        status: "offline",
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      navigator.sendBeacon(
        url + `?supporter_id=eq.${supporterId}`,
        new Blob([body], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleUnload);
      // Best-effort offline on unmount
      upsertPresence("offline");
    };
  }, [supporterId, organizationId, upsertPresence]);

  return { status, setPresenceStatus };
};
