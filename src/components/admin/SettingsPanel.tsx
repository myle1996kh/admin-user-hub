import { useState } from "react";
import { Copy, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SettingsPanelProps {
  organization: any;
  membership: any;
}

// ─── small reusable field wrapper ─────────────────────────────────────────────
const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
    {children}
  </div>
);

export const SettingsPanel = ({ organization, membership }: SettingsPanelProps) => {
  const { signOut, refreshOrgData } = useAuth();
  const isAdmin = membership?.role === "admin";

  // ── Section 1: Organisation ──────────────────────────────────────────────
  const [orgName, setOrgName] = useState<string>(organization.name ?? "");
  const [greeting, setGreeting] = useState<string>(organization.widget_greeting ?? "");
  const [aiModel, setAiModel] = useState<string>(
    organization.ai_model ?? "google/gemini-3-flash-preview"
  );

  // ── Section 2: Supporter Config ──────────────────────────────────────────
  const [scopeMode, setScopeMode] = useState<string>(
    organization.supporter_scope_mode ?? "assigned_only"
  );
  const [autoAssign, setAutoAssign] = useState<boolean>(
    organization.auto_assign_enabled ?? false
  );
  const [assignStrategy, setAssignStrategy] = useState<string>(
    organization.auto_assign_strategy ?? "least_busy"
  );
  const [requireOnline, setRequireOnline] = useState<boolean>(
    organization.require_online_for_auto ?? true
  );
  const [fallbackMode, setFallbackMode] = useState<string>(
    organization.fallback_if_no_online ?? "queue"
  );
  const [maxConcurrent, setMaxConcurrent] = useState<number>(
    organization.max_concurrent_per_supporter ?? 5
  );

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const widgetUrl = `${window.location.origin}/widget?org=${organization.id}`;

  const copyWidgetUrl = () => {
    navigator.clipboard.writeText(widgetUrl);
    setCopied(true);
    toast.success("Đã copy link widget!");
    setTimeout(() => setCopied(false), 2000);
  };

  const saveSettings = async () => {
    if (!isAdmin) return;
    setSaving(true);

    const { error } = await supabase
      .from("organizations")
      .update({
        // org basics
        name: orgName,
        widget_greeting: greeting,
        ai_model: aiModel,
        // supporter config
        supporter_scope_mode: scopeMode,
        auto_assign_enabled: autoAssign,
        auto_assign_strategy: assignStrategy,
        require_online_for_auto: requireOnline,
        fallback_if_no_online: fallbackMode,
        max_concurrent_per_supporter: maxConcurrent,
      } as any)
      .eq("id", organization.id);

    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã lưu cài đặt!");
      await refreshOrgData();
    }
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cài đặt</h2>
          <p className="text-sm text-muted-foreground">Quản lý tổ chức và cấu hình widget</p>
        </div>

        {/* ── Widget URL ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Widget Link</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Chia sẻ link này cho khách hàng hoặc nhúng vào website
          </p>
          <div className="flex gap-2">
            <Input
              value={widgetUrl}
              readOnly
              className="bg-secondary border-border text-xs font-mono"
            />
            <Button onClick={copyWidgetUrl} variant="outline" size="icon" className="shrink-0">
              {copied ? (
                <Check className="h-4 w-4 text-echo-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* ── Organisation Settings ─────────────────────────────────────── */}
        {isAdmin && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Tổ chức</h3>

            <Field label="Tên tổ chức">
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="mt-1 bg-secondary border-border"
              />
            </Field>

            <Field label="Lời chào Widget">
              <Input
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="mt-1 bg-secondary border-border"
              />
            </Field>

            <Field label="AI Model">
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger className="mt-1 bg-secondary border-border">
                  <SelectValue placeholder="Chọn model AI" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="google/gemini-3-flash-preview">
                    Gemini 3 Flash (Nhanh, cân bằng)
                  </SelectItem>
                  <SelectItem value="google/gemini-3-pro-preview">
                    Gemini 3 Pro (Mạnh nhất)
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-flash">
                    Gemini 2.5 Flash (Tiết kiệm)
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-flash-lite">
                    Gemini 2.5 Flash Lite (Rẻ nhất)
                  </SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5 (Chính xác cao)</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini (Cân bằng)</SelectItem>
                  <SelectItem value="openai/gpt-5-nano">GPT-5 Nano (Nhanh, rẻ)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {/* ── Supporter Config ──────────────────────────────────────────── */}
        {isAdmin && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Cấu hình Hỗ trợ</h3>
            </div>

            {/* Scope mode */}
            <Field
              label="Phạm vi hội thoại của Supporter"
              hint="Supporter có thể thấy những hội thoại nào?"
            >
              <Select value={scopeMode} onValueChange={setScopeMode}>
                <SelectTrigger className="mt-1 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="assigned_only">
                    Chỉ hội thoại được gán cho mình
                  </SelectItem>
                  <SelectItem value="all_escalated">
                    Queue chung — ai nhận thì nhận
                  </SelectItem>
                  <SelectItem value="team_pool">
                    Pool theo nhóm (sắp có)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* Auto-assign toggle */}
            <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Tự động gán hội thoại
                </p>
                <p className="text-xs text-muted-foreground">
                  Khi có escalation mới, tự động assign cho supporter phù hợp
                </p>
              </div>
              <Switch
                checked={autoAssign}
                onCheckedChange={setAutoAssign}
              />
            </div>

            {/* Sub-options — visible only when auto-assign is on */}
            {autoAssign && (
              <div className="space-y-4 pl-3 border-l-2 border-primary/20">
                <Field
                  label="Chiến lược gán"
                  hint="Cách chọn supporter khi có hội thoại cần xử lý"
                >
                  <Select value={assignStrategy} onValueChange={setAssignStrategy}>
                    <SelectTrigger className="mt-1 bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      <SelectItem value="least_busy">
                        Ít bận nhất (Khuyến nghị)
                      </SelectItem>
                      <SelectItem value="round_robin">
                        Luân phiên
                      </SelectItem>
                      <SelectItem value="online_first">
                        Ưu tiên Online
                      </SelectItem>
                      <SelectItem value="manual">
                        Thủ công (tắt auto)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {/* Require online */}
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Chỉ gán khi Supporter Online
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bỏ chọn để gán cho cả supporter offline
                    </p>
                  </div>
                  <Switch
                    checked={requireOnline}
                    onCheckedChange={setRequireOnline}
                  />
                </div>

                {/* Fallback */}
                <Field
                  label="Khi không có Supporter Online"
                  hint="Áp dụng khi bật 'Chỉ gán khi Online' nhưng không ai online"
                >
                  <Select value={fallbackMode} onValueChange={setFallbackMode}>
                    <SelectTrigger className="mt-1 bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      <SelectItem value="queue">
                        Để hàng chờ đến khi có người online
                      </SelectItem>
                      <SelectItem value="notify_all">
                        Thông báo tất cả Supporter
                      </SelectItem>
                      <SelectItem value="assign_anyway">
                        Gán dù Supporter đang offline
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {/* Max concurrent */}
                <Field
                  label="Giới hạn hội thoại đồng thời / Supporter"
                  hint="Supporter sẽ không nhận thêm khi đạt giới hạn này"
                >
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={maxConcurrent}
                    onChange={(e) =>
                      setMaxConcurrent(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="mt-1 bg-secondary border-border w-24"
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        {/* ── Info ─────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Thông tin</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Vai trò:{" "}
              <span className="text-foreground font-medium">
                {membership?.role === "admin"
                  ? "Admin"
                  : membership?.role === "supporter"
                  ? "Supporter"
                  : "Member"}
              </span>
            </p>
            <p>
              Org ID:{" "}
              <span className="text-foreground font-mono text-xs">{organization.id}</span>
            </p>
          </div>
        </div>

        {/* ── Save + Logout ─────────────────────────────────────────────── */}
        {isAdmin && (
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="echo-gradient-bg text-primary-foreground hover:opacity-90"
          >
            {saving ? "Đang lưu..." : "Lưu tất cả cài đặt"}
          </Button>
        )}

        <Button
          onClick={signOut}
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          Đăng xuất
        </Button>
      </div>
    </div>
  );
};
