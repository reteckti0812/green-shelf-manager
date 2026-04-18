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

const operadorNav = [
  { to: "/", label: "Identificar lote", icon: Boxes, end: true },
  { to: "/lotes-pausados", label: "Lotes pausados", icon: PauseCircle },
  { to: "/lotes-sem-localizacao", label: "Sem localização", icon: MapPinOff },
  { to: "/mapa", label: "Mapa do estoque", icon: Map },
];

const adminNav = [
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
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-sidebar-primary flex items-center justify-center">
              <Boxes className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Almoxarifado</div>
              <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">
                Intranet corporativa
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
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
          <div className="bg-destructive text-destructive-foreground px-6 py-2.5 text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Conexão perdida — novas ações estão bloqueadas. Lotes em andamento foram pausados automaticamente.
          </div>
        )}

        <main className="flex-1 overflow-auto p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
