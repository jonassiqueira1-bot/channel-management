import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  DollarSign, Percent, Calendar, Plus, ChevronDown,
  CheckCircle2, Clock, XCircle, Pencil, Trash2, X,
  TrendingUp, Search, ArrowUpDown, AlertCircle, Loader2,
  Zap, BarChart2, Link2, RotateCcw, Info, ChevronRight,
  User, Users, Settings, Filter,
} from 'lucide-react'
import { FullPageEdit, FPESection, FPEField, FPEGrid, FPESeparator, AsideCard } from '../components/ui'
import {
  RECEITA_TIPOS, STATUS_CFG,
  TIPO_CALCULO_CFG, TIPO_RECORRENCIA_CFG,
  DEFAULT_ESCALA_INDIVIDUAL, DEFAULT_ESCALA_EQUIPE,
  ENTIDADES_ELEGIBILIDADE, OPERADORES_POR_TIPO,
  EMPTY_RULE,
} from '../data/mockComissoes'
import { MOCK_USUARIOS } from '../data/mockUsuarios'
import { MOCK_CONTATOS, CONTATOS_STORAGE_KEY } from '../data/mockContatos'
import { MOCK_PRODUTOS } from '../data/mockProdutos'
import { useLocalState } from '../hooks/useLocalState'
import { useCommissions } from '../hooks/useCommissions'
import { InlineSearchSelect } from '../components/NotionDrawer'
import Button from '../components/Button'

// ─── Constantes ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'repasses', label: 'Acompanhamento de Repasses' },
  { id: 'regras',   label: 'Regras de Configuração' },
]
const SZ = 15

const PERIOD_OPTIONS = [
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês anterior' },
  { id: 'this_q',     label: 'Este trimestre' },
  { id: 'last_q',     label: 'Trimestre anterior' },
  { id: 'this_year',  label: 'Este ano' },
  { id: 'all',        label: 'Todos os períodos' },
]

