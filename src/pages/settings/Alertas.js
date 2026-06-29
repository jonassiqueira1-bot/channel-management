import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../hooks/useProfile'
import { useCustomFields } from '../../hooks/useCustomFields'
import { FullPageEdit, FPESection } from '../../components/ui'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { Plus, Trash2 } from 'lucide-react'

// ─── Origens → tabelas reais ──────────────────────────────────────────────────
const ORIGENS = [
  { key: 'oportunidades',       label: 'Oportunidades', table: 'oportunidades' },
  { key: 'contracts',           label: 'Contratos',     table: 'contracts'     },
  { key: 'projects',            label: 'Projetos',      table: 'projects'      },
  { key: 'tasks',               label: 'Tarefas',       table: 'tasks'         },
  { key: 'commission_payments', label: 'Pagamentos',    table: 'commission_payments' },
  { key: 'companies',           label: 'Empresas',      table: 'companies'     },
  { key: 'goals',               label: 'Metas & KPIs',  table: 'goals'         },
]

// ─── Campos por origem ────────────────────────────────────────────────────────
const CAMPOS_PADRAO = {
  oportunidades: [
    { key: 'updated_at',  label: 'Última atualização',     tipo: 'date'  },
    { key: 'prazo',       label: 'Prazo de fechamento',    tipo: 'date'  },
    { key: 'valor',       label: 'Valor total (R$)',        tipo: 'money' },
    { key: 'valor_cdu',   label: 'Valor CDU (R$)',          tipo: 'money' },
    { key: 'valor_sms',   label: 'Valor SMS (R$)',          tipo: 'money' },
    { key: 'valor_servico',label: 'Valor Serviços (R$)',   tipo: 'money' },
    { key: 'valor_desconto',label: 'Desconto (R$)',        tipo: 'money' },
    { key: 'situacao',    label: 'Situação', tipo: 'enum', opts: ['em_andamento','ganha','perdida','em_negociacao'] },
    { key: 'origem',      label: 'Origem',   tipo: 'enum', opts: ['Inbound','Outbound','Canal','Indicação'] },
    { key: 'responsavel', label: 'Responsável',             tipo: 'text'  },
  ],
  contracts: [
    { key: 'data_inicio',     label: 'Início da vigência',  tipo: 'date'  },
    { key: 'data_fim',        label: 'Fim da vigência',     tipo: 'date'  },
    { key: 'data_renovacao',  label: 'Data de renovação',   tipo: 'date'  },
    { key: 'valor',           label: 'Valor (R$)',           tipo: 'money' },
    { key: 'status',          label: 'Status', tipo: 'enum', opts: ['ativo','encerrado','cancelado','pendente'] },
    { key: 'responsavel',     label: 'Responsável',          tipo: 'text'  },
    { key: 'numero',          label: 'Número do contrato',   tipo: 'text'  },
  ],
  projects: [
    { key: 'data_inicio',  label: 'Data de início',   tipo: 'date' },
    { key: 'data_fim',     label: 'Data de entrega',  tipo: 'date' },
    { key: 'updated_at',   label: 'Última atualização',tipo: 'date' },
    { key: 'status',       label: 'Status', tipo: 'enum', opts: ['em_andamento','concluido','cancelado','pausado'] },
    { key: 'phase',        label: 'Fase',   tipo: 'enum', opts: ['iniciacao','planejamento','execucao','encerramento'] },
    { key: 'responsavel',  label: 'Responsável',       tipo: 'text' },
  ],
  tasks: [
    { key: 'prazo',        label: 'Prazo',            tipo: 'date' },
    { key: 'data_inicio',  label: 'Data de início',   tipo: 'date' },
    { key: 'updated_at',   label: 'Última atualização',tipo: 'date' },
    { key: 'status',       label: 'Status',   tipo: 'enum', opts: ['pendente','em_andamento','concluida','cancelada'] },
    { key: 'prioridade',   label: 'Prioridade', tipo: 'enum', opts: ['alta','media','baixa'] },
    { key: 'responsavel',  label: 'Responsável', tipo: 'text' },
    { key: 'tipo',         label: 'Tipo',        tipo: 'text' },
  ],
  commission_payments: [
    { key: 'data_vencimento',   label: 'Data de vencimento', tipo: 'date'  },
    { key: 'data_pagamento',    label: 'Data de pagamento',  tipo: 'date'  },
    { key: 'valor_comissao',    label: 'Valor da comissão (R$)', tipo: 'money' },
    { key: 'status',            label: 'Status', tipo: 'enum', opts: ['pendente','pago','cancelado','em_atraso'] },
    { key: 'beneficiario_nome', label: 'Beneficiário',       tipo: 'text'  },
  ],
  companies: [
    { key: 'updated_at',      label: 'Última atualização', tipo: 'date' },
    { key: 'created_at',      label: 'Data de cadastro',   tipo: 'date' },
    { key: 'status',          label: 'Status', tipo: 'enum', opts: ['ativo','inativo','prospecto'] },
    { key: 'segmento',        label: 'Segmento',            tipo: 'text' },
    { key: 'responsavel',     label: 'Responsável',         tipo: 'text' },
  ],
  goals: [
    { key: 'valor_atual',     label: 'Valor atual (R$)',    tipo: 'money'  },
    { key: 'valor_planejado', label: 'Valor planejado (R$)',tipo: 'money'  },
    { key: 'percentual',      label: 'Percentual atingido', tipo: 'number' },
    { key: 'periodo_mes',     label: 'Mês do período',      tipo: 'number' },
    { key: 'periodo_ano',     label: 'Ano do período',      tipo: 'number' },
    { key: 'status',          label: 'Status', tipo: 'enum', opts: ['ativa','pausada','encerrada'] },
    { key: 'tipo_meta',       label: 'Tipo de meta', tipo: 'enum', opts: ['valor','quantidade','percentual'] },
    { key: 'tipo_alvo',       label: 'Alvo',         tipo: 'enum', opts: ['vendedor','unidade','categoria','produto'] },
  ],
}

