import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatPanelProps {
  conversation: any;
  session: any;
  messages: any[];
}

const formatTime = (ts: string) => {
  return new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

export const ChatPanel = ({ conversation, session, messages }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      body: JSON.stringify({
        action: "enhance",
        message: input,
      }),
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

  const updateStatus = async (status: "unresolved" | "escalated" | "resolved") => {
    await supabase
      .from("conversations")
      .update({ status })
      .eq("id", conversation.id);
    toast.success(status === "resolved" ? "Đã đánh dấu xong" : "Đã cập nhật trạng thái");
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{session.name}</h3>
          <p className="text-xs text-muted-foreground">{session.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {conversation.status !== "resolved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus("resolved")}
              className="text-xs gap-1 border-echo-success/30 text-echo-success hover:bg-echo-success/10"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Đánh dấu đã xong
            </Button>
          )}
          {conversation.status === "escalated" && (
            <div className="flex items-center gap-1 rounded-md bg-echo-escalated/10 px-2.5 py-1 text-xs font-medium text-echo-escalated">
              <AlertCircle className="h-3.5 w-3.5" />
              Cần hỗ trợ
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
          >
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

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-border p-4">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={enhanceMessage}
          disabled={!input.trim() || enhancing}
          className="shrink-0 text-muted-foreground hover:text-primary"
          title="Enhance with AI"
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
    </div>
  );
};
