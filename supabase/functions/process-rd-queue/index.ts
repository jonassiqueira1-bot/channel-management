import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// ─── Resolve dot-notation no payload ─────────────────────────────────────────
type Obj = Record<string, unknown>
function get(obj: Obj, path: string): unknown {
  if (!path) return undefined
  return path.split('.').reduce((acc: unknown, k) => (acc as Obj)?.[k], obj)
}

// ─── Normaliza payload para objeto plano ─────────────────────────────────────
function flattenPayload(payload: Obj): Obj {
  const lead = (payload.leads as Obj[])?.[0] || (payload.lead as Obj) || payload
  return { ...payload, ...(lead as Obj) }
}

// ─── Campos mapeáveis (espelha OPP_CAMPOS_MAPEAVEIS do frontend) ──────────────
const OPP_CAMPOS = [
  'titulo', 'empresa_nome', 'contato_nome', 'contato_email', 'contato_fone',
  'valor', 'valor_cdu', 'valor_sms', 'valor_servico', 'valor_desconto',
  'origem', 'responsavel', 'prazo', 'situacao', 'descricao',
]

// ─── Aplica mapeamento da integração ao payload ───────────────────────────────
function aplicarMapeamento(
  payload: Obj,
  mapeamento: Record<string, string>,
  nomeIntegracao: string,
): Record<string, unknown> {
  const flat = flattenPayload(payload)

  const resultado: Record<string, unknown> = {}
  OPP_CAMPOS.forEach(key => {
    const path = mapeamento?.[key]
    if (path) resultado[key] = get(flat, path) ?? get(flat, path.replace('lead.', ''))
  })

  return {
    titulo:        resultado.titulo        || flat.name        || flat.email     || 'Lead sem título',
    empresa_nome:  resultado.empresa_nome  || flat.company_name || flat.company  || '',
    contato_nome:  resultado.contato_nome  || flat.name        || '',
    contato_email: resultado.contato_email || flat.email       || '',
    contato_fone:  resultado.contato_fone  || flat.mobile_phone || flat.phone   || '',
    descricao:     resultado.descricao     || [
      flat.city  ? `Cidade: ${flat.city}`  : '',
      flat.state ? `Estado: ${flat.state}` : '',
      payload.conversion_identifier ? `Conversão: ${payload.conversion_identifier}` : '',
    ].filter(Boolean).join('\n') || '',
    valor:          Number(resultado.valor)          || 0,
    valor_cdu:      Number(resultado.valor_cdu)      || 0,
    valor_sms:      Number(resultado.valor_sms)      || 0,
    valor_servico:  Number(resultado.valor_servico)  || 0,
    valor_desconto: Number(resultado.valor_desconto) || 0,
    origem:         (resultado.origem as string)     || nomeIntegracao || 'Webhook',
    responsavel:    resultado.responsavel            || '',
    prazo:          resultado.prazo                  || null,
    situacao:       resultado.situacao               || 'em_negociacao',
    rd_lead_id:     flat.uuid || flat.id             || '',
  }
}

// ─── Busca primeira etapa do funil (armazenado em form_layouts) ───────────────
async function primeiraEtapa(funilId: string | null): Promise<string | null> {
  if (!funilId) return null
  const { data } = await db
    .from('form_layouts')
    .select('fields')
    .eq('entity', 'funis')
    .limit(1)
    .maybeSingle()
  if (!data?.fields) return null
  const funis = Array.isArray(data.fields) ? data.fields : []
  const funil = funis.find((f: Obj) => String(f.id) === String(funilId))
  const etapas = (funil?.etapas as Obj[]) || []
  return (etapas[0]?.id as string) || null
}

