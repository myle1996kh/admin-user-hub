import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff, KeyRound, ShieldCheck, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Credential {
  id: string;
  credential_key: string;
  credential_value: string;
  scope: string;
  description: string | null;
  created_at: string;
}

interface CredentialsPanelProps {
  organizationId: string;
}

const Field = ({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
    {children}
  </div>
);

const SCOPES = [
  { value: "global", label: "Toàn tổ chức" },
  { value: "tool", label: "Gắn với Tool cụ thể" },
  { value: "mcp", label: "MCP Server" },
];

const EMPTY_FORM = {
  credential_key: "",
  credential_value: "",
  scope: "global",
  description: "",
};

export const CredentialsPanel = ({ organizationId }: CredentialsPanelProps) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const fetchCredentials = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("tenant_credentials")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });
    setCredentials((data as Credential[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCredentials(); }, [organizationId]);

  // ── helpers ──────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (c: Credential) => {
    setEditingId(c.id);
    setForm({
      credential_key: c.credential_key,
      credential_value: c.credential_value,
      scope: c.scope,
      description: c.description ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const saveForm = async () => {
    if (!form.credential_key.trim()) {
      toast.error("Vui lòng nhập Credential Key");
      return;
    }
    if (!form.credential_value.trim()) {
      toast.error("Vui lòng nhập Credential Value");
      return;
    }

    // Validate no space in key
    if (/\s/.test(form.credential_key)) {
      toast.error("Credential Key không được chứa khoảng trắng");
      return;
    }

    setSaving(true);
    const payload = {
      credential_key: form.credential_key.toUpperCase(),
      credential_value: form.credential_value,
      scope: form.scope,
      description: form.description.trim() || null,
    };

    if (editingId) {
      const { error } = await (supabase as any)
        .from("tenant_credentials")
        .update(payload)
        .eq("id", editingId);
      if (error) { toast.error("Lỗi: " + error.message); }
      else { toast.success("Đã cập nhật credential"); cancelForm(); fetchCredentials(); }
    } else {
      // Check duplicate key
      const existing = credentials.find(
        (c) => c.credential_key === payload.credential_key
      );
      if (existing) {
        toast.error(`Key "${payload.credential_key}" đã tồn tại`);
        setSaving(false);
        return;
      }

      const { error } = await (supabase as any)
        .from("tenant_credentials")
        .insert({ ...payload, organization_id: organizationId });
      if (error) { toast.error("Lỗi: " + error.message); }
      else { toast.success("Đã thêm credential"); cancelForm(); fetchCredentials(); }
    }
    setSaving(false);
  };

  const deleteCredential = async (c: Credential) => {
    if (!confirm(`Xóa credential "${c.credential_key}"?`)) return;
    const { error } = await (supabase as any)
      .from("tenant_credentials")
      .delete()
      .eq("id", c.id);
    if (error) { toast.error("Lỗi: " + error.message); }
    else { toast.success("Đã xóa credential"); fetchCredentials(); }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const maskValue = (val: string) => {
    if (val.length <= 4) return "••••••••";
    return val.slice(0, 4) + "•".repeat(Math.min(val.length - 4, 16));
  };

  // ── render ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Credentials</h2>
            <p className="text-sm text-muted-foreground">
              Lưu trữ API keys và secrets cho các tool kết nối
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="echo-gradient-bg text-primary-foreground hover:opacity-90 gap-1.5"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Thêm Credential
          </Button>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Giá trị credentials được lưu trong database của tổ chức bạn. Chỉ edge functions backend
            mới có quyền đọc và sử dụng chúng khi gọi API — không bao giờ truyền về frontend.
          </p>
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              {editingId ? "Chỉnh sửa Credential" : "Thêm Credential mới"}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Credential Key (UPPER_SNAKE_CASE)"
                hint='Dùng key này trong Tool config, ví dụ: "ITL_API_KEY"'
              >
                <Input
                  value={form.credential_key}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credential_key: e.target.value.toUpperCase().replace(/\s/g, "_"),
                    })
                  }
                  placeholder="ITL_API_KEY"
                  className="mt-1 bg-secondary border-border font-mono"
                  disabled={!!editingId} // key immutable after creation
                />
                {editingId && (
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Key không thể thay đổi sau khi tạo
                  </p>
                )}
              </Field>
              <Field label="Phạm vi sử dụng">
                <Select
                  value={form.scope}
                  onValueChange={(v) => setForm({ ...form, scope: v })}
                >
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Credential Value" hint="Giá trị sẽ được che khuất sau khi lưu">
              <Input
                type="password"
                value={form.credential_value}
                onChange={(e) => setForm({ ...form, credential_value: e.target.value })}
                placeholder="Nhập API key hoặc secret..."
                className="mt-1 bg-secondary border-border font-mono"
              />
            </Field>

            <Field label="Mô tả (tùy chọn)">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="API key cho phần mềm ITL production"
                className="mt-1 bg-secondary border-border"
              />
            </Field>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={cancelForm} className="gap-1">
                <X className="h-3.5 w-3.5" /> Hủy
              </Button>
              <Button
                size="sm"
                onClick={saveForm}
                disabled={saving}
                className="echo-gradient-bg text-primary-foreground hover:opacity-90 gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm"}
              </Button>
            </div>
          </div>
        )}

        {/* Credential list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : credentials.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <KeyRound className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Chưa có Credential nào</p>
            <p className="text-xs text-muted-foreground">
              Thêm API key để sử dụng với các API Tool
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {credentials.map((c) => {
              const revealed = revealedIds.has(c.id);
              const scopeLabel = SCOPES.find((s) => s.value === c.scope)?.label ?? c.scope;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <KeyRound className="h-4 w-4 text-primary shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-mono font-medium text-foreground">
                        {c.credential_key}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">
                        {scopeLabel}
                      </Badge>
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    )}
                    {/* Masked value with reveal toggle */}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {revealed ? c.credential_value : maskValue(c.credential_value)}
                      </span>
                      <button
                        onClick={() => toggleReveal(c.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title={revealed ? "Ẩn" : "Hiện giá trị"}
                      >
                        {revealed ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                      onClick={() => openEdit(c)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteCredential(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
