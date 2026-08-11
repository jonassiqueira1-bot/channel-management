// ─── Resolve uma solicitação (conta nova ou cancelamento) — chamada pelo
// Control Center quando o admin aprova/rejeita ou marca um cancelamento
// como atendido. Aprovar conta reaproveita a MESMA lógica de provisionar-
// tenant (chamada internamente); nunca duplica a criação de usuário/tenant.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-control-center-token',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const tokenEsperado = Deno.env.get('CONTROL_CENTER_TOKEN')
  const token = req.headers.get('x-control-center-token')
  if (!token || token !== tokenEsperado) return json({ error: 'não autorizado' }, 401)

  const body = await req.json().catch(() => null)
  const { tipo, id, acao } = body ?? {}
  if (!['signup', 'cancelamento'].includes(tipo) || !id || !acao) {
    return json({ ok: false, error: 'tipo, id e acao são obrigatórios' }, 400)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  if (tipo === 'cancelamento') {
    if (acao !== 'atendida') return json({ ok: false, error: 'ação inválida para cancelamento' }, 400)
    const { error } = await admin.from('tenant_cancellation_requests')
      .update({ status: 'atendida', processed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return json({ ok: false, error: error.message }, 500)
    return json({ ok: true })
  }

  // tipo === 'signup'
  if (acao === 'rejeitar') {
    const { error } = await admin.from('signup_requests')
      .update({ status: 'rejeitado', processed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return json({ ok: false, error: error.message }, 500)
    return json({ ok: true })
  }

  if (acao !== 'aprovar') return json({ ok: false, error: 'ação inválida para conta' }, 400)

  const { data: solicitacao, error: findErr } = await admin.from('signup_requests').select('*').eq('id', id).maybeSingle()
  if (findErr || !solicitacao) return json({ ok: false, error: 'solicitação não encontrada' }, 404)
  if (solicitacao.status !== 'pendente') return json({ ok: false, error: 'solicitação já processada' }, 409)

  const provisionar = await fetch(`${SUPABASE_URL}/functions/v1/provisionar-tenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-control-center-token': tokenEsperado! },
    body: JSON.stringify({ email: solicitacao.email, nome: solicitacao.nome, org_name: solicitacao.org_name }),
  })
  const resultado = await provisionar.json().catch(() => ({}))

  if (!provisionar.ok || resultado?.ok === false) {
    await admin.from('signup_requests')
      .update({ erro: resultado?.error || `HTTP ${provisionar.status}` })
      .eq('id', id)
    return json({ ok: false, error: resultado?.error || 'Falha ao provisionar' }, 500)
  }

  await admin.from('signup_requests')
    .update({ status: 'aprovado', boostly_tenant_id: resultado.tenant_id || null, processed_at: new Date().toISOString(), erro: null })
    .eq('id', id)

  return json({ ok: true, tenant_id: resultado.tenant_id })
})
