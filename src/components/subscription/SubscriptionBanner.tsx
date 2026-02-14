import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function SubscriptionBanner() {
  const { subscription } = useAuth();

  const show = subscription?.status === "VENCIDA" || subscription?.status === "BLOQUEADA";

  const message = useMemo(() => {
    if (subscription?.status === "BLOQUEADA") {
      return "Sua assinatura está vencida. Para continuar utilizando o sistema, acesse a aba Assinatura.";
    }
    return "Sua conta está Vencida. Acesse a aba Assinatura para continuar utilizando o sistema.";
  }, [subscription?.status]);

  if (!show) return null;

  return (
    <div className={cn("sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70")}> 
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/configuracoes?tab=assinatura">Assinatura</Link>
        </Button>
      </div>
    </div>
  );
}
