import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

const botResponses = [
  "Xin chào! Tôi là trợ lý AI của Echo. Tôi có thể giúp gì cho bạn?",
  "Cảm ơn bạn đã liên hệ. Tôi sẽ kiểm tra thông tin này ngay.",
  "Bạn có thể cung cấp thêm chi tiết để tôi hỗ trợ tốt hơn không?",
  "Tôi đã tìm thấy thông tin liên quan. Bạn hãy tham khảo tài liệu hướng dẫn tại mục Help Center nhé.",
  "Nếu bạn cần hỗ trợ thêm, tôi có thể chuyển bạn đến nhân viên trực tiếp.",
];

const WidgetPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setHasSession(true);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Xin chào ${name}! 👋 Tôi là trợ lý AI của Echo. Tôi có thể giúp gì cho bạn hôm nay?`,
        createdAt: Date.now(),
      },
    ]);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: WidgetMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: input,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const botMsg: WidgetMessage = {
        id: `b-${Date.now()}`,
        role: "assistant",
        content: botResponses[Math.floor(Math.random() * botResponses.length)],
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const resetChat = () => {
    setHasSession(false);
    setMessages([]);
    setName("");
    setEmail("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center text-muted-foreground mb-8">
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
                <span className="font-semibold text-primary-foreground">Echo Support</span>
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
                <Input
                  placeholder="Tên của bạn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary border-border"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary border-border"
                />
                <Button type="submit" className="echo-gradient-bg text-primary-foreground hover:opacity-90">
                  Bắt đầu chat
                </Button>
              </form>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-echo-user-bubble text-foreground rounded-br-md"
                            : "bg-echo-bot-bubble text-foreground rounded-bl-md"
                        }`}
                      >
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
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="bg-secondary border-border flex-1"
                  />
                  <Button type="submit" size="icon" className="echo-gradient-bg text-primary-foreground hover:opacity-90 shrink-0">
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
