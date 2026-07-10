import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Mapa de status Asaas → status local
const STATUS_MAP: Record<string, string> = {
  PENDING: 'PENDING',
  RECEIVED: 'RECEIVED',
  CONFIRMED: 'RECEIVED',
  OVERDUE: 'OVERDUE',
  REFUNDED: 'CANCELLED',
  REFUND_REQUESTED: 'CANCELLED',
  CHARGEBACK_REQUESTED: 'CANCELLED',
  CHARGEBACK_DISPUTE: 'CANCELLED',
  AWAITING_CHARGEBACK_REVERSAL: 'CANCELLED',
  DUNNING_REQUESTED: 'OVERDUE',
  DUNNING_RECEIVED: 'RECEIVED',
  AWAITING_RISK_ANALYSIS: 'PENDING',
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const payload = await req.json()
    const event = payload.event as string
    const payment = payload.payment as Record<string, unknown>

    if (!event || !payment) return json({ ok: true }) // ignora eventos sem payment

    const asaas_id = payment.id as string
    const asaas_status = payment.status as string
    const payment_date = (payment.paymentDate ?? payment.confirmedDate ?? null) as string | null

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Busca a cobrança local pelo asaas_id
    const { data: cobranca } = await sb
      .from('asaas_cobrancas')
      .select('id, tenant_id, status')
      .eq('asaas_id', asaas_id)
      .single()

    if (!cobranca) {
      // Pode ser uma cobrança criada fora do sistema — ignora silenciosamente
      return json({ ok: true, note: 'cobrança não encontrada localmente' })
    }

    const newStatus = STATUS_MAP[asaas_status] ?? asaas_status

    // Atualiza a cobrança
    await sb.from('asaas_cobrancas').update({
      status: newStatus,
      payment_date: payment_date ?? undefined,
      raw_payload: payload,
      updated_at: new Date().toISOString(),
    }).eq('id', cobranca.id)

    // Se pago, ativa o tenant e limpa flags de pendência
    if (newStatus === 'RECEIVED') {
      await sb.from('tenants').update({
        status: 'active',
        trial_charge_sent: true,   // confirma que assinou — ativa carência se futuramente ficar overdue
        overdue_since: null,
        suspended_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', cobranca.tenant_id)
    }

    // Se vencido, marca como inadimplente e registra data de início da carência
    if (newStatus === 'OVERDUE' && cobranca.status !== 'OVERDUE') {
      await sb.from('tenants').update({
        status: 'overdue',
        overdue_since: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', cobranca.tenant_id)
    }

    return json({ ok: true })
  } catch (err) {
    console.error('[asaas-webhook]', err)
    return json({ error: String(err) }, 500)
  }
})
