// ─── Provisionamento de tenant — chamado pelo Control Center ─────────────────
// Único ponto de escrita do Control Center no banco de produção do Boostly.
// Cria o usuário admin (auth) + tenant/branch/perfil (via a mesma RPC
// `signup_create_tenant` que o cadastro normal usa em src/pages/Signup.js —
// garante que uma conta provisionada por pagamento fica idêntica a uma conta
// criada pelo fluxo normal de signup, sem duplicar lógica de tenant aqui).
//
// Autenticação: não usa o JWT de um usuário logado (não existe — quem chama é
// o Control Center, outro projeto Supabase). Em vez disso, valida um token
// compartilhado no header `x-control-center-token` contra o secret
// CONTROL_CENTER_TOKEN. Nunca expor a service_role key para o Control Center —
// ele só conhece esse token; a service_role fica só aqui dentro da function.
//
// Secrets necessários (Supabase → Edge Functions → Secrets, no projeto do
// Boostly/channel-management):
//   CONTROL_CENTER_TOKEN — string compartilhada com o Control Center
//   RESEND_API_KEY       — já deve existir (usado por invite-user/send-email)
//   APP_URL              — já deve existir (ex: https://app.boostly.com.br)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-control-center-token',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function sendViaResend(to: string, template: string, data: Record<string, unknown>) {
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
    console.error('[provisionar-tenant] sendViaResend error:', e)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const tokenEsperado = Deno.env.get('CONTROL_CENTER_TOKEN')
    const tokenRecebido = req.headers.get('x-control-center-token')
    if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const body = await req.json().catch(() => null)
    const { email, nome, org_name } = body ?? {}
    if (!email || !nome || !org_name) {
      return json({ error: 'email, nome e org_name são obrigatórios' }, 400)
    }

    const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
    const APP_URL          = Deno.env.get('APP_URL') || 'https://app.boostly.com.br'
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Dedupe — mesmo cuidado do invite-user: não criar conta duplicada se o
    // e-mail já existir em auth.users.
    const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const jaExiste = existingUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    if (jaExiste) {
      return json({ ok: false, error: 'Já existe uma conta com esse e-mail no Boostly' }, 409)
    }

    // 1. Cria o usuário admin no Auth. Senha aleatória — o usuário nunca a usa,
    // define a própria via o link de convite mandado por e-mail logo abaixo.
    const senhaTemporaria = crypto.randomUUID()
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: { nome },
    })
    if (authErr || !authData?.user) {
      return json({ ok: false, error: authErr?.message || 'Erro ao criar usuário' }, 500)
    }
    const userId = authData.user.id

    // 2. Cria tenant + branch + perfil + seed via a MESMA RPC do signup normal —
    // qualquer mudança futura nessa lógica (nova seed, novo campo obrigatório)
    // já vale automaticamente pra contas provisionadas também.
    //
    // Importante: a RPC precisa ser chamada com a SESSÃO do próprio usuário
    // recém-criado (não com a service role) — a coluna profiles.email tem um
    // default que lê auth.jwt()->>'email', só disponível quando o token JWT
    // do usuário vai no header Authorization da chamada. Por isso: logamos
    // como o usuário com a senha temporária, pegamos o access_token da sessão
    // e montamos um client NOVO com esse token explícito no header — dentro
    // do Deno não existe localStorage, então o client não anexa a sessão
    // automaticamente nas chamadas seguintes como faria no navegador.
    const authClient = createClient(SUPABASE_URL, ANON_KEY)
    const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({ email, password: senhaTemporaria })
    if (signInErr || !signInData?.session) {
      await admin.auth.admin.deleteUser(userId).catch(() => {})
      return json({ ok: false, error: `Erro ao autenticar usuário recém-criado: ${signInErr?.message}` }, 500)
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${signInData.session.access_token}` } },
    })

    const { error: rpcErr } = await userClient.rpc('signup_create_tenant', {
      p_user_id:  userId,
      p_org_name: org_name,
      p_nome:     nome,
    })
    if (rpcErr) {
      // Rollback best-effort do usuário auth órfão, pra não deixar lixo.
      await admin.auth.admin.deleteUser(userId).catch(() => {})
      return json({ ok: false, error: `Erro ao criar tenant: ${rpcErr.message}` }, 500)
    }

    // 3. Busca o tenant_id recém-criado (a RPC não retorna, então lemos do profile).
    const { data: profile } = await admin.from('profiles').select('tenant_id').eq('id', userId).maybeSingle()
    const tenantId = profile?.tenant_id || null

    // signup_create_tenant cria o tenant com status='active' e trial_ends_at
    // nulo — o período de trial nunca era setado de verdade em lugar nenhum
    // (só existia como texto de marketing no site). Toda conta agora passa
    // por aqui (site não cria mais direto — vira solicitação aprovada aqui
    // dentro, ou criação manual no Control Center), então este é o único
    // lugar que precisa iniciar o trial.
    const TRIAL_DIAS = 14
    const trialEndsAt = new Date(Date.now() + TRIAL_DIAS * 86400000).toISOString()
    if (tenantId) {
      await admin.from('tenants').update({ status: 'trial', trial_ends_at: trialEndsAt }).eq('id', tenantId)
    }

    // 4. Envia link de convite pro usuário definir a própria senha e acessar.
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${APP_URL}/aceitar-convite` },
    })
    const actionLink = linkData?.properties?.action_link
    if (actionLink) {
      await sendViaResend(email, 'convite_usuario', {
        nome, convidado_por: 'Boostly', tenant_nome: org_name, link: actionLink,
      })
    }

    return json({ ok: true, user_id: userId, tenant_id: tenantId, trial_ends_at: tenantId ? trialEndsAt : null })
  } catch (e) {
    console.error('[provisionar-tenant] uncaught:', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
