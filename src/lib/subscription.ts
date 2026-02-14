export type SubscriptionStatus = "ATIVO" | "A_VENCER" | "VENCIDA" | "BLOQUEADA";

export type CompanySubscription = {
  cnpj: string;
  status: SubscriptionStatus;
  valid_until: string;
  trial_started_at: string;
  current_plan_key: string | null;
  updated_at?: string | null;
};

export function isBlocked(status?: SubscriptionStatus | null) {
  return status === "BLOQUEADA";
}
