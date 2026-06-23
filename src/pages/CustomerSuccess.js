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
import { HeartPulse, Plus, Trash2, Circle, CheckCircle2, Paperclip, Download, X } from 'lucide-react'

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
function CheckinBlock({ checkins, onChange, produtos = [] }) {
  const [form, setForm] = useState(null)
  const [dupErr, setDupErr] = useState('')
  const TYPES = ['Reunião', 'Ligação', 'E-mail', 'Visita', 'QBR']

  function addCheckin() {
    if (!form?.summary?.trim()) return
    const date = form.date || new Date().toISOString().slice(0, 10)
    const produto_id = form.produto_id || null
    if (produto_id) {
      const dup = checkins.find(c => c.produto_id === produto_id && c.date === date)
      if (dup) { setDupErr(`Já existe um check-in para este produto em ${fmtDate(date)}.`); return }
    }
    setDupErr('')
    onChange([{ id: cidFn(), date, type: form.type || 'Reunião', summary: form.summary,
      produto_id, produto_nome: form.produto_nome || '' }, ...checkins])
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
const EMPTY_FORM = {
  company_id: null, company_name: '', company_city: '', company_uf: '',
  laer_stage: 'Land', touch_model: 'Mid-Touch', health_score: 75,
  csm: '', renewal_date: '', notes: '', action_plans: [], checkins: [],
  contract_id: null, contract_numero: '', attachments: [],
}

function PartnerDetail({ item, onSave, onDelete, onClose, profiles = [], contratos = [] }) {
  const isNew = !item?.id
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
    const next = { ...form, [k]: v }
    setForm(next)
    if (!isNew) onSave({ ...next, id: item.id })
  }

  function handleCreate() {
    if (!form.company_name.trim()) return
    onSave({
      ...form, id: uid(), tenant_id: 't1',
      criado_em: new Date().toISOString().slice(0, 10),
    })
    onClose()
  }

  const days = daysUntil(form.renewal_date)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
              value={(profiles.find(u => u.nome === form.csm) || MOCK_USUARIOS.find(u => u.nome === form.csm))?.id || ''}
              onChange={e => {
                const u = profiles.find(u => u.id === e.target.value) || MOCK_USUARIOS.find(u => u.id === e.target.value)
                patch('csm', u?.nome || '')
              }}>
              <option value="">— Selecionar —</option>
              {(profiles.length > 0 ? profiles : MOCK_USUARIOS)
                .filter(u => u.status !== 'inativo')
                .map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
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
                patch('contract_id', e.target.value || null)
                patch('contract_numero', c?.numero || '')
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
            />
          </FormSection>

          <FormSection label="Anexos">
            <AnexosBlock
              attachments={form.attachments || []}
              onChange={attachments => patch('attachments', attachments)}
            />
          </FormSection>

          <DeleteZone label="Remover cliente" onDelete={() => { onDelete(item.id); onClose() }} />
        </>
      )}

      {isNew && (
        <Button onClick={handleCreate} disabled={!form.company_name.trim()}
          style={{ alignSelf: 'flex-start' }}>
          Criar Check-in
        </Button>
      )}
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
  const [records, setRecords]           = useLocalState(STORAGE_KEY, MOCK_CUSTOMER_HEALTH)
  const [search, setSearch]             = useState('')
  const [activeFilters, setActiveFilters] = useState({})
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

  function save(updated) {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === updated.id)
      if (idx >= 0) { const a = [...prev]; a[idx] = updated; return a }
      return [...prev, updated]
    })
  }

  function remove(id) {
    setRecords(prev => prev.filter(r => r.id !== id))
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

  // KPIs
  const healthy  = records.filter(r => r.health_score >= 80).length
  const atencao  = records.filter(r => r.health_score >= 50 && r.health_score < 80).length
  const risco    = records.filter(r => r.health_score < 50).length
  const avgScore = records.length
    ? Math.round(records.reduce((s, r) => s + r.health_score, 0) / records.length)
    : 0
  const { color: avgColor } = healthColor(avgScore)

  const kpisNode = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
      {[
        { label: 'Clientes',    value: records.length, color: 'var(--text)'  },
        { label: 'Saudáveis',  value: healthy,        color: '#059669'      },
        { label: 'Atenção',    value: atencao,        color: '#D97706'      },
        { label: 'Em Risco',   value: risco,          color: '#DC2626'      },
        { label: 'Score Médio',value: avgScore,       color: avgColor, mono: true },
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

  const isEditing  = modal && modal !== 'novo'
  const drawerTitle = modal === 'novo' ? 'Novo Check-in' : (isEditing ? modal.company_name : '')

  return (
    <>
      <BrowseLayout
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
        newLabel="+ Novo Check-in"
        onImport={importCSV}
        onExportCsv={exportCSV}
        kpis={kpisNode}
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
          { label: 'Excluir selecionados', variant: 'danger', onClick: ids => {
            if (!window.confirm(`Excluir ${ids.length} registro(s) permanentemente?`)) return
            setRecords(prev => prev.filter(r => !ids.includes(r.id)))
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
        showFooter={false}
      >
        {modal && (
          <PartnerDetail
            item={modal === 'novo' ? null : modal}
            onSave={updated => { save(updated); if (isEditing) setModal(updated) }}
            onDelete={remove}
            onClose={() => setModal(null)}
            profiles={profiles}
            contratos={contratos}
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
