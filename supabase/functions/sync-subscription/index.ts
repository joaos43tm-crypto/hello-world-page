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
      // Sem customer => sem como sincronizar (não é erro fatal)
      return new Response(JSON.stringify({ ok: true, synced: false, reason: "no_customer" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pega assinatura ativa mais recente
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 5 });
    const sub = subs.data.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];
    if (!sub?.id) {
      return new Response(JSON.stringify({ ok: true, synced: false, reason: "no_active_subscription" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planKey = String((sub.metadata as any)?.plan_key ?? "").trim() || null;
    const validUntilIso = new Date(sub.current_period_end * 1000).toISOString();
    const status = computeStatus(validUntilIso);

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

    // Tenta registrar o último invoice pago (idempotente por stripe_invoice_id)
    let invoice: Stripe.Invoice | null = null;
    const latestInvoiceId = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
    if (latestInvoiceId) {
      try {
        invoice = await stripe.invoices.retrieve(latestInvoiceId);
      } catch (e) {
        logStep("Failed to retrieve latest invoice", { err: String(e), latestInvoiceId });
      }
    }

    if (invoice?.id) {
      const { data: existingPayment, error: existingPaymentErr } = await supabaseAdmin
        .from("subscription_payments")
        .select("id")
        .eq("cnpj", cnpj)
        .eq("stripe_invoice_id", invoice.id)
        .limit(1);

      if (existingPaymentErr) throw new Error(`subscription_payments lookup failed: ${existingPaymentErr.message}`);

      if (!existingPayment || existingPayment.length === 0) {
        const paidAt = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : new Date().toISOString();

        await supabaseAdmin.from("subscription_payments").insert({
          cnpj,
          stripe_customer_id: customer.id,
          stripe_subscription_id: sub.id,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id:
            typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id ?? null,
          amount: invoice.amount_paid ? Number(invoice.amount_paid) / 100 : null,
          currency: invoice.currency ?? null,
          paid_at: paidAt,
          plan_key: planKey,
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
        });
      }
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
