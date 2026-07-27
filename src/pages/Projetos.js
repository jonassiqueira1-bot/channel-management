import React, { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { supabase } from '../lib/supabase'
import { SlidersHorizontal, ChevronDown, ChevronUp, LayoutList, LayoutGrid } from 'lucide-react'
import { useRelatorios } from '../hooks/useRelatorios'
import FechamentoHoras, { FECHAMENTOS_KEY } from './FechamentoHoras'
import {
  FASES_MIT, STATUS_PROJETO, CRITICALITY_CFG, PHASE_NAMES,
  MOCK_PROJECT_ATTACHMENTS, MOCK_OPP_HISTORICO,
} from '../data/mockProjetos'
import { useLocalState } from '../hooks/useLocalState'
import { useProjects } from '../hooks/useProjects'
import { useOpportunities } from '../hooks/useOpportunities'
import SearchSelect from '../components/SearchSelect'
import { useSellers } from '../hooks/useSellers'
import { useUsuarios } from '../hooks/useUsuarios'
import { useProfile } from '../hooks/useProfile'
import Button from '../components/Button'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import PageHeader from '../components/ui/PageHeader'
import EmpresaSearch from '../components/EmpresaSearch'
import { STORAGE_KEY as CS_STORAGE_KEY, MOCK_CUSTOMER_HEALTH } from '../data/mockCustomerSuccess'
import { useProducts } from '../hooks/useProducts'
import { useCompanies } from '../hooks/useCompanies'
import ActionFeedback from '../components/ActionFeedback'
import { useAuditLog } from '../hooks/useAuditLog'
import { useTimeLogs } from '../hooks/useTimeLogs'
import { useCustomerHealth } from '../hooks/useCustomerHealth'
import { usePermissions } from '../hooks/usePermissions'

const CanvasEditor = lazy(() => import('../components/ui/CanvasEditor'))

const ACCENT = 'var(--accent)'

// Navegação entre as 5 funcionalidades do módulo Projetos (PageHeader tabs)
const PROJETOS_TABS = [
  { id: 'projetos',   label: 'Projetos' },
  { id: 'propostas',  label: 'Propostas' },
  { id: 'recursos',   label: 'Recursos' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'fechamento', label: 'Fechamento' },
]

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
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)', marginBottom: 4 },
  sep:        { color: 'var(--border)' },
  title:      { margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '-0.2px' },
  newBtn:     { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  kpis:       { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, paddingBottom: 4 },
  kpi:        { background: 'var(--surface)', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid var(--border2)', boxShadow: 'var(--shadow)' },
  toolbar:    { background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflowX: 'auto' },
  tbLeft:     { display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 auto', minWidth: 0, flexWrap: 'nowrap' },
  tbRight:    { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'nowrap', marginLeft: 'auto' },
  tbDivider:  { width: 1, height: 24, background: 'var(--border)', flexShrink: 0, margin: '0 2px' },
  searchWrap: { position: 'relative', flex: '1 1 160px', minWidth: 120, maxWidth: 260 },
  searchIcon: { position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' },
  searchInput:{ width: '100%', height: 36, padding: '0 10px 0 28px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' },
  select:     { height: 36, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 1, minWidth: 80 },
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
  return <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
}

// ─── Célula de estatística do header do Drawer — dashboard denso, sem caixa
// colorida: label pequeno em cima, valor embaixo, ponto de cor só quando faz
// sentido indicar um estado (status/fase). ──────────────────────────────────
function HeaderStat({ label, value, dotColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
        {dotColor && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
        {value}
      </span>
    </div>
  )
}

function CritBadge({ criticality }) {
  const cfg = CRITICALITY_CFG[criticality] || CRITICALITY_CFG.media
  return <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
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
      onSave={() => { if (form.name.trim() && !dupWarning) onSave(form) }}
      saveLabel="Criar projeto"
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
        {badge && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--surface2)', color: 'var(--text-muted)', borderRadius: 4, padding: '1px 7px' }}>{badge}</span>}
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
function TabProjeto({ projeto, members, onUpdate, onUpdateOpp, onAddMember, onRemoveMember, onFormChange }) {
  const [form, setForm] = useState({ ...projeto })
  const [saved, setSaved] = useState(false)
  const [oppSearch, setOppSearch] = useState('')
  const [showOppPicker, setShowOppPicker] = useState(false)
  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState('Consultor')
  const oppPickerRef = useRef(null)
  const [perfisStore] = useLocalState('settings:perfis_v2', [])
  const { sellers }   = useSellers()
  const todosUsuarios = sellers.length > 0 ? sellers.map(s => ({ id: s.id, nome: s.nome, cargo: s.cargo || s.perfil || '' })) : perfisStore

  const { opps: allOpps } = useOpportunities()

  // Re-sync form when projeto changes externally (e.g., phase advanced in Cronograma)
  useEffect(() => { setForm(prev => ({ ...prev, phase: projeto.phase, current_phase_index: projeto.current_phase_index, status: projeto.status })) }, [projeto.phase, projeto.current_phase_index, projeto.status])
  // Notifica ProjetoDrawer sobre mudanças no form para o botão Salvar do rodapé
  useEffect(() => { if (onFormChange) onFormChange(form) }, [form]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const myMembers = members.filter(m => m.project_id === projeto.id)
  const linkedOpp = allOpps.find(o => String(o.id) === String(form.opportunity_id))
  const oppDetail = null // dados históricos não disponíveis via API real

  const filteredOpps = oppSearch.trim()
    ? allOpps.filter(o =>
        (o.titulo||'').toLowerCase().includes(oppSearch.toLowerCase()) ||
        (o.empresa_nome||'').toLowerCase().includes(oppSearch.toLowerCase())
      )
    : allOpps

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
    if (!memberUserId) return
    const u = todosUsuarios.find(p => p.id === memberUserId)
    if (!u) return
    if (myMembers.some(m => m.user_id === memberUserId)) return
    onAddMember({ id: 'mb_' + Date.now(), project_id: projeto.id, tenant_id: 't1', user_id: memberUserId, name: u.nome, role: memberRole })
    setMemberUserId('')
    setMemberRole('Consultor')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Informações Gerais ── */}
      <NotionSection title="Informações Gerais" icon="📋" defaultOpen={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormGrid cols={1}>
            <FormField label="Nome do projeto">
              <input className="so-field" value={form.name} onChange={set('name')} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Empresa cliente">
              {projeto.id && form.company_id ? (
                <div className="so-field" style={{ background:'var(--surface2)', color:'var(--text)', cursor:'default', display:'flex', alignItems:'center' }}>
                  {form.company_nome || form.company_id}
                </div>
              ) : (
                <EmpresaSearch
                  value={form.company_nome || ''}
                  label={form.company_nome || ''}
                  onChange={({ nome, id }) => setForm(f => ({ ...f, company_nome: nome, company_id: id }))}
                  placeholder="Buscar empresa cliente…"
                />
              )}
            </FormField>
            <FormField label="Canal / Franquia">
              <input className="so-field" value={form.franchise_nome || ''} onChange={set('franchise_nome')} placeholder="Canal SP Sul" />
            </FormField>
            <FormField label="Status">
              <select className="so-field" value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_PROJETO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
            <FormField label="Fase MIT">
              <select className="so-field" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value, current_phase_index: FASES_MIT.find(x => x.value === e.target.value)?.order || 1 }))}>
                {FASES_MIT.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </FormField>
          </FormGrid>
        </div>
      </NotionSection>

      {/* ── Planejamento ── */}
      <NotionSection title="Planejamento" icon="🗓" defaultOpen={true}>
        <FormGrid cols={3}>
          <FormField label="Início">
            <input className="so-field" type="date" value={form.start_date || ''} onChange={set('start_date')} />
          </FormField>
          <FormField label="Previsão término">
            <input className="so-field" type="date" value={form.end_date_estimated || ''} onChange={set('end_date_estimated')} />
          </FormField>
          <FormField label="Horas estimadas">
            <input className="so-field" type="number" value={form.total_hours_estimated} onChange={set('total_hours_estimated')} />
          </FormField>
        </FormGrid>
      </NotionSection>

      {/* ── Observações ── */}
      <NotionSection title="Observações" icon="📝" defaultOpen={true}>
        <FormGrid cols={1}>
          <FormField label="Observações">
            <textarea className="so-field" style={{ height: 72, resize: 'vertical' }} value={form.notes || ''} onChange={set('notes')} />
          </FormField>
        </FormGrid>
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
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opp.empresa_nome}</div>
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
              <select style={{ ...ms.inp, fontSize: 12 }} value={memberUserId} onChange={e => setMemberUserId(e.target.value)}>
                <option value="">— Selecionar usuário —</option>
                {todosUsuarios
                  .filter(u => u.status !== 'inativo' && !myMembers.some(m => m.user_id === u.id))
                  .map(u => <option key={u.id} value={u.id}>{u.nome}{u.cargo ? ` — ${u.cargo}` : ''}</option>)}
              </select>
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

// ─── Tab: Proposta de Implantação ────────────────────────────────────────────
function TabProposta({ projeto, onUpdate }) {
  const [propostas, setPropostas] = useLocalState(PROPOSTAS_KEY, [])

  const propostaVinculada = useMemo(() => {
    if (!propostas.length) return null
    const ranking = { aceita: 0, enviada: 1, rascunho: 2, recusada: 3 }
    return propostas
      .filter(p =>
        (projeto.proposta_id && String(p.id) === String(projeto.proposta_id)) ||
        (projeto.opportunity_id && String(p.opp_id) === String(projeto.opportunity_id))
      )
      .sort((a, b) => (ranking[a.status] ?? 9) - (ranking[b.status] ?? 9))[0] || null
  }, [propostas, projeto.proposta_id, projeto.opportunity_id])

  function vincular(p) {
    onUpdate({ ...projeto, proposta_id: p.id })
  }
  function desvincular() {
    onUpdate({ ...projeto, proposta_id: null })
  }

  const STATUS_LABEL = { rascunho:'Rascunho', enviada:'Enviada', aceita:'Aceita', recusada:'Recusada' }
  const STATUS_COLOR = { rascunho:'var(--text-muted)', enviada:'var(--blue-text)', aceita:'var(--green-text)', recusada:'#DC2626' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Proposta vinculada */}
      {propostaVinculada ? (
        <div style={{ border:'1px solid var(--accent)', borderRadius:10, padding:'14px 16px', background:'var(--accent-glow)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Proposta vinculada</span>
            <button onClick={desvincular} style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', padding:0 }}>Desvincular</button>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:4 }}>{propostaVinculada.titulo || '(sem título)'}</div>
          {propostaVinculada.empresa_nome && <div style={{ fontSize:12, color:'var(--text-soft)' }}>{propostaVinculada.empresa_nome}</div>}
          <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:600, color: STATUS_COLOR[propostaVinculada.status] || 'var(--text-muted)' }}>
              {STATUS_LABEL[propostaVinculada.status] || propostaVinculada.status}
            </span>
            {(propostaVinculada.itens||[]).filter(i=>i.nivel===1).length > 0 && (
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                {(propostaVinculada.itens||[]).filter(i=>i.nivel===1).length} fase{(propostaVinculada.itens||[]).filter(i=>i.nivel===1).length > 1 ? 's' : ''} MIT
              </span>
            )}
            {propostaVinculada.total_horas > 0 && (
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{propostaVinculada.total_horas}h estimadas</span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ border:'1px dashed var(--border)', borderRadius:10, padding:'14px 16px', background:'var(--surface2)', textAlign:'center' }}>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>Nenhuma proposta de implantação vinculada</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>Vincule uma proposta abaixo para habilitar a sincronização com o Cronograma MIT</div>
        </div>
      )}

      {/* Vincular manualmente — dropdown com pesquisa */}
      <PropostaSelectField
        propostas={propostas}
        value={propostaVinculada?.id || null}
        onChange={id => {
          if (!id) desvincular()
          else { const p = propostas.find(x => String(x.id) === String(id)); if (p) vincular(p) }
        }}
        statusLabel={STATUS_LABEL}
        statusColor={STATUS_COLOR}
      />
    </div>
  )
}

// ─── Tab 1: Cronograma MIT ────────────────────────────────────────────────────
function TabCronograma({ projeto, phases, tasks, timeLogs, onAdvancePhase, onUpdatePhases, onSyncTasks, onAddMember }) {
  const [showImport, setShowImport] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState(false)
  const syncTimer = useRef(null)
  const [propostas]   = useLocalState(PROPOSTAS_KEY, [])
  const myPhases = phases.filter(p => p.project_id === projeto.id).sort((a, b) => a.phase_order - b.phase_order)

  // proposta vinculada: por opp_id ou por proposta_id direto no projeto
  const propostaVinculada = useMemo(() => {
    const ranking = { aceita: 0, enviada: 1, rascunho: 2, recusada: 3 }
    const candidates = propostas.filter(p =>
      (projeto.proposta_id && String(p.id) === String(projeto.proposta_id)) ||
      (projeto.opportunity_id && String(p.opp_id) === String(projeto.opportunity_id))
    )
    return candidates.sort((a, b) => (ranking[a.status] ?? 9) - (ranking[b.status] ?? 9))[0] || null
  }, [propostas, projeto.opportunity_id, projeto.proposta_id])

  // helper: monta tasks de nivel 2 para um conjunto de fases
  function buildTasks(allItens, fases) {
    const result = []
    fases.forEach((fase, i) => {
      const phId   = `ph_${projeto.id}_${i + 1}`
      const filhos = allItens.filter(f => f.nivel === 2 && f.parent_id === fase.id)
      filhos.forEach((f, j) => {
        result.push({
          id:              `task_${projeto.id}_${i + 1}_${j + 1}`,
          project_id:      projeto.id,
          phase_id:        phId,
          proposta_item_id: f.id || null,
          task_name:       f.titulo || f.descricao || `Atividade ${j + 1}`,
          tipo_hora:       f.tipo_hora || '',
          hr_analista:     Number(f.hr_analista) || 0,
          hr_coord:        Number(f.hr_coord)     || 0,
          task_order:      j + 1,
          is_completed:    false,
          completed_at:    null,
        })
      })
    })
    return result
  }

  // auto-sincronizar fases quando o projeto ainda não tem fases mas tem proposta
  useEffect(() => {
    if (myPhases.length === 0 && propostaVinculada) {
      const allItens = propostaVinculada.itens || []
      const fases = allItens.filter(i => i.nivel === 1)
      if (!fases.length) return
      const updated = fases.map((fase, i) => {
        const filhos = allItens.filter(f => f.nivel === 2 && f.parent_id === fase.id)
        const horas  = filhos.reduce((s, f) => s + (Number(f.hr_analista)||0) + (Number(f.hr_coord)||0), 0)
        return {
          id:                 `ph_${projeto.id}_${i + 1}`,
          project_id:         projeto.id,
          tenant_id:          't1',
          phase_name:         fase.titulo,
          phase_order:        i + 1,
          start_date_planned: '',
          end_date_planned:   '',
          hours_estimated:    Math.round(horas) || 0,
          is_completed:       false,
          completed_at:       null,
        }
      })
      onUpdatePhases(updated)
      if (onSyncTasks) onSyncTasks(buildTasks(allItens, fases))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projeto.id])

  function handleSyncFromProposta() {
    if (!propostaVinculada) return
    const allItens = propostaVinculada.itens || []
    const fases = allItens.filter(i => i.nivel === 1)
    if (fases.length === 0) { alert('A proposta não tem escopo WBS definido.'); return }
    const updated = fases.map((fase, i) => {
      const existing = myPhases[i]
      const filhos   = allItens.filter(f => f.nivel === 2 && f.parent_id === fase.id)
      const horas    = filhos.reduce((s, f) => s + (Number(f.hr_analista)||0) + (Number(f.hr_coord)||0), 0)
      return {
        id:                  existing?.id || `ph_${projeto.id}_${i + 1}`,
        project_id:          projeto.id,
        tenant_id:           't1',
        phase_name:          fase.titulo,
        phase_order:         i + 1,
        start_date_planned:  existing?.start_date_planned || '',
        end_date_planned:    existing?.end_date_planned   || '',
        hours_estimated:     Math.round(horas) || 0,
        is_completed:        existing?.is_completed || false,
        completed_at:        existing?.completed_at || null,
      }
    })
    onUpdatePhases(updated)
    if (onSyncTasks) onSyncTasks(buildTasks(allItens, fases))
    // equipe da proposta → adicionar membros ausentes
    if (onAddMember) {
      const equipe = propostaVinculada.equipe || []
      equipe.forEach(m => {
        onAddMember({ id: 'mb_' + Date.now() + Math.random().toString(36).slice(2), project_id: projeto.id, tenant_id: 't1', user_id: m.user_id || null, name: m.nome || m.name || '', role: m.papel || m.role || 'Consultor' })
      })
    }
    setSyncFeedback(true)
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => setSyncFeedback(false), 2500)
  }
  const currentIdx = projeto.current_phase_index
  const myTasks    = (tasks || []).filter(t => t.project_id === projeto.id)
  const [expandedPhases, setExpandedPhases] = useState({})

  const execByPhase = useMemo(() => {
    const map = {}
    timeLogs.filter(l => l.project_id === projeto.id).forEach(l => {
      map[l.phase_id] = (map[l.phase_id] || 0) + Number(l.hours_executed)
    })
    return map
  }, [timeLogs, projeto.id])

  const execByTask = useMemo(() => {
    const map = {}
    timeLogs.filter(l => l.project_id === projeto.id && l.task_id).forEach(l => {
      map[l.task_id] = (map[l.task_id] || 0) + Number(l.hours_executed)
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

      {/* ── Cabeçalho com botões ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          onClick={propostaVinculada ? handleSyncFromProposta : undefined}
          disabled={!propostaVinculada}
          title={propostaVinculada ? 'Sincronizar fases com o escopo da proposta' : 'Vincule uma proposta para habilitar'}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 8, border: 'none', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700,
            transition: 'background 0.2s',
            cursor: propostaVinculada ? 'pointer' : 'not-allowed',
            background: syncFeedback ? '#10B981' : propostaVinculada ? 'var(--accent)' : 'var(--surface3)',
            color: propostaVinculada ? '#fff' : 'var(--text-muted)',
            opacity: propostaVinculada ? 1 : 0.6 }}>
          {syncFeedback ? '✓ Sincronizado' : '⟳ Sincronizar com Proposta'}
        </button>
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

          const phaseTasks = myTasks.filter(t => t.phase_id === ph.id).sort((a, b) => a.task_order - b.task_order)
          const isExpanded = expandedPhases[ph.id]

          return (
            <div key={ph.id} style={{ borderBottom: i < myPhases.length - 1 ? '1px solid var(--border2)' : 'none' }}>
              {/* Linha da fase */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr',
                background: isActive ? `${fase.color}08` : 'transparent', transition: 'background 0.2s' }}>

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
                  {phaseTasks.length > 0 && (
                    <button onClick={() => setExpandedPhases(p => ({ ...p, [ph.id]: !p[ph.id] }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>
                      {isExpanded ? '▲' : '▼'} {phaseTasks.length}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 10, color: exe > 0 && !isActive && !isDone ? '#F59E0B' : 'var(--text-muted)', paddingLeft: 14 }}>
                  {isDone
                    ? `✓ Concluída${exe > 0 ? ` · ${exe.toFixed(1)}h` : ''}`
                    : isActive
                      ? `${pct}% · ${exe.toFixed(1)}h${est ? ` / ${est}h` : ''}`
                      : exe > 0
                        ? `${exe.toFixed(1)}h exec.${est ? ` / ${est}h est.` : ''}`
                        : est ? `${est}h est.` : '—'}
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
            </div>{/* fim linha da fase */}

              {/* Tarefas expansíveis */}
              {isExpanded && phaseTasks.length > 0 && (
                <div style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border2)' }}>
                  {phaseTasks.map(task => {
                    const texe = execByTask[task.id] || 0
                    const test = (task.hr_analista || 0) + (task.hr_coord || 0)
                    const tpct = test > 0 ? Math.min(100, Math.round((texe / test) * 100)) : 0
                    return (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 16px 7px 32px', borderBottom: '1px solid var(--border2)',
                        fontSize: 11 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>◦</span>
                        <span style={{ flex: 1, color: 'var(--text)', fontWeight: 500 }}>{task.task_name}</span>
                        {task.tipo_hora && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface)',
                            border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>
                            {task.tipo_hora}
                          </span>
                        )}
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10,
                          color: texe > 0 ? (tpct >= 100 ? '#EF4444' : '#10B981') : 'var(--text-muted)',
                          minWidth: 80, textAlign: 'right' }}>
                          {texe > 0 ? `${texe.toFixed(1)}h` : '—'}{test > 0 ? ` / ${test}h` : ''}
                          {tpct > 0 ? ` (${tpct}%)` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
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
function TabTimesheet({ projeto, phases, tasks, timeLogs, members, onAddLog, onRemoveLog }) {
  const rawPhases  = phases.filter(p => p.project_id === projeto.id).sort((a, b) => a.phase_order - b.phase_order)
  // Se não há fases sincronizadas ainda, gera as 6 fases MIT automaticamente
  const myPhases   = rawPhases.length > 0 ? rawPhases : FASES_MIT.map((f, i) => ({
    id: `ph_${projeto.id}_${i + 1}`, project_id: projeto.id,
    phase_order: i + 1, phase_name: f.label, is_completed: i + 1 < projeto.current_phase_index,
  }))
  const myTasks    = (tasks || []).filter(t => t.project_id === projeto.id).sort((a, b) => a.task_order - b.task_order)
  const myLogs     = timeLogs.filter(l => l.project_id === projeto.id).sort((a, b) => b.logged_at.localeCompare(a.logged_at))
  const currentPhId = `ph_${projeto.id}_${projeto.current_phase_index}`

  const myMembers = (members || []).filter(m => m.project_id === projeto.id)

  const { sellers } = useSellers()
  const { profile } = useProfile()
  const todosUsuarios = sellers.length > 0
    ? sellers.map(s => ({ id: s.id, nome: s.nome, cargo: s.cargo || s.perfil || '' }))
    : profile?.id ? [{ id: profile.id, nome: profile.nome || profile.email || 'Eu', cargo: profile.papel || '' }] : []
  const usuarios = myMembers.length > 0
    ? myMembers.map(m => ({ id: m.user_id || m.id, nome: m.name, cargo: m.role, avatar: m.name?.[0] }))
    : todosUsuarios

  // Pre-seleciona o usuário logado se só houver um
  const defaultUserId   = usuarios.length === 1 ? usuarios[0].id   : null
  const defaultUserName = usuarios.length === 1 ? usuarios[0].nome  : ''

  const [form, setForm] = useState({
    phase_id: currentPhId,
    task_id: '',
    hours_executed: '',
    logged_at: new Date().toISOString().slice(0, 10),
    description: '',
    user_id: defaultUserId,
    user_name: defaultUserName,
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Tarefas disponíveis para a fase selecionada
  const tasksForPhase = myTasks.filter(t => t.phase_id === form.phase_id)

  function handleSubmit() {
    if (!form.hours_executed || !form.description.trim()) return
    const selectedTask = myTasks.find(t => t.id === form.task_id)
    const phase_id = selectedTask ? selectedTask.phase_id : form.phase_id
    onAddLog({
      id: 'tl_' + Date.now(),
      project_id: projeto.id,
      phase_id,
      task_id: form.task_id || null,
      tenant_id: 't1',
      user_id: form.user_id || defaultUserId,
      user_name: form.user_name || defaultUserName || 'Não informado',
      hours_executed: Number(form.hours_executed),
      description: form.description.trim(),
      logged_at: form.logged_at,
    })
    setForm(f => ({ ...f, hours_executed: '', description: '', user_id: null, user_name: '' }))
  }

  const totalExe = myLogs.reduce((s, l) => s + Number(l.hours_executed), 0)

  // Agrupar logs por fase para o resumo
  const horasPorFase = myPhases.map(ph => ({
    ph,
    fase: FASES_MIT[ph.phase_order - 1],
    horas: myLogs.filter(l => l.phase_id === ph.id).reduce((s, l) => s + Number(l.hours_executed), 0),
  })).filter(x => x.horas > 0)

  const canSubmit = form.hours_executed && form.description.trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs rápidos */}
      {myLogs.length > 0 && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Executado</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{totalExe % 1 === 0 ? totalExe : totalExe.toFixed(1)}<span style={{ fontSize: 11, fontWeight: 500, marginLeft: 3, color: 'var(--text-muted)' }}>h</span></div>
          </div>
          <div style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Apontamentos</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{myLogs.length}</div>
          </div>
          {horasPorFase.length > 1 && (
            <div style={{ flex: 2, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Por fase</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {horasPorFase.map(({ ph, fase, horas }) => (
                  <span key={ph.id} style={{ fontSize: 10, fontWeight: 600, background: fase?.bg || 'var(--surface)', color: fase?.text || 'var(--text)', borderRadius: 20, padding: '2px 8px' }}>
                    {ph.phase_name} {horas % 1 === 0 ? horas : horas.toFixed(1)}h
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form de lançamento */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lançar horas</span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Linha 1: Fase + Atividade + Usuário + Horas + Data */}
          <div style={{ display: 'grid', gridTemplateColumns: tasksForPhase.length > 0 ? '1.4fr 1.8fr 1.6fr 0.7fr 1fr' : '1.6fr 1.8fr 0.8fr 1.1fr', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ ...ms.lbl, marginBottom: 5 }}>Fase</label>
              <select style={ms.inp} value={form.phase_id}
                onChange={e => setForm(f => ({ ...f, phase_id: e.target.value, task_id: '' }))}>
                {myPhases.map(p => (
                  <option key={p.id} value={p.id}>{p.phase_order}. {p.phase_name}</option>
                ))}
              </select>
            </div>
            {tasksForPhase.length > 0 && (
              <div>
                <label style={{ ...ms.lbl, marginBottom: 5 }}>Atividade</label>
                <select style={ms.inp} value={form.task_id} onChange={set('task_id')}>
                  <option value="">— Geral —</option>
                  {tasksForPhase.map(t => (
                    <option key={t.id} value={t.id}>{t.task_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label style={{ ...ms.lbl, marginBottom: 5 }}>Consultor</label>
              <SearchSelect
                options={usuarios.map(u => ({ id: u.id, label: u.nome, sublabel: u.cargo || u.perfil, avatar: u.avatar || (u.nome?.[0] || '?'), color: 'var(--accent)' }))}
                value={form.user_id}
                onChange={(id, nome) => setForm(f => ({ ...f, user_id: id, user_name: nome }))}
                placeholder="Pesquisar…"
                inputStyle={ms.inp}
              />
            </div>
            <div>
              <label style={{ ...ms.lbl, marginBottom: 5 }}>Horas</label>
              <input style={{ ...ms.inp, textAlign: 'center' }} type="number" step="0.5" min="0.5" value={form.hours_executed} onChange={set('hours_executed')} placeholder="0" />
            </div>
            <div>
              <label style={{ ...ms.lbl, marginBottom: 5 }}>Data</label>
              <input style={ms.inp} type="date" value={form.logged_at} onChange={set('logged_at')} />
            </div>
          </div>
          {/* Linha 2: Descrição + botão */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...ms.lbl, marginBottom: 5 }}>Descrição do que foi realizado <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea
                style={{ ...ms.inp, height: 60, resize: 'none', lineHeight: 1.5 }}
                placeholder="Ex: Reunião de mapeamento de processos AS-IS com o cliente…"
                value={form.description}
                onChange={set('description')}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                height: 60, padding: '0 20px', borderRadius: 8, border: 'none',
                background: canSubmit ? 'var(--accent)' : 'var(--border)',
                color: canSubmit ? '#fff' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              + Registrar
            </button>
          </div>
        </div>
      </div>

      {/* Histórico */}
      {myLogs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Histórico — {myLogs.length} {myLogs.length === 1 ? 'apontamento' : 'apontamentos'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myLogs.map(log => {
              const ph   = myPhases.find(p => p.id === log.phase_id)
              const fase = ph ? FASES_MIT[ph.phase_order - 1] : null
              const task = log.task_id ? myTasks.find(t => t.id === log.task_id) : null
              const initials = (log.user_name || '??').slice(0, 2).toUpperCase()
              const hrs = Number(log.hours_executed)
              return (
                <div key={log.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {/* Horas badge */}
                  <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, background: 'var(--accent-lite, #EDE9FE)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{hrs % 1 === 0 ? hrs : hrs.toFixed(1)}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>horas</span>
                  </div>
                  {/* Conteúdo */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.45, marginBottom: 6 }}>{log.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {fase && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: fase.bg, color: fase.text, borderRadius: 20, padding: '2px 8px' }}>
                          {ph.phase_name}
                        </span>
                      )}
                      {task && (
                        <span style={{ fontSize: 10, color: 'var(--text-soft)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>
                          {task.task_name}
                        </span>
                      )}
                      {log.user_name && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#EDE9FE', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, fontFamily: 'var(--mono)', flexShrink: 0 }}>
                            {initials}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.user_name}</span>
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{fmtDate(log.logged_at)}</span>
                    </div>
                  </div>
                  {/* Excluir */}
                  {onRemoveLog && (
                    <button
                      onClick={() => { if (window.confirm('Excluir este apontamento?')) onRemoveLog(log.id) }}
                      title="Excluir"
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '2px 6px', borderRadius: 5, alignSelf: 'center', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {myLogs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏱</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nenhum apontamento registrado</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Use o formulário acima para registrar horas neste projeto.</div>
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>Criticidade:</label>
          <select value={crit} onChange={e => setCrit(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', cursor: 'pointer', outline: 'none' }}>
            {Object.entries(CRITICALITY_CFG).map(([k, cfg]) => (
              <option key={k} value={k}>{cfg.label}</option>
            ))}
          </select>
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

// ─── Tab Financeiro ───────────────────────────────────────────────────────────
const CUSTO_HORA_KEY   = 'projects:custo_hora_v1'    // { [project_id]: number }
const MILESTONES_KEY   = 'projects:milestones_v1'    // { [project_id]: Milestone[] }
const MOCK_OPP_DETAILS = {
  'opp-1': { valor_total:48900, valor_servico:23500 },
  'opp-5': { valor_total:112000, valor_servico:50000 },
  'opp-6': { valor_total:185000, valor_servico:80000 },
}

function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(v || 0)
}

function TabFinanceiro({ projeto, timeLogs, onUpdate }) {
  const myLogs = timeLogs.filter(l => l.project_id === projeto.id)

  // Custo/hora por projeto — salvo em localStorage
  const [custoHoraMap, setCustoHoraMap] = useLocalState(CUSTO_HORA_KEY, {})
  const [milestonesMap, setMilestonesMap] = useLocalState(MILESTONES_KEY, {})
  const [fechamentos] = useLocalState(FECHAMENTOS_KEY, [])

  const custoHora = custoHoraMap[projeto.id] ?? 150
  const milestones = milestonesMap[projeto.id] || []

  function setCustoHora(v) { setCustoHoraMap(m => ({ ...m, [projeto.id]: Number(v) })) }
  function setMilestones(fn) {
    setMilestonesMap(m => ({ ...m, [projeto.id]: typeof fn === 'function' ? fn(m[projeto.id] || []) : fn }))
  }

  // IDs de logs aprovados (via Fechamento de Horas)
  const approvedLogIds = useMemo(() => {
    const ids = new Set()
    fechamentos.filter(f => f.status === 'aprovado').forEach(f => f.log_ids?.forEach(id => ids.add(id)))
    return ids
  }, [fechamentos])

  const myLogsAprovados = myLogs.filter(l => approvedLogIds.has(l.id))
  const myLogsPendentes = myLogs.filter(l => !approvedLogIds.has(l.id))

  // Valor do contrato: vem da opp vinculada ou campo manual no projeto
  const oppDetail = MOCK_OPP_DETAILS[projeto.opportunity_id] || null
  const valorContrato = projeto.valor_contrato || oppDetail?.valor_total || 0
  const valorServico  = projeto.valor_servico  || oppDetail?.valor_servico || 0

  // Custo realizado = só horas aprovadas no Fechamento
  const totalHorasAprov = myLogsAprovados.reduce((s, l) => s + Number(l.hours_executed), 0)
  const totalHorasExe   = myLogs.reduce((s, l) => s + Number(l.hours_executed), 0)
  const custoRealizado  = totalHorasAprov * custoHora

  // Receita faturada (milestones pagos)
  const receitaFaturada = milestones.filter(m => m.pago).reduce((s, m) => s + Number(m.valor), 0)

  // Margem
  const margemBruta = receitaFaturada - custoRealizado
  const margemPct   = receitaFaturada > 0 ? (margemBruta / receitaFaturada) * 100 : 0

  // Forecast: custo estimado ao fim (horas_est × custo_hora)
  const custoForecast = Number(projeto.total_hours_estimated || 0) * custoHora
  const margemForecast = valorContrato - custoForecast

  // Sincroniza campos financeiros em custom_fields do projeto no Supabase
  useEffect(() => {
    if (!projeto?.id) return
    supabase.from('projects').select('custom_fields').eq('id', projeto.id).single()
      .then(({ data }) => {
        const cf = data?.custom_fields || {}
        supabase.from('projects').update({
          custom_fields: {
            ...cf,
            fin_custo_hora:       custoHora,
            fin_valor_contrato:   valorContrato,
            fin_custo_realizado:  custoRealizado,
            fin_receita_faturada: receitaFaturada,
            fin_margem_bruta:     margemBruta,
            fin_margem_pct:       Math.round(margemPct * 100) / 100,
            fin_custo_forecast:   custoForecast,
            fin_margem_forecast:  margemForecast,
            fin_horas_aprovadas:  Math.round(totalHorasAprov * 100) / 100,
            fin_horas_executadas: Math.round(totalHorasExe * 100) / 100,
            fin_atualizado_em:    new Date().toISOString(),
          }
        }).eq('id', projeto.id)
      })
  }, [projeto.id, custoHora, valorContrato, custoRealizado, receitaFaturada, margemBruta, custoForecast, margemForecast, totalHorasAprov, totalHorasExe])

  // Custo por analista
  const porAnalista = useMemo(() => {
    const map = {}
    myLogsAprovados.forEach(l => {
      const name = l.user_name || 'Sem nome'
      map[name] = (map[name] || 0) + Number(l.hours_executed)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [myLogsAprovados])

  // Burndown mensal — baseado em horas aprovadas
  const burndown = useMemo(() => {
    const byMonth = {}
    myLogsAprovados.forEach(l => {
      const mes = l.logged_at?.slice(0, 7) || 'N/A'
      byMonth[mes] = (byMonth[mes] || 0) + Number(l.hours_executed)
    })
    const sorted = Object.entries(byMonth).sort()
    let acc = 0
    return sorted.map(([mes, h]) => { acc += h * custoHora; return { mes, custo: acc } })
  }, [myLogsAprovados, custoHora])

  // Milestone form
  const [msForm, setMsForm] = useState(null) // null | { descricao, valor, data_prevista }

  function addMilestone() {
    if (!msForm?.descricao || !msForm?.valor) return
    setMilestones(prev => [...prev, { id: 'ms_' + Date.now(), pago: false, data_pagamento: null, ...msForm }])
    setMsForm(null)
  }
  function togglePago(id) {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, pago: !m.pago, data_pagamento: !m.pago ? new Date().toISOString().slice(0, 10) : null } : m))
  }
  function removeMilestone(id) { setMilestones(prev => prev.filter(m => m.id !== id)) }

  // Valor contrato manual
  const [editContrato, setEditContrato] = useState(false)
  const [contratoInput, setContratoInput] = useState(String(valorContrato))

  const kpis = [
    { label: 'Valor do contrato',   value: fmtBRL(valorContrato),   color: 'var(--accent)', hint: null },
    { label: 'Custo realizado',     value: fmtBRL(custoRealizado),  color: '#3B82F6',       hint: `${totalHorasAprov.toFixed(0)}h aprovadas × R$ ${custoHora}/h` },
    { label: 'Receita faturada',    value: fmtBRL(receitaFaturada), color: '#10B981',       hint: `${milestones.filter(m=>m.pago).length} milestone(s) pago(s)` },
    { label: 'Margem bruta',        value: fmtBRL(margemBruta),     color: margemBruta >= 0 ? '#10B981' : '#EF4444', hint: `${margemPct.toFixed(0)}%` },
  ]

  const barMax = burndown.length > 0 ? burndown[burndown.length - 1].custo : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ padding: '14px 16px', background: 'var(--surface2)',
            borderRadius: 10, border: '1px solid var(--border2)', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--mono)', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{k.label}</div>
            {k.hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{k.hint}</div>}
          </div>
        ))}
      </div>

      {/* Aviso de horas pendentes */}
      {myLogsPendentes.length > 0 && (
        <div style={{ padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D',
          borderRadius: 8, fontSize: 12, color: '#92400E', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span>
            <strong>{myLogsPendentes.length} apontamento(s)</strong> ({myLogsPendentes.reduce((s,l)=>s+Number(l.hours_executed),0).toFixed(0)}h) ainda não aprovados no Fechamento de Horas — não estão no custo realizado.
          </span>
        </div>
      )}

      {/* Forecast */}
      <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Projeção ao encerramento</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Custo estimado (forecast)', value: fmtBRL(custoForecast), color: '#F59E0B' },
            { label: 'Margem prevista',           value: fmtBRL(margemForecast), color: margemForecast >= 0 ? '#10B981' : '#EF4444' },
            { label: 'Horas estimadas',           value: `${projeto.total_hours_estimated || 0}h`, color: 'var(--text-muted)' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--mono)', color: f.color }}>{f.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuração */}
      <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Configuração financeira</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Custo/hora (R$)</div>
            <input type="number" value={custoHora} onChange={e => setCustoHora(e.target.value)} min={0}
              style={{ ...ms.inp, width: 100, fontFamily: 'var(--mono)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Valor do contrato (R$)</div>
            {editContrato ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" value={contratoInput} onChange={e => setContratoInput(e.target.value)}
                  style={{ ...ms.inp, width: 140, fontFamily: 'var(--mono)' }} />
                <button onClick={() => { onUpdate({ ...projeto, valor_contrato: Number(contratoInput) }); setEditContrato(false) }}
                  style={{ ...ms.btnPrimary, padding: '6px 12px', fontSize: 12 }}>OK</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{fmtBRL(valorContrato)}</span>
                <button onClick={() => { setContratoInput(String(valorContrato)); setEditContrato(true) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font)' }}>editar</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custo por analista */}
      {porAnalista.length > 0 && (
        <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Custo por analista</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {porAnalista.map(([name, horas]) => {
              const custo = horas * custoHora
              const pct = totalHorasExe > 0 ? (horas / totalHorasExe) * 100 : 0
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>{name}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                      {horas.toFixed(0)}h · {fmtBRL(custo)}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--surface)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Burndown financeiro */}
      {burndown.length > 0 && (
        <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Burndown financeiro — custo acumulado</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {burndown.map((b, i) => {
              const h = Math.round((b.custo / barMax) * 70)
              return (
                <div key={b.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{fmtBRL(b.custo)}</div>
                  <div style={{ width: '100%', height: h, background: i === burndown.length - 1 ? 'var(--accent)' : '#3B82F666',
                    borderRadius: '3px 3px 0 0', minHeight: 4 }} />
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden',
                    maxWidth: '100%', textOverflow: 'ellipsis' }}>{b.mes.slice(5)}/{b.mes.slice(2, 4)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Milestones de faturamento */}
      <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Milestones de faturamento</div>
          <button onClick={() => setMsForm({ descricao: '', valor: '', data_prevista: '' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)',
              fontFamily: 'var(--font)', fontWeight: 700 }}>+ Adicionar</button>
        </div>

        {msForm && (
          <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px', marginBottom: 12,
            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Descrição do milestone" value={msForm.descricao}
              onChange={e => setMsForm(f => ({ ...f, descricao: e.target.value }))}
              style={{ ...ms.inp, fontSize: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" placeholder="Valor (R$)" value={msForm.valor}
                onChange={e => setMsForm(f => ({ ...f, valor: e.target.value }))}
                style={{ ...ms.inp, flex: 1, fontSize: 12, fontFamily: 'var(--mono)' }} />
              <input type="date" value={msForm.data_prevista}
                onChange={e => setMsForm(f => ({ ...f, data_prevista: e.target.value }))}
                style={{ ...ms.inp, flex: 1, fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setMsForm(null)}
                style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Cancelar
              </button>
              <button onClick={addMilestone} style={{ ...ms.btnPrimary, padding: '5px 14px', fontSize: 12 }}>Salvar</button>
            </div>
          </div>
        )}

        {milestones.length === 0 && !msForm && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum milestone cadastrado</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {milestones.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', background: 'var(--surface)', borderRadius: 8,
              border: `1px solid ${m.pago ? '#10B98133' : 'var(--border2)'}` }}>
              <button onClick={() => togglePago(m.id)}
                style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                  background: m.pago ? '#10B981' : 'var(--surface2)',
                  border: `2px solid ${m.pago ? '#10B981' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>
                {m.pago ? '✓' : ''}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)',
                  textDecoration: m.pago ? 'line-through' : 'none', opacity: m.pago ? 0.6 : 1 }}>
                  {m.descricao}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                  {m.data_prevista ? `Previsto: ${m.data_prevista}` : ''}
                  {m.data_pagamento ? ` · Pago em: ${m.data_pagamento}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)',
                color: m.pago ? '#10B981' : 'var(--text)', flexShrink: 0 }}>
                {fmtBRL(m.valor)}
              </div>
              <button onClick={() => removeMilestone(m.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  fontSize: 14, padding: '2px 4px', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDE DRAWER
// ═══════════════════════════════════════════════════════════════════════════════

const DRAWER_TABS = [
  { key: 'projeto',    label: 'Projeto'        },
  { key: 'cronograma', label: 'Cronograma MIT' },
  { key: 'proposta',   label: 'Proposta'       },
  { key: 'timesheet',  label: 'Timesheet'      },
  { key: 'financeiro', label: 'Financeiro'     },
  { key: 'bloqueios',  label: 'Bloqueios'      },
  { key: 'documentos', label: 'Documentos'     },
]

function ProjetoDrawer({ projeto, phases, tasks, timeLogs, issues, attachments, members, blockedIds, onClose, onUpdate, onUpdateOpp, onAdvancePhase, onUpdatePhases, onSyncTasks, onAddLog, onRemoveLog, onAddIssue, onResolveIssue, onAddMember, onRemoveMember, onDelete }) {
  const [pendingForm, setPendingForm] = useState(null)
  const [saved, setSaved]             = useState(false)

  function handleSaveFooter() {
    const toSave = pendingForm || projeto
    onUpdate(toSave)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
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
      tabs={tabsWithBadge}
      activeTab={tab}
      onTabChange={setTab}
      onSave={handleSaveFooter}
      saveLabel={saved ? '✓ Salvo' : 'Salvar'}
      onDelete={() => onDelete(projeto.id)}
      deleteConfirm={`Excluir o projeto "${projeto.name}"? Esta ação não pode ser desfeita.`}
      headerExtra={(() => {
        const statusCfg = STATUS_PROJETO[projeto.status] || STATUS_PROJETO.em_andamento
        const exec = Number(projeto.total_hours_executed) || 0
        const est  = Number(projeto.total_hours_estimated) || 0
        const pct  = est > 0 ? Math.min(100, Math.round((exec / est) * 100)) : 0
        return (
          <div style={{ marginTop: 8 }}>
            {/* Linha única de indicadores — dashboard denso, sem caixas coloridas */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '9px 22px', marginBottom: 9 }}>
              <HeaderStat label="Status"    value={statusCfg.label} dotColor={statusCfg.text} />
              <HeaderStat label="Fase"      value={fase.label}      dotColor={fase.text} />
              <HeaderStat label="Progresso" value={`${pct}%`} />
              <HeaderStat label="Horas"     value={`${exec}h de ${est}h`} />
              <HeaderStat label="Início"    value={fmtDate(projeto.start_date)} />
              <HeaderStat label="Previsão"  value={fmtDate(projeto.end_date_estimated)} />
              {isBlocked && (
                <span className="prj-blocked-badge" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: '#EF4444', letterSpacing: '0.03em', alignSelf: 'flex-end' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} /> BLOQUEADO
                </span>
              )}
            </div>
            <ProgressBar executed={exec} estimated={est} thin />
          </div>
        )
      })()}
    >
      {/* Conteúdo rolável por tab */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 24px' }}>
        {tab === 'projeto'    && <TabProjeto    projeto={projeto} members={members} onUpdate={onUpdate} onUpdateOpp={onUpdateOpp} onAddMember={onAddMember} onRemoveMember={onRemoveMember} onFormChange={setPendingForm} />}
        {tab === 'cronograma' && <TabCronograma projeto={projeto} phases={phases} tasks={tasks} timeLogs={timeLogs} onAdvancePhase={onAdvancePhase} onUpdatePhases={onUpdatePhases} onSyncTasks={onSyncTasks} onAddMember={onAddMember} />}
        {tab === 'proposta'   && <TabProposta   projeto={projeto} onUpdate={onUpdate} />}
        {tab === 'timesheet'  && <TabTimesheet  projeto={projeto} phases={phases} tasks={tasks} timeLogs={timeLogs} members={members} onAddLog={onAddLog} onRemoveLog={onRemoveLog} />}
        {tab === 'financeiro' && <TabFinanceiro projeto={projeto} timeLogs={timeLogs} onUpdate={onUpdate} />}
        {tab === 'bloqueios'  && <TabBloqueios  projeto={projeto} issues={issues} onAddIssue={onAddIssue} onResolveIssue={onResolveIssue} />}
        {tab === 'documentos' && <TabDocumentos projectId={projeto.id} attachments={attachments} />}
      </div>

    </SlideOver>
  )
}

// ─── Painel Financeiro Global ─────────────────────────────────────────────────
function PainelFinanceiro({ projetos, timeLogs, showKpis = true }) {
  const [custoHoraMap] = useLocalState(CUSTO_HORA_KEY, {})
  const [milestonesMap] = useLocalState(MILESTONES_KEY, {})
  const [fechamentos] = useLocalState(FECHAMENTOS_KEY, [])

  const approvedLogIds = useMemo(() => {
    const ids = new Set()
    fechamentos.filter(f => f.status === 'aprovado').forEach(f => f.log_ids?.forEach(id => ids.add(id)))
    return ids
  }, [fechamentos])

  const rows = useMemo(() => projetos.map(prj => {
    const custoHora  = custoHoraMap[prj.id] ?? 150
    const logsProj   = timeLogs.filter(l => l.project_id === prj.id)
    const horasExe   = logsProj.reduce((s, l) => s + Number(l.hours_executed), 0)
    const horasAprov = logsProj.filter(l => approvedLogIds.has(l.id)).reduce((s, l) => s + Number(l.hours_executed), 0)
    const custo      = horasAprov * custoHora
    const milestones = milestonesMap[prj.id] || []
    const faturado   = milestones.filter(m => m.pago).reduce((s, m) => s + Number(m.valor), 0)
    const contrato   = prj.valor_contrato || MOCK_OPP_DETAILS[prj.opportunity_id]?.valor_total || 0
    const margem     = faturado - custo
    const margemPct  = faturado > 0 ? (margem / faturado) * 100 : null
    const faseObj    = FASES_MIT.find(f => f.value === prj.phase) || FASES_MIT[0]
    const pendentes  = horasExe - horasAprov
    return { prj, custo, faturado, contrato, margem, margemPct, horasExe, horasAprov, pendentes, faseObj, custoHora }
  }), [projetos, timeLogs, custoHoraMap, milestonesMap])

  const totalContrato = rows.reduce((s, r) => s + r.contrato, 0)
  const totalCusto    = rows.reduce((s, r) => s + r.custo, 0)
  const totalFaturado = rows.reduce((s, r) => s + r.faturado, 0)
  const totalMargem   = totalFaturado - totalCusto

  const [sortCol, setSortCol] = useState('contrato')
  const sorted = [...rows].sort((a, b) => b[sortCol] - a[sortCol])

  function Th({ col, label }) {
    return (
      <th onClick={() => setSortCol(col)} style={{ textAlign: 'right', padding: '8px 12px',
        fontSize: 11, fontWeight: 700, color: sortCol === col ? 'var(--accent)' : 'var(--text-muted)',
        fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em',
        cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
        {label}{sortCol === col ? ' ↓' : ''}
      </th>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>

      {/* KPIs globais */}
      {showKpis && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0,
        border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
        {[
          { label: 'Portfólio (contratos)', value: fmtBRL(totalContrato), color: 'var(--accent)' },
          { label: 'Custo realizado',       value: fmtBRL(totalCusto),    color: '#3B82F6' },
          { label: 'Receita faturada',      value: fmtBRL(totalFaturado), color: '#10B981' },
          { label: 'Margem total',          value: fmtBRL(totalMargem),   color: totalMargem >= 0 ? '#10B981' : '#EF4444' },
        ].map((k, i) => (
          <div key={k.label} style={{ padding: '14px 20px', borderRight: i < 3 ? '1px solid var(--border2)' : 'none',
            borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>}

      {/* Toolbar */}
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 8, minHeight: 52 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ordenar por:</span>
        {[['contrato','Contrato'],['custo','Custo real.'],['faturado','Faturado'],['margem','Margem']].map(([col, label]) => (
          <button key={col} onClick={() => setSortCol(col)}
            style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${sortCol === col ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)', fontWeight: sortCol === col ? 700 : 500,
              background: sortCol === col ? 'var(--accent-lite)' : 'var(--surface2)', color: sortCol === col ? 'var(--accent)' : 'var(--text-muted)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border2)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                Projeto
              </th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fase
              </th>
              <Th col="contrato"  label="Contrato" />
              <Th col="custo"     label="Custo real." />
              <Th col="faturado"  label="Faturado" />
              <Th col="margem"    label="Margem" />
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% Mg</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.prj.id} style={{ borderBottom: '1px solid var(--border2)',
                background: i % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.prj.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{r.prj.company_nome}</div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: r.faseObj.bg, color: r.faseObj.text }}>{r.faseObj.label}</span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>
                  {r.contrato > 0 ? fmtBRL(r.contrato) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: '#3B82F6' }}>
                  {fmtBRL(r.custo)}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.horasAprov.toFixed(0)}h aprov. × R${r.custoHora}</div>
                  {r.pendentes > 0 && <div style={{ fontSize: 10, color: '#F59E0B' }}>{r.pendentes.toFixed(0)}h pendentes</div>}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: '#10B981' }}>
                  {r.faturado > 0 ? fmtBRL(r.faturado) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12,
                  fontWeight: 700, color: r.margem >= 0 ? '#10B981' : '#EF4444' }}>
                  {r.faturado > 0 ? fmtBRL(r.margem) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700,
                  color: r.margemPct == null ? 'var(--text-muted)' : r.margemPct >= 30 ? '#10B981' : r.margemPct >= 0 ? '#F59E0B' : '#EF4444' }}>
                  {r.margemPct != null ? `${r.margemPct.toFixed(0)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        * Custo realizado = horas apontadas no Timesheet × custo/hora configurado em cada projeto (padrão: R$ 150/h). Configure em Projeto → Financeiro.
      </div>
    </div>
  )
}

// ─── Mapa de Recursos ────────────────────────────────────────────────────────
// Capacidade padrão: 160h/mês (8h × 20 dias úteis)
const CAPACIDADE_MENSAL = 160

function MapaRecursos({ projetos, members, timeLogs, showKpis = true }) {
  const [expandido, setExpandido] = useState({})
  const [mesRef, setMesRef] = useState(() => new Date().toISOString().slice(0, 7)) // 'YYYY-MM'
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const { profile } = useProfile()
  const { usuarios } = useUsuarios()

  // Pool de usuários: apenas usuários com papel "projetos" (ou admin_isv que têm acesso total)
  const usuariosCad = useMemo(() => {
    const PAPEIS_PROJETO = ['projetos', 'admin_isv']
    const ativos = usuarios.filter(u => u.status !== 'inativo' && PAPEIS_PROJETO.includes(u.papel))
    if (ativos.length > 0) return ativos.map(u => ({ id: u.id, nome: u.nome || u.email || u.id, cargo: u.papel || '', horas_semana: u.horas_semana || 40 }))
    // fallback: pelo menos o usuário logado se ele tiver o papel certo
    if (profile?.id && PAPEIS_PROJETO.includes(profile.papel)) return [{ id: profile.id, nome: profile.nome || profile.email || 'Usuário', cargo: profile.papel || '', horas_semana: profile.horas_semana || 40 }]
    return []
  }, [usuarios, profile])

  // Horas apontadas por user_id (ou user_name como fallback) no mês de referência
  const horasPorUser = useMemo(() => {
    const [ano, mes] = mesRef.split('-').map(Number)
    const map = {} // user_id → { total, porProjeto }
    timeLogs.forEach(l => {
      const d = new Date(l.logged_at)
      if (d.getFullYear() !== ano || d.getMonth() + 1 !== mes) return
      const key = l.user_id || l.user_name || 'sem_id'
      if (!map[key]) map[key] = { total: 0, porProjeto: {} }
      map[key].total += Number(l.hours_executed)
      if (!map[key].porProjeto[l.project_id]) {
        const prj = projetos.find(p => p.id === l.project_id)
        map[key].porProjeto[l.project_id] = { nome: prj?.name || l.project_id, horas: 0, fase: prj?.phase || '' }
      }
      map[key].porProjeto[l.project_id].horas += Number(l.hours_executed)
    })
    return map
  }, [timeLogs, mesRef, projetos])

  // Pool de analistas: apenas usuários cadastrados com papel "projetos" ou "admin_isv"
  const analistas = useMemo(() =>
    usuariosCad
      .map(u => ({ id: u.id, name: u.nome, cargo: u.cargo || '', senioridade: u.senioridade || '', horas_semana: u.horas_semana || 40, habilidades: u.habilidades || [] }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  [usuariosCad])

  // Projetos ativos por analista (via members.user_id)
  const projetosPorAnalista = useMemo(() => {
    const map = {}
    members.forEach(m => {
      if (m.role === 'Chave do Cliente') return
      const prj = projetos.find(p => p.id === m.project_id)
      if (!prj || prj.status === 'concluido') return
      const key = String(m.user_id || m.name)
      if (!map[key]) map[key] = []
      map[key].push({ ...prj, role: m.role })
    })
    return map
  }, [members, projetos])

  function horasDoUser(u) { return horasPorUser[String(u.id)]?.total || 0 }
  function capacidade(u) { return (u.horas_semana || 40) * 4.33 } // semanas/mês

  function statusCarga(horas, cap) {
    const pct = (horas / (cap || CAPACIDADE_MENSAL)) * 100
    if (pct >= 95) return { label: 'Sobrecarregado', color: '#EF4444', bg: '#FEE2E2', pct }
    if (pct >= 70) return { label: 'Ocupado',         color: '#F59E0B', bg: '#FEF3C7', pct }
    if (pct >= 20) return { label: 'Alocado',         color: '#3B82F6', bg: '#DBEAFE', pct }
    return           { label: 'Disponível',            color: '#10B981', bg: '#D1FAE5', pct }
  }

  function initials(name) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  }

  const listaFiltrada = analistas.filter(u => {
    const horas = horasDoUser(u)
    const st = statusCarga(horas, capacidade(u))
    if (filtroStatus === 'sobrecarregado') return st.pct >= 95
    if (filtroStatus === 'ocupado')        return st.pct >= 70 && st.pct < 95
    if (filtroStatus === 'disponivel')     return st.pct < 70
    return true
  })

  // KPIs do mapa
  const totalAnalistas = analistas.length
  const sobrecarregados = analistas.filter(u => statusCarga(horasDoUser(u), capacidade(u)).pct >= 95).length
  const disponiveis     = analistas.filter(u => statusCarga(horasDoUser(u), capacidade(u)).pct < 70).length
  const totalHoras      = analistas.reduce((s, u) => s + horasDoUser(u), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 0 24px' }}>

      {/* KPIs */}
      {showKpis && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0,
        border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden',
        background: 'var(--surface)' }}>
        {[
          { label: 'Analistas',      value: totalAnalistas,                            color: 'var(--accent)' },
          { label: 'Sobrecarregados',value: sobrecarregados,                           color: '#EF4444' },
          { label: 'Disponíveis',    value: disponiveis,                               color: '#10B981' },
          { label: 'Horas no mês',   value: `${totalHoras.toFixed(0)}h`,              color: '#3B82F6' },
        ].map((k, i) => (
          <div key={k.label} style={{ padding: '14px 20px', borderRight: i < 3 ? '1px solid var(--border2)' : 'none',
            borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>}

      {/* Filtros */}
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minHeight: 52 }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
          {[{ id: 'todos', label: 'Todos' }, { id: 'sobrecarregado', label: 'Sobrecarregados' },
            { id: 'ocupado', label: 'Ocupados' }, { id: 'disponivel', label: 'Disponíveis' }].map(f => (
            <button key={f.id} onClick={() => setFiltroStatus(f.id)}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                fontFamily: 'var(--font)', fontWeight: filtroStatus === f.id ? 700 : 500,
                background: filtroStatus === f.id ? 'var(--surface)' : 'none',
                color: filtroStatus === f.id ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: filtroStatus === f.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mês de referência:</span>
          <input type="month" value={mesRef} onChange={e => setMesRef(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)' }} />
        </div>
      </div>

      {/* Tabela de analistas */}
      <div style={{ border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px 200px 1fr 100px 100px 90px',
          padding: '10px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border2)',
          gap: 12, alignItems: 'center' }}>
          <div />
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Analista</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Capacidade utilizada ({mesRef})</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>Horas</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>Projetos</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>Status</div>
        </div>

        {listaFiltrada.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhum analista encontrado para o filtro selecionado
          </div>
        )}

        {listaFiltrada.map((u) => {
          const horas = horasDoUser(u)
          const cap   = capacidade(u)
          const prjsHora   = horasPorUser[String(u.id)]?.porProjeto || {}
          const prjsAtivos = projetosPorAnalista[String(u.id)] || []
          const st = statusCarga(horas, cap)
          const isExpanded = expandido[u.id]
          const numPrjs = prjsAtivos.length || Object.keys(prjsHora).length

          return (
            <div key={u.id}>
              <div onClick={() => setExpandido(e => ({ ...e, [u.id]: !e[u.id] }))}
                style={{ display: 'grid', gridTemplateColumns: '36px 200px 1fr 100px 100px 90px',
                  padding: '12px 16px', gap: 12, alignItems: 'center', cursor: 'pointer',
                  borderBottom: '1px solid var(--border2)',
                  background: isExpanded ? 'var(--surface2)' : 'transparent',
                  transition: 'background 0.15s' }}>

                {/* Avatar */}
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: `${st.color}22`, border: `2px solid ${st.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: st.color }}>
                  {initials(u.name)}
                </div>

                {/* Nome + cargo */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {u.cargo || prjsAtivos[0]?.role || 'Recurso'}
                    {u.senioridade ? ` · ${u.senioridade}` : ''}
                  </div>
                </div>

                {/* Barra de capacidade */}
                <div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)',
                    border: '1px solid var(--border2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, st.pct)}%`,
                      background: st.color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                    {Math.round(st.pct)}% de {cap.toFixed(0)}h
                  </div>
                </div>

                {/* Horas */}
                <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700,
                  fontFamily: 'var(--mono)', color: st.color }}>
                  {horas.toFixed(0)}h
                </div>

                {/* Qtd projetos */}
                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  {numPrjs} {numPrjs === 1 ? 'projeto' : 'projetos'}
                </div>

                {/* Badge status */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
              </div>

              {/* Detalhe expandido */}
              {isExpanded && (
                <div style={{ padding: '12px 16px 12px 64px', background: 'var(--surface2)',
                  borderBottom: '1px solid var(--border2)', display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {/* Projetos ativos (via members) */}
                  {prjsAtivos.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: 6 }}>Projetos ativos</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {prjsAtivos.map(prj => {
                          const horasPrj = prjsHora[prj.id]?.horas || 0
                          const fase = FASES_MIT.find(f => f.value === prj.phase) || FASES_MIT[0]
                          return (
                            <div key={prj.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 12px', background: 'var(--surface)', borderRadius: 8,
                              border: '1px solid var(--border2)' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: fase.color, flexShrink: 0 }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{prj.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                  {prj.role} · Fase: {fase.label}
                                </div>
                              </div>
                              {horasPrj > 0 && (
                                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)',
                                  fontWeight: 600, flexShrink: 0 }}>
                                  {horasPrj.toFixed(0)}h no mês
                                </div>
                              )}
                              {prj.status === 'suspenso' && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: '#FEF3C7', color: '#92400E',
                                  borderRadius: 20, padding: '1px 7px', flexShrink: 0 }}>Suspenso</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Horas apontadas no mês (se não está em members mas tem timesheet) */}
                  {prjsAtivos.length === 0 && Object.keys(prjsHora).length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: 6 }}>Horas apontadas em {mesRef}</div>
                      {Object.values(prjsHora).map(p => (
                        <div key={p.nome} style={{ display: 'flex', justifyContent: 'space-between',
                          fontSize: 12, color: 'var(--text-muted)', padding: '4px 0',
                          borderBottom: '1px solid var(--border2)' }}>
                          <span>{p.nome}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{p.horas.toFixed(0)}h</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {u.habilidades?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {u.habilidades.map(h => (
                        <span key={h} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                          background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)',
                          border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>{h}</span>
                      ))}
                    </div>
                  )}

                  {prjsAtivos.length === 0 && Object.keys(prjsHora).length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Sem projetos ativos nem apontamentos neste mês
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { color: '#10B981', label: 'Disponível (< 70% da capacidade individual)' },
          { color: '#3B82F6', label: 'Alocado (20–70%)' },
          { color: '#F59E0B', label: 'Ocupado (70–95%)' },
          { color: '#EF4444', label: 'Sobrecarregado (≥ 95%)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, last = false }) {
  return (
    <div style={{ flex: 1, padding: '14px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      borderRight: last ? 'none' : '1px solid var(--border2)', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1, fontFamily: 'var(--mono)' }}>{value}</div>
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
// PROPOSTAS DE IMPLANTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
const PROPOSTAS_KEY      = 'projects:propostas_v1'
const PROP_TEMPLATES_KEY = 'projects:prop_templates_v1'
const PROP_ESTILO_KEY    = 'projects:prop_estilo_v1'

const DEFAULT_ESTILO = {
  logo_url:       '',
  cor_primaria:   '#6366F1',
  header_titulo:  'PROPOSTA DE IMPLANTAÇÃO',
  header_sub:     '',
  footer_texto:   'Documento confidencial · {{empresa_nome}} · {{ano}}',
}

const DEFAULT_TARIFAS = [
  { id:'tr1', papel:'analista',    label:'Analista',     valor_hora: 0 },
  { id:'tr2', papel:'coordenacao', label:'Coordenador',  valor_hora: 0 },
  { id:'tr3', papel:'especialista',label:'Especialista', valor_hora: 0 },
]

const VARIAVEIS_CFG = [
  { campo:'num_funcionarios', label:'Número de funcionários',    tipo:'number' },
  { campo:'num_filiais',      label:'Número de filiais/unidades',tipo:'number' },
  { campo:'num_usuarios',     label:'Usuários do sistema',       tipo:'number' },
  { campo:'tem_integracao',   label:'Possui integração',         tipo:'bool'   },
  { campo:'tem_migracao',     label:'Possui migração de dados',  tipo:'bool'   },
]

const REGRA_CAMPOS = VARIAVEIS_CFG.map(v => ({ value: v.campo, label: v.label, tipo: v.tipo }))

const REGRA_OPERADORES = {
  number: [{ v:'>',label:'maior que'},{v:'>=',label:'maior ou igual'},{v:'<',label:'menor que'},{v:'<=',label:'menor ou igual'},{v:'=',label:'igual a'}],
  bool:   [{ v:'sim',label:'sim (ativo)'},{v:'nao',label:'não (inativo)'}],
}

const ACAO_TIPOS = [
  { v:'acrescentar_pct',  label:'Acrescentar %'     },
  { v:'reduzir_pct',      label:'Reduzir %'          },
  { v:'acrescentar_horas',label:'Acrescentar horas'  },
  { v:'reduzir_horas',    label:'Reduzir horas'      },
]

const CAMPO_HORA_OPTS = [
  { v:'ambas',    label:'Analista + Coord.' },
  { v:'analista', label:'Analista'          },
  { v:'coord',    label:'Coordenador'       },
]

// ─── Rules engine ──────────────────────────────────────────────────────────────
function evaluateRules(regras, variaveis, itens, operadorRegras = 'OU') {
  let result = itens.map(i => ({ ...i }))
  const ativas = (regras || []).filter(r => r.ativo !== false)
  if (operadorRegras === 'E' && ativas.length > 0) {
    const todasMatch = ativas.every(regra => {
      const { campo, operador, valor } = regra.condicao || {}
      const v = variaveis[campo]
      let match = false
      if (operador === '>')   match = Number(v) > Number(valor)
      if (operador === '>=')  match = Number(v) >= Number(valor)
      if (operador === '<')   match = Number(v) < Number(valor)
      if (operador === '<=')  match = Number(v) <= Number(valor)
      if (operador === '=')   match = String(v) === String(valor)
      if (operador === 'sim') match = v === true || v === 'sim'
      if (operador === 'nao') match = v === false || v === 'nao'
      return match
    })
    if (!todasMatch) return result
  }
  ativas.forEach(regra => {
    const { campo, operador, valor } = regra.condicao || {}
    const v = variaveis[campo]
    let match = false
    if (operador === '>')   match = Number(v) > Number(valor)
    if (operador === '>=')  match = Number(v) >= Number(valor)
    if (operador === '<')   match = Number(v) < Number(valor)
    if (operador === '<=')  match = Number(v) <= Number(valor)
    if (operador === '=')   match = String(v) === String(valor)
    if (operador === 'sim') match = v === true || v === 'sim'
    if (operador === 'nao') match = v === false || v === 'nao'
    if (!match) return

    const { fase_id, tipo, quantidade, campo_hora } = regra.acao || {}
    const sign = tipo?.includes('acrescentar') ? 1 : -1
    const isPct = tipo?.includes('pct')

    result = result.map(item => {
      if (item.nivel !== 2) return item
      if (item.id !== fase_id && item.parent_id !== fase_id) return item
      const n = { ...item }
      function adj(h) {
        if (!h) return h
        const delta = isPct ? h * (quantidade / 100) : quantidade
        return Math.max(0, h + sign * delta)
      }
      if (campo_hora === 'analista' || campo_hora === 'ambas') n.hr_analista = adj(n.hr_analista)
      if (campo_hora === 'coord'    || campo_hora === 'ambas') n.hr_coord    = adj(n.hr_coord)
      return n
    })
  })
  return result
}

// Returns which rules matched given variáveis
function evalRulesLog(regras, variaveis) {
  return (regras || []).filter(r => r.ativo !== false).filter(regra => {
    const { campo, operador, valor } = regra.condicao || {}
    const v = variaveis[campo]
    if (operador === '>')   return Number(v) > Number(valor)
    if (operador === '>=')  return Number(v) >= Number(valor)
    if (operador === '<')   return Number(v) < Number(valor)
    if (operador === '<=')  return Number(v) <= Number(valor)
    if (operador === '=')   return String(v) === String(valor)
    if (operador === 'sim') return v === true || v === 'sim'
    if (operador === 'nao') return v === false || v === 'nao'
    return false
  })
}

// Investment calculation
function calcInvestimento(itens, tarifas) {
  const tm = {}; (tarifas || []).forEach(t => { tm[t.papel] = Number(t.valor_hora || 0) })
  return (itens || []).filter(i => i.nivel === 2).reduce((total, item) => {
    const hA = Number(item.hr_analista || 0); const hC = Number(item.hr_coord || 0)
    if (item.tipo_hora === 'analista')    return total + hA * (tm.analista || 0)
    if (item.tipo_hora === 'coordenacao') return total + hC * (tm.coordenacao || 0)
    if (item.tipo_hora === 'ana_coord')   return total + hA * (tm.analista || 0) + hC * (tm.coordenacao || 0)
    if (item.tipo_hora === 'especialista')return total + hA * (tm.especialista || 0)
    return total
  }, 0)
}

function fmtBRL2(v) {
  return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 }).format(v || 0)
}

// ─── WBS helpers ──────────────────────────────────────────────────────────────
const TIPO_HORA_CFG = {
  analista:    { label: 'Analista',     short: 'Analista'    },
  coordenacao: { label: 'Coordenação',  short: 'Coord.'      },
  ana_coord:   { label: 'Ana./Coord.',  short: 'Ana./Coord.' },
  especialista:{ label: 'Especialista', short: 'Espec.'      },
}

function itemUid() { return `wi-${Date.now()}-${Math.random().toString(36).slice(2,6)}` }

// HH:MM display for decimal hours
function decToHHMM(h) {
  if (h === null || h === undefined || h === '') return ''
  const n = Number(h); if (isNaN(n)) return ''
  const hh = Math.floor(n); const mm = Math.round((n - hh) * 60)
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
}
function hhmmToDec(s) {
  if (!s) return null
  const parts = String(s).split(':')
  if (parts.length === 2) return Number(parts[0]) + Number(parts[1]) / 60
  return Number(s) || null
}

// Flat array with { id, nivel, parent_id, ordem, titulo, tipo_hora, hr_analista, hr_coord, obrigatorio, mostrar }
// Level 1 = fase, Level 2 = atividade
const DEFAULT_TEMPLATE_ITENS = [
  { id:'di1',  nivel:1, parent_id:null, ordem:1, titulo:'Iniciação e Planejamento',           tipo_hora:null,          hr_analista:null, hr_coord:null, obrigatorio:true,  mostrar:true  },
  { id:'di2',  nivel:2, parent_id:'di1',ordem:1, titulo:'Kickoff e apresentação ao cliente',  tipo_hora:'ana_coord',   hr_analista:1,    hr_coord:1,    obrigatorio:true,  mostrar:true  },
  { id:'di3',  nivel:2, parent_id:'di1',ordem:2, titulo:'Levantamento inicial de requisitos', tipo_hora:'ana_coord',   hr_analista:4,    hr_coord:2,    obrigatorio:true,  mostrar:true  },
  { id:'di4',  nivel:2, parent_id:'di1',ordem:3, titulo:'Elaboração do TAP',                  tipo_hora:'coordenacao', hr_analista:null, hr_coord:3,    obrigatorio:true,  mostrar:true  },
  { id:'di5',  nivel:1, parent_id:null, ordem:2, titulo:'Modelagem de Processos',              tipo_hora:null,          hr_analista:null, hr_coord:null, obrigatorio:true,  mostrar:true  },
  { id:'di6',  nivel:2, parent_id:'di5',ordem:1, titulo:'Mapeamento AS-IS',                   tipo_hora:'coordenacao', hr_analista:null, hr_coord:8,    obrigatorio:true,  mostrar:true  },
  { id:'di7',  nivel:2, parent_id:'di5',ordem:2, titulo:'Desenho TO-BE',                      tipo_hora:'ana_coord',   hr_analista:6,    hr_coord:4,    obrigatorio:true,  mostrar:true  },
  { id:'di8',  nivel:2, parent_id:'di5',ordem:3, titulo:'Validação com usuários-chave',       tipo_hora:'coordenacao', hr_analista:null, hr_coord:4,    obrigatorio:true,  mostrar:true  },
  { id:'di9',  nivel:1, parent_id:null, ordem:3, titulo:'Configuração e Parametrização',      tipo_hora:null,          hr_analista:null, hr_coord:null, obrigatorio:true,  mostrar:true  },
  { id:'di10', nivel:2, parent_id:'di9',ordem:1, titulo:'Setup do ambiente e configurações',  tipo_hora:'analista',    hr_analista:16,   hr_coord:null, obrigatorio:true,  mostrar:true  },
  { id:'di11', nivel:2, parent_id:'di9',ordem:2, titulo:'Parametrização conforme TO-BE',      tipo_hora:'analista',    hr_analista:24,   hr_coord:null, obrigatorio:true,  mostrar:true  },
  { id:'di12', nivel:2, parent_id:'di9',ordem:3, titulo:'Integração com sistemas legados',    tipo_hora:'especialista',hr_analista:16,   hr_coord:null, obrigatorio:false, mostrar:true  },
  { id:'di13', nivel:1, parent_id:null, ordem:4, titulo:'Testes e Homologação',               tipo_hora:null,          hr_analista:null, hr_coord:null, obrigatorio:true,  mostrar:true  },
  { id:'di14', nivel:2, parent_id:'di13',ordem:1,titulo:'Testes unitários por módulo',        tipo_hora:'analista',    hr_analista:8,    hr_coord:null, obrigatorio:true,  mostrar:true  },
  { id:'di15', nivel:2, parent_id:'di13',ordem:2,titulo:'Testes integrados com usuários',     tipo_hora:'ana_coord',   hr_analista:8,    hr_coord:4,    obrigatorio:true,  mostrar:true  },
  { id:'di16', nivel:2, parent_id:'di13',ordem:3,titulo:'Correções e ajustes pós-teste',      tipo_hora:'analista',    hr_analista:8,    hr_coord:null, obrigatorio:true,  mostrar:false },
  { id:'di17', nivel:1, parent_id:null, ordem:5, titulo:'Treinamento',                        tipo_hora:null,          hr_analista:null, hr_coord:null, obrigatorio:true,  mostrar:true  },
  { id:'di18', nivel:2, parent_id:'di17',ordem:1,titulo:'Capacitação de usuários finais',     tipo_hora:'ana_coord',   hr_analista:8,    hr_coord:4,    obrigatorio:true,  mostrar:true  },
  { id:'di19', nivel:2, parent_id:'di17',ordem:2,titulo:'Material didático e manuais',        tipo_hora:'analista',    hr_analista:4,    hr_coord:null, obrigatorio:false, mostrar:true  },
  { id:'di20', nivel:1, parent_id:null, ordem:6, titulo:'Go-live e Encerramento',             tipo_hora:null,          hr_analista:null, hr_coord:null, obrigatorio:true,  mostrar:true  },
  { id:'di21', nivel:2, parent_id:'di20',ordem:1,titulo:'Suporte ao go-live (operação paralela)',tipo_hora:'ana_coord',hr_analista:8,    hr_coord:4,    obrigatorio:true,  mostrar:true  },
  { id:'di22', nivel:2, parent_id:'di20',ordem:2,titulo:'Assinatura do TAF',                  tipo_hora:'coordenacao', hr_analista:null, hr_coord:1,    obrigatorio:true,  mostrar:true  },
]

const DEFAULT_TEMPLATES = [
  {
    id:'tmpl-mit', nome:'MIT Padrão (6 fases)', descricao:'Template padrão de implantação baseado na metodologia MIT',
    itens: DEFAULT_TEMPLATE_ITENS,
    produto_id: 3,
    tarifas: [
      { id:'tr1', papel:'analista',    label:'Analista',    valor_hora: 150 },
      { id:'tr2', papel:'coordenacao', label:'Coordenador', valor_hora: 220 },
      { id:'tr3', papel:'especialista',label:'Especialista',valor_hora: 350 },
    ],
    blocos: [
      { id:'b1', ordem:1, titulo:'Apresentação', conteudo:'Este documento tem por objetivo apresentar a proposta de implantação elaborada pela nossa equipe, contendo o escopo detalhado, a equipe proposta, o investimento e as condições comerciais.' },
      { id:'b2', ordem:2, titulo:'Metodologia',  conteudo:'A implantação segue a Metodologia MIT (Modelo de Implantação Técnica), estruturada em fases sequenciais com entregas validadas ao final de cada etapa.' },
      { id:'b3', ordem:3, titulo:'Termos e Condições', conteudo:'O prazo de validade desta proposta é de 30 (trinta) dias corridos a partir da data de emissão. Os valores apresentados não incluem impostos aplicáveis.' },
    ],
    regras: [
      { id:'r1', ativo:true, descricao:'Empresa com mais de 500 funcionários: +20% nas horas de treinamento', condicao:{ campo:'num_funcionarios', operador:'>', valor:500 }, acao:{ fase_id:'di17', tipo:'acrescentar_pct', quantidade:20, campo_hora:'ambas' } },
      { id:'r2', ativo:true, descricao:'Possui migração de dados: +16h de analista na configuração', condicao:{ campo:'tem_migracao', operador:'sim', valor:null }, acao:{ fase_id:'di9', tipo:'acrescentar_horas', quantidade:16, campo_hora:'analista' } },
      { id:'r3', ativo:true, descricao:'Possui integração: +8h de especialista na configuração', condicao:{ campo:'tem_integracao', operador:'sim', valor:null }, acao:{ fase_id:'di9', tipo:'acrescentar_horas', quantidade:8, campo_hora:'analista' } },
    ],
  },
]

// Fork template → proposal itens with new IDs
function forkTemplateItens(itens) {
  const idMap = {}
  const cloned = itens.map(it => {
    const newId = itemUid(); idMap[it.id] = newId
    return { ...it, id: newId }
  })
  return cloned.map(it => ({ ...it, parent_id: it.parent_id ? idMap[it.parent_id] || it.parent_id : null }))
}

// Compute phase totals from flat itens
function calcPhaseTotals(itens) {
  const totals = {}
  itens.filter(i => i.nivel === 1).forEach(fase => { totals[fase.id] = { hr_analista: 0, hr_coord: 0 } })
  itens.filter(i => i.nivel === 2).forEach(item => {
    if (item.parent_id && totals[item.parent_id]) {
      totals[item.parent_id].hr_analista += Number(item.hr_analista || 0)
      totals[item.parent_id].hr_coord    += Number(item.hr_coord    || 0)
    }
  })
  return totals
}

// ─── CSV import ───────────────────────────────────────────────────────────────
// Expected columns: Nivel,Titulo,Tipo Hora,Hr Analista,Hr Coord,Obrigatorio,Mostrar
function parseCSVtoItens(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'))
  const itens = []; let lastPhaseId = null; let ordem1 = 0; let ordem2 = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g,''))
    if (!cols[0]) continue
    const nivel = parseInt(cols[headers.indexOf('nivel')] || cols[0]) || 1
    const titulo = cols[headers.indexOf('titulo') >= 0 ? headers.indexOf('titulo') : 1] || ''
    if (!titulo) continue
    const tipoRaw = (cols[headers.indexOf('tipo_hora')] || cols[headers.indexOf('tipo hora')] || '').toLowerCase()
    const tipo = tipoRaw.includes('coord') && tipoRaw.includes('ana') ? 'ana_coord'
      : tipoRaw.includes('coord') ? 'coordenacao'
      : tipoRaw.includes('anal') ? 'analista'
      : tipoRaw.includes('esp') ? 'especialista' : null
    const hrA = hhmmToDec(cols[headers.indexOf('hr_analista') >= 0 ? headers.indexOf('hr_analista') : headers.indexOf('hr analista')] || '')
    const hrC = hhmmToDec(cols[headers.indexOf('hr_coord') >= 0 ? headers.indexOf('hr_coord') : headers.indexOf('hr coord')] || '')
    const obrig = (cols[headers.indexOf('obrigatorio') >= 0 ? headers.indexOf('obrigatorio') : 5] || 'true').toLowerCase() !== 'false'
    const mostrar = (cols[headers.indexOf('mostrar') >= 0 ? headers.indexOf('mostrar') : 6] || 'true').toLowerCase() !== 'false'
    const id = itemUid()
    if (nivel === 1) { lastPhaseId = id; ordem1++; ordem2 = 0 }
    else ordem2++
    itens.push({ id, nivel, parent_id: nivel === 2 ? lastPhaseId : null, ordem: nivel === 1 ? ordem1 : ordem2, titulo, tipo_hora: nivel === 2 ? tipo : null, hr_analista: nivel === 2 ? hrA : null, hr_coord: nivel === 2 ? hrC : null, obrigatorio: obrig, mostrar })
  }
  return itens
}

// MS Project XML → WBS itens (reuses DOMParser)
function parseMsProjectToItens(xmlText) {
  try {
    const parser = new DOMParser(); const doc = parser.parseFromString(xmlText, 'text/xml')
    const tasks = Array.from(doc.getElementsByTagName('Task'))
    function isoToHours(s) {
      if (!s) return null
      const m = s.match(/PT?(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!m) return null
      return (parseInt(m[1]||0)*8) + parseInt(m[2]||0) + parseInt(m[3]||0)/60 + parseInt(m[4]||0)/3600
    }
    const itens = []; let lastPhaseId = null; let ordem1 = 0; let ordem2 = 0
    tasks.forEach(task => {
      const uid = task.querySelector('UID')?.textContent
      if (uid === '0') return
      const name     = task.querySelector('Name')?.textContent || ''
      const outline  = parseInt(task.querySelector('OutlineLevel')?.textContent || '1')
      const workEl   = task.querySelector('Work') || task.querySelector('Duration')
      const hours    = isoToHours(workEl?.textContent)
      const nivel    = outline <= 1 ? 1 : 2
      const id       = itemUid()
      if (nivel === 1) { lastPhaseId = id; ordem1++; ordem2 = 0 }
      else ordem2++
      itens.push({ id, nivel, parent_id: nivel === 2 ? lastPhaseId : null, ordem: nivel === 1 ? ordem1 : ordem2, titulo: name, tipo_hora: nivel === 2 ? 'analista' : null, hr_analista: nivel === 2 ? hours : null, hr_coord: null, obrigatorio: true, mostrar: true })
    })
    return itens
  } catch { return [] }
}

const PROP_STATUS_CFG = {
  rascunho: { label: 'Rascunho',  bg: '#F3F4F6', color: '#374151', border: '#9CA3AF', dot: '#9CA3AF' },
  enviada:  { label: 'Enviada',   bg: '#EFF6FF', color: '#1D4ED8', border: '#3B82F6', dot: '#3B82F6' },
  aceita:   { label: 'Aceita',    bg: '#D1FAE5', color: '#065F46', border: '#10B981', dot: '#10B981' },
  recusada: { label: 'Recusada',  bg: '#FEE2E2', color: '#991B1B', border: '#EF4444', dot: '#EF4444' },
}
const ASSIN_STATUS_CFG = {
  pendente:  { label: 'Aguardando assinatura', color: '#F59E0B' },
  enviada:   { label: 'Enviada p/ assinatura', color: '#3B82F6' },
  concluida: { label: 'Assinada',              color: '#10B981' },
  cancelada: { label: 'Cancelada',             color: '#EF4444' },
}
const PROP_ESC_STATUS = {
  incluido: { label: 'Incluído', bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
  excluido: { label: 'Excluído', bg: '#FEE2E2', color: '#991B1B', border: '#EF4444' },
  opcional: { label: 'Opcional', bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' },
}
function tmplUid() { return `tmpl-${Date.now()}-${Math.random().toString(36).slice(2,5)}` }

function PropostaSelectField({ propostas, value, onChange, statusLabel, statusColor }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const selecionada = propostas.find(p => String(p.id) === String(value)) || null
  const lista = propostas.filter(p => {
    if (selecionada && p.id === selecionada.id) return false
    const q = query.toLowerCase()
    return !q || (p.titulo||'').toLowerCase().includes(q) || (p.empresa_nome||'').toLowerCase().includes(q)
  }).slice(0, 12)

  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:6 }}>Vincular proposta</div>
      <div ref={ref} style={{ position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface)', overflow:'hidden' }}>
          {selecionada ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'8px 12px' }}>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selecionada.titulo || '(sem título)'}</span>
              {selecionada.status && <span style={{ fontSize:11, fontWeight:600, color: statusColor[selecionada.status] || 'var(--text-muted)', flexShrink:0 }}>{statusLabel[selecionada.status] || selecionada.status}</span>}
            </div>
          ) : (
            <input value={query} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
              placeholder="Buscar proposta por título ou empresa…"
              style={{ flex:1, padding:'9px 12px', border:'none', background:'none', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)' }}/>
          )}
          {selecionada
            ? <button onClick={()=>onChange(null)} style={{ padding:'0 12px', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, lineHeight:1 }}>✕</button>
            : <span style={{ padding:'0 10px', color:'var(--text-muted)', fontSize:12, pointerEvents:'none' }}>▾</span>
          }
        </div>
        {open && !selecionada && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:300, maxHeight:220, overflowY:'auto' }}>
            {lista.length === 0
              ? <div style={{ padding:'12px 14px', fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>Nenhuma proposta encontrada</div>
              : lista.map(p => (
                <div key={p.id} onClick={()=>{onChange(p.id);setQuery('');setOpen(false)}}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid var(--border2)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface3)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.titulo || '(sem título)'}</div>
                    {p.empresa_nome && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.empresa_nome}</div>}
                  </div>
                  {p.status && <span style={{ fontSize:11, fontWeight:600, color: statusColor[p.status] || 'var(--text-muted)', flexShrink:0 }}>{statusLabel[p.status] || p.status}</span>}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

function ProdutoSearch({ produto_id, onChange }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef(null)
  const { produtos } = useProducts()
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const ativos     = produtos.filter(p => p.status === 'ativo')
  const sugestoes  = query ? ativos.filter(p => (p.nome + p.codigo + p.categoria).toLowerCase().includes(query.toLowerCase())) : ativos
  const selecionado = produtos.find(p => String(p.id) === String(produto_id))
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{fontSize:12,color:'var(--text-muted)'}}>Selecione o produto do catálogo que esta proposta cobre. Um produto por proposta.</div>
      <div ref={ref} style={{position:'relative'}}>
        <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',borderRadius:8,background:'var(--surface)',overflow:'hidden'}}>
          <input value={query} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
            placeholder="Buscar pelo nome ou código…"
            style={{flex:1,padding:'9px 12px',border:'none',background:'none',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)'}}/>
          {produto_id && <button onClick={()=>{onChange(null);setQuery('')}} style={{padding:'0 12px',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:16,lineHeight:1}}>✕</button>}
        </div>
        {open && sugestoes.length > 0 && (
          <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.14)',zIndex:300,maxHeight:240,overflowY:'auto'}}>
            {sugestoes.map(p=>(
              <div key={p.id} onClick={()=>{onChange(p.id);setQuery('');setOpen(false)}}
                style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border2)'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{p.nome}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>{p.codigo} · {p.categoria} · {p.tipo==='saas'?'SaaS':'Serviço'}</div>
                </div>
                {p.preco>0&&<span style={{fontSize:12,fontFamily:'var(--mono)',color:'var(--text-soft)',flexShrink:0}}>{fmtBRL2(p.preco)}{p.cobranca==='mensal'?'/mês':''}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {selecionado ? (
        <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--accent-glow)',border:'1px solid var(--accent)33',borderRadius:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{selecionado.nome}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{selecionado.codigo} · {selecionado.categoria} · {selecionado.tipo==='saas'?'SaaS':'Serviço'}</div>
            {selecionado.descricao&&<div style={{fontSize:11,color:'var(--text-soft)',marginTop:4,lineHeight:1.5}}>{selecionado.descricao}</div>}
          </div>
          {selecionado.preco>0&&(
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:18,fontWeight:800,color:'var(--accent)'}}>{fmtBRL2(selecionado.preco)}</div>
              <div style={{fontSize:10,color:'var(--text-muted)'}}>{selecionado.cobranca==='mensal'?'/mês':'cobrança única'}</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:12}}>Nenhum produto vinculado</div>
      )}
    </div>
  )
}
function propUid() { return `prop-${Date.now()}-${Math.random().toString(36).slice(2,5)}` }
function escUid()  { return `esc-${Date.now()}-${Math.random().toString(36).slice(2,5)}`  }
function equUid()  { return `equ-${Date.now()}-${Math.random().toString(36).slice(2,5)}`  }

function propToWord(prop) {
  const inc = (prop.escopo||[]).filter(e=>e.status==='incluido')
  const exc = (prop.escopo||[]).filter(e=>e.status==='excluido')
  const opt = (prop.escopo||[]).filter(e=>e.status==='opcional')
  const totH = inc.reduce((s,e)=>s+Number(e.horas||0),0)
  let md = `# Proposta de Implantação\n\n**Cliente:** ${prop.empresa_nome||'—'}\n**Oportunidade:** ${prop.opp_titulo||'—'}\n**Versão:** v${prop.version} · **Status:** ${PROP_STATUS_CFG[prop.status]?.label||prop.status}\n**Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n---\n\n`
  if (inc.length) {
    md += `## Escopo de Implantação\n\n| Fase / Entrega | Descrição | Horas |\n|---|---|---|\n`
    inc.forEach(e => { md += `| ${e.nome} | ${e.descricao||'—'} | ${e.horas?e.horas+'h':'—'} |\n` })
    md += `\n**Total estimado: ${totH}h**\n\n`
  }
  if (opt.length) { md += `### Atividades Opcionais\n\n`; opt.forEach(e=>{md+=`- **${e.nome}**${e.descricao?' — '+e.descricao:''}${e.horas?' ('+e.horas+'h)':''}\n`}); md+='\n' }
  if (exc.length) { md += `### Fora do Escopo\n\n`; exc.forEach(e=>{md+=`- ${e.nome}${e.descricao?' — '+e.descricao:''}\n`}); md+='\n' }
  if ((prop.equipe||[]).length) {
    md += `## Equipe Proposta\n\n| Profissional | Papel | Dedicação |\n|---|---|---|\n`
    prop.equipe.forEach(m=>{md+=`| ${m.nome} | ${m.papel||'—'} | ${m.horas_semana?m.horas_semana+'h/sem':'—'} |\n`})
    md += '\n'
  }
  if (prop.obs) md += `## Observações\n\n${prop.obs}\n\n`
  const blocos = (prop.blocos || []).filter(b => b.conteudo?.trim()).sort((a,b) => a.ordem - b.ordem)
  blocos.forEach(bloco => {
    if (bloco.titulo) md += `## ${bloco.titulo}\n\n`
    let conteudo = bloco.conteudo || ''
    conteudo = conteudo
      .replace(/\{\{empresa_nome\}\}/g, prop.empresa_nome || '')
      .replace(/\{\{opp_titulo\}\}/g, prop.opp_titulo || '')
      .replace(/\{\{data\}\}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{\{ano\}\}/g, new Date().getFullYear())
    md += conteudo + '\n\n'
  })
  md += `---\n\n## Assinatura\n\n**${prop.empresa_nome||'—'}**\n\n_________________________________\nCliente · Data: ___/___/______\n\n**Fornecedor**\n\n_________________________________\nResponsável · Data: ___/___/______\n`
  return md
}

function canvasToWordHtml(elementos, pd, cor, incluirHoras = true) {
  const hoje = new Date().toLocaleDateString('pt-BR')
  const vars = {
    '{{produto}}':       pd?.produto || '—',
    '{{data}}':          hoje,
    '{{empresa}}':       pd?.empresa || pd?.nome || '—',
    '{{nome_proposta}}': pd?.nome || '—',
    '{{investimento}}':  pd?.investimento ? `R$ ${Number(pd.investimento).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—',
  }
  const rv = t => (t||'').replace(/\{\{[^}]+\}\}/g, m => vars[m] ?? m)
  const fmtR = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
  const els = [...elementos].sort((a,b) => a.y - b.y)
  let body = ''
  for (const el of els) {
    const d = el.dados || {}
    if (el.tipo === 'texto' || el.tipo === 'variavel') {
      const txt = rv(d.conteudo || '')
      const fs  = d.tamanhoFonte || 14
      const fw  = d.negrito ? 'bold' : 'normal'
      const fi  = d.italico ? 'italic' : 'normal'
      const al  = d.alinhamento || 'left'
      const cl  = d.cor || '#18181b'
      if (fs >= 24)      body += `<h1 style="color:${cl};text-align:${al}">${txt}</h1>\n`
      else if (fs >= 17) body += `<h2 style="color:${cl};text-align:${al}">${txt}</h2>\n`
      else               body += `<p style="font-size:${fs}pt;font-weight:${fw};font-style:${fi};color:${cl};text-align:${al};white-space:pre-wrap;margin:4pt 0;line-height:1.5">${txt}</p>\n`
    } else if (el.tipo === 'divisor') {
      if ((d.cor||'') !== 'transparent')
        body += `<hr style="border:none;border-top:${d.espessura||1}px ${d.estilo||'solid'} ${d.cor||'#e4e4e7'};margin:8pt 0"/>\n`
      else
        body += `<div style="height:${(d.espessura||1)*4}pt"></div>\n`
    } else if (el.tipo === 'quebra_pagina') {
      body += `<div style="page-break-after:always"></div>\n`
    } else if (el.tipo === 'forma') {
      body += `<div style="background:${d.corFundo||'#EFF6FF'};border:${d.bordaEspessura||1}px solid ${d.cor||'#2563EB'};border-radius:${d.raio||6}px;padding:8pt 12pt;font-size:${d.tamanhoFonte||13}pt;font-weight:${d.negrito?'bold':'normal'};color:${d.cor||'#2563EB'};margin:6pt 0">${rv(d.conteudo||'')}</div>\n`
    } else if (el.tipo === 'kpi') {
      body += `<div style="display:inline-block;padding:8pt 14pt;background:#EFF6FF;border-left:4px solid ${d.cor||cor};margin:4pt 0">`
      if (d.titulo) body += `<div style="font-size:8pt;color:#71717a;text-transform:uppercase;letter-spacing:1px">${d.titulo}</div>`
      body += `<div style="font-size:18pt;font-weight:bold;color:${d.cor||cor}">${d.prefixo||''}—${d.sufixo||''}</div></div>\n`
    } else if (el.tipo === 'escopo') {
      const wbs = pd?.wbs || []
      const cc  = d.cor || '#1E3A5F'
      const fasesCont = wbs.map(f=>({...f,atividades:(f.atividades||[]).filter(a=>a.mostrar!==false)})).filter(f=>f.atividades.length>0)
      const naoContemplados = wbs.flatMap(f=>(f.atividades||[]).filter(a=>a.mostrar===false).map(a=>({...a,fase:f.nome})))
      body += `<h2 style="color:${cc}">${d.titulo||'Escopo do Projeto'}</h2>`
      if (incluirHoras) {
        body += `<table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:6pt"><thead><tr style="background:${cc}"><th style="padding:5pt 8pt;color:#fff;text-align:left;border:1px solid ${cc}">Fase / Atividade</th><th style="padding:5pt 8pt;color:#fff;text-align:center;border:1px solid ${cc};width:60pt">Horas</th></tr></thead><tbody>`
        for (const fase of fasesCont) {
          body += `<tr style="background:#EFF6FF"><td colspan="2" style="padding:4pt 8pt;font-weight:bold;color:#1E3A5F;border:1px solid #dde">${fase.nome}</td></tr>`
          for (const atv of fase.atividades)
            body += `<tr><td style="padding:3pt 8pt 3pt 18pt;border:1px solid #eee">${atv.nome}</td><td style="padding:3pt 8pt;text-align:center;border:1px solid #eee">${atv.horas||0}h</td></tr>`
        }
        body += `</tbody></table>\n`
      } else {
        body += `<table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:6pt"><thead><tr style="background:${cc}"><th style="padding:5pt 8pt;color:#fff;text-align:left;border:1px solid ${cc}">Fase / Atividade</th></tr></thead><tbody>`
        for (const fase of fasesCont) {
          body += `<tr style="background:#EFF6FF"><td style="padding:4pt 8pt;font-weight:bold;color:#1E3A5F;border:1px solid #dde">${fase.nome}</td></tr>`
          for (const atv of fase.atividades)
            body += `<tr><td style="padding:3pt 8pt 3pt 18pt;border:1px solid #eee">${atv.nome}</td></tr>`
        }
        body += `</tbody></table>\n`
      }
      if (naoContemplados.length) {
        body += `<p style="font-weight:bold;color:#DC2626;font-size:10pt;margin:8pt 0 4pt;border-top:2pt solid #DC2626;padding-top:4pt">Itens não contemplados</p>`
        body += `<table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:12pt"><tbody>`
        naoContemplados.forEach((atv,i)=>{ body+=`<tr style="background:${i%2?'#fef2f2':'#fff'}"><td style="padding:2pt 8pt 2pt 14pt;color:#7f1d1d;border:1px solid #fecaca"><span style="color:#DC2626;font-weight:bold">— </span>${atv.nome}</td><td style="padding:2pt 8pt;text-align:right;color:#DC2626;font-style:italic;border:1px solid #fecaca;white-space:nowrap">${atv.fase}</td></tr>` })
        body += `</tbody></table>\n`
      }
    } else if (el.tipo === 'investimento') {
      const tarifas = pd?.tarifas||[]; const itens = pd?.itens||[]
      const cc  = d.cor || '#1E3A5F'
      // Aggregate hours per tarifa papel × valor_hora (same logic as calcInvestimento)
      const tm = {}
      tarifas.forEach(t => { tm[t.papel] = { label: t.label||t.papel, valor: Number(t.valor_hora||0) } })
      const hByPapel = { analista:0, coordenacao:0, especialista:0 }
      itens.filter(i=>i.nivel===2).forEach(a => {
        const hA=Number(a.hr_analista||0), hC=Number(a.hr_coord||0)
        if (a.tipo_hora==='analista'    || a.tipo_hora==='ana_coord') hByPapel.analista    += hA
        if (a.tipo_hora==='coordenacao' || a.tipo_hora==='ana_coord') hByPapel.coordenacao += hC
        if (a.tipo_hora==='especialista')                              hByPapel.especialista+= hA
      })
      const linhas = Object.entries(tm)
        .map(([papel,{label,valor}]) => ({ nome:label, horas:hByPapel[papel]||0, unit:valor, total:(hByPapel[papel]||0)*valor }))
        .filter(l => l.horas > 0)
      const tot = linhas.reduce((s,l)=>s+l.total,0)
      body += `<h2 style="color:${cc}">${d.titulo||'Quadro de Investimento'}</h2>`
      body += `<table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:12pt"><thead><tr style="background:${cc}"><th style="padding:5pt 8pt;color:#fff;text-align:left;border:1px solid ${cc}">Perfil</th><th style="padding:5pt 8pt;color:#fff;text-align:center;border:1px solid ${cc};width:50pt">Horas</th><th style="padding:5pt 8pt;color:#fff;text-align:right;border:1px solid ${cc};width:70pt">R$/h</th><th style="padding:5pt 8pt;color:#fff;text-align:right;border:1px solid ${cc};width:80pt">Total</th></tr></thead><tbody>`
      linhas.forEach((l,i)=>{ body+=`<tr style="background:${i%2?'#fafafa':'#fff'}"><td style="padding:3pt 8pt;border:1px solid #eee">${l.nome}</td><td style="padding:3pt 8pt;text-align:center;border:1px solid #eee;font-family:monospace">${l.horas}h</td><td style="padding:3pt 8pt;text-align:right;border:1px solid #eee;font-family:monospace">${fmtR(l.unit)}</td><td style="padding:3pt 8pt;text-align:right;font-weight:bold;border:1px solid #eee;font-family:monospace">${fmtR(l.total)}</td></tr>` })
      body += `<tr style="background:${cc}"><td colspan="3" style="padding:5pt 8pt;font-weight:bold;color:#fff;border:1px solid ${cc}">Total</td><td style="padding:5pt 8pt;text-align:right;font-weight:bold;color:#fff;border:1px solid ${cc};font-family:monospace">${fmtR(tot)}</td></tr>`
      body += `</tbody></table>\n`
    }
  }
  return body
}

function downloadProposta(prop, docRelatorio, pd, incluirHoras = true) {
  const estilo  = (() => { try { return { ...DEFAULT_ESTILO, ...JSON.parse(localStorage.getItem(PROP_ESTILO_KEY) || '{}') } } catch(e) { return DEFAULT_ESTILO } })()
  const cor     = estilo.cor_primaria || '#1E3A5F'
  const hoje    = new Date().toLocaleDateString('pt-BR')
  const empresa = pd?.empresa || prop.empresa_nome || ''
  const footerTxt = (estilo.footer_texto || '')
    .replace(/\{\{empresa_nome\}\}/g, empresa)
    .replace(/\{\{opp_titulo\}\}/g,   prop.opp_titulo || '')
    .replace(/\{\{data\}\}/g,         hoje)
    .replace(/\{\{ano\}\}/g,          new Date().getFullYear())

  // Canvas document → rich Word body
  const body = docRelatorio?.elementos?.length
    ? canvasToWordHtml(docRelatorio.elementos, pd, cor, incluirHoras)
    : (() => {
        const md = propToWord(prop)
        return md
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^### (.+)$/gm,'<h3>$1</h3>')
          .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^---$/gm,'<hr/>')
          .replace(/^\| (.+) \|$/gm,(_,row)=>{const c=row.split(' | ');return '<tr>'+c.map(x=>x.startsWith('---')?'':` <td style="border:1px solid #ccc;padding:4px 8px">${x}</td>`).filter(Boolean).join('')+'</tr>'})
          .replace(/(<tr>[\s\S]*?<\/tr>)/g,'<table style="border-collapse:collapse;width:100%">$1</table>')
          .replace(/^- (.+)$/gm,'<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g,s=>'<ul>'+s+'</ul>')
          .replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br/>')
      })()

  const logoHtml  = estilo.logo_url ? `<img src="${estilo.logo_url}" alt="logo" style="height:36px;object-fit:contain;vertical-align:middle;margin-right:12px"/>` : ''
  const headerHtml = `<table width="100%" style="background:${cor};margin-bottom:20px"><tr><td style="padding:14px 24px;color:#fff;vertical-align:middle">${logoHtml}<span style="font-size:16pt;font-weight:800;letter-spacing:1px">${estilo.header_titulo||'PROPOSTA DE IMPLANTAÇÃO'}</span>${estilo.header_sub?`<br/><span style="font-size:10pt;opacity:0.8">${estilo.header_sub}</span>`:''}</td><td style="padding:14px 24px;color:#fff;text-align:right;vertical-align:top;white-space:nowrap"><div style="font-size:11pt;font-weight:bold">${empresa}</div><div style="font-size:9pt;opacity:0.8">${hoje}</div></td></tr></table>`
  const footerHtml = footerTxt ? `<div style="border-top:1px solid #e5e7eb;margin-top:30px;padding-top:10px;font-size:9pt;color:#9ca3af;text-align:center">${footerTxt}</div>` : ''

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"/><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;margin:0;color:#111}h1{font-size:18pt;color:${cor};border-bottom:2px solid #e5e7eb;padding-bottom:4pt;margin:16pt 0 8pt}h2{font-size:14pt;color:${cor};margin:14pt 0 6pt}p{margin:4pt 0;line-height:1.5}table{border-collapse:collapse;width:100%;margin:6pt 0}td,th{font-size:10pt;vertical-align:top}ul{padding-left:16pt;margin:4pt 0}li{margin-bottom:3pt}strong{font-weight:bold}hr{border:none;border-top:1px solid #e5e7eb;margin:8pt 0}.content{padding:0 2cm 2cm}</style></head><body>${headerHtml}<div class="content">${body}${footerHtml}</div></body></html>`

  const blob=new Blob([html],{type:'application/msword'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${(prop.titulo||'Proposta').replace(/[^a-zA-Z0-9À-ú\s-]/g,'').trim()}.doc`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url)
}

function OppSearch({ oppOptions, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef(null)

  const selected = oppOptions.find(o => String(o.id) === String(value))
  const filtered = query.trim()
    ? oppOptions.filter(o =>
        (o.titulo||'').toLowerCase().includes(query.toLowerCase()) ||
        (o.empresa_nome||'').toLowerCase().includes(query.toLowerCase()))
    : oppOptions

  useEffect(() => {
    function onClickOut(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  function pick(opp) {
    onChange(String(opp.id))
    setQuery('')
    setOpen(false)
  }
  function clear() { onChange(''); setQuery(''); setOpen(false) }

  return (
    <div ref={ref} style={{position:'relative'}}>
      <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:6}}>Oportunidade vinculada *</div>
      {selected && !open ? (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',border:'1px solid var(--accent)55',borderRadius:7,background:'var(--accent-glow)'}}>
          <span style={{flex:1,fontSize:13,color:'var(--text)',fontFamily:'var(--font)'}}><strong>{selected.empresa_nome}</strong> — {selected.titulo}</span>
          <button onClick={clear} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:15,lineHeight:1,padding:'0 2px'}}>×</button>
        </div>
      ) : (
        <div>
          <input
            autoFocus={open}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar oportunidade…"
            style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)',boxSizing:'border-box'}}
          />
          {open && (
            <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:400,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.14)',maxHeight:220,overflowY:'auto',marginTop:4}}>
              {filtered.length === 0
                ? <div style={{padding:'10px 12px',fontSize:12,color:'var(--text-muted)'}}>Nenhuma oportunidade encontrada</div>
                : filtered.slice(0,60).map(o => (
                    <div key={o.id} onClick={() => pick(o)}
                      style={{padding:'8px 12px',cursor:'pointer',fontSize:13,borderBottom:'1px solid var(--border)',transition:'background 0.1s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <strong style={{color:'var(--text)'}}>{o.empresa_nome}</strong>
                      <span style={{color:'var(--text-muted)'}}> — {o.titulo}</span>
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PropostasTab({ projetos, phases, opps = [], showKpis = true, onEditingChange }) {
  const { save: saveOpp } = useOpportunities()
  const { relatorios: docRelatorios, save: saveDocRelatorio } = useRelatorios('proposta')
  const { produtos } = useProducts()
  const { profile } = useProfile()
  const { companies } = useCompanies()
  const [downloadModal, setDownloadModal] = useState(null) // { prop, doc, pd } | null
  const [dlHoras,       setDlHoras]       = useState(false)          // padrão: omitir horas
  const [dlNome,        setDlNome]        = useState('cliente')      // padrão: empresa cliente
  const [dlFormato,     setDlFormato]     = useState('word')         // padrão: word
  const [dlErro,        setDlErro]        = useState('')
  const [propostas,    setPropostas]    = useLocalState(PROPOSTAS_KEY, [])
  const [templates,    setTemplates]    = useLocalState(PROP_TEMPLATES_KEY, DEFAULT_TEMPLATES)
  const [subView,      setSubView]      = useState('propostas') // 'propostas' | 'templates'
  const [selected,     setSelected]     = useState(null)
  const [selectedTmpl, setSelectedTmpl] = useState(null)
  const [criando,      setCriando]      = useState(false)
  const [propTab,      setPropTab]      = useState('escopo')
  const [filterOpp,    setFilterOpp]    = useState('')
  const [filterSt,     setFilterSt]     = useState('')
  const [filterOppQ,   setFilterOppQ]   = useState('')
  const [oppPickerOpen,setOppPickerOpen]= useState(false)
  const oppPickerRef = useRef(null)
  useEffect(() => {
    if (!oppPickerOpen) return
    function handle(e) { if (oppPickerRef.current && !oppPickerRef.current.contains(e.target)) setOppPickerOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [oppPickerOpen])
  const [estilo,       setEstilo]       = useLocalState(PROP_ESTILO_KEY, DEFAULT_ESTILO)
  const [wStep,        setWStep]        = useState(1)
  const [wOppId,       setWOppId]       = useState('')
  const [wTemplId,     setWTemplId]     = useState('')
  const [wTitulo,      setWTitulo]      = useState('')
  const [wVars,        setWVars]        = useState({})      // regras variáveis wizard
  const [tmplTab,      setTmplTab]      = useState('wbs')
  const [tmplSaved,    setTmplSaved]    = useState(false)
  const [editandoDoc,  setEditandoDoc]  = useState(false)
  const [versaoDesc,   setVersaoDesc]   = useState('')
  const [propSaved,    setPropSaved]    = useState(false)
  const [importing,    setImporting]    = useState(false)
  const [importTmplId, setImportTmplId] = useState(null)
  const [collapsedPhases, setCollapsedPhases] = useState({})

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const o = p.get('opp_id')
    if (o) { setFilterOpp(o); setWOppId(o) }
    setWTemplId(t => t || '')
  }, [])

  // Avisa o pai se está em modo edição (oculta KPIs)
  useEffect(() => {
    onEditingChange?.(!!selected || !!(subView === 'templates' && selectedTmpl) || editandoDoc)
  }, [selected, selectedTmpl, subView, editandoDoc, onEditingChange])

  const oppOptions = useMemo(() => {
    const seen=new Set(); const list=[]
    ;[...opps, ...projetos.filter(p=>p.opportunity_id).map(p=>({ id:p.opportunity_id, titulo:p.name, empresa_nome:p.company_nome }))].forEach(o=>{
      const k=String(o.id); if(!seen.has(k)){seen.add(k);list.push(o)}
    })
    return list
  }, [opps, projetos])

  const filtered = useMemo(() =>
    propostas.filter(p=>(!filterOpp||String(p.opp_id)===filterOpp)&&(!filterSt||p.status===filterSt))
      .sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))
  , [propostas, filterOpp, filterSt])

  // ── Proposal CRUD ──
  function salvar(prop, showFeedback = false) {
    const nomeUsuario = profile?.nome || profile?.email || 'Usuário'
    const logEntry = { id: Date.now(), evento: 'Proposta alterada', usuario: nomeUsuario, data: new Date().toISOString() }
    const logAtual = prop.log || []
    // Só registra histórico se não for a criação inicial (já tem log)
    const novoLog = logAtual.length > 0 ? [...logAtual, logEntry] : logAtual
    const up = { ...prop, log: novoLog, updated_at: new Date().toISOString() }
    setPropostas(prev=>{ const i=prev.findIndex(x=>x.id===up.id); if(i>=0){const n=[...prev];n[i]=up;return n}; return [...prev,up] })
    setSelected(up)
    // sincroniza valor_servico da oportunidade vinculada
    if (up.opp_id) {
      const opp = opps.find(o => String(o.id) === String(up.opp_id))
      if (opp) {
        const valor = calcInvestimento(up.itens || [], up.tarifas || [])
        if (valor > 0 && opp.valor_servico !== valor) {
          saveOpp({ ...opp, valor_servico: valor })
        }
      }
    }
    if (showFeedback) { setPropSaved(true); setTimeout(() => setPropSaved(false), 2000) }
  }
  function excluir(id) {
    if(!window.confirm('Excluir esta proposta?')) return
    setPropostas(prev=>prev.filter(p=>p.id!==id)); setSelected(null)
  }
  function criarProposta() {
    const opp    = oppOptions.find(o=>String(o.id)===wOppId)
    const templ  = templates.find(t=>t.id===wTemplId) || templates[0]
    const now    = new Date().toISOString()
    const forked = forkTemplateItens(templ?.itens||[])
    const ajustados = Object.keys(wVars).length && templ?.regras?.length
      ? evaluateRules(templ.regras, wVars, forked) : forked
    const nomeUsuarioCriacao = profile?.nome || profile?.email || 'Você'
    const logEntries = [{ id:`l-${Date.now()}`, evento:'Proposta criada', usuario:nomeUsuarioCriacao, data:now }]
    if (Object.keys(wVars).length && templ?.regras?.length) {
      const fired = evalRulesLog(templ.regras, wVars)
      fired.forEach(r => logEntries.push({ id:`l-${Date.now()}-${r.id}`, evento:`Regra aplicada: ${r.descricao}`, usuario:'Sistema', data:now }))
    }
    const nova = {
      id:propUid(), titulo:wTitulo||`Proposta de Implantação — ${opp?.empresa_nome||''}`,
      opp_id:wOppId, opp_titulo:opp?.titulo||'', empresa_nome:opp?.empresa_nome||'',
      status:'rascunho', version:1, created_at:now, updated_at:now,
      enviada_em:null, aceita_em:null,
      assinatura_status:null, assinatura_plataforma:null, assinatura_url:null,
      assinatura_enviada_em:null, assinatura_concluida_em:null,
      itens: ajustados,
      tarifas: (templ?.tarifas||DEFAULT_TARIFAS).map(t=>({...t})),
      blocos:  (templ?.blocos||[]).map(b=>({...b,id:`b-${Date.now()}-${Math.random().toString(36).slice(2,5)}`})),
      produto_id: templ?.produto_id||null,
      template_id: templ?.id||null,
      variaveis_aplicadas: wVars,
      escopo:[], equipe:[], obs:'',
      log: logEntries,
    }
    setPropostas(prev=>[...prev,nova]); setCriando(false); setSelected(nova); setPropTab('escopo')
    setWStep(1); setWOppId(filterOpp||''); setWTemplId(''); setWTitulo(''); setWVars({})
  }

  // ── Template CRUD ──
  function salvarTemplate(tmpl) {
    setTemplates(prev=>{ const i=prev.findIndex(x=>x.id===tmpl.id); if(i>=0){const n=[...prev];n[i]=tmpl;return n}; return [...prev,tmpl] })
    setSelectedTmpl(tmpl)
  }
  function excluirTemplate(id) {
    if(!window.confirm('Excluir este template?')) return
    setTemplates(prev=>prev.filter(t=>t.id!==id)); setSelectedTmpl(null)
  }
  function novoTemplate() {
    const t = { id:tmplUid(), nome:'Novo Template', descricao:'', itens:[] }
    setTemplates(prev=>[...prev,t]); setSelectedTmpl(t)
  }

  // ── WBS table (shared by template editor and proposal escopo) ──
  function WBSTable({ itens, onChange, readOnly }) {
    const [editId,  setEditId]  = useState(null)
    const [editFld, setEditFld] = useState({})
    const totals = useMemo(()=>calcPhaseTotals(itens),[itens])
    const prevLen = useRef(itens.length)

    function startEdit(item) { setEditId(item.id); setEditFld({...item}) }
    function commitEdit() {
      if(!editId) return
      onChange(itens.map(i=>i.id===editId?{...i,...editFld}:i))
      setEditId(null); setEditFld({})
    }

    // Quando um novo item é adicionado, inicia edição inline automaticamente
    useEffect(() => {
      if (itens.length > prevLen.current) {
        const newest = itens[itens.length - 1]
        if (newest) startEdit(newest)
      }
      prevLen.current = itens.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itens.length])
    function togglePhase(id) { setCollapsedPhases(p=>({...p,[id]:!p[id]})) }
    function addPhase() {
      const id=itemUid(); const ordem=itens.filter(i=>i.nivel===1).length+1
      const n={id,nivel:1,parent_id:null,ordem,titulo:'Nova fase',tipo_hora:null,hr_analista:null,hr_coord:null,obrigatorio:true,mostrar:true}
      onChange([...itens,n]); setTimeout(()=>startEdit(n),50)
    }
    function addActivity(phaseId) {
      const siblings=itens.filter(i=>i.parent_id===phaseId); const ordem=siblings.length+1
      const n={id:itemUid(),nivel:2,parent_id:phaseId,ordem,titulo:'Nova atividade',tipo_hora:'analista',hr_analista:null,hr_coord:null,obrigatorio:true,mostrar:true}
      onChange([...itens,n]); setTimeout(()=>startEdit(n),50)
    }
    function removeItem(id) { onChange(itens.filter(i=>i.id!==id&&i.parent_id!==id)) }
    function toggleObrig(id) { onChange(itens.map(i=>i.id===id?{...i,obrigatorio:!i.obrigatorio}:i)) }
    function toggleMostra(id){ onChange(itens.map(i=>i.id===id?{...i,mostrar:!i.mostrar}:i)) }

    const inpSt = { border:'1px solid var(--accent)', borderRadius:4, padding:'2px 5px', background:'var(--surface)', color:'var(--text)', fontSize:12, outline:'none', fontFamily:'var(--font)', width:'100%' }
    const thSt  = { padding:'7px 10px', fontSize:11, fontWeight:600, color:'var(--text-muted)', textAlign:'left', background:'var(--surface2)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
    const tdSt  = { padding:'7px 10px', fontSize:12, color:'var(--text)', borderBottom:'1px solid var(--border2)', verticalAlign:'middle' }

    const phases = itens.filter(i=>i.nivel===1).sort((a,b)=>a.ordem-b.ordem)

    return (
      <div style={{display:'flex',flexDirection:'column',gap:0,border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
          <colgroup>
            <col style={{width:'auto'}}/><col style={{width:110}}/><col style={{width:80}}/><col style={{width:80}}/><col style={{width:54}}/><col style={{width:54}}/>{!readOnly&&<col style={{width:36}}/>}
          </colgroup>
          <thead>
            <tr>
              <th style={thSt}>Título</th>
              <th style={{...thSt,textAlign:'center'}}>Tipo Hora</th>
              <th style={{...thSt,textAlign:'center'}}>Hr. Analista</th>
              <th style={{...thSt,textAlign:'center'}}>Hr. Coord.</th>
              <th style={{...thSt,textAlign:'center'}}>Obrig.</th>
              <th style={{...thSt,textAlign:'center'}}>Considera</th>
              {!readOnly&&<th style={thSt}/>}
            </tr>
          </thead>
          <tbody>
            {phases.map(fase=>{
              const tot=totals[fase.id]||{hr_analista:0,hr_coord:0}
              const collapsed=collapsedPhases[fase.id]
              const children=itens.filter(i=>i.parent_id===fase.id).sort((a,b)=>a.ordem-b.ordem)
              const isEditing=editId===fase.id
              return (
                <React.Fragment key={fase.id}>
                  <tr style={{background:'var(--surface2)'}}>
                    <td style={{...tdSt,fontWeight:700,color:'var(--accent)'}}>
                      {isEditing?(
                        <input autoFocus value={editFld.titulo||''} onChange={e=>setEditFld(f=>({...f,titulo:e.target.value}))}
                          onBlur={commitEdit} onKeyDown={e=>{if(e.key==='Enter')commitEdit();if(e.key==='Escape'){setEditId(null)}}}
                          style={{...inpSt,fontWeight:700,color:'var(--accent)'}}/>
                      ):(
                        <span style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}} onClick={()=>!readOnly&&startEdit(fase)}>
                          <span onClick={e=>{e.stopPropagation();togglePhase(fase.id)}} style={{fontSize:10,color:'var(--text-muted)',cursor:'pointer',width:12}}>{collapsed?'▶':'▼'}</span>
                          {fase.titulo}
                        </span>
                      )}
                    </td>
                    <td style={{...tdSt,textAlign:'center'}}/>
                    <td style={{...tdSt,textAlign:'center',fontWeight:700,color:'var(--accent)',fontFamily:'var(--mono)'}}>{tot.hr_analista>0?decToHHMM(tot.hr_analista):''}</td>
                    <td style={{...tdSt,textAlign:'center',fontWeight:700,color:'var(--accent)',fontFamily:'var(--mono)'}}>{tot.hr_coord>0?decToHHMM(tot.hr_coord):''}</td>
                    <td style={{...tdSt,textAlign:'center'}}/>
                    <td style={{...tdSt,textAlign:'center'}}/>
                    {!readOnly&&<td style={{...tdSt,textAlign:'center'}}>
                      <button onClick={()=>removeItem(fase.id)} title="Remover fase" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:13,lineHeight:1,padding:2}}
                        onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>✕</button>
                    </td>}
                  </tr>
                  {!collapsed && children.map(item=>{
                    const isEditingItem=editId===item.id
                    const tipoLabel=item.tipo_hora?TIPO_HORA_CFG[item.tipo_hora]?.short||item.tipo_hora:''
                    return (
                      <tr key={item.id} style={{background:item.mostrar?'var(--surface)':'var(--surface2)'}}>
                        <td style={{...tdSt,paddingLeft:32}}>
                          {isEditingItem?(
                            <input autoFocus value={editFld.titulo||''} onChange={e=>setEditFld(f=>({...f,titulo:e.target.value}))}
                              onBlur={commitEdit} onKeyDown={e=>{if(e.key==='Enter')commitEdit();if(e.key==='Escape')setEditId(null)}}
                              style={inpSt}/>
                          ):(
                            <span style={{display:'flex',alignItems:'center',gap:6}}>
                              <span style={{width:6,height:6,borderRadius:'50%',background:'var(--border)',flexShrink:0}}/>
                              <span style={{cursor:readOnly?'default':'pointer',color:item.mostrar?'var(--text)':'var(--text-muted)'}} onClick={()=>!readOnly&&startEdit(item)}>{item.titulo}</span>
                            </span>
                          )}
                        </td>
                        <td style={{...tdSt,textAlign:'center'}}>
                          {isEditingItem?(
                            <select value={editFld.tipo_hora||''} onChange={e=>setEditFld(f=>({...f,tipo_hora:e.target.value||null}))} onBlur={commitEdit}
                              style={{...inpSt,width:'auto'}}>
                              <option value="">—</option>
                              {Object.entries(TIPO_HORA_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                            </select>
                          ):(
                            <span style={{fontSize:11,color:'var(--text-soft)'}}>{tipoLabel}</span>
                          )}
                        </td>
                        <td style={{...tdSt,textAlign:'center',fontFamily:'var(--mono)'}}>
                          {isEditingItem?(
                            <input type="text" value={editFld.hr_analista!==null?decToHHMM(editFld.hr_analista):''} placeholder="00:00"
                              onChange={e=>setEditFld(f=>({...f,hr_analista:hhmmToDec(e.target.value)}))} onBlur={commitEdit} style={{...inpSt,textAlign:'center',width:60}}/>
                          ):(
                            <span style={{color:item.hr_analista?'var(--text)':'var(--text-muted)'}}>{item.hr_analista?decToHHMM(item.hr_analista):''}</span>
                          )}
                        </td>
                        <td style={{...tdSt,textAlign:'center',fontFamily:'var(--mono)'}}>
                          {isEditingItem?(
                            <input type="text" value={editFld.hr_coord!==null?decToHHMM(editFld.hr_coord):''} placeholder="00:00"
                              onChange={e=>setEditFld(f=>({...f,hr_coord:hhmmToDec(e.target.value)}))} onBlur={commitEdit} style={{...inpSt,textAlign:'center',width:60}}/>
                          ):(
                            <span style={{color:item.hr_coord?'var(--text)':'var(--text-muted)'}}>{item.hr_coord?decToHHMM(item.hr_coord):''}</span>
                          )}
                        </td>
                        <td style={{...tdSt,textAlign:'center'}}>
                          <input type="checkbox" checked={!!item.obrigatorio} onChange={()=>!readOnly&&toggleObrig(item.id)} disabled={readOnly} style={{cursor:readOnly?'default':'pointer',accentColor:'var(--accent)'}}/>
                        </td>
                        <td style={{...tdSt,textAlign:'center'}}>
                          <span onClick={()=>!readOnly&&toggleMostra(item.id)} title={item.mostrar?'Considerado na proposta':'Não contemplado'}
                            style={{cursor:readOnly?'default':'pointer',fontSize:14,color:item.mostrar?'#10B981':'var(--border)',display:'inline-block'}}>
                            {item.mostrar?'◉':'○'}
                          </span>
                        </td>
                        {!readOnly&&<td style={{...tdSt,textAlign:'center'}}>
                          <button onClick={()=>removeItem(item.id)} title="Remover" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:13,lineHeight:1,padding:2}}
                            onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>✕</button>
                        </td>}
                      </tr>
                    )
                  })}
                  {!collapsed && !readOnly && (
                    <tr>
                      <td colSpan={7} style={{padding:'4px 32px',background:'var(--surface)'}}>
                        <button onClick={()=>addActivity(fase.id)} style={{fontSize:11,color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer',padding:'2px 0',fontFamily:'var(--font)'}}>
                          + Adicionar atividade
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        {!readOnly && (
          <div style={{padding:'8px 12px',borderTop:'1px solid var(--border2)',background:'var(--surface2)'}}>
            <button onClick={addPhase} style={{fontSize:12,color:'var(--accent)',background:'none',border:'none',cursor:'pointer',fontWeight:600,fontFamily:'var(--font)'}}>
              + Adicionar fase
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Import modal ──
  function ImportModal({ tmplId, onClose }) {
    const [mode, setMode] = useState('csv') // 'csv' | 'xml'
    const [preview, setPreview] = useState(null)
    const [error, setError]   = useState('')

    function handleFile(e) {
      const file = e.target.files[0]; if(!file) return; setError('')
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          const text = ev.target.result
          const itens = mode === 'xml' ? parseMsProjectToItens(text) : parseCSVtoItens(text)
          if(!itens.length) { setError('Nenhum item encontrado. Verifique o formato do arquivo.'); return }
          setPreview(itens)
        } catch(ex) { setError('Erro ao processar arquivo: ' + ex.message) }
      }
      reader.readAsText(file)
    }

    function confirmar() {
      if(!preview?.length) return
      const tmpl = templates.find(t=>t.id===tmplId); if(!tmpl) return
      salvarTemplate({...tmpl, itens: preview})
      onClose()
    }

    return (
      <>
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1299}} onClick={onClose}/>
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:1300,width:560,maxWidth:'95vw',background:'var(--surface)',borderRadius:14,boxShadow:'0 16px 56px rgba(0,0,0,0.25)',overflow:'hidden'}}>
          <div style={{padding:'16px 20px 12px',borderBottom:'1px solid var(--border)'}}>
            <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>Importar Escopo</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Substitui todos os itens do template pelo arquivo importado</div>
          </div>
          <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:14}}>
            {/* Tabs */}
            <div style={{display:'flex',gap:2,background:'var(--surface2)',borderRadius:8,padding:3,border:'1px solid var(--border)',alignSelf:'flex-start'}}>
              {[['csv','Excel (CSV)'],['xml','MS Project (XML)']].map(([k,l])=>(
                <button key={k} onClick={()=>{setMode(k);setPreview(null);setError('')}}
                  style={{padding:'5px 14px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:mode===k?700:500,fontFamily:'var(--font)',background:mode===k?'var(--surface)':'none',color:mode===k?'var(--text)':'var(--text-muted)'}}>
                  {l}
                </button>
              ))}
            </div>

            {mode==='csv' && (
              <div style={{padding:'10px 14px',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,fontSize:11,color:'#166534',lineHeight:1.7}}>
                <strong>Formato esperado (CSV):</strong><br/>
                Colunas: <code>Nivel,Titulo,Tipo Hora,Hr Analista,Hr Coord,Obrigatorio,Mostrar</code><br/>
                Nivel 1 = fase · Nivel 2 = atividade<br/>
                Tipo Hora: Analista | Coordenação | Ana./Coord. | Especialista<br/>
                Horas: formato HH:MM (ex: 01:30) ou decimal (ex: 1.5)<br/>
                Obrigatorio/Mostrar: TRUE ou FALSE
              </div>
            )}
            {mode==='xml' && (
              <div style={{padding:'10px 14px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:8,fontSize:11,color:'#1D4ED8',lineHeight:1.6}}>
                <strong>MS Project XML:</strong> exporte o projeto como "XML do Project" (Arquivo → Salvar como → Formato XML do Project). As tarefas de nível 1 viram fases e as de nível 2+ viram atividades. As horas são lidas do campo "Trabalho".
              </div>
            )}

            <div>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:6}}>Selecionar arquivo</label>
              <input type="file" accept={mode==='xml'?'.xml,application/xml':'.csv,text/csv'} onChange={handleFile}
                style={{fontSize:12,color:'var(--text)',fontFamily:'var(--font)'}}/>
            </div>

            {error && <div style={{padding:'8px 12px',background:'#FEE2E2',border:'1px solid #EF4444',borderRadius:7,fontSize:12,color:'#991B1B'}}>{error}</div>}

            {preview && (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)'}}>{preview.filter(i=>i.nivel===1).length} fases · {preview.filter(i=>i.nivel===2).length} atividades detectadas</div>
                <div style={{maxHeight:180,overflowY:'auto',border:'1px solid var(--border)',borderRadius:7,padding:'8px 10px',background:'var(--surface2)',fontSize:11,color:'var(--text)',lineHeight:1.8}}>
                  {preview.filter(i=>i.nivel===1).map(fase=>(
                    <div key={fase.id}>
                      <strong style={{color:'var(--accent)'}}>{fase.titulo}</strong>
                      {preview.filter(i=>i.parent_id===fase.id).map(a=>(
                        <div key={a.id} style={{paddingLeft:16,color:'var(--text-soft)'}}>• {a.titulo}{a.hr_analista||a.hr_coord?` (${decToHHMM(a.hr_analista||0)} / ${decToHHMM(a.hr_coord||0)})`:''}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{padding:'12px 20px 16px',borderTop:'1px solid var(--border2)',display:'flex',justifyContent:'space-between'}}>
            <button onClick={onClose} style={{padding:'7px 16px',background:'none',border:'1px solid var(--border)',borderRadius:7,fontSize:13,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font)'}}>Cancelar</button>
            <button onClick={confirmar} disabled={!preview?.length} style={{padding:'7px 20px',background:preview?.length?'var(--accent)':'var(--border)',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:preview?.length?'pointer':'default',fontFamily:'var(--font)'}}>
              Aplicar ao template
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Escopo editor (in proposal — WBS when itens exist, simple fallback) ──
  function EscopoEditor({ prop }) {
    // Hooks always first — before any conditional return
    const [adding, setAdding] = useState(false)
    const [draft,  setDraftI] = useState({ nome:'', descricao:'', horas:'' })

    const hasWBS = (prop.itens||[]).length > 0
    const projeto       = projetos.find(p=>p.opportunity_id===prop.opp_id)
    const projetoPhases = projeto ? phases.filter(ph=>ph.project_id===projeto.id) : []
    const totH = (prop.escopo||[]).filter(e=>e.status==='incluido').reduce((s,e)=>s+Number(e.horas||0),0)

    // WBS mode (forked from template)
    if (hasWBS) {
      const totals = calcPhaseTotals(prop.itens||[])
      const totalA = Object.values(totals).reduce((s,t)=>s+t.hr_analista,0)
      const totalC = Object.values(totals).reduce((s,t)=>s+t.hr_coord,0)
      return (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:16,padding:'8px 12px',background:'var(--surface2)',borderRadius:8,fontSize:12}}>
            <span style={{color:'var(--text-muted)'}}>Total: <strong style={{color:'var(--text)'}}>{decToHHMM(totalA+totalC)}</strong></span>
            <span style={{color:'var(--text-muted)'}}>Analista: <strong style={{color:'var(--accent)'}}>{decToHHMM(totalA)}</strong></span>
            <span style={{color:'var(--text-muted)'}}>Coord.: <strong style={{color:'var(--accent)'}}>{decToHHMM(totalC)}</strong></span>
          </div>
          <WBSTable itens={prop.itens||[]} onChange={newItens=>salvar({...prop,itens:newItens})}/>
        </div>
      )
    }

    function addItem() {
      if(!draft.nome.trim()) return
      salvar({...prop, escopo:[...(prop.escopo||[]),{id:escUid(),nome:draft.nome.trim(),descricao:draft.descricao.trim(),horas:draft.horas?Number(draft.horas):'',status:'incluido'}]})
      setDraftI({nome:'',descricao:'',horas:''}); setAdding(false)
    }
    function removeItem(id) { salvar({...prop,escopo:prop.escopo.filter(e=>e.id!==id)}) }
    function toggleStatus(id) {
      salvar({...prop, escopo:prop.escopo.map(e=>{
        if(e.id!==id) return e
        const cy={incluido:'excluido',excluido:'opcional',opcional:'incluido'}
        return {...e,status:cy[e.status]||'incluido'}
      })})
    }
    function importarFases() {
      if(!projetoPhases.length){alert('Nenhuma fase encontrada no projeto vinculado.');return}
      const nomes=new Set((prop.escopo||[]).map(e=>e.nome))
      const novos=projetoPhases.filter(ph=>!nomes.has(ph.phase_name)).map(ph=>({id:escUid(),nome:ph.phase_name,descricao:ph.start_date_planned&&ph.end_date_planned?`${ph.start_date_planned} → ${ph.end_date_planned}`:'',horas:ph.hours_estimated||'',status:'incluido'}))
      if(!novos.length){alert('Todas as fases já estão no escopo.');return}
      salvar({...prop,escopo:[...(prop.escopo||[]),...novos]})
    }

    return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <span style={{fontSize:11,color:'var(--text-muted)'}}>
            {(prop.escopo||[]).filter(e=>e.status==='incluido').length} itens incluídos · <strong>{totH}h estimadas</strong>
          </span>
          {projetoPhases.length>0 && (
            <button onClick={importarFases} style={{padding:'5px 12px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface2)',color:'var(--text-soft)',fontSize:11,cursor:'pointer',fontFamily:'var(--font)'}}>
              Importar fases do Cronograma MIT
            </button>
          )}
        </div>
        {(prop.escopo||[]).map(item=>{
          const sc=PROP_ESC_STATUS[item.status]||PROP_ESC_STATUS.incluido
          return (
            <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--surface)',border:`1px solid ${sc.border}33`,borderRadius:8,borderLeft:`3px solid ${sc.border}`}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{item.nome}</div>
                {item.descricao&&<div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{item.descricao}</div>}
              </div>
              {item.horas!==''&&<span style={{fontSize:12,fontFamily:'var(--mono)',color:'var(--text-soft)',flexShrink:0}}>{item.horas}h</span>}
              <button onClick={()=>toggleStatus(item.id)} style={{fontSize:10,padding:'2px 8px',borderRadius:10,border:`1px solid ${sc.border}`,background:sc.bg,color:sc.color,cursor:'pointer',fontWeight:700,flexShrink:0,fontFamily:'var(--font)'}}>{sc.label}</button>
              <button onClick={()=>removeItem(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:13,padding:'2px 4px',flexShrink:0}}
                onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>✕</button>
            </div>
          )
        })}
        {(prop.escopo||[]).length===0&&!adding&&<div style={{textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:12}}>Nenhum item. Adicione manualmente ou importe fases.</div>}
        {adding&&(
          <div style={{display:'flex',flexDirection:'column',gap:8,padding:'10px 12px',background:'var(--surface2)',border:'1px dashed var(--border)',borderRadius:8}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:8}}>
              <input autoFocus value={draft.nome} onChange={e=>setDraftI(d=>({...d,nome:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')addItem();if(e.key==='Escape')setAdding(false)}} placeholder="Nome da entrega / fase" style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)'}}/>
              <input value={draft.horas} onChange={e=>setDraftI(d=>({...d,horas:e.target.value}))} placeholder="Horas" type="number" min="0" style={{padding:'6px 8px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)'}}/>
            </div>
            <input value={draft.descricao} onChange={e=>setDraftI(d=>({...d,descricao:e.target.value}))} placeholder="Descrição (opcional)" style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text)',fontSize:12,outline:'none',fontFamily:'var(--font)'}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={addItem} style={{padding:'5px 14px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>Adicionar</button>
              <button onClick={()=>setAdding(false)} style={{padding:'5px 12px',background:'none',border:'1px solid var(--border)',borderRadius:6,fontSize:12,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font)'}}>Cancelar</button>
            </div>
          </div>
        )}
        {!adding&&<button onClick={()=>setAdding(true)} style={{alignSelf:'flex-start',padding:'5px 12px',background:'none',border:'1px dashed var(--border)',borderRadius:6,fontSize:12,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font)'}}>+ Adicionar item</button>}
      </div>
    )
  }

  // ── Equipe editor ──
  function EquipeEditor({ prop }) {
    const { usuarios } = useUsuarios()
    const [adding, setAdding] = useState(false)
    const [draft,  setDraftE] = useState({ user_id:'', nome:'', papel:'', horas_semana:'' })

    const usuariosAtivos = useMemo(() =>
      usuarios.filter(u => u.status !== 'inativo').sort((a,b)=>(a.nome||'').localeCompare(b.nome||'','pt-BR'))
    , [usuarios])

    const jaAdicionados = new Set((prop.equipe||[]).map(m => m.user_id).filter(Boolean))

    function selecionarUser(userId) {
      const u = usuariosAtivos.find(x => String(x.id) === String(userId))
      if (u) setDraftE(d => ({ ...d, user_id: userId, nome: u.nome || u.email || '', papel: u.papel || '' }))
      else    setDraftE(d => ({ ...d, user_id: userId }))
    }

    function addM() {
      if (!draft.nome.trim()) return
      salvar({...prop, equipe:[...(prop.equipe||[]),{id:equUid(),user_id:draft.user_id||null,nome:draft.nome.trim(),papel:draft.papel.trim(),horas_semana:draft.horas_semana?Number(draft.horas_semana):''}]})
      setDraftE({user_id:'',nome:'',papel:'',horas_semana:''}); setAdding(false)
    }

    const inpSt = {padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)',width:'100%'}

    return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {(prop.equipe||[]).map(m=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'var(--accent-glow)',border:'1px solid var(--accent)44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--accent)',flexShrink:0}}>{(m.nome||'?').charAt(0).toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{m.nome}</div>
              {m.papel&&<div style={{fontSize:11,color:'var(--text-muted)'}}>{m.papel}</div>}
            </div>
            {m.horas_semana!==''&&<span style={{fontSize:12,fontFamily:'var(--mono)',color:'var(--text-soft)',flexShrink:0}}>{m.horas_semana}h/sem</span>}
            <button onClick={()=>salvar({...prop,equipe:prop.equipe.filter(x=>x.id!==m.id)})} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:13,padding:'2px 4px',flexShrink:0}}
              onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>✕</button>
          </div>
        ))}
        {(prop.equipe||[]).length===0&&!adding&&<div style={{textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:12}}>Nenhum membro adicionado.</div>}
        {adding&&(
          <div style={{display:'flex',flexDirection:'column',gap:8,padding:'10px 12px',background:'var(--surface2)',border:'1px dashed var(--border)',borderRadius:8}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px',gap:8}}>
              <select autoFocus value={draft.user_id} onChange={e=>selecionarUser(e.target.value)}
                style={{...inpSt,appearance:'none'}}>
                <option value="">— Selecionar usuário —</option>
                {usuariosAtivos.filter(u=>!jaAdicionados.has(String(u.id))).map(u=>(
                  <option key={u.id} value={u.id}>{u.nome||u.email}</option>
                ))}
              </select>
              <input value={draft.papel} onChange={e=>setDraftE(d=>({...d,papel:e.target.value}))} placeholder="Papel / cargo" style={inpSt}/>
              <input value={draft.horas_semana} onChange={e=>setDraftE(d=>({...d,horas_semana:e.target.value}))} placeholder="h/sem" type="number" min="0" style={inpSt}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={addM} disabled={!draft.user_id} style={{padding:'5px 14px',background:draft.user_id?'var(--accent)':'#d1d5db',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:draft.user_id?'pointer':'not-allowed',fontFamily:'var(--font)'}}>Adicionar</button>
              <button onClick={()=>setAdding(false)} style={{padding:'5px 12px',background:'none',border:'1px solid var(--border)',borderRadius:6,fontSize:12,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font)'}}>Cancelar</button>
            </div>
          </div>
        )}
        {!adding&&<button onClick={()=>setAdding(true)} style={{alignSelf:'flex-start',padding:'5px 12px',background:'none',border:'1px dashed var(--border)',borderRadius:6,fontSize:12,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font)'}}>+ Adicionar membro</button>}
      </div>
    )
  }

  // ── Painel de assinatura eletrônica ──
  function AssinaturaPanel({ prop }) {
    const [plat, setPlat] = useState(prop.assinatura_plataforma||'')
    const [url,  setUrl]  = useState(prop.assinatura_url||'')
    const st = prop.assinatura_status ? ASSIN_STATUS_CFG[prop.assinatura_status] : null

    function salvarAssin() {
      const now=new Date().toISOString()
      salvar({...prop, assinatura_plataforma:plat||null, assinatura_url:url||null,
        assinatura_status: url?'enviada':prop.assinatura_status,
        assinatura_enviada_em: url&&!prop.assinatura_enviada_em?now:prop.assinatura_enviada_em,
      })
    }

    return (
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{padding:'12px 16px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10}}>
          <div style={{fontSize:12,fontWeight:700,color:'#1D4ED8',marginBottom:4}}>Assinatura Eletrônica</div>
          <div style={{fontSize:11,color:'#3B82F6',lineHeight:1.6}}>
            Integre com D4Sign, ClickSign ou DocuSign. Cole o link de assinatura gerado na plataforma escolhida. Recomendamos D4Sign ou ClickSign para validade jurídica plena no Brasil (ICP-Brasil).
          </div>
        </div>
        {st&&(
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:st.color,flexShrink:0}}/>
            <span style={{fontSize:12,fontWeight:600,color:st.color}}>{st.label}</span>
            {prop.assinatura_concluida_em&&<span style={{fontSize:11,color:'var(--text-muted)',marginLeft:'auto'}}>Concluída em {new Date(prop.assinatura_concluida_em).toLocaleDateString('pt-BR')}</span>}
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:4}}>Plataforma</div>
            <select value={plat} onChange={e=>setPlat(e.target.value)} style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)'}}>
              <option value="">Selecionar plataforma…</option>
              {[['d4sign','D4Sign'],['clicksign','ClickSign'],['docusign','DocuSign'],['adobe','Adobe Sign'],['outro','Outro']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:4}}>URL do documento para assinatura</div>
            <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://app.d4sign.com.br/desk/…" style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={salvarAssin} style={{padding:'7px 16px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>Salvar</button>
            {prop.assinatura_status==='enviada'&&(
              <button onClick={()=>salvar({...prop,assinatura_status:'concluida',assinatura_concluida_em:new Date().toISOString()})} style={{padding:'7px 16px',background:'#10B981',color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>Marcar como Assinada</button>
            )}
            {prop.assinatura_url&&<a href={prop.assinatura_url} target="_blank" rel="noreferrer" style={{padding:'7px 14px',border:'1px solid var(--border)',borderRadius:7,fontSize:12,color:'var(--text-soft)',textDecoration:'none',display:'flex',alignItems:'center'}}>Abrir link ↗</a>}
          </div>
        </div>
      </div>
    )
  }

  // ── Detail view ──
  if (selected) {
    const sc = PROP_STATUS_CFG[selected.status]||PROP_STATUS_CFG.rascunho
    const seqNext = {rascunho:'enviada',enviada:'aceita'}

    function avancar() {
      const next=seqNext[selected.status]; if(!next) return
      const now=new Date().toISOString()
      const log={id:`l-${Date.now()}`,evento:`Status → ${PROP_STATUS_CFG[next].label}`,usuario:'Você',data:now}
      salvar({...selected,status:next,
        enviada_em:next==='enviada'?now:selected.enviada_em,
        aceita_em:next==='aceita'?now:selected.aceita_em,
        version:selected.version+(next==='enviada'?1:0),
        log:[...(selected.log||[]),log],
      })
    }
    function recusar() {
      if(!window.confirm('Marcar como Recusada?')) return
      const now=new Date().toISOString()
      salvar({...selected,status:'recusada',log:[...(selected.log||[]),{id:`l-${Date.now()}`,evento:'Status → Recusada',usuario:'Você',data:now}]})
    }

    return (
      <>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <button onClick={()=>{setSelected(null);setDownloadModal(null)}} style={{display:'inline-flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:12,padding:'4px 0',fontFamily:'var(--font)',alignSelf:'flex-start'}}>
          ← Todas as propostas
        </button>

        {/* Editor */}
        <div style={{minWidth:0,display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200}}>
              <input value={selected.titulo} onChange={e=>setSelected(s=>({...s,titulo:e.target.value}))}
                style={{fontSize:18,fontWeight:800,color:'var(--text)',border:'none',outline:'none',background:'none',fontFamily:'var(--font)',width:'100%',padding:0}}/>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{selected.empresa_nome} · {selected.opp_titulo} · v{selected.version}
                {calcInvestimento(selected.itens||[], selected.tarifas||[]) > 0 && (
                  <span style={{marginLeft:10,color:'#10B981',fontWeight:700}}>{fmtBRL2(calcInvestimento(selected.itens||[], selected.tarifas||[]))}</span>
                )}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
              {/* Seletor de status */}
              <select value={selected.status}
                onChange={e=>{
                  const next=e.target.value; if(next===selected.status) return
                  const now=new Date().toISOString()
                  const log={id:`l-${Date.now()}`,evento:`Status → ${PROP_STATUS_CFG[next]?.label||next}`,usuario:profile?.nome||profile?.email||'Você',data:now}
                  salvar({...selected,status:next,
                    enviada_em:next==='enviada'&&!selected.enviada_em?now:selected.enviada_em,
                    aceita_em:next==='aceita'&&!selected.aceita_em?now:selected.aceita_em,
                    version:selected.version+(next==='enviada'&&selected.status!=='enviada'?1:0),
                    log:[...(selected.log||[]),log],
                  })
                }}
                style={{padding:'5px 28px 5px 10px',borderRadius:7,border:`1.5px solid ${sc.border}`,background:sc.bg,color:sc.color,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',outline:'none',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236B7280'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 8px center'}}>
                {Object.entries(PROP_STATUS_CFG).map(([k,v])=>(
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <div style={{width:1,height:20,background:'var(--border)',margin:'0 4px'}}/>
              <button onClick={()=>salvar(selected,true)}
                style={{padding:'6px 16px',background:propSaved?'#10B981':'var(--accent)',color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',transition:'background 0.2s',whiteSpace:'nowrap'}}>
                {propSaved ? '✓ Salvo' : 'Salvar'}
              </button>
              <div style={{width:1,height:20,background:'var(--border)',margin:'0 2px'}}/>
              <button onClick={()=>{
                const tmpl = templates.find(t=>t.id===selected.template_id)
                const doc  = tmpl?.documento_id ? docRelatorios.find(r=>r.id===tmpl.documento_id) : null
                const fases = (selected.itens||[]).filter(i=>i.nivel===1)
                const wbs   = fases.map(f=>({
                  nome: f.titulo,
                  atividades: (selected.itens||[]).filter(i=>i.nivel===2&&String(i.parent_id)===String(f.id))
                    .map(a=>({nome:a.titulo,horas:(Number(a.hr_analista)||0)+(Number(a.hr_coord)||0),mostrar:a.mostrar!==false}))
                }))
                const prodNome = produtos.find(p=>String(p.id)===String(selected.produto_id))?.nome||''
                const invest   = calcInvestimento(selected.itens||[], selected.tarifas||[])
                const pd = { nome:selected.titulo, empresa:selected.empresa_nome, wbs, tarifas:selected.tarifas||[], itens:selected.itens||[], produto:prodNome, investimento:invest }
                setDlHoras(false); setDlNome('cliente'); setDlFormato('word'); setDlErro('')
                setDownloadModal({ prop: selected, doc, pd })
              }} style={{padding:'6px 12px',border:'1px solid var(--border)',borderRadius:7,background:'none',color:'var(--text-soft)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)',display:'flex',alignItems:'center',gap:5}}>🖨 Imprimir</button>
              <button onClick={()=>excluir(selected.id)} title="Excluir" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:16,padding:'4px 6px'}}
                onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>🗑</button>
            </div>
          </div>

          <div style={{display:'flex',gap:2,background:'var(--surface2)',borderRadius:9,padding:3,border:'1px solid var(--border)',alignSelf:'flex-start'}}>
            {['escopo','equipe','assinatura','historico'].map(t=>(
              <button key={t} onClick={()=>setPropTab(t)} style={{padding:'6px 16px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:propTab===t?700:500,fontFamily:'var(--font)',background:propTab===t?'var(--surface)':'none',color:propTab===t?'var(--text)':'var(--text-muted)',boxShadow:propTab===t?'0 1px 3px rgba(0,0,0,0.12)':'none'}}>
                {{escopo:'Escopo',equipe:'Equipe',assinatura:'Assinatura',historico:'Histórico'}[t]}
              </button>
            ))}
          </div>

          {propTab==='escopo'    && <EscopoEditor    prop={selected}/>}
          {propTab==='equipe'    && <EquipeEditor    prop={selected}/>}
          {propTab==='assinatura'&& <AssinaturaPanel prop={selected}/>}
          {propTab==='historico' && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {!(selected.log||[]).length&&<div style={{textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:12}}>Nenhum evento registrado.</div>}
              {[...(selected.log||[])].reverse().map((l,i)=>(
                <div key={l.id||i} style={{padding:'8px 12px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{l.evento}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{l.usuario} · {l.data?new Date(l.data).toLocaleString('pt-BR'):''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de opções de impressão (dentro do early-return de selected) */}
      {downloadModal && (() => {
        const { prop, doc, pd } = downloadModal
        const empresa = companies.find(c => c.nome === prop.empresa_nome || String(c.id) === String(prop.empresa_id))
        const canalNome = empresa?.franquia_ar_nome || ''
        function fechar() { setDownloadModal(null); setDlErro('') }
        function confirmar() {
          if (dlNome === 'canal' && !canalNome) {
            setDlErro('O campo "Unidade de Atendimento" está em branco no cadastro da empresa. Preencha antes de continuar.')
            return
          }
          setDlErro('')
          const pdFinal = { ...pd, empresa: dlNome === 'canal' ? canalNome : (prop.empresa_nome || pd.empresa) }
          if (dlFormato === 'pdf') {
            const estilo = (() => { try { return { ...{cor_primaria:'#1E3A5F'}, ...JSON.parse(localStorage.getItem('prop:estilo')||'{}') } } catch(e) { return {cor_primaria:'#1E3A5F'} } })()
            const cor = estilo.cor_primaria || '#1E3A5F'
            const body = doc?.elementos?.length ? canvasToWordHtml(doc.elementos, pdFinal, cor, dlHoras) : ''
            const w = window.open('', '_blank')
            w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${pdFinal.nome||'Proposta'}</title><style>body{font-family:Arial,sans-serif;font-size:11pt;margin:40px}@media print{@page{margin:20mm}}</style></head><body>${body}</body></html>`)
            w.document.close(); w.focus()
            setTimeout(() => { w.print() }, 400)
          } else {
            downloadProposta(prop, doc, pdFinal, dlHoras)
          }
          fechar()
        }
        const bloqueado = dlNome === 'canal' && !canalNome
        const optBtn = (ativo, onClick, label) => (
          <button onClick={onClick} style={{flex:1,padding:'8px 12px',borderRadius:8,border:`1.5px solid ${ativo?'var(--accent)':'var(--border)'}`,background:ativo?'#EFF6FF':'var(--surface2)',color:ativo?'var(--accent)':'var(--text)',fontSize:13,fontWeight:ativo?700:400,cursor:'pointer',fontFamily:'var(--font)',transition:'all .15s',textAlign:'left',lineHeight:1.4}}>
            {label}
          </button>
        )
        return (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center'}}
            onClick={e=>{if(e.target===e.currentTarget)fechar()}}>
            <div style={{background:'var(--surface)',borderRadius:14,padding:'28px 32px',width:460,maxWidth:'90vw',boxShadow:'0 8px 40px rgba(0,0,0,0.18)',display:'flex',flexDirection:'column',gap:20}}>
              <div style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>Opções de impressão</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Detalhamento de horas no escopo</div>
                <div style={{display:'flex',gap:8}}>
                  {optBtn(!dlHoras, ()=>setDlHoras(false), 'Omitir horas')}
                  {optBtn(dlHoras,  ()=>setDlHoras(true),  'Incluir horas')}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Emitir em nome de</div>
                <div style={{display:'flex',gap:8}}>
                  {optBtn(dlNome==='cliente', ()=>{setDlNome('cliente');setDlErro('')}, `Empresa cliente — ${prop.empresa_nome||'—'}`)}
                  {optBtn(dlNome==='canal',   ()=>{setDlNome('canal');setDlErro('')},   `Canal de Atendimento${canalNome?' — '+canalNome:''}`)}
                </div>
                {dlNome==='canal'&&!canalNome&&(
                  <div style={{fontSize:11,color:'#f97316',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:6,padding:'6px 10px'}}>
                    Nenhum Canal de Atendimento cadastrado para esta empresa.
                  </div>
                )}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Formato de saída</div>
                <div style={{display:'flex',gap:8}}>
                  {optBtn(dlFormato==='word', ()=>setDlFormato('word'), '📄 Word (.doc)')}
                  {optBtn(dlFormato==='pdf',  ()=>setDlFormato('pdf'),  '🖨 PDF / Imprimir')}
                </div>
              </div>
              {dlErro && <div style={{fontSize:12,color:'#DC2626',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px'}}>{dlErro}</div>}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
                <button onClick={fechar} style={{padding:'8px 18px',borderRadius:8,border:'1px solid var(--border)',background:'none',color:'var(--text)',fontSize:13,cursor:'pointer',fontFamily:'var(--font)'}}>Cancelar</button>
                <button onClick={confirmar} disabled={bloqueado}
                  style={{padding:'8px 20px',borderRadius:8,border:'none',background:bloqueado?'#d1d5db':'var(--accent)',color:'#fff',fontSize:13,fontWeight:600,cursor:bloqueado?'not-allowed':'pointer',fontFamily:'var(--font)'}}>
                  {dlFormato==='pdf' ? '🖨 Imprimir / PDF' : '📄 Baixar Word'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      </>
    )
  }

  // ── Template detail view ──
  if (subView === 'templates' && selectedTmpl) {
    const tmplTabs = [
      { id:'wbs',     label:'WBS / Escopo'   },
      { id:'tarifas', label:'Tarifas'         },
      { id:'produtos',label:'Produto'         },
      { id:'documento', label:'Documento'       },
      { id:'regras',   label:'Regras'          },
      { id:'versoes',  label:'Versões'         },
    ]
    const st = selectedTmpl
    const totals = calcPhaseTotals(st.itens||[])
    const tA = Object.values(totals).reduce((s,t)=>s+t.hr_analista,0)
    const tC = Object.values(totals).reduce((s,t)=>s+t.hr_coord,0)
    const invest = calcInvestimento(st.itens||[], st.tarifas||[])
    const inpSt2 = { padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)', width:'100%', boxSizing:'border-box' }

    return (
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {importing && <ImportModal tmplId={st.id} onClose={()=>setImporting(false)}/>}

        {/* Header */}
        <div>
          <button onClick={()=>{setSelectedTmpl(null);setTmplTab('wbs')}}
            style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:11,padding:'0 0 6px',fontFamily:'var(--font)',display:'flex',alignItems:'center',gap:4}}>
            ← Templates
          </button>
          <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
            <div style={{flex:1,minWidth:0}}>
              <input value={st.nome} onChange={e=>salvarTemplate({...st,nome:e.target.value})}
                style={{fontSize:18,fontWeight:700,color:'var(--text)',border:'none',outline:'none',background:'none',fontFamily:'var(--font)',width:'100%',padding:0,letterSpacing:'-0.3px'}}/>
              <input value={st.descricao||''} onChange={e=>salvarTemplate({...st,descricao:e.target.value})}
                placeholder="Descrição do template…"
                style={{fontSize:12,color:'var(--text-muted)',border:'none',outline:'none',background:'none',fontFamily:'var(--font)',width:'100%',padding:0,marginTop:2}}/>
              <div style={{display:'flex',gap:14,marginTop:8,fontSize:12,color:'var(--text-muted)',flexWrap:'wrap'}}>
                <span>{(st.itens||[]).filter(i=>i.nivel===1).length} fases · {(st.itens||[]).filter(i=>i.nivel===2).length} atividades</span>
                <span>Analista: <strong style={{color:'var(--text)'}}>{decToHHMM(tA)}</strong></span>
                <span>Coord.: <strong style={{color:'var(--text)'}}>{decToHHMM(tC)}</strong></span>
                <span>Total: <strong style={{color:'var(--accent)'}}>{decToHHMM(tA+tC)}</strong></span>
                {invest>0 && <span>Investimento: <strong style={{color:'#10B981'}}>{fmtBRL2(invest)}</strong></span>}
              </div>
            </div>
            <div style={{display:'flex',gap:8,flexShrink:0,alignItems:'center',marginTop:4}}>
              <button onClick={()=>setImporting(true)} style={{padding:'6px 12px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text-soft)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)'}}>
                ↑ Importar WBS
              </button>
              <button onClick={()=>excluirTemplate(st.id)} style={{padding:'6px 10px',border:'1px solid #EF444444',borderRadius:7,background:'none',color:'#EF4444',fontSize:12,cursor:'pointer',fontFamily:'var(--font)'}}>
                Excluir
              </button>
              <button onClick={()=>{salvarTemplate(selectedTmpl);setTmplSaved(true);setTimeout(()=>setTmplSaved(false),2000)}}
                style={{padding:'6px 16px',background:tmplSaved?'#10B981':'var(--accent)',color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',transition:'background 0.2s',minWidth:72}}>
                {tmplSaved ? '✓ Salvo' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{display:'flex',gap:2,background:'var(--surface2)',borderRadius:9,padding:3,border:'1px solid var(--border)',alignSelf:'flex-start',flexWrap:'wrap'}}>
          {tmplTabs.map(({id,label})=>(
            <button key={id} onClick={()=>setTmplTab(id)}
              style={{padding:'5px 13px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:tmplTab===id?700:500,fontFamily:'var(--font)',background:tmplTab===id?'var(--surface)':'none',color:tmplTab===id?'var(--text)':'var(--text-muted)',boxShadow:tmplTab===id?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>
              {label}
            </button>
          ))}
        </div>

        {/* WBS tab */}
        {tmplTab==='wbs' && (
          <WBSTable itens={st.itens||[]} onChange={newItens=>salvarTemplate({...st,itens:newItens})}/>
        )}

        {/* Tarifas tab */}
        {tmplTab==='tarifas' && (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{padding:'10px 14px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:8,fontSize:11,color:'#1D4ED8',lineHeight:1.6}}>
              Defina o valor/hora por tipo de profissional. O investimento total é calculado automaticamente cruzando com as horas do WBS.
            </div>
            <div style={{border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'var(--surface2)'}}>
                    {['Papel','Valor / hora'].map(h=><th key={h} style={{padding:'8px 14px',fontSize:11,fontWeight:600,color:'var(--text-muted)',textAlign:'left',borderBottom:'1px solid var(--border)'}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(st.tarifas||DEFAULT_TARIFAS).map((t,i)=>(
                    <tr key={t.id||i} style={{borderBottom:'1px solid var(--border2)'}}>
                      <td style={{padding:'10px 14px',fontSize:13,color:'var(--text)',fontWeight:600}}>{t.label}</td>
                      <td style={{padding:'8px 14px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:12,color:'var(--text-muted)'}}>R$</span>
                          <input type="number" min="0" step="10" value={t.valor_hora||''} placeholder="0,00"
                            onChange={e=>{
                              const newTarifas=(st.tarifas||DEFAULT_TARIFAS).map((x,j)=>j===i?{...x,valor_hora:Number(e.target.value)}:x)
                              salvarTemplate({...st,tarifas:newTarifas})
                            }}
                            style={{width:100,padding:'6px 8px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--mono)'}}/>
                          <span style={{fontSize:11,color:'var(--text-muted)'}}>/hora</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invest>0 && (
              <div style={{padding:'14px 16px',background:'linear-gradient(135deg,#ECFDF5,#D1FAE5)',border:'1px solid #10B98133',borderRadius:10}}>
                <div style={{fontSize:11,color:'#065F46',marginBottom:4}}>Investimento estimado (horas WBS × tarifas)</div>
                <div style={{fontSize:22,fontWeight:800,color:'#065F46'}}>{fmtBRL2(invest)}</div>
              </div>
            )}
          </div>
        )}

        {/* Produtos tab */}
        {tmplTab==='produtos' && <ProdutoSearch produto_id={st.produto_id} onChange={id=>salvarTemplate({...st,produto_id:id})}/>}

        {/* Documento tab — CanvasEditor para proposta */}
        {tmplTab==='documento' && (() => {
          const docVinculado = docRelatorios.find(r => r.id === st.documento_id) || null
          return (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{padding:'10px 14px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,fontSize:11,color:'var(--text-soft)',lineHeight:1.6}}>
                Editor visual de documento — configure cabeçalho, rodapé, marca d'água e insira blocos de texto, gráficos, KPIs e tabelas de dados reais.
              </div>
              {docVinculado ? (
                <div style={{border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:36,height:36,background:'var(--accent-glow)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>📄</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{docVinculado.titulo}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>{docVinculado.elementos?.length||0} elementos · {docVinculado.status}</div>
                  </div>
                  <button onClick={()=>setEditandoDoc(true)}
                    style={{padding:'7px 16px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',flexShrink:0}}>
                    Editar documento
                  </button>
                </div>
              ) : (
                <button onClick={async ()=>{
                  const novo = { id:`local_${Date.now()}`, titulo:`Documento — ${st.nome||'Template'}`, tipo:'proposta', config:{}, elementos:[], acesso:'privado', papeis_permitidos:[], status:'rascunho' }
                  const result = await saveDocRelatorio(novo)
                  if (result?.ok && result.relatorio) {
                    salvarTemplate({...st, documento_id: result.relatorio.id})
                    setEditandoDoc(true)
                  }
                }} style={{alignSelf:'flex-start',padding:'9px 18px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)'}}>
                  + Criar documento
                </button>
              )}
              {editandoDoc && docVinculado && (
                <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0,overflow:'hidden',margin:'0 -28px -24px',borderTop:'1px solid var(--border2)'}}>
                  <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'400px',color:'var(--text-muted)'}}>Carregando editor…</div>}>
                    <CanvasEditor
                      relatorio={docVinculado}
                      onSave={async (rel)=>{
                        const r = await saveDocRelatorio(rel)
                        return r
                      }}
                      onBack={()=>setEditandoDoc(false)}
                      mode="proposta"
                      projetoData={(() => {
                        const fases = (st.itens||[]).filter(i=>i.nivel===1)
                        const wbs = fases.map(f=>({
                          nome: f.titulo,
                          atividades: (st.itens||[]).filter(i=>i.nivel===2&&String(i.parent_id)===String(f.id))
                            .map(a=>({ nome: a.titulo, horas: (Number(a.hr_analista)||0)+(Number(a.hr_coord)||0), mostrar: a.mostrar !== false }))
                        }))
                        const prodNome = produtos.find(p=>String(p.id)===String(st.produto_id))?.nome || ''
                        return { nome: st.nome, empresa: '', wbs, tarifas: st.tarifas||[], itens: st.itens||[], produto: prodNome, investimento: invest }
                      })()}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          )
        })()}

        {/* Regras tab */}
        {tmplTab==='regras' && (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{padding:'10px 14px',background:'#FEF3C7',border:'1px solid #F59E0B33',borderRadius:8,fontSize:11,color:'#92400E',lineHeight:1.7}}>
              <strong>Como funciona:</strong> ao criar uma proposta, o sistema pergunta os dados do cliente. As regras que satisfazem as condições ajustam as horas do WBS automaticamente.
            </div>
            {/* Operator selector */}
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--text-soft)'}}>
              <span>Operador entre regras:</span>
              {['E','OU'].map(op=>(
                <button key={op} onClick={()=>salvarTemplate({...st,operador_regras:op})}
                  style={{padding:'3px 12px',borderRadius:20,border:'1px solid var(--border)',fontSize:11,cursor:'pointer',fontFamily:'var(--font)',fontWeight:(st.operador_regras||'OU')===op?700:400,background:(st.operador_regras||'OU')===op?'var(--accent)':'var(--surface)',color:(st.operador_regras||'OU')===op?'#fff':'var(--text-muted)'}}>
                  {op}
                </button>
              ))}
              <span style={{fontSize:10,color:'var(--text-muted)',fontStyle:'italic'}}>{(st.operador_regras||'OU')==='E'?'Todas as regras devem ser satisfeitas':'Qualquer regra satisfeita é suficiente'}</span>
            </div>
            {/* Compact rules list */}
            <div style={{border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
              {(st.regras||[]).map((regra,idx,arr)=>{
                const campoCfg = REGRA_CAMPOS.find(c=>c.value===regra.condicao?.campo)
                const ops = REGRA_OPERADORES[campoCfg?.tipo||'number']
                return (
                  <div key={regra.id}>
                    <div style={{display:'flex',gap:6,alignItems:'center',padding:'8px 12px',background:regra.ativo!==false?'var(--surface)':'var(--surface2)',borderBottom:idx<arr.length-1?'1px solid var(--border2)':'none',fontSize:11}}>
                      <input type="checkbox" checked={regra.ativo!==false} onChange={e=>{
                        salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,ativo:e.target.checked}:r)})
                      }} style={{accentColor:'var(--accent)',flexShrink:0}}/>
                      <input value={regra.descricao||''} onChange={e=>{
                        salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,descricao:e.target.value}:r)})
                      }} placeholder="Descrição…" style={{...inpSt2,fontSize:11,width:120,flex:'0 0 120px'}}/>
                      <select value={regra.condicao?.campo||''} onChange={e=>{
                        salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,condicao:{...r.condicao,campo:e.target.value,operador:'',valor:''}}:r)})
                      }} style={{...inpSt2,fontSize:11,flex:'0 0 130px',width:130}}>
                        <option value="">Variável…</option>
                        {REGRA_CAMPOS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      {campoCfg?.tipo==='number'?(
                        <>
                          <select value={regra.condicao?.operador||''} onChange={e=>{
                            salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,condicao:{...r.condicao,operador:e.target.value}}:r)})
                          }} style={{...inpSt2,fontSize:11,flex:'0 0 90px',width:90}}>
                            <option value="">Op…</option>
                            {(ops||[]).map(o=><option key={o.v} value={o.v}>{o.label}</option>)}
                          </select>
                          <input type="number" value={regra.condicao?.valor||''} placeholder="Valor" onChange={e=>{
                            salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,condicao:{...r.condicao,valor:Number(e.target.value)}}:r)})
                          }} style={{...inpSt2,fontSize:11,flex:'0 0 60px',width:60}}/>
                        </>
                      ):campoCfg?.tipo==='bool'?(
                        <select value={regra.condicao?.operador||''} onChange={e=>{
                          salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,condicao:{...r.condicao,operador:e.target.value}}:r)})
                        }} style={{...inpSt2,fontSize:11,flex:'0 0 110px',width:110}}>
                          <option value="">Selecionar…</option>
                          {(ops||[]).map(o=><option key={o.v} value={o.v}>{o.label}</option>)}
                        </select>
                      ):(<span style={{flex:'0 0 160px',color:'var(--text-muted)',fontSize:10}}>← escolha variável</span>)}
                      <span style={{color:'var(--text-muted)',fontSize:11,flexShrink:0}}>→</span>
                      <select value={regra.acao?.fase_id||''} onChange={e=>{
                        salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,acao:{...r.acao,fase_id:e.target.value}}:r)})
                      }} style={{...inpSt2,fontSize:11,flex:'0 0 110px',width:110}}>
                        <option value="">Fase…</option>
                        {(st.itens||[]).filter(i=>i.nivel===1).map(f=><option key={f.id} value={f.id}>{f.titulo}</option>)}
                      </select>
                      <select value={regra.acao?.tipo||''} onChange={e=>{
                        salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,acao:{...r.acao,tipo:e.target.value}}:r)})
                      }} style={{...inpSt2,fontSize:11,flex:'0 0 120px',width:120}}>
                        <option value="">Ajuste…</option>
                        {ACAO_TIPOS.map(a=><option key={a.v} value={a.v}>{a.label}</option>)}
                      </select>
                      <input type="number" min="0" value={regra.acao?.quantidade||''} placeholder="Qtd" onChange={e=>{
                        salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,acao:{...r.acao,quantidade:Number(e.target.value)}}:r)})
                      }} style={{...inpSt2,fontSize:11,flex:'0 0 55px',width:55}}/>
                      <select value={regra.acao?.campo_hora||'ambas'} onChange={e=>{
                        salvarTemplate({...st,regras:(st.regras||[]).map((r,j)=>j===idx?{...r,acao:{...r.acao,campo_hora:e.target.value}}:r)})
                      }} style={{...inpSt2,fontSize:11,flex:'0 0 110px',width:110}}>
                        {CAMPO_HORA_OPTS.map(c=><option key={c.v} value={c.v}>{c.label}</option>)}
                      </select>
                      <button onClick={()=>salvarTemplate({...st,regras:(st.regras||[]).filter((_,j)=>j!==idx)})}
                        style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:13,padding:'2px 4px',flexShrink:0}}
                        onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>✕</button>
                    </div>
                    {idx<arr.length-1&&(
                      <div style={{display:'flex',justifyContent:'center',padding:'2px 0',background:'var(--surface2)',borderBottom:'1px solid var(--border2)'}}>
                        <span style={{fontSize:9,fontWeight:700,color:'var(--text-muted)',letterSpacing:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'1px 8px'}}>{st.operador_regras||'OU'}</span>
                      </div>
                    )}
                  </div>
                )
              })}
              {!(st.regras||[]).length&&<div style={{padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:11}}>Nenhuma regra. Adicione abaixo.</div>}
            </div>
            <button onClick={()=>{
              const nr=[...(st.regras||[]),{id:`r-${Date.now()}`,ativo:true,descricao:'',condicao:{campo:'',operador:'',valor:''},acao:{fase_id:'',tipo:'',quantidade:0,campo_hora:'ambas'}}]
              salvarTemplate({...st,regras:nr})
            }} style={{alignSelf:'flex-start',padding:'6px 14px',background:'none',border:'1px dashed var(--border)',borderRadius:7,fontSize:12,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font)'}}>
              + Adicionar regra
            </button>
          </div>
        )}


        {/* Versões tab */}
        {tmplTab==='versoes' && (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{padding:'10px 14px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,fontSize:11,color:'var(--text-soft)',lineHeight:1.6}}>
              As versões registram o estado atual do template. Use para rastrear revisões antes de enviar propostas.
            </div>
            {/* Create version */}
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input value={versaoDesc} onChange={e=>setVersaoDesc(e.target.value)}
                placeholder="Descreva o que mudou nesta versão…"
                style={{...inpSt2,flex:1,fontSize:12}}
                onKeyDown={e=>{if(e.key==='Enter'&&versaoDesc.trim()){
                  const nv={id:`v-${Date.now()}`,numero:(st.versoes||[]).length+1,data:new Date().toISOString(),descricao:versaoDesc.trim()||`Versão ${(st.versoes||[]).length+1}`,snapshot:{blocos:JSON.parse(JSON.stringify(st.blocos||[])),regras:JSON.parse(JSON.stringify(st.regras||[])),itens:JSON.parse(JSON.stringify(st.itens||[])),tarifas:JSON.parse(JSON.stringify(st.tarifas||[]))}}
                  salvarTemplate({...st,versoes:[...(st.versoes||[]),nv]});setVersaoDesc('')
                }}}/>
              <button onClick={()=>{
                const nv={id:`v-${Date.now()}`,numero:(st.versoes||[]).length+1,data:new Date().toISOString(),descricao:versaoDesc.trim()||`Versão ${(st.versoes||[]).length+1}`,snapshot:{blocos:JSON.parse(JSON.stringify(st.blocos||[])),regras:JSON.parse(JSON.stringify(st.regras||[])),itens:JSON.parse(JSON.stringify(st.itens||[])),tarifas:JSON.parse(JSON.stringify(st.tarifas||[]))}}
                salvarTemplate({...st,versoes:[...(st.versoes||[]),nv]});setVersaoDesc('')
              }} style={{padding:'7px 14px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',whiteSpace:'nowrap'}}>
                + Criar versão
              </button>
            </div>
            {/* Versions list */}
            {(st.versoes||[]).length===0 ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
                <div style={{fontSize:24,marginBottom:8}}>🗂</div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Nenhuma versão registrada</div>
                <div style={{fontSize:11}}>Crie uma versão para começar a rastrear alterações.</div>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[...(st.versoes||[])].reverse().map(v=>(
                  <div key={v.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:10}}>
                    <div style={{flexShrink:0,width:36,height:36,borderRadius:'50%',background:'var(--accent-glow)',border:'2px solid var(--accent)55',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'var(--accent)'}}>
                      v{v.numero}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2}}>{v.descricao}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(v.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                      <span style={{fontSize:10,padding:'2px 8px',background:'var(--surface2)',borderRadius:10,color:'var(--text-muted)',border:'1px solid var(--border)'}}>
                        {(v.snapshot?.blocos||[]).length} blocos · {(v.snapshot?.regras||[]).length} regras
                      </span>
                      <button onClick={()=>{
                        if(!window.confirm(`Restaurar para "${v.descricao}"? As alterações atuais serão perdidas.`)) return
                        salvarTemplate({...st,blocos:JSON.parse(JSON.stringify(v.snapshot?.blocos||[])),regras:JSON.parse(JSON.stringify(v.snapshot?.regras||[])),itens:JSON.parse(JSON.stringify(v.snapshot?.itens||[])),tarifas:JSON.parse(JSON.stringify(v.snapshot?.tarifas||[]))})
                      }} style={{padding:'5px 10px',fontSize:11,border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text-soft)',cursor:'pointer',fontFamily:'var(--font)'}}>
                        Restaurar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Templates list view ──
  if (subView === 'templates') {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, minHeight: 52 }}>
          <div style={{display:'flex',gap:2,background:'var(--surface2)',borderRadius:9,padding:3,border:'1px solid var(--border)'}}>
            {[['propostas','Propostas'],['templates','Templates']].map(([k,l])=>(
              <button key={k} onClick={()=>setSubView(k)}
                style={{padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:subView===k?700:500,fontFamily:'var(--font)',background:subView===k?'var(--accent)':'none',color:subView===k?'#fff':'var(--text-muted)'}}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={novoTemplate} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
            + Novo Template
          </button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {templates.map(t=>{
            const nFases = (t.itens||[]).filter(i=>i.nivel===1).length
            const nAtiv  = (t.itens||[]).filter(i=>i.nivel===2).length
            const totals = calcPhaseTotals(t.itens||[])
            const tH = Object.values(totals).reduce((s,v)=>s+v.hr_analista+v.hr_coord,0)
            return (
              <div key={t.id} onClick={()=>setSelectedTmpl(t)}
                style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:10,cursor:'pointer',borderLeft:'4px solid var(--accent)',transition:'box-shadow 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{t.nome}</div>
                  {t.descricao&&<div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{t.descricao}</div>}
                </div>
                <div style={{display:'flex',gap:12,fontSize:11,color:'var(--text-muted)',flexShrink:0}}>
                  <span>{nFases} fases · {nAtiv} atividades</span>
                  {tH>0&&<span style={{fontFamily:'var(--mono)',color:'var(--accent)',fontWeight:700}}>{decToHHMM(tH)} total</span>}
                  <span style={{color:'var(--accent)',fontWeight:600}}>Editar →</span>
                </div>
              </div>
            )
          })}
          {!templates.length&&<div style={{textAlign:'center',padding:'60px 0',color:'var(--text-muted)'}}>
            <div style={{fontSize:32,marginBottom:12}}>📐</div>
            <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Nenhum template</div>
            <div style={{fontSize:12}}>Crie o primeiro template de escopo para usar nas propostas</div>
          </div>}
        </div>
      </div>
    )
  }

  // ── List view (propostas) ──
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {showKpis && <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {label:'Total',    value:propostas.length,                                        color:'var(--border)'},
          {label:'Enviadas', value:propostas.filter(p=>p.status==='enviada').length,        color:'#3B82F6'},
          {label:'Aceitas',  value:propostas.filter(p=>p.status==='aceita').length,         color:'#10B981'},
          {label:'Assinadas',value:propostas.filter(p=>p.assinatura_status==='concluida').length, color:'var(--accent)'},
        ].map(m=>(
          <div key={m.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',borderTop:`3px solid ${m.color}`}}>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:22,fontWeight:800,color:'var(--text)'}}>{m.value}</div>
          </div>
        ))}
      </div>}

      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap', minHeight: 52 }}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:2,background:'var(--surface2)',borderRadius:9,padding:3,border:'1px solid var(--border)'}}>
            {[['propostas','Propostas'],['templates','Templates']].map(([k,l])=>(
              <button key={k} onClick={()=>setSubView(k)}
                style={{padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:subView===k?700:500,fontFamily:'var(--font)',background:subView===k?'var(--accent)':'none',color:subView===k?'#fff':'var(--text-muted)'}}>
                {l}
              </button>
            ))}
          </div>
          {/* Seletor de oportunidade com busca ──────────────────────────────── */}
          {(() => {
            const [oppQ, setOppQ] = [filterOppQ, setFilterOppQ]
            const [open, setOpen] = [oppPickerOpen, setOppPickerOpen]
            const selected = oppOptions.find(o => String(o.id) === filterOpp)
            const matches  = oppOptions
              .filter(o => !oppQ || `${o.empresa_nome} ${o.titulo}`.toLowerCase().includes(oppQ.toLowerCase()))
              .slice(0, 10)
            return (
              <div style={{position:'relative'}} ref={oppPickerRef}>
                <button onClick={()=>setOpen(v=>!v)}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color: selected?'var(--text)':'var(--text-muted)',fontSize:12,outline:'none',fontFamily:'var(--font)',cursor:'pointer',minWidth:220,maxWidth:320,textAlign:'left',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>
                    {selected ? `${selected.empresa_nome} — ${selected.titulo}` : 'Todas as oportunidades'}
                  </span>
                  {selected && <span onClick={e=>{e.stopPropagation();setFilterOpp('');setOppQ('')}} style={{color:'var(--text-muted)',fontSize:14,lineHeight:1,padding:'0 2px'}}>×</span>}
                  <span style={{color:'var(--text-muted)',fontSize:10}}>▾</span>
                </button>
                {open && (
                  <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:400,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.14)',width:340,overflow:'hidden'}}>
                    <div style={{padding:'8px 10px',borderBottom:'1px solid var(--border2)'}}>
                      <input autoFocus value={oppQ} onChange={e=>setOppQ(e.target.value)}
                        placeholder="Buscar empresa ou oportunidade…"
                        style={{width:'100%',boxSizing:'border-box',padding:'6px 10px',border:'1px solid var(--border)',borderRadius:7,fontSize:12,background:'var(--surface2)',color:'var(--text)',fontFamily:'var(--font)',outline:'none'}} />
                    </div>
                    <div style={{maxHeight:280,overflowY:'auto'}}>
                      <div onClick={()=>{setFilterOpp('');setOppQ('');setOpen(false)}}
                        style={{padding:'9px 14px',fontSize:12,cursor:'pointer',color:'var(--text-muted)',borderBottom:'1px solid var(--border2)',background:!filterOpp?'var(--surface2)':'transparent'}}>
                        Todas as oportunidades
                      </div>
                      {matches.length === 0
                        ? <div style={{padding:'16px 14px',fontSize:12,color:'var(--text-muted)',textAlign:'center'}}>Nenhum resultado</div>
                        : matches.map(o => (
                          <div key={o.id} onClick={()=>{setFilterOpp(String(o.id));setOppQ('');setOpen(false)}}
                            style={{padding:'9px 14px',fontSize:12,cursor:'pointer',borderBottom:'1px solid var(--border2)',background:filterOpp===String(o.id)?'var(--accent-lite)':'transparent',
                              color:filterOpp===String(o.id)?'var(--accent)':'var(--text)'}}
                            onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                            onMouseLeave={e=>e.currentTarget.style.background=filterOpp===String(o.id)?'var(--accent-lite)':'transparent'}>
                            <div style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.empresa_nome}</div>
                            <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.titulo}</div>
                          </div>
                        ))
                      }
                      {oppOptions.filter(o => !oppQ || `${o.empresa_nome} ${o.titulo}`.toLowerCase().includes(oppQ.toLowerCase())).length > 10 && (
                        <div style={{padding:'7px 14px',fontSize:11,color:'var(--text-muted)',textAlign:'center',borderTop:'1px solid var(--border2)'}}>
                          Mostrando 10 de {oppOptions.filter(o=>!oppQ||`${o.empresa_nome} ${o.titulo}`.toLowerCase().includes(oppQ.toLowerCase())).length} — refine a busca
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
          <select value={filterSt} onChange={e=>setFilterSt(e.target.value)} style={{padding:'7px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text)',fontSize:12,outline:'none',fontFamily:'var(--font)'}}>
            <option value="">Todos os status</option>
            {Object.entries(PROP_STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button onClick={()=>setCriando(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
          + Nova Proposta
        </button>
      </div>

      {filtered.length===0?(
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--text-muted)'}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Nenhuma proposta ainda</div>
          <div style={{fontSize:12}}>Clique em "+ Nova Proposta" para começar</div>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {filtered.map(prop=>{
            const sc=PROP_STATUS_CFG[prop.status]||PROP_STATUS_CFG.rascunho
            const asst=prop.assinatura_status?ASSIN_STATUS_CFG[prop.assinatura_status]:null
            const inclH=(prop.escopo||[]).filter(e=>e.status==='incluido').reduce((s,e)=>s+Number(e.horas||0),0)
            return (
              <div key={prop.id} onClick={()=>{setSelected(prop);setPropTab('escopo')}}
                style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:10,cursor:'pointer',borderLeft:`4px solid ${sc.border}`,transition:'box-shadow 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{prop.titulo}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:3}}>{prop.empresa_nome} · {prop.opp_titulo} · {inclH}h estimadas · v{prop.version}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                  {asst&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'#EFF6FF',color:asst.color,fontWeight:600}}>{asst.label}</span>}
                  <span style={{fontSize:11,padding:'3px 10px',borderRadius:10,fontWeight:700,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>{sc.label}</span>
                  <span style={{fontSize:11,color:'var(--text-muted)',fontFamily:'var(--mono)'}}>{prop.updated_at?new Date(prop.updated_at).toLocaleDateString('pt-BR'):''}</span>
                  <span style={{fontSize:12,color:'var(--accent)',fontWeight:600}}>Editar →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {criando&&(
        <>
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1199}} onClick={()=>setCriando(false)}/>
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:1200,width:520,maxWidth:'95vw',background:'var(--surface)',borderRadius:14,boxShadow:'0 16px 56px rgba(0,0,0,0.22)',overflow:'hidden'}}>
            {(() => {
              const tmplSel = templates.find(t=>t.id===wTemplId)
              const hasRules = tmplSel?.regras?.length > 0
              const totalSteps = hasRules ? 3 : 2
              return (
                <div style={{padding:'16px 20px 12px',borderBottom:'1px solid var(--border)'}}>
                  <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>Nova Proposta de Implantação</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Passo {wStep} de {totalSteps}{wStep===2&&hasRules?' — Variáveis do projeto':''}</div>
                </div>
              )
            })()}
            <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:14}}>
              {wStep===1&&(
                <>
                  <OppSearch oppOptions={oppOptions} value={wOppId} onChange={setWOppId} />
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:6}}>Template de escopo</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {templates.map(t=>{
                        const nF=(t.itens||[]).filter(i=>i.nivel===1).length
                        const nA=(t.itens||[]).filter(i=>i.nivel===2).length
                        return (
                          <label key={t.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',border:`1px solid ${wTemplId===t.id?'var(--accent)':'var(--border)'}`,borderRadius:8,cursor:'pointer',background:wTemplId===t.id?'var(--accent-glow)':'var(--surface)'}}>
                            <input type="radio" checked={wTemplId===t.id} onChange={()=>setWTemplId(t.id)} style={{marginTop:2,accentColor:'var(--accent)'}}/>
                            <div>
                              <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{t.nome}</div>
                              {t.descricao&&<div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{t.descricao}</div>}
                              {(nF>0||nA>0)&&<div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{nF} fases · {nA} atividades</div>}
                            </div>
                          </label>
                        )
                      })}
                      {!templates.length&&<div style={{fontSize:12,color:'var(--text-muted)',padding:'8px 12px'}}>Nenhum template disponível. <span style={{color:'var(--accent)',cursor:'pointer'}} onClick={()=>{setCriando(false);setSubView('templates')}}>Criar template →</span></div>}
                    </div>
                  </div>
                </>
              )}
              {wStep===2&&(()=>{
                const tmplSel = templates.find(t=>t.id===wTemplId)
                const hasRules = tmplSel?.regras?.length > 0
                // Collect unique campos needed by this template's rules
                const camposNeeded = [...new Set((tmplSel?.regras||[]).map(r=>r.condicao?.campo).filter(Boolean))]
                if (!hasRules) {
                  return (
                    <div>
                      <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:6}}>Título da proposta</div>
                      <input autoFocus value={wTitulo} onChange={e=>setWTitulo(e.target.value)}
                        placeholder={`Proposta de Implantação — ${oppOptions.find(o=>String(o.id)===wOppId)?.empresa_nome||''}`}
                        style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)',boxSizing:'border-box'}}/>
                    </div>
                  )
                }
                // Has rules — show variables form
                const firedNow = evalRulesLog(tmplSel?.regras||[], wVars)
                return (
                  <div style={{display:'flex',flexDirection:'column',gap:14}}>
                    <div style={{padding:'9px 12px',background:'#FEF3C7',border:'1px solid #F59E0B33',borderRadius:7,fontSize:11,color:'#92400E'}}>
                      Este template tem <strong>{tmplSel.regras.length} regras de ajuste</strong>. Preencha os dados do cliente para aplicar automaticamente.
                    </div>
                    {camposNeeded.map(campo=>{
                      const cfg = VARIAVEIS_CFG.find(v=>v.campo===campo)
                      if (!cfg) return null
                      return (
                        <div key={campo}>
                          <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:5}}>{cfg.label}</div>
                          {cfg.tipo==='number' ? (
                            <input type="number" min="0" value={wVars[campo]||''} onChange={e=>setWVars(v=>({...v,[campo]:Number(e.target.value)}))}
                              placeholder="0"
                              style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)',boxSizing:'border-box'}}/>
                          ) : (
                            <div style={{display:'flex',gap:8}}>
                              {[['sim','Sim'],['nao','Não']].map(([v,l])=>(
                                <label key={v} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:`1px solid ${wVars[campo]===v?'var(--accent)':'var(--border)'}`,borderRadius:7,cursor:'pointer',background:wVars[campo]===v?'var(--accent-glow)':'var(--surface)'}}>
                                  <input type="radio" checked={wVars[campo]===v} onChange={()=>setWVars(prev=>({...prev,[campo]:v}))} style={{accentColor:'var(--accent)'}}/>
                                  <span style={{fontSize:13,color:'var(--text)'}}>{l}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {firedNow.length > 0 && (
                      <div style={{padding:'10px 12px',background:'#D1FAE5',border:'1px solid #10B98133',borderRadius:7}}>
                        <div style={{fontSize:11,fontWeight:700,color:'#065F46',marginBottom:5}}>Regras que serão aplicadas:</div>
                        {firedNow.map(r=><div key={r.id} style={{fontSize:11,color:'#065F46'}}>• {r.descricao}</div>)}
                      </div>
                    )}
                  </div>
                )
              })()}
              {wStep===3&&(
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:6}}>Título da proposta</div>
                  <input autoFocus value={wTitulo} onChange={e=>setWTitulo(e.target.value)}
                    placeholder={`Proposta de Implantação — ${oppOptions.find(o=>String(o.id)===wOppId)?.empresa_nome||''}`}
                    style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)',boxSizing:'border-box'}}/>
                </div>
              )}
            </div>
            {(() => {
              const tmplSel = templates.find(t=>t.id===wTemplId)
              const hasRules = tmplSel?.regras?.length > 0
              const lastStep = hasRules ? 3 : 2
              return (
                <div style={{padding:'12px 20px 16px',borderTop:'1px solid var(--border2)',display:'flex',justifyContent:'space-between'}}>
                  <button onClick={()=>wStep===1?setCriando(false):setWStep(s=>s-1)} style={{padding:'7px 16px',background:'none',border:'1px solid var(--border)',borderRadius:7,fontSize:13,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font)'}}>
                    {wStep===1?'Cancelar':'← Voltar'}
                  </button>
                  {wStep < lastStep ? (
                    <button onClick={()=>{if(wStep===1&&!wOppId){alert('Selecione uma oportunidade.');return} setWStep(s=>s+1)}}
                      style={{padding:'7px 20px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
                      Próximo →
                    </button>
                  ) : (
                    <button onClick={criarProposta} style={{padding:'7px 20px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
                      Criar proposta
                    </button>
                  )}
                </div>
              )
            })()}
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
  const { projetos, phases, tasks, timeLogs, issues, members, save: saveProjeto, remove: removeProjeto, savePhase, saveTask, saveTasks, removeTask, saveTimeLog, saveIssue, removeIssue, setProjetos, setPhases, setTasks, setTimeLogs, setIssues, setMembers } = useProjects()
  const { save: saveTimeLogRemote, remove: removeTimeLogRemote } = useTimeLogs()
  const { records: csRecords, save: saveHealth } = useCustomerHealth()
  const { registrar: log } = useAuditLog()
  const { opps } = useOpportunities()
  const [attachments] = useState(MOCK_PROJECT_ATTACHMENTS)
  const [modal,        setModal]       = useState(null)
  const [drawer,       setDrawer]      = useState(null)
  const [filtros,      setFiltros]     = useState({ status: '', franchise: '' })
  const [filtrosOpen,  setFiltrosOpen] = useState(false)
  const [dragId,       setDragId]      = useState(null)
  const [tab,       setTab]       = useLocalState('projetos:tab', 'projetos')
  const [showKpis,  setShowKpis]  = useLocalState('projetos:showKpis', true)
  const [propostasEditing, setPropostasEditing] = useState(false)
  const { can } = usePermissions()
  // Cada aba do topo (Propostas/Recursos/Financeiro/Fechamento) é gateada por
  // uma ação própria dentro do módulo 'projetos' — personas diferentes (ex:
  // Gestor de Projetos x Financeiro) veem abas diferentes.
  const TAB_ACAO = { propostas: 'ver_propostas', recursos: 'ver_recursos', financeiro: 'ver_financeiro', fechamento: 'ver_fechamento' }
  const podeVerTab = t => !TAB_ACAO[t] || can('projetos', TAB_ACAO[t])

  // Handle ?tab=propostas URL param from Pipeline "Abrir em Projetos →" link
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const t = p.get('tab')
    if (t && ['propostas','recursos','financeiro','fechamento'].includes(t) && podeVerTab(t)) setTab(t)
  }, []) // eslint-disable-line

  // Se a aba atual (persistida de uma sessão anterior) não é mais permitida
  // pro perfil logado, volta pra Projetos em vez de deixar a tela em branco.
  useEffect(() => {
    if (!podeVerTab(tab)) setTab('projetos')
  }, [tab]) // eslint-disable-line

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

  // KPIs — aba Projetos
  const emAndamento = projetos.filter(p => p.status === 'em_andamento').length
  const totalHrsEst = projetos.reduce((s, p) => s + Number(p.total_hours_estimated), 0)
  const totalHrsExe = Object.values(execTotals).reduce((s, v) => s + v, 0)

  // KPIs — aba Propostas
  const [_propostas] = useLocalState(PROPOSTAS_KEY, [])
  const kpiPropostas = useMemo(() => ({
    total:     _propostas.length,
    enviadas:  _propostas.filter(p => p.status === 'enviada').length,
    aceitas:   _propostas.filter(p => p.status === 'aceita').length,
    assinadas: _propostas.filter(p => p.assinatura_status === 'concluida').length,
  }), [_propostas])

  // KPIs — aba Recursos
  const horasPorUserGlobal = useMemo(() => {
    const m = {}
    timeLogs.forEach(l => { const k = String(l.user_name || l.user_id || ''); if (k) m[k] = (m[k] || 0) + Number(l.hours_executed) })
    return m
  }, [timeLogs])
  const analistasGlobal = useMemo(() => {
    const from = new Set(timeLogs.map(l => l.user_name).filter(Boolean))
    const base  = members.length ? members : [...from].map(n => ({ id: n, nome: n }))
    return base
  }, [members, timeLogs])
  const kpiRecursos = useMemo(() => {
    const total = analistasGlobal.length
    const sobrecarregados = analistasGlobal.filter(u => {
      const h = horasPorUserGlobal[String(u.id || u.nome)] || 0; return (h / 160) * 100 >= 95
    }).length
    const disponiveis = analistasGlobal.filter(u => {
      const h = horasPorUserGlobal[String(u.id || u.nome)] || 0; return (h / 160) * 100 < 70
    }).length
    const totalH = Object.values(horasPorUserGlobal).reduce((s, v) => s + v, 0)
    return { total, sobrecarregados, disponiveis, totalH }
  }, [analistasGlobal, horasPorUserGlobal])

  // KPIs — aba Financeiro
  const kpiFinanceiro = useMemo(() => {
    const [fechamentos] = [JSON.parse(localStorage.getItem(FECHAMENTOS_KEY) || '[]')]
    const approvedIds = new Set()
    fechamentos.filter(f => f.status === 'aprovado').forEach(f => f.log_ids?.forEach(id => approvedIds.add(id)))
    const totalContrato = projetos.reduce((s, p) => s + Number(p.valor_contrato || 0), 0)
    const totalFaturado = projetos.reduce((s, p) => s + Number(p.valor_faturado || 0), 0)
    const totalCusto    = timeLogs.filter(l => approvedIds.has(l.id)).reduce((s, l) => s + Number(l.hours_executed) * 150, 0)
    const totalMargem   = totalFaturado - totalCusto
    const fmtBRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    return { totalContrato: fmtBRL(totalContrato), totalCusto: fmtBRL(totalCusto), totalFaturado: fmtBRL(totalFaturado), totalMargem: fmtBRL(totalMargem), margemNeg: totalMargem < 0 }
  }, [projetos, timeLogs])

  // KPIs — aba Fechamento
  const kpiFechamento = useMemo(() => {
    const fechamentos = JSON.parse(localStorage.getItem(FECHAMENTOS_KEY) || '[]')
    const now = new Date(); const mes = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    const logs = timeLogs.filter(l => (l.log_date||'').startsWith(mes))
    const analistas = new Set(logs.map(l => l.user_name).filter(Boolean)).size
    const enviados  = fechamentos.filter(f => f.periodo === mes && f.status === 'enviado').length
    const aprovados = fechamentos.filter(f => f.periodo === mes && f.status === 'aprovado').length
    const approvedIds = new Set()
    fechamentos.filter(f => f.status === 'aprovado').forEach(f => f.log_ids?.forEach(id => approvedIds.add(id)))
    const horasAprov = timeLogs.filter(l => approvedIds.has(l.id)).reduce((s,l)=>s+Number(l.hours_executed),0)
    const fmtH = h => `${Math.floor(h)}h${Math.round((h%1)*60).toString().padStart(2,'0')}`
    return { analistas, enviados, aprovados, horasAprov: fmtH(horasAprov) }
  }, [timeLogs])

  // Drag & drop
  function handleDragStart(e, id) { setDragId(id) }
  function handleDragOver(e)      { e.preventDefault() }
  function handleDrop(e, toPhase, toOrder) {
    e.preventDefault()
    if (!dragId) return
    const proj = projetos.find(p => p.id === dragId)
    if (!proj) { setDragId(null); return }
    const updated = { ...proj, phase: toPhase, current_phase_index: toOrder }
    setProjetos(ps => ps.map(p => p.id === dragId ? updated : p))
    saveProjeto(updated)
    setDragId(null)
  }

  // ── helpers: proposta vinculada a uma opp ────────────────────────────────────
  function propostaParaOpp(oppId) {
    if (!oppId) return null
    try {
      const stored = localStorage.getItem(PROPOSTAS_KEY)
      const lista  = stored ? JSON.parse(stored) : []
      // prioriza a proposta aceita, depois enviada, depois qualquer uma
      const ranking = { aceita: 0, enviada: 1, rascunho: 2, recusada: 3 }
      return lista
        .filter(p => String(p.opp_id) === String(oppId))
        .sort((a, b) => (ranking[a.status] ?? 9) - (ranking[b.status] ?? 9))[0] || null
    } catch { return null }
  }

  function phasesFromProposta(proposta, projectId) {
    const fases = (proposta.itens || []).filter(i => i.nivel === 1)
    if (fases.length === 0) return null
    return fases.map((fase, i) => ({
      id:               `ph_${projectId}_${i + 1}`,
      project_id:       projectId,
      tenant_id:        't1',
      phase_name:       fase.titulo,
      phase_order:      i + 1,
      start_date_planned:  '',
      end_date_planned:    '',
      hours_estimated:  Math.round((fase.hr_analista || 0) + (fase.hr_coord || 0)) || 20,
      is_completed:     false,
      completed_at:     null,
    }))
  }

  function membersFromProposta(proposta, projectId) {
    return (proposta.equipe || []).map(m => ({
      id:         'mb_' + Date.now() + Math.random().toString(36).slice(2),
      project_id: projectId,
      tenant_id:  't1',
      user_id:    m.user_id || null,
      name:       m.nome || m.name || '',
      role:       m.papel || m.role || 'Consultor',
    }))
  }

  // CRUD
  async function handleCreate(form) {
    const np = { ...form, id: 'prj_' + Date.now(), tenant_id: 't1', franchise_id: null, created_at: new Date().toISOString().slice(0, 10) }
    log('criar', 'projeto', np.id, { descricao: `Projeto criado: ${np.name || np.nome || ''}` })

    // tenta usar proposta vinculada à oportunidade
    const proposta   = propostaParaOpp(form.opportunity_id)
    const wbsPhases  = proposta ? phasesFromProposta(proposta, np.id) : null
    const newPhases  = wbsPhases || PHASE_NAMES.map((name, i) => ({
      id: `ph_${np.id}_${i + 1}`, project_id: np.id, tenant_id: 't1',
      phase_name: name, phase_order: i + 1,
      start_date_planned: '', end_date_planned: '',
      hours_estimated: Math.round(Number(form.total_hours_estimated) / 6) || 20,
      is_completed: false, completed_at: null,
    }))

    // ajusta total de horas estimadas se veio da proposta
    if (wbsPhases) {
      np.total_hours_estimated = wbsPhases.reduce((s, p) => s + p.hours_estimated, 0)
    }

    await saveProjeto(np)
    await Promise.all(newPhases.map(ph => savePhase(ph)))

    // adiciona membros da equipe da proposta
    if (proposta) {
      const novosMembers = membersFromProposta(proposta, np.id)
      novosMembers.forEach(m => setMembers(prev => [...prev, m]))
    }

    setModal(null)
  }

  async function handleUpdate(updated) {
    const current = projetos.find(p => p.id === updated.id) || {}
    const merged  = {
      ...current,
      ...updated,
      phase:               updated.phase               ?? current.phase,
      current_phase_index: updated.current_phase_index ?? current.current_phase_index,
      total_hours_executed: updated.total_hours_executed ?? current.total_hours_executed,
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

    let csStep
    if (criarCSCheckin) {
      const hoje = new Date().toISOString().slice(0, 10)
      const checkin = {
        id:           'ci_prj_' + Date.now(),
        date:         hoje,
        type:         'Reunião',
        summary:      `Projeto "${merged.name}" concluído. Check-in gerado automaticamente.`,
        produto_id:   null,
        produto_nome: merged.produto_nome || '',
        projeto_id:   merged.id   || null,
        projeto_nome: merged.name || '',
      }
      const csExistente = csRecords.find(r => String(r.company_id) === String(merged.company_id))
      if (csExistente) {
        // Atualiza check-ins do CS existente
        const res = await saveHealth({
          ...csExistente,
          checkins: [checkin, ...(csExistente.checkins || [])],
        })
        csStep = res?.ok === false
          ? { id: 'cs', label: 'Erro ao atualizar check-in CS', sublabel: res.message, error: true }
          : { id: 'cs', label: 'Check-in adicionado em Sucesso do Cliente', sublabel: `Empresa: ${merged.company_nome}` }
      } else {
        // Cria novo registro CS para esta empresa
        const res = await saveHealth({
          company_id:      merged.company_id || null,
          company_name:    merged.company_nome || '',
          laer_stage:      'Land',
          touch_model:     'Tech-Touch',
          health_score:    75,
          notes:           `Cliente adicionado ao concluir o projeto "${merged.name}".`,
          checkins:        [checkin],
          action_plans:    [],
          attachments:     [],
        })
        csStep = res?.ok === false
          ? { id: 'cs', label: 'Erro ao criar registro CS', sublabel: res.message, error: true }
          : { id: 'cs', label: 'Registro criado em Sucesso do Cliente', sublabel: `${merged.company_nome} · estágio Land` }
      }
    } else {
      csStep = { id: 'cs', label: 'Check-in CS ignorado', skip: true }
    }

    setFeedbackSteps([
      { id: 'projeto', label: `Projeto "${merged.name}" finalizado`, sublabel: merged.company_nome },
      csStep,
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
    const p = projetos.find(x => x.id === id)
    await removeProjeto(id)
    log('excluir', 'projeto', id, { descricao: `Projeto excluído: ${p?.name || p?.nome || id}` })
    setDrawer(null)
  }

  async function handleAddLog(entry) {
    saveTimeLog(entry) // atualiza estado local imediatamente
    await saveTimeLogRemote(entry) // persiste no Supabase
    setDrawer(d => d?.id === entry.project_id ? { ...d, total_hours_executed: Number(d.total_hours_executed) + Number(entry.hours_executed) } : d)
  }

  function handleRemoveLog(id) {
    const entry = timeLogs.find(l => l.id === id)
    setTimeLogs(prev => prev.filter(l => l.id !== id))
    removeTimeLogRemote(id)
    if (entry) setDrawer(d => d?.id === entry.project_id ? { ...d, total_hours_executed: Math.max(0, Number(d.total_hours_executed) - Number(entry.hours_executed)) } : d)
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
      <div style={{ flexShrink: 0, padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Page header — navegação entre funcionalidades do módulo integrada, com indicador inferior.
            marginBottom extra (8px, somado ao gap:12 do container = 20px) pra manter o mesmo
            espaçamento após o cabeçalho usado em Comissões, mantendo o alinhamento com a borda
            superior da área de conteúdo padronizado entre as telas. */}
        <PageHeader
          style={{ marginBottom: 8 }}
          tabs={PROJETOS_TABS.filter(t => podeVerTab(t.id))}
          activeTab={tab}
          onTabChange={setTab}
          actions={
            tab === 'projetos' ? <Button onClick={() => setModal({ _new: true, phase: 'iniciacao', phaseIndex: 1 })}>+ Novo projeto</Button>
            : tab === 'recursos' ? <span style={{ fontSize:12, color:'var(--text-muted)' }}>Capacidade padrão: {CAPACIDADE_MENSAL}h/mês por analista</span>
            : undefined
          }
        />

        {/* Indicadores — mesmo padrão de cabeçalho colapsável usado em Comissões (BrowseLayout) */}
        {!propostasEditing && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:10, overflow:'hidden' }}>
            <button
              type="button"
              onClick={() => setShowKpis(v => !v)}
              style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                width:'100%', padding:'8px 14px', cursor:'pointer', userSelect:'none',
                background:'none', border:'none', fontFamily:'var(--font)',
              }}
            >
              <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)' }}>
                <span style={{ width:3, height:12, borderRadius:2, background:'var(--accent)', flexShrink:0 }} />
                Indicadores
              </span>
              {showKpis ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
            </button>
            {showKpis && (() => {
          const kpiSets = {
            projetos: [
              { label:'Total projetos',  value: projetos.length,               color:'var(--accent)' },
              { label:'Em andamento',    value: emAndamento,                   color:'#3B82F6' },
              { label:'Bloqueados',      value: blockedIds.size,               color:'#EF4444' },
              { label:'Horas estimadas', value: `${totalHrsEst}h`,            color:'#10B981' },
              { label:'Executadas',      value: `${totalHrsExe.toFixed(0)}h`, color:'var(--accent)' },
            ],
            propostas: [
              { label:'Total',     value: kpiPropostas.total,     color:'var(--border)' },
              { label:'Enviadas',  value: kpiPropostas.enviadas,  color:'#3B82F6' },
              { label:'Aceitas',   value: kpiPropostas.aceitas,   color:'#10B981' },
              { label:'Assinadas', value: kpiPropostas.assinadas, color:'var(--accent)' },
            ],
            recursos: [
              { label:'Analistas',       value: kpiRecursos.total,            color:'var(--accent)' },
              { label:'Sobrecarregados', value: kpiRecursos.sobrecarregados,  color:'#EF4444' },
              { label:'Disponíveis',     value: kpiRecursos.disponiveis,      color:'#10B981' },
              { label:'Horas no mês',    value: `${kpiRecursos.totalH.toFixed(0)}h`, color:'#3B82F6' },
            ],
            financeiro: [
              { label:'Portfólio',      value: kpiFinanceiro.totalContrato, color:'var(--accent)' },
              { label:'Custo realizado',value: kpiFinanceiro.totalCusto,    color:'#3B82F6' },
              { label:'Faturado',       value: kpiFinanceiro.totalFaturado, color:'#10B981' },
              { label:'Margem',         value: kpiFinanceiro.totalMargem,   color: kpiFinanceiro.margemNeg ? '#EF4444' : '#10B981' },
            ],
            fechamento: [
              { label:'Analistas no período', value: kpiFechamento.analistas,  color:'var(--accent)' },
              { label:'Aguard. aprovação',    value: kpiFechamento.enviados,   color:'#F59E0B' },
              { label:'Aprovados',            value: kpiFechamento.aprovados,  color:'#10B981' },
              { label:'Horas aprovadas',      value: kpiFechamento.horasAprov, color:'#10B981' },
            ],
          }
          const items = kpiSets[tab] || []
          return (
            <div style={{ display:'flex', borderTop:'1px solid var(--border2)' }}>
              {items.map((k, i) => (
                <KpiCard key={k.label} label={k.label} value={k.value} color={k.color}
                  last={i === items.length - 1} />
              ))}
            </div>
          )
        })()}
          </div>
        )}

        {/* Toolbar */}
        {tab !== 'fechamento' && tab !== 'recursos' && tab !== 'financeiro' && tab !== 'propostas' && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 0, minHeight: 52 }}>
          {/* Grupo esquerdo */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 }}>
            <div style={{ position: 'relative', width: 200, flexShrink: 1, minWidth: 100 }}>
              <span style={pg.searchIcon}>⌕</span>
              <input style={pg.searchInput} placeholder="Buscar projeto ou empresa…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select style={pg.select} value={filtros.franchise} onChange={e => setFiltros(f => ({ ...f, franchise: e.target.value }))}>
              <option value="">Todos os canais</option>
              {[...new Set(projetos.map(p => p.franchise_nome).filter(Boolean))].map(fr => (
                <option key={fr} value={fr}>{fr}</option>
              ))}
            </select>
            <select style={pg.select} value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_PROJETO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Grupo direito */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
            <div style={pg.tbDivider} />
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
            <select style={pg.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="recente">Mais recentes</option>
              <option value="prazo">Prazo mais próximo</option>
              <option value="horas">Mais horas</option>
              <option value="nome">Nome A–Z</option>
            </select>
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
            {hasFilters && (
              <button onClick={() => { setFiltros({ status: '', franchise: '' }); setSearch('') }} style={pg.ghostBtn}>
                Limpar
              </button>
            )}
          </div>
        </div>
        )}

        {/* Contagem */}
        <div style={{ ...pg.resultRow, display: (tab === 'fechamento' || tab === 'recursos' || tab === 'financeiro' || tab === 'propostas') ? 'none' : undefined }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            {filtered.length} projeto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Abas com scroll próprio */}
      {tab === 'propostas' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 28px 24px' }}>
          <PropostasTab projetos={projetos} phases={phases} opps={opps} showKpis={false} onEditingChange={setPropostasEditing} />
        </div>
      )}
      {tab === 'fechamento' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 28px 24px' }}>
          <FechamentoHoras embedded showKpis={false} />
        </div>
      )}
      {tab === 'recursos' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 28px 24px' }}>
          <MapaRecursos projetos={projetos} members={members} timeLogs={timeLogs} showKpis={false} />
        </div>
      )}
      {tab === 'financeiro' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 28px 24px' }}>
          <PainelFinanceiro projetos={projetos} timeLogs={timeLogs} showKpis={false} />
        </div>
      )}

      {/* Kanban ou Lista */}
      {tab !== 'fechamento' && tab !== 'recursos' && tab !== 'financeiro' && tab !== 'propostas' && viewMode === 'kanban' ? (
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
      ) : tab !== 'fechamento' && tab !== 'recursos' && tab !== 'financeiro' && tab !== 'propostas' ? (
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
          tasks={tasks}
          timeLogs={timeLogs}
          issues={issues}
          attachments={attachments}
          members={members}
          blockedIds={blockedIds}
          onClose={() => setDrawer(null)}
          onUpdate={handleUpdate}
          onUpdateOpp={handleUpdateOpp}
          onAdvancePhase={handleAdvancePhase}
          onUpdatePhases={phasesOrPhase => {
            const arr = Array.isArray(phasesOrPhase) ? phasesOrPhase : [phasesOrPhase]
            arr.forEach(ph => savePhase(ph))
          }}
          onSyncTasks={saveTasks}
          onAddLog={handleAddLog}
          onRemoveLog={handleRemoveLog}
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
