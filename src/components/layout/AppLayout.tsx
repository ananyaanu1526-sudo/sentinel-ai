import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ShieldCheck, LayoutDashboard, ScanSearch, AlertTriangle, Network, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/analyzer", label: "Analyzer", icon: ScanSearch },
  { to: "/threats", label: "Threats", icon: AlertTriangle },
  { to: "/intelligence", label: "Intel graph", icon: Network },
];

export const AppLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const out = async () => { await signOut(); navigate("/", { replace: true }); };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar border-r border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-md bg-gradient-primary grid place-items-center shadow-glow">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="mono font-bold tracking-wider text-sidebar-foreground">SENTINEL<span className="text-primary">.AI</span></div>
            <div className="text-[10px] text-muted-foreground mono uppercase tracking-widest">SOC v1.0</div>
          </div>
        </Link>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="mono text-[10px] text-muted-foreground uppercase mb-2">Operator</div>
          <div className="text-sm truncate text-sidebar-foreground">{user?.email}</div>
          <Button variant="ghost" size="sm" onClick={out} className="mt-2 w-full justify-start gap-2 text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-primary grid place-items-center"><ShieldCheck className="w-4 h-4 text-primary-foreground" /></div>
            <span className="mono font-bold text-sm">SENTINEL.AI</span>
          </div>
          <Button size="sm" variant="ghost" onClick={out}><LogOut className="w-4 h-4" /></Button>
        </header>

        <div className="md:hidden grid grid-cols-4 border-b border-border bg-card text-xs">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) => cn("py-2 flex flex-col items-center gap-1", isActive ? "text-primary" : "text-muted-foreground")}>
              <n.icon className="w-4 h-4" />{n.label}
            </NavLink>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
