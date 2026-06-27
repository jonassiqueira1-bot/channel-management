import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FUNCTION_BASE    = `${SUPABASE_URL}/functions/v1`

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Condicao { campo: string; operador: string; valor: string; logico?: 'E' | 'OU' }
interface Acao {
  tipo: 'notificar' | 'email' | 'tarefa'
  destinatario_tipo: 'responsavel_origem' | 'responsavel_tarefa' | 'contato_empresa' | 'email_fixo'
  email_fixo?: string
  template?: string
  assunto?: string
  mensagem?: string
  prazo_dias?: number
  titulo_tarefa?: string
}
interface Rule {
  id: string
  tenant_id: string
  gatilho: string
  gatilho_nome: string
  origem: string
  ativo: boolean
  dias_aviso: number
  custom_fields: {
    condicoes?: Condicao[]
    acoes?: Acao[]
  }
}

// ─── Utilitários ───────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

async function alertExists(tenantId: string, gatilho: string, entidadeId: string) {
  const since = new Date(Date.now() - 86400000 * 3).toISOString()
  const { data } = await db.from('alerts').select('id')
    .eq('tenant_id', tenantId).eq('gatilho', gatilho)
    .eq('entidade_id', String(entidadeId)).eq('resolvido', false)
    .gte('created_at', since).limit(1)
  return (data?.length ?? 0) > 0
}

async function createAlert(payload: {
  tenant_id: string; rule_id?: string; gatilho: string
  titulo: string; mensagem?: string; entidade_tipo?: string
  entidade_id?: string; entidade_nome?: string; link?: string; prioridade?: string
}) {
  await db.from('alerts').insert({
    tenant_id: payload.tenant_id, rule_id: payload.rule_id ?? null,
    gatilho: payload.gatilho, titulo: payload.titulo,
    mensagem: payload.mensagem ?? null, entidade_tipo: payload.entidade_tipo ?? null,
    entidade_id: payload.entidade_id ? String(payload.entidade_id) : null,
    entidade_nome: payload.entidade_nome ?? null, link: payload.link ?? null,
    prioridade: payload.prioridade ?? 'media',
  })
}

async function sendEmail(template: string, to: string, data: Record<string, unknown>) {
  if (!to) return
  await fetch(`${FUNCTION_BASE}/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE}` },
    body: JSON.stringify({ template, to, data }),
  })
}

// ─── Resolve email do destinatário por papel ────────────────────────────────

async function resolveEmail(
  acao: Acao,
  registro: Record<string, unknown>,
  tenantId: string,
): Promise<string | null> {
  if (acao.destinatario_tipo === 'email_fixo') return acao.email_fixo || null

  if (acao.destinatario_tipo === 'responsavel_origem') {
    // tenta por responsavel_id ou responsavel (nome)
    const responsavelId = registro.responsavel_id as string | undefined
    if (responsavelId) {
      const { data } = await db.from('profiles').select('email').eq('id', responsavelId).single()
      return data?.email || null
    }
    const responsavel = registro.responsavel as string | undefined
    if (responsavel) {
      const { data } = await db.from('profiles').select('email').eq('nome', responsavel).eq('tenant_id', tenantId).limit(1).single()
      return data?.email || null
    }
  }

  if (acao.destinatario_tipo === 'responsavel_tarefa') {
    // busca tarefa mais recente relacionada ao registro
    const { data: task } = await db.from('tasks').select('custom_fields')
      .eq('entidade_id', String(registro.id)).order('created_at', { ascending: false }).limit(1).single()
    const responsavelId = (task?.custom_fields as Record<string, unknown>)?.responsavel_id as string | undefined
    if (responsavelId) {
      const { data } = await db.from('profiles').select('email').eq('id', responsavelId).single()
      return data?.email || null
    }
  }

  if (acao.destinatario_tipo === 'contato_empresa') {
    const companyId = registro.company_id as string | undefined
    if (companyId) {
      const { data } = await db.from('contacts').select('email').eq('company_id', companyId).eq('is_primary', true).limit(1).single()
      return data?.email || null
    }
  }

  return null
}

