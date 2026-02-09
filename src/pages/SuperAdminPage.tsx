import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Building2, Users, Trash2, Search, ArrowLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrgWithMembers {
  id: string;
  name: string;
  created_at: string;
  widget_greeting: string | null;
  ai_model: string | null;
  memberCount: number;
  conversationCount: number;
}

const SuperAdminPage = () => {
  const { user, loading, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgWithMembers[]>([]);
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (!loading && user && !isSuperAdmin) {
      navigate("/admin");
      return;
    }
  }, [user, loading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchOrgs();
  }, [isSuperAdmin]);

  const fetchOrgs = async () => {
    setLoadingData(true);
    const { data: organizations } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!organizations) {
      setLoadingData(false);
      return;
    }

    // Fetch member counts
    const { data: memberships } = await supabase
      .from("organization_memberships")
      .select("organization_id");

    // Fetch conversation counts
    const { data: conversations } = await supabase
      .from("conversations")
      .select("organization_id");

    const enriched: OrgWithMembers[] = organizations.map((org) => ({
      ...org,
      memberCount: memberships?.filter((m: any) => m.organization_id === org.id).length || 0,
      conversationCount: conversations?.filter((c: any) => c.organization_id === org.id).length || 0,
    }));

    setOrgs(enriched);
    setLoadingData(false);
  };

  const deleteOrg = async (orgId: string, orgName: string) => {
    if (!confirm(`Xóa tổ chức "${orgName}"? Hành động này không thể hoàn tác.`)) return;

    const { error } = await supabase.from("organizations").delete().eq("id", orgId);
    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã xóa tổ chức");
      fetchOrgs();
    }
  };

  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Super Admin</h1>
              <p className="text-xs text-muted-foreground">Quản lý toàn bộ hệ thống</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={signOut} className="text-destructive">
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Building2 className="h-4 w-4" /> Tổ chức
            </div>
            <p className="text-2xl font-bold text-foreground">{orgs.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" /> Thành viên
            </div>
            <p className="text-2xl font-bold text-foreground">
              {orgs.reduce((sum, o) => sum + o.memberCount, 0)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Crown className="h-4 w-4" /> Hội thoại
            </div>
            <p className="text-2xl font-bold text-foreground">
              {orgs.reduce((sum, o) => sum + o.conversationCount, 0)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm tổ chức..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Org list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Tổ chức</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium text-center">Thành viên</th>
                <th className="px-4 py-3 font-medium text-center">Hội thoại</th>
                <th className="px-4 py-3 font-medium">Ngày tạo</th>
                <th className="px-4 py-3 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Không có tổ chức nào
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{org.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-muted-foreground font-mono">{org.id.slice(0, 8)}...</code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary">{org.memberCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline">{org.conversationCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(org.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteOrg(org.id, org.name)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminPage;
