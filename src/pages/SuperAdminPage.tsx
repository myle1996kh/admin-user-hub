import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Building2, Users, Trash2, Search, ArrowLeft, Crown, Eye, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrgMembers } from "@/components/admin/super/OrgMembers";
import { OrgSettings } from "@/components/admin/super/OrgSettings";
import { OrgConversations } from "@/components/admin/super/OrgConversations";

interface OrgWithStats {
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
  const [orgs, setOrgs] = useState<OrgWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<OrgWithStats | null>(null);

  useEffect(() => {
    if (!loading && !user) { navigate("/auth"); return; }
    if (!loading && user && !isSuperAdmin) { navigate("/admin"); return; }
  }, [user, loading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchOrgs();
  }, [isSuperAdmin]);

  const fetchOrgs = async () => {
    setLoadingData(true);
    const [{ data: organizations }, { data: memberships }, { data: conversations }] = await Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("organization_memberships").select("organization_id"),
      supabase.from("conversations").select("organization_id"),
    ]);

    if (!organizations) { setLoadingData(false); return; }

    setOrgs(organizations.map((org) => ({
      ...org,
      memberCount: memberships?.filter((m: any) => m.organization_id === org.id).length || 0,
      conversationCount: conversations?.filter((c: any) => c.organization_id === org.id).length || 0,
    })));
    setLoadingData(false);
  };

  const deleteOrg = async (orgId: string, orgName: string) => {
    if (!confirm(`Xóa tổ chức "${orgName}"? Hành động này không thể hoàn tác.`)) return;
    const { error } = await supabase.from("organizations").delete().eq("id", orgId);
    if (error) { toast.error("Lỗi: " + error.message); }
    else {
      toast.success("Đã xóa tổ chức");
      if (selectedOrg?.id === orgId) setSelectedOrg(null);
      fetchOrgs();
    }
  };

  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search.toLowerCase())
  );

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left: Org List */}
      <div className={`flex flex-col border-r border-border ${selectedOrg ? "w-96" : "flex-1"} transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <Shield className="h-4 w-4 text-destructive" />
            </div>
            <span className="font-semibold text-foreground">Super Admin</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 p-3 border-b border-border">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <Building2 className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{orgs.length}</p>
            <p className="text-[10px] text-muted-foreground">Tổ chức</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{orgs.reduce((s, o) => s + o.memberCount, 0)}</p>
            <p className="text-[10px] text-muted-foreground">Thành viên</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <MessageSquare className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{orgs.reduce((s, o) => s + o.conversationCount, 0)}</p>
            <p className="text-[10px] text-muted-foreground">Hội thoại</p>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm tổ chức..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-sm bg-secondary border-border"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingData ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Đang tải...</p>
          ) : filteredOrgs.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Không có tổ chức nào</p>
          ) : (
            filteredOrgs.map((org) => (
              <div
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className={`flex items-center justify-between border-b border-border/50 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${
                  selectedOrg?.id === org.id ? "bg-muted/50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">{org.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{org.memberCount} members</span>
                    <span className="text-[11px] text-muted-foreground">{org.conversationCount} convos</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setSelectedOrg(org); }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); deleteOrg(org.id, org.name); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Org Detail */}
      {selectedOrg ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Detail header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{selectedOrg.name}</h2>
              <p className="text-xs text-muted-foreground font-mono">{selectedOrg.id}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrg(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="members" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="members">Thành viên</TabsTrigger>
              <TabsTrigger value="conversations">Hội thoại</TabsTrigger>
              <TabsTrigger value="settings">Cài đặt</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="members" className="mt-0">
                <OrgMembers organizationId={selectedOrg.id} />
              </TabsContent>
              <TabsContent value="conversations" className="mt-0">
                <OrgConversations organizationId={selectedOrg.id} />
              </TabsContent>
              <TabsContent value="settings" className="mt-0">
                <OrgSettings organization={selectedOrg} onUpdated={fetchOrgs} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      ) : (
        <div className="hidden" />
      )}
    </div>
  );
};

export default SuperAdminPage;