// ─── Executa ações para um registro que bateu nas condições ─────────────────

async function executeAcoes(
  rule: Rule,
  registro: Record<string, unknown>,
  contexto: { titulo: string; entidade_tipo: string; link: string; prioridade?: string },
) {
  const acoes = rule.custom_fields?.acoes || []

  for (const acao of acoes) {
    if (acao.tipo === 'notificar') {
      if (await alertExists(rule.tenant_id, rule.gatilho, registro.id as string)) continue
      await createAlert({
        tenant_id: rule.tenant_id, rule_id: rule.id,
        gatilho: rule.gatilho,
        titulo: contexto.titulo,
        entidade_tipo: contexto.entidade_tipo,
        entidade_id: String(registro.id),
        entidade_nome: String(registro.nome || registro.titulo || registro.id || ''),
        link: contexto.link,
        prioridade: contexto.prioridade || 'media',
      })
    }

    if (acao.tipo === 'email') {
      const to = await resolveEmail(acao, registro, rule.tenant_id)
      if (to) {
        await sendEmail(acao.template || 'alerta_generico', to, {
          titulo: contexto.titulo,
          mensagem: acao.mensagem || '',
          assunto: acao.assunto || contexto.titulo,
          link: contexto.link,
          nome_registro: String(registro.nome || registro.titulo || ''),
        })
      }
    }

    if (acao.tipo === 'tarefa') {
      let responsavelId: string | null = null
      // resolve quem recebe a tarefa
      if (acao.destinatario_tipo === 'responsavel_origem') {
        responsavelId = (registro.responsavel_id as string) || null
      } else if (acao.destinatario_tipo === 'email_fixo' && acao.email_fixo) {
        const { data } = await db.from('profiles').select('id').eq('email', acao.email_fixo).eq('tenant_id', rule.tenant_id).single()
        responsavelId = data?.id || null
      }

      const prazo = new Date(Date.now() + (acao.prazo_dias || 3) * 86400000).toISOString().split('T')[0]
      const { data: profile } = await db.from('profiles').select('branch_id').eq('tenant_id', rule.tenant_id).limit(1).single()

      await db.from('tasks').insert({
        tenant_id: rule.tenant_id,
        branch_id: profile?.branch_id || null,
        titulo: acao.titulo_tarefa || contexto.titulo,
        tipo: 'tarefa',
        status: 'pendente',
        prioridade: 'media',
        prazo,
        entidade_tipo: contexto.entidade_tipo,
        entidade_id: String(registro.id),
        entidade_nome: String(registro.nome || registro.titulo || ''),
        responsavel_id: responsavelId,
        custom_fields: { responsavel_id: responsavelId, data_inicio: new Date().toISOString() },
      })
    }
  }
}

// ─── Avalia condições dinâmicas ────────────────────────────────────────────────

function valorCampo(registro: Record<string, unknown>, campo: string): unknown {
  if (campo.startsWith('cf.')) {
    const cf = registro.custom_fields as Record<string, unknown> || {}
    return cf[campo.slice(3)]
  }
  return registro[campo]
}

function avaliarCondicao(registro: Record<string, unknown>, c: Condicao): boolean {
  const raw = valorCampo(registro, c.campo)
  const hoje = new Date()

  if (c.operador === 'dias_apos') {
    if (!raw) return false
    return daysBetween(new Date(String(raw)), hoje) > Number(c.valor)
  }
  if (c.operador === 'dias_antes') {
    if (!raw) return false
    const diff = daysBetween(hoje, new Date(String(raw)))
    return diff >= 0 && diff < Number(c.valor)
  }
  if (c.operador === 'antes_de') return raw ? new Date(String(raw)) < new Date(c.valor) : false
  if (c.operador === 'apos_de')  return raw ? new Date(String(raw)) > new Date(c.valor) : false
  if (c.operador === 'gt')       return Number(raw) > Number(c.valor)
  if (c.operador === 'gte')      return Number(raw) >= Number(c.valor)
  if (c.operador === 'lt')       return Number(raw) < Number(c.valor)
  if (c.operador === 'lte')      return Number(raw) <= Number(c.valor)
  if (c.operador === 'eq')       return String(raw) === c.valor
  if (c.operador === 'neq')      return String(raw) !== c.valor
  if (c.operador === 'contains') return String(raw || '').toLowerCase().includes(c.valor.toLowerCase())
  return false
}

