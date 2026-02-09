import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SettingsPanelProps {
  organization: any;
  membership: any;
}

export const SettingsPanel = ({ organization, membership }: SettingsPanelProps) => {
  const { signOut, refreshOrgData } = useAuth();
  const [orgName, setOrgName] = useState(organization.name);
  const [greeting, setGreeting] = useState(organization.widget_greeting || "");
  const [aiModel, setAiModel] = useState(organization.ai_model || "google/gemini-3-flash-preview");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const isAdmin = membership?.role === "admin";

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
      .update({ name: orgName, widget_greeting: greeting, ai_model: aiModel })
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

        {/* Widget URL */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Widget Link</h3>
          <p className="mb-3 text-xs text-muted-foreground">Chia sẻ link này cho khách hàng hoặc nhúng vào website</p>
          <div className="flex gap-2">
            <Input value={widgetUrl} readOnly className="bg-secondary border-border text-xs font-mono" />
            <Button onClick={copyWidgetUrl} variant="outline" size="icon" className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-echo-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Org Settings */}
        {isAdmin && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Tổ chức</h3>
            <div>
              <label className="text-xs text-muted-foreground">Tên tổ chức</label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="mt-1 bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Lời chào Widget</label>
              <Input
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="mt-1 bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">AI Model</label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger className="mt-1 bg-secondary border-border">
                  <SelectValue placeholder="Chọn model AI" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (Nhanh, cân bằng)</SelectItem>
                  <SelectItem value="google/gemini-3-pro-preview">Gemini 3 Pro (Mạnh nhất)</SelectItem>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Tiết kiệm)</SelectItem>
                  <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Rẻ nhất)</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5 (Chính xác cao)</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini (Cân bằng)</SelectItem>
                  <SelectItem value="openai/gpt-5-nano">GPT-5 Nano (Nhanh, rẻ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveSettings} disabled={saving} className="echo-gradient-bg text-primary-foreground hover:opacity-90">
              {saving ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Thông tin</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Vai trò: <span className="text-foreground font-medium">{membership?.role === "admin" ? "Admin" : "Member"}</span></p>
            <p>Org ID: <span className="text-foreground font-mono text-xs">{organization.id}</span></p>
          </div>
        </div>

        <Button onClick={signOut} variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
          Đăng xuất
        </Button>
      </div>
    </div>
  );
};
