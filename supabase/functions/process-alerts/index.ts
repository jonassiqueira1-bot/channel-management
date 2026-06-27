import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_KEY        = Deno.env.get('RESEND_API_KEY')!
const FUNCTION_BASE     = `${SUPABASE_URL}/functions/v1`

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

async function alertExists(tenantId: string, gatilho: string, entidadeId: string) {
  const since = new Date(Date.now() - 86400000 * 3).toISOString() // não duplicar em 3 dias
  const { data } = await db
    .from('alerts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('gatilho', gatilho)
    .eq('entidade_id', String(entidadeId))
    .eq('resolvido', false)
    .gte('created_at', since)
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function createAlert(payload: {
  tenant_id: string; rule_id?: string; gatilho: string
  titulo: string; mensagem?: string; entidade_tipo?: string
  entidade_id?: string; entidade_nome?: string; link?: string
  prioridade?: string
}) {
  await db.from('alerts').insert({
    tenant_id:    payload.tenant_id,
    rule_id:      payload.rule_id ?? null,
    gatilho:      payload.gatilho,
    titulo:       payload.titulo,
    mensagem:     payload.mensagem ?? null,
    entidade_tipo: payload.entidade_tipo ?? null,
    entidade_id:  payload.entidade_id ? String(payload.entidade_id) : null,
    entidade_nome: payload.entidade_nome ?? null,
    link:         payload.link ?? null,
    prioridade:   payload.prioridade ?? 'media',
  })
}

async function sendEmail(template: string, to: string, data: Record<string, unknown>) {
  if (!to || !RESEND_KEY) return
  await fetch(`${FUNCTION_BASE}/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE}` },
    body: JSON.stringify({ template, to, data }),
  })
}

// ─── Processadores por gatilho ─────────────────────────────────────────────────

async function processPagamentosVencidos(tenantId: string, rule: Record<string, unknown>, emails: string[]) {
  const hoje = new Date()
  const limite = new Date(hoje.getTime() - (Number(rule.dias_aviso) || 1) * 86400000)

  const { data: pagamentos } = await db
    .from('commission_payments')
    .select('id, beneficiario_nome, valor_comissao, data_vencimento, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'pendente')
    .lt('data_vencimento', limite.toISOString().split('T')[0])

  let criados = 0
  for (const p of pagamentos ?? []) {
    if (await alertExists(tenantId, 'pagamento_vencido', p.id)) continue
    const dias = daysBetween(new Date(p.data_vencimento), hoje)
    await createAlert({
      tenant_id: tenantId, rule_id: rule.id as string,
      gatilho: 'pagamento_vencido', prioridade: dias > 7 ? 'alta' : 'media',
      titulo: `Pagamento vencido · ${p.beneficiario_nome}`,
      mensagem: `Vencido há ${dias} dia(s)`,
      entidade_tipo: 'pagamento', entidade_id: p.id,
      entidade_nome: p.beneficiario_nome, link: '/pagamentos',
    })
    for (const email of emails) {
      await sendEmail('pagamento_vencido', email, {
        empresa: p.beneficiario_nome, dias,
        valor: `R$ ${Number(p.valor_comissao || 0).toFixed(2)}`,
        data_vencimento: p.data_vencimento,
      })
    }
    criados++
  }
  return criados
}

async function processContratosVencendo(tenantId: string, rule: Record<string, unknown>, emails: string[]) {
  const hoje = new Date()
  const diasAviso = Number(rule.dias_aviso) || 30
  const limite = new Date(hoje.getTime() + diasAviso * 86400000)

  const { data: contratos } = await db
    .from('contracts')
    .select('id, custom_fields, status, data_fim, company_id, companies(nome_fantasia, razao_social)')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo')
    .not('data_fim', 'is', null)
    .lte('data_fim', limite.toISOString().split('T')[0])
    .gte('data_fim', hoje.toISOString().split('T')[0])

  let criados = 0
  for (const c of contratos ?? []) {
    if (await alertExists(tenantId, 'contrato_vencendo', c.id)) continue
    const empresa = (c.companies as Record<string, string>)?.nome_fantasia || (c.companies as Record<string, string>)?.razao_social || 'Empresa'
    const dias = daysBetween(hoje, new Date(c.data_fim))
    const cf = c.custom_fields as Record<string, unknown> ?? {}
    await createAlert({
      tenant_id: tenantId, rule_id: rule.id as string,
      gatilho: 'contrato_vencendo', prioridade: dias <= 7 ? 'alta' : 'media',
      titulo: `Contrato vence em ${dias}d · ${empresa}`,
      entidade_tipo: 'contrato', entidade_id: c.id,
      entidade_nome: empresa, link: '/contratos',
    })
    for (const email of emails) {
      await sendEmail('contrato_vencendo', email, {
        empresa, dias, data_fim: c.data_fim,
        produto: cf.produto_nome || '',
      })
    }
    criados++
  }
  return criados
}

async function processOportunidadesParadas(tenantId: string, rule: Record<string, unknown>, emails: string[]) {
  const hoje = new Date()
  const diasAviso = Number(rule.dias_aviso) || 7
  const limite = new Date(hoje.getTime() - diasAviso * 86400000)

  const { data: opps } = await db
    .from('oportunidades')
    .select('id, titulo, responsavel, updated_at, situacao, companies(nome_fantasia, razao_social)')
    .eq('tenant_id', tenantId)
    .eq('situacao', 'em_andamento')
    .lt('updated_at', limite.toISOString())

  let criados = 0
  for (const o of opps ?? []) {
    if (await alertExists(tenantId, 'oportunidade_parada', o.id)) continue
    const empresa = (o.companies as Record<string, string>)?.nome_fantasia || (o.companies as Record<string, string>)?.razao_social || ''
    const dias = daysBetween(new Date(o.updated_at), hoje)
    await createAlert({
      tenant_id: tenantId, rule_id: rule.id as string,
      gatilho: 'oportunidade_parada', prioridade: dias > 14 ? 'alta' : 'media',
      titulo: `Oportunidade parada · ${o.titulo}`,
      mensagem: `${dias} dias sem movimentação`,
      entidade_tipo: 'oportunidade', entidade_id: o.id,
      entidade_nome: empresa || o.titulo, link: '/pipeline',
    })
    for (const email of emails) {
      await sendEmail('oportunidade_parada', email, {
        oportunidade: o.titulo, empresa, dias,
        responsavel: o.responsavel || '', etapa: '',
      })
    }
    criados++
  }
  return criados
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Busca todos os tenants com regras ativas
    const { data: rules } = await db
      .from('alert_rules')
      .select('*, tenants(id)')
      .eq('ativo', true)

    const stats: Record<string, number> = {}

    for (const rule of rules ?? []) {
      const tenantId = rule.tenant_id as string

      // Emails destinatários (por ora: campo destinatarios ou vazio)
      const dest = (rule.destinatarios as Array<{ tipo: string; valor: string }>) || []
      const emails = dest.filter(d => d.tipo === 'email').map(d => d.valor)

      let criados = 0
      if (rule.gatilho === 'pagamento_vencido')   criados = await processPagamentosVencidos(tenantId, rule, emails)
      if (rule.gatilho === 'contrato_vencendo')   criados = await processContratosVencendo(tenantId, rule, emails)
      if (rule.gatilho === 'oportunidade_parada') criados = await processOportunidadesParadas(tenantId, rule, emails)

      if (criados > 0) stats[rule.gatilho] = (stats[rule.gatilho] || 0) + criados
    }

    return json({ ok: true, alertas_criados: stats })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
