import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const OnboardingPage = () => {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, refreshOrgData, signOut } = useAuth();
  const navigate = useNavigate();

  const createOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !user) return;
    setLoading(true);

    // Create org
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: orgName.trim() })
      .select()
      .single();

    if (orgError) {
      toast.error("Không thể tạo tổ chức: " + orgError.message);
      setLoading(false);
      return;
    }

    // Create membership as admin
    const { error: memError } = await supabase
      .from("organization_memberships")
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: "admin",
      });

    if (memError) {
      toast.error("Không thể tạo membership: " + memError.message);
      setLoading(false);
      return;
    }

    await refreshOrgData();
    toast.success("Tạo tổ chức thành công!");
    navigate("/admin");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(174_62%_40%/0.06),transparent_70%)]" />
      <div className="relative z-10 w-full max-w-md p-6">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl echo-gradient-bg">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Echo</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="mb-2 text-center text-xl font-semibold text-foreground">
            Tạo tổ chức
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Tạo tổ chức để bắt đầu sử dụng Echo Dashboard
          </p>

          <form onSubmit={createOrganization} className="space-y-4">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tên tổ chức"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="bg-secondary border-border pl-10"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full echo-gradient-bg text-primary-foreground hover:opacity-90"
            >
              {loading ? "Đang tạo..." : "Tạo tổ chức"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <button
            onClick={signOut}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
