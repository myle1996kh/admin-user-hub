import { useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { InboxList } from "@/components/admin/InboxList";
import { ChatPanel } from "@/components/admin/ChatPanel";
import { ContextPanel } from "@/components/admin/ContextPanel";
import { mockConversations, mockSessions } from "@/data/mockData";
import { ConversationStatus } from "@/data/types";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<"inbox" | "knowledge" | "settings">("inbox");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>("c1");

  const filteredConversations = statusFilter === "all"
    ? mockConversations
    : mockConversations.filter((c) => c.status === statusFilter);

  const selectedConversation = mockConversations.find((c) => c.id === selectedConversationId);
  const selectedSession = selectedConversation
    ? mockSessions.find((s) => s.id === selectedConversation.contactSessionId)
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === "inbox" && (
        <>
          <InboxList
            conversations={filteredConversations}
            sessions={mockSessions}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
          
          {selectedConversation ? (
            <>
              <ChatPanel conversation={selectedConversation} session={selectedSession!} />
              <ContextPanel session={selectedSession!} conversation={selectedConversation} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Chọn một hội thoại để bắt đầu
            </div>
          )}
        </>
      )}

      {activeTab === "knowledge" && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Knowledge Base</h2>
            <p>Upload tài liệu để AI tự động học và trả lời chính xác hơn.</p>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Settings</h2>
            <p>Cấu hình API Keys, Model AI, và tùy chỉnh hệ thống.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