function avaliarCondicoes(registro: Record<string, unknown>, rule: Rule): boolean {
  const condicoes = (rule.custom_fields?.condicoes || []).filter(c => c.campo && c.operador)
  if (!condicoes.length) return true
  // Avalia da esquerda para direita respeitando o operador lógico de cada condição
  let resultado = avaliarCondicao(registro, condicoes[0])
  for (let i = 1; i < condicoes.length; i++) {
    const op = (condicoes[i] as Condicao & { logico?: string }).logico || 'E'
    const val = avaliarCondicao(registro, condicoes[i])
    resultado = op === 'OU' ? resultado || val : resultado && val
  }
  return resultado
}

// ─── Tabela → configuração de busca ──────────────────────────────────────────

const ORIGEM_CONFIG: Record<string, { select: string; entidade_tipo: string; link: string; titulo: (r: Record<string, unknown>) => string; prioridade?: (r: Record<string, unknown>) => string }> = {
  commission_payments: {
    select: 'id, beneficiario_nome, valor_comissao, data_vencimento, status, custom_fields',
    entidade_tipo: 'pagamento', link: '/pagamentos',
    titulo: r => `Pagamento vencido · ${r.beneficiario_nome}`,
    prioridade: r => daysBetween(new Date(String(r.data_vencimento)), new Date()) > 7 ? 'alta' : 'media',
  },
  contracts: {
    select: 'id, status, data_fim, data_inicio, responsavel, responsavel_id, company_id, custom_fields',
    entidade_tipo: 'contrato', link: '/contratos',
    titulo: r => `Contrato vencendo · ${r.id}`,
  },
  oportunidades: {
    select: 'id, titulo, responsavel, responsavel_id, situacao, valor, updated_at, prazo, company_id, custom_fields',
    entidade_tipo: 'oportunidade', link: '/pipeline',
    titulo: r => `Oportunidade · ${r.titulo}`,
  },
  projetos: {
    select: 'id, titulo, status, data_inicio, data_fim, responsavel, responsavel_id, custom_fields',
    entidade_tipo: 'projeto', link: '/projetos',
    titulo: r => `Projeto · ${r.titulo}`,
  },
  tarefas: {
    select: 'id, titulo, status, prioridade, prazo, responsavel, responsavel_id, custom_fields',
    entidade_tipo: 'tarefa', link: '/tarefas',
    titulo: r => `Tarefa · ${r.titulo}`,
  },
  companies: {
    select: 'id, nome_fantasia, razao_social, status, updated_at, custom_fields',
    entidade_tipo: 'empresa', link: '/empresas',
    titulo: r => `Empresa · ${r.nome_fantasia || r.razao_social}`,
  },
}

// ─── Processadores legados (mantidos para compatibilidade) ─────────────────────

async function processPagamentosVencidos(tenantId: string, rule: Rule) {
  const hoje = new Date()
  const limite = new Date(hoje.getTime() - (Number(rule.dias_aviso) || 1) * 86400000)
  const { data } = await db.from('commission_payments').select('id, beneficiario_nome, valor_comissao, data_vencimento, status, responsavel_id, custom_fields')
    .eq('tenant_id', tenantId).eq('status', 'pendente').lt('data_vencimento', limite.toISOString().split('T')[0])
  let criados = 0
  for (const r of data ?? []) {
    if (await alertExists(tenantId, rule.gatilho, r.id)) continue
    const dias = daysBetween(new Date(r.data_vencimento), hoje)
    await executeAcoes(rule, { ...r, nome: r.beneficiario_nome, dias_vencido: dias }, {
      titulo: `Pagamento vencido · ${r.beneficiario_nome}`,
      entidade_tipo: 'pagamento', link: '/pagamentos',
      prioridade: dias > 7 ? 'alta' : 'media',
    })
    criados++
  }
  return criados
}

