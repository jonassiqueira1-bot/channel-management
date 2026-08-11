// ─── Lista solicitações pendentes (conta nova + cancelamento) pro Control
// Center exibir como alerta/fila de ativação-desativação. Mesmo padrão de
// token de listar-tenants-boostly/provisionar-tenant.
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

  const token = req.headers.get('x-control-center-token')
  if (!token || token !== Deno.env.get('CONTROL_CENTER_TOKEN')) {
    return json({ error: 'não autorizado' }, 401)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const [{ data: contas, error: e1 }, { data: cancelamentos, error: e2 }] = await Promise.all([
    admin.from('signup_requests').select('*').eq('status', 'pendente').order('created_at'),
    admin.from('tenant_cancellation_requests').select('*, tenants(name)').eq('status', 'pendente').order('created_at'),
  ])
  if (e1) return json({ error: e1.message }, 500)
  if (e2) return json({ error: e2.message }, 500)

  return json({
    contas: contas || [],
    cancelamentos: (cancelamentos || []).map((c: any) => ({ ...c, tenant_nome: c.tenants?.name || null, tenants: undefined })),
  })
})
