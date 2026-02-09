import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { InboxList } from "@/components/admin/InboxList";
import { ChatPanel } from "@/components/admin/ChatPanel";
import { ContextPanel } from "@/components/admin/ContextPanel";
import { KnowledgeBase } from "@/components/admin/KnowledgeBase";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const { user, organization, membership, loading, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"inbox" | "knowledge" | "settings">("inbox");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  const isAdmin = membership?.role === "admin";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    // Super admin without org → redirect to super admin page
    if (!loading && user && !organization && isSuperAdmin) {
      navigate("/super-admin");
      return;
    }
  }, [user, organization, loading, isSuperAdmin, navigate]);

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

  if (!user) return null;

  // No organization - show waiting message
  if (!organization) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl echo-gradient-bg mx-auto mb-4">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Chào mừng đến với Echo</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Tài khoản của bạn chưa được gán vào tổ chức nào. Vui lòng liên hệ quản trị viên để được thêm vào tổ chức.
          </p>
          <button
            onClick={async () => { await signOut(); navigate("/auth"); }}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />
      
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

      {activeTab === "knowledge" && isAdmin && <KnowledgeBase organizationId={organization.id} />}
      {activeTab === "settings" && isAdmin && <SettingsPanel organization={organization} membership={membership} />}
    </div>
  );
};

export default AdminDashboard;