// ─── Processa fila de um tenant + provider ────────────────────────────────────
async function processarTenant(tenantId: string, provider: string): Promise<number> {
  // Configuração da integração (mapeamento, funil, campanha, nome)
  const { data: integracao } = await db
    .from('integracoes')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .maybeSingle()

  const config: Obj    = (integracao?.config as Obj) || {}
  const mapeamento     = (config.mapeamento as Record<string, string>) || {}
  const funilId        = (config.funil_id   as string) || null
  const campanhaId     = (config.campanha_id as string) || null
  const nomeIntegracao = (config.nome_integracao as string) || provider

  const etapaId = await primeiraEtapa(funilId)

  // Deduplicação por rd_lead_id
  const { data: existentes } = await db
    .from('oportunidades')
    .select('custom_fields')
    .eq('tenant_id', tenantId)
    .not('custom_fields->>rd_lead_id', 'is', null)
  const rdIdsExistentes = new Set(
    (existentes || [])
      .map(o => ((o.custom_fields as Obj)?.rd_lead_id as string))
      .filter(Boolean)
  )

  // Itens pendentes para este tenant+provider
  const { data: fila } = await db
    .from('rd_leads_queue')
    .select('id, payload')
    .eq('tenant_id', tenantId)
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(100)

  if (!fila?.length) return 0

  // Filtra pelo provider correto (marcado como _provider no payload pela integration-webhook)
  const filaDoProv = fila.filter(
    item => ((item.payload as Obj)?._provider as string) === provider
  )
  if (!filaDoProv.length) return 0

  let criados = 0
  const processados: string[] = []

  for (const item of filaDoProv) {
    const campos = aplicarMapeamento(item.payload as Obj, mapeamento, nomeIntegracao)

    // Pula duplicatas
    if (campos.rd_lead_id && rdIdsExistentes.has(campos.rd_lead_id as string)) {
      processados.push(item.id as string)
      continue
    }

    // Insere oportunidade — schema idêntico ao oppToRow() do frontend
    const { error } = await db.from('oportunidades').insert({
      tenant_id:   tenantId,
      titulo:      campos.titulo,
      stage_id:    etapaId,           // coluna real do DB
      valor:       campos.valor,
      situacao:    campos.situacao,
      origem:      campos.origem,
      descricao:   campos.descricao,
      responsavel: campos.responsavel || '',
      prazo:       campos.prazo || null,
      campanha_id: campanhaId || null,
      custom_fields: {
        funil_id:             funilId,   // funil_id fica em custom_fields (não é coluna)
        funil_nome:           '',
        etapa_id:             etapaId,
        empresa_nome:         campos.empresa_nome,
        primary_contact_nome: campos.contato_nome,
        valor_cdu:            campos.valor_cdu,
        valor_sms:            campos.valor_sms,
        valor_servico:        campos.valor_servico,
        valor_desconto:       campos.valor_desconto,
        contato_email:        campos.contato_email,
        contato_fone:         campos.contato_fone,
        rd_lead_id:           campos.rd_lead_id,
        itens:                [],
      },
    })

    if (!error) {
      criados++
      if (campos.rd_lead_id) rdIdsExistentes.add(campos.rd_lead_id as string)
    } else {
      console.error(`[process-queue] Erro ao criar opp: ${error.message}`, campos.titulo)
    }

    processados.push(item.id as string)
  }

  // Marca como processados (mesmo os duplicatas pulados)
  if (processados.length) {
    await db.from('rd_leads_queue').update({ processed: true }).in('id', processados)
  }

  return criados
}

// ─── Handler HTTP ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Agrupa pendentes por tenant + provider
    const { data: pendentes } = await db
      .from('rd_leads_queue')
      .select('tenant_id, payload')
      .eq('processed', false)

    if (!pendentes?.length) {
      return json({ ok: true, mensagem: 'Nenhum lead pendente', oportunidades_criadas: 0 })
    }

    // Monta mapa { tenantId → Set<provider> }
    const filaMap = new Map<string, Set<string>>()
    for (const row of pendentes) {
      const tid  = row.tenant_id as string
      const prov = ((row.payload as Obj)?._provider as string) || 'webhook'
      if (!filaMap.has(tid)) filaMap.set(tid, new Set())
      filaMap.get(tid)!.add(prov)
    }

    const stats: Record<string, Record<string, number>> = {}
    let totalCriados = 0

    for (const [tenantId, providers] of filaMap) {
      stats[tenantId] = {}
      for (const provider of providers) {
        const criados = await processarTenant(tenantId, provider)
        stats[tenantId][provider] = criados
        totalCriados += criados
      }
    }

    return json({
      ok: true,
      tenants_processados: filaMap.size,
      oportunidades_criadas: totalCriados,
      detalhe: stats,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[process-queue] Erro fatal:', msg)
    return json({ ok: false, error: msg }, 500)
  }
})
