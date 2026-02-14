import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";

type PlanKey = "mensal" | "trimestral" | "semestral" | "anual";

const plans: Array<{ key: PlanKey; label: string; period: string; lookupKey: string }> = [
  { key: "mensal", label: "Mensal", period: "30 dias", lookupKey: "petcontrol_mensal" },
  { key: "trimestral", label: "Trimestral", period: "93 dias", lookupKey: "petcontrol_trimestral" },
  { key: "semestral", label: "Semestral", period: "186 dias", lookupKey: "petcontrol_semestral" },
  { key: "anual", label: "Anual", period: "1 ano", lookupKey: "petcontrol_anual" },
];

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export function SubscriptionTab() {
  const { toast } = useToast();
  const { isAdmin, subscription, refreshSubscription } = useAuth();

  const statusLabel = useMemo(() => {
    const s = subscription?.status;
    if (!s) return { text: "-", variant: "secondary" as const };

    if (s === "ATIVO") return { text: "ATIVO", variant: "default" as const };
    if (s === "A_VENCER") return { text: "A VENCER", variant: "secondary" as const };
    if (s === "VENCIDA") return { text: "VENCIDA", variant: "destructive" as const };
    return { text: "BLOQUEADA", variant: "destructive" as const };
  }, [subscription?.status]);

  const startCheckout = async (planKey: PlanKey) => {
    if (!isAdmin) {
      toast({ title: "Apenas o administrador pode assinar um plano.", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan_key: planKey },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Checkout não retornou URL");

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast({
        title: "Não foi possível iniciar o checkout",
        description: message,
        variant: "destructive",
      });
    }
  };

  const openPortal = async () => {
    if (!isAdmin) {
      toast({ title: "Apenas o administrador pode gerenciar a assinatura.", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", { body: {} });
      if (error) throw error;
      if (!data?.url) throw new Error("Portal não retornou URL");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao abrir portal", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="pet-card space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Assinatura</h2>
          <p className="text-sm text-muted-foreground">
            Controle de teste, vencimento e bloqueio por <span className="font-medium text-foreground">CNPJ</span>.
          </p>
        </div>

        <Button variant="outline" className="gap-2" onClick={refreshSubscription}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Plano atual</p>
          <p className="mt-1 font-semibold text-foreground capitalize">
            {subscription?.current_plan_key ? subscription.current_plan_key : "Teste / sem plano"}
          </p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Vencimento</p>
          <p className="mt-1 font-semibold text-foreground">{formatDate(subscription?.valid_until)}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1">
              <Badge variant={statusLabel.variant}>{statusLabel.text}</Badge>
            </div>
          </div>
          <CreditCard className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">
          Para ativar os botões de assinatura, crie no Stripe os <span className="font-medium text-foreground">Prices</span> com
          os seguintes <span className="font-medium text-foreground">lookup_keys</span>:
        </p>
        <ul className="mt-3 grid gap-2 text-sm">
          {plans.map((p) => (
            <li key={p.key} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
              <span className="text-foreground">{p.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{p.lookupKey}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Planos disponíveis</h3>
          <Button variant="outline" onClick={openPortal} className="gap-2">
            Gerenciar no Stripe <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plans.map((p) => (
            <div key={p.key} className="rounded-xl border bg-background p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{p.label}</p>
                  <p className="text-sm text-muted-foreground">Validade: {p.period}</p>
                </div>
                {subscription?.current_plan_key === p.key && (
                  <Badge variant="secondary">Atual</Badge>
                )}
              </div>

              <Button className="mt-4 w-full gap-2" onClick={() => startCheckout(p.key)}>
                <CreditCard className="h-4 w-4" />
                Assinar plano
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Observação: a liberação/bloqueio é automática. Pagamento confirmado atualiza a validade a partir da data do pagamento.
        </p>
      </div>
    </div>
  );
}
