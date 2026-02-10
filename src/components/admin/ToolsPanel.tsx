import { useState, useEffect } from "react";
import {
  Plus, Trash2, Edit2, Check, X, ToggleLeft, ToggleRight,
  ChevronDown, ChevronRight, FlaskConical, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tool {
  id: string;
  tool_name: string;
  display_name: string;
  description: string;
  endpoint_url: string;
  http_method: string;
  auth_type: string;
  auth_header_name: string | null;
  credential_key: string | null;
  input_schema: any;
  response_type: string;
  output_template: string | null;
  entity_extraction_strategy: string;
  enabled: boolean;
  created_at: string;
}

interface ToolsPanelProps {
  organizationId: string;
}

// ── small field wrapper ───────────────────────────────────────────
const Field = ({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
    {children}
  </div>
);

const EMPTY_TOOL: Omit<Tool, "id" | "created_at"> = {
  tool_name: "",
  display_name: "",
  description: "",
  endpoint_url: "",
  http_method: "GET",
  auth_type: "none",
  auth_header_name: null,
  credential_key: null,
  input_schema: {},
  response_type: "text",
  output_template: null,
  entity_extraction_strategy: "hybrid_llm_regex",
  enabled: true,
};

export const ToolsPanel = ({ organizationId }: ToolsPanelProps) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Tool, "id" | "created_at">>(EMPTY_TOOL);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [schemaText, setSchemaText] = useState("{}");
  const [schemaError, setSchemaError] = useState("");

  const fetchTools = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("tenant_tools")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });
    setTools((data as Tool[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTools(); }, [organizationId]);

  // ── helpers ──────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_TOOL);
    setSchemaText("{}");
    setSchemaError("");
    setShowForm(true);
  };

  const openEdit = (t: Tool) => {
    setEditingId(t.id);
    setForm({
      tool_name: t.tool_name,
      display_name: t.display_name,
      description: t.description,
      endpoint_url: t.endpoint_url,
      http_method: t.http_method,
      auth_type: t.auth_type,
      auth_header_name: t.auth_header_name,
      credential_key: t.credential_key,
      input_schema: t.input_schema,
      response_type: t.response_type,
      output_template: t.output_template,
      entity_extraction_strategy: t.entity_extraction_strategy,
      enabled: t.enabled,
    });
    setSchemaText(JSON.stringify(t.input_schema ?? {}, null, 2));
    setSchemaError("");
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setSchemaError("");
  };

  const handleSchemaChange = (text: string) => {
    setSchemaText(text);
    try {
      JSON.parse(text);
      setSchemaError("");
    } catch {
      setSchemaError("JSON không hợp lệ");
    }
  };

  const saveForm = async () => {
    if (!form.tool_name.trim() || !form.display_name.trim()) {
      toast.error("Vui lòng điền Tên tool và Tên hiển thị");
      return;
    }
    if (!form.endpoint_url.trim()) {
      toast.error("Vui lòng nhập Endpoint URL");
      return;
    }
    let parsedSchema: any = {};
    try {
      parsedSchema = JSON.parse(schemaText);
    } catch {
      toast.error("Input Schema JSON không hợp lệ");
      return;
    }

    setSaving(true);
    const payload = { ...form, input_schema: parsedSchema };

    if (editingId) {
      const { error } = await (supabase as any)
        .from("tenant_tools")
        .update(payload)
        .eq("id", editingId);
      if (error) { toast.error("Lỗi: " + error.message); }
      else { toast.success("Đã cập nhật tool"); cancelForm(); fetchTools(); }
    } else {
      const { error } = await (supabase as any)
        .from("tenant_tools")
        .insert({ ...payload, organization_id: organizationId });
      if (error) { toast.error("Lỗi: " + error.message); }
      else { toast.success("Đã tạo tool mới"); cancelForm(); fetchTools(); }
    }
    setSaving(false);
  };

  const toggleEnabled = async (t: Tool) => {
    await (supabase as any)
      .from("tenant_tools")
      .update({ enabled: !t.enabled })
      .eq("id", t.id);
    fetchTools();
  };

  const deleteTool = async (t: Tool) => {
    if (!confirm(`Xóa tool "${t.display_name}"?`)) return;
    const { error } = await (supabase as any)
      .from("tenant_tools")
      .delete()
      .eq("id", t.id);
    if (error) { toast.error("Lỗi: " + error.message); }
    else { toast.success("Đã xóa tool"); fetchTools(); }
  };

  // ── render ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">API Tools</h2>
            <p className="text-sm text-muted-foreground">
              Cấu hình công cụ API để chatbot tra cứu dữ liệu từ phần mềm ITL
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="echo-gradient-bg text-primary-foreground hover:opacity-90 gap-1.5"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Thêm Tool
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {editingId ? "Chỉnh sửa Tool" : "Tạo Tool mới"}
            </h3>

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tên Tool (snake_case)" hint="Dùng để chatbot gọi, ví dụ: get_shipment_status">
                <Input
                  value={form.tool_name}
                  onChange={(e) => setForm({ ...form, tool_name: e.target.value.replace(/\s/g, "_").toLowerCase() })}
                  placeholder="get_shipment_status"
                  className="mt-1 bg-secondary border-border"
                />
              </Field>
              <Field label="Tên hiển thị">
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="Tra cứu trạng thái lô hàng"
                  className="mt-1 bg-secondary border-border"
                />
              </Field>
            </div>

            <Field label="Mô tả cho LLM" hint="LLM dùng mô tả này để quyết định khi nào gọi tool">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tra cứu trạng thái lô hàng theo mã bill of lading hoặc tracking number"
                className="mt-1 bg-secondary border-border"
              />
            </Field>

            {/* Endpoint */}
            <div className="grid grid-cols-4 gap-3">
              <Field label="HTTP Method">
                <Select value={form.http_method} onValueChange={(v) => setForm({ ...form, http_method: v })}>
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="col-span-3">
                <Field label="Endpoint URL">
                  <Input
                    value={form.endpoint_url}
                    onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
                    placeholder="https://api.itl.vn/v1/shipments/{{tracking_number}}"
                    className="mt-1 bg-secondary border-border font-mono text-xs"
                  />
                </Field>
              </div>
            </div>

            {/* Auth */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Xác thực">
                <Select value={form.auth_type} onValueChange={(v) => setForm({ ...form, auth_type: v })}>
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="none">Không xác thực</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key Header</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.auth_type !== "none" && (
                <>
                  <Field label="Header name" hint='Ví dụ: "Authorization"'>
                    <Input
                      value={form.auth_header_name ?? ""}
                      onChange={(e) => setForm({ ...form, auth_header_name: e.target.value || null })}
                      placeholder="Authorization"
                      className="mt-1 bg-secondary border-border"
                    />
                  </Field>
                  <Field label="Credential key" hint="Key trong Credentials tab">
                    <Input
                      value={form.credential_key ?? ""}
                      onChange={(e) => setForm({ ...form, credential_key: e.target.value || null })}
                      placeholder="ITL_API_KEY"
                      className="mt-1 bg-secondary border-border font-mono text-xs"
                    />
                  </Field>
                </>
              )}
            </div>

            {/* Input Schema */}
            <Field
              label="Input Schema (JSON)"
              hint='Ví dụ: {"tracking_number": {"type": "string", "description": "Mã vận đơn"}}'
            >
              <textarea
                value={schemaText}
                onChange={(e) => handleSchemaChange(e.target.value)}
                rows={5}
                className={`mt-1 w-full rounded-md border bg-secondary px-3 py-2 font-mono text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40 resize-y ${
                  schemaError ? "border-destructive" : "border-border"
                }`}
              />
              {schemaError && (
                <p className="text-xs text-destructive mt-0.5">{schemaError}</p>
              )}
            </Field>

            {/* Entity extraction strategy */}
            <Field
              label="Chiến lược trích xuất entities"
              hint="Cách chatbot nhận diện tham số từ câu hỏi người dùng"
            >
              <Select
                value={form.entity_extraction_strategy}
                onValueChange={(v) => setForm({ ...form, entity_extraction_strategy: v })}
              >
                <SelectTrigger className="mt-1 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="hybrid_llm_regex">
                    Hybrid LLM + Regex (Khuyến nghị)
                  </SelectItem>
                  <SelectItem value="llm_only">LLM Only (Chính xác, chậm hơn)</SelectItem>
                  <SelectItem value="regex_only">Regex Only (Nhanh, cứng nhắc)</SelectItem>
                  <SelectItem value="hybrid_ner_llm">NER + LLM (Cho NLP nâng cao)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* Response type + template */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kiểu phản hồi">
                <Select
                  value={form.response_type}
                  onValueChange={(v) => setForm({ ...form, response_type: v })}
                >
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="text">Text (LLM diễn giải)</SelectItem>
                    <SelectItem value="template">Template tùy chỉnh</SelectItem>
                    <SelectItem value="table">Bảng dữ liệu</SelectItem>
                    <SelectItem value="card">Card thông tin</SelectItem>
                    <SelectItem value="raw">Raw JSON</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Output Template" hint='Dùng {{field}} để chèn dữ liệu từ response'>
                <Input
                  value={form.output_template ?? ""}
                  onChange={(e) => setForm({ ...form, output_template: e.target.value || null })}
                  placeholder="Lô hàng {{tracking_number}}: {{status}}"
                  className="mt-1 bg-secondary border-border"
                  disabled={form.response_type !== "template"}
                />
              </Field>
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
              <p className="text-sm font-medium text-foreground">Kích hoạt tool này</p>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
            </div>

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
                {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo tool"}
              </Button>
            </div>
          </div>
        )}

        {/* Tool list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : tools.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <FlaskConical className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Chưa có API Tool nào</p>
            <p className="text-xs text-muted-foreground">
              Thêm tool để chatbot có thể tra cứu dữ liệu từ hệ thống ITL
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tools.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Tool header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expandedId === t.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{t.display_name}</p>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5">
                        {t.tool_name}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 ${
                          t.http_method === "GET"
                            ? "text-green-600"
                            : t.http_method === "POST"
                            ? "text-blue-600"
                            : "text-amber-600"
                        }`}
                      >
                        {t.http_method}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleEnabled(t)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title={t.enabled ? "Đang bật — click để tắt" : "Đang tắt — click để bật"}
                    >
                      {t.enabled ? (
                        <ToggleRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(t)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteTool(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === t.id && (
                  <div className="border-t border-border bg-secondary/30 px-4 py-3 space-y-2 text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <span>
                        <span className="font-medium text-foreground">URL: </span>
                        <span className="font-mono">{t.endpoint_url}</span>
                      </span>
                      <span>
                        <span className="font-medium text-foreground">Auth: </span>
                        {t.auth_type === "none" ? "Không" : t.auth_type}
                      </span>
                      <span>
                        <span className="font-medium text-foreground">Response: </span>
                        {t.response_type}
                      </span>
                      <span>
                        <span className="font-medium text-foreground">Extraction: </span>
                        {t.entity_extraction_strategy}
                      </span>
                    </div>
                    {t.input_schema && Object.keys(t.input_schema).length > 0 && (
                      <div>
                        <span className="font-medium text-foreground">Input params: </span>
                        {Object.keys(t.input_schema).join(", ")}
                      </div>
                    )}
                    {t.credential_key && (
                      <div>
                        <span className="font-medium text-foreground">Credential key: </span>
                        <span className="font-mono">{t.credential_key}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
