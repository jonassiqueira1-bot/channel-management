import { useState, useMemo, useCallback, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../hooks/useProfile'
import { useUsuarios } from '../../hooks/useUsuarios'
import { useContacts } from '../../hooks/useContacts'
import { useCustomFields } from '../../hooks/useCustomFields'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { X, Plus, Trash2 } from 'lucide-react'

// ─── Origens ──────────────────────────────────────────────────────────────────
const ORIGENS = [
  { key: 'commission_payments', label: 'Pagamentos'    },
  { key: 'contracts',           label: 'Contratos'     },
  { key: 'oportunidades',       label: 'Oportunidades' },
  { key: 'projetos',            label: 'Projetos'      },
  { key: 'tarefas',             label: 'Tarefas'       },
  { key: 'companies',           label: 'Empresas'      },
]

// ─── Campos padrão por origem ─────────────────────────────────────────────────
const CAMPOS_PADRAO = {
  commission_payments: [
    { key: 'data_vencimento',   label: 'Data de vencimento', tipo: 'date'  },
    { key: 'valor_comissao',    label: 'Valor da comissão',  tipo: 'money' },
    { key: 'status',            label: 'Status', tipo: 'enum', opts: ['pendente','pago','cancelado'] },
    { key: 'beneficiario_nome', label: 'Beneficiário',       tipo: 'text'  },
  ],
  contracts: [
    { key: 'data_inicio',  label: 'Início da vigência', tipo: 'date' },
    { key: 'data_fim',     label: 'Fim da vigência',    tipo: 'date' },
    { key: 'status',       label: 'Status', tipo: 'enum', opts: ['ativo','encerrado','cancelado'] },
    { key: 'responsavel',  label: 'Responsável',        tipo: 'text' },
  ],
  oportunidades: [
    { key: 'updated_at',           label: 'Última atualização',     tipo: 'date'  },
    { key: 'prazo',                label: 'Prazo',                  tipo: 'date'  },
    { key: 'cf.proxima_acao_data', label: 'Data da próxima tarefa', tipo: 'date'  },
    { key: 'valor',                label: 'Valor estimado',         tipo: 'money' },
    { key: 'valor_cdu',            label: 'Valor CDU',              tipo: 'money' },
    { key: 'valor_sms',            label: 'Valor SMS',              tipo: 'money' },
    { key: 'valor_servico',        label: 'Valor Serviço',          tipo: 'money' },
    { key: 'situacao',             label: 'Situação', tipo: 'enum', opts: ['em_andamento','ganho','perdido'] },
    { key: 'origem',               label: 'Origem',   tipo: 'enum', opts: ['Inbound','Outbound','Canal','Indicação'] },
    { key: 'responsavel',          label: 'Responsável',            tipo: 'text'  },
  ],
  projetos: [
    { key: 'data_inicio', label: 'Data de início',   tipo: 'date' },
    { key: 'data_fim',    label: 'Data de entrega',  tipo: 'date' },
    { key: 'status',      label: 'Status', tipo: 'enum', opts: ['em_andamento','concluido','cancelado'] },
    { key: 'phase',       label: 'Fase',   tipo: 'enum', opts: ['iniciacao','planejamento','execucao','encerramento'] },
  ],
  tarefas: [
    { key: 'prazo',      label: 'Prazo',       tipo: 'date' },
    { key: 'data_inicio',label: 'Data de início', tipo: 'date' },
    { key: 'status',     label: 'Status',   tipo: 'enum', opts: ['pendente','em_andamento','concluida'] },
    { key: 'prioridade', label: 'Prioridade', tipo: 'enum', opts: ['alta','media','baixa'] },
    { key: 'responsavel',label: 'Responsável', tipo: 'text' },
  ],
  companies: [
    { key: 'updated_at', label: 'Última atualização', tipo: 'date' },
    { key: 'status',     label: 'Status', tipo: 'enum', opts: ['ativo','inativo'] },
  ],
}

// ─── Operadores por tipo ──────────────────────────────────────────────────────
const OPS = {
  date:  [
    { key: 'dias_apos',  label: 'há mais de X dias' },
    { key: 'dias_antes', label: 'daqui a menos de X dias' },
    { key: 'antes_de',   label: 'antes de (data fixa)' },
    { key: 'apos_de',    label: 'após (data fixa)' },
  ],
  money: [
    { key: 'gt',  label: 'maior que' }, { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt',  label: 'menor que' }, { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq',  label: 'igual a'   },
  ],
  number: [
    { key: 'gt',  label: 'maior que' }, { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt',  label: 'menor que' }, { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq',  label: 'igual a'   },
  ],
  enum: [{ key: 'eq', label: 'é' }, { key: 'neq', label: 'não é' }],
  text: [{ key: 'eq', label: 'é igual a' }, { key: 'neq', label: 'não é' }, { key: 'contains', label: 'contém' }],
}

// ─── Papéis de destinatário ───────────────────────────────────────────────────
const DEST_TIPOS = [
  { key: 'responsavel_origem',  label: 'Responsável pelo registro'   },
  { key: 'responsavel_tarefa',  label: 'Responsável pela tarefa'     },
  { key: 'contato_empresa',     label: 'Contato da empresa'          },
  { key: 'email_fixo',          label: 'Email fixo (digitar)'        },
]

const TEMPLATES = [
  { key: 'alerta_generico',     label: 'Alerta genérico'             },
  { key: 'pagamento_vencido',   label: 'Pagamento vencido'           },
  { key: 'contrato_vencendo',   label: 'Contrato vencendo'           },
  { key: 'oportunidade_parada', label: 'Oportunidade parada'         },
]

// ─── Estilos base ─────────────────────────────────────────────────────────────
const inp = {
  padding: '5px 9px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface2)', color: 'var(--text)', fontSize: 12,
  fontFamily: 'var(--font)', width: '100%', boxSizing: 'border-box',
}
const sel = { ...inp, cursor: 'pointer' }
const btnSm = (accent) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font)',
  background: accent ? 'var(--accent)' : 'var(--surface2)',
  color: accent ? '#fff' : 'var(--text)',
  border: accent ? '1px solid var(--accent)' : '1px solid var(--border)',
})
const lbl12 = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }
const sec = { marginBottom: 20 }
const divider = { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', padding: '2px 0' }

function Sel({ value, onChange, children, style = {} }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ ...sel, ...style }}>{children}</select>
}

