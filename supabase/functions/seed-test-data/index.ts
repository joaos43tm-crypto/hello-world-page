import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SeedResponse = {
  success: boolean
  tutor?: { id: string; name: string }
  pet?: { id: string; name: string }
  service?: { id: string; name: string }
  professional?: { id: string; name: string }
  appointment?: { id: string; scheduled_date: string; scheduled_time: string }
  error?: string
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const toDateISO = (d: Date) => {
  // YYYY-MM-DD (UTC) - ok for seed
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

const toTimeHHMM = (d: Date) => `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:00`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') ?? ''

    // Validate caller
    const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await supabaseAuthed.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' } satisfies SeedResponse), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const user = userData.user

    // Ensure admin (security-sensitive writes like services/professionals)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (roleErr) throw roleErr
    if (roleRow?.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Somente admin pode criar seed' } satisfies SeedResponse), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const suffix = String(Date.now()).slice(-5)

    // 1) Tutor (cliente)
    const tutorName = `Cliente Teste ${suffix}`
    const { data: tutor, error: tutorErr } = await supabaseAuthed
      .from('tutors')
      .insert({
        name: tutorName,
        phone: `1199${suffix}`, // simples, só para seed
        email: `cliente${suffix}@teste.local`,
        notes: 'Seed automático (teste)',
      })
      .select('id, name')
      .single()

    if (tutorErr) throw tutorErr

    // 2) Pet
    const petName = `Pet Teste ${suffix}`
    const { data: pet, error: petErr } = await supabaseAuthed
      .from('pets')
      .insert({
        name: petName,
        tutor_id: tutor.id,
        breed: 'SRD',
        size: 'medio',
        temperament: 'docil',
        notes: 'Seed automático (teste)',
      })
      .select('id, name')
      .single()

    if (petErr) throw petErr

    // 3) Serviço
    const serviceName = `Banho Teste ${suffix}`
    const { data: service, error: serviceErr } = await supabaseAuthed
      .from('services')
      .insert({
        name: serviceName,
        price: 49.9,
        description: 'Serviço seed automático (teste)',
        duration_minutes: 60,
        is_active: true,
      })
      .select('id, name')
      .single()

    if (serviceErr) throw serviceErr

    // 4) Profissional
    const professionalName = `Profissional Teste ${suffix}`
    const { data: professional, error: professionalErr } = await supabaseAuthed
      .from('professionals')
      .insert({
        name: professionalName,
        is_active: true,
        specialty: 'tosador',
        phone: null,
      })
      .select('id, name')
      .single()

    if (professionalErr) throw professionalErr

    // 5) Agendamento
    const now = new Date()
    const scheduled_date = toDateISO(now)
    const scheduled_time = toTimeHHMM(new Date(now.getTime() + 60 * 60 * 1000))

    const { data: appointment, error: apptErr } = await supabaseAuthed
      .from('appointments')
      .insert({
        pet_id: pet.id,
        service_id: service.id,
        professional_id: professional.id,
        scheduled_date,
        scheduled_time,
        notes: 'Seed automático (teste)',
        price: 49.9,
      })
      .select('id, scheduled_date, scheduled_time')
      .single()

    if (apptErr) throw apptErr

    const response: SeedResponse = {
      success: true,
      tutor,
      pet,
      service,
      professional,
      appointment,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('[seed-test-data] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ success: false, error: message } satisfies SeedResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
