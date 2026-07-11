import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../hooks/useProfile'
import { useBranchContext } from '../../contexts/BranchContext'
import { useCustomFields } from '../../hooks/useCustomFields'
import { FullPageEdit, FPESection } from '../../components/ui'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { Plus, Trash2, GitBranch } from 'lucide-react'

// ─── Origens → tabelas reais ──────────────────────────────────────────────────
const ORIGENS = [
  { key: 'oportunidades',       label: 'Oportunidades', table: 'oportunidades' },
  { key: 'contracts',           label: 'Contratos',     table: 'contracts'     },
  { key: 'projects',            label: 'Projetos',      table: 'projects'      },
  { key: 'tasks',               label: 'Tarefas',       table: 'tasks'         },
  { key: 'commission_payments', label: 'Pagamentos',    table: 'commission_payments' },
  { key: 'companies',           label: 'Empresas',      table: 'companies'     },
  { key: 'goals',               label: 'Metas & KPIs',  table: 'goals'         },
  { key: 'sellers',             label: 'Parceiros',     table: 'sellers'       },
]

// ─── Campos por origem ────────────────────────────────────────────────────────
const CAMPOS_PADRAO = {
  oportunidades: [
    { key: 'updated_at',    label: 'Última atualização',      tipo: 'date'  },
    { key: 'prazo',         label: 'Prazo de fechamento',     tipo: 'date'  },
    { key: 'created_at',    label: 'Data de cadastro',        tipo: 'date'  },
    { key: 'valor',         label: 'Valor total (R$)',        tipo: 'money' },
    { key: 'valor_cdu',     label: 'Valor CDU (R$)',          tipo: 'money' },
    { key: 'valor_sms',     label: 'Valor SMS (R$)',          tipo: 'money' },
    { key: 'valor_servico', label: 'Valor Serviços (R$)',     tipo: 'money' },
    { key: 'valor_desconto',label: 'Desconto (R$)',           tipo: 'money' },
    { key: 'situacao',      label: 'Situação', tipo: 'enum', opts: ['em_andamento','ganha','perdida','em_negociacao'] },
    { key: 'origem',        label: 'Origem',   tipo: 'enum', opts: ['Inbound','Outbound','Canal','Indicação'] },
    { key: 'responsavel',   label: 'Responsável',             tipo: 'text'  },
    { key: 'empresa',       label: 'Empresa',                 tipo: 'text'  },
    { key: 'contato',       label: 'Contato',                 tipo: 'text'  },
    { key: 'funil',         label: 'Funil',                   tipo: 'text'  },
    { key: 'etapa',         label: 'Etapa',                   tipo: 'text'  },
    { key: 'proxima_tarefa_data',    label: 'Data próxima tarefa',      tipo: 'date' },
    { key: 'proxima_tarefa_hora',    label: 'Hora próxima tarefa',      tipo: 'text' },
    { key: 'primeira_conclusao_data',label: 'Data 1ª conclusão tarefa', tipo: 'date' },
    { key: 'primeira_conclusao_hora',label: 'Hora 1ª conclusão tarefa', tipo: 'text' },
    { key: 'proposta_produto',       label: 'Proposta produto',         tipo: 'text' },
    { key: 'proposta_servico',       label: 'Proposta serviço',         tipo: 'text' },
  ],
  contracts: [
    { key: 'data_inicio',    label: 'Início da vigência',  tipo: 'date'  },
    { key: 'data_fim',       label: 'Fim da vigência',     tipo: 'date'  },
    { key: 'data_renovacao', label: 'Data de renovação',   tipo: 'date'  },
    { key: 'created_at',     label: 'Data de cadastro',    tipo: 'date'  },
    { key: 'updated_at',     label: 'Última atualização',  tipo: 'date'  },
    { key: 'valor',          label: 'Valor (R$)',           tipo: 'money' },
    { key: 'status',         label: 'Status', tipo: 'enum', opts: ['ativo','encerrado','cancelado','pendente'] },
    { key: 'responsavel',    label: 'Responsável',          tipo: 'text'  },
    { key: 'numero',         label: 'Número do contrato',   tipo: 'text'  },
    { key: 'tipo',           label: 'Tipo de contrato',     tipo: 'text'  },
  ],
  projects: [
    { key: 'data_inicio', label: 'Data de início',    tipo: 'date' },
    { key: 'data_fim',    label: 'Data de entrega',   tipo: 'date' },
    { key: 'updated_at',  label: 'Última atualização',tipo: 'date' },
    { key: 'created_at',  label: 'Data de cadastro',  tipo: 'date' },
    { key: 'status',      label: 'Status', tipo: 'enum', opts: ['em_andamento','concluido','cancelado','pausado'] },
    { key: 'phase',       label: 'Fase',   tipo: 'enum', opts: ['iniciacao','planejamento','execucao','encerramento'] },
    { key: 'responsavel', label: 'Responsável',        tipo: 'text' },
    { key: 'nome',        label: 'Nome do projeto',    tipo: 'text' },
    { key: 'cliente',     label: 'Cliente',            tipo: 'text' },
  ],
  tasks: [
    { key: 'prazo',       label: 'Prazo',             tipo: 'date' },
    { key: 'data_inicio', label: 'Data de início',    tipo: 'date' },
    { key: 'updated_at',  label: 'Última atualização',tipo: 'date' },
    { key: 'created_at',  label: 'Data de cadastro',  tipo: 'date' },
    { key: 'status',      label: 'Status',    tipo: 'enum', opts: ['pendente','em_andamento','concluida','cancelada'] },
    { key: 'prioridade',  label: 'Prioridade',tipo: 'enum', opts: ['alta','media','baixa'] },
    { key: 'responsavel', label: 'Responsável',tipo: 'text' },
    { key: 'tipo',        label: 'Tipo',       tipo: 'text' },
    { key: 'titulo',      label: 'Título',     tipo: 'text' },
  ],
  commission_payments: [
    { key: 'data_vencimento',    label: 'Data de vencimento',   tipo: 'date'  },
    { key: 'data_pagamento',     label: 'Data de pagamento',    tipo: 'date'  },
    { key: 'created_at',         label: 'Data de criação',      tipo: 'date'  },
    { key: 'valor_comissao',     label: 'Valor da comissão (R$)', tipo: 'money' },
    { key: 'valor_base',         label: 'Valor base (R$)',       tipo: 'money' },
    { key: 'percentual',         label: 'Percentual (%)',        tipo: 'number'},
    { key: 'status',             label: 'Status', tipo: 'enum', opts: ['pendente','pago','cancelado','em_atraso'] },
    { key: 'beneficiario_nome',  label: 'Beneficiário',          tipo: 'text'  },
  ],
  companies: [
    { key: 'updated_at', label: 'Última atualização', tipo: 'date' },
    { key: 'created_at', label: 'Data de cadastro',   tipo: 'date' },
    { key: 'status',     label: 'Status', tipo: 'enum', opts: ['ativo','inativo','prospecto'] },
    { key: 'tipo',       label: 'Tipo',   tipo: 'enum', opts: ['cliente','parceiro','fornecedor','prospect'] },
    { key: 'segmento',   label: 'Segmento',            tipo: 'text' },
    { key: 'responsavel',label: 'Responsável',          tipo: 'text' },
    { key: 'cidade',     label: 'Cidade',               tipo: 'text' },
    { key: 'estado',     label: 'Estado',               tipo: 'text' },
  ],
  goals: [
    { key: 'valor_atual',        label: 'Valor atual (R$)',          tipo: 'money'  },
    { key: 'valor_planejado',    label: 'Valor planejado (R$)',       tipo: 'money'  },
    { key: 'percentual',         label: 'Percentual atingido',        tipo: 'number' },
    { key: 'periodo_percentual', label: 'Período decorrido (%)',      tipo: 'number' },
    { key: 'periodo_mes',        label: 'Mês do período',             tipo: 'number' },
    { key: 'periodo_ano',        label: 'Ano do período',             tipo: 'number' },
    { key: 'status',             label: 'Status',   tipo: 'enum', opts: ['ativa','pausada','encerrada'] },
    { key: 'tipo_meta',          label: 'Tipo de meta', tipo: 'enum', opts: ['valor','quantidade','percentual'] },
    { key: 'tipo_alvo',          label: 'Alvo',    tipo: 'enum', opts: ['vendedor','unidade','categoria','produto'] },
  ],
  sellers: [
    { key: 'created_at',    label: 'Data de cadastro',    tipo: 'date'   },
    { key: 'updated_at',    label: 'Última atualização',  tipo: 'date'   },
    { key: 'data_admissao', label: 'Data de admissão',    tipo: 'date'   },
    { key: 'meta_mensal',   label: 'Meta mensal (R$)',    tipo: 'money'  },
    { key: 'comissao_perc', label: 'Comissão (%)',        tipo: 'number' },
    { key: 'status',        label: 'Status', tipo: 'enum', opts: ['ativo','inativo'] },
    { key: 'nome',          label: 'Nome',                tipo: 'text'   },
    { key: 'email',         label: 'E-mail',              tipo: 'text'   },
    { key: 'cargo',         label: 'Cargo',               tipo: 'text'   },
    { key: 'regiao',        label: 'Região',              tipo: 'text'   },
    { key: 'equipe',        label: 'Equipe',              tipo: 'text'   },
  ],
}

