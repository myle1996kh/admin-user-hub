import { Conversation, ContactSession } from "@/data/types";
import { Globe, Monitor, Mail, Clock, MapPin } from "lucide-react";

interface ContextPanelProps {
  session: ContactSession;
  conversation: Conversation;
}

export const ContextPanel = ({ session, conversation }: ContextPanelProps) => {
  const details = [
    { icon: Mail, label: "Email", value: session.email },
    { icon: MapPin, label: "Vị trí", value: session.metadata.location },
    { icon: Monitor, label: "Thiết bị", value: `${session.metadata.os} · ${session.metadata.browser}` },
    { icon: Clock, label: "Timezone", value: session.metadata.timezone },
    { icon: Globe, label: "Session ID", value: session.id },
  ];

  return (
    <div className="hidden w-72 flex-col border-l border-border bg-card xl:flex">
      <div className="border-b border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Thông tin khách hàng</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xl font-semibold text-foreground">
            {session.name.charAt(0)}
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{session.name}</p>
          <p className="text-xs text-muted-foreground">{session.email}</p>
        </div>

        {/* Details */}
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

        {/* Conversation info */}
        <div className="mt-6 rounded-lg bg-secondary p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Trạng thái hội thoại</p>
          <div className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
            conversation.status === "unresolved"
              ? "bg-echo-warning/10 text-echo-warning"
              : conversation.status === "escalated"
              ? "bg-echo-escalated/10 text-echo-escalated"
              : "bg-echo-success/10 text-echo-success"
          }`}>
            {conversation.status === "unresolved" ? "AI đang xử lý" : conversation.status === "escalated" ? "Cần hỗ trợ" : "Đã giải quyết"}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Bắt đầu: {new Date(conversation.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>
      </div>
    </div>
  );
};
