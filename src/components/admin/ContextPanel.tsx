import { Globe, Monitor, Mail, Clock, MapPin, AlertCircle, Timer, UserCheck, CheckCircle2 } from "lucide-react";

interface ContextPanelProps {
  session: any;
  conversation: any;
}

const statusDisplay: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
  unresolved: { label: "AI đang xử lý",  className: "bg-echo-warning/10 text-echo-warning",     Icon: Clock       },
  escalated:  { label: "Cần hỗ trợ",     className: "bg-echo-escalated/10 text-echo-escalated", Icon: AlertCircle },
  queued:     { label: "Đang chờ xử lý", className: "bg-amber-500/10 text-amber-600",            Icon: Timer       },
  assigned:   { label: "Đang xử lý",     className: "bg-blue-500/10 text-blue-600",              Icon: UserCheck   },
  resolved:   { label: "Đã giải quyết",  className: "bg-echo-success/10 text-echo-success",      Icon: CheckCircle2 },
};

const escalationReasonLabel: Record<string, string> = {
  keyword:        "Từ khóa trigger",
  max_turns:      "Vượt giới hạn turns",
  low_confidence: "AI không chắc chắn",
  tool_error:     "Lỗi API tool",
  manual:         "Người dùng yêu cầu",
};

export const ContextPanel = ({ session, conversation }: ContextPanelProps) => {
  const details = [
    { icon: Mail,    label: "Email",    value: session.email },
    { icon: MapPin,  label: "Vị trí",   value: session.location || "N/A" },
    { icon: Monitor, label: "Thiết bị", value: `${session.os || "?"} · ${session.browser || "?"}` },
    { icon: Clock,   label: "Timezone", value: session.timezone || "N/A" },
    { icon: Globe,   label: "Session",  value: session.id?.slice(0, 8) + "..." },
  ];

  const status = statusDisplay[conversation.status] ?? statusDisplay.unresolved;
  const StatusIcon = status.Icon;

  return (
    <div className="hidden w-72 flex-col border-l border-border bg-card xl:flex">
      <div className="border-b border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Thông tin khách hàng</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar + name */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xl font-semibold text-foreground">
            {session.name?.charAt(0) || "?"}
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{session.name}</p>
          <p className="text-xs text-muted-foreground">{session.email}</p>
        </div>

        {/* Session details */}
        <div className="space-y-4">
          {details.map((d) => (
            <div key={d.label} className="flex items-start gap-3">
              <d.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p className="text-sm text-foreground break-all">{d.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Conversation status */}
        <div className="mt-6 rounded-lg bg-secondary p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Trạng thái hội thoại</p>
          <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${status.className}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </div>

          {/* Escalation reason badge */}
          {conversation.escalation_reason && (
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground">Lý do leo thang:</p>
              <span className="text-xs font-medium text-foreground">
                {escalationReasonLabel[conversation.escalation_reason] ?? conversation.escalation_reason}
              </span>
            </div>
          )}

          {/* Bot turns counter */}
          {conversation.bot_turns_count > 0 && (
            <p className="text-xs text-muted-foreground">
              Bot đã trả lời: <span className="font-medium text-foreground">{conversation.bot_turns_count} lần</span>
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Bắt đầu: {new Date(conversation.created_at).toLocaleString("vi-VN")}
          </p>
        </div>
      </div>
    </div>
  );
};
