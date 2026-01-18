import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "list" | "create" | "delete";

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    // Client with end-user JWT, used only to validate the token.
    const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAuthed.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Token inválido" }, 401);

    // Admin client for privileged DB ops
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const caller = userData.user;
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc("is_admin", {
      _user_id: caller.id,
    });

    if (adminCheckError) throw adminCheckError;
    if (!isAdmin) return json({ error: "Acesso negado" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as Action | undefined;

    if (!action) return json({ error: "Ação inválida" }, 400);

    if (action === "list") {
      const { data, error } = await supabaseAdmin
        .from("registration_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return json({ codes: data });
    }

    if (action === "create") {
      const code = typeof body?.code === "string" ? body.code.trim() : "";
      const cnpj = typeof body?.cnpj === "string" ? body.cnpj.trim() : "";
      const companyName = typeof body?.company_name === "string" ? body.company_name.trim() : "";

      if (!code || !cnpj || !companyName) {
        return json({ error: "Código, CNPJ e Razão Social são obrigatórios" }, 400);
      }

      const upper = code.toUpperCase().slice(0, 32);

      const { data, error } = await supabaseAdmin
        .from("registration_codes")
        .insert({
          code: upper,
          cnpj,
          company_name: companyName,
          created_by: caller.id,
        })
        .select()
        .single();

      if (error) {
        if ((error as any).code === "23505") {
          return json({ error: "Este código já existe" }, 400);
        }
        throw error;
      }

      return json({ code: data });
    }

    if (action === "delete") {
      const id = typeof body?.code === "string" ? body.code.trim() : "";
      if (!id) return json({ error: "Código é obrigatório" }, 400);

      const { error } = await supabaseAdmin.from("registration_codes").delete().eq("id", id);
      if (error) throw error;

      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error: unknown) {
    console.error("admin-codes error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return json({ error: message }, 500);
  }
});
