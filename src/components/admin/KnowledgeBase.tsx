import { useState, useEffect } from "react";
import { Plus, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KnowledgeBaseProps {
  organizationId: string;
}

export const KnowledgeBase = ({ organizationId }: KnowledgeBaseProps) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDocs = async () => {
    const { data } = await supabase
      .from("knowledge_base_documents")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (data) setDocs(data);
  };

  useEffect(() => { fetchDocs(); }, [organizationId]);

  const addDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("knowledge_base_documents").insert({
      organization_id: organizationId,
      title: title.trim(),
      content: content.trim(),
    });

    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Thêm tài liệu thành công!");
      setTitle("");
      setContent("");
      setShowForm(false);
      fetchDocs();
    }
    setSaving(false);
  };

  const deleteDoc = async (id: string) => {
    const { error } = await supabase.from("knowledge_base_documents").delete().eq("id", id);
    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã xóa tài liệu");
      fetchDocs();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Knowledge Base</h2>
            <p className="text-sm text-muted-foreground">AI sẽ sử dụng tài liệu này để trả lời khách hàng chính xác hơn</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="echo-gradient-bg text-primary-foreground hover:opacity-90">
            <Plus className="mr-1 h-4 w-4" /> Thêm tài liệu
          </Button>
        </div>

        {showForm && (
          <form onSubmit={addDoc} className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
            <Input
              placeholder="Tiêu đề tài liệu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-secondary border-border"
            />
            <Textarea
              placeholder="Nội dung tài liệu (thông tin về sản phẩm, FAQ, hướng dẫn...)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={6}
              className="bg-secondary border-border"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="echo-gradient-bg text-primary-foreground hover:opacity-90">
                {saving ? "Đang lưu..." : "Lưu tài liệu"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {docs.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Chưa có tài liệu nào. Thêm tài liệu để AI trả lời chính xác hơn.</p>
            </div>
          )}
          {docs.map((doc: any) => (
            <div key={doc.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{doc.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{doc.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteDoc(doc.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
