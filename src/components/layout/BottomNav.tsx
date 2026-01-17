import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Dog,
  ShoppingCart,
  Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "atendente" | "tosador";

type NavItem = {
  path: string;
  label: string;
  icon: any;
  allow: AppRole[];
};

const navItems: NavItem[] = [
  { path: "/", label: "Início", icon: LayoutDashboard, allow: ["admin", "atendente", "tosador"] },
  { path: "/agenda", label: "Agenda", icon: Calendar, allow: ["admin", "atendente", "tosador"] },
  { path: "/clientes", label: "Clientes", icon: Dog, allow: ["admin", "atendente"] },
  { path: "/vendas", label: "PDV", icon: ShoppingCart, allow: ["admin", "atendente"] },
  { path: "/configuracoes", label: "Config", icon: Settings, allow: ["admin"] },
];

export function BottomNav() {
  const location = useLocation();
  const { role } = useAuth();

  const visibleItems = navItems.filter((i) => !role || i.allow.includes(role as AppRole));

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around py-2">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[64px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-xs font-medium", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
