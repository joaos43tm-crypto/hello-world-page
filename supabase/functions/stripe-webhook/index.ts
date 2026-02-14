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
  console.log(`[STRIPE-WEBHOOK] ${step}${suffix}`);
};

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function nextValidUntilFromPayment(paidAt: Date, planKey: string) {
  if (planKey === "mensal") return addDays(paidAt, 30);
  if (planKey === "trimestral") return addDays(paidAt, 93);
  if (planKey === "semestral") return addDays(paidAt, 186);
  if (planKey === "anual") {
    const next = new Date(paidAt);
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }
  return addDays(paidAt, 30);
}

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Stripe will send POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured");
    if (!supabaseService) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");

    const payload = await req.text();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);

    logStep("Received event", { type: event.type, id: event.id });

    const supabaseAdmin = createClient(supabaseUrl, supabaseService, {
      auth: { persistSession: false },
    });

    // We use checkout.session.completed for first checkout and invoice.paid for renewals.
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      const planKey = String(session.metadata?.plan_key ?? "").trim();
      const cnpj = String(session.metadata?.cnpj ?? "").trim();

      // If you want to bind by CNPJ in webhook, pass cnpj in metadata at checkout time.
      if (!cnpj) {
        logStep("checkout.session.completed missing cnpj metadata (skipping)");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const validUntil = nextValidUntilFromPayment(now, planKey);
      const status = computeStatus(validUntil.toISOString());

      await supabaseAdmin
        .from("company_subscriptions")
        .upsert(
          {
            cnpj,
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            current_plan_key: planKey || null,
            valid_until: validUntil.toISOString(),
            status,
          },
          { onConflict: "cnpj" },
        );

      await supabaseAdmin.from("subscription_payments").insert({
        cnpj,
        stripe_event_id: event.id,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        amount: (session.amount_total ?? null) ? Number(session.amount_total) / 100 : null,
        currency: session.currency ?? null,
        paid_at: now.toISOString(),
        plan_key: planKey || null,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;

      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      const paidAt = invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date();

      // Determine plan key: prefer subscription metadata if available
      let planKey = "";
      try {
        if (subscriptionId) {
          const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          planKey = String(sub.metadata?.plan_key ?? "");
        }
      } catch (e) {
        logStep("Failed to retrieve subscription metadata", { error: String(e) });
      }

      // Find cnpj via stored mapping
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("company_subscriptions")
        .select("cnpj")
        .eq("stripe_subscription_id", subscriptionId ?? "")
        .maybeSingle();

      if (existingError) throw new Error(`company_subscriptions lookup failed: ${existingError.message}`);
      if (!existing?.cnpj) {
        logStep("No company_subscriptions row found for subscription", { subscriptionId });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cnpj = existing.cnpj;
      const validUntil = nextValidUntilFromPayment(paidAt, planKey);
      const status = computeStatus(validUntil.toISOString());

      await supabaseAdmin
        .from("company_subscriptions")
        .update({
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          current_plan_key: planKey || null,
          valid_until: validUntil.toISOString(),
          status,
        })
        .eq("cnpj", cnpj);

      await supabaseAdmin.from("subscription_payments").insert({
        cnpj,
        stripe_event_id: event.id,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        amount: invoice.amount_paid ? Number(invoice.amount_paid) / 100 : null,
        currency: invoice.currency ?? null,
        paid_at: paidAt.toISOString(),
        plan_key: planKey || null,
        period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ignore others
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logStep("ERROR", { message });

    // Stripe expects 2xx to stop retries, but we WANT retries when missing secret is fixed.
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
