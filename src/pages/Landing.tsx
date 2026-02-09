import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Bot, Users, Zap, Shield, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Bot, title: "AI Auto-Response", desc: "Trả lời tự động dựa trên Knowledge Base với RAG" },
  { icon: Users, title: "Human Takeover", desc: "Chuyển tiếp đến agent khi cần hỗ trợ phức tạp" },
  { icon: Zap, title: "Real-time Chat", desc: "Tin nhắn thời gian thực với WebSocket" },
  { icon: Shield, title: "BYOK Security", desc: "Mang API Key riêng, bảo mật tối đa" },
  { icon: BarChart3, title: "Analytics", desc: "Theo dõi hiệu suất và chất lượng hỗ trợ" },
  { icon: MessageSquare, title: "Multi-channel", desc: "Chat widget, voice agent, đa kênh" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg echo-gradient-bg">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Echo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/widget">Widget Demo</Link>
            </Button>
            <Button asChild className="echo-gradient-bg text-primary-foreground hover:opacity-90">
              <Link to="/admin">Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(174_62%_40%/0.08),transparent_70%)]" />
        <div className="container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full echo-gradient-bg animate-pulse-glow" />
              B2B AI SaaS Support Platform
            </div>
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-tight tracking-tight text-foreground md:text-7xl">
              Hỗ trợ khách hàng{" "}
              <span className="echo-gradient-text">thông minh</span>
              <br />với sức mạnh AI
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Echo kết hợp AI và con người để mang đến trải nghiệm hỗ trợ khách hàng nhanh chóng, chính xác và không giới hạn.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button size="lg" asChild className="echo-gradient-bg text-primary-foreground hover:opacity-90 echo-glow px-8 h-12 text-base">
                <Link to="/admin">Vào Dashboard</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 text-base border-border">
                <Link to="/widget">Xem Widget Demo</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">Tính năng nổi bật</h2>
            <p className="mt-4 text-muted-foreground">Mọi thứ bạn cần cho hệ thống hỗ trợ khách hàng AI</p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30 hover:bg-secondary"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg echo-gradient-bg">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 Echo. B2B AI SaaS Support Platform.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
