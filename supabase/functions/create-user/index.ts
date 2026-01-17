import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppRole = 'admin' | 'atendente' | 'tosador'

const normalizeCnpj = (value: string) => (value ?? '').replace(/\D/g, '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') ?? ''

    // Validate caller (do NOT trust client-side claims)
    const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await supabaseAuthed.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const caller = userData.user

    // Parse input
    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const role = String(body.role ?? '') as AppRole
    const cnpj = normalizeCnpj(String(body.cnpj ?? ''))
    const name = String(body.name ?? '').trim()
    const companyName = String(body.company_name ?? '').trim()

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'E-mail inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['admin', 'atendente', 'tosador'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Permissão inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!cnpj || cnpj.length !== 14) {
      return new Response(JSON.stringify({ error: 'CNPJ inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Privileged client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Enforce admin-only
    const { data: callerRole, error: callerRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle()

    if (callerRoleError) throw callerRoleError

    if (callerRole?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Also enforce company scoping: caller and target must share same CNPJ
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('cnpj, company_name')
      .eq('user_id', caller.id)
      .maybeSingle()

    if (callerProfileError) throw callerProfileError

    const callerCnpj = normalizeCnpj(callerProfile?.cnpj ?? '')
    if (!callerCnpj || callerCnpj !== cnpj) {
      return new Response(JSON.stringify({ error: 'CNPJ não autorizado para este administrador' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create auth user
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || email,
        company_name: companyName || callerProfile?.company_name || null,
        cnpj,
      },
    })

    if (createError) {
      const msg = createError.message || 'Erro ao criar usuário'
      const friendly = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')
        ? 'Este e-mail já está cadastrado'
        : msg
      return new Response(JSON.stringify({ error: friendly }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newUserId = created.user?.id
    if (!newUserId) {
      return new Response(JSON.stringify({ error: 'Falha ao criar usuário' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ensure profile exists with company linkage
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id: newUserId,
          name: name || email,
          company_name: companyName || callerProfile?.company_name || null,
          cnpj,
        },
        { onConflict: 'user_id' },
      )

    if (profileError) throw profileError

    // Ensure role exists for this user
    const { data: existingRole, error: existingRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', newUserId)
      .maybeSingle()

    if (existingRoleError) throw existingRoleError

    if (!existingRole) {
      const { error: insertRoleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: newUserId, role })

      if (insertRoleError) throw insertRoleError
    } else {
      const { error: updateRoleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', newUserId)

      if (updateRoleError) throw updateRoleError
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: unknown) {
    console.error('[create-user] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
