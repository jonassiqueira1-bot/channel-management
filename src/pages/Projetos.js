import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { SlidersHorizontal, ChevronDown, LayoutList, LayoutGrid } from 'lucide-react'
import FechamentoHoras from './FechamentoHoras'
import {
  FASES_MIT, STATUS_PROJETO, CRITICALITY_CFG, PHASE_NAMES,
  MOCK_PROJECT_ATTACHMENTS, MOCK_OPP_HISTORICO, MOCK_OPORTUNIDADES_LISTA,
} from '../data/mockProjetos'
import { useLocalState } from '../hooks/useLocalState'
import { useProjects } from '../hooks/useProjects'
import SearchSelect from '../components/SearchSelect'
import { MOCK_USUARIOS } from '../data/mockUsuarios'
import Button from '../components/Button'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import EmpresaSearch from '../components/EmpresaSearch'
import { STORAGE_KEY as CS_STORAGE_KEY, MOCK_CUSTOMER_HEALTH } from '../data/mockCustomerSuccess'
import ActionFeedback from '../components/ActionFeedback'

const ACCENT = 'var(--accent)'

const EMPTY_FORM = {
  name: '', company_nome: '', franchise_nome: '',
  phase: 'iniciacao', current_phase_index: 1, status: 'em_andamento',
  total_hours_estimated: '', total_hours_executed: 0,
  start_date: '', end_date_estimated: '', notes: '', opportunity_id: '',
  produto_nome: '',
}

// ─── CS Integration: cria check-in ao concluir projeto ───────────────────────
function criarCheckinCS(projeto) {
  try {
    const raw  = localStorage.getItem(CS_STORAGE_KEY)
    const recs = raw ? JSON.parse(raw) : [...MOCK_CUSTOMER_HEALTH]
    const hoje = new Date().toISOString().slice(0, 10)
    const checkin = {
      id:           'ci_prj_' + Date.now(),
      date:         hoje,
      type:         'Reunião',
      summary:      `Projeto "${projeto.name}" concluído. Check-in gerado automaticamente.`,
      produto_id:   null,
      produto_nome: projeto.produto_nome || '',
    }
    const idx = recs.findIndex(r => String(r.company_id) === String(projeto.company_id))
    if (idx >= 0) {
      recs[idx] = { ...recs[idx], checkins: [checkin, ...(recs[idx].checkins || [])] }
    } else {
      recs.push({
        id: 'ch_prj_' + Date.now(), tenant_id: 't1',
        company_id: projeto.company_id, company_name: projeto.company_nome || '',
        company_city: '', company_uf: '',
        csm: '', laer_stage: 'Land', touch_model: 'Tech-Touch',
        health_score: 75, renewal_date: '',
        notes: `Cliente adicionado automaticamente ao concluir o projeto "${projeto.name}".`,
        action_plans: [], checkins: [checkin], attachments: [],
        contract_id: null, contract_numero: '',
      })
    }
    localStorage.setItem(CS_STORAGE_KEY, JSON.stringify(recs))
  } catch (e) { console.error('Erro ao criar check-in CS:', e) }
}

