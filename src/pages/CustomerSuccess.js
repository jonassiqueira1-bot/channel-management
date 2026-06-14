import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useCompanies } from '../hooks/useCompanies'
import Button from '../components/Button'
import {
  MetaSection, MetaRow, InlineText, InlineTextarea, InlineSelect, InlineDate, InlineSearchSelect,
} from '../components/NotionDrawer'
import Drawer from '../components/Drawer'
import { MOCK_USUARIOS } from '../data/mockUsuarios'
import {
  MOCK_PARTNER_HEALTH, LAER_STAGES, TOUCH_MODELS, healthColor, STORAGE_KEY,
} from '../data/mockCustomerSuccess'
import {
  HeartPulse, LayoutList, LayoutGrid, ChevronDown, ChevronUp, Plus, Check,
  Trash2, Circle, CheckCircle2, CalendarDays, User,
  Download, Upload, X, SlidersHorizontal, MoreHorizontal,
} from 'lucide-react'

const ACCENT = '#6366F1'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return 'ph_' + Date.now() + Math.floor(Math.random() * 9999) }
function aidFn() { return 'ap_' + Date.now() + Math.floor(Math.random() * 9999) }
function cidFn() { return 'ci_' + Date.now() + Math.floor(Math.random() * 9999) }

function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function daysUntil(iso) {
  if (!iso) return null
  const diff = new Date(iso) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Badges ──────────────────────────────────────────────────────────────────
function LaerBadge({ stage }) {
  const cfg = LAER_STAGES.find(s => s.value === stage) || LAER_STAGES[0]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function TouchBadge({ model }) {
  const cfg = TOUCH_MODELS.find(t => t.value === model)
  if (!cfg) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)',
      background: `${cfg.color}18`, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function HealthRing({ score, size = 44 }) {
  const { color, bg } = healthColor(score)
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.4s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.26, fontWeight: 800, color, fontFamily: 'var(--mono)',
      }}>
        {score}
      </div>
    </div>
  )
}

// ─── Inline Health Score ───────────────────────────────────────────────────────
function InlineHealthScore({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const ref = useRef(null)
  const { color, bg, border } = healthColor(Number(value))

  useEffect(() => { setDraft(String(value)) }, [value])
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select() } }, [editing])

  function commit() {
    setEditing(false)
    const n = Math.max(0, Math.min(100, parseInt(draft, 10) || 0))
    setDraft(String(n))
    if (n !== value) onChange(n)
  }

  if (editing) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input ref={ref} type="number" min={0} max={100}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(String(value)); setEditing(false) } }}
        style={{ width: 64, padding: '3px 8px', border: `1.5px solid ${ACCENT}`,
          borderRadius: 6, background: 'var(--surface)', fontSize: 13,
          color: 'var(--text)', fontFamily: 'var(--mono)', outline: 'none' }}
      />
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</span>
    </div>
  )

  return (
    <div onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <HealthRing score={value} size={40} />
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {value >= 80 ? 'Saudável' : value >= 50 ? 'Atenção' : 'Em risco'}
        </div>
      </div>
    </div>
  )
}