async function processContratosVencendo(tenantId: string, rule: Rule) {
  const hoje = new Date()
  const diasAviso = Number(rule.dias_aviso) || 30
  const limite = new Date(hoje.getTime() + diasAviso * 86400000)
  const { data } = await db.from('contracts').select('id, status, data_fim, responsavel, responsavel_id, company_id, custom_fields')
    .eq('tenant_id', tenantId).eq('status', 'ativo').not('data_fim', 'is', null)
    .lte('data_fim', limite.toISOString().split('T')[0]).gte('data_fim', hoje.toISOString().split('T')[0])
  let criados = 0
  for (const r of data ?? []) {
    if (await alertExists(tenantId, rule.gatilho, r.id)) continue
    const dias = daysBetween(hoje, new Date(r.data_fim))
    await executeAcoes(rule, { ...r, titulo: `Contrato ${r.id}`, dias_restantes: dias }, {
      titulo: `Contrato vence em ${dias}d`,
      entidade_tipo: 'contrato', link: '/contratos',
      prioridade: dias <= 7 ? 'alta' : 'media',
    })
    criados++
  }
  return criados
}

async function processOportunidadesParadas(tenantId: string, rule: Rule) {
  const hoje = new Date()
  const diasAviso = Number(rule.dias_aviso) || 7
  const limite = new Date(hoje.getTime() - diasAviso * 86400000)
  const { data } = await db.from('oportunidades').select('id, titulo, responsavel, responsavel_id, situacao, updated_at, company_id, custom_fields')
    .eq('tenant_id', tenantId).eq('situacao', 'em_andamento').lt('updated_at', limite.toISOString())
  let criados = 0
  for (const r of data ?? []) {
    if (await alertExists(tenantId, rule.gatilho, r.id)) continue
    const dias = daysBetween(new Date(r.updated_at), hoje)
    await executeAcoes(rule, { ...r, dias_parado: dias }, {
      titulo: `Oportunidade parada · ${r.titulo}`,
      entidade_tipo: 'oportunidade', link: '/pipeline',
      prioridade: dias > 14 ? 'alta' : 'media',
    })
    criados++
  }
  return criados
}

// ─── Processador de regras dinâmicas (via builder de condições) ─────────────

async function processRegraGenerica(tenantId: string, rule: Rule) {
  const cfg = ORIGEM_CONFIG[rule.origem]
  if (!cfg) return 0

  const { data: registros } = await db.from(rule.origem).select(cfg.select).eq('tenant_id', tenantId)
  let criados = 0
  for (const r of registros ?? []) {
    if (!avaliarCondicoes(r as Record<string, unknown>, rule)) continue
    if (await alertExists(tenantId, rule.gatilho, r.id)) continue
    await executeAcoes(rule, r as Record<string, unknown>, {
      titulo: cfg.titulo(r as Record<string, unknown>),
      entidade_tipo: cfg.entidade_tipo,
      link: cfg.link,
      prioridade: cfg.prioridade?.(r as Record<string, unknown>) || 'media',
    })
    criados++
  }
  return criados
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { data: rules } = await db.from('alert_rules').select('*').eq('ativo', true)
    const stats: Record<string, number> = {}

    for (const rule of (rules ?? []) as Rule[]) {
      const tenantId = rule.tenant_id
      let criados = 0

      // Regras legadas por gatilho fixo
      if (rule.gatilho === 'pagamento_vencido')   criados = await processPagamentosVencidos(tenantId, rule)
      else if (rule.gatilho === 'contrato_vencendo')   criados = await processContratosVencendo(tenantId, rule)
      else if (rule.gatilho === 'oportunidade_parada') criados = await processOportunidadesParadas(tenantId, rule)
      // Regras criadas pelo builder dinâmico (têm origem preenchida)
      else if (rule.origem) criados = await processRegraGenerica(tenantId, rule)

      if (criados > 0) stats[rule.gatilho || rule.origem] = (stats[rule.gatilho || rule.origem] || 0) + criados
    }

    return json({ ok: true, alertas_criados: stats })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
