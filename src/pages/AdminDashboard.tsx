import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { InboxList } from "@/components/admin/InboxList";
import { ChatPanel } from "@/components/admin/ChatPanel";
import { ContextPanel } from "@/components/admin/ContextPanel";
import { KnowledgeBase } from "@/components/admin/KnowledgeBase";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const { user, organization, membership, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"inbox" | "knowledge" | "settings">("inbox");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (!loading && user && !organization) {
      navigate("/onboarding");
      return;
    }
  }, [user, organization, loading, navigate]);

  // Fetch conversations
  useEffect(() => {
    if (!organization) return;

    const fetchData = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .eq("organization_id", organization.id)
        .order("updated_at", { ascending: false });

      if (convs) {
        setConversations(convs);
        // Fetch sessions for those conversations
        const sessionIds = [...new Set(convs.map((c: any) => c.contact_session_id))];
        if (sessionIds.length > 0) {
          const { data: sessData } = await supabase
            .from("contact_sessions")
            .select("*")
            .in("id", sessionIds);
          if (sessData) setSessions(sessData);
        }
      }
    };

    fetchData();

    // Realtime subscription for conversations
    const channel = supabase
      .channel("admin-conversations")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `organization_id=eq.${organization.id}`,
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [organization]);

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
      .channel(`msgs-${selectedConversationId}`)
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Đang tải...
        </div>
      </div>
    );
  }

  if (!user || !organization) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === "inbox" && (
        <>
          <InboxList
            conversations={filteredConversations}
            sessions={sessions}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
          
          {selectedConversation && selectedSession ? (
            <>
              <ChatPanel
                conversation={selectedConversation}
                session={selectedSession}
                messages={messages}
              />
              <ContextPanel session={selectedSession} conversation={selectedConversation} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">Inbox</p>
                <p className="text-sm">
                  {conversations.length === 0
                    ? "Chưa có hội thoại nào. Chia sẻ widget cho khách hàng để bắt đầu!"
                    : "Chọn một hội thoại để bắt đầu"}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "knowledge" && <KnowledgeBase organizationId={organization.id} />}
      {activeTab === "settings" && <SettingsPanel organization={organization} membership={membership} />}
    </div>
  );
};

export default AdminDashboard;