// ─── Operadores ───────────────────────────────────────────────────────────────
const OPS = {
  date:   [
    { key: 'em_branco',  label: 'está em branco (sem data)' },
    { key: 'dias_apos',  label: 'há mais de X dias sem atualização' },
    { key: 'dias_antes', label: 'daqui a menos de X dias' },
    { key: 'antes_de',   label: 'antes de (data fixa)' },
    { key: 'apos_de',    label: 'após (data fixa)' },
  ],
  money:  [
    { key: 'em_branco', label: 'está em branco' },
    { key: 'gt', label: 'maior que' }, { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt', label: 'menor que' }, { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq', label: 'igual a' },
  ],
  number: [
    { key: 'em_branco', label: 'está em branco' },
    { key: 'gt', label: 'maior que' }, { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt', label: 'menor que' }, { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq', label: 'igual a' },
  ],
  enum: [{ key: 'em_branco', label: 'está em branco' }, { key: 'eq', label: 'é' }, { key: 'neq', label: 'não é' }],
  text: [{ key: 'em_branco', label: 'está em branco' }, { key: 'eq', label: 'é igual a' }, { key: 'neq', label: 'não é' }, { key: 'contains', label: 'contém' }],
}

const DEST_TIPOS = [
  { key: 'responsavel_origem', label: 'Responsável pelo registro'   },
  { key: 'lider_equipe',       label: 'Líder da equipe'             },
  { key: 'email_fixo',         label: 'Email fixo (digitar)'        },
  { key: 'usuario_sistema',    label: 'Usuário do sistema'          },
]

// ─── Estilos ──────────────────────────────────────────────────────────────────
const inp = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', width: '100%', boxSizing: 'border-box' }
const sel = { ...inp, cursor: 'pointer' }
const btnSm = (accent) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: accent ? 'var(--accent)' : 'var(--surface2)', color: accent ? '#fff' : 'var(--text)', border: accent ? '1px solid var(--accent)' : '1px solid var(--border)' })
const lbl = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 5 }

