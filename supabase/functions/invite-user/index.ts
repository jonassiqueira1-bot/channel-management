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
    const { email, nome, papel, tipo_usuario, contact_id, branch_id, branch_ids } = body

    if (!email) return json({ error: 'email é obrigatório' }, 400)

    // Admin client para operações privilegiadas
    const admin      = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
    const APP_URL    = Deno.env.get('APP_URL') || 'https://app.boostly.com.br'

    // Contato Canal (contact_id presente) sempre fica "chumbado" na filial
    // cadastrada em sellers.branch_id — nunca na filial que o admin
    // convidando estava vendo na hora (branch_id do body é só usado pra
    // convites que não são de Contato Canal). Antes só o caminho de
    // "usuário já existe" fazia essa resolução certa; convite de usuário
    // novo usava o branch_id cru do request, que é o contexto do admin.
    let sellerBranchId: string | null = null
    if (contact_id) {
      const { data: seller } = await admin.from('sellers').select('branch_id').eq('id', contact_id).single()
      sellerBranchId = seller?.branch_id || null
    }
    const branchIdResolvido = contact_id ? sellerBranchId : (branch_id || null)

    // Busca nome do tenant para personalizar o email
    const { data: tenantData } = await admin.from('tenants').select('nome').eq('id', callerProfile.tenant_id).single()
    const tenantNome = tenantData?.nome || 'Boostly'

    // Resolve o Perfil de Acesso nativo correspondente ao papel, pra já atribuir
    // de cara — sem isso o usuário fica sem nenhuma permissão. O Papel e o Perfil
    // de Acesso são conceitos separados (não compartilham nome de propósito), daí
    // o mapeamento explícito em vez de comparar o texto diretamente.
    const PERFIL_POR_PAPEL: Record<string, string> = {
      contato_canal: 'parceiro',
      admin_isv:     'master',
      projetos:      'gestor_projetos',
    }
    let perfilAcessoId: string | null = null
    if (papel) {
      const perfilSlug = PERFIL_POR_PAPEL[papel] || papel
      const { data: perfilRow } = await admin
        .from('perfis_acesso')
        .select('id')
        .eq('tenant_id', callerProfile.tenant_id)
        .eq('slug', perfilSlug)
        .is('deleted_at', null)
        .maybeSingle()
      perfilAcessoId = perfilRow?.id || null
    }

    // Verifica se email já existe em auth.users ANTES de gerar o link
    // (generateLink de invite pode retornar sucesso para emails existentes
    //  mas o link falha na verificação com "Error confirming user")
    const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existingUser = existingUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

    const sendInviteAndSave = async (actionLink: string, isLinked = false) => {
      await sendViaResend(RESEND_KEY, email, 'convite_usuario', {
        nome:          nome || email,
        convidado_por: callerProfile.nome || 'Boostly',
        tenant_nome:   tenantNome,
        link:          actionLink,
      })
      const { error: insertErr } = await admin.from('pending_invites').upsert({
        tenant_id:    callerProfile.tenant_id,
        nome:         nome || email,
        email,
        papel:        papel || 'contato_canal',
        tipo_usuario: tipo_usuario || 'externo',
      }, { onConflict: 'tenant_id,email' })
      if (insertErr) console.error('[invite-user] pending_invites upsert:', insertErr.message)
    }

    if (existingUser) {
      // Usuário já existe: atualiza profile e envia magic link
      await admin.from('profiles').update({
        contact_id: contact_id || null,
        role:       papel || 'contato_canal',
        branch_id:  branchIdResolvido,
      }).eq('id', existingUser.id)

      const { data: mlData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${APP_URL}/aceitar-convite` },
      })
      if (mlData?.properties?.action_link) {
        await sendInviteAndSave(mlData.properties.action_link, true)
      }
      return json({ ok: true, linked: true })
    }

    // Novo usuário: gera link de convite
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${APP_URL}/aceitar-convite`,
        data: {
          tenant_id:  callerProfile.tenant_id,
          contact_id: contact_id || null,
          role:       papel || 'contato_canal',
          nome:       nome || email,
        },
      },
    })

    if (linkErr) {
      console.error('[invite-user] generateLink error:', linkErr.message)
      return json({ error: linkErr.message }, 400)
    }

    // Cria o perfil imediatamente para que o usuário apareça na lista
    const newUserId = linkData?.user?.id
    if (newUserId) {
      const { error: profileErr } = await admin.from('profiles').upsert({
        id:           newUserId,
        email,
        nome:         nome || email,
        tenant_id:    callerProfile.tenant_id,
        role:         papel || 'contato_canal',
        status:       'pendente',
        branch_id:    branchIdResolvido,
        branch_ids:   Array.isArray(branch_ids) ? branch_ids : [],
        perfis_acesso_ids: perfilAcessoId ? [perfilAcessoId] : [],
      }, { onConflict: 'id' })
      if (profileErr) console.error('[invite-user] profile upsert:', profileErr.message)
    }

    const actionLink = linkData?.properties?.action_link
    if (actionLink) await sendInviteAndSave(actionLink)

    return json({ ok: true })

  } catch (e) {
    console.error('[invite-user] uncaught:', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