function cfTipoToTipo(type) {
  if (type === 'date')   return 'date'
  if (type === 'number') return 'number'
  if (type === 'select') return 'enum'
  return 'text'
}

function newCond(op = 'E') { return { id: crypto.randomUUID(), campo: '', operador: '', valor: '', logico: op } }
function newAcao() { return { id: crypto.randomUUID(), tipo: 'notificar', destinatario_tipo: 'responsavel_origem', email_fixo: '', template: 'alerta_generico', assunto: '', mensagem: '', prazo_dias: 3, titulo_tarefa: '' } }

function emptyRule() {
  return {
    origem: '', gatilho_nome: '', ativo: true,
    condicoes: [newCond()],
    acoes: [newAcao()],
  }
}

// ─── Editor de Condições ──────────────────────────────────────────────────────
function CondicoesEditor({ origem, condicoes, onChangeCondicoes }) {
  const [cfDefs] = useCustomFields(origem || 'oportunidades')
  const padrao  = CAMPOS_PADRAO[origem] || []
  const custom  = (cfDefs || []).map(f => ({ key: `cf.${f.key}`, label: `${f.label} ✦`, tipo: cfTipoToTipo(f.type), opts: f.options || [] }))
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {condicoes.map((c, idx) => {
        const campo = campos.find(f => f.key === c.campo)
        const ops   = campo ? (OPS[campo.tipo] || OPS.text) : []
        return (
          <div key={c.id}>
            {idx > 0 && (
              <div style={divider}>
                <button onClick={() => toggleLogico(c.id)}
                  style={{ ...btnSm(false), padding: '2px 14px', fontSize: 11, marginBottom: 4 }}>
                  {c.logico || 'E'}
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <Sel value={c.campo} onChange={v => update(c.id, { campo: v })} style={{ flex: '0 0 155px' }}>
                <option value="">Campo…</option>
                {campos.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </Sel>
              <Sel value={c.operador} onChange={v => update(c.id, { operador: v })} style={{ flex: '0 0 170px' }}>
                <option value="">Operador…</option>
                {ops.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </Sel>
              {campo?.tipo === 'enum'
                ? <Sel value={c.valor} onChange={v => update(c.id, { valor: v })} style={{ flex: 1 }}>
                    <option value="">Valor…</option>
                    {(campo.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </Sel>
                : campo?.tipo === 'money'
                  ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>R$</span>
                      <input type="number" min={0} step={0.01} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp }} placeholder="0,00" />
                    </div>
                  : (c.operador === 'dias_apos' || c.operador === 'dias_antes')
                    ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" min={1} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp, width: 64 }} placeholder="0" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>dias</span>
                      </div>
                    : <input type={campo?.tipo === 'date' ? 'date' : 'text'} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="Valor…" />
              }
              <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '5px 4px', flexShrink: 0 }}>
                <Trash2 size={13} strokeWidth={2} />
              </button>
            </div>
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
  function add()       { onChange([...acoes, newAcao()]) }
  function remove(id)  { onChange(acoes.filter(a => a.id !== id)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {acoes.map((a, idx) => (
        <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--surface2)' }}>
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

          {/* Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={lbl12}>Tipo</div>
              <Sel value={a.tipo} onChange={v => update(a.id, { tipo: v })}>
                <option value="notificar">Notificar no painel</option>
                <option value="email">Enviar email</option>
                <option value="tarefa">Criar tarefa</option>
              </Sel>
            </div>
            <div>
              <div style={lbl12}>Para quem</div>
              <Sel value={a.destinatario_tipo} onChange={v => update(a.id, { destinatario_tipo: v })}>
                {DEST_TIPOS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </Sel>
            </div>
          </div>

          {/* Email fixo */}
          {a.destinatario_tipo === 'email_fixo' && (
            <div style={{ marginBottom: 8 }}>
              <div style={lbl12}>Email</div>
              <input value={a.email_fixo} onChange={e => update(a.id, { email_fixo: e.target.value })}
                placeholder="email@exemplo.com" style={inp} type="email" />
            </div>
          )}

          {/* Campos de email */}
          {a.tipo === 'email' && (
            <>
              <div style={{ marginBottom: 8 }}>
                <div style={lbl12}>Template</div>
                <Sel value={a.template} onChange={v => update(a.id, { template: v })}>
                  {TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </Sel>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={lbl12}>Assunto (opcional)</div>
                <input value={a.assunto} onChange={e => update(a.id, { assunto: e.target.value })} style={inp} placeholder="Assunto personalizado…" />
              </div>
              <div>
                <div style={lbl12}>Mensagem adicional (opcional)</div>
                <textarea value={a.mensagem} onChange={e => update(a.id, { mensagem: e.target.value })}
                  rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Texto adicional no email…" />
              </div>
            </>
          )}

          {/* Campos de tarefa */}
          {a.tipo === 'tarefa' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <div>
                <div style={lbl12}>Título da tarefa</div>
                <input value={a.titulo_tarefa} onChange={e => update(a.id, { titulo_tarefa: e.target.value })} style={inp} placeholder="Ex: Ligar para cliente" />
              </div>
              <div>
                <div style={lbl12}>Prazo (dias)</div>
                <input type="number" min={1} max={90} value={a.prazo_dias} onChange={e => update(a.id, { prazo_dias: Number(e.target.value) })} style={{ ...inp, width: 60 }} />
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

// ─── Form da Regra ────────────────────────────────────────────────────────────
function RuleForm({ rule, onSave, onClose }) {
  const [form, setForm] = useState(rule)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.origem)               return alert('Selecione a origem.')
    if (!form.gatilho_nome?.trim()) return alert('Informe um nome para a regra.')
    if (!form.acoes?.length)        return alert('Adicione pelo menos uma ação.')
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const origemLabel = ORIGENS.find(o => o.key === form.origem)?.label || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{rule.id ? 'Editar regra' : 'Nova regra de alerta'}</div>
          {origemLabel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{origemLabel}</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={16} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Nome + Ativo */}
        <div style={sec}>
          <div style={lbl12}>Nome da regra</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={form.gatilho_nome} onChange={e => set('gatilho_nome', e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Ex: Contrato vencendo em 30 dias" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} /> Ativa
            </label>
          </div>
        </div>

        {/* Origem */}
        <div style={sec}>
          <div style={lbl12}>Origem</div>
          <Sel value={form.origem} onChange={v => set('origem', v)}>
            <option value="">Selecione…</option>
            {ORIGENS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </Sel>
        </div>

        {/* Condições + operador */}
        <div style={sec}>
          <div style={lbl12}>Condições</div>
          <CondicoesEditor
            origem={form.origem}
            condicoes={form.condicoes}
            onChangeCondicoes={v => set('condicoes', v)}
          />
        </div>

        {/* Ações */}
        <div style={sec}>
          <div style={lbl12}>Ações</div>
          <AcoesEditor acoes={form.acoes} onChange={v => set('acoes', v)} />
        </div>
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
        <button onClick={onClose} style={btnSm(false)}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={btnSm(true)}>{saving ? 'Salvando…' : 'Salvar regra'}</button>
      </div>
    </div>
  )
}

// ─── Serialização ─────────────────────────────────────────────────────────────
function rowToRule(r) {
  const cf = r.custom_fields || {}
  return {
    id:             r.id,
    gatilho_nome:   r.gatilho_nome || r.gatilho || '',
    origem:         r.origem || '',
    ativo:          r.ativo,
    operador_logico: cf.operador_logico || 'E',
    condicoes:      cf.condicoes || [newCond()],
    acoes:          cf.acoes    || [newAcao()],
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
      operador_logico: f.operador_logico,
      condicoes:       f.condicoes,
      acoes:           f.acoes,
    },
    updated_at: new Date().toISOString(),
  }
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsAlertas() {
  const { profile }              = useProfile()
  const [rules, setRules]        = useState([])
  const [loading, setLoading]    = useState(true)
  const [editing, setEditing]    = useState(null)
  const [search, setSearch]      = useState('')

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('alert_rules').select('*').eq('tenant_id', tenantId).order('created_at')
    setRules((data || []).map(rowToRule))
    setLoading(false)
  }, [tenantId])

  useEffect(() => { if (tenantId) load(); else setLoading(false) }, [load, tenantId])

  async function save(form) {
    const row = ruleToRow(form, tenantId)
    if (form.id) {
      const { error } = await supabase.from('alert_rules').update(row).eq('id', form.id)
      if (error) return alert('Erro: ' + error.message)
      setRules(prev => prev.map(r => r.id === form.id ? { ...form } : r))
    } else {
      const { data, error } = await supabase.from('alert_rules').insert(row).select().single()
      if (error) return alert('Erro: ' + error.message)
      setRules(prev => [...prev, rowToRule(data)])
    }
    setEditing(null)
  }

  async function remove(id) {
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
  }, [rules, search])

  const COLS = [
    { key: 'gatilho_nome', label: 'Nome',         render: r => <span style={{ fontWeight: 600, fontSize: 13 }}>{r.gatilho_nome}</span> },
    { key: 'origem',       label: 'Origem',        render: r => origemMap[r.origem] || r.origem },
    { key: 'condicoes',   label: 'Condições',     render: r => {
      const n = (r.condicoes || []).filter(c => c.campo).length
      return `${n} condição(ões) · ${r.operador_logico}`
    }},
    { key: 'acoes',       label: 'Ações',         render: r => {
      const tipos = { email: 'Email', tarefa: 'Tarefa', notificar: 'Painel' }
      return (r.acoes || []).map(a => tipos[a.tipo] || a.tipo).join(' + ')
    }},
    { key: 'ativo', label: 'Status', render: r => (
      <button onClick={e => { e.stopPropagation(); toggleAtivo(r) }}
        style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
          background: r.ativo ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--surface2)',
          color: r.ativo ? 'var(--accent)' : 'var(--text-muted)' }}>
        {r.ativo ? 'Ativa' : 'Inativa'}
      </button>
    )},
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <SettingsLayout
          columns={COLS} data={filtered} keyField="id"
          loading={loading} search={search} onSearchChange={setSearch}
          newLabel="+ Nova regra" onNew={() => setEditing(emptyRule())}
          emptyLabel="Nenhuma regra de alerta configurada."
          rowActions={[
            { label: 'Editar',  onClick: r => setEditing(r) },
            { label: 'Excluir', danger: true, onClick: r => remove(r.id) },
          ]}
        />
      </div>

      {editing && (
        <div style={{ width: 500, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <RuleForm rule={editing} onSave={save} onClose={() => setEditing(null)} />
        </div>
      )}
    </div>
  )
}