function Sel({ value, onChange, children, style = {} }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ ...sel, ...style }}>{children}</select>
}

function cfTipo(type) {
  if (type === 'date')   return 'date'
  if (type === 'number') return 'number'
  if (type === 'select') return 'enum'
  return 'text'
}

function newCond()  { return { id: crypto.randomUUID(), campo: '', operador: '', valor: '', logico: 'E' } }
function newAcao()  { return { id: crypto.randomUUID(), tipo: 'notificar', destinatario_tipo: 'responsavel_origem', email_fixo: '', usuario_id: '', prazo_dias: 3, titulo_tarefa: '', destinatarios_extra: [] } }
function newDestExtra() { return { id: crypto.randomUUID(), tipo: 'responsavel_origem', email_fixo: '', usuario_id: '' } }
function emptyRule(){ return { origem: '', gatilho_nome: '', ativo: true, condicoes: [newCond()], acoes: [newAcao()], acoes_else: [], com_else: false } }

// ─── Engine de avaliação ──────────────────────────────────────────────────────
function avaliarCondicao(registro, cond) {
  const path = cond.campo.startsWith('cf.') ? null : cond.campo.split('.')
  let val = path ? path.reduce((o, k) => o?.[k], registro) : registro?.custom_fields?.[cond.campo.replace('cf.', '')]

  const hoje = Date.now()
  const agora = new Date()
  let v = cond.valor
  if (v === '__mes_atual__') v = String(agora.getMonth() + 1)
  if (v === '__ano_atual__') v = String(agora.getFullYear())

  switch (cond.operador) {
    case 'em_branco': return !val || String(val).trim() === ''
    case 'dias_apos': {
      if (!val) return false
      const diff = (hoje - new Date(val).getTime()) / 86400000
      return diff > Number(v)
    }
    case 'dias_antes': {
      if (!val) return false
      const diff = (new Date(val).getTime() - hoje) / 86400000
      return diff >= 0 && diff < Number(v)
    }
    case 'antes_de': return val ? new Date(val) < new Date(v) : false
    case 'apos_de':  return val ? new Date(val) > new Date(v) : false
    case 'gt':  return Number(val) > Number(v)
    case 'gte': return Number(val) >= Number(v)
    case 'lt':  return Number(val) < Number(v)
    case 'lte': return Number(val) <= Number(v)
    case 'eq':  return String(val ?? '') === String(v)
    case 'neq': return String(val ?? '') !== String(v)
    case 'contains': return String(val ?? '').toLowerCase().includes(String(v).toLowerCase())
    default: return false
  }
}

// Avalia condições com operadores por par (cada condição carrega seu `logico` que une ela com a próxima)
function avaliarRegra(rule, registro) {
  const conds = (rule.condicoes || []).filter(c => c.campo && c.operador)
  if (!conds.length) return false
  if (conds.length === 1) return avaliarCondicao(registro, conds[0])

  // Avalia encadeando: resultado acumula usando o `logico` de cada condição
  let resultado = avaliarCondicao(registro, conds[0])
  for (let i = 1; i < conds.length; i++) {
    const prev = conds[i - 1]
    const cur  = avaliarCondicao(registro, conds[i])
    resultado = (prev.logico === 'OU') ? (resultado || cur) : (resultado && cur)
  }
  return resultado
}

async function resolverUmDestinatario(tipo, emailFixo, usuarioId, registro, tenantId) {
  if (tipo === 'email_fixo') return emailFixo || null

  if (tipo === 'responsavel_origem') {
    const responsavelId = registro.responsavel_id || registro.responsavel || null
    if (!responsavelId) return null
    const { data } = await supabase.from('profiles').select('email').eq('id', responsavelId).single()
    if (data?.email) return data.email
    const { data: d2 } = await supabase.from('profiles').select('email').eq('tenant_id', tenantId).ilike('full_name', `%${responsavelId}%`).single()
    return d2?.email || null
  }

  if (tipo === 'usuario_sistema') {
    if (!usuarioId) return null
    const { data } = await supabase.from('profiles').select('email').eq('id', usuarioId).single()
    return data?.email || null
  }

  if (tipo === 'lider_equipe') {
    const { data } = await supabase.from('profiles').select('email').eq('tenant_id', tenantId).eq('role', 'lider').limit(1)
    return data?.[0]?.email || null
  }

  return null
}

async function resolverTodosDestinatarios(acao, registro, tenantId) {
  const emails = new Set()
  const principal = await resolverUmDestinatario(acao.destinatario_tipo, acao.email_fixo, acao.usuario_id, registro, tenantId)
  if (principal) emails.add(principal)
  for (const de of (acao.destinatarios_extra || [])) {
    const e = await resolverUmDestinatario(de.tipo, de.email_fixo, de.usuario_id, registro, tenantId)
    if (e) emails.add(e)
  }
  return [...emails]
}

async function executarAcoes(acoes, registro, rule, tenantId) {
  for (const acao of acoes) {
    if (acao.tipo === 'email') {
      const emails = await resolverTodosDestinatarios(acao, registro, tenantId)
      const nomeReg = registro.titulo || registro.nome || registro.nome_fantasia || `#${registro.id?.slice(0,8)}`
      const assunto = (acao.assunto || rule.gatilho_nome || 'Alerta Boostly')
        .replace('{titulo}', nomeReg).replace('{entidade}', nomeReg)
      const html = `<p>${(acao.mensagem || `Regra <b>${rule.gatilho_nome}</b> acionada para: ${nomeReg}`).replace('{titulo}', nomeReg).replace('{entidade}', nomeReg)}</p>`
      for (const email of emails) {
        await supabase.functions.invoke('send-email', { body: { to: email, subject: assunto, html } })
      }
    }
  }
}

