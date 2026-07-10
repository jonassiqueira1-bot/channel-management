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

const ASAAS_BASE = 'https://api.asaas.com/v3'
const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

async function asaas(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      'access_token': ASAAS_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { tenant_id, tipo, valor, vencimento, descricao } = await req.json()

    if (!tenant_id || !tipo || !valor || !vencimento) {
      return json({ error: 'tenant_id, tipo, valor e vencimento são obrigatórios' }, 400)
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Busca o tenant
    const { data: tenant, error: tenantErr } = await sb
      .from('tenants')
      .select('id, name, asaas_customer_id')
      .eq('id', tenant_id)
      .single()

    if (tenantErr || !tenant) return json({ error: 'Tenant não encontrado' }, 404)

    // Cria ou reutiliza cliente no Asaas
    let customerId = tenant.asaas_customer_id
    if (!customerId) {
      const customer = await asaas('/customers', 'POST', {
        name: tenant.name,
        externalReference: tenant.id,
        notificationDisabled: false,
      })
      if (customer.errors) return json({ error: 'Erro ao criar cliente no Asaas', details: customer.errors }, 500)
      customerId = customer.id
      await sb.from('tenants').update({ asaas_customer_id: customerId }).eq('id', tenant_id)
    }

    // Cria a cobrança
    const charge = await asaas('/payments', 'POST', {
      customer: customerId,
      billingType: tipo,           // PIX, BOLETO, CREDIT_CARD
      value: valor,
      dueDate: vencimento,         // YYYY-MM-DD
      description: descricao ?? 'Assinatura Boostly',
      externalReference: tenant_id,
    })

    if (charge.errors) return json({ error: 'Erro ao criar cobrança no Asaas', details: charge.errors }, 500)

    // Salva no banco
    const cobranca: Record<string, unknown> = {
      tenant_id,
      asaas_id: charge.id,
      tipo,
      valor,
      vencimento,
      status: charge.status,
      invoice_url: charge.invoiceUrl,
      bank_slip_url: charge.bankSlipUrl,
      raw_payload: charge,
    }

    // Para PIX, busca QR Code
    if (tipo === 'PIX') {
      const pix = await asaas(`/payments/${charge.id}/pixQrCode`)
      if (!pix.errors) {
        cobranca.pix_qr_code_image = pix.encodedImage
        cobranca.pix_copy_paste = pix.payload
      }
    }

    const { data: saved, error: saveErr } = await sb
      .from('asaas_cobrancas')
      .insert(cobranca)
      .select()
      .single()

    if (saveErr) return json({ error: 'Cobrança criada no Asaas mas falhou ao salvar localmente', asaas_id: charge.id }, 500)

    return json({ ok: true, cobranca: saved })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
