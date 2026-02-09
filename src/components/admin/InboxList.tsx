import { Conversation, ContactSession, ConversationStatus } from "@/data/types";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface InboxListProps {
  conversations: Conversation[];
  sessions: ContactSession[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusFilter: ConversationStatus | "all";
  onStatusFilterChange: (status: ConversationStatus | "all") => void;
}

const statusTabs: { id: ConversationStatus | "all"; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "unresolved", label: "Chờ xử lý" },
  { id: "escalated", label: "Cần hỗ trợ" },
  { id: "resolved", label: "Đã xong" },
];

const statusConfig: Record<ConversationStatus, { icon: typeof Clock; className: string }> = {
  unresolved: { icon: Clock, className: "text-echo-warning" },
  escalated: { icon: AlertCircle, className: "text-echo-escalated" },
  resolved: { icon: CheckCircle2, className: "text-echo-success" },
};

const getFlag = (timezone: string) => {
  if (timezone.includes("Ho_Chi_Minh")) return "🇻🇳";
  if (timezone.includes("Los_Angeles") || timezone.includes("New_York")) return "🇺🇸";
  if (timezone.includes("Madrid")) return "🇪🇸";
  if (timezone.includes("London")) return "🇬🇧";
  return "🌍";
};

const timeAgo = (ts: number) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins}p`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

export const InboxList = ({
  conversations,
  sessions,
  selectedId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
}: InboxListProps) => {
  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{conversations.length} hội thoại</p>
      </div>

      {/* Filters */}
      <div className="flex gap-1 border-b border-border p-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onStatusFilterChange(tab.id)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === tab.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => {
          const session = sessions.find((s) => s.id === conv.contactSessionId);
          if (!session) return null;
          const { icon: StatusIcon, className: statusClass } = statusConfig[conv.status];

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors ${
                selectedId === conv.id ? "bg-secondary" : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                {session.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate">
                    {getFlag(session.metadata.timezone)} {session.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(conv.updatedAt)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                <div className="mt-1 flex items-center gap-1">
                  <StatusIcon className={`h-3 w-3 ${statusClass}`} />
                  <span className={`text-[10px] font-medium ${statusClass}`}>
                    {conv.status === "unresolved" ? "AI đang xử lý" : conv.status === "escalated" ? "Cần hỗ trợ" : "Đã giải quyết"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