async function executarEngine(tenantId) {
  if (!tenantId) return
  const { data: rules } = await supabase.from('alert_rules').select('*').eq('tenant_id', tenantId).eq('ativo', true)
  if (!rules?.length) return

  const origemSet = [...new Set(rules.map(r => r.origem))]
  const dados = {}
  for (const origem of origemSet) {
    const origemDef = ORIGENS.find(o => o.key === origem)
    if (!origemDef) continue
    const { data } = await supabase.from(origemDef.table).select('*').eq('tenant_id', tenantId).limit(500)
    let registros = data || []
    if (origem === 'goals') {
      // Agrupa meses por meta lógica (tipo_alvo + alvo_id + tipo_meta)
      const grupos = {}
      for (const g of registros) {
        const key = `${g.tipo_alvo}|${g.alvo_id || ''}|${g.tipo_meta}`
        if (!grupos[key]) grupos[key] = []
        grupos[key].push(g)
      }
      const agora = new Date()
      const anoAtual = agora.getFullYear()
      const mesAtual = agora.getMonth() + 1
      registros = registros.map(g => {
        const key = `${g.tipo_alvo}|${g.alvo_id || ''}|${g.tipo_meta}`
        const grupo = grupos[key]
        const sorted = [...grupo].sort((a, b) => a.periodo_ano !== b.periodo_ano ? a.periodo_ano - b.periodo_ano : a.periodo_mes - b.periodo_mes)
        const primeiro = sorted[0]
        const ultimo   = sorted[sorted.length - 1]
        const totalMeses = (ultimo.periodo_ano - primeiro.periodo_ano) * 12 + (ultimo.periodo_mes - primeiro.periodo_mes)
        const decorridos = (anoAtual - primeiro.periodo_ano) * 12 + (mesAtual - primeiro.periodo_mes)
        const pp = totalMeses <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((decorridos / totalMeses) * 100)))
        return { ...g, periodo_percentual: pp, _goal_key: key }
      })
    }
    dados[origem] = registros
  }

  const { data: existentes } = await supabase.from('alerts').select('rule_id, entidade_id').eq('tenant_id', tenantId).eq('resolvido', false)
  const jaAlertado = new Set((existentes || []).map(a => `${a.rule_id}:${a.entidade_id}`))

  const novos = []
  for (const rule of rules) {
    const cf = rule.custom_fields || {}
    const metasIds = cf.metas_ids || []
    let registros = dados[rule.origem] || []
    if (rule.origem === 'goals' && metasIds.length > 0) {
      registros = registros.filter(g => metasIds.includes(g._goal_key))
    }
    const fullRule = { ...rule, condicoes: cf.condicoes || [], acoes: cf.acoes || [], acoes_else: cf.acoes_else || [], com_else: cf.com_else || false }
    for (const reg of registros) {
      const chave = `${rule.id}:${reg.id}`
      if (jaAlertado.has(chave)) continue
      const passou = avaliarRegra(fullRule, reg)
      if (!passou && !fullRule.com_else) continue

      const nomeReg = reg.titulo || reg.nome_fantasia || reg.razao_social || reg.name || reg.nome || `#${reg.id?.slice(0,8)}`
      const acoesFire = passou ? fullRule.acoes : fullRule.acoes_else

      // Cria notificação no painel para ações do tipo notificar
      const temNotificar = acoesFire.some(a => a.tipo === 'notificar')
      if (passou && temNotificar) {
        novos.push({
          tenant_id:     tenantId,
          rule_id:       rule.id,
          gatilho:       rule.gatilho_nome,
          entidade_tipo: rule.origem,
          entidade_id:   String(reg.id),
          entidade_nome: nomeReg,
          titulo:        rule.gatilho_nome,
          mensagem:      `Regra "${rule.gatilho_nome}" acionada para: ${nomeReg}`,
          prioridade:    'media',
          resolvido:     false,
          created_at:    new Date().toISOString(),
        })
      }

      // Executa ações de email
      await executarAcoes(acoesFire.filter(a => a.tipo === 'email'), reg, fullRule, tenantId)
    }
  }

  if (novos.length) {
    await supabase.from('alerts').insert(novos)
  }
  return novos.length
}

