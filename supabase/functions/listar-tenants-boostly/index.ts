// ─── Exportação read-only de tenants — usada uma única vez pro backfill do
// Control Center (espelho fiel de tenants que já existiam em produção antes
// do Control Center existir). Não escreve nada, só lê e devolve JSON.
//
// Autenticação: mesmo padrão de provisionar-tenant — token compartilhado no
// header `x-export-token` validado contra o secret EXPORT_TENANTS_TOKEN.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-token',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = req.headers.get('x-export-token')
  if (!token || token !== Deno.env.get('EXPORT_TENANTS_TOKEN')) {
    return json({ error: 'não autorizado' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, status, billing_plan_id, billing_name, billing_cpf_cnpj, billing_email, billing_phone, asaas_customer_id, created_at, billing_plans(name)')
    .order('created_at')

  if (error) return json({ error: error.message }, 500)

  // Contato admin de fallback: primeiro profile admin_isv de cada tenant,
  // pra tenants antigos que nunca preencheram os campos de billing_*.
  const { data: admins } = await supabase
    .from('profiles')
    .select('tenant_id, email, full_name')
    .eq('papel', 'admin_isv')
    .order('created_at')

  const adminPorTenant: Record<string, { email: string; nome: string }> = {}
  for (const a of admins || []) {
    if (a.tenant_id && !adminPorTenant[a.tenant_id]) {
      adminPorTenant[a.tenant_id] = { email: a.email, nome: a.full_name }
    }
  }

  const resultado = (tenants || []).map((t: any) => ({
    id: t.id,
    nome: t.name,
    status: t.status,
    plano: t.billing_plans?.name || null,
    email_contato: t.billing_email || adminPorTenant[t.id]?.email || null,
    cnpj: t.billing_cpf_cnpj || null,
    telefone: t.billing_phone || null,
    asaas_customer_id: t.asaas_customer_id || null,
    created_at: t.created_at,
  }))

  return json({ tenants: resultado, total: resultado.length })
})
