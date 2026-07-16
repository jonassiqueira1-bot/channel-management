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
type DestinatarioTipo = 'responsavel_origem' | 'responsavel_tarefa' | 'contato_empresa' | 'email_fixo' | 'usuario_sistema' | 'lider_equipe' | 'papel'
interface Destinatario {
  tipo: DestinatarioTipo
  email_fixo?: string
  usuario_id?: string
  papel?: string
}
interface Acao {
  tipo: 'notificar' | 'email' | 'tarefa'
  destinatario_tipo: DestinatarioTipo
  email_fixo?: string
  usuario_id?: string
  papel?: string
  destinatarios_extra?: Destinatario[]
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
  tenant_id: string; rule_id?: string; gatilho: string; usuario_id?: string | null
  titulo: string; mensagem?: string; entidade_tipo?: string
  entidade_id?: string; entidade_nome?: string; link?: string; prioridade?: string
}) {
  await db.from('alerts').insert({
    tenant_id: payload.tenant_id, rule_id: payload.rule_id ?? null,
    usuario_id: payload.usuario_id ?? null,
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

// ─── Resolve destinatário(s) — email + profiles.id ──────────────────────────
// resolveOne cobre os tipos "de um só" (inclusive 'papel' fica de fora, ele é
// tratado em resolveDestinatarios porque pode casar vários usuários de uma vez).

async function resolveOne(
  destTipo: DestinatarioTipo,
  emailFixo: string | undefined,
  usuarioId: string | undefined,
  registro: Record<string, unknown>,
  tenantId: string,
): Promise<{ id: string | null; email: string | null }> {
  if (destTipo === 'email_fixo') return { id: null, email: emailFixo || null }

  if (destTipo === 'usuario_sistema') {
    if (!usuarioId) return { id: null, email: null }
    const { data } = await db.from('profiles').select('id, email').eq('id', usuarioId).single()
    return { id: data?.id || null, email: data?.email || null }
  }

  if (destTipo === 'responsavel_origem') {
    const responsavelId = registro.responsavel_id as string | undefined
    if (responsavelId) {
      const { data } = await db.from('profiles').select('id, email').eq('id', responsavelId).single()
      if (data) return { id: data.id, email: data.email }
    }
    const responsavel = registro.responsavel as string | undefined
    if (responsavel) {
      const { data } = await db.from('profiles').select('id, email').eq('nome', responsavel).eq('tenant_id', tenantId).limit(1).single()
      if (data) return { id: data.id, email: data.email }
    }
    return { id: null, email: null }
  }

  if (destTipo === 'lider_equipe') {
    // Encontra a equipe onde o responsável do registro é membro e retorna o líder
    const responsavelId = (registro.responsavel_id as string) || null
    if (responsavelId) {
      const { data: equipes } = await db.from('equipes')
        .select('lider_id')
        .eq('tenant_id', tenantId)
        .contains('membro_ids', JSON.stringify([responsavelId]))
        .limit(1)
      const liderId = equipes?.[0]?.lider_id as string | undefined
      if (liderId) {
        const { data } = await db.from('profiles').select('id, email').eq('id', liderId).single()
        if (data) return { id: data.id, email: data.email }
      }
    }
    // fallback: qualquer líder do tenant
    const { data: equipe } = await db.from('equipes')
      .select('lider_id')
      .eq('tenant_id', tenantId)
      .not('lider_id', 'is', null)
      .limit(1)
      .maybeSingle()
    if (equipe?.lider_id) {
      const { data } = await db.from('profiles').select('id, email').eq('id', equipe.lider_id as string).single()
      if (data) return { id: data.id, email: data.email }
    }
    return { id: null, email: null }
  }

  if (destTipo === 'responsavel_tarefa') {
    const { data: task } = await db.from('tasks').select('custom_fields')
      .eq('entidade_id', String(registro.id)).order('created_at', { ascending: false }).limit(1).single()
    const responsavelId = (task?.custom_fields as Record<string, unknown>)?.responsavel_id as string | undefined
    if (responsavelId) {
      const { data } = await db.from('profiles').select('id, email').eq('id', responsavelId).single()
      if (data) return { id: data.id, email: data.email }
    }
    return { id: null, email: null }
  }

  if (destTipo === 'contato_empresa') {
    const companyId = registro.company_id as string | undefined
    if (companyId) {
      const { data } = await db.from('contacts').select('email').eq('company_id', companyId).eq('is_primary', true).limit(1).single()
      return { id: null, email: data?.email || null }
    }
    return { id: null, email: null }
  }

  return { id: null, email: null }
}

// Resolve o destinatário principal + todos os destinatarios_extra de uma ação,
// incluindo 'papel' (que pode casar vários usuários do tenant de uma vez).
async function resolveDestinatarios(
  acao: Acao,
  registro: Record<string, unknown>,
  tenantId: string,
): Promise<{ ids: string[]; emails: string[] }> {
  const ids = new Set<string>()
  const emails = new Set<string>()

  async function add(destTipo: DestinatarioTipo, emailFixo?: string, usuarioId?: string, papel?: string) {
    if (destTipo === 'papel') {
      if (!papel) return
      const { data } = await db.from('profiles').select('id, email').eq('tenant_id', tenantId).eq('papel', papel)
      for (const p of data ?? []) {
        if (p.id) ids.add(p.id as string)
        if (p.email) emails.add(p.email as string)
      }
      return
    }
    const r = await resolveOne(destTipo, emailFixo, usuarioId, registro, tenantId)
    if (r.id) ids.add(r.id)
    if (r.email) emails.add(r.email)
  }

  await add(acao.destinatario_tipo, acao.email_fixo, acao.usuario_id, acao.papel)
  for (const extra of acao.destinatarios_extra || []) {
    await add(extra.tipo, extra.email_fixo, extra.usuario_id, extra.papel)
  }

  return { ids: [...ids], emails: [...emails] }
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
      const { ids } = await resolveDestinatarios(acao, registro, rule.tenant_id)
      const base = {
        tenant_id: rule.tenant_id, rule_id: rule.id,
        gatilho: rule.gatilho,
        titulo: contexto.titulo,
        entidade_tipo: contexto.entidade_tipo,
        entidade_id: String(registro.id),
        entidade_nome: String(registro.nome || registro.titulo || registro.id || ''),
        link: contexto.link,
        prioridade: contexto.prioridade || 'media',
      }
      if (ids.length > 0) {
        for (const usuario_id of ids) await createAlert({ ...base, usuario_id })
      } else {
        await createAlert(base) // destinatário não resolvido — mantém tenant-wide
      }
    }

    if (acao.tipo === 'email') {
      const { emails } = await resolveDestinatarios(acao, registro, rule.tenant_id)
      for (const to of emails) {
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
      const { ids } = await resolveDestinatarios(acao, registro, rule.tenant_id)
      const responsavelId = ids[0] || null

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
    select: 'id, titulo, responsavel, responsavel_id, situacao, valor, valor_sms, valor_cdu, valor_servico, valor_desconto, updated_at, prazo, company_id, custom_fields',
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
  goals: {
    select: 'id, alvo_nome, tipo_meta, tipo_alvo, status, valor_planejado, valor_atual, periodo_mes, periodo_ano, custom_fields',
    entidade_tipo: 'meta', link: '/metas',
    titulo: r => `Meta · ${r.alvo_nome || r.tipo_alvo} (${r.periodo_mes}/${r.periodo_ano})`,
    prioridade: r => Number(r.valor_atual) < Number(r.valor_planejado) * 0.5 ? 'alta' : 'media',
  },
  // As entradas abaixo cobrem chaves de origem que a tela de Configuração
  // (src/pages/settings/Alertas.js → ORIGENS) realmente envia — 'tarefas' e
  // 'projetos' acima nunca batem com o que a UI grava ('tasks'/'projects'),
  // então as regras dessas origens nunca eram avaliadas pelo CRON.
  tasks: {
    select: '*',
    entidade_tipo: 'tarefa', link: '/tarefas',
    titulo: r => `Tarefa · ${r.titulo}`,
  },
  projects: {
    select: '*',
    entidade_tipo: 'projeto', link: '/projetos',
    titulo: r => `Projeto · ${r.titulo || r.nome}`,
  },
  actions: {
    select: '*',
    entidade_tipo: 'acao', link: '/acoes',
    titulo: r => `Ação · ${r.titulo}`,
  },
  payments: {
    select: '*',
    entidade_tipo: 'pagamento', link: '/pagamentos',
    titulo: r => `Pagamento · ${r.company_nome || r.id}`,
  },
  sellers: {
    select: '*',
    entidade_tipo: 'parceiro', link: '/vendedores',
    titulo: r => `Contato Canal · ${r.nome}`,
  },
  contacts: {
    select: '*',
    entidade_tipo: 'contato', link: '/contatos',
    titulo: r => `Contato · ${r.nome}`,
  },
  provisoes: {
    select: '*',
    entidade_tipo: 'provisao', link: '/pagamentos',
    titulo: r => `Provisão · ${r.company_nome || r.id}`,
  },
  customer_health: {
    select: '*',
    entidade_tipo: 'customer_success', link: '/customer-success',
    titulo: r => `Sucesso do Cliente · ${r.company_name || r.id}`,
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

// Ações não guardam custos_aguardando/aprovados/etc. como coluna — são
// contagens calculadas a partir de custom_fields.custos. A tela de
// Configuração de Alertas (Alertas.js) já fazia esse cálculo pra preview,
// mas só no cliente; o CRON de verdade (esta função) buscava a linha crua
// via select('*') sem enriquecer, então a condição da regra padrão
// "Ações aprovação de custos" nunca encontrava o campo e nunca disparava.
function enriquecerAction(r: Record<string, unknown>): Record<string, unknown> {
  const cf = (r.custom_fields as Record<string, unknown>) || {}
  const custos = (cf.custos as Array<Record<string, unknown>>) || []
  const ultimoStatus = (c: Record<string, unknown>) => {
    const aprovs = (c.aprovacoes as Array<Record<string, unknown>>) || []
    if (!aprovs.length) return 'pendente'
    return aprovs[aprovs.length - 1].status || 'pendente'
  }
  const custosRealizadoTotal = custos.filter(c => c.executado).reduce((s, c) => s + (Number(c.valor_realizado) || 0), 0)
  return {
    ...r,
    custo_previsto:    Number(cf.custo_previsto) || 0,
    custo_realizado:   custosRealizadoTotal,
    n_custos:          custos.length,
    custos_aguardando: custos.filter(c => ultimoStatus(c) === 'aguardando').length,
    custos_aprovados:  custos.filter(c => ultimoStatus(c) === 'aprovado').length,
    custos_rejeitados: custos.filter(c => ultimoStatus(c) === 'rejeitado').length,
    custos_executados: custos.filter(c => c.executado).length,
    n_documentos:      ((cf.documento_ids as Array<unknown>) || []).length,
    n_anexos:          ((cf.anexos as Array<unknown>) || []).length,
  }
}

async function processRegraGenerica(tenantId: string, rule: Rule) {
  const cfg = ORIGEM_CONFIG[rule.origem]
  if (!cfg) return 0

  const { data: registrosRaw } = await db.from(rule.origem).select(cfg.select).eq('tenant_id', tenantId)
  const registros = rule.origem === 'actions'
    ? (registrosRaw ?? []).map(r => enriquecerAction(r as Record<string, unknown>))
    : (registrosRaw ?? [])
  let criados = 0
  for (const r of registros) {
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
