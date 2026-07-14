import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import Button from '../components/Button'
import EmpresaSearch from '../components/EmpresaSearch'
import { InlineTextarea, DeleteZone } from '../components/NotionDrawer'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import BrowseLayout from '../components/BrowseLayout'
import { MOCK_USUARIOS } from '../data/mockUsuarios'
import {
  MOCK_CUSTOMER_HEALTH, LAER_STAGES, TOUCH_MODELS, healthColor, STORAGE_KEY,
} from '../data/mockCustomerSuccess'
import { HeartPulse, Plus, Trash2, Circle, CheckCircle2, Paperclip, Download, X, AlertTriangle } from 'lucide-react'
import { useAuditLog } from '../hooks/useAuditLog'
import { useCustomerHealth } from '../hooks/useCustomerHealth'
import { usePlaybooks } from '../hooks/usePlaybooks'
import SearchSelect from '../components/SearchSelect'

const ACCENT = 'var(--accent)'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid()   { return 'ph_' + Date.now() + Math.floor(Math.random() * 9999) }
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

// ─── CS Card (list/card view) ──────────────────────────────────────────────────
function CsCard({ row }) {
  const [hovered, setHovered] = useState(false)
  const { color: hColor } = healthColor(row.health_score)

  const renewalNode = row.renewal_date ? (() => {
    const days = Math.ceil((new Date(row.renewal_date) - new Date()) / 86400000)
    const urgent = days < 60
    return (
      <div style={{ display:'flex', alignItems:'center', gap:5,
        fontSize:11, fontFamily:'var(--mono)',
        color: urgent ? '#EF4444' : 'var(--text-muted)' }}>
        <span>🔁</span>
        <span>{new Date(row.renewal_date).toLocaleDateString('pt-BR')}</span>
        <span style={{ opacity:0.7 }}>
          {days >= 0 ? `(${days}d)` : '(vencido)'}
        </span>
      </div>
    )
  })() : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        background: 'var(--surface)',
        border: `1.5px solid ${hovered ? hColor + '55' : 'var(--border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transform: hovered ? 'translateY(-2px) scale(1.01)' : 'none',
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        cursor: 'pointer',
      }}>

      {/* Barra de saúde no topo */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${hColor}, ${hColor}88)`,
      }} />

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Linha principal: avatar + nome + health ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar iniciais */}
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: hColor + '18', color: hColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, fontFamily: 'var(--mono)',
            border: `1px solid ${hColor}30`, flexShrink: 0,
            letterSpacing: '-0.03em',
          }}>
            {(row.company_name || '?').slice(0, 2).toUpperCase()}
          </div>

          {/* Nome + localização */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.3 }}>
              {row.company_name}
            </div>
            {(row.company_city || row.company_uf) && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {[row.company_city, row.company_uf].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>

          {/* Health Ring */}
          <HealthRing score={row.health_score} size={40} />
        </div>

        {/* Badges LAER + Touch */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <LaerBadge stage={row.laer_stage} />
          <TouchBadge model={row.touch_model} />
        </div>

        {/* Divisor */}
        <div style={{ height: 1, background: 'var(--border2)', margin: '0 -2px' }} />

        {/* CSM + Renovação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {row.csm && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--text-soft)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                <circle cx="8" cy="5.5" r="3" fill="currentColor" opacity="0.5"/>
                <path d="M2 13.5c0-3.3 2.7-6 6-6s6 2.7 6 6"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {row.csm}
              </span>
            </div>
          )}
          {renewalNode}
        </div>
      </div>
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

  function toggle(id) { onChange(plans.map(p => p.id === id ? { ...p, done: !p.done } : p)) }
  function remove(id) { onChange(plans.filter(p => p.id !== id)) }

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
            cursor: 'pointer', padding: 0, marginTop: 2, flexShrink: 0,
            color: p.done ? '#10B981' : 'var(--border)' }}>
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
function CheckinBlock({ checkins, onChange, produtos = [], onAddActionPlans }) {
  const [form, setForm] = useState(null)
  const [dupErr, setDupErr] = useState('')
  const TYPES = ['Reunião', 'Ligação', 'E-mail', 'Visita', 'QBR']

  const { playbooks: allPlaybooks } = usePlaybooks()
  const csPlaybooks = useMemo(() => allPlaybooks.filter(p => p.tipo === 'sucesso'), [allPlaybooks])

  function addCheckin() {
    if (!form?.summary?.trim()) return
    const date = form.date || new Date().toISOString().slice(0, 10)
    const produto_id = form.produto_id || null
    setDupErr('')
    const checkin = { id: cidFn(), date, type: form.type || 'Reunião', summary: form.summary,
      produto_id, produto_nome: form.produto_nome || '',
      playbook_id: form.playbook_id || null, playbook_nome: form.playbook_nome || '' }
    onChange([checkin, ...checkins])
    // gera Action Plans a partir dos steps do playbook selecionado
    if (form.playbook_id && onAddActionPlans) {
      const pb = csPlaybooks.find(p => String(p.id) === String(form.playbook_id))
      const steps = pb?.steps || []
      if (steps.length) {
        const novos = steps.map(s => ({
          id: aidFn(),
          text: s.title || s.texto || String(s),
          done: false,
          origem: `Playbook: ${pb.title}`,
        }))
        onAddActionPlans(novos)
      }
    }
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
                onChange={e => { setForm(f => ({ ...f, date: e.target.value })); setDupErr('') }}
                style={INPUT} />
            </div>
          </div>
          {produtos.length > 0 && (
            <div>
              <label style={LBL}>Produto do contrato</label>
              <select style={INPUT}
                value={form.produto_id || ''}
                onChange={e => {
                  const p = produtos.find(p => p.produto_id === e.target.value)
                  setForm(f => ({ ...f, produto_id: e.target.value || null, produto_nome: p?.nome || '' }))
                  setDupErr('')
                }}>
                <option value="">— Nenhum —</option>
                {produtos.map(p => <option key={p.produto_id} value={p.produto_id}>{p.nome}</option>)}
              </select>
            </div>
          )}
          {csPlaybooks.length > 0 && (
            <div>
              <label style={LBL}>Playbook de CS (opcional — gera Action Plans)</label>
              <select style={INPUT} value={form.playbook_id || ''}
                onChange={e => {
                  const pb = csPlaybooks.find(p => String(p.id) === e.target.value)
                  setForm(f => ({ ...f, playbook_id: e.target.value || null, playbook_nome: pb?.title || '' }))
                }}>
                <option value="">— Nenhum —</option>
                {csPlaybooks.map(p => <option key={p.id} value={String(p.id)}>{p.title}</option>)}
              </select>
            </div>
          )}
          {dupErr && (
            <div style={{ fontSize: 12, color: '#DC2626', padding: '6px 10px',
              background: '#FEE2E2', borderRadius: 6, border: '1px solid #FCA5A5' }}>
              {dupErr}
            </div>
          )}
          <div>
            <label style={LBL}>Resumo</label>
            <textarea value={form.summary || ''} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              rows={3} placeholder="O que foi discutido?"
              style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => { setForm(null); setDupErr('') }}>Cancelar</Button>
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
            'Reunião': 'var(--accent)', 'Ligação': '#10B981', 'E-mail': '#3B82F6',
            'Visita': '#F59E0B', 'QBR': '#EC4899',
          }
          const dotColor = TYPE_COLOR[ci.type] || '#6B7280'
          return (
            <div key={ci.id} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
              {i < checkins.length - 1 && (
                <div style={{ position: 'absolute', left: 10, top: 20, bottom: 0,
                  width: 1.5, background: 'var(--border2)' }} />
              )}
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
                {ci.projeto_nome && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5,
                    fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px',
                    fontFamily: 'var(--mono)' }}>
                    <span style={{ opacity: 0.6 }}>📁</span> {ci.projeto_nome}
                  </div>
                )}
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

// ─── Anexos ──────────────────────────────────────────────────────────────────
function AnexosBlock({ attachments = [], onChange }) {
  const fileRef = useRef(null)
  const [sizeErr, setSizeErr] = useState('')

  function handleFiles(e) {
    setSizeErr('')
    Array.from(e.target.files || []).forEach(file => {
      if (file.size > 512 * 1024) { setSizeErr(`"${file.name}" excede 512 KB.`); return }
      const reader = new FileReader()
      reader.onload = ev => {
        onChange([...attachments, {
          id: 'att_' + Date.now() + Math.random(),
          nome: file.name,
          tipo: file.type || 'application/octet-stream',
          tamanho: file.size,
          data: ev.target.result,
          criado: new Date().toISOString().slice(0, 10),
        }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function remove(id) { onChange(attachments.filter(a => a.id !== id)) }

  function download(att) {
    const a = document.createElement('a')
    a.href = att.data; a.download = att.nome; a.click()
  }

  const fmtSize = b => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleFiles} />
      <button onClick={() => fileRef.current?.click()}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          background: 'none', border: '1.5px dashed var(--border)', borderRadius: 7,
          fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
        <Paperclip size={13} /> Adicionar anexo (máx 512 KB)
      </button>
      {sizeErr && (
        <div style={{ fontSize: 12, color: '#DC2626', padding: '4px 8px',
          background: '#FEE2E2', borderRadius: 6 }}>{sizeErr}</div>
      )}
      {attachments.map(att => (
        <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', background: 'var(--surface2)', borderRadius: 7,
          border: '1px solid var(--border)' }}>
          <Paperclip size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
              {fmtSize(att.tamanho)} · {att.criado}
            </div>
          </div>
          <button onClick={() => download(att)} title="Baixar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
            <Download size={14} />
          </button>
          <button onClick={() => remove(att.id)} title="Remover"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <X size={14} />
          </button>
        </div>
      ))}
      {attachments.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 2 }}>
          Nenhum anexo.
        </div>
      )}
    </div>
  )
}

// ─── Detail (novo + edição) ───────────────────────────────────────────────────
// ─── CS Playbook Panel ────────────────────────────────────────────────────────
function CSPlaybookPanel({ form, patch }) {
  const { playbooks } = usePlaybooks()
  const csPlaybooks = useMemo(
    () => playbooks.filter(p => p.tipo === 'sucesso'),
    [playbooks]
  )
  const pb       = useMemo(() => csPlaybooks.find(p => p.id === form.playbook_id) || null, [csPlaybooks, form.playbook_id])
  const allSteps = useMemo(() => pb ? (pb.steps || []) : [], [pb])
  const resources= useMemo(() => pb ? (pb.resources || []) : [], [pb])
  const refs     = useMemo(() => pb ? (pb.refs || []) : [], [pb])

  const laerStage = form.laer_stage || ''
  const stepsDoEstágio = useMemo(() => {
    if (!pb) return []
    return allSteps.filter(s => !s.status_contrato || s.status_contrato === laerStage || s.status_contrato === 'todos')
  }, [pb, allSteps, laerStage])

  const S = {
    root:      { display:'flex', flexDirection:'column', gap:20 },
    sLabel:    { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
                 color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 },
    line:      { flex:1, height:1, background:'var(--border2)' },
    stepCard:  { background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'14px 16px' },
    stepTitle: { fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:8 },
    badge:     { display:'inline-flex', padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700 },
    mdP:       { fontSize:13, color:'var(--text-soft)', lineHeight:1.7, margin:'0 0 6px' },
    mdH2:      { fontSize:13, fontWeight:700, color:'var(--text)', margin:'12px 0 4px', borderBottom:'1px solid var(--border2)', paddingBottom:4 },
    mdH3:      { fontSize:12, fontWeight:700, color:'var(--text)', margin:'10px 0 4px' },
    mdLi:      { fontSize:13, color:'var(--text-soft)', lineHeight:1.65, marginBottom:3 },
    resGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:8 },
    resCard:   { border:'1px solid var(--border2)', borderRadius:9, padding:'10px 12px',
                 background:'var(--surface)', display:'flex', flexDirection:'column', gap:6 },
    resTitle:  { fontSize:12, fontWeight:600, color:'var(--text)', lineHeight:1.35 },
    resLink:   { fontSize:11, color:'var(--accent)', textDecoration:'none', fontWeight:600, marginTop:'auto' },
    refCard:   { border:'1px solid var(--border2)', borderRadius:9, padding:'12px 14px',
                 background:'var(--surface)', display:'flex', alignItems:'flex-start', gap:10 },
    refLogo:   { width:32, height:32, borderRadius:7, display:'flex', alignItems:'center',
                 justifyContent:'center', fontWeight:800, fontSize:11, flexShrink:0 },
    empty:     { padding:'16px 0', textAlign:'center', color:'var(--text-muted)', fontSize:13 },
  }

  function MiniMd({ content }) {
    if (!content) return null
    return (
      <div>
        {(content || '').split('\n').map((line, i) => {
          if (line.startsWith('## '))  return <div key={i} style={S.mdH2}>{line.slice(3)}</div>
          if (line.startsWith('### ')) return <div key={i} style={S.mdH3}>{line.slice(4)}</div>
          if (line.startsWith('- ') || line.startsWith('* '))
            return <div key={i} style={{ display:'flex', gap:6, marginBottom:3 }}>
              <span style={{ color:'var(--accent)', flexShrink:0 }}>•</span>
              <span style={S.mdLi}>{line.slice(2)}</span>
            </div>
          if (line.startsWith('> '))
            return <div key={i} style={{ borderLeft:'3px solid var(--accent)', paddingLeft:10,
              margin:'6px 0', background:'var(--accent-glow)', borderRadius:'0 6px 6px 0', padding:'6px 10px' }}>
              <span style={{ fontSize:13, color:'var(--text-soft)', fontStyle:'italic' }}>{line.slice(2)}</span>
            </div>
          if (line.trim() === '') return null
          return <p key={i} style={S.mdP}>{line}</p>
        })}
      </div>
    )
  }

  function SH({ icon, label, badge }) {
    return (
      <div style={{ ...S.sLabel, marginBottom:8 }}>
        {icon && <span>{icon}</span>}
        <span>{label}</span>
        {badge}
        <span style={S.line} />
      </div>
    )
  }

  return (
    <div style={S.root}>
      {/* Seletor */}
      <div>
        <SH label="Playbook de CS" />
        <SearchSelect
          options={csPlaybooks.map(p => ({ id: p.id, label: p.title||p.titulo, sublabel: p.description||p.segment||'', color:'var(--accent)' }))}
          value={form.playbook_id || null}
          onChange={id => patch('playbook_id', id || null)}
          placeholder="Pesquisar playbook de CS…"
          noResults="Nenhum playbook do tipo CS/Sucesso encontrado"
        />
        {csPlaybooks.length === 0 && (
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:8, padding:'8px 12px',
            background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border2)' }}>
            Nenhum playbook do tipo <strong>Sucesso do Cliente</strong> cadastrado. Crie um em Playbooks.
          </div>
        )}
      </div>

      {pb && (
        <>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:16, borderBottom:'1px solid var(--border2)' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', letterSpacing:'-0.2px' }}>{pb.title}</div>
              {pb.description && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{pb.description}</div>}
            </div>
            {laerStage && <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10,
              background:'var(--accent-glow)', color:'var(--accent)' }}>{laerStage}</span>}
          </div>

          {/* Atividades do estágio atual */}
          <div>
            <SH icon="🎯" label="Atividades para este estágio LAER"
              badge={laerStage && <span style={{ ...S.badge, background:'var(--accent-glow)', color:'var(--accent)' }}>{laerStage}</span>} />
            {stepsDoEstágio.length === 0 ? (
              <div style={S.empty}>Nenhuma atividade configurada para o estágio <strong>{laerStage}</strong> neste playbook.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {stepsDoEstágio.map((s, i) => (
                  <div key={s.id || i} style={S.stepCard}>
                    <div style={S.stepTitle}>{s.icone && <span style={{ marginRight:6 }}>{s.icone}</span>}{s.title||s.titulo}</div>
                    <MiniMd content={s.content} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Todas as atividades */}
          {allSteps.length > 0 && (
            <div>
              <SH icon="📋" label="Todas as atividades do playbook" />
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {allSteps.map((s, i) => {
                  const isActive = !s.status_contrato || s.status_contrato === laerStage || s.status_contrato === 'todos'
                  return (
                    <div key={s.id || i} style={{ ...S.stepCard, opacity: isActive ? 1 : 0.45 }}>
                      <div style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text)', marginBottom: s.content && isActive ? 6 : 0 }}>
                        {s.icone && <span style={{ marginRight:6 }}>{s.icone}</span>}{s.title||s.titulo}
                      </div>
                      {isActive && <MiniMd content={s.content} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Materiais */}
          {resources.length > 0 && (
            <div>
              <SH icon="📂" label="Materiais de Apoio" />
              <div style={S.resGrid}>
                {resources.map((res, i) => (
                  <div key={res.id || i} style={S.resCard}>
                    <div style={S.resTitle}>{res.title}</div>
                    {res.url && <a href={res.url} target="_blank" rel="noreferrer" style={S.resLink}>↗ Abrir</a>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referências */}
          {refs.length > 0 && (
            <div>
              <SH icon="🏆" label="Clientes de Referência" />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {refs.map((ref, i) => (
                  <div key={ref.id || i} style={S.refCard}>
                    <div style={{ ...S.refLogo, background:(ref.logo_color||'var(--accent)')+'22', color:ref.logo_color||'var(--accent)', border:`1px solid ${ref.logo_color||'var(--accent)'}44` }}>
                      {ref.logo_initials || (ref.company_name||'').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{ref.company_name}</div>
                      {ref.summary && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{ref.summary}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const EMPTY_FORM = {
  company_id: null, company_name: '', company_city: '', company_uf: '',
  laer_stage: 'Land', touch_model: 'Mid-Touch', health_score: 75,
  csm: '', renewal_date: '', notes: '', action_plans: [], checkins: [],
  contract_id: null, contract_numero: '', attachments: [],
  playbook_id: null,
}

function PartnerDetail({ item, onSave, onDelete, onClose, profiles = [], contratos = [], saveRef }) {
  const isNew = !item?.id
  const [tab, setTab] = useState('dados')
  const [form, setForm] = useState(item ? { ...EMPTY_FORM, ...item } : { ...EMPTY_FORM })

  // Contratos vinculados à empresa selecionada
  const contratosEmpresa = useMemo(() =>
    contratos.filter(c => c.status === 'ativo' && String(c.empresa_id) === String(form.company_id)),
    [contratos, form.company_id]
  )
  // Produtos do contrato selecionado
  const produtosContrato = useMemo(() => {
    if (!form.contract_id) return []
    const c = contratos.find(c => String(c.id) === String(form.contract_id))
    if (!c) return []
    return [...(c.itens_adesao || []), ...(c.itens_mrr || []), ...(c.itens_servico || [])]
  }, [contratos, form.contract_id])

  function patch(k, v) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function handleCreate() {
    if (!form.company_name.trim()) return
    onSave({ ...form, criado_em: new Date().toISOString().slice(0, 10) })
    onClose()
  }

  function handleUpdate() {
    onSave({ ...form, id: item.id })
    onClose()
  }

  if (saveRef) saveRef.current = isNew ? handleCreate : handleUpdate

  const days = daysUntil(form.renewal_date)

  const tabs = [{ key: 'dados', label: 'Dados' }, { key: 'playbook', label: 'Playbook' }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tabs */}
      {!isNew && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border2)', gap: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'var(--font)', marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Aba Playbook */}
      {!isNew && tab === 'playbook' && (
        <CSPlaybookPanel form={form} patch={patch} />
      )}

      {/* Aba Dados */}
      <div style={{ display: isNew || tab === 'dados' ? 'flex' : 'none', flexDirection: 'column', gap: 24 }}>

      {/* Header: ring + nome + badges (somente edição) */}
      {!isNew && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <HealthRing score={form.health_score} size={50} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
              {form.company_name}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <LaerBadge stage={form.laer_stage} />
              <TouchBadge model={form.touch_model} />
              {days !== null && (
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                  color: days <= 30 ? '#DC2626' : days <= 90 ? '#D97706' : 'var(--text-muted)' }}>
                  {days > 0 ? `Renova em ${days}d` : 'Renovação vencida'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <FormSection label="Dados">
        {isNew && (
          <FormGrid cols={1}>
            <FormField label="Empresa" required>
              <EmpresaSearch
                value={form.company_id}
                label={form.company_name}
                onChange={(id, nome) => setForm(f => ({ ...f, company_id: id, company_name: nome || '' }))}
                placeholder="Buscar empresa…"
              />
            </FormField>
          </FormGrid>
        )}
        <FormGrid cols={2}>
          <FormField label="Estágio LAER">
            <select className="so-field" value={form.laer_stage}
              onChange={e => patch('laer_stage', e.target.value)}>
              {LAER_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FormField>
          <FormField label="Touch Model">
            <select className="so-field" value={form.touch_model}
              onChange={e => patch('touch_model', e.target.value)}>
              {TOUCH_MODELS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Health Score (0–100)">
            <input className="so-field" type="number" min={0} max={100}
              value={form.health_score}
              onChange={e => patch('health_score', Math.max(0, Math.min(100, Number(e.target.value))))} />
          </FormField>
          <FormField label="CSM Responsável">
            <select className="so-field"
              value={form.csm_id || (profiles.find(u => u.nome === form.csm) || MOCK_USUARIOS.find(u => u.nome === form.csm))?.id || ''}
              onChange={e => {
                const lista = profiles.length > 0 ? profiles : MOCK_USUARIOS
                const u = lista.find(u => String(u.id) === e.target.value)
                patch('csm_id', u?.id || null)
                patch('csm', u?.nome || '')
              }}>
              <option value="">— Selecionar —</option>
              {(profiles.length > 0 ? profiles : MOCK_USUARIOS)
                .filter(u => u.status !== 'inativo')
                .map(u => <option key={u.id} value={u.id}>{u.nome}{u.cargo ? ` — ${u.cargo}` : u.papel ? ` — ${u.papel}` : ''}</option>)}
            </select>
          </FormField>
        </FormGrid>
        <FormGrid cols={1}>
          <FormField label="Data de Renovação">
            <input className="so-field" type="date" value={form.renewal_date || ''}
              onChange={e => patch('renewal_date', e.target.value)} />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection label="Contrato vinculado">
        <FormGrid cols={1}>
          <FormField label="Contrato ativo da empresa">
            <select className="so-field"
              value={form.contract_id || ''}
              onChange={e => {
                const c = contratos.find(c => String(c.id) === e.target.value)
                const updates = { contract_id: e.target.value || null, contract_numero: c?.numero || '' }
                const next = { ...form, ...updates }
                setForm(next)
                if (!isNew) onSave({ ...next, id: item.id })
              }}>
              <option value="">— Nenhum —</option>
              {contratosEmpresa.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.numero} {c.empresa_nome ? `· ${c.empresa_nome}` : ''}
                </option>
              ))}
              {contratosEmpresa.length === 0 && form.company_id && (
                <option disabled value="">Nenhum contrato ativo encontrado</option>
              )}
            </select>
          </FormField>
        </FormGrid>
        {produtosContrato.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {produtosContrato.map((p, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-soft)', fontFamily: 'var(--mono)' }}>
                {p.nome}
              </span>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection label="Anotações do CSM">
        <InlineTextarea
          value={form.notes || ''}
          onChange={v => patch('notes', v)}
          placeholder="Observações, contexto e estratégia para este cliente…"
          minRows={4}
        />
      </FormSection>

      {!isNew && (
        <>
          <FormSection label="Plano de Ação">
            <ActionPlanBlock
              plans={form.action_plans || []}
              onChange={plans => patch('action_plans', plans)}
            />
          </FormSection>

          <FormSection label="Histórico de Check-ins">
            <CheckinBlock
              checkins={form.checkins || []}
              onChange={checkins => patch('checkins', checkins)}
              produtos={produtosContrato}
              onAddActionPlans={novos => patch('action_plans', [...(form.action_plans || []), ...novos])}
            />
          </FormSection>

          <FormSection label="Anexos">
            <AnexosBlock
              attachments={form.attachments || []}
              onChange={attachments => patch('attachments', attachments)}
            />
          </FormSection>

        </>
      )}
      </div>{/* fim aba dados */}
    </div>
  )
}

// ─── Colunas ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    key: 'company_name',
    label: 'Empresa',
    render: (val, row) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{val}</div>
        {(row.company_city || row.company_uf) && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {row.company_city}{row.company_city && row.company_uf ? ' · ' : ''}{row.company_uf}
          </div>
        )}
      </div>
    ),
  },
  { key: 'laer_stage',   label: 'LAER',         render: val => <LaerBadge stage={val} /> },
  { key: 'touch_model',  label: 'Touch Model',   render: val => <TouchBadge model={val} /> },
  {
    key: 'health_score',
    label: 'Score',
    render: val => {
      const { color } = healthColor(val)
      return <HealthRing score={val} size={36} />
    },
  },
  {
    key: 'csm',
    label: 'CSM',
    render: val => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{val || '—'}</span>,
  },
  {
    key: 'renewal_date',
    label: 'Renovação',
    render: (val, row) => {
      const days = daysUntil(val)
      return (
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)',
          color: days !== null && days <= 30 ? '#DC2626' : days !== null && days <= 90 ? '#D97706' : 'var(--text-muted)',
          fontWeight: days !== null && days <= 90 ? 700 : 400 }}>
          {fmtDate(val)}
          {days !== null && days <= 90 && (
            <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.7 }}>({days}d)</span>
          )}
        </span>
      )
    },
  },
]

const FILTERS = [
  { key: 'laer_stage',  label: 'LAER',        options: LAER_STAGES.map(s => ({ value: s.value, label: s.label })) },
  { key: 'touch_model', label: 'Touch Model', options: TOUCH_MODELS.map(t => ({ value: t.value, label: t.label })) },
]

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function CustomerSuccess() {
  const { records, setRecords, save: saveHealth, remove: removeHealth } = useCustomerHealth()
  const { registrar: log } = useAuditLog()
  const [search, setSearch]             = useLocalState('browse:cs_browse:search', '')
  const [activeFilters, setActiveFilters] = useLocalState('browse:cs_browse:filters', {})
  const [modal, setModal]               = useState(null)  // null | 'novo' | record-obj

  // Cadastro de usuários (CSM) e contratos (para relacionamento)
  const [profiles] = useLocalState('usuarios:profiles', [])
  const contratos  = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('crm:contratos_v2')) || [] } catch { return [] }
  }, [])

  const lista = useMemo(() => {
    const q = search.toLowerCase()
    const laerFilter  = activeFilters.laer_stage  || []
    const touchFilter = activeFilters.touch_model || []
    return records.filter(r =>
      (!q || r.company_name.toLowerCase().includes(q) || (r.csm || '').toLowerCase().includes(q)) &&
      (!laerFilter.length  || laerFilter.includes(r.laer_stage)) &&
      (!touchFilter.length || touchFilter.includes(r.touch_model))
    )
  }, [records, search, activeFilters])

  async function save(updated) {
    const isNew = !records.find(r => r.id === updated.id)
    const res = await saveHealth(updated)
    if (res && !res.ok) { alert(res.message); return }
    log(isNew ? 'criar' : 'editar', 'customer_success', updated.id, { descricao: `CS ${isNew ? 'criado' : 'editado'}: ${updated.company_name || ''}` })
  }

  function remove(id) {
    const r = records.find(x => x.id === id)
    removeHealth(id)
    log('excluir', 'customer_success', id, { descricao: `CS excluído: ${r?.company_name || id}` })
    setModal(null)
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

  const kpisNode = (data) => {
    const healthy  = data.filter(r => r.health_score >= 80).length
    const atencao  = data.filter(r => r.health_score >= 50 && r.health_score < 80).length
    const risco    = data.filter(r => r.health_score < 50).length
    const avgScore = data.length
      ? Math.round(data.reduce((s, r) => s + r.health_score, 0) / data.length)
      : 0
    const { color: avgColor } = healthColor(avgScore)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        {[
          { label: 'Clientes',    value: data.length, color: 'var(--text)'  },
          { label: 'Saudáveis',  value: healthy,      color: '#059669'      },
          { label: 'Atenção',    value: atencao,      color: '#D97706'      },
          { label: 'Em Risco',   value: risco,        color: '#DC2626'      },
          { label: 'Score Médio',value: avgScore,     color: avgColor, mono: true },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', borderRadius: 10,
            padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4,
            border: '1px solid var(--border2)', boxShadow: 'var(--shadow)',
            borderTop: '3px solid var(--border)' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: k.color,
              letterSpacing: '-0.5px', lineHeight: 1,
              fontFamily: k.mono ? 'var(--mono)' : 'inherit' }}>
              {k.value}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</span>
          </div>
        ))}
      </div>
    )
  }

  // Renovações em risco (vencimento ≤ 90 dias e score < 70 OU qualquer vencimento ≤ 30 dias)
  const renovacoesAlerta = useMemo(() => {
    const hoje = new Date()
    return records
      .filter(r => {
        if (!r.renewal_date) return false
        const dias = Math.ceil((new Date(r.renewal_date) - hoje) / (1000 * 60 * 60 * 24))
        return (dias >= 0 && dias <= 30) || (dias >= 0 && dias <= 90 && r.health_score < 70)
      })
      .sort((a, b) => new Date(a.renewal_date) - new Date(b.renewal_date))
  }, [records])

  // Score por produto (média dos health_scores de todos os check-ins vinculados a esse produto)
  const scorePorProduto = useMemo(() => {
    const map = {}
    records.forEach(r => {
      ;(r.checkins || []).forEach(ci => {
        if (!ci.produto_id) return
        if (!map[ci.produto_id]) map[ci.produto_id] = { nome: ci.produto_nome || ci.produto_id, scores: [], checkins: 0 }
        map[ci.produto_id].scores.push(r.health_score)
        map[ci.produto_id].checkins++
      })
    })
    return Object.entries(map).map(([id, d]) => ({
      produto_id: id,
      nome: d.nome,
      score: Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length),
      total_checkins: d.checkins,
    })).sort((a, b) => a.score - b.score)
  }, [records])

  const renovacoesNode = renovacoesAlerta.length > 0 && (
    <div style={{ background: 'var(--surface)', border: '1px solid #FCA5A5', borderRadius: 10,
      padding: '12px 16px', marginTop: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>
          Renovações em alerta ({renovacoesAlerta.length})
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {renovacoesAlerta.map(r => {
          const dias = Math.ceil((new Date(r.renewal_date) - new Date()) / (1000 * 60 * 60 * 24))
          const { color } = healthColor(r.health_score)
          const urgente = dias <= 30
          return (
            <div key={r.id} onClick={() => setModal(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                background: urgente ? '#FEF2F2' : 'var(--surface2)', borderRadius: 7,
                border: `1px solid ${urgente ? '#FCA5A5' : 'var(--border)'}`, cursor: 'pointer' }}>
              <HealthRing score={r.health_score} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.company_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.csm || '—'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: urgente ? '#DC2626' : '#D97706', fontFamily: 'var(--mono)' }}>
                  {fmtDate(r.renewal_date)}
                </div>
                <div style={{ fontSize: 10, color: urgente ? '#DC2626' : '#D97706', fontFamily: 'var(--mono)' }}>
                  {dias}d restantes
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const scoreProdutoNode = scorePorProduto.length > 0 && (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10,
      padding: '12px 16px', marginTop: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
        Score por Produto
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {scorePorProduto.map(p => {
          const { color, bg } = healthColor(p.score)
          const pct = p.score
          return (
            <div key={p.produto_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.nome}
                </div>
                <div style={{ height: 5, background: 'var(--border2)', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .3s' }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--mono)', flexShrink: 0 }}>
                {p.score}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                {p.total_checkins} ci
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const kpisComExtras = (data) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {kpisNode(data)}
      <div style={{ display: 'grid', gridTemplateColumns: scoreProdutoNode ? '1fr 1fr' : '1fr', gap: 12 }}>
        {renovacoesNode}
        {scoreProdutoNode}
      </div>
    </div>
  )

  const saveRef    = useRef(null)
  const isEditing  = modal && modal !== 'novo'
  const drawerTitle = modal === 'novo' ? 'Novo Check-in' : (isEditing ? modal.company_name : '')

  return (
    <>
      <BrowseLayout
        modulo="customer_success"
        data={lista}
        columns={COLUMNS}
        filters={FILTERS}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        search={search}
        onSearchChange={setSearch}
        keyField="id"
        storageKey="cs_browse"
        onRowClick={r => setModal(r)}
        onNew={() => setModal('novo')}
        newLabel="Novo Check-in"
        onImport={importCSV}
        onExportCsv={exportCSV}
        kpis={kpisComExtras}
        renderCard={row => <CsCard row={row} />}
        bulkEditFields={[
          { key: 'laer_stage',  label: 'Estágio LAER',    type: 'select',
            options: LAER_STAGES.map(s => ({ value: s.id, label: s.label })) },
          { key: 'touch_model', label: 'Touch Model',      type: 'select',
            options: TOUCH_MODELS.map(s => ({ value: s.id, label: s.label })) },
          { key: 'csm',         label: 'CSM Responsável',  type: 'select',
            options: (profiles.length > 0 ? profiles : MOCK_USUARIOS)
              .filter(u => u.status !== 'inativo')
              .map(u => ({ value: u.nome, label: u.nome })) },
          { key: 'health_score',label: 'Health Score',     type: 'number' },
          { key: 'renewal_date',label: 'Data de Renovação',type: 'date' },
          { key: 'notes',       label: 'Observações',      type: 'textarea' },
        ]}
        onBulkEdit={(ids, changes) => {
          setRecords(prev => prev.map(r =>
            ids.includes(r.id) ? { ...r, ...changes } : r
          ))
        }}
        bulkActions={[
          { label: 'Excluir selecionados', variant: 'danger', onClick: async ids => {
            if (!window.confirm(`Excluir ${ids.length} registro(s) permanentemente?`)) return
            for (const id of ids) {
              const r = records.find(x => x.id === id)
              await removeHealth(id)
              log('excluir', 'customer_success', id, { descricao: `CS excluído: ${r?.company_name || id}` })
            }
          }},
        ]}
        emptyState={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <HeartPulse size={40} style={{ opacity: 0.25 }} />
            <span style={{ fontSize: 13 }}>Nenhum cliente encontrado</span>
          </div>
        }
      />

      <SlideOver
        open={!!modal}
        onClose={() => setModal(null)}
        title={drawerTitle}
        subtitle="Customer Success"
        defaultWidth={600}
        onSave={() => saveRef.current?.()}
        saveLabel={isEditing ? 'Salvar alterações' : 'Criar Check-in'}
        onDelete={isEditing ? () => { remove(modal.id); setModal(null) } : undefined}
        deleteConfirm="Remover este cliente do CS? Esta ação não pode ser desfeita."
      >
        {modal && (
          <PartnerDetail
            item={modal === 'novo' ? null : modal}
            onSave={updated => { save(updated); if (isEditing) setModal(updated) }}
            onDelete={remove}
            onClose={() => setModal(null)}
            profiles={profiles}
            contratos={contratos}
            saveRef={saveRef}
          />
        )}
      </SlideOver>
    </>
  )
}

// ─── Estilos internos (usados em CheckinBlock) ────────────────────────────────
const LBL = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4,
}
const INPUT = {
  width: '100%', padding: '7px 10px', border: '1px solid var(--border)',
  borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)',
  fontSize: 12, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}
