interface InboxListProps {
  conversations: any[];
  sessions: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  members?: { user_id: string; profile?: { full_name: string; email: string } }[];
}

const statusTabs = [
  { id: "all", label: "Tất cả" },
  { id: "unresolved", label: "Chờ xử lý" },
  { id: "escalated", label: "Cần hỗ trợ" },
  { id: "resolved", label: "Đã xong" },
];

import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

const statusConfig: Record<string, { icon: typeof Clock; className: string }> = {
  unresolved: { icon: Clock, className: "text-echo-warning" },
  escalated: { icon: AlertCircle, className: "text-echo-escalated" },
  resolved: { icon: CheckCircle2, className: "text-echo-success" },
};

const getFlag = (timezone: string | null) => {
  if (!timezone) return "🌍";
  if (timezone.includes("Ho_Chi_Minh")) return "🇻🇳";
  if (timezone.includes("Los_Angeles") || timezone.includes("New_York")) return "🇺🇸";
  if (timezone.includes("Madrid")) return "🇪🇸";
  if (timezone.includes("London")) return "🇬🇧";
  if (timezone.includes("Tokyo")) return "🇯🇵";
  return "🌍";
};

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
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
  members = [],
}: InboxListProps) => {
  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{conversations.length} hội thoại</p>
      </div>

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

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Chưa có hội thoại nào
          </div>
        )}
        {conversations.map((conv: any) => {
          const session = sessions.find((s: any) => s.id === conv.contact_session_id);
          if (!session) return null;
          const config = statusConfig[conv.status] || statusConfig.unresolved;
          const StatusIcon = config.icon;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors ${
                selectedId === conv.id ? "bg-secondary" : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                {session.name?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate">
                    {getFlag(session.timezone)} {session.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(conv.updated_at)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">{conv.last_message || "Chưa có tin nhắn"}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <StatusIcon className={`h-3 w-3 ${config.className}`} />
                    <span className={`text-[10px] font-medium ${config.className}`}>
                      {conv.status === "unresolved" ? "AI đang xử lý" : conv.status === "escalated" ? "Cần hỗ trợ" : "Đã giải quyết"}
                    </span>
                  </div>
                  {(conv as any).assigned_to && (() => {
                    const assigned = members.find((m) => m.user_id === (conv as any).assigned_to);
                    return assigned ? (
                      <span className="text-[10px] text-muted-foreground truncate">
                        · {assigned.profile?.full_name || assigned.profile?.email || "Agent"}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
