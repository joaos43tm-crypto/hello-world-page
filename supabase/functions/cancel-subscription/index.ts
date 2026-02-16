import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");
    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr) throw new Error(`Erro de autenticação: ${userErr.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("Usuário inválido");

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("cnpj")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr) throw new Error(`Erro ao buscar perfil: ${profileErr.message}`);
    const cnpj = profile?.cnpj;
    if (!cnpj) throw new Error("CNPJ não encontrado no perfil");

    const { data: companySub, error: subErr } = await supabaseAdmin
      .from("company_subscriptions")
      .select("stripe_subscription_id")
      .eq("cnpj", cnpj)
      .maybeSingle();

    if (subErr) throw new Error(`Erro ao buscar assinatura: ${subErr.message}`);
    const stripeSubscriptionId = companySub?.stripe_subscription_id;
    if (!stripeSubscriptionId) throw new Error("Assinatura Stripe não encontrada");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        subscription_id: updated.id,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: updated.current_period_end,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
