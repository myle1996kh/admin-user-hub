import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  status: string;
  last_message: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  contact_email?: string;
}

interface OrgConversationsProps {
  organizationId: string;
}

export const OrgConversations = ({ organizationId }: OrgConversationsProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (!convs) {
        setLoading(false);
        return;
      }

      // Fetch session info
      const sessionIds = [...new Set(convs.map((c: any) => c.contact_session_id))];
      let sessionsMap: Record<string, any> = {};
      if (sessionIds.length > 0) {
        const { data: sessions } = await supabase
          .from("contact_sessions")
          .select("id, name, email")
          .in("id", sessionIds);
        sessions?.forEach((s: any) => { sessionsMap[s.id] = s; });
      }

      const enriched = convs.map((c: any) => ({
        ...c,
        contact_name: sessionsMap[c.contact_session_id]?.name,
        contact_email: sessionsMap[c.contact_session_id]?.email,
      }));

      setConversations(enriched);
      setLoading(false);
    };
    fetch();
  }, [organizationId]);

  const statusColor = (status: string) => {
    switch (status) {
      case "resolved": return "default";
      case "escalated": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Hội thoại gần đây ({conversations.length})
      </h3>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Chưa có hội thoại nào</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {conversations.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-border bg-secondary/50 px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">
                  {c.contact_name || "Anonymous"}
                </span>
                <Badge variant={statusColor(c.status) as any}>{c.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {c.last_message || "Chưa có tin nhắn"}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{c.contact_email}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.updated_at).toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
