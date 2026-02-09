import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const WidgetPage = () => {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("org");

  const [isOpen, setIsOpen] = useState(!!orgId);
  const [hasSession, setHasSession] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("Echo Support");
  const [error, setError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Try to restore session on mount
  useEffect(() => {
    if (!orgId) return;
    const storedSessionId = localStorage.getItem(`echo_session_${orgId}`);
    if (storedSessionId) {
      restoreSession(storedSessionId);
    }
  }, [orgId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;
    
    // Dynamic import to avoid issues when supabase isn't available
    import("@/integrations/supabase/client").then(({ supabase }) => {
      const channel = supabase
        .channel(`widget-msgs-${conversationId}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        }, (payload: any) => {
          const newMsg = payload.new;
          // Only add if not already in messages (avoid duplicates from our own inserts)
          setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              role: newMsg.role,
              content: newMsg.content,
              created_at: newMsg.created_at,
            }];
          });
          setIsTyping(false);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, [conversationId]);

  const restoreSession = async (sid: string) => {
    try {
      const resp = await fetch(`${FUNC_URL}/widget-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "restore", sessionId: sid }),
      });
      const data = await resp.json();
      if (data.valid) {
        setSessionId(data.sessionId);
        setConversationId(data.conversationId);
        setOrgName(data.orgName || "Echo Support");
        setMessages(data.messages?.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        })) || []);
        setHasSession(true);
      }
    } catch (e) {
      console.error("Restore failed:", e);
    }
  };

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !orgId) return;

    try {
      const resp = await fetch(`${FUNC_URL}/widget-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: "create",
          organizationId: orgId,
          name: name.trim(),
          email: email.trim(),
          os: navigator.platform,
          browser: navigator.userAgent.split(" ").pop() || "Unknown",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await resp.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setSessionId(data.sessionId);
      setConversationId(data.conversationId);
      setOrgName(data.orgName);
      setHasSession(true);
      localStorage.setItem(`echo_session_${orgId}`, data.sessionId);

      // Show greeting
      if (data.greeting) {
        setMessages([{
          id: "greeting",
          role: "assistant",
          content: data.greeting.replace("{name}", name),
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (e) {
      setError("Không thể kết nối đến server");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || !conversationId) return;

    const userMsg: WidgetMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const resp = await fetch(`${FUNC_URL}/widget-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          conversationId,
          sessionId,
          message: input,
        }),
      });

      const data = await resp.json();
      if (data.error) {
        setIsTyping(false);
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.",
          created_at: new Date().toISOString(),
        }]);
        return;
      }

      // AI response is added via realtime subscription or directly
      if (data.aiResponse) {
        // Wait a bit for realtime, fallback to manual add
        setTimeout(() => {
          setMessages((prev) => {
            if (prev.some(m => m.content === data.aiResponse && m.role === "assistant" && m.id !== "greeting")) return prev;
            return [...prev, {
              id: `ai-${Date.now()}`,
              role: "assistant",
              content: data.aiResponse,
              created_at: new Date().toISOString(),
            }];
          });
          setIsTyping(false);
        }, 500);
      } else {
        setIsTyping(false);
      }
    } catch {
      setIsTyping(false);
    }
  };

  const resetChat = () => {
    if (orgId) localStorage.removeItem(`echo_session_${orgId}`);
    setHasSession(false);
    setMessages([]);
    setName("");
    setEmail("");
    setSessionId(null);
    setConversationId(null);
    setHasMore(true);
  };

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMore) return;
    setLoadingOlder(true);

    const oldest = messages.find(m => !m.id.startsWith("greeting") && !m.id.startsWith("local-") && !m.id.startsWith("ai-") && !m.id.startsWith("err-"));
    const before = oldest?.created_at;

    try {
      const resp = await fetch(`${FUNC_URL}/widget-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: "load_messages",
          conversationId,
          before,
          limit: 20,
        }),
      });
      const data = await resp.json();
      if (data.messages?.length) {
        const container = messagesContainerRef.current;
        const prevHeight = container?.scrollHeight || 0;
        setMessages((prev) => [
          ...data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at,
          })),
          ...prev,
        ]);
        // Maintain scroll position
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevHeight;
          }
        });
      }
      setHasMore(data.hasMore ?? false);
    } catch (e) {
      console.error("Load older messages failed:", e);
    }
    setLoadingOlder(false);
  }, [conversationId, loadingOlder, hasMore, messages]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop < 50 && hasMore && !loadingOlder) {
      loadOlderMessages();
    }
  }, [hasMore, loadingOlder, loadOlderMessages]);

  if (!orgId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Echo Widget</h1>
          <p className="text-muted-foreground mb-4">Cần có Organization ID để sử dụng widget.</p>
          <p className="text-sm text-muted-foreground">Truy cập: <code className="bg-secondary px-2 py-1 rounded text-xs">/widget?org=YOUR_ORG_ID</code></p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center text-destructive">
          <h1 className="text-xl font-bold mb-2">Lỗi</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center text-muted-foreground">
        <h1 className="text-2xl font-bold text-foreground mb-2">Echo Widget Demo</h1>
        <p>Nhấn vào nút chat bên dưới để mở widget</p>
      </div>

      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full echo-gradient-bg echo-glow shadow-2xl transition-transform hover:scale-105"
          >
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 echo-gradient-bg">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
                <span className="font-semibold text-primary-foreground">{orgName}</span>
              </div>
              <div className="flex items-center gap-1">
                {hasSession && (
                  <button onClick={resetChat} className="rounded-lg p-1.5 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            {!hasSession ? (
              <form onSubmit={startSession} className="flex flex-1 flex-col justify-center gap-4 p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Chào mừng! 👋</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Nhập thông tin để bắt đầu trò chuyện</p>
                </div>
                <Input placeholder="Tên của bạn" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" />
                <Button type="submit" className="echo-gradient-bg text-primary-foreground hover:opacity-90">Bắt đầu chat</Button>
              </form>
            ) : (
              <>
                <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingOlder && (
                    <div className="flex justify-center py-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-echo-user-bubble text-foreground rounded-br-md"
                          : "bg-echo-bot-bubble text-foreground rounded-bl-md"
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-echo-bot-bubble rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-border p-3">
                  <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nhập tin nhắn..." className="bg-secondary border-border flex-1" />
                  <Button type="submit" size="icon" disabled={isTyping} className="echo-gradient-bg text-primary-foreground hover:opacity-90 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WidgetPage;
