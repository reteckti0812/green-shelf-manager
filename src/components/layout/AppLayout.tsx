import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Users,
  Tag,
  History,
  Map,
  Boxes,
  PauseCircle,
  MapPinOff,
  Activity,
  LogOut,
  WifiOff,
  Wifi,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoGlobo from "@/assets/logo-globo.png";
import logoCompleto from "@/assets/logo-completo.png";

type NavItem = { to: string; label: string; icon: any; end?: boolean };

const operadorNav: NavItem[] = [
  { to: "/", label: "Identificar lote", icon: Boxes, end: true },
  { to: "/lotes-pausados", label: "Lotes pausados", icon: PauseCircle },
  { to: "/lotes-sem-localizacao", label: "Sem localização", icon: MapPinOff },
  { to: "/mapa", label: "Mapa do estoque", icon: Map },
];

const adminNav: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/tempo-real", label: "Tempo real", icon: Activity },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/defeitos", label: "Defeitos", icon: AlertTriangle },
  { to: "/admin/legendas", label: "Legendas", icon: Tag },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/auditoria", label: "Auditoria", icon: History },
];

function pageTitle(path: string): string {
  const all = [...operadorNav, ...adminNav];
  const match = all.find((n) => (n.end ? path === n.to : path.startsWith(n.to)));
  return match?.label ?? "Intranet";
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, isAdmin, signOut } = useAuth();
  const online = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Sidebar fixa */}
      <aside className="fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logoGlobo} alt="Re-Teck" className="h-10 w-10 object-contain shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white leading-tight">Re-Teck</div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                Reverse Supply Chain
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          <div>
            <div className="px-5 mb-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              Operação
            </div>
            <ul className="space-y-0.5 px-2">
              {operadorNav.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {isAdmin && (
            <div>
              <div className="px-5 mb-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
                Administração
              </div>
              <ul className="space-y-0.5 px-2">
                {adminNav.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
          v1.0 · {role === "admin" ? "Administrador" : "Operador"}
        </div>
      </aside>

      {/* Main com offset da sidebar fixa */}
      <div className="ml-64 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4 min-w-0">
            <img src={logoCompleto} alt="Re-Teck — Reverse Supply Chain Management" className="h-9 object-contain hidden sm:block" />
            <div className="hidden md:block h-8 w-px bg-border" />
            <h1 className="text-base font-semibold truncate">{pageTitle(location.pathname)}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium",
                online
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive animate-pulse-soft"
              )}
            >
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {online ? "Online" : "Sem conexão"}
            </div>
            <div className="text-right">
              <div className="text-sm font-medium leading-tight">{profile?.nome ?? "—"}</div>
              <div className="text-xs text-muted-foreground leading-tight">
                {profile?.cargo ?? (isAdmin ? "Administrador" : "Operador")}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        {!online && (
          <div className="bg-destructive text-destructive-foreground px-6 py-2.5 text-sm flex items-center gap-2 sticky top-16 z-20">
            <ShieldAlert className="h-4 w-4" />
            Conexão perdida — novas ações estão bloqueadas. Lotes em andamento foram pausados automaticamente.
          </div>
        )}

        <main className="flex-1 p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