// ─── Operadores ───────────────────────────────────────────────────────────────
const OPS = {
  date:   [
    { key: 'dias_apos',  label: 'há mais de X dias sem atualização' },
    { key: 'dias_antes', label: 'daqui a menos de X dias' },
    { key: 'antes_de',   label: 'antes de (data fixa)' },
    { key: 'apos_de',    label: 'após (data fixa)' },
  ],
  money:  [
    { key: 'gt', label: 'maior que' }, { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt', label: 'menor que' }, { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq', label: 'igual a' },
  ],
  number: [
    { key: 'gt', label: 'maior que' }, { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt', label: 'menor que' }, { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq', label: 'igual a' },
  ],
  enum: [{ key: 'eq', label: 'é' }, { key: 'neq', label: 'não é' }],
  text: [{ key: 'eq', label: 'é igual a' }, { key: 'neq', label: 'não é' }, { key: 'contains', label: 'contém' }],
}

const DEST_TIPOS = [
  { key: 'responsavel_origem', label: 'Responsável pelo registro' },
  { key: 'email_fixo',         label: 'Email fixo (digitar)'     },
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
function newAcao()  { return { id: crypto.randomUUID(), tipo: 'notificar', destinatario_tipo: 'responsavel_origem', email_fixo: '', prazo_dias: 3, titulo_tarefa: '' } }
function emptyRule(){ return { origem: '', gatilho_nome: '', ativo: true, operador_logico: 'E', condicoes: [newCond()], acoes: [newAcao()] } }

// ─── Engine de avaliação ──────────────────────────────────────────────────────
function avaliarCondicao(registro, cond) {
  let raw = registro
  const path = cond.campo.startsWith('cf.') ? null : cond.campo.split('.')
  let val = path ? path.reduce((o, k) => o?.[k], raw) : registro?.custom_fields?.[cond.campo.replace('cf.', '')]

  const v = cond.valor
  const hoje = Date.now()

  switch (cond.operador) {
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

function avaliarRegra(rule, registro) {
  const conds = (rule.condicoes || []).filter(c => c.campo && c.operador)
  if (!conds.length) return false
  const op = rule.operador_logico === 'OU' ? 'some' : 'every'
  return conds[op](c => avaliarCondicao(registro, c))
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
    dados[origem] = data || []
  }

  const { data: existentes } = await supabase.from('alerts').select('rule_id, entidade_id').eq('tenant_id', tenantId).eq('resolvido', false)
  const jaAlertado = new Set((existentes || []).map(a => `${a.rule_id}:${a.entidade_id}`))

  const novos = []
  for (const rule of rules) {
    const registros = dados[rule.origem] || []
    const cf = rule.custom_fields || {}
    const fullRule = { ...rule, condicoes: cf.condicoes || [], operador_logico: cf.operador_logico || 'E', acoes: cf.acoes || [] }
    for (const reg of registros) {
      const chave = `${rule.id}:${reg.id}`
      if (jaAlertado.has(chave)) continue
      if (!avaliarRegra(fullRule, reg)) continue
      const nomeReg = reg.titulo || reg.nome_fantasia || reg.razao_social || reg.name || reg.gatilho_nome || reg.beneficiario_nome || `#${reg.id?.slice(0,8)}`
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
  }

  if (novos.length) {
    await supabase.from('alerts').insert(novos)
  }
  return novos.length
}

// ─── Editor de Condições ──────────────────────────────────────────────────────
function CondicoesEditor({ origem, condicoes, operadorLogico, onChangeCondicoes, onChangeOperador }) {
  const [cfDefs] = useCustomFields(origem || 'oportunidades')
  const padrao  = CAMPOS_PADRAO[origem] || []
  const custom  = (cfDefs || []).map(f => ({ key: `cf.${f.key}`, label: `${f.label} ✦`, tipo: cfTipo(f.type), opts: f.options || [] }))
  const campos  = [...padrao, ...custom]

  function update(id, patch) {
    onChangeCondicoes(condicoes.map(c => c.id === id ? { ...c, ...patch, ...(patch.campo ? { operador: '', valor: '' } : {}) } : c))
  }
  function add()      { onChangeCondicoes([...condicoes, newCond()]) }
  function remove(id) { onChangeCondicoes(condicoes.filter(c => c.id !== id)) }

  if (!origem) return <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Selecione uma origem primeiro.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {condicoes.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Operador lógico entre condições:</span>
          <button onClick={() => onChangeOperador(operadorLogico === 'E' ? 'OU' : 'E')}
            style={{ ...btnSm(false), padding: '2px 14px', fontSize: 11 }}>
            {operadorLogico || 'E'}
          </button>
        </div>
      )}
      {condicoes.map((c) => {
        const campo = campos.find(f => f.key === c.campo)
        const ops   = campo ? (OPS[campo.tipo] || OPS.text) : []
        return (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
            <Sel value={c.campo} onChange={v => update(c.id, { campo: v })}>
              <option value="">Campo…</option>
              {campos.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Sel>
            <Sel value={c.operador} onChange={v => update(c.id, { operador: v })}>
              <option value="">Operador…</option>
              {ops.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </Sel>
            {campo?.tipo === 'enum'
              ? <Sel value={c.valor} onChange={v => update(c.id, { valor: v })} style={{ flex: 1 }}>
                  <option value="">Valor…</option>
                  {(campo.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                </Sel>
              : (c.operador === 'dias_apos' || c.operador === 'dias_antes')
                ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min={1} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })}
                      style={{ ...inp, width: 70 }} placeholder="0" />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>dias</span>
                  </div>
                : campo?.tipo === 'money'
                  ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>R$</span>
                      <input type="number" min={0} step={0.01} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp }} placeholder="0,00" />
                    </div>
                  : <input type={campo?.tipo === 'date' ? 'date' : 'text'} value={c.valor}
                      onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="Valor…" />
            }
            <button onClick={() => remove(c.id)} title="Remover condição"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px 4px', flexShrink: 0 }}>
              <Trash2 size={13} strokeWidth={2} />
            </button>
          </div>
        )
      })}
      <button onClick={add} style={{ ...btnSm(false), alignSelf: 'flex-start', marginTop: 2 }}>
        <Plus size={11} strokeWidth={2.5} /> Adicionar condição
      </button>
    </div>
  )
}

