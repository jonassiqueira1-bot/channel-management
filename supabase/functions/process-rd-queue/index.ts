import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// ─── Resolve dot-notation path no payload ─────────────────────────────────────
function get(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined
  return path.split('.').reduce((acc: unknown, k) => (acc as Record<string, unknown>)?.[k], obj)
}

// ─── Aplica mapeamento salvo na integração ────────────────────────────────────
function aplicarMapeamento(payload: Record<string, unknown>, mapeamento: Record<string, string>) {
  const lead = (payload.leads as Record<string, unknown>[])?.[0] || payload.lead || payload as Record<string, unknown>
  const flat = { ...payload, ...lead as Record<string, unknown> }

  const OPP_CAMPOS = ['titulo', 'empresa_nome', 'contato_nome', 'contato_email', 'contato_fone', 'descricao', 'valor', 'origem']
  const resultado: Record<string, unknown> = {}
  OPP_CAMPOS.forEach(key => {
    const path = mapeamento?.[key]
    if (path) resultado[key] = get(flat, path) ?? get(flat, path.replace('lead.', '')) ?? ''
  })

  return {
    titulo:        (resultado.titulo        as string) || (lead.name as string) || (lead.email as string) || 'Lead RD Station',
    empresa_nome:  (resultado.empresa_nome  as string) || (lead.company_name as string) || '',
    contato_nome:  (resultado.contato_nome  as string) || (lead.name as string) || '',
    contato_email: (resultado.contato_email as string) || (lead.email as string) || '',
    contato_fone:  (resultado.contato_fone  as string) || (lead.mobile_phone as string) || (lead.phone as string) || '',
    descricao:     (resultado.descricao     as string) || '',
    valor:         Number(resultado.valor) || 0,
    origem:        (resultado.origem        as string) || 'RD Station',
    rd_lead_id:    (lead.uuid as string) || (lead.id as string) || '',
  }
}

// ─── Processa fila de um tenant ───────────────────────────────────────────────
async function processarTenant(tenantId: string) {
  // Busca configuração da integração (mapeamento, funil, campanha)
  const { data: integracao } = await db
    .from('integracoes')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', 'rd_station')
    .maybeSingle()

  const config   = integracao?.config || {}
  const mapeamento: Record<string, string> = config.mapeamento || {}
  const funilId  = config.funil_id   || null
  const campanhaId = config.campanha_id || null

  // Busca etapa inicial do funil configurado
  let primeiraEtapaId: string | null = null
  if (funilId) {
    const { data: funil } = await db
      .from('pipeline_stages')
      .select('id')
      .eq('funil_id', funilId)
      .order('ordem', { ascending: true })
      .limit(1)
      .maybeSingle()
    primeiraEtapaId = funil?.id || null
  }

  // Leads já importados (evita duplicatas por rd_lead_id)
  const { data: existentes } = await db
    .from('oportunidades')
    .select('custom_fields')
    .eq('tenant_id', tenantId)
    .not('custom_fields->>rd_lead_id', 'is', null)
  const rdIdsExistentes = new Set(
    (existentes || []).map(o => (o.custom_fields as Record<string, unknown>)?.rd_lead_id as string).filter(Boolean)
  )

  // Busca itens pendentes da fila
  const { data: fila } = await db
    .from('rd_leads_queue')
    .select('id, payload')
    .eq('tenant_id', tenantId)
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(50)

  if (!fila?.length) return 0

  let criados = 0
  const processados: string[] = []

  for (const item of fila) {
    const campos = aplicarMapeamento(item.payload as Record<string, unknown>, mapeamento)

    // Pula duplicatas
    if (campos.rd_lead_id && rdIdsExistentes.has(campos.rd_lead_id)) {
      processados.push(item.id)
      continue
    }

    // Cria oportunidade
    const { error } = await db.from('oportunidades').insert({
      tenant_id:     tenantId,
      titulo:        campos.titulo,
      empresa_nome:  campos.empresa_nome  || null,
      contato_nome:  campos.contato_nome  || null,
      contato_email: campos.contato_email || null,
      contato_fone:  campos.contato_fone  || null,
      descricao:     campos.descricao     || null,
      valor:         campos.valor         || 0,
      origem:        campos.origem,
      situacao:      'em_negociacao',
      funil_id:      funilId,
      etapa_id:      primeiraEtapaId,
      campanha_id:   campanhaId          || null,
      custom_fields: {
        rd_lead_id: campos.rd_lead_id,
        contato_email: campos.contato_email,
        contato_fone:  campos.contato_fone,
      },
    })

    if (!error) {
      criados++
      if (campos.rd_lead_id) rdIdsExistentes.add(campos.rd_lead_id)
    }

    processados.push(item.id)
  }

  // Marca todos como processados
  if (processados.length) {
    await db.from('rd_leads_queue').update({ processed: true }).in('id', processados)
  }

  return criados
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Busca todos os tenants com leads pendentes
    const { data: pendentes } = await db
      .from('rd_leads_queue')
      .select('tenant_id')
      .eq('processed', false)

    const tenantIds = [...new Set((pendentes || []).map(r => r.tenant_id as string))]

    const stats: Record<string, number> = {}
    for (const tenantId of tenantIds) {
      const criados = await processarTenant(tenantId)
      if (criados > 0) stats[tenantId] = criados
    }

    return json({ ok: true, tenants_processados: tenantIds.length, oportunidades_criadas: stats })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
