import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ASAAS_BASE = 'https://api.asaas.com/v3'
const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY') ?? ''

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function asaas(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: { 'access_token': ASAAS_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

function nextDueDate(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

serve(async (req) => {
  // Aceita GET (pg_cron/scheduler) ou POST (chamada manual)
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Busca tenants ativos + pending_payment (trial vencido aguardando 1ª cobrança)
  const { data: tenants, error } = await sb
    .from('tenants')
    .select('id, name, status, asaas_customer_id, billing_cycle_day, billing_name, billing_cpf_cnpj, billing_email, billing_phone')
    .in('status', ['active', 'pending_payment'])

  if (error) return json({ error: error.message }, 500)

  const results: unknown[] = []
  const dueDate = nextDueDate()

  for (const tenant of tenants ?? []) {
    try {
      // Conta usuários ativos
      const { data: countData } = await sb.rpc('count_active_users', { p_tenant_id: tenant.id })
      const userCount: number = countData ?? 0

      // Determina o plano
      const { data: planId } = await sb.rpc('get_billing_plan', { p_user_count: userCount })
      if (!planId) {
        results.push({ tenant_id: tenant.id, error: 'nenhum plano encontrado', user_count: userCount })
        continue
      }

      const { data: plan } = await sb
        .from('billing_plans')
        .select('name, value')
        .eq('id', planId)
        .single()

      if (!plan) continue

      // Atualiza o plano no tenant
      await sb.from('tenants').update({
        billing_plan_id: planId,
        asaas_value: plan.value,
        asaas_next_due_date: dueDate,
      }).eq('id', tenant.id)

      // Cria ou reutiliza cliente no Asaas
      let customerId = tenant.asaas_customer_id
      if (!customerId) {
        const customer = await asaas('/customers', 'POST', {
          name: tenant.billing_name ?? tenant.name,
          cpfCnpj: tenant.billing_cpf_cnpj,
          email: tenant.billing_email,
          mobilePhone: tenant.billing_phone,
          externalReference: tenant.id,
          notificationDisabled: false,
        })
        if (customer.errors) {
          results.push({ tenant_id: tenant.id, error: 'falha ao criar cliente Asaas', details: customer.errors })
          continue
        }
        customerId = customer.id
        await sb.from('tenants').update({ asaas_customer_id: customerId }).eq('id', tenant.id)
      }

      // Gera cobrança Pix
      const charge = await asaas('/payments', 'POST', {
        customer: customerId,
        billingType: 'PIX',
        value: plan.value,
        dueDate,
        description: `Boostly — Plano ${plan.name} (${userCount} usuários ativos)`,
        externalReference: tenant.id,
      })

      if (charge.errors) {
        results.push({ tenant_id: tenant.id, error: 'falha ao criar cobrança', details: charge.errors })
        continue
      }

      // Busca QR Code Pix
      const pix = await asaas(`/payments/${charge.id}/pixQrCode`)

      // Salva cobrança
      await sb.from('asaas_cobrancas').insert({
        tenant_id: tenant.id,
        asaas_id: charge.id,
        tipo: 'PIX',
        valor: plan.value,
        vencimento: dueDate,
        status: charge.status,
        invoice_url: charge.invoiceUrl,
        pix_qr_code_image: pix?.encodedImage,
        pix_copy_paste: pix?.payload,
        raw_payload: charge,
      })

      results.push({
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        plan: plan.name,
        user_count: userCount,
        value: plan.value,
        due_date: dueDate,
        asaas_id: charge.id,
        ok: true,
      })
    } catch (err) {
      results.push({ tenant_id: tenant.id, error: String(err) })
    }
  }

  return json({ processed: results.length, results })
})