// ─── Selector de usuário do sistema ──────────────────────────────────────────
function UsuarioSelector({ tenantId, value, onChange }) {
  const [usuarios, setUsuarios] = useState([])
  useEffect(() => {
    if (!tenantId) return
    supabase.from('profiles').select('id, full_name, email').eq('tenant_id', tenantId).order('full_name')
      .then(({ data }) => setUsuarios(data || []))
  }, [tenantId])
  return (
    <Sel value={value || ''} onChange={onChange}>
      <option value="">Selecione o usuário…</option>
      {usuarios.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
    </Sel>
  )
}

// ─── Editor de Condições ──────────────────────────────────────────────────────
function CondicoesEditor({ origem, condicoes, onChangeCondicoes }) {
  const [cfDefs] = useCustomFields(origem || 'oportunidades')
  const padrao  = CAMPOS_PADRAO[origem] || []
  const custom  = (cfDefs || []).map(f => ({ key: `cf.${f.key}`, label: `${f.label} ✦`, tipo: cfTipo(f.type), opts: f.options || [] }))
  const campos  = [...padrao, ...custom]

  function update(id, patch) {
    onChangeCondicoes(condicoes.map(c => c.id === id ? { ...c, ...patch, ...(patch.campo ? { operador: '', valor: '' } : {}) } : c))
  }
  function toggleLogico(id) {
    onChangeCondicoes(condicoes.map(c => c.id === id ? { ...c, logico: c.logico === 'E' ? 'OU' : 'E' } : c))
  }
  function add()      { onChangeCondicoes([...condicoes, newCond()]) }
  function remove(id) { onChangeCondicoes(condicoes.filter(c => c.id !== id)) }

  if (!origem) return <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Selecione uma origem primeiro.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {condicoes.map((c, idx) => {
        const campo = campos.find(f => f.key === c.campo)
        const ops   = campo ? (OPS[campo.tipo] || OPS.text) : []
        return (
          <div key={c.id}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
              <Sel value={c.campo} onChange={v => update(c.id, { campo: v })}>
                <option value="">Campo…</option>
                {campos.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </Sel>
              <Sel value={c.operador} onChange={v => update(c.id, { operador: v })}>
                <option value="">Operador…</option>
                {ops.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </Sel>
              {c.operador === 'em_branco'
                ? <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)' }}>— sem valor —</div>
                : campo?.tipo === 'enum'
                  ? <Sel value={c.valor} onChange={v => update(c.id, { valor: v })}>
                      <option value="">Valor…</option>
                      {(campo.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </Sel>
                  : (c.operador === 'dias_apos' || c.operador === 'dias_antes')
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" min={1} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })}
                          style={{ ...inp, width: 70 }} placeholder="0" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>dias</span>
                      </div>
                    : c.campo === 'periodo_mes'
                      ? <Sel value={c.valor} onChange={v => update(c.id, { valor: v })}>
                          <option value="">Valor…</option>
                          <option value="__mes_atual__">Mês atual</option>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={String(m)}>{m}</option>)}
                        </Sel>
                    : c.campo === 'periodo_ano'
                      ? <Sel value={c.valor} onChange={v => update(c.id, { valor: v })}>
                          <option value="">Valor…</option>
                          <option value="__ano_atual__">Ano atual</option>
                          {[new Date().getFullYear()-1, new Date().getFullYear(), new Date().getFullYear()+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                        </Sel>
                    : campo?.tipo === 'money'
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>R$</span>
                          <input type="number" min={0} step={0.01} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp }} placeholder="0,00" />
                        </div>
                      : <input type={campo?.tipo === 'date' ? 'date' : 'text'} value={c.valor}
                          onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp }} placeholder="Valor…" />
              }
              <button onClick={() => remove(c.id)} title="Remover condição"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px 4px', flexShrink: 0 }}>
                <Trash2 size={13} strokeWidth={2} />
              </button>
            </div>
            {/* Separador E/OU entre condições */}
            {idx < condicoes.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <button
                  onClick={() => toggleLogico(c.id)}
                  title="Clique para alternar E / OU"
                  style={{ padding: '2px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
                    background: c.logico === 'OU' ? 'color-mix(in srgb, #f59e0b 15%, transparent)' : 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    color: c.logico === 'OU' ? '#d97706' : 'var(--accent)',
                    border: c.logico === 'OU' ? '1px solid #f59e0b' : '1px solid var(--accent)',
                  }}>
                  {c.logico || 'E'}
                </button>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
            )}
          </div>
        )
      })}
      <button onClick={add} style={{ ...btnSm(false), alignSelf: 'flex-start', marginTop: 8 }}>
        <Plus size={11} strokeWidth={2.5} /> Adicionar condição
      </button>
    </div>
  )
}

