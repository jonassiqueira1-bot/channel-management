// ─── Estende (ou inicia) o período de trial de um tenant ────────────────────
// Chamada pelo Control Center quando o admin quer dar mais dias de trial pra
// um cliente manualmente (ex: negociação, cortesia, teste estendido).
// Mesmo padrão de token de provisionar-tenant.
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

  const token = req.headers.get('x-control-center-token')
  if (!token || token !== Deno.env.get('CONTROL_CENTER_TOKEN')) return json({ error: 'não autorizado' }, 401)

  const body = await req.json().catch(() => null)
  const { tenant_id, dias } = body ?? {}
  const diasNum = Number(dias)
  if (!tenant_id || !diasNum || diasNum <= 0) {
    return json({ ok: false, error: 'tenant_id e dias (> 0) são obrigatórios' }, 400)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: tenant, error: findErr } = await admin.from('tenants').select('id, trial_ends_at').eq('id', tenant_id).maybeSingle()
  if (findErr || !tenant) return json({ ok: false, error: 'tenant não encontrado' }, 404)

  // Estende a partir do vencimento atual se ainda não passou; se já passou
  // (ou nunca teve), conta os dias a partir de agora.
  const baseAtual = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null
  const base = baseAtual && baseAtual.getTime() > Date.now() ? baseAtual : new Date()
  const novoTrialEndsAt = new Date(base.getTime() + diasNum * 86400000).toISOString()

  const { error } = await admin.from('tenants')
    .update({ status: 'trial', trial_ends_at: novoTrialEndsAt })
    .eq('id', tenant_id)
  if (error) return json({ ok: false, error: error.message }, 500)

  return json({ ok: true, trial_ends_at: novoTrialEndsAt })
})
