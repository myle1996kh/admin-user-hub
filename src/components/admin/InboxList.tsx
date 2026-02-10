import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Clock, Timer, UserCheck } from "lucide-react";

interface InboxListProps {
  conversations: any[];
  sessions: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  members?: { user_id: string; profile?: { full_name: string; email: string } }[];
  hideHeader?: boolean;
  headerContent?: ReactNode;
  /** Subset of status tabs to show — defaults to all */
  visibleStatuses?: string[];
}

const ALL_STATUS_TABS = [
  { id: "all",        label: "Tất cả"       },
  { id: "unresolved", label: "Chờ xử lý"    },
  { id: "escalated",  label: "Cần hỗ trợ"   },
  { id: "queued",     label: "Hàng chờ"     },
  { id: "assigned",   label: "Đang xử lý"   },
  { id: "resolved",   label: "Đã xong"      },
];

const statusConfig: Record<string, { icon: typeof Clock; className: string; label: string }> = {
  unresolved: { icon: Clock,        className: "text-echo-warning",   label: "AI đang xử lý"  },
  escalated:  { icon: AlertCircle,  className: "text-echo-escalated", label: "Cần hỗ trợ"     },
  queued:     { icon: Timer,        className: "text-amber-500",      label: "Đang chờ"       },
  assigned:   { icon: UserCheck,    className: "text-blue-500",       label: "Đang xử lý"     },
  resolved:   { icon: CheckCircle2, className: "text-echo-success",   label: "Đã giải quyết"  },
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
  hideHeader = false,
  headerContent,
  visibleStatuses,
}: InboxListProps) => {
  const statusTabs = visibleStatuses
    ? ALL_STATUS_TABS.filter((t) => t.id === "all" || visibleStatuses.includes(t.id))
    : ALL_STATUS_TABS;

  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-card">
      {headerContent ?? (!hideHeader && (
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{conversations.length} hội thoại</p>
        </div>
      ))}

      {/* Status filter tabs — horizontal scroll for small widths */}
      <div className="flex gap-1 border-b border-border p-2 overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onStatusFilterChange(tab.id)}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
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
          const cfg = statusConfig[conv.status] ?? statusConfig.unresolved;
          const StatusIcon = cfg.icon;

          // Find assigned supporter name
          const assignedSupporter = conv.assigned_supporter_id
            ? members.find((m) => m.user_id === conv.assigned_supporter_id)
            : null;

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
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <StatusIcon className={`h-3 w-3 ${cfg.className}`} />
                    <span className={`text-[10px] font-medium ${cfg.className}`}>{cfg.label}</span>
                  </div>
                  {assignedSupporter && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      · {assignedSupporter.profile?.full_name || assignedSupporter.profile?.email || "Supporter"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
