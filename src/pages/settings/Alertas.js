import { useState, useMemo, useCallback, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../hooks/useProfile'
import { useUsuarios } from '../../hooks/useUsuarios'
import { useContacts } from '../../hooks/useContacts'
import { useCustomFields } from '../../hooks/useCustomFields'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { X, Plus, Trash2 } from 'lucide-react'

// ─── Origens do sistema ───────────────────────────────────────────────────────
const ORIGENS = [
  { key: 'commission_payments', label: 'Pagamentos',    link: '/pagamentos' },
  { key: 'contracts',           label: 'Contratos',     link: '/contratos'  },
  { key: 'oportunidades',       label: 'Oportunidades', link: '/pipeline'   },
  { key: 'projetos',            label: 'Projetos',      link: '/projetos'   },
  { key: 'tarefas',             label: 'Tarefas',       link: '/tarefas'    },
  { key: 'companies',           label: 'Empresas',      link: '/empresas'   },
]

// ─── Campos padrão por origem ─────────────────────────────────────────────────
const CAMPOS_PADRAO = {
  commission_payments: [
    { key: 'data_vencimento', label: 'Data de vencimento',  tipo: 'date'  },
    { key: 'valor_comissao',  label: 'Valor da comissão',   tipo: 'money' },
    { key: 'status',          label: 'Status',              tipo: 'enum', opts: ['pendente','pago','cancelado'] },
    { key: 'beneficiario_nome', label: 'Beneficiário',      tipo: 'text'  },
  ],
  contracts: [
    { key: 'data_inicio',  label: 'Início da vigência',   tipo: 'date'  },
    { key: 'data_fim',     label: 'Fim da vigência',      tipo: 'date'  },
    { key: 'status',       label: 'Status',               tipo: 'enum', opts: ['ativo','encerrado','cancelado'] },
    { key: 'responsavel',  label: 'Responsável',          tipo: 'text'  },
    { key: 'origem',       label: 'Origem',               tipo: 'text'  },
  ],
  oportunidades: [
    { key: 'updated_at',          label: 'Última atualização',        tipo: 'date'  },
    { key: 'prazo',               label: 'Prazo',                     tipo: 'date'  },
    { key: 'cf.proxima_acao_data',label: 'Data da próxima tarefa',    tipo: 'date'  },
    { key: 'valor',               label: 'Valor estimado',            tipo: 'money' },
    { key: 'valor_cdu',           label: 'Valor CDU',                 tipo: 'money' },
    { key: 'valor_sms',           label: 'Valor SMS',                 tipo: 'money' },
    { key: 'valor_servico',       label: 'Valor Serviço',             tipo: 'money' },
    { key: 'situacao',            label: 'Situação',                  tipo: 'enum', opts: ['em_andamento','ganho','perdido'] },
    { key: 'origem',              label: 'Origem',                    tipo: 'enum', opts: ['Inbound','Outbound','Canal','Indicação'] },
    { key: 'responsavel',         label: 'Responsável',               tipo: 'text'  },
  ],
  projetos: [
    { key: 'data_inicio',  label: 'Data de início',       tipo: 'date'  },
    { key: 'data_fim',     label: 'Data de entrega',      tipo: 'date'  },
    { key: 'status',       label: 'Status',               tipo: 'enum', opts: ['em_andamento','concluido','cancelado'] },
    { key: 'phase',        label: 'Fase',                 tipo: 'enum', opts: ['iniciacao','planejamento','execucao','encerramento'] },
    { key: 'total_hours_estimated', label: 'Horas estimadas', tipo: 'number' },
    { key: 'total_hours_executed',  label: 'Horas executadas', tipo: 'number' },
  ],
  tarefas: [
    { key: 'prazo',        label: 'Prazo',                tipo: 'date'  },
    { key: 'status',       label: 'Status',               tipo: 'enum', opts: ['pendente','em_andamento','concluida'] },
    { key: 'prioridade',   label: 'Prioridade',           tipo: 'enum', opts: ['alta','media','baixa'] },
    { key: 'tipo',         label: 'Tipo',                 tipo: 'enum', opts: ['ligação','reunião','email','visita','tarefa'] },
    { key: 'responsavel',  label: 'Responsável',          tipo: 'text'  },
  ],
  companies: [
    { key: 'updated_at',   label: 'Última atualização',   tipo: 'date'  },
    { key: 'status',       label: 'Status',               tipo: 'enum', opts: ['ativo','inativo'] },
    { key: 'tipo',         label: 'Tipo',                 tipo: 'enum', opts: ['cliente','parceiro','prospect'] },
  ],
}

// converte tipo de campo customizado para tipo de operador
function cfTipoToTipo(type) {
  if (type === 'date')   return 'date'
  if (type === 'number') return 'number'
  if (type === 'select') return 'enum'
  return 'text'
}

// ─── Operadores por tipo de campo ─────────────────────────────────────────────
const OPS = {
  date:  [
    { key: 'dias_apos',   label: 'há mais de X dias' },
    { key: 'dias_antes',  label: 'daqui a menos de X dias' },
    { key: 'antes_de',    label: 'antes de (data fixa)' },
    { key: 'apos_de',     label: 'após (data fixa)' },
  ],
  money: [
    { key: 'gt',  label: 'maior que'       },
    { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt',  label: 'menor que'       },
    { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq',  label: 'igual a'         },
  ],
  number: [
    { key: 'gt',  label: 'maior que'       },
    { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt',  label: 'menor que'       },
    { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq',  label: 'igual a'         },
  ],
  enum: [
    { key: 'eq',  label: 'é'     },
    { key: 'neq', label: 'não é' },
  ],
  text: [
    { key: 'eq',       label: 'é igual a'   },
    { key: 'neq',      label: 'não é'       },
    { key: 'contains', label: 'contém'      },
  ],
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
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
const label12 = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }
const sec = { marginBottom: 20 }

function Select({ value, onChange, children, style = {} }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...sel, ...style }}>
      {children}
    </select>
  )
}

function newCondicao() {
  return { id: crypto.randomUUID(), campo: '', operador: '', valor: '' }
}

function emptyRule() {
  return {
    origem: '', gatilho_nome: '', ativo: true,
    condicoes: [newCondicao()],
    consequencia: 'notificar',            // notificar | criar_tarefa | ambos
    prazo_tarefa_dias: 3,
    destinatarios_usuario: [],            // ids de profiles
    destinatarios_contato: [],            // ids de contacts
    email_assunto: '',
    email_mensagem: '',
  }
}

// ─── Editor de Condições ──────────────────────────────────────────────────────
function CondicoesEditor({ origem, condicoes, onChange }) {
  const [cfDefs] = useCustomFields(origem || 'oportunidades')
  const camposPadrao = CAMPOS_PADRAO[origem] || []
  const camposCustom = (cfDefs || []).map(f => ({
    key:   `cf.${f.key}`,
    label: `${f.label} ✦`,
    tipo:  cfTipoToTipo(f.type),
    opts:  f.options || [],
    custom: true,
  }))
  const campos = [...camposPadrao, ...camposCustom]

  function update(id, patch) {
    onChange(condicoes.map(c => c.id === id ? { ...c, ...patch, ...(patch.campo ? { operador: '', valor: '' } : {}) } : c))
  }
  function add()      { onChange([...condicoes, newCondicao()]) }
  function remove(id) { onChange(condicoes.filter(c => c.id !== id)) }

  if (!origem) return <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Selecione uma origem primeiro.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {condicoes.map(c => {
        const campo = campos.find(f => f.key === c.campo)
        const ops   = campo ? (OPS[campo.tipo] || OPS.text) : []
        return (
          <div key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <Select value={c.campo} onChange={v => update(c.id, { campo: v })} style={{ flex: '0 0 160px' }}>
              <option value="">Campo…</option>
              {campos.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Select>

            <Select value={c.operador} onChange={v => update(c.id, { operador: v })} style={{ flex: '0 0 180px' }}>
              <option value="">Operador…</option>
              {ops.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </Select>

            {campo?.tipo === 'enum'
              ? <Select value={c.valor} onChange={v => update(c.id, { valor: v })} style={{ flex: 1 }}>
                  <option value="">Valor…</option>
                  {(campo.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
              : campo?.tipo === 'date' && (c.operador === 'dias_apos' || c.operador === 'dias_antes')
                ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min={1} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp, width: 64 }} placeholder="0" />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>dias</span>
                  </div>
                : campo?.tipo === 'money'
                  ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>R$</span>
                      <input type="number" min={0} step={0.01} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp }} placeholder="0,00" />
                    </div>
                  : <input type={campo?.tipo === 'date' ? 'date' : 'text'} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="Valor…" />
            }

            <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '5px 4px', flexShrink: 0 }}>
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

// ─── Seletor de Destinatários ─────────────────────────────────────────────────
function DestinatariosEditor({ usuarios, contatos, selectedUsuarios, selectedContatos, onChangeU, onChangeC }) {
  const [tab, setTab] = useState('usuarios')

  function toggleU(id) { onChangeU(selectedUsuarios.includes(id) ? selectedUsuarios.filter(x => x !== id) : [...selectedUsuarios, id]) }
  function toggleC(id) { onChangeC(selectedContatos.includes(id) ? selectedContatos.filter(x => x !== id) : [...selectedContatos, id]) }

  const tabBtn = (active) => ({
    flex: 1, padding: '5px 0', fontSize: 12, fontWeight: active ? 700 : 400,
    background: active ? 'var(--accent)' : 'var(--surface2)',
    color: active ? '#fff' : 'var(--text-muted)',
    border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font)',
  })

  const lista = tab === 'usuarios' ? usuarios : contatos
  const selected = tab === 'usuarios' ? selectedUsuarios : selectedContatos
  const toggle   = tab === 'usuarios' ? toggleU : toggleC

  return (
    <div>
      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
        <button style={{ ...tabBtn(tab === 'usuarios'), borderRadius: '6px 0 0 6px', borderRight: 'none' }} onClick={() => setTab('usuarios')}>
          Usuários do sistema
        </button>
        <button style={{ ...tabBtn(tab === 'contatos'), borderRadius: '0 6px 6px 0' }} onClick={() => setTab('contatos')}>
          Contatos Canais
        </button>
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
        {lista.length === 0 && (
          <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)' }}>Nenhum encontrado.</div>
        )}
        {lista.map(u => (
          <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{u.nome || u.name || ''}</span>
            {u.email && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{u.email}</span>}
          </label>
        ))}
      </div>
    </div>
  )
}

// ─── Form da Regra (SlideOver inline) ─────────────────────────────────────────
function RuleForm({ rule, onSave, onClose, usuarios, contatos }) {
  const [form, setForm] = useState(rule)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.origem)         return alert('Selecione a origem.')
    if (!form.gatilho_nome?.trim()) return alert('Informe um nome para a regra.')
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const origemLabel = ORIGENS.find(o => o.key === form.origem)?.label || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{rule.id ? 'Editar regra' : 'Nova regra de alerta'}</div>
          {origemLabel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{origemLabel}</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={16} /></button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Nome + Ativo */}
        <div style={sec}>
          <div style={label12}>Nome da regra</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={form.gatilho_nome} onChange={e => set('gatilho_nome', e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Ex: Contrato vencendo em 30 dias" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
              Ativa
            </label>
          </div>
        </div>

        {/* Origem */}
        <div style={sec}>
          <div style={label12}>Origem</div>
          <Select value={form.origem} onChange={v => set('origem', v)}>
            <option value="">Selecione a origem…</option>
            {ORIGENS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </Select>
        </div>

        {/* Condições */}
        <div style={sec}>
          <div style={label12}>Condições</div>
          <CondicoesEditor
            origem={form.origem}
            condicoes={form.condicoes}
            onChange={v => set('condicoes', v)}
          />
        </div>

        {/* Consequência */}
        <div style={sec}>
          <div style={label12}>Consequência</div>
          <Select value={form.consequencia} onChange={v => set('consequencia', v)} style={{ marginBottom: 12 }}>
            <option value="notificar">Só notificar (painel + email)</option>
            <option value="criar_tarefa">Criar tarefa automaticamente</option>
            <option value="ambos">Notificar + Criar tarefa</option>
          </Select>

          {(form.consequencia === 'criar_tarefa' || form.consequencia === 'ambos') && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Prazo da tarefa:
              <input type="number" min={1} max={90} value={form.prazo_tarefa_dias}
                onChange={e => set('prazo_tarefa_dias', Number(e.target.value))}
                style={{ ...inp, width: 52 }} />
              dias após o gatilho
            </label>
          )}
        </div>

        {/* Email */}
        {(form.consequencia === 'notificar' || form.consequencia === 'ambos') && (
          <div style={sec}>
            <div style={label12}>Mensagem do email</div>
            <input value={form.email_assunto} onChange={e => set('email_assunto', e.target.value)}
              placeholder="Assunto (opcional)" style={{ ...inp, marginBottom: 6 }} />
            <textarea value={form.email_mensagem} onChange={e => set('email_mensagem', e.target.value)}
              placeholder="Mensagem adicional (opcional)" rows={3}
              style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
        )}

        {/* Destinatários */}
        <div style={sec}>
          <div style={label12}>Destinatários</div>
          <DestinatariosEditor
            usuarios={usuarios}
            contatos={contatos}
            selectedUsuarios={form.destinatarios_usuario}
            selectedContatos={form.destinatarios_contato}
            onChangeU={v => set('destinatarios_usuario', v)}
            onChangeC={v => set('destinatarios_contato', v)}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
        <button onClick={onClose} style={btnSm(false)}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={btnSm(true)}>
          {saving ? 'Salvando…' : 'Salvar regra'}
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
function rowToRule(r) {
  const cf = r.custom_fields || {}
  return {
    id: r.id,
    gatilho_nome:        r.gatilho_nome || r.gatilho || '',
    origem:              r.origem || '',
    ativo:               r.ativo,
    condicoes:           cf.condicoes || [newCondicao()],
    consequencia:        cf.consequencia || 'notificar',
    prazo_tarefa_dias:   cf.prazo_tarefa_dias || 3,
    destinatarios_usuario: cf.destinatarios_usuario || [],
    destinatarios_contato: cf.destinatarios_contato || [],
    email_assunto:       cf.email_assunto || '',
    email_mensagem:      cf.email_mensagem || '',
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
    modo:         f.consequencia === 'criar_tarefa' ? 'criar_tarefa' : 'notificar',
    prazo_tarefa_dias: f.consequencia !== 'notificar' ? f.prazo_tarefa_dias : null,
    destinatarios: [],
    custom_fields: {
      condicoes:              f.condicoes,
      consequencia:           f.consequencia,
      prazo_tarefa_dias:      f.prazo_tarefa_dias,
      destinatarios_usuario:  f.destinatarios_usuario,
      destinatarios_contato:  f.destinatarios_contato,
      email_assunto:          f.email_assunto,
      email_mensagem:         f.email_mensagem,
    },
    updated_at: new Date().toISOString(),
  }
}

export default function SettingsAlertas() {
  const { profile } = useProfile()
  const { usuarios } = useUsuarios()
  const { contacts: contatos } = useContacts()

  const [rules,   setRules]   = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // null | rule object
  const [search,  setSearch]  = useState('')

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const { data } = await supabase.from('alert_rules').select('*').eq('tenant_id', tenantId).order('created_at')
    setRules((data || []).map(rowToRule))
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    if (tenantId) load()
    else setLoading(false)
  }, [load, tenantId])

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
    return rules.filter(r =>
      !q || r.gatilho_nome.toLowerCase().includes(q) || (origemMap[r.origem] || '').toLowerCase().includes(q)
    )
  }, [rules, search])

  const COLS = [
    { key: 'gatilho_nome', label: 'Nome', render: r => <span style={{ fontWeight: 600, fontSize: 13 }}>{r.gatilho_nome}</span> },
    { key: 'origem',       label: 'Origem',      render: r => origemMap[r.origem] || r.origem },
    { key: 'condicoes',    label: 'Condições',   render: r => `${(r.condicoes || []).filter(c => c.campo).length} condição(ões)` },
    { key: 'consequencia', label: 'Consequência',render: r => ({ notificar: 'Notificar', criar_tarefa: 'Criar tarefa', ambos: 'Notificar + Tarefa' }[r.consequencia] || r.consequencia) },
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
      {/* Browse */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <SettingsLayout
          columns={COLS}
          data={filtered}
          keyField="id"
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          newLabel="+ Nova regra"
          onNew={() => setEditing(emptyRule())}
          emptyLabel="Nenhuma regra de alerta configurada."
          rowActions={[
            { label: 'Editar',  onClick: r => setEditing(r) },
            { label: 'Excluir', danger: true, onClick: r => remove(r.id) },
          ]}
        />
      </div>

      {/* Form lateral */}
      {editing && (
        <div style={{
          width: 480, flexShrink: 0, borderLeft: '1px solid var(--border)',
          background: 'var(--surface)', display: 'flex', flexDirection: 'column',
          height: '100%', overflow: 'hidden',
        }}>
          <RuleForm
            rule={editing}
            onSave={save}
            onClose={() => setEditing(null)}
            usuarios={usuarios}
            contatos={contatos}
          />
        </div>
      )}
    </div>
  )
}
