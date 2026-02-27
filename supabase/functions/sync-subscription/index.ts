import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const suffix = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SYNC-SUBSCRIPTION] ${step}${suffix}`);
};

function computeStatus(validUntilIso: string) {
  const validUntil = new Date(validUntilIso);
  const now = new Date();

  const msToExpiry = validUntil.getTime() - now.getTime();
  const daysToExpiry = msToExpiry / (1000 * 60 * 60 * 24);

  if (msToExpiry >= 0) {
    if (daysToExpiry <= 10) return "A_VENCER";
    return "ATIVO";
  }

  const daysSinceExpiry = Math.abs(daysToExpiry);
  if (daysSinceExpiry > 15) return "BLOQUEADA";
  return "VENCIDA";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured");
    if (!supabaseAnon) throw new Error("SUPABASE_ANON_KEY is not configured");
    if (!supabaseService) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuthed = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuthed.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userError } = await supabaseAuthed.auth.getUser();
    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Usuário sem e-mail" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer?.id) {
      logStep("No customer for email", { email: userData.user.email });
      // Sem customer => sem como sincronizar (não é erro fatal)
      return new Response(JSON.stringify({ ok: true, synced: false, reason: "no_customer" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pega assinatura mais recente (ACTIVE ou TRIALING)
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 10 });
    const candidates = subs.data
      .filter((s) => s.status === "active" || s.status === "trialing")
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

    const sub = candidates[0];
    if (!sub?.id) {
      logStep("No active/trialing subscription", {
        customerId: customer.id,
        statuses: subs.data.map((s) => s.status),
      });
      return new Response(JSON.stringify({ ok: true, synced: false, reason: "no_active_or_trialing_subscription" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retrieve completo para garantir current_period_end e price expandido
    const fullSub = await stripe.subscriptions.retrieve(sub.id, { expand: ["items.data.price"] });

    // --- Plano atual ---
    const metaPlanKey = String((fullSub.metadata as any)?.plan_key ?? "").trim() || null;

    const item0 = fullSub.items?.data?.[0];
    const priceId = String((item0 as any)?.price?.id ?? (item0 as any)?.plan?.id ?? "").trim() || null;

    const priceMensal = String(Deno.env.get("STRIPE_PRICE_ID_MENSAL") ?? "").trim();
    const priceSemestral = String(Deno.env.get("STRIPE_PRICE_ID_SEMESTRAL") ?? "").trim();
    const priceAnual = String(Deno.env.get("STRIPE_PRICE_ID_ANUAL") ?? "").trim();

    let planKey: string | null = metaPlanKey;
    if (!planKey && priceId) {
      if (priceMensal && priceId === priceMensal) planKey = "mensal";
      else if (priceSemestral && priceId === priceSemestral) planKey = "semestral";
      else if (priceAnual && priceId === priceAnual) planKey = "anual";
    }

    if (!planKey) {
      logStep("Plan key not resolved", { subId: fullSub.id, metaPlanKey, priceId });
    }

    // --- Validade ---
    // current_period_end pode vir no topo OU no item. Vamos usar fallback.
    const topPeriodEndSeconds = Number((fullSub as any)?.current_period_end);
    const itemPeriodEndSeconds = Number((item0 as any)?.current_period_end);

    let periodEndSeconds: number | null = null;
    let periodEndSource: "top" | "item" | "invoice" | "missing" = "missing";

    if (Number.isFinite(topPeriodEndSeconds) && topPeriodEndSeconds > 0) {
      periodEndSeconds = topPeriodEndSeconds;
      periodEndSource = "top";
    } else if (Number.isFinite(itemPeriodEndSeconds) && itemPeriodEndSeconds > 0) {
      periodEndSeconds = itemPeriodEndSeconds;
      periodEndSource = "item";
    }

    if (!periodEndSeconds) {
      // fallback final: pegar a invoice mais recente vinculada à assinatura e usar period_end
      try {
        const invoices = await stripe.invoices.list({ subscription: fullSub.id, limit: 5 });
        const withPeriodEnd = invoices.data
          .filter((inv) => typeof inv.period_end === "number" && inv.period_end > 0)
          .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

        const inv0 = withPeriodEnd[0];
        if (inv0?.period_end) {
          periodEndSeconds = inv0.period_end;
          periodEndSource = "invoice";
        }
      } catch (e) {
        logStep("Invoice fallback failed", { err: String(e), subId: fullSub.id });
      }
    }

    if (!periodEndSeconds) {
      logStep("Invalid current_period_end", {
        subId: fullSub.id,
        top: (fullSub as any)?.current_period_end,
        item: (item0 as any)?.current_period_end,
        source: periodEndSource,
      });
      return new Response(JSON.stringify({ ok: true, synced: false, reason: "missing_current_period_end" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validUntilDate = new Date(periodEndSeconds * 1000);
    if (Number.isNaN(validUntilDate.getTime())) {
      logStep("Invalid validUntilDate", { subId: fullSub.id, periodEndSeconds, source: periodEndSource });
      return new Response(JSON.stringify({ ok: true, synced: false, reason: "invalid_valid_until" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validUntilIso = validUntilDate.toISOString();
    const status = computeStatus(validUntilIso);

    logStep("Resolved subscription snapshot", {
      customerId: customer.id,
      subId: fullSub.id,
      stripeStatus: fullSub.status,
      priceId,
      planKey,
      periodEndSeconds,
      periodEndSource,
      validUntilIso,
      status,
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseService, { auth: { persistSession: false } });

    // CNPJ via profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("cnpj")
      .eq("user_id", claimsData.claims.sub)
      .maybeSingle();

    if (profileError) throw new Error(`profiles lookup failed: ${profileError.message}`);
    const cnpj = String(profile?.cnpj ?? "").trim();
    if (!cnpj) throw new Error("Usuário sem CNPJ vinculado");

    logStep("Upserting company_subscriptions", { cnpj, stripe_subscription_id: sub.id, planKey, validUntilIso, status });

    const { error: upsertError } = await supabaseAdmin
      .from("company_subscriptions")
      .upsert(
        {
          cnpj,
          stripe_customer_id: customer.id,
          stripe_subscription_id: sub.id,
          current_plan_key: planKey,
          valid_until: validUntilIso,
          status,
        },
        { onConflict: "cnpj" },
      );

    if (upsertError) throw new Error(`company_subscriptions upsert failed: ${upsertError.message}`);

    // Sincroniza últimos pagamentos de forma confiável (idempotente por stripe_invoice_id)
    try {
      const invoicesRes = await stripe.invoices.list({ subscription: fullSub.id, limit: 5 });
      const paidInvoices = invoicesRes.data
        .filter((inv) => inv.status === "paid" || Boolean(inv.status_transitions?.paid_at))
        .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

      const invoiceIds = paidInvoices.map((inv) => inv.id).filter(Boolean);
      if (invoiceIds.length > 0) {
        const { data: existingRows, error: existingErr } = await supabaseAdmin
          .from("subscription_payments")
          .select("stripe_invoice_id")
          .eq("cnpj", cnpj)
          .in("stripe_invoice_id", invoiceIds);

        if (existingErr) throw new Error(`subscription_payments lookup failed: ${existingErr.message}`);

        const existingSet = new Set((existingRows ?? []).map((r) => r.stripe_invoice_id).filter(Boolean));

        for (const inv of paidInvoices) {
          if (!inv?.id) continue;
          if (existingSet.has(inv.id)) continue;

          let paidAt = new Date().toISOString();
          const paidAtSeconds = inv.status_transitions?.paid_at;
          if (paidAtSeconds) {
            const d = new Date(paidAtSeconds * 1000);
            if (!Number.isNaN(d.getTime())) paidAt = d.toISOString();
          }

          const insertPayload = {
            cnpj,
            stripe_customer_id: customer.id,
            stripe_subscription_id: fullSub.id,
            stripe_invoice_id: inv.id,
            stripe_payment_intent_id:
              typeof inv.payment_intent === "string" ? inv.payment_intent : inv.payment_intent?.id ?? null,
            amount: inv.amount_paid ? Number(inv.amount_paid) / 100 : null,
            currency: inv.currency ?? null,
            paid_at: paidAt,
            plan_key: planKey,
            period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
            period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          };

          logStep("Inserting subscription_payment", {
            cnpj,
            stripe_invoice_id: inv.id,
            amount: insertPayload.amount,
            currency: insertPayload.currency,
            paid_at: insertPayload.paid_at,
          });

          const { error: insErr } = await supabaseAdmin.from("subscription_payments").insert(insertPayload);
          if (insErr) throw new Error(`subscription_payments insert failed: ${insErr.message}`);
        }
      }
    } catch (e) {
      // Não falha a sincronização do plano por causa do histórico; mas loga para suporte.
      logStep("Failed syncing invoices", { err: String(e), cnpj, subId: fullSub.id });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        synced: true,
        stripe_customer_id: customer.id,
        stripe_subscription_id: sub.id,
        current_plan_key: planKey,
        valid_until: validUntilIso,
        status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
