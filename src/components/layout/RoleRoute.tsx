"use client";

import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Dog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "administrador" | "atendente" | "tosador" | "medico";

interface RoleRouteProps {
  children: ReactNode;
  allow: AppRole[];
}

export function RoleRoute({ children, allow }: RoleRouteProps) {
  const location = useLocation();
  const { user, role, isLoading } = useAuth();

  // Se ainda está carregando a sessão OU se temos um usuário mas o papel ainda não foi determinado
  if (isLoading || (user && !role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Dog className="w-10 h-10 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Administrador sempre tem acesso total
  if (role === "administrador") {
    return <>{children}</>;
  }

  if (!role || !allow.includes(role as AppRole)) {
    return (
      <Navigate
        to="/nao-autorizado"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}