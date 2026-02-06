import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Json = Record<string, unknown>;

function json(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return json({ error: "Configuração do servidor incompleta" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuthed.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Token inválido" }, 401);
    }

    // Load full user (keeps behavior consistent)
    const { data: userData, error: userError } = await supabaseAuthed.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Não autenticado" }, 401);
    }
    const user = userData.user;

    const body = (await req.json().catch(() => ({}))) as { confirm?: string };
    if ((body.confirm ?? "").trim() !== "APAGAR") {
      return json({ error: "Confirmação inválida" }, 400);
    }

    // Privileged client used only after auth + permission checks
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const [{ data: profile, error: profileError }, { data: isAdmin, error: adminError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("cnpj").eq("user_id", user.id).maybeSingle(),
      supabaseAdmin.rpc("is_admin", { _user_id: user.id }),
    ]);

    if (profileError) throw profileError;
    if (adminError) throw adminError;

    if (!isAdmin) {
      return json({ error: "Apenas Administrador pode executar esta ação" }, 403);
    }

    const cnpj = profile?.cnpj ?? null;
    if (!cnpj) {
      return json({ error: "Seu usuário não possui CNPJ vinculado" }, 400);
    }

    // IMPORTANT: delete in FK-safe order
    const results: Record<string, number> = {};

    const del = async (table: string) => {
      const { count, error } = await supabaseAdmin
        .from(table)
        .delete({ count: "exact" })
        .eq("cnpj", cnpj);
      if (error) throw error;
      results[table] = count ?? 0;
    };

    await del("medical_consultations");
    await del("appointments");
    await del("sale_items");
    await del("sales");
    await del("cash_register_movements");
    await del("cash_register_sessions");
    await del("pets");
    await del("tutors");

    return json({ success: true, cnpj, deleted: results });
  } catch (error: unknown) {
    console.error("[reset-cnpj-data] Error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return json({ error: message }, 500);
  }
});
