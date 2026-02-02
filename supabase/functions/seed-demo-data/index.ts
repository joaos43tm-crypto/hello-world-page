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

function pick<T>(arr: T[]): T | null {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Configuração do servidor incompleta" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAuthed.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Não autenticado" }, 401);
    }

    // Only admin (or atendente) should seed; keep it simple: require admin
    const { data: isAdmin, error: adminError } = await supabaseAuthed.rpc("is_admin", {
      _user_id: userData.user.id,
    });
    if (adminError) throw adminError;
    if (!isAdmin) {
      return json({ error: "Apenas Administrador pode gerar dados de teste" }, 403);
    }

    const { data: profile, error: profileError } = await supabaseAuthed
      .from("profiles")
      .select("cnpj")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    const cnpj = profile?.cnpj ?? null;
    if (!cnpj) return json({ error: "Seu usuário não possui CNPJ vinculado" }, 400);

    // Base catalogs (optional)
    const [{ data: services }, { data: products }] = await Promise.all([
      supabaseAuthed.from("services").select("id").limit(50),
      supabaseAuthed.from("products").select("id, price").limit(50),
    ]);

    const service = pick((services ?? []).map((s) => s.id as string).filter(Boolean));
    const product = pick((products ?? []).map((p) => p as { id: string; price: number }));

    // 1) Tutors
    const tutorsPayload = [
      { name: "Cliente Teste 1", phone: "11999990001", email: "cliente1@teste.com", cnpj },
      { name: "Cliente Teste 2", phone: "11999990002", email: "cliente2@teste.com", cnpj },
      { name: "Cliente Teste 3", phone: "11999990003", email: "cliente3@teste.com", cnpj },
    ];

    const { data: tutors, error: tutorsError } = await supabaseAuthed
      .from("tutors")
      .insert(tutorsPayload)
      .select("id");
    if (tutorsError) throw tutorsError;

    // 2) Pets
    const tutorIds = (tutors ?? []).map((t) => t.id as string);
    const petsPayload = [
      { tutor_id: tutorIds[0], name: "Rex", breed: "SRD", cnpj },
      { tutor_id: tutorIds[0], name: "Luna", breed: "Poodle", cnpj },
      { tutor_id: tutorIds[1], name: "Thor", breed: "Golden", cnpj },
      { tutor_id: tutorIds[2], name: "Mia", breed: "Shih Tzu", cnpj },
    ];

    const { data: pets, error: petsError } = await supabaseAuthed
      .from("pets")
      .insert(petsPayload)
      .select("id");
    if (petsError) throw petsError;

    // 3) Appointments (only if a service exists)
    let appointmentsCreated = 0;
    if (service) {
      const petIds = (pets ?? []).map((p) => p.id as string);
      const today = new Date();
      const toDate = (d: Date) => d.toISOString().slice(0, 10);

      const apptPayload = [
        {
          pet_id: petIds[0],
          service_id: service,
          scheduled_date: toDate(today),
          scheduled_time: "09:00",
          status: "agendado",
          cnpj,
        },
        {
          pet_id: petIds[1],
          service_id: service,
          scheduled_date: toDate(new Date(today.getTime() + 24 * 60 * 60 * 1000)),
          scheduled_time: "10:30",
          status: "agendado",
          cnpj,
        },
        {
          pet_id: petIds[2],
          service_id: service,
          scheduled_date: toDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)),
          scheduled_time: "14:00",
          status: "agendado",
          cnpj,
        },
      ];

      const { data: appts, error: apptError } = await supabaseAuthed
        .from("appointments")
        .insert(apptPayload)
        .select("id");
      if (apptError) throw apptError;
      appointmentsCreated = (appts ?? []).length;
    }

    // 4) Sales (only if a product exists)
    let salesCreated = 0;
    if (product) {
      const { data: sale, error: saleError } = await supabaseAuthed
        .from("sales")
        .insert({ total_amount: product.price ?? 10, payment_method: "dinheiro", tutor_id: tutorIds[0], cnpj })
        .select("id")
        .single();
      if (saleError) throw saleError;

      const { error: itemError } = await supabaseAuthed.from("sale_items").insert({
        sale_id: sale.id,
        product_id: product.id,
        quantity: 1,
        unit_price: product.price ?? 10,
        subtotal: product.price ?? 10,
        cnpj,
      });
      if (itemError) throw itemError;
      salesCreated = 1;
    }

    return json({
      success: true,
      cnpj,
      created: {
        tutors: (tutors ?? []).length,
        pets: (pets ?? []).length,
        appointments: appointmentsCreated,
        sales: salesCreated,
      },
      notes: {
        appointments: service ? "OK" : "Nenhum serviço cadastrado; agendamentos não foram criados.",
        sales: product ? "OK" : "Nenhum produto cadastrado; vendas não foram criadas.",
      },
    });
  } catch (error: unknown) {
    console.error("[seed-demo-data] Error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return json({ error: message }, 500);
  }
});
