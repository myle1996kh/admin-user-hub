import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface OrgSettingsProps {
  organization: {
    id: string;
    name: string;
    widget_greeting: string | null;
    ai_model: string | null;
  };
  onUpdated: () => void;
}

export const OrgSettings = ({ organization, onUpdated }: OrgSettingsProps) => {
  const [name, setName] = useState(organization.name);
  const [greeting, setGreeting] = useState(organization.widget_greeting || "");
  const [aiModel, setAiModel] = useState(organization.ai_model || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name,
        widget_greeting: greeting || null,
        ai_model: aiModel || null,
      })
      .eq("id", organization.id);

    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã cập nhật cài đặt");
      onUpdated();
    }
    setSaving(false);
  };

  const widgetUrl = `${window.location.origin}/widget?org=${organization.id}`;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Cài đặt tổ chức</h3>

      <div>
        <label className="text-xs text-muted-foreground">Tên tổ chức</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 bg-secondary border-border"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Lời chào Widget</label>
        <Textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={2}
          className="mt-1 bg-secondary border-border resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">AI Model</label>
        <Input
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          placeholder="google/gemini-3-flash-preview"
          className="mt-1 bg-secondary border-border font-mono text-xs"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Widget URL</label>
        <Input
          value={widgetUrl}
          readOnly
          className="mt-1 bg-secondary border-border font-mono text-xs"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Org ID</label>
        <Input
          value={organization.id}
          readOnly
          className="mt-1 bg-secondary border-border font-mono text-xs"
        />
      </div>

      <Button onClick={save} disabled={saving} className="echo-gradient-bg text-primary-foreground hover:opacity-90">
        {saving ? "Đang lưu..." : "Lưu cài đặt"}
      </Button>
    </div>
  );
};
