import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  Dog, 
  ShoppingCart, 
  BarChart3,
  Settings,
  Package,
  Scissors,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

type AppRole = "administrador" | "atendente" | "tosador" | "medico";

type SidebarItem = {
  path: string;
  label: string;
  icon: any;
  allow: AppRole[];
};

const mainNavItems: SidebarItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, allow: ["administrador", "atendente", "tosador", "medico"] },
  { path: "/agenda", label: "Agenda", icon: Calendar, allow: ["administrador", "atendente", "tosador", "medico"] },
  { path: "/consulta-medica", label: "Consulta Médica", icon: Stethoscope, allow: ["administrador", "atendente", "medico"] },
  { path: "/clientes", label: "Clientes & Pets", icon: Dog, allow: ["administrador", "atendente"] },
  { path: "/vendas", label: "PDV", icon: ShoppingCart, allow: ["administrador", "atendente"] },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3, allow: ["administrador", "atendente"] },
];

const settingsNavItems: SidebarItem[] = [
  { path: "/servicos", label: "Serviços", icon: Scissors, allow: ["administrador"] },
  { path: "/produtos", label: "Produtos", icon: Package, allow: ["administrador"] },
  { path: "/configuracoes", label: "Configurações", icon: Settings, allow: ["administrador"] },
];

export function Sidebar() {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();

  const roleLabel =
    role === "administrador"
      ? "Administrador"
      : role === "atendente"
        ? "Atendente"
        : role === "medico"
          ? "Médico"
          : "Tosador";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Dog className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">PetControl</h1>
          <p className="text-xs text-muted-foreground">Gestão de Pet Shop</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-3 border-b border-border">
        <p className="font-medium text-foreground text-sm truncate">{profile?.name || "Usuário"}</p>
        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
          {roleLabel}
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Menu Principal
        </p>
        {mainNavItems
          .filter((item) => !role || item.allow.includes(role as AppRole))
          .map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "nav-item",
                  isActive && "nav-item-active"
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

        <div className="pt-4">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cadastros
          </p>
          {settingsNavItems
            .filter((item) => !role || item.allow.includes(role as AppRole))
            .map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "nav-item",
                    isActive && "nav-item-active"
                  )}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut size={18} />
          Sair
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          © 2024 PetControl
        </p>
      </div>
    </aside>
  );
}
