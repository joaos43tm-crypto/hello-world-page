import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, RefreshCw, Ban } from "lucide-react";

type PlanKey = "mensal" | "trimestral" | "semestral" | "anual";

type Plan = { key: PlanKey; label: string; period: string };

type PaymentRow = {
  id: string;
  paid_at: string;
  amount: number | null;
  currency: string | null;
  plan_key: string | null;
};

const plans: Plan[] = [
  { key: "mensal", label: "Mensal", period: "30 dias" },
  { key: "trimestral", label: "Trimestral", period: "93 dias" },
  { key: "semestral", label: "Semestral", period: "186 dias" },
  { key: "anual", label: "Anual", period: "1 ano" },
];

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

function normalizePlanKey(value?: string | null): PlanKey | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  const cleaned = v.startsWith("petcontrol_") ? v.replace(/^petcontrol_/, "") : v;
  if (cleaned === "mensal") return "mensal";
  if (cleaned === "trimestral") return "trimestral";
  if (cleaned === "semestral") return "semestral";
  if (cleaned === "anual") return "anual";
  return null;
}

function formatMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount === null || amount === undefined) return "-";
  const cur = (currency || "BRL").toUpperCase();
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(amount);
  } catch {
    // fallback
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  }
}

export function SubscriptionTab() {
  const { toast } = useToast();
  const { isAdmin, subscription, refreshSubscription } = useAuth();

  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [cancelPeriodEndIso, setCancelPeriodEndIso] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    const s = subscription?.status;
    if (!s) return { text: "-", variant: "secondary" as const };

    if (s === "ATIVO") return { text: "ATIVO", variant: "default" as const };
    if (s === "A_VENCER") return { text: "A VENCER", variant: "secondary" as const };
    if (s === "VENCIDA") return { text: "VENCIDA", variant: "destructive" as const };
    return { text: "BLOQUEADA", variant: "destructive" as const };
  }, [subscription?.status]);

  const currentPlanKey = useMemo(() => normalizePlanKey(subscription?.current_plan_key), [subscription?.current_plan_key]);
  const currentPlanLabel = useMemo(() => {
    if (!subscription) return "-";
    if (!subscription.current_plan_key) return "Teste / sem plano";

    const normalized = normalizePlanKey(subscription.current_plan_key);
    if (!normalized) return subscription.current_plan_key;
    return plans.find((p) => p.key === normalized)?.label ?? subscription.current_plan_key;
  }, [subscription]);

  const paymentsQuery = useQuery({
    queryKey: ["subscription_payments", "last5"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("id, paid_at, amount, currency, plan_key")
        .order("paid_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });

  const handleRefresh = async () => {
    await refreshSubscription();
    await paymentsQuery.refetch();
  };

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

  const cancelPlan = async () => {
    if (!isAdmin) {
      toast({ title: "Apenas o administrador pode cancelar o plano.", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", { body: {} });
      if (error) throw error;

      const shouldCancelAtPeriodEnd = Boolean(data?.cancel_at_period_end);
      const periodEndIso = data?.current_period_end ? new Date(data.current_period_end * 1000).toISOString() : null;

      setCancelAtPeriodEnd(shouldCancelAtPeriodEnd);
      setCancelPeriodEndIso(periodEndIso);

      toast({
        title: "Cancelamento solicitado",
        description: "A assinatura será encerrada ao fim do período atual.",
      });

      await handleRefresh();

      return data;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast({
        title: "Não foi possível cancelar",
        description: message,
        variant: "destructive",
      });
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

        <Button variant="outline" className="gap-2" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Plano atual</p>
          <p className="mt-1 font-semibold text-foreground">{currentPlanLabel}</p>
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

      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Cancelamento</p>
            <p className="text-sm text-muted-foreground">Cancela no fim do período atual (sem bloquear imediatamente).</p>
            {cancelAtPeriodEnd && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Cancelamento agendado</span>
                {cancelPeriodEndIso ? ` • Término em ${formatDate(cancelPeriodEndIso)}` : ""}
              </p>
            )}
          </div>

          <Button variant="destructive" className="gap-2" onClick={cancelPlan} disabled={!isAdmin}>
            <Ban className="h-4 w-4" />
            Cancelar plano
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Últimos 5 pagamentos</h3>
        </div>

        <div className="rounded-xl border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}

              {paymentsQuery.isError && (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-destructive">
                    Não foi possível carregar pagamentos.
                  </TableCell>
                </TableRow>
              )}

              {!paymentsQuery.isLoading && !paymentsQuery.isError && (paymentsQuery.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Nenhum pagamento encontrado.
                  </TableCell>
                </TableRow>
              )}

              {paymentsQuery.data?.map((p) => {
                const normalized = normalizePlanKey(p.plan_key);
                const planLabel = normalized ? plans.find((x) => x.key === normalized)?.label ?? p.plan_key : p.plan_key;

                return (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paid_at)}</TableCell>
                    <TableCell>{planLabel || "-"}</TableCell>
                    <TableCell className="text-right">{formatMoney(p.amount, p.currency)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Planos disponíveis</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plans.map((p) => (
            <div key={p.key} className="rounded-xl border bg-background p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{p.label}</p>
                  <p className="text-sm text-muted-foreground">Validade: {p.period}</p>
                </div>
                {currentPlanKey === p.key && <Badge variant="secondary">Atual</Badge>}
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