// ─── Filtro Popover ───────────────────────────────────────────────────────────
function FilterPopover({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const active = value !== ''
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 11px', borderRadius: 7, fontSize: 12, fontWeight: 600,
        border: `1px solid ${active ? ACCENT : 'var(--border)'}`,
        background: active ? `${ACCENT}10` : 'var(--surface)',
        color: active ? ACCENT : 'var(--text)',
        cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
      }}>
        <SlidersHorizontal size={12} />
        {label}{active && `: ${options.find(o => o.value === value)?.label || value}`}
        <ChevronDown size={11} style={{ opacity: 0.6, marginLeft: 2 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          minWidth: 160, overflow: 'hidden',
        }}>
          <div onClick={() => { onChange(''); setOpen(false) }}
            style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer',
              color: value === '' ? ACCENT : 'var(--text-muted)', fontWeight: value === '' ? 700 : 400,
              borderBottom: '1px solid var(--border2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Todos
          </div>
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer',
                color: value === o.value ? ACCENT : 'var(--text)', fontWeight: value === o.value ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {value === o.value && <Check size={11} color={ACCENT} />}
              {value !== o.value && <span style={{ width: 11 }} />}
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Dropdown Ação (Importar/Exportar) ────────────────────────────────────────
function ActionDropdown({ onImport, onExport }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '7px 12px', border: '1px solid var(--border)',
        borderRadius: 8, background: 'var(--surface)', color: 'var(--text)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
      }}>
        Ações <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          minWidth: 160, overflow: 'hidden',
        }}>
          {[
            { icon: <Upload size={13} />, label: 'Importar CSV', action: onImport },
            { icon: <Download size={13} />, label: 'Exportar CSV', action: onExport },
          ].map(({ icon, label, action }) => (
            <div key={label} onClick={() => { action(); setOpen(false) }}
              style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 9,
                fontSize: 12, cursor: 'pointer', color: 'var(--text)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Plano de Ação ─────────────────────────────────────────────────────────────
function ActionPlanBlock({ plans, onChange }) {
  const [newText, setNewText] = useState('')
  const inputRef = useRef(null)

  function addPlan() {
    const t = newText.trim()
    if (!t) return
    onChange([...plans, { id: aidFn(), text: t, done: false }])
    setNewText('')
    inputRef.current?.focus()
  }

  function toggle(id) {
    onChange(plans.map(p => p.id === id ? { ...p, done: !p.done } : p))
  }

  function remove(id) { onChange(plans.filter(p => p.id !== id)) }

  function updateText(id, text) {
    onChange(plans.map(p => p.id === id ? { ...p, text } : p))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {plans.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '6px 10px', borderRadius: 7,
          background: p.done ? 'var(--surface2)' : 'transparent',
          transition: 'background 0.15s' }}
          onMouseEnter={e => { if (!p.done) e.currentTarget.style.background = 'var(--surface2)' }}
          onMouseLeave={e => { if (!p.done) e.currentTarget.style.background = 'transparent' }}>
          <button onClick={() => toggle(p.id)} style={{ background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, marginTop: 2, flexShrink: 0, color: p.done ? '#10B981' : 'var(--border)' }}>
            {p.done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
          </button>
          <div style={{ flex: 1, fontSize: 13, color: p.done ? 'var(--text-muted)' : 'var(--text)',
            textDecoration: p.done ? 'line-through' : 'none', lineHeight: 1.5 }}>
            {p.text}
          </div>
          <button onClick={() => remove(p.id)} style={{ background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, color: 'var(--border)', opacity: 0, transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, padding: '4px 10px' }}>
        <input ref={inputRef}
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addPlan() }}
          placeholder="+ Adicionar ação…"
          style={{ flex: 1, border: 'none', borderBottom: '1.5px solid var(--border2)',
            background: 'transparent', fontSize: 12, color: 'var(--text)',
            fontFamily: 'var(--font)', outline: 'none', padding: '4px 2px' }}
        />
      </div>
    </div>
  )
}

// ─── Check-in Timeline ────────────────────────────────────────────────────────
function CheckinBlock({ checkins, onChange }) {
  const [form, setForm] = useState(null)
  const TYPES = ['Reunião', 'Ligação', 'E-mail', 'Visita', 'QBR']

  function addCheckin() {
    if (!form?.summary?.trim()) return
    onChange([{ id: cidFn(), date: form.date || new Date().toISOString().slice(0, 10),
      type: form.type || 'Reunião', summary: form.summary }, ...checkins])
    setForm(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {form ? (
        <div style={{ padding: '12px 16px', background: 'var(--surface2)',
          border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10,
          display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={LBL}>Tipo</label>
              <select value={form.type || 'Reunião'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={INPUT}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Data</label>
              <input type="date" value={form.date || new Date().toISOString().slice(0, 10)}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={INPUT} />
            </div>
          </div>
          <div>
            <label style={LBL}>Resumo</label>
            <textarea value={form.summary || ''} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              rows={3} placeholder="O que foi discutido?"
              style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setForm(null)}>Cancelar</Button>
            <Button size="sm" onClick={addCheckin}>Salvar</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setForm({ type: 'Reunião', date: new Date().toISOString().slice(0, 10), summary: '' })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            background: 'none', border: '1.5px dashed var(--border)', borderRadius: 7,
            fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer',
            fontFamily: 'var(--font)', marginBottom: 10 }}>
          <Plus size={13} /> Registrar check-in
        </button>
      )}

      <div style={{ position: 'relative' }}>
        {checkins.map((ci, i) => {
          const TYPE_COLOR = {
            'Reunião': '#6366F1', 'Ligação': '#10B981', 'E-mail': '#3B82F6',
            'Visita': '#F59E0B', 'QBR': '#EC4899',
          }
          const dotColor = TYPE_COLOR[ci.type] || '#6B7280'
          return (
            <div key={ci.id} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
              {/* linha vertical */}
              {i < checkins.length - 1 && (
                <div style={{ position: 'absolute', left: 10, top: 20, bottom: 0,
                  width: 1.5, background: 'var(--border2)' }} />
              )}
              {/* dot */}
              <div style={{ width: 21, height: 21, borderRadius: '50%', flexShrink: 0,
                background: `${dotColor}20`, border: `2px solid ${dotColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: dotColor,
                    padding: '1px 7px', background: `${dotColor}15`,
                    borderRadius: 99, fontFamily: 'var(--mono)' }}>
                    {ci.type}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                    {fmtDate(ci.date)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{ci.summary}</div>
              </div>
            </div>
          )
        })}
        {checkins.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
            Nenhum check-in registrado.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card de parceiro ─────────────────────────────────────────────────────────
function PartnerCard({ p, onClick }) {
  const { color, bg, border } = healthColor(p.health_score)
  const days = daysUntil(p.renewal_date)
  return (
    <div onClick={onClick}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px 18px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s', display: 'flex', flexDirection: 'column', gap: 12 }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = `${ACCENT}44` }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--border)' }}>

      {/* Topo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            {p.company_name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {p.company_city} · {p.company_uf}
          </div>
        </div>
        <HealthRing score={p.health_score} size={46} />
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <LaerBadge stage={p.laer_stage} />
        <TouchBadge model={p.touch_model} />
      </div>

      {/* Barra de saúde */}
      <div>
        <div style={{ height: 4, borderRadius: 9, background: 'var(--border2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${p.health_score}%`,
            background: color, borderRadius: 9,
            transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <User size={11} /> {p.csm}
        </span>
        {days !== null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4,
            color: days <= 30 ? '#DC2626' : days <= 90 ? '#D97706' : 'var(--text-muted)',
            fontWeight: days <= 90 ? 700 : 400 }}>
            <CalendarDays size={11} />
            {days > 0 ? `Renova em ${days}d` : 'Renovação vencida'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate, onChange, title }) {
  return (
    <label title={title} style={{ display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', width:18, height:18 }}>
      <input type="checkbox" checked={checked}
        ref={el => { if (el) el.indeterminate = !!indeterminate }}
        onChange={onChange}
        style={{ width:15, height:15, cursor:'pointer', accentColor:'var(--accent)' }} />
    </label>
  )
}

// ─── Linha de tabela ──────────────────────────────────────────────────────────
function PartnerRow({ p, onClick, selected, onToggle }) {
  const { color } = healthColor(p.health_score)
  const days = daysUntil(p.renewal_date)
  return (
    <tr
      style={{ borderBottom: '1px solid var(--border2)', cursor: 'pointer', background: selected ? 'rgba(30,58,95,0.05)' : 'transparent' }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--surface2)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}>
      <td style={{ ...T.td, width: 40, textAlign: 'center' }} onClick={e => { e.stopPropagation(); onToggle() }}>
        <Checkbox checked={selected} onChange={onToggle} />
      </td>
      <td style={T.td} onClick={onClick}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{p.company_name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.company_city} · {p.company_uf}</div>
      </td>
      <td style={T.td} onClick={onClick}><LaerBadge stage={p.laer_stage} /></td>
      <td style={T.td} onClick={onClick}><TouchBadge model={p.touch_model} /></td>
      <td style={{ ...T.td, textAlign: 'center' }} onClick={onClick}>
        <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'var(--mono)' }}>
          {p.health_score}
        </span>
      </td>
      <td style={T.td} onClick={onClick}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.csm}</span>
      </td>
      <td style={{ ...T.td, fontSize: 11, fontFamily: 'var(--mono)',
        color: days !== null && days <= 30 ? '#DC2626' : days !== null && days <= 90 ? '#D97706' : 'var(--text-muted)',
        fontWeight: days !== null && days <= 90 ? 700 : 400 }} onClick={onClick}>
        {fmtDate(p.renewal_date)}
        {days !== null && days <= 90 && (
          <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.7 }}>({days}d)</span>
        )}
      </td>
      <td style={{ ...T.td, textAlign: 'center' }}>
        <button onClick={e => { e.stopPropagation(); onClick() }}
          style={{ fontSize: 11, fontWeight: 600, color: ACCENT, background: 'none',
            border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px',
            cursor: 'pointer', fontFamily: 'var(--font)' }}>
          Abrir
        </button>
      </td>
    </tr>
  )
}

// ─── Modal de Check-in Novo ───────────────────────────────────────────────────
function NovoCheckinModal({ onClose, onSave }) {
  const { companies } = useCompanies()
  const [form, setForm] = useState({
    company_name: '', company_id: null, csm: '', laer_stage: 'Land', touch_model: 'Mid-Touch',
    health_score: 75, renewal_date: '', notes: '', action_plans: [], checkins: [],
  })
  const [err, setErr] = useState('')
  const [busca, setBusca] = useState('')
  const [open, setOpen] = useState(false)
  const dropRef = useRef(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const empresasFiltradas = useMemo(() => {
    const q = busca.toLowerCase()
    return (companies || []).filter(e =>
      (e.fantasia || e.razao || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }, [companies, busca])

  useEffect(() => {
    function onClickOut(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  function selectEmpresa(emp) {
    set('company_name', emp.fantasia || emp.razao || '')
    set('company_id', emp.id)
    setBusca(emp.fantasia || emp.razao || '')
    setOpen(false)
  }

  function submit(e) {
    e.preventDefault()
    if (!form.company_name.trim()) { setErr('Selecione uma empresa.'); return }
    onSave({
      id: uid(), tenant_id: 't1',
      ...form,
      company_city: '', company_uf: '',
      criado_em: new Date().toISOString().slice(0, 10),
    })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 800, padding: 20 }}>
      <form onSubmit={submit} style={{ background: 'var(--surface)', borderRadius: 14,
        width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Novo Check-in</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {err && <div style={{ fontSize: 12, color: '#DC2626', padding: '8px 12px',
            background: '#FEE2E2', borderRadius: 7 }}>{err}</div>}

          <div ref={dropRef} style={{ position: 'relative' }}>
            <label style={LBL}>Empresa *</label>
            <input
              value={busca}
              onChange={e => { setBusca(e.target.value); set('company_name', e.target.value); set('company_id', null); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Buscar empresa…"
              style={INPUT} />
            {open && empresasFiltradas.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 2, overflow: 'hidden' }}>
                {empresasFiltradas.map(emp => (
                  <div key={emp.id}
                    onMouseDown={() => selectEmpresa(emp)}
                    style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                      color: 'var(--text)', borderBottom: '1px solid var(--border2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {emp.fantasia || emp.razao}
                    {emp.fantasia && emp.razao && emp.fantasia !== emp.razao &&
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{emp.razao}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LBL}>Estágio LAER</label>
              <select value={form.laer_stage} onChange={e => set('laer_stage', e.target.value)} style={INPUT}>
                {LAER_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Touch Model</label>
              <select value={form.touch_model} onChange={e => set('touch_model', e.target.value)} style={INPUT}>
                {TOUCH_MODELS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LBL}>Health Score (0–100)</label>
              <input type="number" min={0} max={100} value={form.health_score}
                onChange={e => set('health_score', Math.max(0, Math.min(100, Number(e.target.value))))}
                style={INPUT} />
            </div>
            <div>
              <label style={LBL}>CSM Responsável</label>
              <InlineSearchSelect
                value={MOCK_USUARIOS.find(u => u.nome === form.csm)?.id || ''}
                onChange={id => {
                  const u = MOCK_USUARIOS.find(u => u.id === id)
                  set('csm', u?.nome || '')
                }}
                options={[
                  { value: '', label: '— Selecionar usuário —' },
                  ...MOCK_USUARIOS.map(u => ({ value: u.id, label: u.nome, sublabel: u.cargo, avatar: u.avatar }))
                ]}
                placeholder="— Selecionar usuário —"
              />
            </div>
          </div>

          <div>
            <label style={LBL}>Data de Renovação</label>
            <input type="date" value={form.renewal_date} onChange={e => set('renewal_date', e.target.value)}
              style={INPUT} />
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Criar Check-in</Button>
        </div>
      </form>
    </div>
  )
}

// ─── Drawer de Edição ─────────────────────────────────────────────────────────
function PartnerDrawer({ record, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(record)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => { setForm(record); setConfirmDel(false) }, [record])

  function set(k, v) {
    const next = { ...form, [k]: v }
    setForm(next)
    onSave(next)
  }

  const { color, bg } = healthColor(form.health_score)
  const days = daysUntil(form.renewal_date)

  const LEFT = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, padding: '24px 28px', overflowY: 'auto' }}>
      {/* Título */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
          {form.company_name}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <LaerBadge stage={form.laer_stage} />
          <TouchBadge model={form.touch_model} />
        </div>
      </div>

      {/* Anotações do CSM */}
      <div style={{ marginBottom: 24 }}>
        <div style={SEC_HDR}>📝 Anotações do CSM</div>
        <InlineTextarea
          value={form.notes}
          onChange={v => set('notes', v)}
          placeholder="Registre observações, contexto e estratégia para este parceiro…"
          minRows={5}
        />
      </div>

      {/* Plano de Ação */}
      <div style={{ marginBottom: 24 }}>
        <div style={SEC_HDR}>🎯 Plano de Ação</div>
        <ActionPlanBlock
          plans={form.action_plans || []}
          onChange={plans => set('action_plans', plans)}
        />
      </div>

      {/* Histórico de Check-ins */}
      <div>
        <div style={SEC_HDR}>🕒 Histórico de Check-ins</div>
        <CheckinBlock
          checkins={form.checkins || []}
          onChange={checkins => set('checkins', checkins)}
        />
      </div>

      {/* Zona de exclusão */}
      {confirmDel ? (
        <div style={{ marginTop: 32, padding: '12px 14px', background: '#FEE2E2',
          border: '1px solid #FCA5A5', borderRadius: 8, display: 'flex',
          alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#991B1B', flex: 1 }}>
            Remover este parceiro do Customer Success?
          </span>
          <Button variant="danger" onClick={() => { onDelete(form.id); onClose() }}>Remover</Button>
          <Button variant="secondary" onClick={() => setConfirmDel(false)}>Cancelar</Button>
        </div>
      ) : (
        <button onClick={() => setConfirmDel(true)}
          style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#DC262680', cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font)', padding: '4px 0' }}>
          <Trash2 size={12} /> Remover parceiro
        </button>
      )}
    </div>
  )

  const RIGHT = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Health Score destacado */}
      <div style={{ padding: '20px 20px 16px', background: `${color}08`,
        borderBottom: '1px solid var(--border2)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          fontFamily: 'var(--mono)' }}>
          Health Score
        </div>
        <InlineHealthScore value={form.health_score} onChange={v => set('health_score', v)} />
      </div>

      <MetaSection label="Estágio & Modelo" />
      <MetaRow label="LAER">
        <InlineSelect
          value={form.laer_stage}
          onChange={v => set('laer_stage', v)}
          options={LAER_STAGES.map(s => ({ value: s.value, label: s.label }))}
        />
      </MetaRow>
      <MetaRow label="Touch Model">
        <InlineSelect
          value={form.touch_model}
          onChange={v => set('touch_model', v)}
          options={TOUCH_MODELS.map(t => ({ value: t.value, label: t.label }))}
        />
      </MetaRow>

      <MetaSection label="Renovação" />
      <MetaRow label="Data">
        <InlineDate
          value={form.renewal_date}
          onChange={v => set('renewal_date', v)}
          placeholder="Definir data"
        />
      </MetaRow>
      {days !== null && (
        <MetaRow label="Prazo">
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
            color: days <= 30 ? '#DC2626' : days <= 90 ? '#D97706' : '#10B981' }}>
            {days > 0 ? `${days} dias` : 'Vencida'}
          </span>
        </MetaRow>
      )}

      <MetaSection label="Responsável" />
      <MetaRow label="CSM">
        <InlineSearchSelect
          value={MOCK_USUARIOS.find(u => u.nome === form.csm)?.id || ''}
          onChange={id => {
            const u = MOCK_USUARIOS.find(u => u.id === id)
            set('csm', u?.nome || '')
          }}
          options={[
            { value: '', label: '— Selecionar usuário —' },
            ...MOCK_USUARIOS.map(u => ({ value: u.id, label: u.nome, sublabel: u.cargo, avatar: u.avatar }))
          ]}
          placeholder="— Selecionar usuário —"
        />
      </MetaRow>
      <MetaRow label="Parceiro">
        <span style={{ fontSize: 12, color: 'var(--text)', padding: '2px 6px' }}>
          {form.company_name}
        </span>
      </MetaRow>
      {form.company_city && (
        <MetaRow label="Localização">
          <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '2px 6px' }}>
            {form.company_city} · {form.company_uf}
          </span>
        </MetaRow>
      )}

      <MetaSection label="Criado em" />
      <MetaRow label="Data">
        <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '2px 6px',
          fontFamily: 'var(--mono)' }}>
          {fmtDate(form.criado_em)}
        </span>
      </MetaRow>
    </div>
  )

  return (
    <Drawer
      open={!!record}
      onClose={onClose}
      title={form.company_name}
      subtitle="Customer Success"
      initials={form.company_name ? form.company_name.slice(0, 2).toUpperCase() : '??'}
      bodyStyle={{ padding: 0, gap: 0, overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: '0 0 65%', overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
          {LEFT}
        </div>
        <div style={{ flex: '0 0 35%', overflowY: 'auto', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
          {RIGHT}
        </div>
      </div>
    </Drawer>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function CustomerSuccess() {
  const [records, setRecords] = useLocalState(STORAGE_KEY, MOCK_PARTNER_HEALTH)
  const [busca, setBusca]             = useState('')
  const [filtroLaer, setFiltroLaer]   = useState('')
  const [filtroTouch, setFiltroTouch] = useState('')
  const [view, setView]               = useLocalState('cs:view', 'card')
  const [showMetrics, setShowMetrics] = useLocalState('cs:metrics', true)
  const [selecionado, setSelecionado] = useState(null)
  const [novoModal, setNovoModal]     = useState(false)
  const [selected, setSelected]       = useState(new Set())

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return records.filter(r =>
      (!q || r.company_name.toLowerCase().includes(q) || (r.csm || '').toLowerCase().includes(q)) &&
      (!filtroLaer  || r.laer_stage   === filtroLaer) &&
      (!filtroTouch || r.touch_model  === filtroTouch)
    )
  }, [records, busca, filtroLaer, filtroTouch])

  const allListIds    = lista.map(p => p.id)
  const allSelected   = allListIds.length > 0 && allListIds.every(id => selected.has(id))
  const someSelected  = allListIds.some(id => selected.has(id)) && !allSelected

  function toggleAll() {
    if (allSelected) setSelected(prev => { const s = new Set(prev); allListIds.forEach(id => s.delete(id)); return s })
    else setSelected(prev => new Set([...prev, ...allListIds]))
  }
  function toggleOne(id) { setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s }) }
  function clearSelection() { setSelected(new Set()) }

  function bulkDelete() {
    if (!window.confirm(`Excluir ${selected.size} registro(s) permanentemente?`)) return
    setRecords(prev => prev.filter(r => !selected.has(r.id)))
    clearSelection()
  }

  // KPIs
  const healthy  = records.filter(r => r.health_score >= 80).length
  const atencao  = records.filter(r => r.health_score >= 50 && r.health_score < 80).length
  const risco    = records.filter(r => r.health_score < 50).length
  const avgScore = records.length ? Math.round(records.reduce((s, r) => s + r.health_score, 0) / records.length) : 0

  function save(updated) {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === updated.id)
      if (idx >= 0) { const a = [...prev]; a[idx] = updated; return a }
      return [...prev, updated]
    })
  }

  function remove(id) {
    setRecords(prev => prev.filter(r => r.id !== id))
    setSelecionado(null)
  }

  function exportCSV() {
    const cols = ['id','company_name','company_city','company_uf','laer_stage','touch_model','health_score','csm','renewal_date']
    const rows = records.map(r => cols.map(k => String(r[k] ?? '')).join(','))
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `partner_health_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function importCSV() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.csv'
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        const [header, ...rows] = ev.target.result.trim().split('\n')
        const cols = header.split(',')
        const imported = rows.map(row => {
          const vals = row.split(',')
          const obj = Object.fromEntries(cols.map((c, i) => [c.trim(), vals[i]?.trim() || '']))
          return { ...obj, id: uid(), tenant_id: 't1', health_score: Number(obj.health_score) || 70,
            action_plans: [], checkins: [], notes: '' }
        })
        setRecords(prev => [...prev, ...imported])
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const { color: avgColor } = healthColor(avgScore)
  const hasFilter = !!(busca || filtroLaer || filtroTouch)
  const filterCount = [busca, filtroLaer, filtroTouch].filter(Boolean).length

  return (
    <div style={P.page}>

      {/* ── Page Header ── */}
      <div style={P.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={P.breadcrumb}>
              <span>Customer Success</span>
              <span style={P.sep}>›</span>
              <span>Sucesso do Parceiro</span>
            </div>
            <h1 style={P.title}>Sucesso do Parceiro</h1>
          </div>
          <button
            onClick={() => setShowMetrics(v => !v)}
            title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center',
              width:28, height:28, borderRadius:7, border:'1px solid var(--border)',
              background:'var(--surface)', color:'var(--text-muted)', cursor:'pointer',
              flexShrink:0, marginTop:18 }}>
            {showMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        <Button onClick={() => setNovoModal(true)}>+ Novo Check-in</Button>
      </div>

      {/* ── KPIs retráteis ── */}
      <div style={{ display:'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr',
        transition:'grid-template-rows 0.25s ease', overflow:'hidden' }}>
        <div style={{ minHeight:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12,
            paddingBottom: showMetrics ? 4 : 0 }}>
            {[
              { label: 'Parceiros',   value: records.length, color: 'var(--text)' },
              { label: 'Saudáveis',   value: healthy,  color: '#059669' },
              { label: 'Atenção',     value: atencao,  color: '#D97706' },
              { label: 'Em Risco',    value: risco,    color: '#DC2626' },
              { label: 'Score Médio', value: avgScore,  color: avgColor, mono: true },
            ].map(k => (
              <div key={k.label} style={P.kpi}>
                <span style={{ fontSize:22, fontWeight:700, color: k.color,
                  letterSpacing:'-0.5px', lineHeight:1,
                  fontFamily: k.mono ? 'var(--mono)' : 'inherit' }}>
                  {k.value}
                </span>
                <span style={P.kpiLbl}>{k.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={P.toolbar}>
        {/* Esquerdo: busca + filtros */}
        <div style={P.tbLeft}>
          <div style={P.searchWrap}>
            <span style={P.searchIcon}>⌕</span>
            <input style={P.searchInput}
              placeholder="Buscar parceiro ou CSM…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div style={P.tbDivider} />

          {/* Filtro LAER */}
          <FilterPopover
            label="LAER"
            options={LAER_STAGES.map(s => ({ value: s.value, label: s.label }))}
            value={filtroLaer}
            onChange={setFiltroLaer}
          />

          {/* Filtro Touch Model */}
          <FilterPopover
            label="Touch Model"
            options={TOUCH_MODELS.map(t => ({ value: t.value, label: t.label }))}
            value={filtroTouch}
            onChange={setFiltroTouch}
          />
        </div>

        <div style={P.tbDivider} />

        {/* Direito: view toggle + ações */}
        <div style={P.tbRight}>
          {/* View toggle */}
          <div style={P.viewToggle}>
            <button title="Lista"
              onClick={() => setView('list')}
              style={{ ...P.viewBtn, ...(view === 'list' ? P.viewBtnOn : {}) }}>
              <LayoutList size={14} />
            </button>
            <button title="Cards"
              onClick={() => setView('card')}
              style={{ ...P.viewBtn, ...(view === 'card' ? P.viewBtnOn : {}) }}>
              <LayoutGrid size={14} />
            </button>
          </div>

          {/* ⋯ Ações */}
          <ActionDropdown onImport={importCSV} onExport={exportCSV} />
        </div>
      </div>

      {/* ── Result row ── */}
      <div style={P.resultRow}>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' }}>
          {lista.length} parceiro{lista.length !== 1 ? 's' : ''} encontrado{lista.length !== 1 ? 's' : ''}
        </span>
        {hasFilter && (
          <button style={P.clearBtn}
            onClick={() => { setBusca(''); setFiltroLaer(''); setFiltroTouch('') }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Bulk bar ── */}
      {selected.size > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
          background:'var(--accent)', borderRadius:10, flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6, color:'#fff', fontSize:13, fontWeight:600, fontFamily:'var(--mono)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.7)', display:'inline-block' }} />
            {selected.size} selecionado{selected.size > 1 ? 's' : ''}
          </span>
          <div style={{ flex:1 }} />
          <button onClick={bulkDelete}
            style={{ padding:'4px 12px', border:'1px solid rgba(252,165,165,0.4)', borderRadius:6,
              background:'rgba(255,255,255,0.12)', color:'#FCA5A5', fontSize:12, fontWeight:500,
              cursor:'pointer', fontFamily:'var(--font)' }}>
            Excluir selecionados
          </button>
          <button onClick={clearSelection}
            style={{ fontSize:12, color:'rgba(255,255,255,0.6)', background:'none', border:'none',
              cursor:'pointer', fontFamily:'var(--font)' }}>
            ✕ Limpar seleção
          </button>
        </div>
      )}

      {/* ── Conteúdo ── */}
      <div style={P.content}>
        {lista.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
            <HeartPulse size={40} style={{ opacity: 0.25 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhum parceiro encontrado</div>
            <div style={{ fontSize: 12 }}>Ajuste os filtros ou crie um novo check-in</div>
          </div>
        ) : view === 'card' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14, padding: '20px 28px' }}>
            {lista.map(p => (
              <PartnerCard key={p.id} p={p} onClick={() => setSelecionado(p)} />
            ))}
          </div>
        ) : (
          <div style={{ padding: '0 28px 24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ ...T.th, width: 40, textAlign: 'center' }}>
                    <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll}
                      title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'} />
                  </th>
                  {['Empresa', 'LAER', 'Touch Model', 'Score', 'CSM', 'Renovação', ''].map((h, i) => (
                    <th key={i} style={{ ...T.th, textAlign: i === 3 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map(p => (
                  <PartnerRow key={p.id} p={p}
                    onClick={() => setSelecionado(p)}
                    selected={selected.has(p.id)}
                    onToggle={() => toggleOne(p.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {selecionado && (
        <PartnerDrawer
          record={selecionado}
          onClose={() => setSelecionado(null)}
          onSave={updated => { save(updated); setSelecionado(updated) }}
          onDelete={remove}
        />
      )}

      {/* ── Modal Novo ── */}
      {novoModal && (
        <NovoCheckinModal
          onClose={() => setNovoModal(false)}
          onSave={novo => { save(novo); setNovoModal(false) }}
        />
      )}
    </div>
  )
}

// ─── Estilos compartilhados ──────────────────────────────────────────────────
const LBL = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4,
}
const INPUT = {
  width: '100%', padding: '7px 10px', border: '1px solid var(--border)',
  borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)',
  fontSize: 12, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}
const SAVE_BTN = {
  padding: '6px 16px', background: ACCENT, color: '#fff', border: 'none',
  borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
}
const CANCEL_BTN = {
  padding: '6px 14px', background: 'none', color: 'var(--text-muted)',
  border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer',
  fontFamily: 'var(--font)',
}
const SEC_HDR = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.07em', fontFamily: 'var(--mono)', marginBottom: 10,
  paddingBottom: 6, borderBottom: '1px solid var(--border2)',
}

const P = {
  page:       { display:'flex', flexDirection:'column', gap:16 },
  pageHeader: { display:'flex', alignItems:'flex-end', justifyContent:'space-between' },
  breadcrumb: { display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', marginBottom:4 },
  sep:        { color:'var(--border)' },
  title:      { margin:0, fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px' },
  newBtn:     { padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  kpi:        { background:'var(--surface)', borderRadius:10, padding:'16px 18px', display:'flex', flexDirection:'column', gap:4, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', borderTop:'3px solid var(--border)' },
  kpiLbl:     { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  toolbar:    { background:'var(--surface)', borderRadius:10, padding:'8px 12px', border:'1px solid var(--border2)', boxShadow:'var(--shadow)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  tbLeft:     { display:'flex', alignItems:'center', gap:6, flexShrink:1, minWidth:0 },
  tbRight:    { display:'flex', alignItems:'center', gap:6, flexShrink:0 },
  tbDivider:  { width:1, height:24, background:'var(--border)', flexShrink:0, margin:'0 4px' },
  searchWrap: { position:'relative', width:240, flexShrink:0 },
  searchIcon: { position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14, pointerEvents:'none' },
  searchInput:{ width:'100%', height:36, padding:'0 10px 0 28px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box' },
  viewToggle: { display:'flex', border:'1px solid var(--border)', borderRadius:7, overflow:'hidden', flexShrink:0 },
  viewBtn:    { width:34, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', transition:'all 0.15s' },
  viewBtnOn:  { background:'var(--accent-glow)', color:'var(--accent)' },
  resultRow:  { display:'flex', alignItems:'center', gap:12 },
  clearBtn:   { fontSize:12, color:'var(--accent2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' },
  content:    { flex:1, overflowY:'auto' },
}

const T = {
  th: { padding: '8px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
    fontFamily: 'var(--mono)', whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', verticalAlign: 'middle' },
}
