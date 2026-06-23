import { useState, useMemo, useRef, useEffect } from 'react'
import {
  DollarSign, Percent, Calendar, Plus, ChevronDown,
  CheckCircle2, Clock, XCircle, Pencil, Trash2, X,
  TrendingUp, AlertCircle, Loader2,
  Zap, BarChart2, Link2, RotateCcw, Info, ChevronRight,
  User, Users, Settings, Filter,
} from 'lucide-react'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import BrowseLayout from '../components/BrowseLayout'
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

// ─── MultiSearchSelect ────────────────────────────────────────────────────────
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
      {selected.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {selected.map(o => (
            <span key={o.value} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px 3px 10px', borderRadius:99, fontSize:12, fontWeight:600, background:'rgba(245,158,11,0.1)', color:'#B45309', border:'1px solid rgba(245,158,11,0.3)' }}>
              {o.label}
              <button type="button" onClick={() => toggle(o.value)} style={{ background:'none', border:'none', cursor:'pointer', color:'#B45309', display:'flex', alignItems:'center', padding:0, lineHeight:1, fontSize:12 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position:'relative' }}>
        <input value={query} onFocus={() => setOpen(true)} onChange={e => { setQuery(e.target.value); setOpen(true) }}
          placeholder={selected.length > 0 ? '+ Adicionar outro…' : placeholder}
          style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, fontFamily:'var(--font)', outline:'none' }} />
        {open && filtered.length > 0 && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:600, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
            {filtered.map(opt => (
              <button key={opt.value} type="button"
                onMouseDown={e => { e.preventDefault(); toggle(opt.value); setQuery('') }}
                style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', border:'none', background:'transparent', cursor:'pointer', textAlign:'left', fontFamily:'var(--font)' }}
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
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, color:p.cor, background:p.cor + '22' }}>
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
function EscalaEditor({ rows, onChange, valueKey, valueLabel, accentColor = 'var(--accent)' }) {
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
      <button onClick={addRow} style={{ marginTop:8, padding:'5px 12px', borderRadius:7, background:'none', border:`1px dashed ${accentColor}`, color:accentColor, fontSize:12, cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, opacity:0.8 }}>+ Adicionar faixa</button>
    </div>
  )
}

// ─── FormulaPreview ───────────────────────────────────────────────────────────
function FormulaPreview({ repasse, base, pct, exemplo = 3500 }) {
  const r = Number(repasse) || 0; const b = Number(base) || 0; const p = Number(pct) || 0
  const liquido = exemplo * r / 100; const baseVal = liquido * b / 100; const comissao = baseVal * p / 100
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>Prévia do cálculo (exemplo: bruto {fmt(exemplo)})</div>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        {[
          { label:'Valor bruto',          value: fmt(exemplo),  note:'cliente paga' },
          null,
          { label:`Repasse ${fmtPct(r)}`, value: fmt(liquido),  note:'líquido NG' },
          null,
          { label:`Base ${fmtPct(b)}`,    value: fmt(baseVal),  note:'base de cálculo' },
          null,
          { label:`Comissão ${fmtPct(p)}`,value: fmt(comissao), note:'resultado', highlight: true },
        ].map((item, i) => item === null
          ? <ChevronRight key={i} size={14} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />
          : <div key={i} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>{item.label}</div>
              <div style={{ fontSize:15, fontWeight:800, fontFamily:'var(--mono)', color: item.highlight ? '#10B981' : 'var(--text)', whiteSpace:'nowrap' }}>{item.value}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{item.note}</div>
            </div>
        )}
      </div>
    </div>
  )
}

// ─── ConditionBuilder ─────────────────────────────────────────────────────────
function ConditionBuilder({ conditions, onChange }) {
  function addRow() {
    const entidade = ENTIDADES_ELEGIBILIDADE[0]; const campo = entidade.campos[0]
    const ops = OPERADORES_POR_TIPO[campo.tipo] || OPERADORES_POR_TIPO.texto
    onChange([...conditions, { id: uid(), entidade: entidade.id, campo: campo.id, operador: ops[0].id, valor: '', label: '' }])
  }
  function remove(id) { onChange(conditions.filter(c => c.id !== id)) }
  function update(id, patch) {
    onChange(conditions.map(c => {
      if (c.id !== id) return c
      const next = { ...c, ...patch }
      const ent = ENTIDADES_ELEGIBILIDADE.find(e => e.id === next.entidade)
      const campo = ent?.campos.find(f => f.id === next.campo)
      next.label = ent && campo ? `${ent.label} › ${campo.label} ${next.operador} "${next.valor}"` : ''
      return next
    }))
  }
  function changeEntidade(id, entId) {
    const ent = ENTIDADES_ELEGIBILIDADE.find(e => e.id === entId); const campo = ent?.campos[0]
    const ops = campo ? (OPERADORES_POR_TIPO[campo.tipo] || OPERADORES_POR_TIPO.texto) : []
    update(id, { entidade: entId, campo: campo?.id || '', operador: ops[0]?.id || '=', valor: '' })
  }
  function changeCampo(id, campoId, entId) {
    const ent = ENTIDADES_ELEGIBILIDADE.find(e => e.id === entId); const campo = ent?.campos.find(f => f.id === campoId)
    const ops = campo ? (OPERADORES_POR_TIPO[campo.tipo] || OPERADORES_POR_TIPO.texto) : []
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
            <select style={sel} value={cond.entidade} onChange={e => changeEntidade(cond.id, e.target.value)}>
              {ENTIDADES_ELEGIBILIDADE.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <select style={sel} value={cond.campo} onChange={e => changeCampo(cond.id, e.target.value, cond.entidade)}>
              {(ent?.campos || []).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <select style={{ ...sel, maxWidth:130 }} value={cond.operador} onChange={e => update(cond.id, { operador: e.target.value })}>
              {ops.map(op => <option key={op.id} value={op.id}>{op.l}</option>)}
            </select>
            {campo?.tipo === 'select' ? (
              <select style={inp} value={cond.valor} onChange={e => update(cond.id, { valor: e.target.value })}>
                <option value="">— selecione —</option>
                {(campo.opcoes || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : campo?.tipo === 'booleano' ? (
              <select style={inp} value={cond.valor} onChange={e => update(cond.id, { valor: e.target.value })}>
                <option value="true">Sim</option><option value="false">Não</option>
              </select>
            ) : (
              <input style={inp} type={campo?.tipo === 'numero' ? 'number' : 'text'} value={cond.valor} onChange={e => update(cond.id, { valor: e.target.value })} placeholder={campo?.tipo === 'numero' ? '0' : 'valor…'} />
            )}
            <button onClick={() => remove(cond.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px', display:'flex', alignItems:'center', flexShrink:0 }}><X size={14} strokeWidth={2} /></button>
          </div>
        )
      })}
      <button onClick={addRow} style={{ alignSelf:'flex-start', padding:'6px 13px', borderRadius:7, background:'none', border:'1px dashed var(--accent)', color:'var(--accent)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
        <Plus size={12} strokeWidth={2.5} /> Adicionar condição
      </button>
      {conditions.length > 0 && (
        <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:5 }}>
          <Info size={11} strokeWidth={2} /> Todas as condições devem ser verdadeiras (AND) para a comissão ser paga.
        </div>
      )}
    </div>
  )
}

// ─── PersonasEditor ───────────────────────────────────────────────────────────
function PersonasEditor({ personas, onChange, onClose }) {
  const [list, setList] = useState(personas.map(p => ({ ...p })))
  const [editing, setEditing] = useState(null)
  const colors = ['var(--accent)','#0EA5E9','#F59E0B','#10B981','var(--accent)','#EF4444','#EC4899','#14B8A6','#F97316','#84CC16']
  function add() { const novo = { id: uid(), slug: `persona_${uid()}`, label: 'Novo Persona', descricao: '', cor: colors[list.length % colors.length], ordem: list.length, ativo: true }; setList(l => [...l, novo]); setEditing(novo.id) }
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
            <div style={{ width:30, height:30, borderRadius:8, background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}><Users size={14} strokeWidth={1.75} style={{ color:'var(--accent)' }} /></div>
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
                      <input style={{ ...IN, width:'100%', boxSizing:'border-box' }} value={p.label} onChange={e => update(p.id, { label: e.target.value })} autoFocus />
                    </div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Slug (interno)</div>
                      <input style={{ ...IN, width:'100%', boxSizing:'border-box', fontFamily:'var(--mono)' }} value={p.slug} onChange={e => update(p.id, { slug: e.target.value.replace(/\s+/g,'_') })} />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Descrição</div>
                      <input style={{ ...IN, width:'100%', boxSizing:'border-box' }} value={p.descricao||''} onChange={e => update(p.id, { descricao: e.target.value })} />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Cor</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {colors.map(c => <button key={c} type="button" onClick={() => update(p.id, { cor: c })} style={{ width:24, height:24, borderRadius:'50%', background:c, border: p.cor===c ? '3px solid var(--text)' : '3px solid transparent', cursor:'pointer', outline:'none' }} />)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <button type="button" onClick={() => setEditing(null)} style={{ padding:'6px 14px', borderRadius:7, background:'var(--accent)', border:'none', color:'#fff', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 }}>Concluído</button>
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
          <Button onClick={save}>Salvar personas</Button>
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
      <div onClick={() => onChange(!value)} style={{ width:34, height:19, borderRadius:99, position:'relative', cursor:'pointer', background:value?'var(--accent)':'var(--border)', transition:'background 0.2s', flexShrink:0 }}>
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

// ─── PaymentForm (SlideOver content) ─────────────────────────────────────────
function PaymentForm({ form, setForm, rules, personas, onSave, onClose }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isNew = !form.id
  const selectedRule = rules.find(r => r.id === form.rule_id)
  const comissaoCalculada = ((parseFloat(form.valor_base)||0) * (parseFloat(form.percentual)||0) / 100).toFixed(2)

  useEffect(() => {
    if (selectedRule?.tipos_calculo_arr?.includes('cadeia_repasse') && selectedRule.percentual_comissao) {
      set('percentual', selectedRule.percentual_comissao)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rule_id])

  async function submit() {
    if (!form.beneficiario_nome.trim()) { setErr('Informe o beneficiário.'); return }
    if (!form.data_vencimento)          { setErr('Informe a data de vencimento.'); return }
    if (!form.valor_base || parseFloat(form.valor_base) <= 0) { setErr('Informe um valor base válido.'); return }
    setSaving(true); setErr(null)
    try {
      await new Promise(r => setTimeout(r, 300))
      onSave({ ...form, id: form.id||`p${Date.now()}`, valor_base: parseFloat(form.valor_base), percentual: parseFloat(form.percentual), valor_comissao: parseFloat(comissaoCalculada) })
      onClose()
    } catch(e) { setErr(e.message||'Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Preview de cálculo */}
      <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>
          {fmt(parseFloat(form.valor_base)||0)} × {fmtPct(parseFloat(form.percentual)||0)}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, color:'var(--text-muted)' }}>Comissão calculada</div>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--mono)', color:'#10B981' }}>{fmt(comissaoCalculada)}</div>
        </div>
      </div>

      <FormSection label="Beneficiário">
        <FormGrid cols={2}>
          <FormField label="Beneficiário" required>
            <select className="so-field" value={form.beneficiario_id||''} onChange={e => {
              const u = MOCK_USUARIOS.find(u => u.id === e.target.value)
              set('beneficiario_id', e.target.value); set('beneficiario_nome', u?.nome||'')
            }}>
              <option value="">— Selecionar usuário —</option>
              {MOCK_USUARIOS.map(u => <option key={u.id} value={u.id}>{u.nome} · {u.cargo}</option>)}
            </select>
          </FormField>
          <FormField label="Persona">
            <select className="so-field" value={form.persona} onChange={e=>set('persona',e.target.value)}>
              {personas.filter(p=>p.ativo).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </FormField>
        </FormGrid>
        <FormGrid cols={1}>
          <FormField label="Regra aplicada">
            <select className="so-field" value={form.rule_id||''} onChange={e=>set('rule_id',e.target.value||null)}>
              <option value="">— Nenhuma regra —</option>
              {rules.filter(r=>r.ativo).map(r=><option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </FormField>
        </FormGrid>
        {selectedRule && (
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', padding:'8px 12px', borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)' }}>
            {(selectedRule.tipos_calculo_arr||['percentual_fixo']).map(t => <TipoBadge key={t} tipoId={t} />)}
            {selectedRule.tipos_calculo_arr?.includes('cadeia_repasse') && (
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>Repasse {fmtPct(selectedRule.repasse_origem_pct||0)} × Base {fmtPct(selectedRule.base_calculo_pct||0)} × Comissão {fmtPct(selectedRule.percentual_comissao||0)}</span>
            )}
          </div>
        )}
      </FormSection>

      <FormSection label="Cálculo">
        <FormGrid cols={2}>
          <FormField label="Tipo de receita">
            <select className="so-field" value={form.receita_tipo} onChange={e=>set('receita_tipo',e.target.value)}>
              {RECEITA_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className="so-field" value={form.status} onChange={e=>set('status',e.target.value)}>
              {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </FormField>
          <FormField label="Valor base (R$)" required>
            <input type="number" min={0} step={0.01} className="so-field" value={form.valor_base} onChange={e=>set('valor_base',e.target.value)} placeholder="0,00" />
          </FormField>
          <FormField label="Percentual (%)">
            <input type="number" min={0} max={100} step={0.5} className="so-field" value={form.percentual} onChange={e=>set('percentual',e.target.value)} placeholder="0,00" />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection label="Datas">
        <FormGrid cols={3}>
          <FormField label="Competência">
            <input type="date" className="so-field" value={form.data_competencia} onChange={e=>set('data_competencia',e.target.value)} />
          </FormField>
          <FormField label="Vencimento" required>
            <input type="date" className="so-field" value={form.data_vencimento} onChange={e=>set('data_vencimento',e.target.value)} />
          </FormField>
          <FormField label="Data de pagamento">
            <input type="date" className="so-field" value={form.data_pagamento||''} onChange={e=>set('data_pagamento',e.target.value||null)} />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection label="Observações">
        <FormGrid cols={1}>
          <FormField label="Descrição / Origem">
            <input className="so-field" value={form.descricao||''} onChange={e=>set('descricao',e.target.value)} placeholder="Ex: Quírons QRS — MedGroup" />
          </FormField>
          <FormField label="Notas">
            <textarea className="so-field" value={form.notas||''} onChange={e=>set('notas',e.target.value)} style={{ minHeight:60, resize:'vertical' }} />
          </FormField>
        </FormGrid>
      </FormSection>

      {err && (
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 12px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:13 }}>
          <AlertCircle size={14} strokeWidth={2}/>{err}
        </div>
      )}

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {form.status === 'pendente' && !isNew && (
          <Button onClick={() => { set('status','pago'); set('data_pagamento', today()) }} style={{ background:'#10B981' }}>
            <CheckCircle2 size={14} strokeWidth={2.5} style={{ marginRight:5 }} />Marcar como pago
          </Button>
        )}
        <Button loading={saving} onClick={submit}>{isNew ? 'Registrar lançamento' : 'Salvar alterações'}</Button>
      </div>
    </div>
  )
}

// ─── RuleForm (SlideOver content) ─────────────────────────────────────────────
function RuleForm({ form, setForm, personas, contatos, onSave, onClose }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isNew = !form.id
  const tipos = form.tipos_calculo_arr || ['percentual_fixo']
  const isFixo = tipos.includes('percentual_fixo'); const isCadeia = tipos.includes('cadeia_repasse'); const isEscal = tipos.includes('escalonado')

  function toggleTipo(id) {
    if (tipos.includes(id)) { if (tipos.length === 1) return; set('tipos_calculo_arr', tipos.filter(t => t !== id)) }
    else { set('tipos_calculo_arr', [...tipos, id]) }
  }

  async function submit() {
    if (!form.nome.trim()) { setErr('Informe o nome da regra.'); return }
    if (form.escopo_interno && !form.beneficiario_id) { setErr('Selecione o usuário do sistema para o escopo Interno.'); return }
    if (form.escopo_externo && !form.contato_id)      { setErr('Selecione o Contato Canal para o escopo Externo.'); return }
    setSaving(true); setErr(null)
    try {
      await new Promise(r => setTimeout(r, 300))
      onSave({ ...form, id: form.id || `r${Date.now()}` })
      onClose()
    } catch(e) { setErr(e.message||'Erro ao salvar regra.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      <FormSection label="Identificação">
        <FormGrid cols={2}>
          <FormField label="Nome da regra" required>
            <input className="so-field" value={form.nome} onChange={e=>set('nome',e.target.value)} placeholder="Ex: Recorrente Quírons — Inside Sales Sênior" style={{ gridColumn:'1/-1' }} />
          </FormField>
          <FormField label="Descrição curta">
            <input className="so-field" value={form.descricao||''} onChange={e=>set('descricao',e.target.value)} placeholder="Resumo em uma linha" />
          </FormField>
          <FormField label="Vigência início">
            <input type="date" className="so-field" value={form.vigencia_inicio||''} onChange={e=>set('vigencia_inicio',e.target.value||null)} />
          </FormField>
          <FormField label="Vigência fim">
            <input type="date" className="so-field" value={form.vigencia_fim||''} onChange={e=>set('vigencia_fim',e.target.value||null)} />
          </FormField>
        </FormGrid>
        <FormGrid cols={1}>
          <FormField label="Contexto e motivação">
            <textarea className="so-field" rows={2} value={form.contexto||''} onChange={e=>set('contexto',e.target.value)} placeholder="Explique o porquê desta regra…" style={{ resize:'vertical' }} />
          </FormField>
        </FormGrid>
        <div style={{ display:'flex', gap:20 }}>
          <Toggle value={form.ativo}        onChange={v=>set('ativo',v)}        label="Regra ativa" />
          <Toggle value={form.revisao_anual} onChange={v=>set('revisao_anual',v)} label="Revisão anual" />
        </div>
      </FormSection>

      <FormSection label="Escopo">
        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Selecione um ou ambos os escopos — podem ser aplicados simultaneamente.</div>
        <div style={{ display:'flex', gap:10 }}>
          {[
            { key:'escopo_interno', label:'Interna', desc:'Vinculada a usuário do sistema', color:'var(--accent)' },
            { key:'escopo_externo', label:'Externa', desc:'Vinculada a Contato Canal',      color:'#10B981' },
          ].map(opt => {
            const active = !!form[opt.key]
            return (
              <button key={opt.key} type="button" onClick={() => set(opt.key, !active)}
                style={{ flex:1, padding:'12px 14px', borderRadius:10, cursor:'pointer', textAlign:'left', border: active ? `2px solid ${opt.color}` : '2px solid var(--border)', background: active ? `${opt.color}12` : 'var(--surface2)', transition:'all 0.15s', position:'relative', fontFamily:'var(--font)' }}>
                {active && <div style={{ position:'absolute', top:8, right:8, width:16, height:16, borderRadius:'50%', background:opt.color, display:'flex', alignItems:'center', justifyContent:'center' }}><CheckCircle2 size={10} strokeWidth={3} color="#fff" /></div>}
                <div style={{ fontSize:13, fontWeight:700, color: active ? opt.color : 'var(--text)', marginBottom:3 }}>{opt.label}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{opt.desc}</div>
              </button>
            )
          })}
        </div>
        {form.escopo_interno && (
          <FormGrid cols={1}>
            <FormField label="Usuário do sistema" required>
              <select className="so-field" value={form.beneficiario_id||''} onChange={e => { const u = MOCK_USUARIOS.find(u=>u.id===e.target.value); set('beneficiario_id',e.target.value); set('beneficiario_nome',u?.nome||'') }}>
                <option value="">— Selecionar usuário —</option>
                {MOCK_USUARIOS.map(u=><option key={u.id} value={u.id}>{u.nome} · {u.cargo}</option>)}
              </select>
            </FormField>
          </FormGrid>
        )}
        {form.escopo_externo && (
          <FormGrid cols={1}>
            <FormField label="Contato Canal" required>
              <select className="so-field" value={form.contato_id||''} onChange={e => { const c = contatos.find(c=>c.id===e.target.value); set('contato_id',e.target.value); set('contato_nome',c?.nome||''); set('contato_empresa',c?.empresa_nome||'') }}>
                <option value="">— Selecionar contato —</option>
                {contatos.map(c=><option key={c.id} value={c.id}>{c.nome} · {c.empresa_nome}</option>)}
              </select>
            </FormField>
          </FormGrid>
        )}
      </FormSection>

      <FormSection label="Produto / Categoria">
        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Restrinja a regra a um produto específico ou a uma categoria de produtos.</div>
        <div style={{ display:'flex', gap:10 }}>
          {[
            { id: null,        label:'Todos',    desc:'Sem restrição' },
            { id: 'produto',   label:'Produto',  desc:'Produto específico' },
            { id: 'categoria', label:'Categoria',desc:'Categoria de produtos' },
          ].map(opt => {
            const active = form.produto_filtro_tipo === opt.id
            return (
              <button key={String(opt.id)} type="button" onClick={() => set('produto_filtro_tipo', active ? null : opt.id)}
                style={{ flex:1, padding:'10px 12px', borderRadius:10, cursor:'pointer', textAlign:'left', border: active ? '2px solid #F59E0B' : '2px solid var(--border)', background: active ? 'rgba(245,158,11,0.08)' : 'var(--surface2)', transition:'all 0.15s', fontFamily:'var(--font)' }}>
                <div style={{ fontSize:13, fontWeight:700, color: active ? '#B45309' : 'var(--text)', marginBottom:3 }}>{opt.label}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{opt.desc}</div>
              </button>
            )
          })}
        </div>
        {form.produto_filtro_tipo === 'produto' && (
          <FormGrid cols={1}>
            <FormField label="Produtos">
              <MultiSearchSelect values={form.produto_ids||[]} onChange={ids=>set('produto_ids',ids)}
                options={MOCK_PRODUTOS.filter(p=>p.status==='ativo').map(p=>({ value:String(p.id), label:p.nome, sublabel:`${p.codigo} · ${p.categoria}` }))}
                placeholder="Buscar produto…" />
            </FormField>
          </FormGrid>
        )}
        {form.produto_filtro_tipo === 'categoria' && (
          <FormGrid cols={1}>
            <FormField label="Categorias">
              <MultiSearchSelect values={form.produto_categorias||[]}
                onChange={cats=>set('produto_categorias',cats)}
                options={[...new Set(MOCK_PRODUTOS.map(p=>p.categoria).filter(Boolean))].sort().map(c=>({ value:c, label:c }))}
                placeholder="Buscar categoria…" />
            </FormField>
          </FormGrid>
        )}
      </FormSection>

      <FormSection label="Tipos de Cálculo">
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>Selecione um ou mais tipos — todos os marcados serão aplicados simultaneamente.</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {Object.entries(TIPO_CALCULO_CFG).map(([id, cfg]) => {
            const Icon = id==='cadeia_repasse'?Link2:id==='escalonado'?BarChart2:Percent
            const sel = tipos.includes(id)
            return (
              <button key={id} type="button" onClick={() => toggleTipo(id)}
                style={{ padding:'14px 12px', borderRadius:10, cursor:'pointer', textAlign:'left', border: sel ? `2px solid ${cfg.color}` : '2px solid var(--border)', background: sel ? cfg.bg : 'var(--surface2)', transition:'all 0.15s', position:'relative', fontFamily:'var(--font)' }}>
                {sel && <div style={{ position:'absolute', top:8, right:8, width:16, height:16, borderRadius:'50%', background:cfg.color, display:'flex', alignItems:'center', justifyContent:'center' }}><CheckCircle2 size={10} strokeWidth={3} color="#fff" /></div>}
                <Icon size={18} strokeWidth={1.75} style={{ color:cfg.color, marginBottom:8, display:'block' }} />
                <div style={{ fontSize:12, fontWeight:700, color: sel ? cfg.color : 'var(--text)', marginBottom:4 }}>{cfg.label}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.45 }}>{cfg.desc}</div>
              </button>
            )
          })}
        </div>
      </FormSection>

      {isFixo && (
        <FormSection label="Percentuais por Persona × Tipo de Receita">
          <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:`140px repeat(${RECEITA_TIPOS.length},1fr)`, background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
              <div style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase' }}>Persona</div>
              {RECEITA_TIPOS.map(t => <div key={t} style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', textAlign:'center' }}>{t}</div>)}
            </div>
            {personas.filter(p=>p.ativo).map((p, pi) => (
              <div key={p.id} style={{ display:'grid', gridTemplateColumns:`140px repeat(${RECEITA_TIPOS.length},1fr)`, borderBottom:pi<personas.filter(x=>x.ativo).length-1?'1px solid var(--border)':'none', alignItems:'center' }}>
                <div style={{ padding:'10px 12px', display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:p.cor, flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.label}</span>
                </div>
                {RECEITA_TIPOS.map(tipo => (
                  <div key={tipo} style={{ padding:'8px 10px', display:'flex', alignItems:'center', gap:4 }}>
                    <input type="number" min={0} max={100} step={0.5} className="so-field"
                      value={getPerc(form.persona_percentuais, p.id, tipo)}
                      onChange={e => set('persona_percentuais', setPerc(form.persona_percentuais, p.id, tipo, e.target.value))}
                      style={{ textAlign:'right' }} />
                    <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {isCadeia && (
        <FormSection label="Parâmetros da Cadeia de Repasse">
          <FormGrid cols={3}>
            {[
              { key:'repasse_origem_pct',  label:'Repasse fabricante/dist. (%)', placeholder:'Ex: 50' },
              { key:'base_calculo_pct',    label:'Base sobre líquido NG (%)',     placeholder:'Ex: 39' },
              { key:'percentual_comissao', label:'% comissão sobre a base',       placeholder:'Ex: 5' },
            ].map(f => (
              <FormField key={f.key} label={f.label}>
                <input type="number" min={0} max={100} step={0.5} className="so-field" value={form[f.key]??''} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder} />
              </FormField>
            ))}
          </FormGrid>
          <FormulaPreview repasse={form.repasse_origem_pct} base={form.base_calculo_pct} pct={form.percentual_comissao} />
          <FormGrid cols={2}>
            <FormField label="Tipo de recorrência">
              <select className="so-field" value={form.tipo_recorrencia} onChange={e=>set('tipo_recorrencia',e.target.value)}>
                {Object.entries(TIPO_RECORRENCIA_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
            {form.tipo_recorrencia === 'prazo_fixo' && (
              <FormField label="Prazo (meses)">
                <input type="number" min={1} className="so-field" value={form.prazo_meses||''} onChange={e=>set('prazo_meses',parseInt(e.target.value)||null)} placeholder="Ex: 18" />
              </FormField>
            )}
          </FormGrid>
        </FormSection>
      )}

      {isEscal && (
        <FormSection label="Escala de Comissão">
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <SectionTitle icon={<TrendingUp size={13} strokeWidth={2} />} label="Escala Individual" />
              <div style={{ marginTop:8 }}><EscalaEditor rows={form.escala_individual||DEFAULT_ESCALA_INDIVIDUAL} onChange={v=>set('escala_individual',v)} valueKey="comissao_pct" valueLabel="Comissão (%)" accentColor="#F59E0B" /></div>
            </div>
            <div>
              <SectionTitle icon={<TrendingUp size={13} strokeWidth={2} />} label="Bônus de Equipe" />
              <div style={{ marginTop:8 }}><EscalaEditor rows={form.escala_equipe||DEFAULT_ESCALA_EQUIPE} onChange={v=>set('escala_equipe',v)} valueKey="bonus_pct" valueLabel="Bônus (%)" accentColor="#10B981" /></div>
            </div>
            <FormGrid cols={1}>
              <FormField label="Condição para bônus de equipe">
                <input className="so-field" value={form.condicao_bonus_equipe||''} onChange={e=>set('condicao_bonus_equipe',e.target.value)} placeholder="Ex: Exige atingimento prévio da meta individual" />
              </FormField>
            </FormGrid>
          </div>
        </FormSection>
      )}

      <FormSection label="Elegibilidade">
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>A comissão só é paga quando todas as condições abaixo forem atendidas.</div>
        <ConditionBuilder conditions={form.condicoes_elegibilidade||[]} onChange={v=>set('condicoes_elegibilidade',v)} />
        <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginTop:4 }}>
          <Toggle value={form.exige_participacao_venda} onChange={v=>set('exige_participacao_venda',v)} label="Exige participação na venda" />
          <Toggle value={form.cessa_no_cancelamento}    onChange={v=>set('cessa_no_cancelamento',v)}    label="Cessa no cancelamento" />
        </div>
        <FormGrid cols={1}>
          <FormField label="Notas adicionais">
            <textarea className="so-field" rows={2} value={form.notas_elegibilidade||''} onChange={e=>set('notas_elegibilidade',e.target.value)} placeholder="Observações, exceções ou restrições adicionais." style={{ resize:'vertical' }} />
          </FormField>
        </FormGrid>
      </FormSection>

      {err && (
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 12px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:13 }}>
          <AlertCircle size={14} strokeWidth={2}/>{err}
        </div>
      )}

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={saving} onClick={submit}>{isNew ? 'Criar regra' : 'Salvar alterações'}</Button>
      </div>
    </div>
  )
}

// ─── Tab: Acompanhamento de Repasses ─────────────────────────────────────────
function TabRepasses({ payments, setPayments, rules, personas, onEdit }) {
  const [search, setSearch]           = useState('')
  const [activeFilters, setActiveFilters] = useState({})

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const statusF  = activeFilters.status       || []
    const personaF = activeFilters.persona      || []
    const tipoF    = activeFilters.receita_tipo || []
    return payments.filter(p => {
      if (statusF.length  && !statusF.includes(p.status))       return false
      if (personaF.length && !personaF.includes(p.persona))     return false
      if (tipoF.length    && !tipoF.includes(p.receita_tipo))   return false
      if (q && !(p.beneficiario_nome.toLowerCase().includes(q) || (p.descricao||'').toLowerCase().includes(q))) return false
      return true
    })
  }, [payments, search, activeFilters])

  const totals = useMemo(() => ({
    total:    payments.length,
    pendente: payments.filter(p=>p.status==='pendente').reduce((s,p)=>s+Number(p.valor_comissao),0),
    pago:     payments.filter(p=>p.status==='pago').reduce((s,p)=>s+Number(p.valor_comissao),0),
  }), [payments])

  function markPago(id) { setPayments(prev => prev.map(p => p.id===id ? {...p, status:'pago', data_pagamento:today()} : p)) }

  const COLUMNS = [
    { key: 'beneficiario_nome', label: 'Beneficiário', render: (val, row) => (
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <Avatar nome={val} />
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{val || '—'}</div>
          {row.descricao && <div style={{ fontSize:11, color:'var(--text-muted)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.descricao}</div>}
        </div>
      </div>
    )},
    { key: 'persona',      label: 'Persona',  render: val => <PersonaTag personaId={val} personas={personas} /> },
    { key: 'receita_tipo', label: 'Tipo',     render: val => <span style={{ fontSize:12, fontWeight:600, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>{val}</span> },
    { key: 'valor_base', label: 'Base / %', render: (val, row) => (
      <div>
        <div style={{ fontSize:12, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>{fmt(val)}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtPct(row.percentual)}</div>
      </div>
    )},
    { key: 'valor_comissao', label: 'Comissão', render: val => <span style={{ fontSize:14, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmt(val)}</span> },
    { key: 'data_vencimento', label: 'Vencimento', render: val => (
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        <Calendar size={12} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />
        <span style={{ fontSize:12, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>{fmtDate(val)}</span>
      </div>
    )},
    { key: 'status', label: 'Status', render: (val, row) => (
      <div style={{ display:'flex', alignItems:'center', gap:6 }} onClick={e => e.stopPropagation()}>
        <StatusTag status={val} />
        {val === 'pendente' && (
          <button onClick={() => markPago(row.id)}
            style={{ padding:'3px 7px', borderRadius:5, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#10B981', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', display:'flex', alignItems:'center', gap:3 }}>
            <CheckCircle2 size={10} strokeWidth={2.5} />Pagar
          </button>
        )}
      </div>
    )},
  ]

  const FILTERS = [
    { key: 'status',       label: 'Status',  options: Object.entries(STATUS_CFG).map(([k,v]) => ({ value:k, label:v.label })) },
    { key: 'persona',      label: 'Persona', options: personas.filter(p=>p.ativo).map(p => ({ value:p.id, label:p.label })) },
    { key: 'receita_tipo', label: 'Tipo',    options: RECEITA_TIPOS.map(t => ({ value:t, label:t })) },
  ]

  const kpisNode = (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
      {[
        { label:'Total de lançamentos', value:totals.total,    Icon:DollarSign,  color:'var(--accent)', isCurrency:false },
        { label:'A pagar (pendente)',   value:totals.pendente, Icon:Clock,        color:'#F59E0B',      isCurrency:true  },
        { label:'Já pago',             value:totals.pago,     Icon:CheckCircle2, color:'#10B981',      isCurrency:true  },
      ].map(m => (
        <div key={m.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`${m.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <m.Icon size={17} strokeWidth={1.75} style={{ color:m.color }} />
          </div>
          <div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500, marginBottom:3 }}>{m.label}</div>
            <div style={{ fontSize:19, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)', lineHeight:1 }}>{m.isCurrency?fmt(m.value):m.value}</div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <BrowseLayout
      data={filtered}
      columns={COLUMNS}
      filters={FILTERS}
      activeFilters={activeFilters}
      onFilterChange={setActiveFilters}
      search={search}
      onSearchChange={setSearch}
      keyField="id"
      storageKey="comissoes_repasses"
      onRowClick={row => onEdit({ type:'edit', data:row })}
      kpis={kpisNode}
      bulkActions={[
        { label: 'Marcar como pago', onClick: ids => setPayments(prev => prev.map(p => ids.includes(p.id) && p.status==='pendente' ? {...p, status:'pago', data_pagamento:today()} : p)) },
        { label: 'Excluir',          onClick: ids => { if (window.confirm(`Excluir ${ids.length} lançamento(s)?`)) setPayments(prev => prev.filter(p => !ids.includes(p.id))) } },
      ]}
      bulkEditFields={[
        { key: 'data_vencimento', label: 'Data de vencimento', type: 'date' },
      ]}
      onBulkEdit={(ids, changes) => setPayments(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...changes } : p))}
      renderCard={row => (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <Avatar nome={row.beneficiario_nome} size={36} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{row.beneficiario_nome}</div>
              <PersonaTag personaId={row.persona} personas={personas} />
            </div>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <StatusTag status={row.status} />
            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{row.receita_tipo}</span>
          </div>
          <div style={{ fontSize:18, fontWeight:800, fontFamily:'var(--mono)', color:'var(--text)' }}>{fmt(row.valor_comissao)}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>Base: {fmt(row.valor_base)} × {fmtPct(row.percentual)}</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-muted)' }}>
            <Calendar size={11} strokeWidth={2} /> Venc. {fmtDate(row.data_vencimento)}
          </div>
        </div>
      )}
      emptyState={
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:13 }}>
          <DollarSign size={32} strokeWidth={1} style={{ marginBottom:12, opacity:0.3, display:'block', margin:'0 auto 12px' }} />
          Nenhum lançamento encontrado.
        </div>
      }
    />
  )
}

// ─── Tab: Regras de Configuração ──────────────────────────────────────────────
function TabRegras({ rules, setRules, personas, setPersonas, onEditRule }) {
  const [deleting, setDeleting]     = useState(null)
  const [showPersonas, setShowPersonas] = useState(false)

  async function deleteRule(id) {
    if (!window.confirm('Excluir esta regra?')) return
    setDeleting(id); await new Promise(r => setTimeout(r,200))
    setRules(prev => prev.filter(r => r.id!==id)); setDeleting(null)
  }
  function toggleAtivo(rule) { setRules(prev => prev.map(r => r.id===rule.id ? {...r,ativo:!r.ativo} : r)) }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:13, color:'var(--text-muted)' }}>{rules.length} {rules.length===1?'regra':'regras'} configuradas</div>
        <button onClick={()=>setShowPersonas(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-soft)', fontSize:12, fontFamily:'var(--font)', cursor:'pointer', fontWeight:500 }}>
          <Settings size={13} strokeWidth={1.75} /> Gerenciar Personas
          <span style={{ marginLeft:4, padding:'1px 7px', borderRadius:99, background:'var(--surface2)', fontSize:11, fontWeight:700, color:'var(--text-muted)', border:'1px solid var(--border)' }}>{personas.filter(p=>p.ativo).length}</span>
        </button>
      </div>

      {rules.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)', fontSize:14 }}>
          <Percent size={36} strokeWidth={1} style={{ marginBottom:14, opacity:0.25, display:'block', margin:'0 auto 14px' }} />
          Nenhuma regra cadastrada.
          <br /><Button onClick={()=>onEditRule('new')} style={{ marginTop:14 }}>+ Criar primeira regra</Button>
        </div>
      ) : rules.map(rule => {
        const tipos = rule.tipos_calculo_arr || [rule.tipo_calculo || 'percentual_fixo']
        const isFixo = tipos.includes('percentual_fixo'); const isCadeia = tipos.includes('cadeia_repasse'); const isEscal = tipos.includes('escalonado'); const isCombo = tipos.length > 1
        return (
          <div key={rule.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', opacity:rule.ativo?1:0.6, transition:'opacity 0.2s' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, flex:1, minWidth:0 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:TIPO_CALCULO_CFG[tipos[0]]?.bg||'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {isFixo&&!isCadeia&&!isEscal&&<Percent size={17} strokeWidth={1.75} style={{ color:TIPO_CALCULO_CFG.percentual_fixo.color }} />}
                  {isCadeia&&!isEscal&&<Link2 size={17} strokeWidth={1.75} style={{ color:TIPO_CALCULO_CFG.cadeia_repasse.color }} />}
                  {isEscal&&!isCadeia&&<BarChart2 size={17} strokeWidth={1.75} style={{ color:TIPO_CALCULO_CFG.escalonado.color }} />}
                  {isCombo&&<Zap size={17} strokeWidth={1.75} style={{ color:'#F59E0B' }} />}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                    {rule.nome}
                    {tipos.map(t => <TipoBadge key={t} tipoId={t} />)}
                    {rule.escopo_interno && <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, color:'var(--accent)', background:'rgba(99,102,241,0.1)' }}><User size={9} strokeWidth={2.5} />Interna</span>}
                    {rule.escopo_externo && <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, color:'#10B981', background:'rgba(16,185,129,0.1)' }}><Users size={9} strokeWidth={2.5} />Externa</span>}
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:rule.ativo?'rgba(16,185,129,0.12)':'var(--surface2)', color:rule.ativo?'#10B981':'var(--text-muted)', letterSpacing:'0.05em', textTransform:'uppercase' }}>{rule.ativo?'Ativa':'Inativa'}</span>
                  </div>
                  {rule.escopo_interno&&rule.beneficiario_nome&&<div style={{ fontSize:12, color:'var(--accent)', marginBottom:2, display:'flex', alignItems:'center', gap:5 }}><User size={11} strokeWidth={2} />{rule.beneficiario_nome}</div>}
                  {rule.escopo_externo&&rule.contato_nome&&<div style={{ fontSize:12, color:'#10B981', marginBottom:2, display:'flex', alignItems:'center', gap:5 }}><Users size={11} strokeWidth={2} />{rule.contato_nome}{rule.contato_empresa?` · ${rule.contato_empresa}`:''}</div>}
                  {rule.descricao&&<div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:2 }}>{rule.descricao}</div>}
                  {rule.contexto&&<div style={{ fontSize:11, color:'var(--text-muted)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:'6px 10px', marginTop:6, borderLeft:'3px solid var(--accent)' }}>{rule.contexto}</div>}
                  {(rule.vigencia_inicio||rule.vigencia_fim)&&<div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6, display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}><Calendar size={11} strokeWidth={2} />Vigência: {rule.vigencia_inicio?fmtDate(rule.vigencia_inicio):'—'} → {rule.vigencia_fim?fmtDate(rule.vigencia_fim):'indeterminado'}{rule.revisao_anual&&<span style={{ marginLeft:6, padding:'1px 6px', borderRadius:99, background:'rgba(99,102,241,0.1)', color:'var(--accent)', fontSize:10, fontWeight:600, display:'inline-flex', alignItems:'center', gap:3 }}><RotateCcw size={9} strokeWidth={2.5} />Revisão anual</span>}</div>}
                  {(rule.condicoes_elegibilidade||[]).length>0&&<div style={{ marginTop:7, display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}><Filter size={10} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />{rule.condicoes_elegibilidade.map(c=><span key={c.id} style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{c.label||`${c.entidade}.${c.campo} ${c.operador} "${c.valor}"`}</span>)}</div>}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={()=>toggleAtivo(rule)} style={{ padding:'5px 12px', borderRadius:7, background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>{rule.ativo?'Desativar':'Ativar'}</button>
                <button onClick={()=>onEditRule({type:'edit',data:rule})} style={{ padding:'5px 10px', borderRadius:7, background:'none', border:'1px solid var(--border)', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', display:'flex', alignItems:'center', gap:5 }}><Pencil size={12} strokeWidth={2} />Editar</button>
                <button onClick={()=>deleteRule(rule.id)} disabled={deleting===rule.id} style={{ padding:'5px 8px', borderRadius:7, background:'none', border:'1px solid rgba(239,68,68,0.3)', color:'#EF4444', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center' }}>
                  {deleting===rule.id?<Loader2 size={13} strokeWidth={2} style={{ animation:'spin 1s linear infinite' }} />:<Trash2 size={13} strokeWidth={2} />}
                </button>
              </div>
            </div>

            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>
              {isFixo && (
                <div>
                  {isCombo&&<div style={{ fontSize:10, fontWeight:700, color:TIPO_CALCULO_CFG.percentual_fixo.color, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Percentual Fixo por Persona</div>}
                  <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                    <div style={{ display:'grid', gridTemplateColumns:`120px repeat(${RECEITA_TIPOS.length},1fr)` }}>
                      <div style={{ background:'var(--surface2)', padding:'7px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>Persona</div>
                      {RECEITA_TIPOS.map(t=><div key={t} style={{ background:'var(--surface2)', padding:'7px 12px', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase', textAlign:'center', borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)' }}>{t}</div>)}
                      {(rule.persona_percentuais||[]).map((pp,pi)=>{
                        const persona=personas.find(p=>p.id===pp.persona_id); if(!persona)return null
                        const isLast=pi===(rule.persona_percentuais||[]).length-1
                        return [
                          <div key={`${pp.persona_id}-l`} style={{ padding:'10px 12px', borderBottom:isLast?'none':'1px solid var(--border)', display:'flex', alignItems:'center', gap:7 }}>
                            <span style={{ width:7, height:7, borderRadius:'50%', background:persona.cor, flexShrink:0 }} />
                            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-soft)' }}>{persona.label}</span>
                          </div>,
                          ...RECEITA_TIPOS.map(tipo=>{
                            const val=Number(getPerc(rule.persona_percentuais,pp.persona_id,tipo))
                            return <div key={`${pp.persona_id}-${tipo}`} style={{ padding:'10px 12px', textAlign:'center', borderBottom:isLast?'none':'1px solid var(--border)', borderLeft:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <span style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:val===0?'var(--text-muted)':val>=10?'var(--accent)':'var(--text)', opacity:val===0?0.5:1 }}>{val===0?'—':fmtPct(val)}</span>
                            </div>
                          })
                        ]
                      })}
                    </div>
                  </div>
                </div>
              )}
              {isCadeia && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {isCombo&&<div style={{ fontSize:10, fontWeight:700, color:TIPO_CALCULO_CFG.cadeia_repasse.color, textTransform:'uppercase', letterSpacing:'0.07em' }}>Cadeia de Repasse</div>}
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    {[{label:'Bruto (cliente)',value:'100%',note:'base entrada'},null,{label:'Repasse fabricante',value:fmtPct(rule.repasse_origem_pct||0),note:'→ líquido NG'},null,{label:'Base cálculo',value:fmtPct(rule.base_calculo_pct||0),note:'do líquido NG'},null,{label:'Comissão',value:fmtPct(rule.percentual_comissao||0),note:'sobre a base',highlight:true}].map((item,i)=>item===null?<ChevronRight key={i} size={14} strokeWidth={2} style={{ color:'var(--text-muted)',flexShrink:0 }} />:<div key={i} style={{ textAlign:'center',background:item.highlight?'rgba(16,185,129,0.08)':'var(--surface2)',border:`1px solid ${item.highlight?'rgba(16,185,129,0.25)':'var(--border)'}`,borderRadius:9,padding:'10px 14px' }}><div style={{ fontSize:10,color:'var(--text-muted)',marginBottom:4 }}>{item.label}</div><div style={{ fontSize:17,fontWeight:800,fontFamily:'var(--mono)',color:item.highlight?'#10B981':'var(--text)' }}>{item.value}</div><div style={{ fontSize:10,color:'var(--text-muted)',marginTop:3 }}>{item.note}</div></div>)}
                  </div>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 13px', borderRadius:9, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                      <RotateCcw size={13} strokeWidth={2} style={{ color:'var(--text-muted)' }} />
                      <span style={{ fontSize:12, color:'var(--text-soft)' }}>{TIPO_RECORRENCIA_CFG[rule.tipo_recorrencia]?.label||rule.tipo_recorrencia}</span>
                      {rule.prazo_meses&&<span style={{ fontSize:12, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{rule.prazo_meses} meses</span>}
                    </div>
                    {rule.exige_participacao_venda&&<InfoPill icon={<CheckCircle2 size={11} strokeWidth={2.5} />} label="Exige participação na venda" color="#10B981" />}
                    {rule.cessa_no_cancelamento&&<InfoPill icon={<XCircle size={11} strokeWidth={2.5} />} label="Cessa no cancelamento" color="#F59E0B" />}
                  </div>
                  {rule.notas_elegibilidade&&<div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 12px', background:'var(--surface2)', borderRadius:8, borderLeft:'3px solid var(--border)' }}>{rule.notas_elegibilidade}</div>}
                </div>
              )}
              {isEscal && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {isCombo&&<div style={{ fontSize:10, fontWeight:700, color:TIPO_CALCULO_CFG.escalonado.color, textTransform:'uppercase', letterSpacing:'0.07em' }}>Escalonado por Meta</div>}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <EscalaReadonly rows={rule.escala_individual||[]} valueKey="comissao_pct" title="Comissão Individual" accent="#F59E0B" />
                    {(rule.escala_equipe||[]).length>0&&<EscalaReadonly rows={rule.escala_equipe} valueKey="bonus_pct" title="Bônus de Equipe" accent="#10B981" />}
                  </div>
                  {rule.condicao_bonus_equipe&&<div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', padding:'8px 12px', background:'var(--surface2)', borderRadius:8 }}><Info size={12} strokeWidth={2} style={{ flexShrink:0 }} /><span><strong style={{ color:'var(--text-soft)' }}>Condição bônus equipe:</strong> {rule.condicao_bonus_equipe}</span></div>}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {showPersonas && <PersonasEditor personas={personas} onChange={p=>{setPersonas(p);setShowPersonas(false)}} onClose={()=>setShowPersonas(false)} />}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Comissoes() {
  const [tab, setTab]       = useLocalState('comissoes:tab', 'repasses')
  const [period, setPeriod] = useState('this_month')
  const { rules, payments, personas, setRules, setPayments, setPersonas } = useCommissions()
  const [editandoPayment, setEditandoPayment] = useState(null)
  const [editandoRule, setEditandoRule]       = useState(null)
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
      setEditandoRule({ ...EMPTY_RULE, persona_percentuais: personas.map(p => ({ persona_id:p.id, cdu_pct:0, sms_pct:0, servicos_pct:0 })) })
    } else if (modal?.type === 'edit') {
      const base = { ...EMPTY_RULE, ...modal.data }
      const existingIds = (base.persona_percentuais||[]).map(p=>p.persona_id)
      const merged = [
        ...(base.persona_percentuais||[]),
        ...personas.filter(p=>!existingIds.includes(p.id)).map(p=>({ persona_id:p.id, cdu_pct:0, sms_pct:0, servicos_pct:0 })),
      ]
      setEditandoRule({ ...base, persona_percentuais: merged })
    }
  }

  function savePayment(updated) {
    setPayments(prev => prev.find(p=>p.id===updated.id) ? prev.map(p=>p.id===updated.id?updated:p) : [...prev, updated])
    setEditandoPayment(null)
  }

  function saveRule(updated) {
    setRules(prev => prev.find(r=>r.id===updated.id) ? prev.map(r=>r.id===updated.id?updated:r) : [...prev, updated])
    setEditandoRule(null)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, minHeight:0 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:24, flexWrap:'wrap' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <DollarSign size={17} strokeWidth={1.75} style={{ color:'var(--accent)' }} />
            </div>
            <div>
              <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', margin:0, letterSpacing:'-0.3px' }}>Gestão de Comissões</h1>
              {totalPendente > 0 && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{fmt(totalPendente)} pendente de pagamento</div>}
            </div>
          </div>
          {/* Toggle de abas */}
          <div style={{ display:'flex', gap:2, background:'var(--surface2)', borderRadius:9, padding:3, border:'1px solid var(--border)' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'6px 16px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:tab===t.id?700:500, fontFamily:'var(--font)', background:tab===t.id?'var(--surface)':'none', color:tab===t.id?'var(--text)':'var(--text-muted)', boxShadow:tab===t.id?'0 1px 3px rgba(0,0,0,0.12)':'none', transition:'all 0.15s' }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0, paddingTop:4 }}>
          <PeriodPopover value={period} onChange={setPeriod} />
          <Button icon={<Plus size={SZ} strokeWidth={2.5} />} onClick={() => tab==='repasses' ? openPayment('new') : openRule('new')}>
            {tab==='repasses' ? 'Novo Lançamento' : 'Nova Regra'}
          </Button>
        </div>
      </div>

      {tab === 'repasses' && (
        <TabRepasses payments={payments} setPayments={setPayments} rules={rules} personas={personas} onEdit={openPayment} />
      )}
      {tab === 'regras' && (
        <TabRegras rules={rules} setRules={setRules} personas={personas} setPersonas={setPersonas} onEditRule={openRule} />
      )}

      {/* ── SlideOver: Lançamento ─────────────────────────────────────── */}
      <SlideOver
        open={!!editandoPayment}
        onClose={() => setEditandoPayment(null)}
        title={editandoPayment?.id ? (editandoPayment.beneficiario_nome || 'Editar Lançamento') : 'Novo Lançamento'}
        subtitle="Repasse de comissão"
        defaultWidth={600}
        showFooter={false}
      >
        {editandoPayment && (
          <PaymentForm
            form={editandoPayment}
            setForm={setEditandoPayment}
            rules={rules}
            personas={personas}
            onSave={savePayment}
            onClose={() => setEditandoPayment(null)}
          />
        )}
      </SlideOver>

      {/* ── SlideOver: Regra ──────────────────────────────────────────── */}
      <SlideOver
        open={!!editandoRule}
        onClose={() => setEditandoRule(null)}
        title={editandoRule?.id ? (editandoRule.nome || 'Editar Regra') : 'Nova Regra de Comissão'}
        subtitle="Configure o modelo de cálculo e as condições de elegibilidade"
        defaultWidth={840}
        showFooter={false}
      >
        {editandoRule && (
          <RuleForm
            form={editandoRule}
            setForm={setEditandoRule}
            personas={personas}
            contatos={contatos}
            onSave={saveRule}
            onClose={() => setEditandoRule(null)}
          />
        )}
      </SlideOver>
    </div>
  )
}