// ─── Editor de Ações ──────────────────────────────────────────────────────────
function AcoesEditor({ acoes, onChange }) {
  function update(id, patch) { onChange(acoes.map(a => a.id === id ? { ...a, ...patch } : a)) }
  function add()      { onChange([...acoes, newAcao()]) }
  function remove(id) { onChange(acoes.filter(a => a.id !== id)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {acoes.map((a, idx) => (
        <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--surface2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ação {idx + 1}
            </span>
            {acoes.length > 1 && (
              <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                <Trash2 size={13} strokeWidth={2} />
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: a.tipo !== 'notificar' ? 10 : 0 }}>
            <div>
              <div style={lbl}>Tipo</div>
              <Sel value={a.tipo} onChange={v => update(a.id, { tipo: v })}>
                <option value="notificar">Notificar no painel</option>
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
    id:              r.id,
    gatilho_nome:    r.gatilho_nome || r.gatilho || '',
    origem:          r.origem || '',
    ativo:           r.ativo,
    operador_logico: cf.operador_logico || 'E',
    condicoes:       cf.condicoes || [newCond()],
    acoes:           cf.acoes    || [newAcao()],
  }
}

function ruleToRow(f, tenantId) {
  return {
    tenant_id:    tenantId,
    gatilho:      f.gatilho_nome,
    gatilho_nome: f.gatilho_nome,
    origem:       f.origem,
    ativo:        f.ativo,
    dias_aviso:   1,
    modo:         'notificar',
    destinatarios: [],
    custom_fields: {
      operador_logico: f.operador_logico || 'E',
      condicoes:       f.condicoes,
      acoes:           f.acoes,
    },
    updated_at: new Date().toISOString(),
  }
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsAlertas() {
  const { profile }            = useProfile()
  const [rules, setRules]      = useState([])
  const [loading, setLoading]  = useState(true)
  const [editing, setEditing]  = useState(null)
  const [search, setSearch]    = useState('')
  const [saving, setSaving]    = useState(false)
  const [running, setRunning]  = useState(false)
  const [lastRun, setLastRun]  = useState(null)
  const engineRef = useRef(false)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('alert_rules').select('*').eq('tenant_id', tenantId).order('created_at')
    setRules((data || []).map(rowToRule))
    setLoading(false)
  }, [tenantId])

  useEffect(() => { if (tenantId) load(); else setLoading(false) }, [load, tenantId])

  // Engine: roda ao montar e a cada 10 min
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
    const row = ruleToRow(form, tenantId)
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
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Configurações' }, { label: 'Alertas', onClick: () => setEditing(null) }, { label: isNew ? 'Nova regra' : editing.gatilho_nome }]}
        title={isNew ? 'Nova regra de alerta' : editing.gatilho_nome}
        subtitle={isNew ? 'Defina condições e ações automáticas' : `Editando regra · ${origemMap[editing.origem] || editing.origem}`}
        onSave={() => {
          if (!editing.origem)               return alert('Selecione a origem.')
          if (!editing.gatilho_nome?.trim()) return alert('Informe um nome para a regra.')
          if (!editing.acoes?.length)        return alert('Adicione pelo menos uma ação.')
          handleSave(editing)
        }}
        onCancel={() => setEditing(null)}
        onDelete={editing.id ? () => { handleRemove(editing.id); setEditing(null) } : undefined}
        saving={saving}
        saveLabel="Salvar regra"
        columns={1}
      >
        <FPESection title="Identidade">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={lbl}>Nome da regra</div>
              <input value={editing.gatilho_nome} onChange={e => setEditing(f => ({ ...f, gatilho_nome: e.target.value }))}
                style={inp} placeholder="Ex: Contrato vencendo em 30 dias" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', paddingTop: 20 }}>
              <input type="checkbox" checked={editing.ativo} onChange={e => setEditing(f => ({ ...f, ativo: e.target.checked }))} />
              Regra ativa
            </label>
          </div>
        </FPESection>

        <FPESection title="Origem">
          <Sel value={editing.origem} onChange={v => setEditing(f => ({ ...f, origem: v, condicoes: [newCond()] }))}>
            <option value="">Selecione…</option>
            {ORIGENS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </Sel>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            A engine avalia todos os registros desta entidade e dispara o alerta quando as condições forem atendidas.
          </p>
        </FPESection>

        <FPESection title="Condições">
          <CondicoesEditor
            origem={editing.origem}
            condicoes={editing.condicoes}
            operadorLogico={editing.operador_logico}
            onChangeCondicoes={v => setEditing(f => ({ ...f, condicoes: v }))}
            onChangeOperador={v => setEditing(f => ({ ...f, operador_logico: v }))}
          />
        </FPESection>

        <FPESection title="Ações ao disparar">
          <AcoesEditor acoes={editing.acoes} onChange={v => setEditing(f => ({ ...f, acoes: v }))} />
        </FPESection>
      </FullPageEdit>
    )
  }

  // ── Listagem ────────────────────────────────────────────────────────────────
  const COLS = [
    { key: 'gatilho_nome', label: 'Nome',     render: (_, r) => <span style={{ fontWeight: 600, fontSize: 13 }}>{r.gatilho_nome}</span> },
    { key: 'origem',       label: 'Origem',   render: (_, r) => origemMap[r.origem] || r.origem },
    { key: 'condicoes',    label: 'Condições',render: (_, r) => {
      const n = (r.condicoes || []).filter(c => c.campo).length
      return `${n} condição(ões) · ${r.operador_logico || 'E'}`
    }},
    { key: 'acoes', label: 'Ações', render: (_, r) => {
      const tipos = { notificar: 'Painel', tarefa: 'Tarefa' }
      return (r.acoes || []).map(a => tipos[a.tipo] || a.tipo).join(' + ')
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
      {/* Barra de status da engine */}
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
          description="Regras automáticas que geram notificações no painel ou criam tarefas."
          columns={COLS} data={filtered} keyField="id"
          loading={loading} search={search} onSearchChange={setSearch}
          newLabel="+ Nova regra" onNew={() => setEditing(emptyRule())}
          emptyLabel="Nenhuma regra de alerta configurada."
          rowActions={[
            { label: 'Editar',  onClick: r => setEditing(r) },
            { label: 'Excluir', danger: true, onClick: r => handleRemove(r.id) },
          ]}
        />
      </div>
    </div>
  )
}
