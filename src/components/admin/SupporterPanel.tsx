import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InboxList } from "@/components/admin/InboxList";
import { ChatPanel } from "@/components/admin/ChatPanel";
import { ContextPanel } from "@/components/admin/ContextPanel";
import { usePresence } from "@/hooks/usePresence";
import { Headphones, Circle } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface SupporterPanelProps {
  organizationId: string;
  currentUserId: string;
  scopeMode: "assigned_only" | "all_escalated" | "team_pool";
  isAdmin: boolean;
}

export const SupporterPanel = ({
  organizationId,
  currentUserId,
  scopeMode,
  isAdmin,
}: SupporterPanelProps) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { status: presenceStatus, setPresenceStatus } = usePresence(
    currentUserId,
    organizationId
  );

  // Fetch conversations scoped by supporter role
  useEffect(() => {
    const fetchData = async () => {
      let query = supabase
        .from("conversations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });

      if (scopeMode === "assigned_only" && !isAdmin) {
        // Supporter sees only conversations assigned to them
        query = query.eq("assigned_supporter_id", currentUserId);
      } else if (scopeMode === "all_escalated" && !isAdmin) {
        // All supporters see escalated + queued + assigned
        query = query.in("status", ["escalated", "queued", "assigned"]);
      }
      // scopeMode === "team_pool" or isAdmin: show all escalated/queued/assigned

      if (isAdmin && scopeMode !== "assigned_only") {
        query = query.in("status", ["escalated", "queued", "assigned"]);
      }

      const { data: convs } = await query;
      if (!convs) return;

      setConversations(convs);
      const sessionIds = [...new Set(convs.map((c: any) => c.contact_session_id))];
      if (sessionIds.length > 0) {
        const { data: sessData } = await supabase
          .from("contact_sessions")
          .select("*")
          .in("id", sessionIds);
        if (sessData) setSessions(sessData);
      }
    };

    const fetchMembers = async () => {
      const { data } = await supabase
        .from("organization_memberships")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .in("role", ["admin", "supporter"]);
      if (!data) return;
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      setMembers(
        data.map((m: any) => ({
          ...m,
          profile: profiles?.find((p: any) => p.id === m.user_id),
        }))
      );
    };

    fetchData();
    fetchMembers();

    // Realtime: refresh on any conversation change in this org
    const channel = supabase
      .channel("supporter-conversations")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `organization_id=eq.${organizationId}`,
      }, () => { fetchData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [organizationId, currentUserId, scopeMode, isAdmin]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`supporter-msgs-${selectedConversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as any]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversationId]);

  const filteredConversations = statusFilter === "all"
    ? conversations
    : conversations.filter((c: any) => c.status === statusFilter);

  const selectedConversation = conversations.find((c: any) => c.id === selectedConversationId);
  const selectedSession = selectedConversation
    ? sessions.find((s: any) => s.id === selectedConversation.contact_session_id)
    : null;

  const scopeLabel: Record<string, string> = {
    assigned_only: "Hội thoại của tôi",
    all_escalated: "Queue hỗ trợ",
    team_pool: "Pool nhóm",
  };

  return (
    <>
      <InboxList
        conversations={filteredConversations}
        sessions={sessions}
        selectedId={selectedConversationId}
        onSelect={setSelectedConversationId}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        members={members}
        visibleStatuses={["escalated", "queued", "assigned", "resolved"]}
        headerContent={
          <div className="border-b border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Hỗ trợ</h2>
              </div>
              {/* Presence status toggle */}
              <Select
                value={presenceStatus}
                onValueChange={(v) => setPresenceStatus(v as any)}
              >
                <SelectTrigger className="h-7 w-[110px] text-[11px] border-border px-2">
                  <Circle
                    className={`h-2 w-2 mr-1 fill-current ${
                      presenceStatus === "online" ? "text-echo-success" :
                      presenceStatus === "away"   ? "text-amber-400" :
                      presenceStatus === "busy"   ? "text-echo-escalated" :
                      "text-muted-foreground"
                    }`}
                  />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="away">Vắng mặt</SelectItem>
                  <SelectItem value="busy">Đang bận</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {scopeLabel[scopeMode]} · {conversations.length} hội thoại
            </p>
          </div>
        }
      />

      {/* Chat + Context */}
      {selectedConversation && selectedSession ? (
        <>
          <ChatPanel
            conversation={selectedConversation}
            session={selectedSession}
            messages={messages}
            organizationId={organizationId}
          />
          <ContextPanel session={selectedSession} conversation={selectedConversation} />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Headphones className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-lg font-medium text-foreground">Hỗ trợ khách hàng</p>
            <p className="text-sm mt-1">
              {conversations.length === 0
                ? "Không có hội thoại cần xử lý"
                : "Chọn một hội thoại để bắt đầu hỗ trợ"}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
