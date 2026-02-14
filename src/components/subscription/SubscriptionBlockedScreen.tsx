import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function SubscriptionBlockedScreen() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-6">
      <div className="pet-card max-w-lg text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Sua assinatura está vencida.</h1>
        <p className="text-muted-foreground">
          Para continuar utilizando o sistema, acesse a aba Assinatura.
        </p>
        <Button asChild className="w-full">
          <Link to="/configuracoes?tab=assinatura">Ir para Assinatura</Link>
        </Button>
      </div>
    </div>
  );
}
