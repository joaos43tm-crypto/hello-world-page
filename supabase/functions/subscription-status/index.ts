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
  console.log(`[SUBSCRIPTION-STATUS] ${step}${suffix}`);
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

  // Expired
  const daysSinceExpiry = Math.abs(daysToExpiry);
  if (daysSinceExpiry > 15) return "BLOQUEADA";
  return "VENCIDA";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    const supabaseAdmin = createClient(supabaseUrl, supabaseService, {
      auth: { persistSession: false },
    });

    logStep("Fetching user profile for CNPJ", { userId: user.id });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("cnpj")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw new Error(`profiles lookup failed: ${profileError.message}`);
    const cnpj = (profile?.cnpj ?? "").trim();

    if (!cnpj) {
      return new Response(JSON.stringify({ error: "Usuário sem CNPJ vinculado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error: subError } = await supabaseAdmin
      .from("company_subscriptions")
      .select("cnpj,status,valid_until,trial_started_at,current_plan_key,updated_at")
      .eq("cnpj", cnpj)
      .maybeSingle();

    if (subError) throw new Error(`company_subscriptions lookup failed: ${subError.message}`);

    // If missing, initialize with 30-day trial
    if (!row) {
      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const status = computeStatus(validUntil.toISOString());

      logStep("Initializing subscription row", { cnpj, validUntil: validUntil.toISOString(), status });

      const { data: created, error: createError } = await supabaseAdmin
        .from("company_subscriptions")
        .insert({
          cnpj,
          valid_until: validUntil.toISOString(),
          status,
          trial_started_at: now.toISOString(),
          current_plan_key: null,
        })
        .select("cnpj,status,valid_until,trial_started_at,current_plan_key,updated_at")
        .single();

      if (createError) throw new Error(`company_subscriptions init failed: ${createError.message}`);

      return new Response(JSON.stringify({ subscription: created }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recompute status deterministically
    const computed = computeStatus(row.valid_until);
    if (computed !== row.status) {
      logStep("Updating status", { cnpj, from: row.status, to: computed });

      const { error: updateError } = await supabaseAdmin
        .from("company_subscriptions")
        .update({ status: computed })
        .eq("cnpj", cnpj);

      if (updateError) throw new Error(`company_subscriptions update failed: ${updateError.message}`);

      row.status = computed;
    }

    return new Response(JSON.stringify({ subscription: row }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