// ─── @keyframes ───────────────────────────────────────────────────────────────
function PulseStyle() {
  useEffect(() => {
    const id = 'prj-pulse-style'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
      @keyframes prj-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
      .prj-blocked-badge { animation: prj-pulse 1.4s ease-in-out infinite; }
    `
    document.head.appendChild(el)
  }, [])
  return null
}

// ─── Shared styles ────────────────────────────────────────────────────────────
// ─── Page-level styles (espelho do Pipeline) ─────────────────────────────────
const pg = {
  pageHeader: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)', marginBottom: 4 },
  sep:        { color: 'var(--border)' },
  title:      { margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' },
  newBtn:     { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  kpis:       { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, paddingBottom: 4 },
  kpi:        { background: 'var(--surface)', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid var(--border2)', boxShadow: 'var(--shadow)' },
  toolbar:    { background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tbLeft:     { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  tbRight:    { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  tbDivider:  { width: 1, height: 24, background: 'var(--border)', flexShrink: 0, margin: '0 4px' },
  searchWrap: { position: 'relative', width: 220, flexShrink: 0 },
  searchIcon: { position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' },
  searchInput:{ width: '100%', height: 36, padding: '0 10px 0 28px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' },
  select:     { height: 36, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 },
  viewToggle: { display: 'flex', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden', flexShrink: 0 },
  viewBtn:    { width: 34, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' },
  viewBtnOn:  { background: 'var(--accent-glow)', color: 'var(--accent)' },
  ghostBtn:   { height: 36, display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0 },
  resultRow:  { display: 'flex', alignItems: 'center', gap: 12 },
}

const ms = {
  fg:         { display: 'flex', flexDirection: 'column', gap: 6 },
  row:        { display: 'flex', gap: 12 },
  lbl:        { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' },
  sectionLbl: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' },
  inp:        { padding: '9px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn:        { fontSize: 13, color: 'var(--text-soft)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnPrimary: { fontSize: 13, fontWeight: 700, color: '#fff', background: ACCENT, border: 'none', borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnSuccess: { fontSize: 13, fontWeight: 700, color: '#fff', background: '#10B981', border: 'none', borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontFamily: 'var(--font)' },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, backdropFilter: 'blur(2px)' },
  modal:      { background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' },
  mHeader:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  mBody:      { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 },
  mFooter:    { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}
function fmtMoney(v) {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function fileIcon(mime) {
  if (!mime) return '📎'
  if (mime.includes('pdf'))   return '📄'
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊'
  if (mime.includes('word') || mime.includes('msword'))       return '📝'
  if (mime.includes('zip') || mime.includes('rar'))           return '📦'
  if (mime.includes('image')) return '🖼'
  return '📎'
}
function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function phaseOfIndex(idx) {
  return FASES_MIT[Math.min(Math.max(idx, 1), 6) - 1]
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ executed, estimated, thin }) {
  const pct = estimated > 0 ? Math.min(100, Math.round((executed / estimated) * 100)) : 0
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981'
  const h = thin ? 3 : 5
  return (
    <div>
      {!thin && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>{executed}h / {estimated}h</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color }}>{pct}%</span>
        </div>
      )}
      <div style={{ height: h, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_PROJETO[status] || STATUS_PROJETO.em_andamento
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
}

function CritBadge({ criticality }) {
  const cfg = CRITICALITY_CFG[criticality] || CRITICALITY_CFG.media
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
}

// ─── Kanban card ──────────────────────────────────────────────────────────────
function ProjetoCard({ projeto, isBlocked, execTotal, onEdit, onDragStart }) {
  const exe = execTotal != null ? execTotal : Number(projeto.total_hours_executed)
  const est = Number(projeto.total_hours_estimated)
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, projeto.id)}
      onClick={() => onEdit(projeto)}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.13)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
    >
      {isBlocked && (
        <div className="prj-blocked-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: '#fff', background: '#EF4444', borderRadius: 20, padding: '2px 8px', alignSelf: 'flex-start', letterSpacing: '0.04em' }}>
          ⚠ BLOQUEADO
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
          {initials(projeto.company_nome)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, wordBreak: 'break-word' }}>{projeto.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{projeto.company_nome}</div>
        </div>
      </div>
      {projeto.franchise_nome && (
        <div style={{ fontSize: 10, color: 'var(--text-soft)', background: 'var(--surface2)', borderRadius: 5, padding: '2px 6px', alignSelf: 'flex-start' }}>{projeto.franchise_nome}</div>
      )}
      <ProgressBar executed={exe} estimated={est} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <StatusBadge status={projeto.status} />
        {projeto.end_date_estimated && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>até {fmtDate(projeto.end_date_estimated)}</span>}
      </div>
    </div>
  )
}

// ─── Kanban column ────────────────────────────────────────────────────────────
function KanbanColuna({ fase, projetos, blockedIds, execTotals, onEdit, onDragStart, onDrop, onDragOver, onAddProject }) {
  const [over, setOver] = useState(false)
  const totalEst = projetos.reduce((s, p) => s + Number(p.total_hours_estimated), 0)
  const totalExe = projetos.reduce((s, p) => s + (execTotals[p.id] ?? Number(p.total_hours_executed)), 0)
  return (
    <div
      style={{ width: 240, minWidth: 240, display: 'flex', flexDirection: 'column', borderRadius: 12, background: over ? 'rgba(0,0,0,0.03)' : 'transparent', transition: 'background 0.15s' }}
      onDragOver={e => { e.preventDefault(); setOver(true); onDragOver(e) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { setOver(false); onDrop(e, fase.value, fase.order) }}
    >
      <div style={{ padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: fase.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', flex: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{fase.label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 20, padding: '1px 7px' }}>{projetos.length}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', padding: '0 12px 10px', borderBottom: '1px solid var(--border)' }}>
        {totalExe.toFixed(0)}h / {totalEst}h
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
        {projetos.map(p => (
          <ProjetoCard key={p.id} projeto={p} isBlocked={blockedIds.has(p.id)} execTotal={execTotals[p.id]} onEdit={onEdit} onDragStart={onDragStart} />
        ))}
        {projetos.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', opacity: 0.6 }}>Nenhum projeto</div>
        )}
      </div>
      <button
        onClick={() => onAddProject(fase.value, fase.order)}
        style={{ margin: '4px 8px 8px', padding: '6px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font)' }}
      >
        + Novo projeto
      </button>
    </div>
  )
}

// ─── Novo Projeto Modal ───────────────────────────────────────────────────────
function NovoProjetoModal({ defaultPhase, defaultPhaseIndex, onSave, onClose, projetos = [] }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, phase: defaultPhase || 'iniciacao', current_phase_index: defaultPhaseIndex || 1, company_id: null })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const dupWarning = useMemo(() => {
    if (!form.company_id || !form.produto_nome?.trim() || !form.start_date) return ''
    const prod = form.produto_nome.trim().toLowerCase()
    const start = form.start_date
    const end   = form.end_date_estimated || '9999-12-31'
    const dup = projetos.find(p =>
      String(p.company_id) === String(form.company_id) &&
      (p.produto_nome || '').trim().toLowerCase() === prod &&
      p.status !== 'cancelado' &&
      (p.start_date || '') <= end &&
      (p.end_date_estimated || '9999-12-31') >= start
    )
    return dup ? `Já existe o projeto "${dup.name}" para esta empresa e produto no mesmo período.` : ''
  }, [form.company_id, form.produto_nome, form.start_date, form.end_date_estimated, projetos])

  return (
    <SlideOver
      open
      onClose={onClose}
      title="Novo Projeto"
      subtitle="Operação · Projetos"
      defaultWidth={600}
      showFooter={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
        <FormSection label="Identificação">
          <FormGrid cols={1}>
            <FormField label="Nome do Projeto" required>
              <input className="so-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Implantação ERP — Empresa X" autoFocus />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Empresa" required>
              <EmpresaSearch
                value={form.company_id}
                label={form.company_nome}
                onChange={(id, nome) => setForm(f => ({ ...f, company_id: id, company_nome: nome || '' }))}
                placeholder="Buscar empresa…"
              />
            </FormField>
            <FormField label="Produto implantado">
              <input className="so-field" value={form.produto_nome} onChange={e => set('produto_nome', e.target.value)} placeholder="Ex: Boostly Pro" />
            </FormField>
            <FormField label="Franquia / Canal">
              <input className="so-field" value={form.franchise_nome} onChange={e => set('franchise_nome', e.target.value)} placeholder="Canal SP Sul" />
            </FormField>
            <FormField label="Fase MIT">
              <select className="so-field" value={form.phase} onChange={e => { set('phase', e.target.value); set('current_phase_index', FASES_MIT.find(x => x.value === e.target.value)?.order || 1) }}>
                {FASES_MIT.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_PROJETO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
          </FormGrid>
          <FormGrid cols={3}>
            <FormField label="Horas estimadas">
              <input className="so-field" type="number" value={form.total_hours_estimated} onChange={e => set('total_hours_estimated', e.target.value)} placeholder="160" />
            </FormField>
            <FormField label="Data de início">
              <input className="so-field" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </FormField>
            <FormField label="Previsão de término">
              <input className="so-field" type="date" value={form.end_date_estimated} onChange={e => set('end_date_estimated', e.target.value)} />
            </FormField>
          </FormGrid>
          {dupWarning && (
            <div style={{ fontSize: 12, color: '#92400E', padding: '8px 12px', background: '#FEF3C7',
              borderRadius: 7, border: '1px solid #FCD34D', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span>{dupWarning}</span>
            </div>
          )}
        </FormSection>
        <FormSection label="Observações">
          <textarea className="so-field" style={{ height: 80, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Contexto, requisitos iniciais…" />
        </FormSection>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={ms.btn}>Cancelar</button>
          <button
            onClick={() => form.name.trim() && !dupWarning && onSave(form)}
            disabled={!!dupWarning || !form.name.trim()}
            style={{ ...ms.btnPrimary, opacity: (dupWarning || !form.name.trim()) ? 0.45 : 1, cursor: (dupWarning || !form.name.trim()) ? 'not-allowed' : 'pointer' }}>
            Criar projeto
          </button>
        </div>
      </div>
    </SlideOver>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAWER TABS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Notion-style collapsible section ────────────────────────────────────────
function NotionSection({ title, icon, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform 0.18s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>▶</span>
        {icon && <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>}
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{title}</span>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--surface2)', color: 'var(--text-muted)', borderRadius: 20, padding: '1px 7px' }}>{badge}</span>}
      </button>
      {open && (
        <div style={{ paddingBottom: 14 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Member avatar ────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  'Líder de Projeto': { bg: 'color-mix(in srgb, var(--accent) 12%, transparent)', text: 'var(--accent)' },
  'Consultora':       { bg: 'rgba(59,130,246,0.12)', text: '#1D4ED8' },
  'Consultor':        { bg: 'rgba(59,130,246,0.12)', text: '#1D4ED8' },
  'Suporte':          { bg: 'rgba(16,185,129,0.12)', text: '#047857' },
  'Chave do Cliente': { bg: 'rgba(245,158,11,0.12)', text: '#B45309' },
}
function roleColor(role) { return ROLE_COLORS[role] || { bg: 'var(--surface2)', text: 'var(--text-muted)' } }

// ─── Tab 0: Projeto (identificação + comercial + equipe) ─────────────────────
function TabProjeto({ projeto, members, onUpdate, onUpdateOpp, onAddMember, onRemoveMember }) {
  const [form, setForm] = useState({ ...projeto })
  const [saved, setSaved] = useState(false)
  const [oppSearch, setOppSearch] = useState('')
  const [showOppPicker, setShowOppPicker] = useState(false)
  const [memberName, setMemberName] = useState('')
  const [memberRole, setMemberRole] = useState('Consultor')
  const oppPickerRef = useRef(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const myMembers = members.filter(m => m.project_id === projeto.id)
  const linkedOpp = MOCK_OPORTUNIDADES_LISTA.find(o => o.id === form.opportunity_id)
  const oppDetail = form.opportunity_id ? MOCK_OPP_HISTORICO[form.opportunity_id] : null

  const filteredOpps = oppSearch.trim()
    ? MOCK_OPORTUNIDADES_LISTA.filter(o =>
        o.titulo.toLowerCase().includes(oppSearch.toLowerCase()) ||
        o.empresa.toLowerCase().includes(oppSearch.toLowerCase())
      )
    : MOCK_OPORTUNIDADES_LISTA

  useEffect(() => {
    if (!showOppPicker) return
    function h(e) { if (oppPickerRef.current && !oppPickerRef.current.contains(e.target)) setShowOppPicker(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showOppPicker])

  function handleSave() {
    onUpdate(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  function handleLinkOpp(opp) {
    setForm(f => ({ ...f, opportunity_id: opp.id }))
    setShowOppPicker(false)
    setOppSearch('')
    onUpdateOpp(projeto.id, opp.id)
  }
  function handleUnlinkOpp() {
    setForm(f => ({ ...f, opportunity_id: '' }))
    onUpdateOpp(projeto.id, null)
  }
  function handleAddMember() {
    if (!memberName.trim()) return
    onAddMember({ id: 'mb_' + Date.now(), project_id: projeto.id, tenant_id: 't1', name: memberName.trim(), role: memberRole })
    setMemberName('')
    setMemberRole('Consultor')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Identificação ── */}
      <NotionSection title="Identificação" icon="📋" defaultOpen={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormGrid cols={1}>
            <FormField label="Nome do projeto">
              <input className="so-field" value={form.name} onChange={set('name')} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Empresa cliente">
              <input className="so-field" value={form.company_nome || ''} onChange={set('company_nome')} placeholder="Nexus Tech" />
            </FormField>
            <FormField label="Canal / Franquia">
              <input className="so-field" value={form.franchise_nome || ''} onChange={set('franchise_nome')} placeholder="Canal SP Sul" />
            </FormField>
            <FormField label="Fase MIT">
              <select className="so-field" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value, current_phase_index: FASES_MIT.find(x => x.value === e.target.value)?.order || 1 }))}>
                {FASES_MIT.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select className="so-field" value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_PROJETO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
          </FormGrid>
          <FormGrid cols={3}>
            <FormField label="Horas estimadas">
              <input className="so-field" type="number" value={form.total_hours_estimated} onChange={set('total_hours_estimated')} />
            </FormField>
            <FormField label="Início">
              <input className="so-field" type="date" value={form.start_date || ''} onChange={set('start_date')} />
            </FormField>
            <FormField label="Previsão término">
              <input className="so-field" type="date" value={form.end_date_estimated || ''} onChange={set('end_date_estimated')} />
            </FormField>
          </FormGrid>
          <FormGrid cols={1}>
            <FormField label="Observações">
              <textarea className="so-field" style={{ height: 72, resize: 'vertical' }} value={form.notes || ''} onChange={set('notes')} />
            </FormField>
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleSave}>{saved ? '✓ Salvo' : 'Salvar alterações'}</Button>
          </div>
        </div>
      </NotionSection>

      {/* ── Comercial (Pipeline) ── */}
      <NotionSection title="Histórico Comercial" icon="💼" defaultOpen={true} badge={linkedOpp ? '1 vínculo' : undefined}>
        {!form.opportunity_id ? (
          /* Sem vínculo */
          <div style={{ position: 'relative' }} ref={oppPickerRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)' }}>Nenhuma oportunidade vinculada.</div>
              <button onClick={() => setShowOppPicker(o => !o)} style={{ ...ms.btnPrimary, fontSize: 12, padding: '5px 14px' }}>
                + Vincular ao Pipeline
              </button>
            </div>

            {showOppPicker && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 500, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', width: 340, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <input
                    autoFocus
                    style={{ ...ms.inp, fontSize: 12 }}
                    placeholder="Buscar oportunidade ou empresa..."
                    value={oppSearch}
                    onChange={e => setOppSearch(e.target.value)}
                  />
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {filteredOpps.map(opp => (
                    <div
                      key={opp.id}
                      onClick={() => handleLinkOpp(opp)}
                      style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{opp.titulo}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opp.empresa}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(opp.valor_total)}
                      </div>
                    </div>
                  ))}
                  {filteredOpps.length === 0 && <div style={{ padding: '14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum resultado.</div>}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Com vínculo */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🔗</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{linkedOpp?.titulo}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{linkedOpp?.empresa}</div>
                </div>
              </div>
              <button onClick={handleUnlinkOpp} style={{ ...ms.btn, fontSize: 11, padding: '3px 10px', color: 'var(--red)', borderColor: 'var(--red)' }}>Desvincular</button>
            </div>

            {oppDetail ? (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { lbl: 'Total',   val: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oppDetail.valor_total),   accent: true },
                    { lbl: 'CDU',     val: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oppDetail.valor_cdu) },
                    { lbl: 'SMS',     val: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oppDetail.valor_sms) },
                    { lbl: 'Serviço', val: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oppDetail.valor_servico) },
                  ].map(({ lbl, val, accent }) => (
                    <div key={lbl} style={{ flex: 1, minWidth: 70, background: accent ? 'var(--accent-glow)' : 'var(--surface)', border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '7px 10px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: accent ? 'var(--accent)' : 'var(--text-muted)' }}>{lbl}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: accent ? 'var(--accent)' : 'var(--text)', marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
                  <span><span style={{ color: 'var(--text-muted)' }}>Vendedor: </span><strong>{oppDetail.vendedor}</strong></span>
                  <span><span style={{ color: 'var(--text-muted)' }}>Fechamento: </span><strong>{oppDetail.data_fechamento ? (() => { const [y,m,d]=oppDetail.data_fechamento.split('-'); return `${d}/${m}/${y}` })() : '—'}</strong></span>
                  <span><span style={{ color: 'var(--text-muted)' }}>Origem: </span><strong>{oppDetail.origem}</strong></span>
                </div>
                {oppDetail.notas && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-soft)', background: 'var(--surface)', borderRadius: 7, padding: '8px 10px', borderLeft: '3px solid var(--accent)', lineHeight: 1.5 }}>
                    {oppDetail.notas}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px' }}>
                Dados comerciais desta oportunidade não disponíveis no cache local.
              </div>
            )}
          </div>
        )}
      </NotionSection>

      {/* ── Equipe ── */}
      <NotionSection title="Equipe do Projeto" icon="👥" defaultOpen={true} badge={myMembers.length > 0 ? `${myMembers.length} pessoas` : undefined}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Membros existentes */}
          {myMembers.map(m => {
            const rc = roleColor(m.role)
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: rc.bg, color: rc.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: rc.text, fontWeight: 600 }}>{m.role}</div>
                </div>
                <button onClick={() => onRemoveMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '2px 6px', borderRadius: 6 }} title="Remover">×</button>
              </div>
            )
          })}

          {myMembers.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0 8px' }}>Nenhum membro adicionado.</div>
          )}

          {/* Adicionar membro */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingTop: 4 }}>
            <div style={{ ...ms.fg, flex: 2 }}>
              <label style={ms.lbl}>Nome</label>
              <input style={{ ...ms.inp, fontSize: 12 }} value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="Nome do membro" onKeyDown={e => e.key === 'Enter' && handleAddMember()} />
            </div>
            <div style={{ ...ms.fg, flex: 1.5 }}>
              <label style={ms.lbl}>Papel</label>
              <select style={{ ...ms.inp, fontSize: 12 }} value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                <option>Líder de Projeto</option>
                <option>Consultor</option>
                <option>Consultora</option>
                <option>Suporte</option>
                <option>Chave do Cliente</option>
              </select>
            </div>
            <button onClick={handleAddMember} style={{ ...ms.btnPrimary, padding: '9px 14px', flexShrink: 0, fontSize: 18, lineHeight: 1 }} title="Adicionar">+</button>
          </div>
        </div>
      </NotionSection>

      {/* Último border-bottom */}
      <div style={{ borderTop: '1px solid var(--border)' }} />
    </div>
  )
}

// ─── MS Project XML parser ────────────────────────────────────────────────────
function parseMsProjectXml(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('XML inválido')

  const getText = (el, tag) => el.querySelector(tag)?.textContent?.trim() || ''

  // Duração ISO 8601 (PTxHxMxS ou PxDT...) → horas
  function isoToHours(dur) {
    if (!dur) return 0
    const days  = parseFloat(dur.match(/(\d+(?:\.\d+)?)D/)?.[1] || 0)
    const hours = parseFloat(dur.match(/(\d+(?:\.\d+)?)H/)?.[1] || 0)
    const mins  = parseFloat(dur.match(/(\d+(?:\.\d+)?)M(?!O)/)?.[1] || 0)
    return days * 8 + hours + mins / 60
  }

  const tasks = []
  doc.querySelectorAll('Task').forEach(t => {
    const uid  = getText(t, 'UID')
    const name = getText(t, 'Name')
    const type = getText(t, 'Type') // 0=fixed units, summary tasks often type 1
    if (!name || uid === '0') return // tarefa raiz
    const isNull  = getText(t, 'IsNull') === '1'
    if (isNull) return
    const outlineLevel = parseInt(getText(t, 'OutlineLevel') || '1', 10)
    const isSummary = getText(t, 'Summary') === '1'

    // Datas no formato YYYY-MM-DDTHH:MM:SS
    const rawStart  = getText(t, 'Start')
    const rawFinish = getText(t, 'Finish')
    const start = rawStart  ? rawStart.slice(0, 10)  : ''
    const end   = rawFinish ? rawFinish.slice(0, 10) : ''

    // Horas: preferir Work, fallback Duration
    const work  = getText(t, 'Work')
    const dur   = getText(t, 'Duration')
    const hours = isoToHours(work) || isoToHours(dur)

    const pct = parseFloat(getText(t, 'PercentComplete') || '0')

    tasks.push({ uid, name, start, end, hours: Math.round(hours * 10) / 10, pct, isSummary, outlineLevel })
  })
  return tasks
}

// ─── Modal de importação do Project ──────────────────────────────────────────
function ImportProjectModal({ projeto, myPhases, onApply, onClose }) {
  const [step, setStep] = useState('upload') // 'upload' | 'map' | 'done'
  const [tasks, setTasks] = useState([])
  const [mapping, setMapping] = useState({}) // uid → phase.id
  const [error, setError] = useState('')

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xml', 'mpx'].includes(ext)) { setError('Selecione um arquivo .xml exportado pelo MS Project'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = parseMsProjectXml(ev.target.result)
        if (!parsed.length) { setError('Nenhuma tarefa encontrada no arquivo.'); return }
        setTasks(parsed)
        // Auto-map por similaridade de nome
        const auto = {}
        parsed.forEach(t => {
          const tNorm = t.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          const match = myPhases.find(ph => {
            const pNorm = ph.phase_name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            return tNorm.includes(pNorm) || pNorm.includes(tNorm)
          })
          if (match) auto[t.uid] = match.id
        })
        setMapping(auto)
        setError('')
        setStep('map')
      } catch (err) {
        setError(`Erro ao ler arquivo: ${err.message}`)
      }
    }
    reader.readAsText(file)
  }

  function handleApply() {
    const updates = []
    Object.entries(mapping).forEach(([uid, phaseId]) => {
      if (!phaseId) return
      const task  = tasks.find(t => t.uid === uid)
      const phase = myPhases.find(p => p.id === phaseId)
      if (!task || !phase) return
      updates.push({
        ...phase,
        start_date_planned: task.start || phase.start_date_planned,
        end_date_planned:   task.end   || phase.end_date_planned,
        hours_estimated:    task.hours > 0 ? task.hours : phase.hours_estimated,
      })
    })
    onApply(updates)
    setStep('done')
  }

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
    display:'flex', alignItems:'center', justifyContent:'center', padding:24 }
  const box = { background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:640,
    maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column',
    boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }
  const head = { padding:'18px 24px', borderBottom:'1px solid var(--border2)',
    display:'flex', justifyContent:'space-between', alignItems:'center' }

  if (step === 'done') return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...box, maxWidth:380, padding:32, textAlign:'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
        <div style={{ fontSize:16, fontWeight:800, color:'var(--text)', marginBottom:6 }}>Importação concluída</div>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
          Datas e horas das fases mapeadas foram atualizadas.
        </div>
        <button style={{ ...ms.btnPrimary }} onClick={onClose}>Fechar</button>
      </div>
    </div>
  )

  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>
        <div style={head}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>Importar do MS Project</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {step === 'upload' ? 'Selecione o arquivo .xml exportado pelo MS Project' : `${tasks.length} tarefa(s) encontrada(s) — mapeie para as fases MIT`}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:20, color:'var(--text-muted)', padding:4 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:24 }}>
          {step === 'upload' && (
            <div>
              {/* Instruções */}
              <div style={{ background:'var(--surface2)', borderRadius:10, padding:'14px 18px',
                border:'1px solid var(--border2)', marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Como exportar do MS Project:</div>
                <ol style={{ margin:0, paddingLeft:20, fontSize:12.5, color:'var(--text-muted)', lineHeight:2 }}>
                  <li>Abra o projeto no MS Project</li>
                  <li>Vá em <strong>Arquivo → Salvar como</strong></li>
                  <li>Escolha o tipo <strong>"Projeto XML (*.xml)"</strong></li>
                  <li>Salve e selecione o arquivo abaixo</li>
                </ol>
              </div>

              {/* Drop zone */}
              <label style={{ display:'block', border:`2px dashed var(--border)`, borderRadius:12, padding:'40px 24px',
                textAlign:'center', cursor:'pointer', background:'var(--surface2)',
                transition:'border-color 0.15s' }}>
                <input type="file" accept=".xml,.mpx" onChange={handleFile} style={{ display:'none' }} />
                <div style={{ fontSize:36, marginBottom:10 }}>📂</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:4 }}>
                  Clique para selecionar o arquivo
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Formatos aceitos: .xml (MS Project XML)</div>
              </label>
              {error && <div style={{ marginTop:12, fontSize:12, color:'#EF4444', fontWeight:600 }}>{error}</div>}
            </div>
          )}

          {step === 'map' && (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr', gap:'8px 12px',
                alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Tarefa do Project</div>
                <div />
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Fase MIT</div>
              </div>
              {tasks.map(t => (
                <div key={t.uid} style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr', gap:'6px 12px',
                  alignItems:'center', padding:'8px 0',
                  borderBottom:'1px solid var(--border2)' }}>
                  {/* Tarefa */}
                  <div style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8,
                    padding:'8px 12px' }}>
                    <div style={{ fontSize:12, fontWeight: t.isSummary ? 700 : 500, color:'var(--text)',
                      paddingLeft: (t.outlineLevel - 1) * 10 }}>
                      {t.isSummary ? '▸ ' : ''}{t.name}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, paddingLeft:(t.outlineLevel-1)*10 }}>
                      {t.start && t.end ? `${t.start} → ${t.end}` : 'sem datas'}{t.hours > 0 ? ` · ${t.hours}h` : ''}
                    </div>
                  </div>
                  {/* Seta */}
                  <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>→</div>
                  {/* Select fase */}
                  <select value={mapping[t.uid] || ''} onChange={e => setMapping(m => ({ ...m, [t.uid]: e.target.value }))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
                      background:'var(--surface)', color:'var(--text)', fontSize:12, fontFamily:'var(--font)' }}>
                    <option value="">— Ignorar —</option>
                    {myPhases.map(ph => (
                      <option key={ph.id} value={ph.id}>{ph.phase_name}</option>
                    ))}
                  </select>
                </div>
              ))}
              {error && <div style={{ marginTop:12, fontSize:12, color:'#EF4444', fontWeight:600 }}>{error}</div>}
            </div>
          )}
        </div>

        {step === 'map' && (
          <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border2)',
            display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button onClick={() => setStep('upload')}
              style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)',
                background:'var(--surface2)', color:'var(--text)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>
              Voltar
            </button>
            <button onClick={handleApply} style={{ ...ms.btnPrimary }}>
              Aplicar importação ({Object.values(mapping).filter(Boolean).length} fases)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab 1: Cronograma MIT ────────────────────────────────────────────────────
function TabCronograma({ projeto, phases, timeLogs, onAdvancePhase, onUpdatePhases }) {
  const [showImport, setShowImport] = useState(false)
  const myPhases = phases.filter(p => p.project_id === projeto.id).sort((a, b) => a.phase_order - b.phase_order)
  const currentIdx = projeto.current_phase_index

  const execByPhase = useMemo(() => {
    const map = {}
    timeLogs.filter(l => l.project_id === projeto.id).forEach(l => {
      map[l.phase_id] = (map[l.phase_id] || 0) + Number(l.hours_executed)
    })
    return map
  }, [timeLogs, projeto.id])

  const currentPhase = myPhases.find(p => p.phase_order === currentIdx)
  const currentExe   = currentPhase ? (execByPhase[currentPhase.id] || 0) : 0
  const currentEst   = currentPhase ? Number(currentPhase.hours_estimated) : 0
  const currentPct   = currentEst > 0 ? (currentExe / currentEst) * 100 : 0
  const showSugestao = currentPct >= 90 && currentIdx < 6 && projeto.status !== 'concluido'

  const totalEst = myPhases.reduce((s, p) => s + Number(p.hours_estimated || 0), 0)
  const totalExe = myPhases.reduce((s, p) => s + (execByPhase[p.id] || 0), 0)
  const phasesCompleted = myPhases.filter(p => p.is_completed).length
  const pctGeral = totalEst > 0 ? Math.min(100, Math.round((totalExe / totalEst) * 100)) : 0

  // Cálculo do span do Gantt (datas mínima e máxima das fases)
  const allDates = myPhases.flatMap(p => [p.start_date_planned, p.end_date_planned].filter(Boolean))
  const ganttStart = allDates.length ? allDates.reduce((a, b) => a < b ? a : b) : projeto.start_date || new Date().toISOString().slice(0, 10)
  const ganttEnd   = allDates.length ? allDates.reduce((a, b) => a > b ? a : b) : projeto.end_date_estimated || new Date().toISOString().slice(0, 10)
  const spanDays   = Math.max(1, (new Date(ganttEnd) - new Date(ganttStart)) / 86400000)
  const today      = new Date().toISOString().slice(0, 10)

  function phasePct(start, end) {
    if (!start || !end) return { left: 0, width: 100 }
    const s = (new Date(start) - new Date(ganttStart)) / 86400000
    const d = Math.max(1, (new Date(end) - new Date(start)) / 86400000)
    return { left: (s / spanDays) * 100, width: (d / spanDays) * 100 }
  }

  function todayPct() {
    if (today < ganttStart) return null
    if (today > ganttEnd)   return null
    return ((new Date(today) - new Date(ganttStart)) / 86400000 / spanDays) * 100
  }
  const todayLeft = todayPct()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Cabeçalho com botão de importação ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowImport(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)',
            color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font)', transition: 'background 0.15s' }}>
          📥 Importar do Project
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Fases concluídas', value: `${phasesCompleted} / ${FASES_MIT.length}`, color: '#10B981' },
          { label: 'Horas estimadas',  value: `${totalEst}h`,                              color: 'var(--accent)' },
          { label: 'Horas executadas', value: `${totalExe.toFixed(1)}h`,                  color: '#3B82F6' },
          { label: 'Progresso geral',  value: `${pctGeral}%`,                              color: pctGeral >= 80 ? '#10B981' : pctGeral >= 50 ? '#F59E0B' : 'var(--accent)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10,
            padding: '12px 16px', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Sugestão de avanço */}
      {showSugestao && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10,
          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>💡 Fase atual atingiu {currentPct.toFixed(0)}% das horas</div>
            <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
              <strong>{currentPhase?.phase_name}</strong> — pronto para avançar para a próxima fase?
            </div>
          </div>
          <button style={{ ...ms.btnSuccess, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => onAdvancePhase(projeto, currentPhase)}>
            Avançar → {PHASE_NAMES[currentIdx]}
          </button>
        </div>
      )}

      {/* ── Gantt ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden' }}>

        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border2)',
          background: 'var(--surface2)' }}>
          <div style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.07em', borderRight: '1px solid var(--border2)' }}>Fase</div>
          <div style={{ padding: '10px 16px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{fmtDate(ganttStart)}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{fmtDate(ganttEnd)}</span>
            </div>
          </div>
        </div>

        {/* Linhas */}
        {myPhases.map((ph, i) => {
          const faseIdx = FASES_MIT.findIndex(f => f.order === ph.phase_order)
          const fase    = FASES_MIT[faseIdx] || FASES_MIT[0]
          const exe     = execByPhase[ph.id] || 0
          const est     = Number(ph.hours_estimated)
          const pct     = est > 0 ? Math.min(100, Math.round((exe / est) * 100)) : 0
          const isActive = ph.phase_order === currentIdx
          const isDone   = ph.is_completed
          const isFuture = ph.phase_order > currentIdx
          const { left, width } = phasePct(ph.start_date_planned, ph.end_date_planned)

          return (
            <div key={ph.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr',
              borderBottom: i < myPhases.length - 1 ? '1px solid var(--border2)' : 'none',
              background: isActive ? `${fase.color}08` : 'transparent',
              transition: 'background 0.2s' }}>

              {/* Nome da fase */}
              <div style={{ padding: '12px 16px', borderRight: '1px solid var(--border2)',
                display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: isDone ? '#10B981' : isActive ? fase.color : 'var(--border)' }} />
                  <span style={{ fontSize: 12, fontWeight: isActive ? 800 : 600,
                    color: isDone ? '#10B981' : isActive ? fase.color : isFuture ? 'var(--text-muted)' : 'var(--text)' }}>
                    {ph.phase_name}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 14 }}>
                  {isDone ? '✓ Concluída' : isActive ? `${pct}% · ${exe.toFixed(1)}h` : est ? `${est}h` : '—'}
                </div>
              </div>

              {/* Barra Gantt */}
              <div style={{ padding: '10px 0', position: 'relative', minHeight: 52 }}>
                {/* Linha de hoje */}
                {todayLeft !== null && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${todayLeft}%`,
                    width: 1, background: '#EF4444', opacity: 0.5, zIndex: 2 }} />
                )}
                {/* Barra da fase */}
                {ph.start_date_planned && ph.end_date_planned && (
                  <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    left: `calc(${left}% + 8px)`, width: `calc(${width}% - 16px)`,
                    height: 24, borderRadius: 6, overflow: 'hidden', minWidth: 20,
                    background: isDone ? '#10B98122' : isFuture ? 'var(--surface2)' : `${fase.color}22`,
                    border: `1px solid ${isDone ? '#10B981' : isActive ? fase.color : 'var(--border)'}` }}>
                    {/* Progresso interno */}
                    {!isFuture && pct > 0 && (
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
                        width: `${pct}%`, background: isDone ? '#10B981' : fase.color,
                        opacity: isDone ? 0.7 : 0.6, transition: 'width 0.5s ease', borderRadius: '5px 0 0 5px' }} />
                    )}
                    {/* Label na barra */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                      paddingLeft: 6, fontSize: 9.5, fontWeight: 700, fontFamily: 'var(--mono)',
                      color: isDone ? '#047857' : isActive ? fase.text : 'var(--text-muted)',
                      whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {isDone ? '✓ ' : isActive ? '▶ ' : ''}{pct > 0 ? `${pct}%` : ''}
                    </div>
                  </div>
                )}
                {/* Sem datas */}
                {(!ph.start_date_planned || !ph.end_date_planned) && (
                  <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    left: 8, fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Datas não definidas
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Rodapé — Legenda */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border2)', background: 'var(--surface2)',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {[
            { color: '#10B981', label: 'Concluída' },
            { color: 'var(--accent)', label: 'Em andamento' },
            { color: 'var(--border)', label: 'Futura' },
            { color: '#EF4444', label: 'Hoje', dashed: true },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: l.dashed ? 1 : 10, height: l.dashed ? 12 : 10,
                background: l.color, borderRadius: l.dashed ? 0 : 3, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.label}</span>
            </div>
          ))}
          {todayLeft !== null && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>
              Hoje: {fmtDate(today)}
            </span>
          )}
        </div>
      </div>

      {/* Modal de importação */}
      {showImport && (
        <ImportProjectModal
          projeto={projeto}
          myPhases={myPhases}
          onApply={updates => { updates.forEach(ph => onUpdatePhases(ph)); setShowImport(false) }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

// ─── Tab 2: Timesheet ─────────────────────────────────────────────────────────
function TabTimesheet({ projeto, phases, timeLogs, onAddLog }) {
  const myPhases   = phases.filter(p => p.project_id === projeto.id).sort((a, b) => a.phase_order - b.phase_order)
  const myLogs     = timeLogs.filter(l => l.project_id === projeto.id).sort((a, b) => b.logged_at.localeCompare(a.logged_at))
  const currentPhId = `ph_${projeto.id}_${projeto.current_phase_index}`

  const [profiles] = useLocalState('usuarios:profiles', [])
  const usuarios = profiles.length > 0
    ? profiles.filter(p => p.status !== 'inativo')
    : MOCK_USUARIOS

  const [form, setForm] = useState({
    phase_id: currentPhId,
    hours_executed: '',
    logged_at: new Date().toISOString().slice(0, 10),
    description: '',
    user_id: null,
    user_name: '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit() {
    if (!form.hours_executed || !form.description.trim()) return
    onAddLog({
      id: 'tl_' + Date.now(),
      project_id: projeto.id,
      phase_id: form.phase_id,
      tenant_id: 't1',
      user_id: form.user_id,
      user_name: form.user_name || 'Não informado',
      hours_executed: Number(form.hours_executed),
      description: form.description.trim(),
      logged_at: form.logged_at,
    })
    setForm(f => ({ ...f, hours_executed: '', description: '', user_id: null, user_name: '' }))
  }

  const totalExe = myLogs.reduce((s, l) => s + Number(l.hours_executed), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Form */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={ms.sectionLbl}>Lançar horas</div>
        <div style={ms.row}>
          <div style={{ ...ms.fg, flex: 2 }}>
            <label style={ms.lbl}>Fase</label>
            <select style={ms.inp} value={form.phase_id} onChange={set('phase_id')}>
              {myPhases.map(p => (
                <option key={p.id} value={p.id}>{p.phase_order}. {p.phase_name}</option>
              ))}
            </select>
          </div>
          <div style={{ ...ms.fg, flex: 2 }}>
            <label style={ms.lbl}>Usuário</label>
            <SearchSelect
              options={usuarios.map(u => ({ id: u.id, label: u.nome, sublabel: u.cargo || u.perfil, avatar: u.avatar || (u.nome?.[0] || '?'), color: 'var(--accent)' }))}
              value={form.user_id}
              onChange={(id, nome) => setForm(f => ({ ...f, user_id: id, user_name: nome }))}
              placeholder="Pesquisar usuário…"
              inputStyle={ms.inp}
            />
          </div>
          <div style={{ ...ms.fg, flex: 1 }}>
            <label style={ms.lbl}>Horas</label>
            <input style={ms.inp} type="number" step="0.5" min="0.5" value={form.hours_executed} onChange={set('hours_executed')} placeholder="2.5" />
          </div>
          <div style={{ ...ms.fg, flex: 1.5 }}>
            <label style={ms.lbl}>Data</label>
            <input style={ms.inp} type="date" value={form.logged_at} onChange={set('logged_at')} />
          </div>
        </div>
        <div style={ms.fg}>
          <label style={ms.lbl}>Descrição da atividade *</label>
          <textarea
            style={{ ...ms.inp, height: 64, resize: 'vertical' }}
            placeholder="Descreva o que foi realizado..."
            value={form.description}
            onChange={set('description')}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleSubmit}>Registrar horas</Button>
        </div>
      </div>

      {/* Histórico */}
      {myLogs.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={ms.sectionLbl}>Histórico de apontamentos</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{totalExe.toFixed(1)}h total</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myLogs.map(log => {
              const ph = myPhases.find(p => p.id === log.phase_id)
              const fase = ph ? FASES_MIT[ph.phase_order - 1] : null
              return (
                <div key={log.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{Number(log.hours_executed).toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>horas</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>{log.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                      {fase && <span style={{ fontSize: 10, fontWeight: 700, background: fase.bg, color: fase.text, borderRadius: 20, padding: '1px 7px' }}>{ph.phase_name}</span>}
                      {log.user_name && (() => {
                        const u = usuarios.find(u => u.id === log.user_id)
                        const initials = (log.user_name || '').slice(0, 2).toUpperCase()
                        return (
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                            <span style={{ width:16, height:16, borderRadius:'50%', background:'#EDE9FE', color:'var(--accent)',
                              display:'inline-flex', alignItems:'center', justifyContent:'center',
                              fontSize:8, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0 }}>
                              {u?.avatar || initials}
                            </span>
                            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{log.user_name}</span>
                          </span>
                        )
                      })()}
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{fmtDate(log.logged_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {myLogs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum apontamento registrado.</div>
      )}
    </div>
  )
}

// ─── Tab 3: Histórico Comercial & Bloqueios ───────────────────────────────────
function TabBloqueios({ projeto, issues, onAddIssue, onResolveIssue }) {
  const opp   = projeto.opportunity_id ? MOCK_OPP_HISTORICO[projeto.opportunity_id] : null
  const mine  = issues.filter(i => i.project_id === projeto.id)
  const abertas    = mine.filter(i => i.status === 'aberta')
  const resolvidas = mine.filter(i => i.status === 'resolvida')

  const [desc, setDesc] = useState('')
  const [crit, setCrit] = useState('media')

  function handleAdd() {
    if (!desc.trim()) return
    onAddIssue({ id: 'iss_' + Date.now(), project_id: projeto.id, tenant_id: 't1', description: desc.trim(), criticality: crit, status: 'aberta', created_at: new Date().toISOString().slice(0, 10), resolved_at: null })
    setDesc('')
    setCrit('media')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Pendências / Bloqueios */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px' }}>
        <div style={{ ...ms.sectionLbl, marginBottom: 10 }}>Registrar pendência</div>
        <textarea style={{ ...ms.inp, height: 64, resize: 'vertical' }} placeholder="Descreva a pendência ou bloqueio..." value={desc} onChange={e => setDesc(e.target.value)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Criticidade:</span>
          {Object.entries(CRITICALITY_CFG).map(([k, cfg]) => (
            <button key={k} onClick={() => setCrit(k)} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', border: crit === k ? `2px solid ${cfg.color}` : '2px solid transparent', background: crit === k ? cfg.bg : 'var(--surface)', color: crit === k ? cfg.text : 'var(--text-muted)' }}>
              {cfg.label}
            </button>
          ))}
          <button style={{ ...ms.btnPrimary, marginLeft: 'auto', padding: '5px 14px', fontSize: 12 }} onClick={handleAdd}>Registrar</button>
        </div>
      </div>

      {abertas.length > 0 && (
        <div>
          <div style={{ ...ms.sectionLbl, marginBottom: 8 }}>Abertas ({abertas.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {abertas.map(iss => (
              <div key={iss.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px', borderLeft: iss.criticality === 'critica' ? '3px solid #EF4444' : iss.criticality === 'alta' ? '3px solid #F59E0B' : '1px solid var(--border)' }}>
                <input type="checkbox" style={{ marginTop: 2, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} onChange={() => onResolveIssue(iss.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>{iss.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <CritBadge criticality={iss.criticality} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(iss.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resolvidas.length > 0 && (
        <div>
          <div style={{ ...ms.sectionLbl, marginBottom: 8 }}>Resolvidas ({resolvidas.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {resolvidas.map(iss => (
              <div key={iss.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: 0.6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px' }}>
                <input type="checkbox" defaultChecked disabled style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', textDecoration: 'line-through', lineHeight: 1.4 }}>{iss.description}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <CritBadge criticality={iss.criticality} />
                    {iss.resolved_at && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Resolvida em {fmtDate(iss.resolved_at)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mine.length === 0 && !opp && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma pendência registrada.</div>
      )}
    </div>
  )
}

// ─── Tab 4: Documentos ────────────────────────────────────────────────────────
function TabDocumentos({ projectId, attachments }) {
  const [dragOver, setDragOver] = useState(false)
  const mine = attachments.filter(a => a.project_id === projectId)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false) }}
        onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.click() }}
        style={{ border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', background: dragOver ? 'var(--accent-glow)' : 'var(--surface2)', transition: 'all 0.15s', cursor: 'pointer' }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Arraste arquivos aqui ou clique para selecionar</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>PDF, Excel, Word, ZIP — Atas, TAP, Homologações</div>
      </div>
      {mine.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ ...ms.sectionLbl, marginBottom: 4 }}>Documentos ({mine.length})</div>
          {mine.map(att => (
            <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{fileIcon(att.mime_type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{fmtSize(att.file_size)}{att.uploaded_by ? ` · ${att.uploaded_by}` : ''} · {fmtDate(att.created_at)}</div>
              </div>
              <button onClick={() => window.open(att.file_url, '_blank')} style={{ ...ms.btn, padding: '4px 10px', fontSize: 11.5, flexShrink: 0 }}>↓</button>
            </div>
          ))}
        </div>
      )}
      {mine.length === 0 && <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum documento anexado.</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDE DRAWER
// ═══════════════════════════════════════════════════════════════════════════════

const DRAWER_TABS = [
  { key: 'projeto',    label: 'Projeto'        },
  { key: 'cronograma', label: 'Cronograma MIT' },
  { key: 'timesheet',  label: 'Timesheet'      },
  { key: 'bloqueios',  label: 'Bloqueios'      },
  { key: 'documentos', label: 'Documentos'     },
]

function ProjetoDrawer({ projeto, phases, timeLogs, issues, attachments, members, blockedIds, onClose, onUpdate, onUpdateOpp, onAdvancePhase, onUpdatePhases, onAddLog, onAddIssue, onResolveIssue, onAddMember, onRemoveMember, onDelete }) {
  const [tab, setTab] = useState('projeto')
  const fase        = FASES_MIT[projeto.current_phase_index - 1] || FASES_MIT[0]
  const isBlocked   = blockedIds.has(projeto.id)
  const pendAbertas = issues.filter(i => i.project_id === projeto.id && i.status === 'aberta').length
  const myTeam      = members.filter(m => m.project_id === projeto.id).length

  const tabsWithBadge = DRAWER_TABS.map(t => ({
    ...t,
    badge: t.key === 'bloqueios' && pendAbertas > 0 ? pendAbertas : t.key === 'projeto' && myTeam > 0 ? `${myTeam}👤` : undefined,
  }))

  return (
    <SlideOver
      open
      onClose={onClose}
      title={projeto.name}
      subtitle={`${projeto.company_nome}${projeto.franchise_nome ? ` · ${projeto.franchise_nome}` : ''}`}
      defaultWidth={680}
      showFooter={false}
      tabs={tabsWithBadge}
      activeTab={tab}
      onTabChange={setTab}
      headerExtra={
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: fase.bg, color: fase.text }}>{fase.label}</span>
            <StatusBadge status={projeto.status} />
            {isBlocked && (
              <div className="prj-blocked-badge" style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: '#EF4444', borderRadius: 20, padding: '2px 8px', letterSpacing: '0.04em' }}>⚠ BLOQUEADO</div>
            )}
          </div>
          <ProgressBar executed={Number(projeto.total_hours_executed)} estimated={Number(projeto.total_hours_estimated)} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{projeto.total_hours_executed}h executadas de {projeto.total_hours_estimated}h estimadas</div>
        </div>
      }
    >
      {/* Conteúdo rolável por tab */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 24px' }}>
        {tab === 'projeto'    && <TabProjeto    projeto={projeto} members={members} onUpdate={onUpdate} onUpdateOpp={onUpdateOpp} onAddMember={onAddMember} onRemoveMember={onRemoveMember} />}
        {tab === 'cronograma' && <TabCronograma projeto={projeto} phases={phases} timeLogs={timeLogs} onAdvancePhase={onAdvancePhase} onUpdatePhases={onUpdatePhases} />}
        {tab === 'timesheet'  && <TabTimesheet  projeto={projeto} phases={phases} timeLogs={timeLogs} onAddLog={onAddLog} />}
        {tab === 'bloqueios'  && <TabBloqueios  projeto={projeto} issues={issues} onAddIssue={onAddIssue} onResolveIssue={onResolveIssue} />}
        {tab === 'documentos' && <TabDocumentos projectId={projeto.id} attachments={attachments} />}
      </div>

      {/* Rodapé com excluir */}
      <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { if (window.confirm(`Excluir o projeto "${projeto.name}"? Esta ação não pode ser desfeita.`)) onDelete(projeto.id) }}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          Excluir projeto
        </button>
      </div>
    </SlideOver>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color }) {
  return (
    <div style={{ flex: 1, padding: '14px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid var(--border)', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ─── Filters popover ──────────────────────────────────────────────────────────
function FiltrosPopover({ open, onClose, filtros, setFiltros, projetos }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])
  if (!open) return null
  const franquias = [...new Set(projetos.map(p => p.franchise_nome).filter(Boolean))]
  function toggle(key, val) { setFiltros(f => ({ ...f, [key]: f[key] === val ? '' : val })) }
  return (
    <div ref={ref} style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', padding: '16px', minWidth: 280 }}>
      <div style={{ ...ms.sectionLbl, marginBottom: 10 }}>Status</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.entries(STATUS_PROJETO).map(([k, v]) => (
          <button key={k} onClick={() => toggle('status', k)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', border: filtros.status === k ? `2px solid ${v.color}` : '2px solid var(--border)', background: filtros.status === k ? v.bg : 'var(--surface2)', color: filtros.status === k ? v.text : 'var(--text-muted)' }}>{v.label}</button>
        ))}
      </div>
      {franquias.length > 0 && (
        <>
          <div style={{ ...ms.sectionLbl, marginBottom: 10 }}>Canal</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {franquias.map(fr => (
              <button key={fr} onClick={() => toggle('franchise', fr)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', border: filtros.franchise === fr ? '2px solid var(--accent)' : '2px solid var(--border)', background: filtros.franchise === fr ? 'var(--accent-glow)' : 'var(--surface2)', color: filtros.franchise === fr ? 'var(--accent)' : 'var(--text-muted)' }}>{fr}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Projetos() {
  const { projetos, phases, timeLogs, issues, members, save: saveProjeto, remove: removeProjeto, savePhase, saveTimeLog, saveIssue, removeIssue, setProjetos, setPhases, setTimeLogs, setIssues, setMembers } = useProjects()
  const [attachments] = useState(MOCK_PROJECT_ATTACHMENTS)
  const [modal,        setModal]       = useState(null)
  const [drawer,       setDrawer]      = useState(null)
  const [filtros,      setFiltros]     = useState({ status: '', franchise: '' })
  const [filtrosOpen,  setFiltrosOpen] = useState(false)
  const [dragId,       setDragId]      = useState(null)
  const [tab,       setTab]       = useLocalState('projetos:tab', 'projetos')
  const [search,    setSearch]    = useLocalState('projetos:search', '')
  const [sortBy,    setSortBy]    = useLocalState('projetos:sortBy', 'recente')
  const [viewMode,  setViewMode]  = useLocalState('projetos:viewMode', 'kanban')
  const [integrationPending, setIntegrationPending] = useState(null)
  const [feedbackSteps, setFeedbackSteps] = useState(null)
  const [criarCSCheckin, setCriarCSCheckin] = useState(true)

  // blocked projects = have any critica+aberta issue
  const blockedIds = useMemo(() => {
    const set = new Set()
    issues.forEach(i => { if (i.criticality === 'critica' && i.status === 'aberta') set.add(i.project_id) })
    return set
  }, [issues])

  // Total executed hours per project from time logs
  const execTotals = useMemo(() => {
    const map = {}
    timeLogs.forEach(l => { map[l.project_id] = (map[l.project_id] || 0) + Number(l.hours_executed) })
    return map
  }, [timeLogs])

  const filtered = useMemo(() => projetos.filter(p => {
    if (filtros.status    && p.status         !== filtros.status)    return false
    if (filtros.franchise && p.franchise_nome !== filtros.franchise) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.company_nome.toLowerCase().includes(q)) return false
    }
    return true
  }), [projetos, filtros, search])

  // KPIs
  const emAndamento = projetos.filter(p => p.status === 'em_andamento').length
  const totalHrsEst = projetos.reduce((s, p) => s + Number(p.total_hours_estimated), 0)
  const totalHrsExe = Object.values(execTotals).reduce((s, v) => s + v, 0)

  // Drag & drop
  function handleDragStart(e, id) { setDragId(id) }
  function handleDragOver(e)      { e.preventDefault() }
  function handleDrop(e, toPhase, toOrder) {
    e.preventDefault()
    if (!dragId) return
    setProjetos(ps => ps.map(p => p.id === dragId ? { ...p, phase: toPhase, current_phase_index: toOrder } : p))
    setDragId(null)
  }

  // CRUD
  async function handleCreate(form) {
    const np = { ...form, id: 'prj_' + Date.now(), tenant_id: 't1', company_id: null, franchise_id: null, created_at: new Date().toISOString().slice(0, 10) }
    const newPhases = PHASE_NAMES.map((name, i) => ({
      id: `ph_${np.id}_${i + 1}`, project_id: np.id, tenant_id: 't1',
      phase_name: name, phase_order: i + 1,
      start_date_planned: '', end_date_planned: '',
      hours_estimated: Math.round(Number(form.total_hours_estimated) / 6) || 20,
      is_completed: false, completed_at: null,
    }))
    await saveProjeto(np)
    await Promise.all(newPhases.map(ph => savePhase(ph)))
    setModal(null)
  }

  async function handleUpdate(updated) {
    const current = projetos.find(p => p.id === updated.id) || {}
    const merged  = {
      ...current,
      ...updated,
      phase:               current.phase               ?? updated.phase,
      current_phase_index: current.current_phase_index ?? updated.current_phase_index,
      total_hours_executed: current.total_hours_executed ?? updated.total_hours_executed,
    }
    // Integração CS: ao finalizar projeto, mostra confirm antes de salvar
    if (merged.status === 'concluido' && current.status !== 'concluido') {
      setCriarCSCheckin(true)
      setIntegrationPending({ merged, current })
      return
    }
    setDrawer(d => d?.id === updated.id ? { ...d, ...merged } : d)
    await saveProjeto(merged)
  }

  async function executarFinalizarProjeto() {
    const { merged } = integrationPending
    setDrawer(d => d?.id === merged.id ? { ...d, ...merged } : d)
    await saveProjeto(merged)
    if (criarCSCheckin) criarCheckinCS(merged)
    setFeedbackSteps([
      { id: 'projeto', label: `Projeto "${merged.name}" finalizado`, sublabel: merged.company_nome },
      criarCSCheckin
        ? { id: 'cs', label: 'Check-in criado em Sucesso do Cliente', sublabel: `Empresa: ${merged.company_nome}` }
        : { id: 'cs', label: 'Check-in CS ignorado', skip: true },
    ])
    setIntegrationPending(null)
  }

  const handleAdvancePhase = useCallback(async (projeto, currentPhase) => {
    const nextIdx = projeto.current_phase_index + 1
    if (nextIdx > 6) return
    const nextFase = FASES_MIT[nextIdx - 1]
    const phaseUpdated = { ...currentPhase, is_completed: true, completed_at: new Date().toISOString() }
    const projetoUpdated = { ...projeto, phase: nextFase.value, current_phase_index: nextIdx, total_hours_executed: Math.round(execTotals[projeto.id] || 0) }
    // atualiza estado local de forma otimista antes de aguardar Supabase
    setProjetos(ps => ps.map(p => p.id === projetoUpdated.id ? { ...p, ...projetoUpdated } : p))
    setDrawer(projetoUpdated)
    await savePhase(phaseUpdated)
    const res = await saveProjeto(projetoUpdated)
    if (res && !res.ok) alert('Erro ao salvar fase: ' + res.message)
  }, [execTotals, savePhase, saveProjeto, setProjetos])

  async function handleDelete(id) {
    await removeProjeto(id)
    setDrawer(null)
  }

  async function handleAddLog(log) {
    await saveTimeLog(log)
    setDrawer(d => d?.id === log.project_id ? { ...d, total_hours_executed: Number(d.total_hours_executed) + Number(log.hours_executed) } : d)
  }

  async function handleAddIssue(iss)    { await saveIssue(iss) }
  async function handleResolveIssue(id) {
    const iss = issues.find(i => i.id === id)
    if (iss) await saveIssue({ ...iss, status: 'resolvida', resolved_at: new Date().toISOString().slice(0, 10) })
  }

  function handleAddMember(m)       { setMembers(prev => [...prev, m]) }
  function handleRemoveMember(id)   { setMembers(prev => prev.filter(m => m.id !== id)) }

  async function handleUpdateOpp(projectId, oppId) {
    setDrawer(d => d?.id === projectId ? { ...d, opportunity_id: oppId } : d)
    const p = projetos.find(p => p.id === projectId)
    if (p) await saveProjeto({ ...p, opportunity_id: oppId })
  }

  const hasFilters   = filtros.status || filtros.franchise || search
  const filterCount  = [filtros.status, filtros.franchise].filter(Boolean).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', gap: 0, overflow: 'hidden' }}>
      <PulseStyle />

      {/* ── Área de scroll (tudo exceto kanban) ── */}
      <div style={{ flexShrink: 0, padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Page header */}
        <div style={pg.pageHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={pg.title}>{tab === 'fechamento' ? 'Fechamento de Horas' : 'Projetos de Implantação'}</h1>
            <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 9, padding: 3, border: '1px solid var(--border)' }}>
              {[{ id: 'projetos', label: 'Projetos' }, { id: 'fechamento', label: '⏱ Fechamento' }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13,
                    fontWeight: tab === t.id ? 700 : 500, fontFamily: 'var(--font)',
                    background: tab === t.id ? 'var(--surface)' : 'none',
                    color: tab === t.id ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {tab === 'projetos' && (
            <Button onClick={() => setModal({ _new: true, phase: 'iniciacao', phaseIndex: 1 })}>+ Novo projeto</Button>
          )}
        </div>

        {/* KPIs */}
        {tab === 'fechamento' && <FechamentoHoras embedded />}

        {tab === 'projetos' && <div style={pg.kpis}>
          <KpiCard label="Total projetos"   value={projetos.length}               color="var(--accent)" />
          <KpiCard label="Em andamento"     value={emAndamento}                   color="#3B82F6" />
          <KpiCard label="Bloqueados"       value={blockedIds.size}               color="#EF4444" />
          <KpiCard label="Horas estimadas"  value={`${totalHrsEst}h`}            color="#10B981" />
          <KpiCard label="Executadas"       value={`${totalHrsExe.toFixed(0)}h`} color="var(--accent)" />
        </div>}

        {/* Toolbar — igual Pipeline */}
        <div style={{ ...pg.toolbar, display: tab === 'fechamento' ? 'none' : undefined }}>

          {/* ── Esquerda ── */}
          <div style={pg.tbLeft}>
            {/* Search */}
            <div style={pg.searchWrap}>
              <span style={pg.searchIcon}>⌕</span>
              <input style={pg.searchInput} placeholder="Buscar projeto ou empresa…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Canal */}
            <select style={pg.select} value={filtros.franchise} onChange={e => setFiltros(f => ({ ...f, franchise: e.target.value }))}>
              <option value="">Todos os canais</option>
              {[...new Set(projetos.map(p => p.franchise_nome).filter(Boolean))].map(fr => (
                <option key={fr} value={fr}>{fr}</option>
              ))}
            </select>

            {/* Status */}
            <select style={pg.select} value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_PROJETO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* ── Separador ── */}
          <div style={pg.tbDivider} />

          {/* ── Direita ── */}
          <div style={pg.tbRight}>

            {/* Filtros avançados — padrão BrowseLayout */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setFiltrosOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  height: 36, padding: '0 10px', borderRadius: 7,
                  border: `1px solid ${filterCount > 0 ? 'var(--accent)' : 'var(--border)'}`,
                  background: filterCount > 0 ? 'var(--accent-lite)' : 'var(--surface)',
                  color: filterCount > 0 ? 'var(--accent)' : 'var(--text-soft)',
                  fontFamily: 'var(--font)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <SlidersHorizontal size={13} />
                Filtros
                {filterCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '0 5px' }}>{filterCount}</span>
                )}
                <ChevronDown size={12} />
              </button>
              <FiltrosPopover open={filtrosOpen} onClose={() => setFiltrosOpen(false)} filtros={filtros} setFiltros={setFiltros} projetos={projetos} />
            </div>

            {/* Sort */}
            <select style={{ ...pg.select, color: 'var(--text-muted)' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="recente">Mais recentes</option>
              <option value="prazo">Prazo mais próximo</option>
              <option value="horas">Mais horas</option>
              <option value="nome">Nome A–Z</option>
            </select>

            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
              {[{ v: 'kanban', Icon: LayoutGrid, title: 'Kanban' }, { v: 'list', Icon: LayoutList, title: 'Lista' }].map(({ v, Icon, title }) => (
                <button key={v} type="button" title={title} onClick={() => setViewMode(v)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: 'none', cursor: 'pointer',
                    background: viewMode === v ? 'var(--accent)' : 'var(--surface)',
                    color: viewMode === v ? '#fff' : 'var(--text-muted)' }}>
                  <Icon size={14} />
                </button>
              ))}
            </div>

            {/* Limpar */}
            {hasFilters && (
              <button onClick={() => { setFiltros({ status: '', franchise: '' }); setSearch('') }} style={pg.ghostBtn}>
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Contagem */}
        <div style={{ ...pg.resultRow, display: tab === 'fechamento' ? 'none' : undefined }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            {filtered.length} projeto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Kanban ou Lista */}
      {tab !== 'fechamento' && viewMode === 'kanban' ? (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '12px 28px 16px' }}>
          <div style={{ display: 'flex', gap: 12, height: '100%' }}>
            {FASES_MIT.map(fase => (
              <KanbanColuna
                key={fase.value}
                fase={fase}
                projetos={filtered.filter(p => p.phase === fase.value)}
                blockedIds={blockedIds}
                execTotals={execTotals}
                onEdit={setDrawer}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onAddProject={(phase, order) => setModal({ _new: true, phase, phaseIndex: order })}
              />
            ))}
          </div>
        </div>
      ) : tab !== 'fechamento' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border2)' }}>
                {['Projeto', 'Fase', 'Status', 'Empresa', 'Canal', 'Horas', 'Início', 'Prazo'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const fase = FASES_MIT.find(f => f.value === p.phase)
                const st   = STATUS_PROJETO[p.status] || {}
                const blocked = blockedIds.has(p.id)
                return (
                  <tr key={p.id} onClick={() => setDrawer(p)}
                    style={{ borderBottom: '1px solid var(--border2)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                      {blocked && <span className="prj-blocked-badge" style={{ fontSize: 9, fontWeight: 700, color: '#EF4444', fontFamily: 'var(--mono)' }}>⚠ BLOQUEADO</span>}
                    </td>
                    <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: fase?.color + '22' || 'var(--surface2)', color: fase?.color || 'var(--text-muted)', fontWeight: 600 }}>{fase?.label || p.phase}</span>
                    </td>
                    <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: st.bg || 'var(--surface2)', color: st.color || 'var(--text-muted)', fontWeight: 600 }}>{st.label || p.status}</span>
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-soft)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.company_nome || '—'}</td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-muted)', fontSize: 12 }}>{p.franchise_nome || '—'}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                      {p.total_hours_estimated ? `${execTotals[p.id] || 0}h / ${p.total_hours_estimated}h` : '—'}
                    </td>
                    <td style={{ padding: '10px 10px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.start_date ? new Date(p.start_date).toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.end_date_estimated ? new Date(p.end_date_estimated).toLocaleDateString('pt-BR') : '—'}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum projeto encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Modal — criar */}
      {modal && (
        <NovoProjetoModal
          defaultPhase={modal.phase}
          defaultPhaseIndex={modal.phaseIndex}
          onSave={handleCreate}
          onClose={() => setModal(null)}
          projetos={projetos}
        />
      )}

      {/* Drawer — detalhe */}
      {drawer && (
        <ProjetoDrawer
          projeto={drawer}
          phases={phases}
          timeLogs={timeLogs}
          issues={issues}
          attachments={attachments}
          members={members}
          blockedIds={blockedIds}
          onClose={() => setDrawer(null)}
          onUpdate={handleUpdate}
          onUpdateOpp={handleUpdateOpp}
          onAdvancePhase={handleAdvancePhase}
          onUpdatePhases={savePhase}
          onAddLog={handleAddLog}
          onAddIssue={handleAddIssue}
          onResolveIssue={handleResolveIssue}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onDelete={handleDelete}
        />
      )}

      {/* ─── Confirm modal: finalizar projeto → CS check-in ─────────────── */}
      {integrationPending && (() => {
        const { merged } = integrationPending
        const chkRow = (on) => ({
          display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:10, cursor:'pointer',
          border:`1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
          background: on ? 'var(--accent-glow)' : 'var(--surface2)', transition:'all 0.15s',
        })
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(10,15,30,0.7)', backdropFilter:'blur(4px)',
            display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:2200 }}>
            <div style={{ background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:460,
              boxShadow:'0 24px 60px rgba(0,0,0,0.28)', overflow:'hidden' }}>
              {/* Header */}
              <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:42, height:42, borderRadius:12, background:'rgba(16,185,129,0.12)', display:'flex',
                  alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🏁</div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Finalizar projeto</div>
                  <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:3 }}>
                    Ao finalizar <strong style={{ color:'var(--text)' }}>{merged.name}</strong>, as seguintes ações serão executadas:
                  </div>
                </div>
              </div>
              {/* Consequences */}
              <div style={{ padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
                {/* Salvar status — sempre */}
                <div style={chkRow(true)}>
                  <div style={{ width:18, height:18, borderRadius:4, background:'var(--accent)',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Marcar projeto como Concluído</div>
                    <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{merged.name} · {merged.company_nome}</div>
                  </div>
                </div>
                {/* Check-in CS — opcional */}
                <div style={chkRow(criarCSCheckin)} onClick={() => setCriarCSCheckin(g => !g)}>
                  <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                    border:`2px solid ${criarCSCheckin ? 'var(--accent)' : 'var(--border)'}`,
                    background: criarCSCheckin ? 'var(--accent)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                    {criarCSCheckin && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Criar check-in em Sucesso do Cliente</div>
                    <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>Registro automático de conclusão para {merged.company_nome}</div>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)',
                display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button onClick={() => setIntegrationPending(null)}
                  style={{ padding:'8px 16px', background:'none', border:'1px solid var(--border)', borderRadius:8,
                    fontSize:13, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)' }}>
                  Cancelar
                </button>
                <button onClick={executarFinalizarProjeto}
                  style={{ padding:'8px 18px', background:'#10B981', color:'#fff', border:'none', borderRadius:8,
                    fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                  Finalizar projeto
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {feedbackSteps && (
        <ActionFeedback
          title="Projeto finalizado com sucesso!"
          steps={feedbackSteps}
          onClose={() => setFeedbackSteps(null)}
          stepDelay={700}
          autoClose={0}
        />
      )}
    </div>
  )
}
