import { MessageSquare, Inbox, BookOpen, Settings, LogOut, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AdminSidebarProps {
  activeTab: "inbox" | "knowledge" | "settings";
  onTabChange: (tab: "inbox" | "knowledge" | "settings") => void;
  isAdmin?: boolean;
}

const allNavItems = [
  { id: "inbox" as const, icon: Inbox, label: "Inbox", adminOnly: false },
  { id: "knowledge" as const, icon: BookOpen, label: "Knowledge Base", adminOnly: true },
  { id: "settings" as const, icon: Settings, label: "Settings", adminOnly: true },
];

export const AdminSidebar = ({ activeTab, onTabChange, isAdmin = false }: AdminSidebarProps) => {
  const { isSuperAdmin } = useAuth();
  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);
  return (
    <div className="flex h-full w-16 flex-col items-center border-r border-border bg-sidebar py-4 lg:w-56">
      {/* Logo */}
      <Link to="/" className="mb-8 flex items-center gap-2 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg echo-gradient-bg">
          <MessageSquare className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="hidden text-lg font-bold text-foreground lg:block">Echo</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 w-full px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === item.id
                ? "bg-sidebar-accent text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-1 mx-2 w-[calc(100%-1rem)]">
        {isSuperAdmin && (
          <Link
            to="/super-admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
          >
            <Shield className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block">Super Admin</span>
          </Link>
        )}
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden lg:block">Thoát</span>
        </Link>
      </div>
    </div>
  );
};
