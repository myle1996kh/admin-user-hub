import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, Trash2, Crown, User } from "lucide-react";

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: { full_name: string; email: string };
}

interface OrgMembersProps {
  organizationId: string;
}

export const OrgMembers = ({ organizationId }: OrgMembersProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    const { data: memberships } = await supabase
      .from("organization_memberships")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (!memberships) {
      setLoading(false);
      return;
    }

    // Fetch profiles for each member
    const userIds = memberships.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const enriched = memberships.map((m: any) => ({
      ...m,
      profile: profiles?.find((p: any) => p.id === m.user_id),
    }));

    setMembers(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const changeRole = async (membershipId: string, newRole: "admin" | "member") => {
    const { error } = await supabase
      .from("organization_memberships")
      .update({ role: newRole })
      .eq("id", membershipId);

    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã cập nhật role");
      fetchMembers();
    }
  };

  const removeMember = async (membershipId: string, name: string) => {
    if (!confirm(`Xóa "${name}" khỏi tổ chức?`)) return;
    const { error } = await supabase
      .from("organization_memberships")
      .delete()
      .eq("id", membershipId);

    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã xóa thành viên");
      fetchMembers();
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAdding(true);

    // Find profile by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", addEmail.trim())
      .maybeSingle();

    if (!profile) {
      toast.error("Không tìm thấy user với email này");
      setAdding(false);
      return;
    }

    // Check if already a member
    const existing = members.find((m) => m.user_id === profile.id);
    if (existing) {
      toast.error("User đã là thành viên");
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from("organization_memberships")
      .insert({
        user_id: profile.id,
        organization_id: organizationId,
        role: "member",
      });

    if (error) {
      toast.error("Lỗi: " + error.message);
    } else {
      toast.success("Đã thêm thành viên");
      setAddEmail("");
      fetchMembers();
    }
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Thành viên ({members.length})</h3>
      </div>

      {/* Add member form */}
      <form onSubmit={addMember} className="flex gap-2">
        <Input
          placeholder="Email thành viên mới..."
          value={addEmail}
          onChange={(e) => setAddEmail(e.target.value)}
          type="email"
          className="bg-secondary border-border text-sm"
        />
        <Button type="submit" size="sm" disabled={adding} className="shrink-0">
          <UserPlus className="mr-1 h-4 w-4" />
          Thêm
        </Button>
      </form>

      {/* Member list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có thành viên</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {m.role === "admin" ? (
                    <Crown className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {m.profile?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={m.role === "admin" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => changeRole(m.id, m.role === "admin" ? "member" : "admin")}
                >
                  {m.role}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => removeMember(m.id, m.profile?.full_name || "user")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
