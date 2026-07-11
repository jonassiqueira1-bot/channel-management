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

async function sendViaResend(
  apiKey: string,
  to: string,
  template: string,
  data: Record<string, unknown>,
) {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'apikey':        Deno.env.get('SUPABASE_ANON_KEY')!,
      },
      body: JSON.stringify({ template, to, data }),
    })
  } catch (e) {
    console.error('[invite-user] sendViaResend error:', e)
  }
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
    const admin      = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
    const APP_URL    = Deno.env.get('APP_URL') || 'https://app.boostly.com.br'

    // Busca nome do tenant para personalizar o email
    const { data: tenantData } = await admin.from('tenants').select('nome').eq('id', callerProfile.tenant_id).single()
    const tenantNome = tenantData?.nome || 'Boostly'

    // Tenta gerar link de convite sem enviar email pelo Supabase
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${APP_URL}/aceitar-convite`,
        data: {
          tenant_id:  callerProfile.tenant_id,
          contact_id: contact_id || null,
          role:       papel || 'parceiro',
          nome:       nome || email,
        },
      },
    })

    if (linkErr) {
      // Usuário já existe: vincula profile e gera magic link
      if (linkErr.message?.toLowerCase().includes('already been registered') || linkErr.message?.toLowerCase().includes('already registered')) {
        const { data: existingUsers } = await admin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email)
        if (existingUser) {
          let sellerBranchId: string | null = null
          if (contact_id) {
            const { data: seller } = await admin.from('sellers').select('branch_id').eq('id', contact_id).single()
            sellerBranchId = seller?.branch_id || null
          }
          await admin.from('profiles').update({
            contact_id: contact_id || null,
            role:       papel || 'parceiro',
            branch_id:  sellerBranchId,
          }).eq('id', existingUser.id)

          // Gera magic link e envia via Resend
          const { data: mlData } = await admin.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: { redirectTo: `${APP_URL}/aceitar-convite` },
          })
          if (mlData?.properties?.action_link) {
            await sendViaResend(RESEND_KEY, email, 'convite_usuario', {
              nome:          nome || email,
              convidado_por: callerProfile.nome || 'Boostly',
              tenant_nome:   tenantNome,
              link:          mlData.properties.action_link,
            })
          }
          return json({ ok: true, linked: true })
        }
      }
      console.error('[invite-user] generateLink error:', linkErr.message)
      return json({ error: linkErr.message }, 400)
    }

    // Envia convite via Resend com template da marca
    const actionLink = linkData?.properties?.action_link
    if (actionLink) {
      await sendViaResend(RESEND_KEY, email, 'convite_usuario', {
        nome:          nome || email,
        convidado_por: callerProfile.nome || 'Boostly',
        tenant_nome:   tenantNome,
        link:          actionLink,
      })
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