// ─── Editor de Ações ──────────────────────────────────────────────────────────
function AcoesEditor({ acoes, onChange, tenantId, label = 'Ação' }) {
  function update(id, patch) { onChange(acoes.map(a => a.id === id ? { ...a, ...patch } : a)) }
  function add()      { onChange([...acoes, newAcao()]) }
  function remove(id) { onChange(acoes.filter(a => a.id !== id)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {acoes.map((a, idx) => (
        <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--surface2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label} {idx + 1}
            </span>
            {acoes.length > 1 && (
              <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                <Trash2 size={13} strokeWidth={2} />
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: (a.tipo !== 'notificar' || a.destinatario_tipo === 'email_fixo' || a.destinatario_tipo === 'usuario_sistema') ? 10 : 0 }}>
            <div>
              <div style={lbl}>Tipo</div>
              <Sel value={a.tipo} onChange={v => update(a.id, { tipo: v })}>
                <option value="notificar">Notificar no painel</option>
                <option value="email">Enviar e-mail</option>
                <option value="tarefa">Criar tarefa</option>
              </Sel>
            </div>
            <div>
              <div style={lbl}>Para quem</div>
              <Sel value={a.destinatario_tipo} onChange={v => update(a.id, { destinatario_tipo: v })}>
                {DEST_TIPOS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </Sel>
            </div>
          </div>
          {a.destinatario_tipo === 'email_fixo' && (
            <div style={{ marginBottom: 10 }}>
              <div style={lbl}>Email</div>
              <input value={a.email_fixo} onChange={e => update(a.id, { email_fixo: e.target.value })}
                placeholder="email@exemplo.com" style={inp} type="email" />
            </div>
          )}
          {a.destinatario_tipo === 'usuario_sistema' && tenantId && (
            <div style={{ marginBottom: 10 }}>
              <div style={lbl}>Usuário</div>
              <UsuarioSelector tenantId={tenantId} value={a.usuario_id} onChange={v => update(a.id, { usuario_id: v })} />
            </div>
          )}

          {/* Destinatários extras */}
          {(a.destinatarios_extra || []).map((de, dei) => {
            const updDe = (patch) => update(a.id, {
              destinatarios_extra: (a.destinatarios_extra || []).map(d => d.id === de.id ? { ...d, ...patch } : d)
            })
            const remDe = () => update(a.id, { destinatarios_extra: (a.destinatarios_extra || []).filter(d => d.id !== de.id) })
            return (
              <div key={de.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Sel value={de.tipo} onChange={v => updDe({ tipo: v })}>
                    {DEST_TIPOS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </Sel>
                  {de.tipo === 'email_fixo' && (
                    <input value={de.email_fixo} onChange={e => updDe({ email_fixo: e.target.value })}
                      placeholder="email@exemplo.com" style={inp} type="email" />
                  )}
                  {de.tipo === 'usuario_sistema' && tenantId && (
                    <UsuarioSelector tenantId={tenantId} value={de.usuario_id} onChange={v => updDe({ usuario_id: v })} />
                  )}
                </div>
                <button onClick={remDe} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '7px 4px' }}>
                  <Trash2 size={13} strokeWidth={2}/>
                </button>
              </div>
            )
          })}
          <button onClick={() => update(a.id, { destinatarios_extra: [...(a.destinatarios_extra || []), newDestExtra()] })}
            style={{ ...btnSm(false), fontSize: 11, marginBottom: 8 }}>
            + Adicionar destinatário
          </button>

          {a.tipo === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div>
                <div style={lbl}>Assunto</div>
                <input value={a.assunto || ''} onChange={e => update(a.id, { assunto: e.target.value })}
                  style={inp} placeholder="Ex: Alerta: contrato vencendo" />
              </div>
              <div>
                <div style={lbl}>Mensagem</div>
                <textarea value={a.mensagem || ''} onChange={e => update(a.id, { mensagem: e.target.value })}
                  style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                  placeholder="Corpo do e-mail. Você pode usar {titulo}, {entidade}." />
              </div>
            </div>
          )}
          {a.tipo === 'tarefa' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
              <div>
                <div style={lbl}>Título da tarefa</div>
                <input value={a.titulo_tarefa} onChange={e => update(a.id, { titulo_tarefa: e.target.value })}
                  style={inp} placeholder="Ex: Ligar para cliente" />
              </div>
              <div>
                <div style={lbl}>Prazo (dias)</div>
                <input type="number" min={1} max={90} value={a.prazo_dias}
                  onChange={e => update(a.id, { prazo_dias: Number(e.target.value) })} style={{ ...inp, width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      ))}
      <button onClick={add} style={{ ...btnSm(false), alignSelf: 'flex-start' }}>
        <Plus size={11} strokeWidth={2.5} /> Adicionar ação
      </button>
    </div>
  )
}

// ─── Serialização ─────────────────────────────────────────────────────────────
function rowToRule(r) {
  const cf = r.custom_fields || {}
  return {
    id:          r.id,
    gatilho_nome:r.gatilho_nome || r.gatilho || '',
    origem:      r.origem || '',
    ativo:       r.ativo,
    condicoes:   cf.condicoes   || [newCond()],
    acoes:       cf.acoes       || [newAcao()],
    acoes_else:  cf.acoes_else  || [],
    com_else:    cf.com_else    || false,
    metas_ids:   cf.metas_ids   || [],
  }
}

function ruleToRow(f, tenantId, branchId) {
  return {
    tenant_id:    tenantId,
    branch_id:    branchId || null,
    gatilho:      f.gatilho_nome,
    gatilho_nome: f.gatilho_nome,
    origem:       f.origem,
    ativo:        f.ativo,
    dias_aviso:   1,
    modo:         'notificar',
    destinatarios: [],
    custom_fields: {
      condicoes:  f.condicoes,
      acoes:      f.acoes,
      acoes_else: f.acoes_else || [],
      com_else:   f.com_else   || false,
      metas_ids:  f.metas_ids  || [],
    },
    updated_at: new Date().toISOString(),
  }
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsAlertas() {
  const { profile }            = useProfile()
  const { activeBranchId }     = useBranchContext()
  const [rules, setRules]      = useState([])
  const [loading, setLoading]  = useState(true)
  const [editing, setEditing]  = useState(null)
  const [search, setSearch]    = useState('')
  const [saving, setSaving]    = useState(false)
  const [running, setRunning]  = useState(false)
  const [lastRun, setLastRun]  = useState(null)
  const [goalsAtivas, setGoalsAtivas]   = useState([])
  const [goalSearch, setGoalSearch]     = useState('')
  const [goalDropOpen, setGoalDropOpen] = useState(false)
  const engineRef = useRef(false)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    let q = supabase.from('alert_rules').select('*').eq('tenant_id', tenantId).order('created_at')
    if (activeBranchId) q = q.eq('branch_id', activeBranchId)
    const { data } = await q
    setRules((data || []).map(rowToRule))
    setLoading(false)
  }, [tenantId, activeBranchId])

  useEffect(() => { if (tenantId) load(); else setLoading(false) }, [load, tenantId])

  useEffect(() => {
    if (!tenantId) return
    supabase.from('goals').select('id, alvo_nome, tipo_alvo, alvo_id, tipo_meta, periodo_mes, periodo_ano, status').order('periodo_ano', { ascending: false }).order('periodo_mes', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('[Alertas] goals fetch:', error); return }
        const ativas = (data || []).filter(g => g.status === 'ativa' || g.status === 'pausada' || !g.status)
        // Agrupa por meta lógica (tipo_alvo + alvo_id + tipo_meta)
        const grupos = {}
        for (const g of ativas) {
          const key = `${g.tipo_alvo}|${g.alvo_id || ''}|${g.tipo_meta}`
          if (!grupos[key]) {
            const sorted = ativas.filter(x => `${x.tipo_alvo}|${x.alvo_id || ''}|${x.tipo_meta}` === key)
              .sort((a, b) => a.periodo_ano !== b.periodo_ano ? a.periodo_ano - b.periodo_ano : a.periodo_mes - b.periodo_mes)
            const primeiro = sorted[0]
            const ultimo   = sorted[sorted.length - 1]
            grupos[key] = {
              key,
              titulo: `${g.alvo_nome || g.tipo_alvo} — ${g.tipo_meta}`,
              subtitulo: primeiro === ultimo
                ? `${primeiro.periodo_mes}/${primeiro.periodo_ano}`
                : `${primeiro.periodo_mes}/${primeiro.periodo_ano} → ${ultimo.periodo_mes}/${ultimo.periodo_ano}`,
              tipo_alvo: g.tipo_alvo,
            }
          }
        }
        setGoalsAtivas(Object.values(grupos))
      })
  }, [tenantId])

  useEffect(() => {
    if (!tenantId || engineRef.current) return
    engineRef.current = true
    const run = async () => {
      setRunning(true)
      await executarEngine(tenantId)
      setLastRun(new Date())
      setRunning(false)
    }
    run()
    const interval = setInterval(run, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tenantId])

  async function runNow() {
    setRunning(true)
    const n = await executarEngine(tenantId)
    setLastRun(new Date())
    setRunning(false)
    if (n === 0) alert('Nenhum alerta novo gerado.')
    else alert(`${n} alerta(s) gerado(s) com sucesso!`)
  }

  async function handleSave(form) {
    setSaving(true)
    const row = ruleToRow(form, tenantId, activeBranchId)
    if (form.id) {
      const { error } = await supabase.from('alert_rules').update(row).eq('id', form.id)
      if (error) { alert('Erro: ' + error.message); setSaving(false); return }
      setRules(prev => prev.map(r => r.id === form.id ? { ...form } : r))
    } else {
      const { data, error } = await supabase.from('alert_rules').insert(row).select().single()
      if (error) { alert('Erro: ' + error.message); setSaving(false); return }
      setRules(prev => [...prev, rowToRule(data)])
    }
    setSaving(false)
    setEditing(null)
  }

  async function handleRemove(id) {
    if (!window.confirm('Excluir esta regra?')) return
    await supabase.from('alert_rules').delete().eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  async function toggleAtivo(rule) {
    await supabase.from('alert_rules').update({ ativo: !rule.ativo }).eq('id', rule.id)
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, ativo: !r.ativo } : r))
  }

  const origemMap = Object.fromEntries(ORIGENS.map(o => [o.key, o.label]))

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rules.filter(r => !q || r.gatilho_nome.toLowerCase().includes(q) || (origemMap[r.origem] || '').toLowerCase().includes(q))
  }, [rules, search, origemMap])

  // ── Tela de edição ──────────────────────────────────────────────────────────
  if (editing) {
    const isNew = !editing.id
    const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 22px' }
    const secTitle = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 14 }

    function doSave() {
      if (!editing.origem)               return alert('Selecione a origem.')
      if (!editing.gatilho_nome?.trim()) return alert('Informe um nome para a regra.')
      if (!editing.acoes?.length)        return alert('Adicione pelo menos uma ação.')
      handleSave(editing)
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              {[
                { label: 'Configurações' },
                { label: 'Alertas', onClick: () => setEditing(null) },
                { label: isNew ? 'Nova regra' : editing.gatilho_nome },
              ].map((crumb, i, arr) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <span style={{ color: 'var(--border2)', fontSize: 12 }}>›</span>}
                  {crumb.onClick
                    ? <button onClick={crumb.onClick} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>{crumb.label}</button>
                    : <span style={{ fontSize: 12, color: i === arr.length - 1 ? 'var(--text)' : 'var(--text-muted)', fontWeight: i === arr.length - 1 ? 500 : 400 }}>{crumb.label}</span>
                  }
                </span>
              ))}
            </nav>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.2px' }}>
              {isNew ? 'Nova regra de alerta' : editing.gatilho_nome}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editing.id && (
              <button onClick={() => { handleRemove(editing.id); setEditing(null) }}
                style={{ ...btnSm(false), color: 'var(--red, #ef4444)', borderColor: 'var(--red, #ef4444)' }}>
                <Trash2 size={12} strokeWidth={2}/> Excluir
              </button>
            )}
            <button onClick={() => setEditing(null)} style={btnSm(false)}>Cancelar</button>
            <button onClick={doSave} disabled={saving}
              style={{ ...btnSm(true), opacity: saving ? 0.7 : 1, minWidth: 110 }}>
              {saving ? 'Salvando…' : 'Salvar regra'}
            </button>
          </div>
        </div>

        {/* Body — largura total, empilhado */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Identidade */}
          <div style={card}>
            <div style={secTitle}>Identidade</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={lbl}>Nome da regra</div>
                <input value={editing.gatilho_nome}
                  onChange={e => setEditing(f => ({ ...f, gatilho_nome: e.target.value }))}
                  style={inp} placeholder="Ex: Contrato vencendo em 30 dias" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', paddingTop: 18 }}>
                <input type="checkbox" checked={editing.ativo}
                  onChange={e => setEditing(f => ({ ...f, ativo: e.target.checked }))} />
                Regra ativa
              </label>
            </div>
          </div>

          {/* Origem */}
          <div style={card}>
            <div style={secTitle}>Origem dos dados</div>
            <Sel value={editing.origem} onChange={v => setEditing(f => ({ ...f, origem: v, condicoes: [newCond()], metas_ids: [] }))}>
              <option value="">Selecione a entidade…</option>
              {ORIGENS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </Sel>
            {editing.origem === 'goals' && (() => {
              const selecionadas = editing.metas_ids || []
              const filtradas = goalsAtivas.filter(g => g.titulo?.toLowerCase().includes(goalSearch.toLowerCase()))
              const toggle = key => setEditing(f => {
                const cur = f.metas_ids || []
                return { ...f, metas_ids: cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key] }
              })
              return (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Aplicar a metas específicas
                  </div>
                  {selecionadas.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                      {selecionadas.map(key => {
                        const g = goalsAtivas.find(x => x.key === key)
                        return g ? (
                          <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent)', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
                            {g.titulo}
                            <button onClick={() => toggle(key)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 12 }}>×</button>
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                  <input
                    value={goalSearch} onChange={e => setGoalSearch(e.target.value)}
                    onFocus={() => setGoalDropOpen(true)}
                    onBlur={() => setTimeout(() => setGoalDropOpen(false), 150)}
                    placeholder={selecionadas.length === 0 ? 'Todas as metas ativas (buscar para filtrar)…' : 'Buscar meta…'}
                    style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 4 }}
                  />
                  {(goalDropOpen || goalSearch) && (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', maxHeight: 180, overflowY: 'auto' }}>
                      {filtradas.length === 0
                        ? <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma meta encontrada</div>
                        : filtradas.map(g => (
                          <label key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                            <input type="checkbox" checked={selecionadas.includes(g.key)} onChange={() => toggle(g.key)} style={{ accentColor: 'var(--accent)' }} />
                            <span>
                              {g.titulo}
                              <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>{g.subtitulo}</span>
                            </span>
                          </label>
                        ))
                      }
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    {selecionadas.length === 0 ? 'Sem filtro: avalia todas as metas ativas.' : `${selecionadas.length} meta(s) selecionada(s).`}
                  </p>
                </div>
              )
            })()}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
              A engine avalia todos os registros desta entidade e dispara o alerta quando as condições forem atendidas.
            </p>
          </div>

          {/* Condições */}
          <div style={card}>
            <div style={secTitle}>Condições</div>
            <CondicoesEditor
              origem={editing.origem}
              condicoes={editing.condicoes}
              onChangeCondicoes={v => setEditing(f => ({ ...f, condicoes: v }))}
            />
          </div>

          {/* Ações SE */}
          <div style={card}>
            <div style={secTitle}>Ações — SE condições atendidas</div>
            <AcoesEditor
              acoes={editing.acoes}
              onChange={v => setEditing(f => ({ ...f, acoes: v }))}
              tenantId={tenantId}
            />
          </div>

          {/* Ramificação SENÃO */}
          <div style={{ ...card, borderStyle: 'dashed', borderColor: editing.com_else ? 'color-mix(in srgb, #f59e0b 60%, var(--border))' : 'var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={editing.com_else || false}
                onChange={e => setEditing(f => ({
                  ...f,
                  com_else:   e.target.checked,
                  acoes_else: e.target.checked && !f.acoes_else?.length ? [newAcao()] : f.acoes_else || [],
                }))} />
              <GitBranch size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              <span>Ramificação <strong>SENÃO</strong> — ações quando as condições <strong>não</strong> forem atendidas</span>
            </label>
            {editing.com_else && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid color-mix(in srgb, #f59e0b 30%, var(--border))' }}>
                <AcoesEditor
                  acoes={editing.acoes_else || []}
                  onChange={v => setEditing(f => ({ ...f, acoes_else: v }))}
                  tenantId={tenantId}
                  label="Ação SENÃO"
                />
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  // ── Listagem ────────────────────────────────────────────────────────────────
  const COLS = [
    { key: 'gatilho_nome', label: 'Nome',     render: (_, r) => <span style={{ fontWeight: 600, fontSize: 13 }}>{r.gatilho_nome}</span> },
    { key: 'origem',       label: 'Origem',   render: (_, r) => origemMap[r.origem] || r.origem },
    { key: 'condicoes',    label: 'Condições',render: (_, r) => {
      const n = (r.condicoes || []).filter(c => c.campo).length
      return `${n} condição(ões)`
    }},
    { key: 'acoes', label: 'Ações', render: (_, r) => {
      const tipos = { notificar: 'Painel', tarefa: 'Tarefa', email: 'Email' }
      const se    = (r.acoes || []).map(a => tipos[a.tipo] || a.tipo).join(' + ')
      const senao = r.com_else && r.acoes_else?.length ? ` / SE NÃO: ${(r.acoes_else || []).map(a => tipos[a.tipo] || a.tipo).join(' + ')}` : ''
      return se + senao
    }},
    { key: 'ativo', label: 'Status', render: (_, r) => (
      <button onClick={e => { e.stopPropagation(); toggleAtivo(r) }}
        style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
          background: r.ativo ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--surface2)',
          color: r.ativo ? 'var(--accent)' : 'var(--text-muted)' }}>
        {r.ativo ? 'Ativa' : 'Inativa'}
      </button>
    )},
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: running ? 'var(--accent)' : '#22c55e', flexShrink: 0, display: 'inline-block' }} />
        <span>
          {running ? 'Avaliando regras…' : lastRun ? `Engine rodou às ${lastRun.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Engine aguardando…'}
        </span>
        <button onClick={runNow} disabled={running} style={{ ...btnSm(false), padding: '2px 10px', fontSize: 10, marginLeft: 4 }}>
          {running ? 'Rodando…' : 'Rodar agora'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <SettingsLayout
          title="Alertas"
          description="Regras automáticas que geram notificações no painel, enviam e-mails ou criam tarefas."
          columns={COLS} data={filtered} keyField="id"
          loading={loading} search={search} onSearchChange={setSearch}
          newLabel="Nova regra" onNew={() => setEditing(emptyRule())}
          emptyLabel="Nenhuma regra de alerta configurada."
          onRowClick={r => setEditing(r)}
          rowActions={[
            { label: 'Editar',  onClick: r => setEditing(r) },
            { label: 'Excluir', danger: true, onClick: r => handleRemove(r.id) },
          ]}
        />
      </div>
    </div>
  )
}
