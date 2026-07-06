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

  const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_API_KEY      = Deno.env.get('RESEND_API_KEY')
  const SEND_EMAIL_URL      = `${SUPABASE_URL}/functions/v1/send-email`

  // Autentica o caller com o JWT do usuário logado
  const authHeader = req.headers.get('Authorization') || ''
  const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
  const callerClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user: caller } } = await callerClient.auth.getUser()
  if (!caller) return json({ error: 'Não autenticado' }, 401)

  // Busca perfil do caller para obter tenant_id e nome
  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('tenant_id, nome')
    .eq('id', caller.id)
    .single()

  if (!callerProfile?.tenant_id) return json({ error: 'Perfil não encontrado' }, 403)

  const body = await req.json()
  const { email, nome, papel, tipo_usuario, contact_id } = body

  if (!email) return json({ error: 'email é obrigatório' }, 400)

  // Admin client para operações privilegiadas
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Gera link de convite (não envia email pelo Supabase)
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo: 'https://app.boostly.com.br/aceitar-convite',
      data: contact_id ? { contact_id } : undefined,
    },
  })

  if (linkErr) return json({ error: linkErr.message }, 400)

  const inviteLink = linkData?.properties?.action_link || 'https://app.boostly.com.br'

  // Insere em pending_invites
  const { error: insertErr } = await admin
    .from('pending_invites')
    .insert({
      tenant_id:    callerProfile.tenant_id,
      nome:         nome || email,
      email,
      papel:        papel || 'vendedor',
      tipo_usuario: tipo_usuario || 'externo',
    })

  if (insertErr) console.error('[invite-user] pending_invites:', insertErr.message)

  // Busca nome do tenant
  const { data: tenant } = await admin
    .from('tenants')
    .select('nome')
    .eq('id', callerProfile.tenant_id)
    .single()

  // Envia email via send-email function
  if (RESEND_API_KEY) {
    await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        template: 'convite_usuario',
        to: email,
        data: {
          convidado_por: callerProfile.nome || caller.email,
          tenant_nome:   tenant?.nome || 'Boostly',
          link:          inviteLink,
        },
      }),
    })
  }

  return json({ ok: true })
})
