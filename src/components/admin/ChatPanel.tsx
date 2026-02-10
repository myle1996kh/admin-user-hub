import { useState, useRef, useEffect } from "react";
import {
  Send, Sparkles, CheckCircle2, AlertCircle, UserPlus,
  UserCheck, ArrowRightLeft, Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OrgMember {
  user_id: string;
  role: string;
  profile?: { id: string; full_name: string; email: string };
}

interface ChatPanelProps {
  conversation: any;
  session: any;
  messages: any[];
  organizationId: string;
}

type ConvStatus = "unresolved" | "escalated" | "queued" | "assigned" | "resolved";

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export const ChatPanel = ({ conversation, session, messages, organizationId }: ChatPanelProps) => {
  const { user, isSupporter } = useAuth();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const status: ConvStatus = conversation.status;
  const isAssignedToMe = conversation.assigned_supporter_id === user?.id;
  const canChat = !isSupporter || isAssignedToMe || status === "assigned";

  // Fetch org members (admins + supporters) for assignment dropdown
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("organization_memberships")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .in("role", ["admin", "supporter"]);
      if (!data) return;

      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      setMembers(
        data.map((m) => ({
          ...m,
          profile: profiles?.find((p) => p.id === m.user_id),
        }))
      );
    };
    fetchMembers();
  }, [organizationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Actions ────────────────────────────────────────────────

  /** Supporter nhận conversation từ queue */
  const acceptConversation = async () => {
    if (!user) return;
    setAssigning(true);
    const { error: convErr } = await supabase
      .from("conversations")
      .update({
        status: "assigned",
        assigned_supporter_id: user.id,
      } as any)
      .eq("id", conversation.id);

    if (convErr) { toast.error("Không thể nhận hội thoại"); setAssigning(false); return; }

    const { error: assignErr } = await supabase
      .from("conversation_assignments")
      .insert({
        conversation_id: conversation.id,
        supporter_id: user.id,
        assigned_by: null, // self-accept
        status: "active",
      } as any);

    if (assignErr) {
      toast.error("Lỗi ghi assignment");
    } else {
      toast.success("Đã nhận hội thoại này");
    }
    setAssigning(false);
  };

  /** Admin/supporter gán conversation cho người khác — calls edge function */
  const assignConversation = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === "unassigned") return;
    setAssigning(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-conversation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          conversation_id: conversation.id,
          organization_id: organizationId,
          forced_supporter_id: targetUserId,
        }),
      }
    );

    if (!resp.ok) {
      toast.error("Không thể gán hội thoại");
    } else {
      const target = members.find((m) => m.user_id === targetUserId);
      toast.success(
        `Đã gán cho ${target?.profile?.full_name || target?.profile?.email || "supporter"}`
      );
      setTransferTarget("");
    }
    setAssigning(false);
  };

  /** Đánh dấu đã giải quyết */
  const resolveConversation = async () => {
    const { error } = await supabase
      .from("conversations")
      .update({ status: "resolved" } as any)
      .eq("id", conversation.id);

    if (!error) {
      // Close active assignment
      await supabase
        .from("conversation_assignments")
        .update({ status: "resolved", resolved_at: new Date().toISOString() } as any)
        .eq("conversation_id", conversation.id)
        .eq("status", "active");

      toast.success("Đã đánh dấu giải quyết xong");
    } else {
      toast.error("Cập nhật thất bại");
    }
  };

  /** Cập nhật status thủ công (admin) */
  const updateStatus = async (newStatus: ConvStatus) => {
    await supabase
      .from("conversations")
      .update({ status: newStatus } as any)
      .eq("id", conversation.id);
    toast.success("Đã cập nhật trạng thái");
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        action: "send",
        conversationId: conversation.id,
        message: input,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      toast.error(err.error || "Gửi tin nhắn thất bại");
    }

    setInput("");
    setSending(false);
  };

  const enhanceMessage = async () => {
    if (!input.trim() || enhancing) return;
    setEnhancing(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "enhance", message: input }),
    });

    if (resp.ok) {
      const data = await resp.json();
      setInput(data.enhanced);
      toast.success("Tin nhắn đã được cải thiện!");
    } else {
      toast.error("Không thể cải thiện tin nhắn");
    }
    setEnhancing(false);
  };

  // ── Render helpers ─────────────────────────────────────────

  const supporters = members.filter((m) => m.role === "supporter" || m.role === "admin");

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3 gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{session.name}</h3>
          <p className="text-xs text-muted-foreground">{session.email}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* ── Status badge ── */}
          {status === "escalated" && (
            <div className="flex items-center gap-1 rounded-md bg-echo-escalated/10 px-2.5 py-1 text-xs font-medium text-echo-escalated">
              <AlertCircle className="h-3.5 w-3.5" />
              Cần hỗ trợ
            </div>
          )}
          {status === "queued" && (
            <div className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
              Đang hàng chờ
            </div>
          )}
          {status === "assigned" && isAssignedToMe && (
            <div className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600">
              <UserCheck className="h-3.5 w-3.5" />
              Của tôi
            </div>
          )}

          {/* ── Supporter: Accept button (queued or escalated, not yet mine) ── */}
          {isSupporter && (status === "escalated" || status === "queued") && !isAssignedToMe && (
            <Button
              size="sm"
              variant="outline"
              onClick={acceptConversation}
              disabled={assigning}
              className="text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Nhận hội thoại
            </Button>
          )}

          {/* ── Transfer to another supporter (admin or current assignee) ── */}
          {(status === "assigned" || status === "escalated") && (!isSupporter || isAssignedToMe) && (
            <div className="flex items-center gap-1.5">
              <Select value={transferTarget} onValueChange={setTransferTarget} disabled={assigning}>
                <SelectTrigger className="w-[150px] h-8 text-xs border-border">
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <SelectValue placeholder="Chuyển cho..." />
                </SelectTrigger>
                <SelectContent>
                  {supporters
                    .filter((m) => m.user_id !== conversation.assigned_supporter_id)
                    .map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name || m.profile?.email || "Supporter"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {transferTarget && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => assignConversation(transferTarget)}
                  disabled={assigning}
                  className="text-xs h-8"
                >
                  Xác nhận
                </Button>
              )}
            </div>
          )}

          {/* ── Admin manual assignment dropdown (full member list) ── */}
          {!isSupporter && status !== "resolved" && (
            <Select
              value={(conversation as any).assigned_to || "unassigned"}
              onValueChange={(v) => assignConversation(v)}
              disabled={assigning}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs border-border">
                <UserPlus className="h-3.5 w-3.5 mr-1 shrink-0" />
                <SelectValue placeholder="Gán nhân viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Chưa gán</SelectItem>
                {supporters.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.profile?.email || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* ── Resolve button ── */}
          {status !== "resolved" && (isAssignedToMe || !isSupporter) && (
            <Button
              size="sm"
              variant="outline"
              onClick={resolveConversation}
              className="text-xs gap-1 border-echo-success/30 text-echo-success hover:bg-echo-success/10"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Đã xong
            </Button>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className="max-w-[70%]">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-echo-user-bubble text-foreground rounded-bl-md"
                    : "echo-gradient-bg text-primary-foreground rounded-br-md"
                }`}
              >
                {msg.content}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground px-1">
                {msg.role === "user" ? session.name : "Agent/AI"} · {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      {canChat ? (
        <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-border p-4">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={enhanceMessage}
            disabled={!input.trim() || enhancing}
            className="shrink-0 text-muted-foreground hover:text-primary"
            title="Cải thiện với AI"
          >
            <Sparkles className={`h-4 w-4 ${enhancing ? "animate-pulse" : ""}`} />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập tin nhắn cho khách hàng..."
            className="flex-1 bg-secondary border-border"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
            className="echo-gradient-bg text-primary-foreground hover:opacity-90 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        /* Supporter viewing a conversation not assigned to them */
        <div className="flex items-center justify-center gap-2 border-t border-border p-4 text-xs text-muted-foreground">
          <Bot className="h-4 w-4" />
          {status === "assigned"
            ? "Hội thoại này đang được xử lý bởi supporter khác"
            : "Nhận hội thoại để bắt đầu chat"}
        </div>
      )}
    </div>
  );
};