const EMPTY_PAYMENT = {
  id: null, rule_id: '',
  beneficiario_id: '', beneficiario_nome: '', persona: 'externo',
  receita_tipo: 'CDU', valor_base: '', percentual: '',
  data_competencia: new Date().toISOString().slice(0, 10),
  data_vencimento: '', data_pagamento: '', status: 'pendente',
  descricao: '', notas: '',
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
const fmt     = v => v == null || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPct  = v => `${Number(v).toFixed(2).replace('.', ',')}%`
const fmtDate = d => { if (!d) return '—'; const [y,m,day] = d.split('-'); return `${day}/${m}/${y.slice(2)}` }
const today   = () => new Date().toISOString().slice(0, 10)
const uid     = () => Math.random().toString(36).slice(2, 9)

// ─── Helpers persona_percentuais ─────────────────────────────────────────────
function receitaKey(tipo) { return `${tipo.toLowerCase().replace('serviços', 'servicos')}_pct` }

function getPerc(lista, personaId, tipo) {
  const entry = (lista || []).find(p => p.persona_id === personaId)
  return entry ? (Number(entry[receitaKey(tipo)]) || 0) : 0
}

function setPerc(lista, personaId, tipo, val) {
  const key = receitaKey(tipo)
  const num = Math.min(100, Math.max(0, parseFloat(val) || 0))
  const exists = lista.some(p => p.persona_id === personaId)
  if (exists) return lista.map(p => p.persona_id === personaId ? { ...p, [key]: num } : p)
  return [...lista, { persona_id: personaId, cdu_pct: 0, sms_pct: 0, servicos_pct: 0, [key]: num }]
}

function defaultPersonaPercs(personas) {
  return personas.map(p => ({ persona_id: p.id, cdu_pct: 0, sms_pct: 0, servicos_pct: 0 }))
}

// ─── MultiSearchSelect ────────────────────────────────────────────────────────
// options: [{ value, label, sublabel? }]
// values: string[]
function MultiSearchSelect({ values = [], onChange, options = [], placeholder = 'Adicionar…' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  useEffect(() => {
    if (!open) return
    function h(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const selected   = options.filter(o => values.includes(String(o.value)))
  const unselected = options.filter(o => !values.includes(String(o.value)))
  const filtered   = unselected.filter(o => {
    const q = query.toLowerCase()
    return !q || o.label.toLowerCase().includes(q) || (o.sublabel || '').toLowerCase().includes(q)
  }).slice(0, 8)

  function toggle(val) {
    const v = String(val)
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v])
  }

  return (
    <div ref={ref} style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {/* Chips das seleções */}
      {selected.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {selected.map(o => (
            <span key={o.value} style={{ display:'inline-flex', alignItems:'center', gap:5,
              padding:'3px 8px 3px 10px', borderRadius:99, fontSize:12, fontWeight:600,
              background:'rgba(245,158,11,0.1)', color:'#B45309',
              border:'1px solid rgba(245,158,11,0.3)' }}>
              {o.label}
              <button type="button" onClick={() => toggle(o.value)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#B45309',
                  display:'flex', alignItems:'center', padding:0, lineHeight:1, fontSize:12 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Input de busca */}
      <div style={{ position:'relative' }}>
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          placeholder={selected.length > 0 ? '+ Adicionar outro…' : placeholder}
          style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px',
            border:'1px solid var(--border)', borderRadius:7,
            background:'var(--surface2)', color:'var(--text)', fontSize:13,
            fontFamily:'var(--font)', outline:'none' }}
        />
        {open && filtered.length > 0 && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:600,
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
            {filtered.map(opt => (
              <button key={opt.value} type="button"
                onMouseDown={e => { e.preventDefault(); toggle(opt.value); setQuery('') }}
                style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px',
                  border:'none', background:'transparent', cursor:'pointer', textAlign:'left',
                  fontFamily:'var(--font)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{opt.label}</div>
                  {opt.sublabel && <div style={{ fontSize:10, color:'var(--text-muted)' }}>{opt.sublabel}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Micro-components ─────────────────────────────────────────────────────────
function Avatar({ nome, size = 28 }) {
  const initials = nome ? nome.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() : '?'
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:700, color:'var(--text-soft)', fontFamily:'var(--mono)', flexShrink:0 }}>
      {initials}
    </div>
  )
}

function PersonaTag({ personaId, personas }) {
  const p = personas.find(x => x.id === personaId || x.slug === personaId)
  if (!p) return <span style={{ fontSize:11, color:'var(--text-muted)' }}>{personaId}</span>
  const bg = p.cor + '22'
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, color:p.cor, background:bg }}>
      {p.label}
    </span>
  )
}

function StatusTag({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pendente
  const Icon = status === 'pago' ? CheckCircle2 : status === 'cancelado' ? XCircle : Clock
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:99, fontSize:11, fontWeight:600, color:cfg.color, background:cfg.bg }}><Icon size={11} strokeWidth={2.5} />{cfg.label}</span>
}

function TipoBadge({ tipoId }) {
  const cfg = TIPO_CALCULO_CFG[tipoId] || TIPO_CALCULO_CFG.percentual_fixo
  const Icon = tipoId === 'cadeia_repasse' ? Link2 : tipoId === 'escalonado' ? BarChart2 : Percent
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:600, color:cfg.color, background:cfg.bg }}><Icon size={10} strokeWidth={2.5} />{cfg.label}</span>
}

// ─── PeriodPopover ────────────────────────────────────────────────────────────
function PeriodPopover({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const label = PERIOD_OPTIONS.find(o => o.id === value)?.label || 'Período'
  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, cursor:'pointer', background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-soft)', fontSize:13, fontFamily:'var(--font)', fontWeight:500, whiteSpace:'nowrap' }}>
        <Calendar size={SZ} strokeWidth={1.75} />{label}<ChevronDown size={13} strokeWidth={2} style={{ opacity:0.6, marginLeft:2 }} />
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:200, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'var(--shadow)', minWidth:200, overflow:'hidden' }}>
          {PERIOD_OPTIONS.map(o => (
            <button key={o.id} onClick={() => { onChange(o.id); setOpen(false) }} style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 14px', background:value===o.id?'var(--surface2)':'none', border:'none', cursor:'pointer', fontSize:13, color:value===o.id?'var(--text)':'var(--text-soft)', fontFamily:'var(--font)', fontWeight:value===o.id?600:400 }}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── EscalaEditor ─────────────────────────────────────────────────────────────
function EscalaEditor({ rows, onChange, valueKey, valueLabel, accentColor = '#6366F1' }) {
  function update(i, field, val) { onChange(rows.map((r, ri) => ri === i ? { ...r, [field]: val } : r)) }
  function addRow()  { onChange([...rows, { label: '', min_pct: 0, max_pct: null, [valueKey]: 0 }]) }
  function remove(i) { onChange(rows.filter((_, ri) => ri !== i)) }

  const numStyle = { width:'100%', padding:'5px 8px', borderRadius:6, fontSize:12, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'var(--mono)', textAlign:'right', outline:'none', boxSizing:'border-box' }
  const txtStyle = { ...numStyle, textAlign:'left', fontFamily:'var(--font)' }

  return (
    <div>
      <div style={{ border:'1px solid var(--border)', borderRadius:9, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 90px 32px', background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
          {['Faixa / rótulo', 'De (%)', 'Até (%)', valueLabel, ''].map((h, i) => (
            <div key={i} style={{ padding:'7px 10px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', textAlign: i>=2?'right':'left' }}>{h}</div>
          ))}
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 90px 32px', borderBottom: i<rows.length-1?'1px solid var(--border)':'none', alignItems:'center' }}>
            <div style={{ padding:'6px 8px' }}><input style={txtStyle} value={row.label} onChange={e => update(i,'label',e.target.value)} placeholder="Ex: ≥ 110%" /></div>
            <div style={{ padding:'6px 8px' }}><input type="number" style={numStyle} value={row.min_pct} onChange={e => update(i,'min_pct',parseFloat(e.target.value)||0)} /></div>
            <div style={{ padding:'6px 8px' }}><input type="number" style={numStyle} value={row.max_pct??''} onChange={e => update(i,'max_pct',e.target.value===''?null:parseFloat(e.target.value))} placeholder="—" /></div>
            <div style={{ padding:'6px 8px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                <input type="number" style={numStyle} value={row[valueKey]} onChange={e => update(i,valueKey,parseFloat(e.target.value)||0)} />
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>%</span>
              </div>
            </div>
            <div style={{ padding:'4px', display:'flex', justifyContent:'center' }}>
              <button onClick={() => remove(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex', alignItems:'center' }}><X size={12} strokeWidth={2} /></button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addRow} style={{ marginTop:8, padding:'5px 12px', borderRadius:7, background:'none', border:`1px dashed ${accentColor}`, color:accentColor, fontSize:12, cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, opacity:0.8 }}>
        + Adicionar faixa
      </button>
    </div>
  )
}

// ─── FormulaPreview ───────────────────────────────────────────────────────────
function FormulaPreview({ repasse, base, pct, exemplo = 3500 }) {
  const r = Number(repasse) || 0
  const b = Number(base) || 0
  const p = Number(pct) || 0
  const liquido   = exemplo * r / 100
  const baseVal   = liquido * b / 100
  const comissao  = baseVal * p / 100
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>Prévia do cálculo (exemplo: bruto {fmt(exemplo)})</div>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        {[
          { label:'Valor bruto',     value: fmt(exemplo),  note:'cliente paga' },
          null,
          { label:`Repasse ${fmtPct(r)}`, value: fmt(liquido),  note:'líquido NG' },
          null,
          { label:`Base ${fmtPct(b)}`,    value: fmt(baseVal),  note:'base de cálculo' },
          null,
          { label:`Comissão ${fmtPct(p)}`,value: fmt(comissao), note:'resultado', highlight: true },
        ].map((item, i) => item === null
          ? <ChevronRight key={i} size={14} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />
          : (
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>{item.label}</div>
              <div style={{ fontSize:15, fontWeight:800, fontFamily:'var(--mono)', color: item.highlight ? '#10B981' : 'var(--text)', whiteSpace:'nowrap' }}>{item.value}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{item.note}</div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── ConditionBuilder ─────────────────────────────────────────────────────────
function ConditionBuilder({ conditions, onChange }) {
  function addRow() {
    const entidade = ENTIDADES_ELEGIBILIDADE[0]
    const campo    = entidade.campos[0]
    const ops      = OPERADORES_POR_TIPO[campo.tipo] || OPERADORES_POR_TIPO.texto
    onChange([...conditions, { id: uid(), entidade: entidade.id, campo: campo.id, operador: ops[0].id, valor: '', label: '' }])
  }
  function remove(id) { onChange(conditions.filter(c => c.id !== id)) }
  function update(id, patch) {
    onChange(conditions.map(c => {
      if (c.id !== id) return c
      const next = { ...c, ...patch }
      // auto-label
      const ent   = ENTIDADES_ELEGIBILIDADE.find(e => e.id === next.entidade)
      const campo = ent?.campos.find(f => f.id === next.campo)
      next.label = ent && campo ? `${ent.label} › ${campo.label} ${next.operador} "${next.valor}"` : ''
      return next
    }))
  }
  function changeEntidade(id, entId) {
    const ent   = ENTIDADES_ELEGIBILIDADE.find(e => e.id === entId)
    const campo = ent?.campos[0]
    const ops   = campo ? (OPERADORES_POR_TIPO[campo.tipo] || OPERADORES_POR_TIPO.texto) : []
    update(id, { entidade: entId, campo: campo?.id || '', operador: ops[0]?.id || '=', valor: '' })
  }
  function changeCampo(id, campoId, entId) {
    const ent   = ENTIDADES_ELEGIBILIDADE.find(e => e.id === entId)
    const campo = ent?.campos.find(f => f.id === campoId)
    const ops   = campo ? (OPERADORES_POR_TIPO[campo.tipo] || OPERADORES_POR_TIPO.texto) : []
    update(id, { campo: campoId, operador: ops[0]?.id || '=', valor: '' })
  }

  const sel = { padding:'6px 8px', borderRadius:7, fontSize:12, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'var(--font)', outline:'none', cursor:'pointer' }
  const inp = { ...sel, flex:'1 1 120px', minWidth:80 }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {conditions.length === 0 && (
        <div style={{ padding:'12px 14px', borderRadius:9, border:'1px dashed var(--border2)', background:'var(--surface2)', fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
          Nenhuma condição — a comissão se aplica a todos os casos elegíveis.
        </div>
      )}
      {conditions.map(cond => {
        const ent   = ENTIDADES_ELEGIBILIDADE.find(e => e.id === cond.entidade)
        const campo = ent?.campos.find(f => f.id === cond.campo)
        const ops   = campo ? (OPERADORES_POR_TIPO[campo.tipo] || OPERADORES_POR_TIPO.texto) : OPERADORES_POR_TIPO.texto
        return (
          <div key={cond.id} style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', padding:'10px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9 }}>
            {/* Entidade */}
            <select style={sel} value={cond.entidade} onChange={e => changeEntidade(cond.id, e.target.value)}>
              {ENTIDADES_ELEGIBILIDADE.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            {/* Campo */}
            <select style={sel} value={cond.campo} onChange={e => changeCampo(cond.id, e.target.value, cond.entidade)}>
              {(ent?.campos || []).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            {/* Operador */}
            <select style={{ ...sel, maxWidth:130 }} value={cond.operador} onChange={e => update(cond.id, { operador: e.target.value })}>
              {ops.map(op => <option key={op.id} value={op.id}>{op.l}</option>)}
            </select>
            {/* Valor */}
            {campo?.tipo === 'select' ? (
              <select style={inp} value={cond.valor} onChange={e => update(cond.id, { valor: e.target.value })}>
                <option value="">— selecione —</option>
                {(campo.opcoes || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : campo?.tipo === 'booleano' ? (
              <select style={inp} value={cond.valor} onChange={e => update(cond.id, { valor: e.target.value })}>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            ) : (
              <input
                style={inp}
                type={campo?.tipo === 'numero' ? 'number' : 'text'}
                value={cond.valor}
                onChange={e => update(cond.id, { valor: e.target.value })}
                placeholder={campo?.tipo === 'numero' ? '0' : 'valor…'}
              />
            )}
            <button onClick={() => remove(cond.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px', display:'flex', alignItems:'center', flexShrink:0 }}>
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        )
      })}
      <button onClick={addRow} style={{ alignSelf:'flex-start', padding:'6px 13px', borderRadius:7, background:'none', border:'1px dashed var(--accent)', color:'var(--accent)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
        <Plus size={12} strokeWidth={2.5} /> Adicionar condição
      </button>
      {conditions.length > 0 && (
        <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:5 }}>
          <Info size={11} strokeWidth={2} />
          Todas as condições devem ser verdadeiras (AND) para a comissão ser paga.
        </div>
      )}
    </div>
  )
}

// ─── RuleModal ────────────────────────────────────────────────────────────────
function RuleModal({ initial, personas, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const base = initial ? { ...EMPTY_RULE, ...initial } : { ...EMPTY_RULE }
    // garantir persona_percentuais para todas personas atuais
    const existingIds = (base.persona_percentuais || []).map(p => p.persona_id)
    const merged = [
      ...(base.persona_percentuais || []),
      ...personas.filter(p => !existingIds.includes(p.id)).map(p => ({ persona_id: p.id, cdu_pct: 0, sms_pct: 0, servicos_pct: 0 })),
    ]
    return { ...base, persona_percentuais: merged }
  })
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState(null)
  const [contatos]            = useLocalState(CONTATOS_STORAGE_KEY, MOCK_CONTATOS)

  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const tipos  = form.tipos_calculo_arr || ['percentual_fixo']

  function toggleTipo(id) {
    const cur = tipos
    if (cur.includes(id)) {
      if (cur.length === 1) return // pelo menos 1
      set('tipos_calculo_arr', cur.filter(t => t !== id))
    } else {
      set('tipos_calculo_arr', [...cur, id])
    }
  }
  const isFixo   = tipos.includes('percentual_fixo')
  const isCadeia = tipos.includes('cadeia_repasse')
  const isEscal  = tipos.includes('escalonado')

  async function submit() {
    if (!form.nome.trim()) { setErr('Informe o nome da regra.'); return }
    if (form.escopo_interno && !form.beneficiario_id) { setErr('Selecione o usuário do sistema para o escopo Interno.'); return }
    if (form.escopo_externo && !form.contato_id)      { setErr('Selecione o Contato Canal para o escopo Externo.'); return }
    if (isCadeia && (!form.repasse_origem_pct || !form.base_calculo_pct || !form.percentual_comissao)) {
      setErr('Preencha todos os campos da cadeia de repasse.'); return
    }
    setSaving(true); setErr(null)
    try {
      await new Promise(r => setTimeout(r, 300))
      onSave({ ...form, id: form.id || `r${Date.now()}` })
    } catch (e) { setErr(e.message || 'Erro ao salvar regra.') }
    finally     { setSaving(false) }
  }

  const IN = { padding:'7px 10px', borderRadius:7, fontSize:13, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'var(--font)', boxSizing:'border-box', outline:'none', width:'100%' }
  const LB = { fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', display:'block', marginBottom:5 }
  const SEC = { display:'flex', flexDirection:'column', gap:12 }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)', padding:16 }}>
      <div style={{ background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:720, maxHeight:'93vh', display:'flex', flexDirection:'column', boxShadow:'var(--shadow)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Percent size={15} strokeWidth={1.75} style={{ color:'#6366F1' }} />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{form.id ? 'Editar Regra' : 'Nova Regra de Comissão'}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>Configure o modelo de cálculo e as condições de elegibilidade</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}><X size={18} strokeWidth={2} /></button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'22px', display:'flex', flexDirection:'column', gap:24 }}>

          {/* ── Identificação ───────────────────────────────────────────── */}
          <div style={SEC}>
            <SectionTitle icon={<Info size={13} strokeWidth={2} />} label="Identificação" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column' }}>
                <label style={LB}>Nome da regra *</label>
                <input style={IN} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Recorrente Quírons — Inside Sales Sênior" />
              </div>
              <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column' }}>
                <label style={LB}>Descrição curta</label>
                <input style={IN} value={form.descricao||''} onChange={e => set('descricao', e.target.value)} placeholder="Resumo em uma linha do objetivo desta regra" />
              </div>
              <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column' }}>
                <label style={LB}>Contexto e motivação</label>
                <textarea rows={3} style={{ ...IN, resize:'vertical' }} value={form.contexto||''} onChange={e => set('contexto', e.target.value)} placeholder="Explique o porquê desta regra: origem, produto, campanha, nível de seniority, etc." />
              </div>
              <div style={{ display:'flex', flexDirection:'column' }}>
                <label style={LB}>Vigência início</label>
                <input type="date" style={IN} value={form.vigencia_inicio||''} onChange={e => set('vigencia_inicio', e.target.value||null)} />
              </div>
              <div style={{ display:'flex', flexDirection:'column' }}>
                <label style={LB}>Vigência fim <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(vazio = indeterminado)</span></label>
                <input type="date" style={IN} value={form.vigencia_fim||''} onChange={e => set('vigencia_fim', e.target.value||null)} />
              </div>
            </div>
            <div style={{ display:'flex', gap:20 }}>
              <Toggle value={form.ativo}        onChange={v => set('ativo', v)}        label="Regra ativa" />
              <Toggle value={form.revisao_anual} onChange={v => set('revisao_anual', v)} label="Revisão anual" />
            </div>
          </div>

          {/* ── Escopo ──────────────────────────────────────────────────── */}
          <div style={SEC}>
            <SectionTitle icon={<User size={13} strokeWidth={2} />} label="Escopo" />
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:-6 }}>Selecione um ou ambos os escopos — podem ser aplicados simultaneamente.</div>
            <div style={{ display:'flex', gap:10 }}>
              {[
                { key:'escopo_interno', label:'Interna', desc:'Vinculada a usuário do sistema', icon: <User size={14} strokeWidth={1.75} />, color:'#6366F1' },
                { key:'escopo_externo', label:'Externa', desc:'Vinculada a Contato Canal',      icon: <Users size={14} strokeWidth={1.75} />, color:'#10B981' },
              ].map(opt => {
                const active = !!form[opt.key]
                return (
                  <button key={opt.key} type="button" onClick={() => set(opt.key, !active)}
                    style={{ flex:1, padding:'12px 14px', borderRadius:10, cursor:'pointer', textAlign:'left',
                      border: active ? `2px solid ${opt.color}` : '2px solid var(--border)',
                      background: active ? `${opt.color}12` : 'var(--surface2)', transition:'all 0.15s', position:'relative' }}>
                    {active && (
                      <div style={{ position:'absolute', top:8, right:8, width:16, height:16, borderRadius:'50%',
                        background:opt.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <CheckCircle2 size={10} strokeWidth={3} color="#fff" />
                      </div>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:7, color:active?opt.color:'var(--text-muted)', marginBottom:5 }}>
                      {opt.icon}
                      <span style={{ fontSize:13, fontWeight:700, color:active?opt.color:'var(--text)' }}>{opt.label}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{opt.desc}</div>
                  </button>
                )
              })}
            </div>

            {form.escopo_interno && (
              <div style={{ display:'flex', flexDirection:'column' }}>
                <label style={LB}>Usuário do sistema *</label>
                <div style={{ ...IN, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                  <InlineSearchSelect
                    value={form.beneficiario_id || ''}
                    onChange={id => {
                      const u = MOCK_USUARIOS.find(u => u.id === id)
                      set('beneficiario_id', id)
                      set('beneficiario_nome', u?.nome || '')
                    }}
                    options={[
                      { value:'', label:'— Selecionar usuário —' },
                      ...MOCK_USUARIOS.map(u => ({ value: u.id, label: u.nome, sublabel: u.cargo, avatar: u.avatar }))
                    ]}
                    placeholder="— Selecionar usuário —"
                  />
                </div>
              </div>
            )}

            {form.escopo_externo && (
              <div style={{ display:'flex', flexDirection:'column' }}>
                <label style={LB}>Contato Canal *</label>
                <div style={{ ...IN, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                  <InlineSearchSelect
                    value={form.contato_id || ''}
                    onChange={id => {
                      const c = contatos.find(c => c.id === id)
                      set('contato_id', id)
                      set('contato_nome', c?.nome || '')
                      set('contato_empresa', c?.empresa_nome || '')
                    }}
                    options={[
                      { value:'', label:'— Selecionar contato —' },
                      ...contatos.map(c => ({ value: c.id, label: c.nome, sublabel: `${c.cargo} · ${c.empresa_nome}`, avatar: c.nome.slice(0,2).toUpperCase() }))
                    ]}
                    placeholder="— Selecionar contato —"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Produto / Categoria ─────────────────────────────────────── */}
          <div style={SEC}>
            <SectionTitle icon={<BarChart2 size={13} strokeWidth={2} />} label="Produto / Categoria" />
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:-6 }}>Restrinja a regra a um produto específico ou a uma categoria de produtos.</div>
            <div style={{ display:'flex', gap:10 }}>
              {[
                { id: null,        label: 'Todos',    desc: 'Sem restrição de produto ou categoria' },
                { id: 'produto',   label: 'Produto',  desc: 'Vinculada a um produto específico' },
                { id: 'categoria', label: 'Categoria', desc: 'Vinculada a uma categoria de produtos' },
              ].map(opt => {
                const active = form.produto_filtro_tipo === opt.id
                return (
                  <button key={String(opt.id)} type="button"
                    onClick={() => set('produto_filtro_tipo', active ? null : opt.id)}
                    style={{ flex:1, padding:'10px 12px', borderRadius:10, cursor:'pointer', textAlign:'left',
                      border: active ? '2px solid #F59E0B' : '2px solid var(--border)',
                      background: active ? 'rgba(245,158,11,0.08)' : 'var(--surface2)', transition:'all 0.15s', position:'relative' }}>
                    {active && (
                      <div style={{ position:'absolute', top:7, right:7, width:14, height:14, borderRadius:'50%',
                        background:'#F59E0B', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <CheckCircle2 size={9} strokeWidth={3} color="#fff" />
                      </div>
                    )}
                    <div style={{ fontSize:13, fontWeight:700, color: active ? '#B45309' : 'var(--text)', marginBottom:3 }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{opt.desc}</div>
                  </button>
                )
              })}
            </div>

            {form.produto_filtro_tipo === 'produto' && (
              <div style={{ display:'flex', flexDirection:'column' }}>
                <label style={LB}>Produtos *</label>
                <MultiSearchSelect
                  values={form.produto_ids || []}
                  onChange={ids => set('produto_ids', ids)}
                  options={MOCK_PRODUTOS.filter(p => p.status === 'ativo').map(p => ({
                    value: String(p.id), label: p.nome, sublabel: `${p.codigo} · ${p.categoria}`
                  }))}
                  placeholder="Buscar produto…"
                />
              </div>
            )}

            {form.produto_filtro_tipo === 'categoria' && (() => {
              const cats = [...new Set(MOCK_PRODUTOS.map(p => p.categoria).filter(Boolean))].sort()
              return (
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <label style={LB}>Categorias *</label>
                  <MultiSearchSelect
                    values={form.produto_categorias || []}
                    onChange={cats => set('produto_categorias', cats)}
                    options={cats.map(c => ({ value: c, label: c }))}
                    placeholder="Buscar categoria…"
                  />
                </div>
              )
            })()}
          </div>

          {/* ── Tipos de Cálculo (multi-select) ─────────────────────────── */}
          <div style={SEC}>
            <SectionTitle icon={<Zap size={13} strokeWidth={2} />} label="Tipos de Cálculo" />
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:-6 }}>Selecione um ou mais tipos — todos os marcados serão aplicados simultaneamente.</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {Object.entries(TIPO_CALCULO_CFG).map(([id, cfg]) => {
                const Icon = id === 'cadeia_repasse' ? Link2 : id === 'escalonado' ? BarChart2 : Percent
                const sel  = tipos.includes(id)
                return (
                  <button key={id} type="button" onClick={() => toggleTipo(id)} style={{ padding:'14px 12px', borderRadius:10, cursor:'pointer', textAlign:'left', border: sel ? `2px solid ${cfg.color}` : '2px solid var(--border)', background: sel ? cfg.bg : 'var(--surface2)', transition:'all 0.15s', position:'relative' }}>
                    {sel && (
                      <div style={{ position:'absolute', top:8, right:8, width:16, height:16, borderRadius:'50%', background:cfg.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <CheckCircle2 size={10} strokeWidth={3} color="#fff" />
                      </div>
                    )}
                    <Icon size={18} strokeWidth={1.75} style={{ color: cfg.color, marginBottom:8, display:'block' }} />
                    <div style={{ fontSize:12, fontWeight:700, color: sel ? cfg.color : 'var(--text)', marginBottom:4 }}>{cfg.label}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.45 }}>{cfg.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Percentual Fixo ──────────────────────────────────────────── */}
          {isFixo && (
            <div style={SEC}>
              <SectionTitle icon={<Percent size={13} strokeWidth={2} />} label="Percentuais por Persona × Tipo de Receita" />
              <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:`140px repeat(${RECEITA_TIPOS.length},1fr)`, background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase' }}>Persona</div>
                  {RECEITA_TIPOS.map(t => <div key={t} style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', textAlign:'center' }}>{t}</div>)}
                </div>
                {personas.filter(p => p.ativo).map((p, pi) => (
                  <div key={p.id} style={{ display:'grid', gridTemplateColumns:`140px repeat(${RECEITA_TIPOS.length},1fr)`, borderBottom:pi<personas.filter(x=>x.ativo).length-1?'1px solid var(--border)':'none', alignItems:'center' }}>
                    <div style={{ padding:'10px 12px', display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:p.cor, flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.label}</span>
                    </div>
                    {RECEITA_TIPOS.map(tipo => (
                      <div key={tipo} style={{ padding:'8px 10px', display:'flex', alignItems:'center', gap:4 }}>
                        <input type="number" min={0} max={100} step={0.5}
                          value={getPerc(form.persona_percentuais, p.id, tipo)}
                          onChange={e => set('persona_percentuais', setPerc(form.persona_percentuais, p.id, tipo, e.target.value))}
                          style={{ ...IN, textAlign:'right', paddingRight:6 }}
                        />
                        <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>%</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Cadeia de Repasse ────────────────────────────────────────── */}
          {isCadeia && (
            <div style={SEC}>
              <SectionTitle icon={<Link2 size={13} strokeWidth={2} />} label="Parâmetros da Cadeia de Repasse" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                {[
                  { key:'repasse_origem_pct',  label:'Repasse fabricante/dist. (%)', placeholder:'Ex: 50 (TOTVS→NG recorrente)' },
                  { key:'base_calculo_pct',    label:'Base sobre líquido NG (%)',     placeholder:'Ex: 39 (Quírons) ou 100 (CDU)' },
                  { key:'percentual_comissao', label:'% comissão sobre a base',       placeholder:'Ex: 5' },
                ].map(f => (
                  <div key={f.key} style={{ display:'flex', flexDirection:'column' }}>
                    <label style={LB}>{f.label}</label>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <input type="number" min={0} max={100} step={0.5} value={form[f.key]??''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} style={{ ...IN }} />
                      <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
              <FormulaPreview repasse={form.repasse_origem_pct} base={form.base_calculo_pct} pct={form.percentual_comissao} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <label style={LB}>Tipo de recorrência</label>
                  <select style={IN} value={form.tipo_recorrencia} onChange={e => set('tipo_recorrencia', e.target.value)}>
                    {Object.entries(TIPO_RECORRENCIA_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:5 }}>{TIPO_RECORRENCIA_CFG[form.tipo_recorrencia]?.desc}</span>
                </div>
                {form.tipo_recorrencia === 'prazo_fixo' && (
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <label style={LB}>Prazo (meses)</label>
                    <input type="number" min={1} style={IN} value={form.prazo_meses||''} onChange={e => set('prazo_meses', parseInt(e.target.value)||null)} placeholder="Ex: 18 (Quírons)" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Escalonado por Meta ──────────────────────────────────────── */}
          {isEscal && (
            <div style={SEC}>
              <SectionTitle icon={<BarChart2 size={13} strokeWidth={2} />} label="Escala de Comissão Individual" />
              <EscalaEditor rows={form.escala_individual || DEFAULT_ESCALA_INDIVIDUAL} onChange={v => set('escala_individual', v)} valueKey="comissao_pct" valueLabel="Comissão (%)" accentColor="#F59E0B" />
              <div style={{ marginTop:4 }}>
                <SectionTitle icon={<TrendingUp size={13} strokeWidth={2} />} label="Bônus de Equipe" />
              </div>
              <EscalaEditor rows={form.escala_equipe || DEFAULT_ESCALA_EQUIPE} onChange={v => set('escala_equipe', v)} valueKey="bonus_pct" valueLabel="Bônus (%)" accentColor="#10B981" />
              <div style={{ display:'flex', flexDirection:'column' }}>
                <label style={LB}>Condição para bônus de equipe</label>
                <input style={IN} value={form.condicao_bonus_equipe||''} onChange={e => set('condicao_bonus_equipe', e.target.value)} placeholder="Ex: Exige atingimento prévio da meta individual" />
              </div>
            </div>
          )}

          {/* ── Elegibilidade ────────────────────────────────────────────── */}
          <div style={SEC}>
            <SectionTitle icon={<Filter size={13} strokeWidth={2} />} label="Condições de Elegibilidade" />
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:-6 }}>
              A comissão só é paga quando todas as condições abaixo forem atendidas.
            </div>
            <ConditionBuilder conditions={form.condicoes_elegibilidade||[]} onChange={v => set('condicoes_elegibilidade', v)} />
            <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginTop:4 }}>
              <Toggle value={form.exige_participacao_venda} onChange={v => set('exige_participacao_venda',v)} label="Exige participação na venda" />
              <Toggle value={form.cessa_no_cancelamento}    onChange={v => set('cessa_no_cancelamento',v)}    label="Cessa no cancelamento" />
            </div>
            <div style={{ display:'flex', flexDirection:'column' }}>
              <label style={LB}>Notas adicionais</label>
              <textarea rows={2} style={{ ...IN, resize:'vertical' }} value={form.notas_elegibilidade||''} onChange={e => set('notas_elegibilidade',e.target.value)} placeholder="Observações, exceções ou restrições adicionais." />
            </div>
          </div>

          {err && (
            <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 12px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:13 }}>
              <AlertCircle size={14} strokeWidth={2} />{err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={submit} style={{ background:'#6366F1' }}>
            {form.id ? 'Salvar alterações' : 'Criar regra'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── PersonasEditor ───────────────────────────────────────────────────────────
function PersonasEditor({ personas, onChange, onClose }) {
  const [list, setList] = useState(personas.map(p => ({ ...p })))
  const [editing, setEditing] = useState(null) // id sendo editado inline
  const colors = ['#6366F1','#0EA5E9','#F59E0B','#10B981','#8B5CF6','#EF4444','#EC4899','#14B8A6','#F97316','#84CC16']

  function add() {
    const novo = { id: uid(), slug: `persona_${uid()}`, label: 'Novo Persona', descricao: '', cor: colors[list.length % colors.length], ordem: list.length, ativo: true }
    setList(l => [...l, novo])
    setEditing(novo.id)
  }
  function remove(id) { setList(l => l.filter(p => p.id !== id)) }
  function update(id, patch) { setList(l => l.map(p => p.id === id ? { ...p, ...patch } : p)) }
  function toggleAtivo(id) { update(id, { ativo: !list.find(p=>p.id===id)?.ativo }) }
  function save() { onChange(list); onClose() }

  const IN = { padding:'6px 9px', borderRadius:6, fontSize:13, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'var(--font)', outline:'none' }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)', padding:16 }}>
      <div style={{ background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:540, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Users size={14} strokeWidth={1.75} style={{ color:'#6366F1' }} />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Gerenciar Personas</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Personas definem os perfis de beneficiários nas regras</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}><X size={18} strokeWidth={2} /></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 22px', display:'flex', flexDirection:'column', gap:8 }}>
          {list.map(p => (
            <div key={p.id} style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', opacity:p.ativo?1:0.55 }}>
              {editing === p.id ? (
                <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10, background:'var(--surface2)' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Rótulo *</div>
                      <input style={{ ...IN, width:'100%', boxSizing:'border-box' }} value={p.label} onChange={e => update(p.id, { label: e.target.value })} placeholder="Ex: Inside Sales Sênior" autoFocus />
                    </div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Slug (interno)</div>
                      <input style={{ ...IN, width:'100%', boxSizing:'border-box', fontFamily:'var(--mono)' }} value={p.slug} onChange={e => update(p.id, { slug: e.target.value.replace(/\s+/g,'_') })} placeholder="inside_sales_sr" />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Descrição</div>
                      <input style={{ ...IN, width:'100%', boxSizing:'border-box' }} value={p.descricao||''} onChange={e => update(p.id, { descricao: e.target.value })} placeholder="Breve descrição do perfil" />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Cor</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {colors.map(c => (
                          <button key={c} type="button" onClick={() => update(p.id, { cor: c })} style={{ width:24, height:24, borderRadius:'50%', background:c, border: p.cor===c ? `3px solid var(--text)` : '3px solid transparent', cursor:'pointer', outline:'none', transition:'border 0.1s' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                    <button type="button" onClick={() => setEditing(null)} style={{ padding:'6px 14px', borderRadius:7, background:'#6366F1', border:'none', color:'#fff', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 }}>Concluído</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:10, height:10, borderRadius:'50%', background:p.cor, flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.label}</div>
                      {p.descricao && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.descricao}</div>}
                    </div>
                    <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', background:'var(--surface2)', padding:'2px 6px', borderRadius:4, border:'1px solid var(--border)' }}>{p.slug}</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => toggleAtivo(p.id)} style={{ padding:'4px 10px', borderRadius:6, background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>{p.ativo?'Desativar':'Ativar'}</button>
                    <button onClick={() => setEditing(p.id)} style={{ padding:'4px 8px', borderRadius:6, background:'none', border:'1px solid var(--border)', color:'var(--text-soft)', cursor:'pointer', display:'flex', alignItems:'center' }}><Pencil size={12} strokeWidth={2} /></button>
                    <button onClick={() => remove(p.id)} style={{ padding:'4px 8px', borderRadius:6, background:'none', border:'1px solid rgba(239,68,68,0.3)', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center' }}><Trash2 size={12} strokeWidth={2} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={add} style={{ padding:'9px 14px', borderRadius:9, background:'none', border:'1px dashed var(--border2)', color:'var(--text-muted)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, display:'flex', alignItems:'center', gap:7, marginTop:4 }}>
            <Plus size={13} strokeWidth={2.5} /> Adicionar persona
          </button>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <Button variant="secondary" onClick={onClose}>Descartar</Button>
          <Button onClick={save} style={{ background:'#6366F1' }}>Salvar personas</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers de layout ────────────────────────────────────────────────────────
function SectionTitle({ icon, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, paddingBottom:2, borderBottom:'1px solid var(--border)', marginBottom:4 }}>
      <span style={{ color:'var(--text-muted)' }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase' }}>{label}</span>
    </div>
  )
}

function Toggle({ value, onChange, label }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', userSelect:'none' }}>
      <div onClick={() => onChange(!value)} style={{ width:34, height:19, borderRadius:99, position:'relative', cursor:'pointer', background:value?'#6366F1':'var(--border)', transition:'background 0.2s', flexShrink:0 }}>
        <div style={{ position:'absolute', top:2, left:value?17:2, width:15, height:15, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
      <span style={{ fontSize:13, color:'var(--text-soft)' }}>{label}</span>
    </label>
  )
}

function EscalaReadonly({ rows, valueKey, title, accent }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>{title}</div>
      <div style={{ border:'1px solid var(--border)', borderRadius:9, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
          <div style={{ padding:'6px 10px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase' }}>Faixa</div>
          <div style={{ padding:'6px 10px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', textAlign:'right' }}>%</div>
        </div>
        {(rows||[]).map((row,i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px', borderBottom:i<rows.length-1?'1px solid var(--border)':'none', alignItems:'center' }}>
            <div style={{ padding:'8px 10px', fontSize:12, color:'var(--text-soft)' }}>{row.label}</div>
            <div style={{ padding:'8px 10px', textAlign:'right' }}>
              <span style={{ fontSize:13, fontWeight:800, fontFamily:'var(--mono)', color: Number(row[valueKey])===0?'var(--text-muted)':accent }}>
                {Number(row[valueKey])===0?'—':fmtPct(row[valueKey])}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InfoPill({ icon, label, color }) {
  const rgb = color==='#10B981'?'16,185,129':color==='#F59E0B'?'245,158,11':'239,68,68'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background:`rgba(${rgb},0.08)`, border:`1px solid rgba(${rgb},0.2)`, fontSize:11, fontWeight:600, color }}>
      {icon}{label}
    </div>
  )
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────
function PaymentModal({ initial, rules, personas, onSave, onClose }) {
  const [form, setForm] = useState(() => initial ? { ...initial } : { ...EMPTY_PAYMENT })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedRule = rules.find(r => r.id === form.rule_id)

  const comissaoCalculada = useMemo(() => {
    const base = parseFloat(form.valor_base) || 0
    const pct  = parseFloat(form.percentual) || 0
    return (base * pct / 100).toFixed(2)
  }, [form.valor_base, form.percentual])

  useEffect(() => {
    if (selectedRule?.tipos_calculo_arr?.includes('cadeia_repasse') && selectedRule.percentual_comissao) {
      set('percentual', selectedRule.percentual_comissao)
    }
  }, [form.rule_id])

  async function submit() {
    if (!form.beneficiario_nome.trim()) { setErr('Informe o beneficiário.'); return }
    if (!form.data_vencimento)          { setErr('Informe a data de vencimento.'); return }
    if (!form.valor_base || parseFloat(form.valor_base) <= 0) { setErr('Informe um valor base válido.'); return }
    setSaving(true); setErr(null)
    try {
      await new Promise(r => setTimeout(r, 300))
      onSave({ ...form, id: form.id||`p${Date.now()}`, valor_base: parseFloat(form.valor_base), percentual: parseFloat(form.percentual), valor_comissao: parseFloat(comissaoCalculada) })
    } catch (e) { setErr(e.message || 'Erro ao salvar lançamento.') }
    finally     { setSaving(false) }
  }

  const IN = { width:'100%', padding:'7px 10px', borderRadius:7, fontSize:13, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'var(--font)', boxSizing:'border-box', outline:'none' }
  const LB = { fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', display:'block', marginBottom:5 }
  const F  = { display:'flex', flexDirection:'column' }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)', padding:16 }}>
      <div style={{ background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:560, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'var(--shadow)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(16,185,129,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <DollarSign size={15} strokeWidth={1.75} style={{ color:'#10B981' }} />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{form.id ? 'Editar Lançamento' : 'Novo Lançamento'}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>Registre um repasse de comissão</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}><X size={18} strokeWidth={2} /></button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ ...F, gridColumn:'1/-1' }}>
              <label style={LB}>Beneficiário *</label>
              <div style={{ ...IN, padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                <InlineSearchSelect
                  value={form.beneficiario_id || ''}
                  onChange={id => {
                    const u = MOCK_USUARIOS.find(u => u.id === id)
                    set('beneficiario_id', id)
                    set('beneficiario_nome', u?.nome || '')
                  }}
                  options={[
                    { value:'', label:'— Selecionar usuário —' },
                    ...MOCK_USUARIOS.map(u => ({ value: u.id, label: u.nome, sublabel: u.cargo, avatar: u.avatar }))
                  ]}
                  placeholder="— Selecionar usuário —"
                />
              </div>
            </div>
            <div style={F}>
              <label style={LB}>Persona</label>
              <select style={IN} value={form.persona} onChange={e=>set('persona',e.target.value)}>
                {personas.filter(p=>p.ativo).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div style={F}>
              <label style={LB}>Regra aplicada</label>
              <select style={IN} value={form.rule_id||''} onChange={e=>set('rule_id',e.target.value||null)}>
                <option value="">— Nenhuma regra —</option>
                {rules.filter(r=>r.ativo).map(r=><option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
            {selectedRule && (
              <div style={{ ...F, gridColumn:'1/-1' }}>
                <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  {(selectedRule.tipos_calculo_arr||['percentual_fixo']).map(t => <TipoBadge key={t} tipoId={t} />)}
                  {selectedRule.tipos_calculo_arr?.includes('cadeia_repasse') && (
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                      Repasse {fmtPct(selectedRule.repasse_origem_pct||0)} × Base {fmtPct(selectedRule.base_calculo_pct||0)} × Comissão {fmtPct(selectedRule.percentual_comissao||0)}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div style={F}><label style={LB}>Tipo de receita</label><select style={IN} value={form.receita_tipo} onChange={e=>set('receita_tipo',e.target.value)}>{RECEITA_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div style={F}><label style={LB}>Valor base (R$)</label><input type="number" min={0} step={0.01} style={IN} value={form.valor_base} onChange={e=>set('valor_base',e.target.value)} placeholder="0,00" /></div>
            <div style={F}><label style={LB}>Percentual (%)</label><input type="number" min={0} max={100} step={0.5} style={IN} value={form.percentual} onChange={e=>set('percentual',e.target.value)} placeholder="0,00" /></div>
            <div style={{ ...F, gridColumn:'1/-1' }}>
              <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>Comissão calculada</span>
                <span style={{ fontSize:18, fontWeight:800, color:'#10B981', fontFamily:'var(--mono)' }}>{fmt(comissaoCalculada)}</span>
              </div>
            </div>
            <div style={F}><label style={LB}>Competência</label><input type="date" style={IN} value={form.data_competencia} onChange={e=>set('data_competencia',e.target.value)} /></div>
            <div style={F}><label style={LB}>Vencimento *</label><input type="date" style={IN} value={form.data_vencimento} onChange={e=>set('data_vencimento',e.target.value)} /></div>
            <div style={F}><label style={LB}>Data de pagamento</label><input type="date" style={IN} value={form.data_pagamento||''} onChange={e=>set('data_pagamento',e.target.value||null)} /></div>
            <div style={F}><label style={LB}>Status</label><select style={IN} value={form.status} onChange={e=>set('status',e.target.value)}>{Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            <div style={{ ...F, gridColumn:'1/-1' }}><label style={LB}>Descrição / Origem</label><input style={IN} value={form.descricao||''} onChange={e=>set('descricao',e.target.value)} placeholder="Ex: Quírons QRS — MedGroup" /></div>
            <div style={{ ...F, gridColumn:'1/-1' }}><label style={LB}>Notas</label><textarea rows={2} style={{ ...IN, resize:'vertical' }} value={form.notas||''} onChange={e=>set('notas',e.target.value)} /></div>
          </div>
          {err && <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 12px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:13 }}><AlertCircle size={14} strokeWidth={2}/>{err}</div>}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={submit} style={{ background:'#10B981' }}>
            {form.id ? 'Salvar alterações' : 'Registrar lançamento'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Acompanhamento de Repasses ─────────────────────────────────────────
function TabRepasses({ payments, setPayments, rules, personas, period, onEdit }) {
  const [search, setSearch]               = useState('')
  const [filterPersona, setFilterPersona] = useState('todas')
  const [filterStatus, setFilterStatus]   = useState('todos')
  const [filterTipo, setFilterTipo]       = useState('todos')
  const [sort, setSort]                   = useState({ key:'data_vencimento', dir:1 })

  const filtered = useMemo(() => {
    let list = [...payments]
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(p => p.beneficiario_nome.toLowerCase().includes(q)||(p.descricao||'').toLowerCase().includes(q)) }
    if (filterPersona !== 'todas') list = list.filter(p => p.persona === filterPersona)
    if (filterStatus  !== 'todos') list = list.filter(p => p.status  === filterStatus)
    if (filterTipo    !== 'todos') list = list.filter(p => p.receita_tipo === filterTipo)
    list.sort((a, b) => {
      if (sort.key === 'valor_comissao') return (Number(a.valor_comissao) - Number(b.valor_comissao)) * sort.dir
      return String(a[sort.key]??'').localeCompare(String(b[sort.key]??'')) * sort.dir
    })
    return list
  }, [payments, search, filterPersona, filterStatus, filterTipo, sort])

  const totals = useMemo(() => ({
    total:    payments.length,
    pendente: payments.filter(p=>p.status==='pendente').reduce((s,p)=>s+Number(p.valor_comissao),0),
    pago:     payments.filter(p=>p.status==='pago').reduce((s,p)=>s+Number(p.valor_comissao),0),
  }), [payments])

  function markPago(id) { setPayments(prev => prev.map(p => p.id===id ? {...p, status:'pago', data_pagamento:today()} : p)) }
  function deletePayment(id) { if (!window.confirm('Excluir este lançamento?')) return; setPayments(prev => prev.filter(p => p.id!==id)) }
  function toggleSort(key) { setSort(s => s.key===key ? {...s,dir:s.dir*-1} : {key,dir:1}) }

  const TH = (key) => ({ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap', borderBottom:'1px solid var(--border)', background:sort.key===key?'var(--surface2)':'transparent' })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'Total de lançamentos', value:totals.total,    Icon:DollarSign,  color:'#6366F1', bg:'rgba(99,102,241,0.1)',  isCurrency:false },
          { label:'A pagar (pendente)',   value:totals.pendente, Icon:Clock,        color:'#F59E0B', bg:'rgba(245,158,11,0.1)',  isCurrency:true  },
          { label:'Já pago',              value:totals.pago,     Icon:CheckCircle2, color:'#10B981', bg:'rgba(16,185,129,0.1)', isCurrency:true  },
        ].map(m => (
          <div key={m.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:m.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <m.Icon size={17} strokeWidth={1.75} style={{ color:m.color }} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500, marginBottom:3 }}>{m.label}</div>
              <div style={{ fontSize:19, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)', lineHeight:1 }}>{m.isCurrency?fmt(m.value):m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 200px', minWidth:160 }}>
          <Search size={13} strokeWidth={2} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar beneficiário ou descrição…" style={{ width:'100%', padding:'7px 10px 7px 30px', borderRadius:8, fontSize:13, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'var(--font)', outline:'none', boxSizing:'border-box' }} />
        </div>
        <select value={filterPersona} onChange={e=>setFilterPersona(e.target.value)} style={{ padding:'7px 10px', borderRadius:8, fontSize:12, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-soft)', fontFamily:'var(--font)', cursor:'pointer', outline:'none' }}>
          <option value="todas">Todas personas</option>
          {personas.filter(p=>p.ativo).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ padding:'7px 10px', borderRadius:8, fontSize:12, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-soft)', fontFamily:'var(--font)', cursor:'pointer', outline:'none' }}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterTipo} onChange={e=>setFilterTipo(e.target.value)} style={{ padding:'7px 10px', borderRadius:8, fontSize:12, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-soft)', fontFamily:'var(--font)', cursor:'pointer', outline:'none' }}>
          <option value="todos">Todos os tipos</option>
          {RECEITA_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-muted)', fontSize:14 }}>
          <DollarSign size={32} strokeWidth={1} style={{ marginBottom:12, opacity:0.3, display:'block', margin:'0 auto 12px' }} />
          Nenhum lançamento encontrado.
        </div>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {[['beneficiario_nome','Beneficiário'],['persona','Persona'],['receita_tipo','Tipo'],['valor_base','Base / %'],['valor_comissao','Comissão'],['data_vencimento','Vencimento'],['status','Status'],[null,'']].map(([key,lbl]) => (
                  <th key={lbl} style={TH(key)} onClick={() => key && toggleSort(key)}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>{lbl}{key&&<ArrowUpDown size={10} strokeWidth={2} style={{ opacity:sort.key===key?1:0.3 }} />}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id} style={{ background:idx%2===0?'transparent':'rgba(255,255,255,0.012)', borderBottom:idx<filtered.length-1?'1px solid var(--border)':'none' }}>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <Avatar nome={p.beneficiario_nome} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.beneficiario_nome}</div>
                        {p.descricao && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.descricao}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'11px 14px' }}><PersonaTag personaId={p.persona} personas={personas} /></td>
                  <td style={{ padding:'11px 14px' }}><span style={{ fontSize:12, fontWeight:600, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>{p.receita_tipo}</span></td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ fontSize:12, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>{fmt(p.valor_base)}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtPct(p.percentual)}</div>
                  </td>
                  <td style={{ padding:'11px 14px' }}><span style={{ fontSize:14, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmt(p.valor_comissao)}</span></td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <Calendar size={12} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                      <span style={{ fontSize:12, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>{fmtDate(p.data_vencimento)}</span>
                    </div>
                  </td>
                  <td style={{ padding:'11px 14px' }}><StatusTag status={p.status} /></td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      {p.status==='pendente' && (
                        <button onClick={()=>markPago(p.id)} style={{ padding:'4px 8px', borderRadius:6, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#10B981', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', display:'flex', alignItems:'center', gap:4 }}>
                          <CheckCircle2 size={11} strokeWidth={2.5} />Pagar
                        </button>
                      )}
                      <button onClick={()=>onEdit({type:'edit',data:p})} style={{ padding:'4px 6px', borderRadius:6, background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center' }}><Pencil size={12} strokeWidth={2} /></button>
                      <button onClick={()=>deletePayment(p.id)} style={{ padding:'4px 6px', borderRadius:6, background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center' }}><Trash2 size={12} strokeWidth={2} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Regras de Configuração ──────────────────────────────────────────────
function TabRegras({ rules, setRules, personas, setPersonas, onEditRule }) {
  const [deleting, setDeleting]   = useState(null)
  const [showPersonas, setShowPersonas] = useState(false)
  async function deleteRule(id) {
    if (!window.confirm('Excluir esta regra?')) return
    setDeleting(id)
    await new Promise(r => setTimeout(r,200))
    setRules(prev => prev.filter(r => r.id!==id))
    setDeleting(null)
  }
  function toggleAtivo(rule) { setRules(prev => prev.map(r => r.id===rule.id ? {...r,ativo:!r.ativo} : r)) }

  const cardActions = (rule) => (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <button onClick={()=>toggleAtivo(rule)} style={{ padding:'5px 12px', borderRadius:7, background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>{rule.ativo?'Desativar':'Ativar'}</button>
      <button onClick={()=>onEditRule({type:'edit',data:rule})} style={{ padding:'5px 10px', borderRadius:7, background:'none', border:'1px solid var(--border)', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', display:'flex', alignItems:'center', gap:5 }}><Pencil size={12} strokeWidth={2} />Editar</button>
      <button onClick={()=>deleteRule(rule.id)} disabled={deleting===rule.id} style={{ padding:'5px 8px', borderRadius:7, background:'none', border:'1px solid rgba(239,68,68,0.3)', color:'#EF4444', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center' }}>
        {deleting===rule.id ? <Loader2 size={13} strokeWidth={2} style={{ animation:'spin 1s linear infinite' }} /> : <Trash2 size={13} strokeWidth={2} />}
      </button>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Sub-header com botão de personas */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:13, color:'var(--text-muted)' }}>
          {rules.length} {rules.length===1?'regra':'regras'} configuradas
        </div>
        <button onClick={()=>setShowPersonas(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-soft)', fontSize:12, fontFamily:'var(--font)', cursor:'pointer', fontWeight:500 }}>
          <Settings size={13} strokeWidth={1.75} />
          Gerenciar Personas
          <span style={{ marginLeft:4, padding:'1px 7px', borderRadius:99, background:'var(--surface2)', fontSize:11, fontWeight:700, color:'var(--text-muted)', border:'1px solid var(--border)' }}>{personas.filter(p=>p.ativo).length}</span>
        </button>
      </div>

      {rules.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)', fontSize:14 }}>
          <Percent size={36} strokeWidth={1} style={{ marginBottom:14, opacity:0.25, display:'block', margin:'0 auto 14px' }} />
          Nenhuma regra cadastrada.
          <br /><Button onClick={()=>onEditRule('new')} style={{ marginTop:14, background:'#6366F1' }}>+ Criar primeira regra</Button>
        </div>
      ) : (
        rules.map(rule => {
          const tipos = rule.tipos_calculo_arr || [rule.tipo_calculo || 'percentual_fixo']
          const isFixo   = tipos.includes('percentual_fixo')
          const isCadeia = tipos.includes('cadeia_repasse')
          const isEscal  = tipos.includes('escalonado')
          const isCombo  = tipos.length > 1

          return (
            <div key={rule.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', opacity:rule.ativo?1:0.6, transition:'opacity 0.2s' }}>

              {/* Card header */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:10 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, flex:1, minWidth:0 }}>
                  {/* Ícone composto */}
                  <div style={{ width:38, height:38, borderRadius:10, background:TIPO_CALCULO_CFG[tipos[0]]?.bg || 'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {isFixo && !isCadeia && !isEscal && <Percent size={17} strokeWidth={1.75} style={{ color:TIPO_CALCULO_CFG.percentual_fixo.color }} />}
                    {isCadeia && !isEscal && <Link2 size={17} strokeWidth={1.75} style={{ color:TIPO_CALCULO_CFG.cadeia_repasse.color }} />}
                    {isEscal && !isCadeia && <BarChart2 size={17} strokeWidth={1.75} style={{ color:TIPO_CALCULO_CFG.escalonado.color }} />}
                    {isCombo && <Zap size={17} strokeWidth={1.75} style={{ color:'#F59E0B' }} />}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                      {rule.nome}
                      {tipos.map(t => <TipoBadge key={t} tipoId={t} />)}
                      {rule.escopo_interno && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, color:'#6366F1', background:'rgba(99,102,241,0.1)' }}>
                          <User size={9} strokeWidth={2.5} />Interna
                        </span>
                      )}
                      {rule.escopo_externo && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, color:'#10B981', background:'rgba(16,185,129,0.1)' }}>
                          <Users size={9} strokeWidth={2.5} />Externa
                        </span>
                      )}
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:rule.ativo?'rgba(16,185,129,0.12)':'var(--surface2)', color:rule.ativo?'#10B981':'var(--text-muted)', letterSpacing:'0.05em', textTransform:'uppercase' }}>{rule.ativo?'Ativa':'Inativa'}</span>
                    </div>

                    {/* Beneficiários vinculados */}
                    {rule.escopo_interno && rule.beneficiario_nome && (
                      <div style={{ fontSize:12, color:'#6366F1', marginBottom:2, display:'flex', alignItems:'center', gap:5 }}>
                        <User size={11} strokeWidth={2} />
                        {rule.beneficiario_nome}
                      </div>
                    )}
                    {rule.escopo_externo && rule.contato_nome && (
                      <div style={{ fontSize:12, color:'#10B981', marginBottom:2, display:'flex', alignItems:'center', gap:5 }}>
                        <Users size={11} strokeWidth={2} />
                        {rule.contato_nome}{rule.contato_empresa ? ` · ${rule.contato_empresa}` : ''}
                      </div>
                    )}

                    {/* Produtos / Categorias vinculados */}
                    {rule.produto_filtro_tipo === 'produto' && rule.produto_ids?.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:4, alignItems:'center' }}>
                        <span style={{ fontSize:10, fontWeight:700, background:'#FEF3C7', color:'#B45309', borderRadius:5, padding:'1px 6px', fontFamily:'var(--mono)', flexShrink:0 }}>PRODUTO</span>
                        {rule.produto_ids.map(id => {
                          const p = MOCK_PRODUTOS.find(p => String(p.id) === String(id))
                          return p ? (
                            <span key={id} style={{ fontSize:11, color:'#B45309', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:5, padding:'1px 7px' }}>{p.nome}</span>
                          ) : null
                        })}
                      </div>
                    )}
                    {rule.produto_filtro_tipo === 'categoria' && rule.produto_categorias?.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:4, alignItems:'center' }}>
                        <span style={{ fontSize:10, fontWeight:700, background:'#FEF3C7', color:'#B45309', borderRadius:5, padding:'1px 6px', fontFamily:'var(--mono)', flexShrink:0 }}>CATEGORIA</span>
                        {rule.produto_categorias.map(cat => (
                          <span key={cat} style={{ fontSize:11, color:'#B45309', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:5, padding:'1px 7px' }}>{cat}</span>
                        ))}
                      </div>
                    )}

                    {rule.descricao && <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:2 }}>{rule.descricao}</div>}

                    {/* Contexto */}
                    {rule.contexto && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:'6px 10px', marginTop:6, borderLeft:'3px solid #6366F1' }}>
                        {rule.contexto}
                      </div>
                    )}

                    {/* Vigência + revisão */}
                    {(rule.vigencia_inicio||rule.vigencia_fim) && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6, display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                        <Calendar size={11} strokeWidth={2} />
                        Vigência: {rule.vigencia_inicio ? fmtDate(rule.vigencia_inicio) : '—'} → {rule.vigencia_fim ? fmtDate(rule.vigencia_fim) : 'indeterminado'}
                        {rule.revisao_anual && <span style={{ marginLeft:6, padding:'1px 6px', borderRadius:99, background:'rgba(99,102,241,0.1)', color:'#6366F1', fontSize:10, fontWeight:600, display:'inline-flex', alignItems:'center', gap:3 }}><RotateCcw size={9} strokeWidth={2.5} />Revisão anual</span>}
                      </div>
                    )}

                    {/* Condições de elegibilidade resumidas */}
                    {(rule.condicoes_elegibilidade||[]).length > 0 && (
                      <div style={{ marginTop:7, display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                        <Filter size={10} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                        {rule.condicoes_elegibilidade.map(c => (
                          <span key={c.id} style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                            {c.label || `${c.entidade}.${c.campo} ${c.operador} "${c.valor}"`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {cardActions(rule)}
              </div>

              {/* Card body */}
              <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>

                {isFixo && (
                  <div>
                    {isCombo && <div style={{ fontSize:10, fontWeight:700, color:TIPO_CALCULO_CFG.percentual_fixo.color, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Percentual Fixo por Persona</div>}
                    <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ display:'grid', gridTemplateColumns:`120px repeat(${RECEITA_TIPOS.length},1fr)` }}>
                        <div style={{ background:'var(--surface2)', padding:'7px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>Persona</div>
                        {RECEITA_TIPOS.map(t => <div key={t} style={{ background:'var(--surface2)', padding:'7px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', textAlign:'center', borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)' }}>{t}</div>)}
                        {(rule.persona_percentuais||[]).map((pp, pi) => {
                          const persona = personas.find(p => p.id === pp.persona_id)
                          if (!persona) return null
                          const isLast = pi === (rule.persona_percentuais||[]).length - 1
                          return [
                            <div key={`${pp.persona_id}-l`} style={{ padding:'10px 12px', borderBottom:isLast?'none':'1px solid var(--border)', display:'flex', alignItems:'center', gap:7 }}>
                              <span style={{ width:7, height:7, borderRadius:'50%', background:persona.cor, flexShrink:0 }} />
                              <span style={{ fontSize:12, fontWeight:600, color:'var(--text-soft)' }}>{persona.label}</span>
                            </div>,
                            ...RECEITA_TIPOS.map(tipo => {
                              const val = Number(getPerc(rule.persona_percentuais, pp.persona_id, tipo))
                              return (
                                <div key={`${pp.persona_id}-${tipo}`} style={{ padding:'10px 12px', textAlign:'center', borderBottom:isLast?'none':'1px solid var(--border)', borderLeft:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                  <span style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:val===0?'var(--text-muted)':val>=10?'#6366F1':'var(--text)', opacity:val===0?0.5:1 }}>
                                    {val===0?'—':fmtPct(val)}
                                  </span>
                                </div>
                              )
                            })
                          ]
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {isCadeia && (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {isCombo && <div style={{ fontSize:10, fontWeight:700, color:TIPO_CALCULO_CFG.cadeia_repasse.color, textTransform:'uppercase', letterSpacing:'0.07em' }}>Cadeia de Repasse</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      {[
                        { label:'Bruto (cliente)',    value:'100%',                                note:'base entrada' },
                        null,
                        { label:'Repasse fabricante', value:fmtPct(rule.repasse_origem_pct||0),   note:'→ líquido NG' },
                        null,
                        { label:'Base cálculo',       value:fmtPct(rule.base_calculo_pct||0),     note:'do líquido NG' },
                        null,
                        { label:'Comissão',           value:fmtPct(rule.percentual_comissao||0),  note:'sobre a base', highlight:true },
                      ].map((item,i) => item===null
                        ? <ChevronRight key={i} size={14} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                        : <div key={i} style={{ textAlign:'center', background: item.highlight?'rgba(16,185,129,0.08)':'var(--surface2)', border:`1px solid ${item.highlight?'rgba(16,185,129,0.25)':'var(--border)'}`, borderRadius:9, padding:'10px 14px' }}>
                            <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{item.label}</div>
                            <div style={{ fontSize:17, fontWeight:800, fontFamily:'var(--mono)', color:item.highlight?'#10B981':'var(--text)' }}>{item.value}</div>
                            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{item.note}</div>
                          </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 13px', borderRadius:9, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                        <RotateCcw size={13} strokeWidth={2} style={{ color:'var(--text-muted)' }} />
                        <span style={{ fontSize:12, color:'var(--text-soft)' }}>{TIPO_RECORRENCIA_CFG[rule.tipo_recorrencia]?.label || rule.tipo_recorrencia}</span>
                        {rule.prazo_meses && <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{rule.prazo_meses} meses</span>}
                      </div>
                      {rule.exige_participacao_venda && <InfoPill icon={<CheckCircle2 size={11} strokeWidth={2.5} />} label="Exige participação na venda" color="#10B981" />}
                      {rule.cessa_no_cancelamento    && <InfoPill icon={<XCircle size={11} strokeWidth={2.5} />}     label="Cessa no cancelamento"       color="#F59E0B" />}
                    </div>
                    {rule.notas_elegibilidade && <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 12px', background:'var(--surface2)', borderRadius:8, borderLeft:'3px solid var(--border)' }}>{rule.notas_elegibilidade}</div>}
                  </div>
                )}

                {isEscal && (
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {isCombo && <div style={{ fontSize:10, fontWeight:700, color:TIPO_CALCULO_CFG.escalonado.color, textTransform:'uppercase', letterSpacing:'0.07em' }}>Escalonado por Meta</div>}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      <EscalaReadonly rows={rule.escala_individual||[]} valueKey="comissao_pct" title="Comissão Individual" accent="#F59E0B" />
                      {(rule.escala_equipe||[]).length > 0 && <EscalaReadonly rows={rule.escala_equipe} valueKey="bonus_pct" title="Bônus de Equipe" accent="#10B981" />}
                    </div>
                    {rule.condicao_bonus_equipe && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', padding:'8px 12px', background:'var(--surface2)', borderRadius:8 }}>
                        <Info size={12} strokeWidth={2} style={{ flexShrink:0 }} />
                        <span><strong style={{ color:'var(--text-soft)' }}>Condição bônus equipe:</strong> {rule.condicao_bonus_equipe}</span>
                      </div>
                    )}
                    {rule.notas_elegibilidade && !isCadeia && <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 12px', background:'var(--surface2)', borderRadius:8, borderLeft:'3px solid var(--border)' }}>{rule.notas_elegibilidade}</div>}
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}

      {showPersonas && <PersonasEditor personas={personas} onChange={p=>{setPersonas(p);setShowPersonas(false)}} onClose={()=>setShowPersonas(false)} />}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Comissoes() {
  const [tab, setTab]           = useLocalState('comissoes:tab', 'repasses')
  const [period, setPeriod]     = useState('this_month')
  const { rules, payments, personas, setRules, setPayments, setPersonas } = useCommissions()
  const [editandoPayment, setEditandoPayment] = useState(null)
  const [editandoRule, setEditandoRule]       = useState(null)
  const [saving, setSaving]                   = useState(false)
  const [err, setErr]                         = useState(null)
  const [contatos]                            = useLocalState(CONTATOS_STORAGE_KEY, MOCK_CONTATOS)

  const totalPendente = useMemo(() =>
    payments.filter(p=>p.status==='pendente').reduce((s,p)=>s+Number(p.valor_comissao),0),
  [payments])

  function openPayment(modal) {
    if (modal === 'new') setEditandoPayment({ ...EMPTY_PAYMENT })
    else if (modal?.type === 'edit') setEditandoPayment({ ...modal.data })
  }

  function openRule(modal) {
    if (modal === 'new') {
      setEditandoRule({ ...EMPTY_RULE, persona_percentuais: personas.map(p => ({ persona_id: p.id, cdu_pct: 0, sms_pct: 0, servicos_pct: 0 })) })
    } else if (modal?.type === 'edit') {
      const base = { ...EMPTY_RULE, ...modal.data }
      const existingIds = (base.persona_percentuais || []).map(p => p.persona_id)
      const merged = [
        ...(base.persona_percentuais || []),
        ...personas.filter(p => !existingIds.includes(p.id)).map(p => ({ persona_id: p.id, cdu_pct: 0, sms_pct: 0, servicos_pct: 0 })),
      ]
      setEditandoRule({ ...base, persona_percentuais: merged })
    }
  }

  async function savePayment() {
    const form = editandoPayment
    if (!form.beneficiario_nome.trim()) { setErr('Informe o beneficiário.'); return }
    if (!form.data_vencimento)          { setErr('Informe a data de vencimento.'); return }
    if (!form.valor_base || parseFloat(form.valor_base) <= 0) { setErr('Informe um valor base válido.'); return }
    setSaving(true); setErr(null)
    try {
      await new Promise(r => setTimeout(r, 300))
      const base = parseFloat(form.valor_base) || 0
      const pct  = parseFloat(form.percentual) || 0
      const comissao = parseFloat((base * pct / 100).toFixed(2))
      const updated = { ...form, id: form.id || `p${Date.now()}`, valor_base: base, percentual: pct, valor_comissao: comissao }
      setPayments(prev => prev.find(p=>p.id===updated.id) ? prev.map(p=>p.id===updated.id?updated:p) : [...prev,updated])
      setEditandoPayment(null)
    } finally { setSaving(false) }
  }

  async function saveRule() {
    const form = editandoRule
    if (!form.nome.trim()) { setErr('Informe o nome da regra.'); return }
    setSaving(true); setErr(null)
    try {
      await new Promise(r => setTimeout(r, 300))
      const updated = { ...form, id: form.id || `r${Date.now()}` }
      setRules(prev => prev.find(r=>r.id===updated.id) ? prev.map(r=>r.id===updated.id?updated:r) : [...prev,updated])
      setEditandoRule(null)
    } finally { setSaving(false) }
  }

  if (editandoPayment) {
    const form = editandoPayment
    const set = (k, v) => setEditandoPayment(f => ({ ...f, [k]: v }))
    const isNew = !form.id
    const selectedRule = rules.find(r => r.id === form.rule_id)
    const comissaoCalculada = ((parseFloat(form.valor_base)||0) * (parseFloat(form.percentual)||0) / 100).toFixed(2)

    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Comissões', onClick: () => { setEditandoPayment(null); setErr(null) } }, { label: isNew ? 'Novo Lançamento' : 'Editar Lançamento' }]}
        title={isNew ? 'Novo Lançamento' : form.beneficiario_nome || 'Lançamento'}
        subtitle="Registre um repasse de comissão"
        onSave={savePayment}
        onCancel={() => { setEditandoPayment(null); setErr(null) }}
        saving={saving}
        saveLabel={isNew ? 'Registrar lançamento' : 'Salvar alterações'}
        aside={
          <AsideCard title="Cálculo">
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#71717A' }}>Valor base</span>
                <span style={{ fontSize:13, fontFamily:'var(--mono)', fontWeight:600 }}>{fmt(parseFloat(form.valor_base)||0)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#71717A' }}>Percentual</span>
                <span style={{ fontSize:13, fontFamily:'var(--mono)', fontWeight:600 }}>{fmtPct(parseFloat(form.percentual)||0)}</span>
              </div>
              <div style={{ borderTop:'1px solid #E4E4E7', paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#71717A', fontWeight:600 }}>Comissão</span>
                <span style={{ fontSize:16, fontFamily:'var(--mono)', fontWeight:800, color:'#10B981' }}>{fmt(comissaoCalculada)}</span>
              </div>
            </div>
            {err && <div style={{ marginTop:12, padding:'8px 10px', borderRadius:7, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:12 }}>{err}</div>}
          </AsideCard>
        }
      >
        <FPESection label="Beneficiário" noBorder columns={2}>
          <FPEField label="Beneficiário" required span={2}>
            <select className="fpe-field" value={form.beneficiario_id || ''} onChange={e => {
              const u = MOCK_USUARIOS.find(u => u.id === e.target.value)
              set('beneficiario_id', e.target.value)
              set('beneficiario_nome', u?.nome || '')
            }}>
              <option value="">— Selecionar usuário —</option>
              {MOCK_USUARIOS.map(u => <option key={u.id} value={u.id}>{u.nome} · {u.cargo}</option>)}
            </select>
          </FPEField>
          <FPEField label="Persona">
            <select className="fpe-field" value={form.persona} onChange={e => set('persona', e.target.value)}>
              {personas.filter(p => p.ativo).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </FPEField>
          <FPEField label="Regra aplicada">
            <select className="fpe-field" value={form.rule_id || ''} onChange={e => set('rule_id', e.target.value || null)}>
              <option value="">— Nenhuma regra —</option>
              {rules.filter(r => r.ativo).map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </FPEField>
        </FPESection>
        <FPESection label="Cálculo" columns={2}>
          <FPEField label="Tipo de receita">
            <select className="fpe-field" value={form.receita_tipo} onChange={e => set('receita_tipo', e.target.value)}>
              {RECEITA_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FPEField>
          <FPEField label="Status">
            <select className="fpe-field" value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </FPEField>
          <FPEField label="Valor base (R$)" required>
            <input type="number" min={0} step={0.01} className="fpe-field" value={form.valor_base} onChange={e => set('valor_base', e.target.value)} placeholder="0,00" />
          </FPEField>
          <FPEField label="Percentual (%)">
            <input type="number" min={0} max={100} step={0.5} className="fpe-field" value={form.percentual} onChange={e => set('percentual', e.target.value)} placeholder="0,00" />
          </FPEField>
        </FPESection>
        <FPESection label="Datas" columns={3}>
          <FPEField label="Competência">
            <input type="date" className="fpe-field" value={form.data_competencia} onChange={e => set('data_competencia', e.target.value)} />
          </FPEField>
          <FPEField label="Vencimento" required>
            <input type="date" className="fpe-field" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} />
          </FPEField>
          <FPEField label="Data de pagamento">
            <input type="date" className="fpe-field" value={form.data_pagamento || ''} onChange={e => set('data_pagamento', e.target.value || null)} />
          </FPEField>
        </FPESection>
        <FPESection label="Observações" columns={1}>
          <FPEField label="Descrição / Origem">
            <input className="fpe-field" value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Quírons QRS — MedGroup" />
          </FPEField>
          <FPEField label="Notas">
            <textarea className="fpe-field" value={form.notas || ''} onChange={e => set('notas', e.target.value)} />
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  if (editandoRule) {
    const form = editandoRule
    const set = (k, v) => setEditandoRule(f => ({ ...f, [k]: v }))
    const isNew = !form.id
    const tipos = form.tipos_calculo_arr || ['percentual_fixo']
    const isFixo   = tipos.includes('percentual_fixo')
    const isCadeia = tipos.includes('cadeia_repasse')
    const isEscal  = tipos.includes('escalonado')

    function toggleTipo(id) {
      if (tipos.includes(id)) {
        if (tipos.length === 1) return
        set('tipos_calculo_arr', tipos.filter(t => t !== id))
      } else {
        set('tipos_calculo_arr', [...tipos, id])
      }
    }

    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Comissões', onClick: () => { setEditandoRule(null); setErr(null) } }, { label: isNew ? 'Nova Regra' : 'Editar Regra' }]}
        title={isNew ? 'Nova Regra de Comissão' : form.nome || 'Regra'}
        subtitle="Configure o modelo de cálculo e as condições de elegibilidade"
        onSave={saveRule}
        onCancel={() => { setEditandoRule(null); setErr(null) }}
        saving={saving}
        saveLabel={isNew ? 'Criar regra' : 'Salvar alterações'}
        aside={
          <AsideCard title="Status da regra">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Toggle value={form.ativo} onChange={v => set('ativo', v)} label="Regra ativa" />
              <Toggle value={form.revisao_anual} onChange={v => set('revisao_anual', v)} label="Revisão anual" />
              {err && <div style={{ padding:'8px 10px', borderRadius:7, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:12 }}>{err}</div>}
            </div>
          </AsideCard>
        }
      >
        <FPESection label="Identificação" noBorder columns={2}>
          <FPEField label="Nome da regra" required span={2}>
            <input className="fpe-field" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Recorrente Quírons — Inside Sales Sênior" />
          </FPEField>
          <FPEField label="Descrição curta" span={2}>
            <input className="fpe-field" value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} placeholder="Resumo em uma linha" />
          </FPEField>
          <FPEField label="Vigência início">
            <input type="date" className="fpe-field" value={form.vigencia_inicio || ''} onChange={e => set('vigencia_inicio', e.target.value || null)} />
          </FPEField>
          <FPEField label="Vigência fim">
            <input type="date" className="fpe-field" value={form.vigencia_fim || ''} onChange={e => set('vigencia_fim', e.target.value || null)} />
          </FPEField>
          <FPEField label="Contexto e motivação" span={2}>
            <textarea className="fpe-field" value={form.contexto || ''} onChange={e => set('contexto', e.target.value)} placeholder="Explique o porquê desta regra…" />
          </FPEField>
        </FPESection>

        <FPESection label="Escopo" columns={2}>
          {[
            { key:'escopo_interno', label:'Interna', desc:'Usuário do sistema', color:'#6366F1' },
            { key:'escopo_externo', label:'Externa', desc:'Contato Canal',      color:'#10B981' },
          ].map(opt => {
            const active = !!form[opt.key]
            return (
              <FPEField key={opt.key}>
                <button type="button" onClick={() => set(opt.key, !active)}
                  style={{ width:'100%', padding:'12px 14px', borderRadius:10, cursor:'pointer', textAlign:'left',
                    border: active ? `2px solid ${opt.color}` : '2px solid var(--border)',
                    background: active ? `${opt.color}12` : 'var(--surface2)', transition:'all 0.15s', fontFamily:'var(--font)' }}>
                  <div style={{ fontSize:13, fontWeight:700, color: active ? opt.color : 'var(--text)', marginBottom:3 }}>{opt.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{opt.desc}</div>
                </button>
              </FPEField>
            )
          })}
          {form.escopo_interno && (
            <FPEField label="Usuário do sistema" required span={2}>
              <select className="fpe-field" value={form.beneficiario_id || ''} onChange={e => {
                const u = MOCK_USUARIOS.find(u => u.id === e.target.value)
                set('beneficiario_id', e.target.value)
                set('beneficiario_nome', u?.nome || '')
              }}>
                <option value="">— Selecionar usuário —</option>
                {MOCK_USUARIOS.map(u => <option key={u.id} value={u.id}>{u.nome} · {u.cargo}</option>)}
              </select>
            </FPEField>
          )}
          {form.escopo_externo && (
            <FPEField label="Contato Canal" required span={2}>
              <select className="fpe-field" value={form.contato_id || ''} onChange={e => {
                const c = contatos.find(c => c.id === e.target.value)
                set('contato_id', e.target.value)
                set('contato_nome', c?.nome || '')
                set('contato_empresa', c?.empresa_nome || '')
              }}>
                <option value="">— Selecionar contato —</option>
                {contatos.map(c => <option key={c.id} value={c.id}>{c.nome} · {c.empresa_nome}</option>)}
              </select>
            </FPEField>
          )}
        </FPESection>

        <FPESection label="Tipos de cálculo" columns={3}>
          {Object.entries(TIPO_CALCULO_CFG).map(([id, cfg]) => {
            const sel = tipos.includes(id)
            return (
              <FPEField key={id}>
                <button type="button" onClick={() => toggleTipo(id)}
                  style={{ width:'100%', padding:'14px 12px', borderRadius:10, cursor:'pointer', textAlign:'left',
                    border: sel ? `2px solid ${cfg.color}` : '2px solid var(--border)',
                    background: sel ? cfg.bg : 'var(--surface2)', transition:'all 0.15s', fontFamily:'var(--font)' }}>
                  <div style={{ fontSize:12, fontWeight:700, color: sel ? cfg.color : 'var(--text)', marginBottom:4 }}>{cfg.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.45 }}>{cfg.desc}</div>
                </button>
              </FPEField>
            )
          })}
        </FPESection>

        {isFixo && (
          <FPESection label="Percentuais por Persona × Tipo de Receita" columns={1}>
            <FPEField>
              <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:`140px repeat(${RECEITA_TIPOS.length},1fr)`, background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase' }}>Persona</div>
                  {RECEITA_TIPOS.map(t => <div key={t} style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', textAlign:'center' }}>{t}</div>)}
                </div>
                {personas.filter(p => p.ativo).map((p, pi) => (
                  <div key={p.id} style={{ display:'grid', gridTemplateColumns:`140px repeat(${RECEITA_TIPOS.length},1fr)`, borderBottom:pi<personas.filter(x=>x.ativo).length-1?'1px solid var(--border)':'none', alignItems:'center' }}>
                    <div style={{ padding:'10px 12px', display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:p.cor, flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.label}</span>
                    </div>
                    {RECEITA_TIPOS.map(tipo => (
                      <div key={tipo} style={{ padding:'8px 10px', display:'flex', alignItems:'center', gap:4 }}>
                        <input type="number" min={0} max={100} step={0.5}
                          value={getPerc(form.persona_percentuais, p.id, tipo)}
                          onChange={e => set('persona_percentuais', setPerc(form.persona_percentuais, p.id, tipo, e.target.value))}
                          className="fpe-field"
                        />
                        <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>%</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </FPEField>
          </FPESection>
        )}

        {isCadeia && (
          <FPESection label="Parâmetros da Cadeia de Repasse" columns={3}>
            {[
              { key:'repasse_origem_pct',  label:'Repasse fabricante/dist. (%)', placeholder:'Ex: 50' },
              { key:'base_calculo_pct',    label:'Base sobre líquido NG (%)',     placeholder:'Ex: 39' },
              { key:'percentual_comissao', label:'% comissão sobre a base',       placeholder:'Ex: 5' },
            ].map(f => (
              <FPEField key={f.key} label={f.label}>
                <input type="number" min={0} max={100} step={0.5} className="fpe-field" value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />
              </FPEField>
            ))}
            <FPEField label="Tipo de recorrência" span={2}>
              <select className="fpe-field" value={form.tipo_recorrencia} onChange={e => set('tipo_recorrencia', e.target.value)}>
                {Object.entries(TIPO_RECORRENCIA_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FPEField>
            {form.tipo_recorrencia === 'prazo_fixo' && (
              <FPEField label="Prazo (meses)">
                <input type="number" min={1} className="fpe-field" value={form.prazo_meses || ''} onChange={e => set('prazo_meses', parseInt(e.target.value) || null)} placeholder="Ex: 18" />
              </FPEField>
            )}
          </FPESection>
        )}

        {isEscal && (
          <FPESection label="Escala de Comissão" columns={1}>
            <FPEField label="Escala Individual">
              <EscalaEditor rows={form.escala_individual || DEFAULT_ESCALA_INDIVIDUAL} onChange={v => set('escala_individual', v)} valueKey="comissao_pct" valueLabel="Comissão (%)" accentColor="#F59E0B" />
            </FPEField>
            <FPEField label="Bônus de Equipe">
              <EscalaEditor rows={form.escala_equipe || DEFAULT_ESCALA_EQUIPE} onChange={v => set('escala_equipe', v)} valueKey="bonus_pct" valueLabel="Bônus (%)" accentColor="#10B981" />
            </FPEField>
            <FPEField label="Condição para bônus de equipe">
              <input className="fpe-field" value={form.condicao_bonus_equipe || ''} onChange={e => set('condicao_bonus_equipe', e.target.value)} placeholder="Ex: Exige atingimento prévio da meta individual" />
            </FPEField>
          </FPESection>
        )}

        <FPESection label="Elegibilidade" columns={1}>
          <FPEField label="Condições de elegibilidade">
            <ConditionBuilder conditions={form.condicoes_elegibilidade || []} onChange={v => set('condicoes_elegibilidade', v)} />
          </FPEField>
          <FPEField label="Notas adicionais">
            <textarea className="fpe-field" value={form.notas_elegibilidade || ''} onChange={e => set('notas_elegibilidade', e.target.value)} placeholder="Observações, exceções ou restrições adicionais." />
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, minHeight:0 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Cabeçalho Superior ──────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:24, flexWrap:'wrap' }}>
        {/* Esquerda: título + abas */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <DollarSign size={17} strokeWidth={1.75} style={{ color:'#6366F1' }} />
            </div>
            <div>
              <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', margin:0, letterSpacing:'-0.3px' }}>Gestão de Comissões</h1>
              {totalPendente > 0 && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{fmt(totalPendente)} pendente de pagamento</div>}
            </div>
          </div>
          <div style={{ display:'flex', gap:2, background:'var(--surface2)', borderRadius:9, padding:3, border:'1px solid var(--border)' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'6px 16px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:tab===t.id?700:500, fontFamily:'var(--font)', background:tab===t.id?'var(--surface)':'none', color:tab===t.id?'var(--text)':'var(--text-muted)', boxShadow:tab===t.id?'0 1px 3px rgba(0,0,0,0.12)':'none', transition:'all 0.15s' }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Direita: período + ação */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0, paddingTop:4 }}>
          <PeriodPopover value={period} onChange={setPeriod} />
          <Button icon={<Plus size={SZ} strokeWidth={2.5} />} onClick={() => tab === 'repasses' ? openPayment('new') : openRule('new')}>
            {tab==='repasses' ? 'Novo Lançamento' : 'Nova Regra'}
          </Button>
        </div>
      </div>

      {tab === 'repasses' && <TabRepasses payments={payments} setPayments={setPayments} rules={rules} personas={personas} period={period} onEdit={openPayment} />}
      {tab === 'regras'   && <TabRegras   rules={rules} setRules={setRules} personas={personas} setPersonas={setPersonas} onEditRule={openRule} />}
    </div>
  )
}
