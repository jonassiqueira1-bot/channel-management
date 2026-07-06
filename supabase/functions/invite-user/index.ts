import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey          = Deno.env.get('SUPABASE_ANON_KEY')!

    // Autentica o caller com o JWT do usuário logado
    const authHeader   = req.headers.get('Authorization') || ''
    const callerClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Não autenticado' }, 401)
    const caller = userData.user

    // Busca perfil do caller
    const { data: callerProfile, error: profileErr } = await callerClient
      .from('profiles')
      .select('tenant_id, nome')
      .eq('id', caller.id)
      .single()

    if (profileErr || !callerProfile?.tenant_id) {
      return json({ error: `Perfil não encontrado: ${profileErr?.message}` }, 403)
    }

    const body = await req.json()
    const { email, nome, papel, tipo_usuario, contact_id } = body

    if (!email) return json({ error: 'email é obrigatório' }, 400)

    // Admin client para operações privilegiadas
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Envia convite via REST API do Supabase Auth (mais confiável que o SDK)
    const redirectTo = 'https://app.boostly.com.br/aceitar-convite'
    const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: 'POST',
      headers: {
        'apikey':        SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        email,
        data: {
          tenant_id:  callerProfile.tenant_id,
          contact_id: contact_id || null,
          role:       papel || 'parceiro',
          nome:       nome || email,
        },
      }),
    })

    if (!inviteRes.ok) {
      const errBody = await inviteRes.text()
      console.error('[invite-user] auth/v1/invite error:', inviteRes.status, errBody)
      let errMsg = errBody
      try { errMsg = JSON.parse(errBody)?.msg || JSON.parse(errBody)?.message || errBody } catch {}

      // Usuário já existe: vincula o profile e envia magic link para acesso
      if (inviteRes.status === 422 || errMsg?.toLowerCase().includes('already been registered') || errMsg?.toLowerCase().includes('already registered')) {
        const { data: existingUsers } = await admin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email)
        if (existingUser) {
          // Vincula contact_id e role ao profile existente; branch_id null = sem restrição de filial
          await admin.from('profiles').update({
            contact_id: contact_id || null,
            role:       papel || 'parceiro',
            branch_id:  null,
          }).eq('id', existingUser.id)

          // Envia magic link para o usuário acessar
          const mlRedirect = 'https://app.boostly.com.br/aceitar-convite'
          await fetch(`${SUPABASE_URL}/auth/v1/magiclink?redirect_to=${encodeURIComponent(mlRedirect)}`, {
            method: 'POST',
            headers: {
              'apikey':        SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type':  'application/json',
            },
            body: JSON.stringify({ email }),
          })

          return json({ ok: true, linked: true })
        }
      }

      return json({ error: errMsg }, 400)
    }

    // Insere em pending_invites para rastreio
    const { error: insertErr } = await admin
      .from('pending_invites')
      .insert({
        tenant_id:    callerProfile.tenant_id,
        nome:         nome || email,
        email,
        papel:        papel || 'parceiro',
        tipo_usuario: tipo_usuario || 'externo',
      })

    if (insertErr) console.error('[invite-user] pending_invites:', insertErr.message)

    return json({ ok: true })

  } catch (e) {
    console.error('[invite-user] uncaught:', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
