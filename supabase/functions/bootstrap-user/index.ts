import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') ?? ''

    // Validate user (do NOT trust client-side claims)
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

    const user = userData.user

    // Service client for privileged DB writes
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get user metadata for profile
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const companyName = (meta.company_name as string) || (meta.name as string) || null
    const cnpj = (meta.cnpj as string) || null

    // Ensure profile exists (upsert by user_id)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          name: (meta.name as string) || companyName || 'Usuário',
          company_name: companyName,
          cnpj,
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single()

    if (profileError) throw profileError

    // Determine if this is the first account for this company (same CNPJ)
    // Count how many users with the same CNPJ already have roles
    let isFirstUserForCompany = true

    if (cnpj) {
      // Get all user_ids that have the same CNPJ
      const { data: sameCompanyProfiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('cnpj', cnpj)

      if (profilesError) throw profilesError

      if (sameCompanyProfiles && sameCompanyProfiles.length > 0) {
        const userIds = sameCompanyProfiles.map((p) => p.user_id)

        // Check if any of these users already have a role
        const { count, error: countError } = await supabaseAdmin
          .from('user_roles')
          .select('id', { count: 'exact', head: true })
          .in('user_id', userIds)

        if (countError) throw countError

        isFirstUserForCompany = (count ?? 0) === 0
      }
    } else {
      // No CNPJ - fallback to global check (legacy behavior)
      const { count, error: countError } = await supabaseAdmin
        .from('user_roles')
        .select('id', { count: 'exact', head: true })

      if (countError) throw countError

      isFirstUserForCompany = (count ?? 0) === 0
    }

    const role: 'administrador' | 'atendente' = isFirstUserForCompany ? 'administrador' : 'atendente'

    // Ensure a role exists for this user (avoid duplicates)
    const { data: existingRole, error: existingRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingRoleError) throw existingRoleError

    if (!existingRole) {
      const { error: insertRoleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: user.id, role })

      if (insertRoleError) throw insertRoleError
    }

    return new Response(JSON.stringify({ success: true, role, profile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('[bootstrap-user] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
