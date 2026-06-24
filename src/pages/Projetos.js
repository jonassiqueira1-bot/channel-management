import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { SlidersHorizontal, ChevronDown, LayoutList, LayoutGrid } from 'lucide-react'
import FechamentoHoras, { FECHAMENTOS_KEY } from './FechamentoHoras'
import {
  FASES_MIT, STATUS_PROJETO, CRITICALITY_CFG, PHASE_NAMES,
  MOCK_PROJECT_ATTACHMENTS, MOCK_OPP_HISTORICO,
} from '../data/mockProjetos'
import { useLocalState } from '../hooks/useLocalState'
import { useProjects } from '../hooks/useProjects'
import { useOpportunities } from '../hooks/useOpportunities'
import SearchSelect from '../components/SearchSelect'
import { MOCK_USUARIOS } from '../data/mockUsuarios'
import Button from '../components/Button'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import PageHeader from '../components/ui/PageHeader'
import EmpresaSearch from '../components/EmpresaSearch'
import { STORAGE_KEY as CS_STORAGE_KEY, MOCK_CUSTOMER_HEALTH } from '../data/mockCustomerSuccess'
import { MOCK_PRODUTOS } from '../data/mockProdutos'
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
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)', marginBottom: 4 },
  sep:        { color: 'var(--border)' },
  title:      { margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '-0.2px' },
  newBtn:     { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  kpis:       { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, paddingBottom: 4 },
  kpi:        { background: 'var(--surface)', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid var(--border2)', boxShadow: 'var(--shadow)' },
  toolbar:    { background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'nowrap' },
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
  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState('Consultor')
  const oppPickerRef = useRef(null)
  const [perfisStore] = useLocalState('settings:perfis_v2', [])

  const { opps: allOpps } = useOpportunities()

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
    const u = perfisStore.find(p => p.id === memberUserId) || MOCK_USUARIOS.find(p => p.id === memberUserId)
    if (!u) return
    if (myMembers.some(m => m.user_id === memberUserId)) return
    onAddMember({ id: 'mb_' + Date.now(), project_id: projeto.id, tenant_id: 't1', user_id: memberUserId, name: u.nome, role: memberRole })
    setMemberUserId('')
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
              <EmpresaSearch
                value={form.company_nome || ''}
                label={form.company_nome || ''}
                onChange={({ nome, id }) => setForm(f => ({ ...f, company_nome: nome, company_id: id }))}
                placeholder="Buscar empresa cliente…"
              />
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
                {(perfisStore.length > 0 ? perfisStore : MOCK_USUARIOS)
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

// ─── Tab 1: Cronograma MIT ────────────────────────────────────────────────────
function TabCronograma({ projeto, phases, timeLogs, onAdvancePhase, onUpdatePhases, onAddMember }) {
  const [showImport, setShowImport] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState(false)
  const [propostas]   = useLocalState(PROPOSTAS_KEY, [])
  const myPhases = phases.filter(p => p.project_id === projeto.id).sort((a, b) => a.phase_order - b.phase_order)

  // proposta vinculada à oportunidade deste projeto
  const propostaVinculada = useMemo(() => {
    if (!projeto.opportunity_id) return null
    const ranking = { aceita: 0, enviada: 1, rascunho: 2, recusada: 3 }
    return propostas
      .filter(p => String(p.opp_id) === String(projeto.opportunity_id))
      .sort((a, b) => (ranking[a.status] ?? 9) - (ranking[b.status] ?? 9))[0] || null
  }, [propostas, projeto.opportunity_id])

  function handleSyncFromProposta() {
    if (!propostaVinculada) return
    const fases = (propostaVinculada.itens || []).filter(i => i.nivel === 1)
    if (fases.length === 0) { alert('A proposta não tem escopo WBS definido.'); return }
    const updated = fases.map((fase, i) => {
      const existing = myPhases[i]
      return {
        id:                  existing?.id || `ph_${projeto.id}_${i + 1}`,
        project_id:          projeto.id,
        tenant_id:           't1',
        phase_name:          fase.titulo,
        phase_order:         i + 1,
        start_date_planned:  existing?.start_date_planned || '',
        end_date_planned:    existing?.end_date_planned   || '',
        hours_estimated:     Math.round((fase.hr_analista || 0) + (fase.hr_coord || 0)) || 20,
        is_completed:        existing?.is_completed || false,
        completed_at:        existing?.completed_at || null,
      }
    })
    onUpdatePhases(updated)
    // equipe da proposta → adicionar membros ausentes
    if (onAddMember) {
      const equipe = propostaVinculada.equipe || []
      equipe.forEach(m => {
        onAddMember({ id: 'mb_' + Date.now() + Math.random().toString(36).slice(2), project_id: projeto.id, tenant_id: 't1', user_id: m.user_id || null, name: m.nome || m.name || '', role: m.papel || m.role || 'Consultor' })
      })
    }
    setSyncFeedback(true)
    setTimeout(() => setSyncFeedback(false), 2500)
  }
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

      {/* ── Cabeçalho com botões ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {propostaVinculada && (
          <button onClick={handleSyncFromProposta}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
              fontSize: 12, fontWeight: 700, transition: 'background 0.2s',
              background: syncFeedback ? '#10B981' : 'var(--accent)', color: '#fff' }}>
            {syncFeedback ? '✓ Sincronizado' : '⟳ Sincronizar com Proposta'}
          </button>
        )}
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
function TabTimesheet({ projeto, phases, timeLogs, members, onAddLog }) {
  const myPhases   = phases.filter(p => p.project_id === projeto.id).sort((a, b) => a.phase_order - b.phase_order)
  const myLogs     = timeLogs.filter(l => l.project_id === projeto.id).sort((a, b) => b.logged_at.localeCompare(a.logged_at))
  const currentPhId = `ph_${projeto.id}_${projeto.current_phase_index}`

  const myMembers = (members || []).filter(m => m.project_id === projeto.id)

  const [profiles] = useLocalState('usuarios:profiles', [])
  const todosUsuarios = profiles.length > 0 ? profiles.filter(p => p.status !== 'inativo') : MOCK_USUARIOS
  const usuarios = myMembers.length > 0
    ? myMembers.map(m => ({ id: m.user_id || m.id, nome: m.name, cargo: m.role, avatar: m.name?.[0] }))
    : todosUsuarios

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
  { key: 'timesheet',  label: 'Timesheet'      },
  { key: 'financeiro', label: 'Financeiro'     },
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
        {tab === 'cronograma' && <TabCronograma projeto={projeto} phases={phases} timeLogs={timeLogs} onAdvancePhase={onAdvancePhase} onUpdatePhases={onUpdatePhases} onAddMember={onAddMember} />}
        {tab === 'timesheet'  && <TabTimesheet  projeto={projeto} phases={phases} timeLogs={timeLogs} members={members} onAddLog={onAddLog} />}
        {tab === 'financeiro' && <TabFinanceiro projeto={projeto} timeLogs={timeLogs} onUpdate={onUpdate} />}
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
  const [perfisStore] = useLocalState('settings:perfis_v2', [])

  // Pool de usuários: cadastro real > fallback MOCK
  const usuariosCad = useMemo(() => {
    const base = perfisStore.length > 0 ? perfisStore : MOCK_USUARIOS
    return base.filter(u => u.status !== 'inativo')
  }, [perfisStore])

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

  // Pool de analistas: usuários cadastrados + quem lançou horas mas não está cadastrado
  const analistas = useMemo(() => {
    const lista = usuariosCad.map(u => ({ id: u.id, name: u.nome, cargo: u.cargo || '', senioridade: u.senioridade || '', horas_semana: u.horas_semana || 40, habilidades: u.habilidades || [] }))
    const ids = new Set(lista.map(u => String(u.id)))
    timeLogs.forEach(l => {
      const key = String(l.user_id || '')
      if (!key || ids.has(key)) return
      ids.add(key)
      lista.push({ id: key, name: l.user_name || key, cargo: '', senioridade: '', horas_semana: 40, habilidades: [] })
    })
    return lista.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [usuariosCad, timeLogs])

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
function evaluateRules(regras, variaveis, itens) {
  let result = itens.map(i => ({ ...i }))
  ;(regras || []).filter(r => r.ativo !== false).forEach(regra => {
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

function ProdutoSearch({ produto_id, onChange }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const ativos     = MOCK_PRODUTOS.filter(p => p.status === 'ativo')
  const sugestoes  = query ? ativos.filter(p => (p.nome + p.codigo + p.categoria).toLowerCase().includes(query.toLowerCase())) : ativos
  const selecionado = MOCK_PRODUTOS.find(p => p.id === produto_id)
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
  md += `---\n\n## Assinatura\n\n**${prop.empresa_nome||'—'}**\n\n_________________________________\nCliente · Data: ___/___/______\n\n**Fornecedor**\n\n_________________________________\nResponsável · Data: ___/___/______\n`
  return md
}

function downloadProposta(prop) {
  const md = propToWord(prop)
  const body = md
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^---$/gm,'<hr/>')
    .replace(/^\| (.+) \|$/gm,(_,row)=>{const c=row.split(' | ');return '<tr>'+c.map(x=>x.startsWith('---')?'':` <td style="border:1px solid #ccc;padding:4px 8px">${x}</td>`).filter(Boolean).join('')+'</tr>'})
    .replace(/(<tr>[\s\S]*?<\/tr>)/g,'<table style="border-collapse:collapse;width:100%">$1</table>')
    .replace(/^- (.+)$/gm,'<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g,s=>'<ul>'+s+'</ul>')
    .replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br/>')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"/><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;margin:2cm;color:#111}h1{font-size:18pt;color:#1a1a2e;border-bottom:2px solid #e5e7eb;padding-bottom:4pt}h2{font-size:14pt;color:#374151;margin-top:14pt}table{border-collapse:collapse;width:100%;margin:8pt 0}td,th{border:1px solid #d1d5db;padding:4pt 8pt;font-size:10pt}ul{padding-left:16pt}li{margin-bottom:3pt}p{margin:6pt 0;line-height:1.5}strong{font-weight:bold}hr{border:none;border-top:1px solid #e5e7eb;margin:10pt 0}</style></head><body><p>${body}</p></body></html>`
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

function PropostasTab({ projetos, phases, opps = [] }) {
  const { save: saveOpp } = useOpportunities()
  const [propostas,    setPropostas]    = useLocalState(PROPOSTAS_KEY, [])
  const [templates,    setTemplates]    = useLocalState(PROP_TEMPLATES_KEY, DEFAULT_TEMPLATES)
  const [subView,      setSubView]      = useState('propostas') // 'propostas' | 'templates'
  const [selected,     setSelected]     = useState(null)
  const [selectedTmpl, setSelectedTmpl] = useState(null)
  const [criando,      setCriando]      = useState(false)
  const [propTab,      setPropTab]      = useState('escopo')
  const [filterOpp,    setFilterOpp]    = useState('')
  const [filterSt,     setFilterSt]     = useState('')
  const [estilo,       setEstilo]       = useLocalState(PROP_ESTILO_KEY, DEFAULT_ESTILO)
  const [wStep,        setWStep]        = useState(1)
  const [wOppId,       setWOppId]       = useState('')
  const [wTemplId,     setWTemplId]     = useState('')
  const [wTitulo,      setWTitulo]      = useState('')
  const [wVars,        setWVars]        = useState({})      // regras variáveis wizard
  const [tmplTab,      setTmplTab]      = useState('wbs')
  const [tmplSaved,    setTmplSaved]    = useState(false)
  const [propSaved,    setPropSaved]    = useState(false)
  const [importing,    setImporting]    = useState(false)
  const [importTmplId, setImportTmplId] = useState(null)
  const [collapsedPhases, setCollapsedPhases] = useState({})

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const o = p.get('opp_id')
    if (o) { setFilterOpp(o); setWOppId(o) }
    // default template to first available
    setWTemplId(t => t || '')
  }, [])

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
    const up = { ...prop, updated_at: new Date().toISOString() }
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
    const logEntries = [{ id:`l-${Date.now()}`, evento:'Proposta criada', usuario:'Você', data:now }]
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

    function startEdit(item) { setEditId(item.id); setEditFld({...item}) }
    function commitEdit() {
      if(!editId) return
      onChange(itens.map(i=>i.id===editId?{...i,...editFld}:i))
      setEditId(null); setEditFld({})
    }
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
              <th style={{...thSt,textAlign:'center'}}>Mostra</th>
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
                          <span onClick={()=>!readOnly&&toggleMostra(item.id)} title={item.mostrar?'Visível na proposta':'Oculto na proposta'}
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
    const [adding, setAdding] = useState(false)
    const [draft,  setDraftE] = useState({ nome:'', papel:'', horas_semana:'' })
    function addM() {
      if(!draft.nome.trim()) return
      salvar({...prop, equipe:[...(prop.equipe||[]),{id:equUid(),nome:draft.nome.trim(),papel:draft.papel.trim(),horas_semana:draft.horas_semana?Number(draft.horas_semana):''}]})
      setDraftE({nome:'',papel:'',horas_semana:''}); setAdding(false)
    }
    return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {(prop.equipe||[]).map(m=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'var(--accent-glow)',border:'1px solid var(--accent)44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--accent)',flexShrink:0}}>{m.nome.charAt(0).toUpperCase()}</div>
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
              <input autoFocus value={draft.nome} onChange={e=>setDraftE(d=>({...d,nome:e.target.value}))} placeholder="Nome" style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)'}}/>
              <input value={draft.papel} onChange={e=>setDraftE(d=>({...d,papel:e.target.value}))} placeholder="Papel / cargo" style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)'}}/>
              <input value={draft.horas_semana} onChange={e=>setDraftE(d=>({...d,horas_semana:e.target.value}))} placeholder="h/sem" type="number" min="0" style={{padding:'6px 8px',border:'1px solid var(--border)',borderRadius:6,background:'var(--surface)',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font)'}}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={addM} style={{padding:'5px 14px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>Adicionar</button>
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
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <button onClick={()=>setSelected(null)} style={{display:'inline-flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:12,padding:'4px 0',fontFamily:'var(--font)',alignSelf:'flex-start'}}>
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
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',flexShrink:0}}>
              <span style={{fontSize:11,padding:'4px 10px',borderRadius:20,fontWeight:700,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>{sc.label}</span>
              <button onClick={()=>salvar(selected,true)}
                style={{padding:'6px 16px',background:propSaved?'#10B981':'var(--accent)',color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',transition:'background 0.2s',minWidth:72}}>
                {propSaved ? '✓ Salvo' : 'Salvar'}
              </button>
              {seqNext[selected.status]&&(
                <button onClick={avancar} style={{padding:'6px 14px',background:'none',color:'var(--accent)',border:'1px solid var(--accent)55',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
                  {selected.status==='rascunho'?'Enviar →':'Marcar Aceita →'}
                </button>
              )}
              {selected.status==='enviada'&&<button onClick={recusar} style={{padding:'6px 12px',background:'none',border:'1px solid #EF444455',color:'#EF4444',borderRadius:7,fontSize:12,cursor:'pointer',fontFamily:'var(--font)'}}>Recusar</button>}
              <button onClick={()=>downloadProposta(selected)} style={{padding:'6px 12px',border:'1px solid var(--border)',borderRadius:7,background:'none',color:'var(--text-soft)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)'}}>↓ Word</button>
              <button onClick={()=>excluir(selected.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:16,padding:'4px 6px'}}
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
    )
  }

  // ── Template detail view ──
  if (subView === 'templates' && selectedTmpl) {
    const tmplTabs = [
      { id:'wbs',     label:'WBS / Escopo'   },
      { id:'tarifas', label:'Tarifas'         },
      { id:'produtos',label:'Produtos'        },
      { id:'blocos',  label:'Blocos de Texto' },
      { id:'regras',  label:'Regras'          },
      { id:'estilo',  label:'Estilo Doc.'     },
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
        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <button onClick={()=>{setSelectedTmpl(null);setTmplTab('wbs')}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:12,padding:'4px 0',fontFamily:'var(--font)',display:'flex',alignItems:'center',gap:5}}>
            ← Templates
          </button>
          <div style={{flex:1,minWidth:0}}>
            <input value={st.nome} onChange={e=>salvarTemplate({...st,nome:e.target.value})}
              style={{fontSize:17,fontWeight:800,color:'var(--text)',border:'none',outline:'none',background:'none',fontFamily:'var(--font)',width:'100%',padding:0}}/>
            <input value={st.descricao||''} onChange={e=>salvarTemplate({...st,descricao:e.target.value})}
              placeholder="Descrição do template…"
              style={{fontSize:12,color:'var(--text-muted)',border:'none',outline:'none',background:'none',fontFamily:'var(--font)',width:'100%',padding:0,marginTop:3}}/>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0,alignItems:'center'}}>
            <button onClick={()=>setImporting(true)} style={{padding:'7px 14px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text-soft)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)'}}>
              ↑ Importar WBS
            </button>
            <button onClick={()=>excluirTemplate(st.id)} style={{padding:'7px 12px',border:'1px solid #EF444444',borderRadius:7,background:'none',color:'#EF4444',fontSize:12,cursor:'pointer',fontFamily:'var(--font)'}}>
              Excluir
            </button>
            <button onClick={()=>{salvarTemplate(selectedTmpl);setTmplSaved(true);setTimeout(()=>setTmplSaved(false),2000)}}
              style={{padding:'7px 18px',background:tmplSaved?'#10B981':'var(--accent)',color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',transition:'background 0.2s',minWidth:80}}>
              {tmplSaved ? '✓ Salvo' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{display:'flex',gap:16,padding:'10px 14px',background:'var(--surface2)',borderRadius:9,fontSize:12,color:'var(--text-muted)',flexWrap:'wrap'}}>
          <span>{(st.itens||[]).filter(i=>i.nivel===1).length} fases · {(st.itens||[]).filter(i=>i.nivel===2).length} atividades</span>
          <span>Analista: <strong style={{color:'var(--text)'}}>{decToHHMM(tA)}</strong></span>
          <span>Coord.: <strong style={{color:'var(--text)'}}>{decToHHMM(tC)}</strong></span>
          <span>Total: <strong style={{color:'var(--accent)'}}>{decToHHMM(tA+tC)}</strong></span>
          {invest>0 && <span style={{marginLeft:'auto'}}>Investimento estimado: <strong style={{color:'#10B981'}}>{fmtBRL2(invest)}</strong></span>}
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

        {/* Blocos de texto tab */}
        {tmplTab==='blocos' && (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{fontSize:12,color:'var(--text-muted)'}}>Defina as seções de texto que compõem o documento da proposta. Ordem arrastável — use ↑↓ para reordenar.</div>
            {(st.blocos||[]).sort((a,b)=>a.ordem-b.ordem).map((bloco,idx,arr)=>(
              <div key={bloco.id} style={{border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--surface2)',borderBottom:'1px solid var(--border)'}}>
                  <input value={bloco.titulo} onChange={e=>{
                    const nb=(st.blocos||[]).map(b=>b.id===bloco.id?{...b,titulo:e.target.value}:b)
                    salvarTemplate({...st,blocos:nb})
                  }} style={{flex:1,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:5,background:'var(--surface)',color:'var(--text)',fontSize:13,fontWeight:600,outline:'none',fontFamily:'var(--font)'}}/>
                  <div style={{display:'flex',gap:4}}>
                    <button disabled={idx===0} onClick={()=>{
                      const nb=[...(st.blocos||[])]; const prev=nb[idx-1]; nb[idx-1]={...bloco,ordem:prev.ordem}; nb[idx]={...prev,ordem:bloco.ordem}
                      salvarTemplate({...st,blocos:nb})
                    }} style={{padding:'3px 8px',border:'1px solid var(--border)',borderRadius:5,background:'var(--surface)',color:idx===0?'var(--border)':'var(--text-muted)',cursor:idx===0?'default':'pointer',fontSize:12,fontFamily:'var(--font)'}}>↑</button>
                    <button disabled={idx===arr.length-1} onClick={()=>{
                      const nb=[...(st.blocos||[])]; const next=nb[idx+1]; nb[idx+1]={...bloco,ordem:next.ordem}; nb[idx]={...next,ordem:bloco.ordem}
                      salvarTemplate({...st,blocos:nb})
                    }} style={{padding:'3px 8px',border:'1px solid var(--border)',borderRadius:5,background:'var(--surface)',color:idx===arr.length-1?'var(--border)':'var(--text-muted)',cursor:idx===arr.length-1?'default':'pointer',fontSize:12,fontFamily:'var(--font)'}}>↓</button>
                    <button onClick={()=>salvarTemplate({...st,blocos:(st.blocos||[]).filter(b=>b.id!==bloco.id)})}
                      style={{padding:'3px 8px',border:'1px solid #EF444433',borderRadius:5,background:'none',color:'#EF4444',cursor:'pointer',fontSize:12,fontFamily:'var(--font)'}}>✕</button>
                  </div>
                </div>
                <textarea value={bloco.conteudo} rows={4}
                  onChange={e=>{
                    const nb=(st.blocos||[]).map(b=>b.id===bloco.id?{...b,conteudo:e.target.value}:b)
                    salvarTemplate({...st,blocos:nb})
                  }}
                  placeholder="Conteúdo do bloco… (use {{empresa_nome}}, {{opp_titulo}}, {{data}} como variáveis)"
                  style={{width:'100%',padding:'10px 14px',border:'none',background:'var(--surface)',color:'var(--text)',fontSize:12,outline:'none',fontFamily:'var(--font)',resize:'vertical',boxSizing:'border-box',lineHeight:1.7}}/>
              </div>
            ))}
            <button onClick={()=>{
              const ordem=Math.max(0,...(st.blocos||[]).map(b=>b.ordem))+1
              const nb=[...(st.blocos||[]),{id:`b-${Date.now()}`,ordem,titulo:'Nova seção',conteudo:''}]
              salvarTemplate({...st,blocos:nb})
            }} style={{alignSelf:'flex-start',padding:'6px 14px',background:'none',border:'1px dashed var(--border)',borderRadius:7,fontSize:12,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font)'}}>
              + Adicionar bloco
            </button>
          </div>
        )}

        {/* Regras tab */}
        {tmplTab==='regras' && (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{padding:'10px 14px',background:'#FEF3C7',border:'1px solid #F59E0B33',borderRadius:8,fontSize:11,color:'#92400E',lineHeight:1.7}}>
              <strong>Como funciona:</strong> ao criar uma proposta, o sistema pergunta os dados do cliente (funcionários, filiais, etc.). As regras que satisfazem as condições são aplicadas automaticamente — ajustando as horas de cada fase do WBS antes de gerar a proposta.
            </div>
            {(st.regras||[]).map((regra,idx)=>{
              const campoCfg = REGRA_CAMPOS.find(c=>c.value===regra.condicao?.campo)
              const ops = REGRA_OPERADORES[campoCfg?.tipo||'number']
              const acaoTipo = ACAO_TIPOS.find(a=>a.v===regra.acao?.tipo)
              const campoHora = CAMPO_HORA_OPTS.find(c=>c.v===regra.acao?.campo_hora)
              const faseAlvo = (st.itens||[]).find(i=>i.id===regra.acao?.fase_id&&i.nivel===1)
              return (
                <div key={regra.id} style={{border:`1px solid ${regra.ativo!==false?'var(--accent)33':'var(--border)'}`,borderRadius:10,overflow:'hidden'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--surface2)',borderBottom:'1px solid var(--border)'}}>
                    <input type="checkbox" checked={regra.ativo!==false} onChange={e=>{
                      const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,ativo:e.target.checked}:r)
                      salvarTemplate({...st,regras:nr})
                    }} style={{accentColor:'var(--accent)'}}/>
                    <input value={regra.descricao||''} onChange={e=>{
                      const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,descricao:e.target.value}:r)
                      salvarTemplate({...st,regras:nr})
                    }} placeholder="Descrição da regra…" style={{flex:1,padding:'4px 8px',border:'1px solid var(--border)',borderRadius:5,background:'var(--surface)',color:'var(--text)',fontSize:12,outline:'none',fontFamily:'var(--font)'}}/>
                    <button onClick={()=>salvarTemplate({...st,regras:(st.regras||[]).filter((_,j)=>j!==idx)})}
                      style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:14,padding:'2px 4px'}}
                      onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>✕</button>
                  </div>
                  <div style={{padding:'12px 14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:0.5}}>Condição SE</div>
                      <select value={regra.condicao?.campo||''} onChange={e=>{
                        const nc={...regra.condicao,campo:e.target.value,operador:'',valor:''}
                        const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,condicao:nc}:r)
                        salvarTemplate({...st,regras:nr})
                      }} style={{...inpSt2,fontSize:12}}>
                        <option value="">Selecionar variável…</option>
                        {REGRA_CAMPOS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      {campoCfg?.tipo==='number' && (
                        <div style={{display:'flex',gap:6}}>
                          <select value={regra.condicao?.operador||''} onChange={e=>{
                            const nc={...regra.condicao,operador:e.target.value}
                            const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,condicao:nc}:r)
                            salvarTemplate({...st,regras:nr})
                          }} style={{...inpSt2,flex:1,fontSize:12}}>
                            <option value="">Operador…</option>
                            {(ops||[]).map(o=><option key={o.v} value={o.v}>{o.label}</option>)}
                          </select>
                          <input type="number" value={regra.condicao?.valor||''} placeholder="Valor"
                            onChange={e=>{
                              const nc={...regra.condicao,valor:Number(e.target.value)}
                              const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,condicao:nc}:r)
                              salvarTemplate({...st,regras:nr})
                            }} style={{...inpSt2,width:80,fontSize:12}}/>
                        </div>
                      )}
                      {campoCfg?.tipo==='bool' && (
                        <select value={regra.condicao?.operador||''} onChange={e=>{
                          const nc={...regra.condicao,operador:e.target.value}
                          const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,condicao:nc}:r)
                          salvarTemplate({...st,regras:nr})
                        }} style={{...inpSt2,fontSize:12}}>
                          <option value="">Selecionar…</option>
                          {(ops||[]).map(o=><option key={o.v} value={o.v}>{o.label}</option>)}
                        </select>
                      )}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:0.5}}>Ação ENTÃO</div>
                      <select value={regra.acao?.fase_id||''} onChange={e=>{
                        const na={...regra.acao,fase_id:e.target.value}
                        const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,acao:na}:r)
                        salvarTemplate({...st,regras:nr})
                      }} style={{...inpSt2,fontSize:12}}>
                        <option value="">Fase alvo…</option>
                        {(st.itens||[]).filter(i=>i.nivel===1).map(f=><option key={f.id} value={f.id}>{f.titulo}</option>)}
                      </select>
                      <select value={regra.acao?.tipo||''} onChange={e=>{
                        const na={...regra.acao,tipo:e.target.value}
                        const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,acao:na}:r)
                        salvarTemplate({...st,regras:nr})
                      }} style={{...inpSt2,fontSize:12}}>
                        <option value="">Tipo de ajuste…</option>
                        {ACAO_TIPOS.map(a=><option key={a.v} value={a.v}>{a.label}</option>)}
                      </select>
                      <div style={{display:'flex',gap:6}}>
                        <input type="number" min="0" value={regra.acao?.quantidade||''} placeholder="Quantidade"
                          onChange={e=>{
                            const na={...regra.acao,quantidade:Number(e.target.value)}
                            const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,acao:na}:r)
                            salvarTemplate({...st,regras:nr})
                          }} style={{...inpSt2,flex:1,fontSize:12}}/>
                        <select value={regra.acao?.campo_hora||'ambas'} onChange={e=>{
                          const na={...regra.acao,campo_hora:e.target.value}
                          const nr=(st.regras||[]).map((r,j)=>j===idx?{...r,acao:na}:r)
                          salvarTemplate({...st,regras:nr})
                        }} style={{...inpSt2,flex:1,fontSize:12}}>
                          {CAMPO_HORA_OPTS.map(c=><option key={c.v} value={c.v}>{c.label}</option>)}
                        </select>
                      </div>
                      {regra.acao?.fase_id && regra.acao?.tipo && regra.acao?.quantidade > 0 && (
                        <div style={{fontSize:11,color:'var(--text-muted)',fontStyle:'italic'}}>
                          → {acaoTipo?.label} {regra.acao.quantidade}{regra.acao.tipo.includes('pct')?'%':'h'} em "{faseAlvo?.titulo||'?'}" ({campoHora?.label||'ambas'})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <button onClick={()=>{
              const nr=[...(st.regras||[]),{id:`r-${Date.now()}`,ativo:true,descricao:'',condicao:{campo:'',operador:'',valor:''},acao:{fase_id:'',tipo:'',quantidade:0,campo_hora:'ambas'}}]
              salvarTemplate({...st,regras:nr})
            }} style={{alignSelf:'flex-start',padding:'6px 14px',background:'none',border:'1px dashed var(--border)',borderRadius:7,fontSize:12,color:'var(--text-muted)',cursor:'pointer',fontFamily:'var(--font)'}}>
              + Adicionar regra
            </button>
          </div>
        )}

        {/* Estilo / papel de carta tab (global) */}
        {tmplTab==='estilo' && (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{padding:'10px 14px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,fontSize:11,color:'var(--text-soft)',lineHeight:1.6}}>
              Configuração global de estilo — aplicada em todas as propostas ao gerar o documento.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:5}}>URL do Logo</div>
                <input value={estilo.logo_url||''} onChange={e=>setEstilo(s=>({...s,logo_url:e.target.value}))}
                  placeholder="https://empresa.com/logo.png" style={inpSt2}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:5}}>Cor primária</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input type="color" value={estilo.cor_primaria||'#6366F1'} onChange={e=>setEstilo(s=>({...s,cor_primaria:e.target.value}))}
                    style={{width:40,height:36,border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',padding:2}}/>
                  <input value={estilo.cor_primaria||''} onChange={e=>setEstilo(s=>({...s,cor_primaria:e.target.value}))}
                    style={{...inpSt2,flex:1,fontFamily:'var(--mono)',fontSize:12}}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:5}}>Título do cabeçalho</div>
                <input value={estilo.header_titulo||''} onChange={e=>setEstilo(s=>({...s,header_titulo:e.target.value}))}
                  placeholder="PROPOSTA DE IMPLANTAÇÃO" style={inpSt2}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:5}}>Subtítulo do cabeçalho</div>
                <input value={estilo.header_sub||''} onChange={e=>setEstilo(s=>({...s,header_sub:e.target.value}))}
                  placeholder="Documento confidencial" style={inpSt2}/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text-soft)',marginBottom:5}}>Rodapé</div>
                <input value={estilo.footer_texto||''} onChange={e=>setEstilo(s=>({...s,footer_texto:e.target.value}))}
                  placeholder="Confidencial · {{empresa_nome}} · {{ano}}" style={inpSt2}/>
                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:3}}>Variáveis disponíveis: {'{{empresa_nome}}'}, {'{{opp_titulo}}'}, {'{{data}}'}, {'{{ano}}'}</div>
              </div>
            </div>
            {/* Preview */}
            <div style={{border:`3px solid ${estilo.cor_primaria||'#6366F1'}`,borderRadius:8,overflow:'hidden',marginTop:4}}>
              <div style={{background:estilo.cor_primaria||'#6366F1',padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
                {estilo.logo_url && <img src={estilo.logo_url} alt="logo" style={{height:32,objectFit:'contain'}} onError={e=>e.target.style.display='none'}/>}
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:1}}>{estilo.header_titulo||'PROPOSTA DE IMPLANTAÇÃO'}</div>
                  {estilo.header_sub&&<div style={{fontSize:11,color:'rgba(255,255,255,0.8)',marginTop:2}}>{estilo.header_sub}</div>}
                </div>
              </div>
              <div style={{padding:'10px 20px',background:'var(--surface)',borderTop:'none'}}>
                <div style={{fontSize:10,color:'var(--text-muted)',textAlign:'center'}}>
                  {(estilo.footer_texto||'').replace('{{empresa_nome}}','Empresa Cliente').replace('{{ano}}',new Date().getFullYear()).replace('{{data}}',new Date().toLocaleDateString('pt-BR'))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Templates list view ──
  if (subView === 'templates') {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div style={{display:'flex',gap:2,background:'var(--surface2)',borderRadius:9,padding:3,border:'1px solid var(--border)'}}>
            {[['propostas','Propostas'],['templates','Templates']].map(([k,l])=>(
              <button key={k} onClick={()=>setSubView(k)}
                style={{padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:subView===k?700:500,fontFamily:'var(--font)',background:subView===k?'var(--surface)':'none',color:subView===k?'var(--text)':'var(--text-muted)'}}>
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
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:2,background:'var(--surface2)',borderRadius:9,padding:3,border:'1px solid var(--border)'}}>
            {[['propostas','Propostas'],['templates','Templates']].map(([k,l])=>(
              <button key={k} onClick={()=>setSubView(k)}
                style={{padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:subView===k?700:500,fontFamily:'var(--font)',background:subView===k?'var(--surface)':'none',color:subView===k?'var(--text)':'var(--text-muted)'}}>
                {l}
              </button>
            ))}
          </div>
          <select value={filterOpp} onChange={e=>setFilterOpp(e.target.value)} style={{padding:'7px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text)',fontSize:12,outline:'none',fontFamily:'var(--font)'}}>
            <option value="">Todas as oportunidades</option>
            {oppOptions.map(o=><option key={o.id} value={String(o.id)}>{o.empresa_nome} — {o.titulo}</option>)}
          </select>
          <select value={filterSt} onChange={e=>setFilterSt(e.target.value)} style={{padding:'7px 10px',border:'1px solid var(--border)',borderRadius:7,background:'var(--surface)',color:'var(--text)',fontSize:12,outline:'none',fontFamily:'var(--font)'}}>
            <option value="">Todos os status</option>
            {Object.entries(PROP_STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button onClick={()=>setCriando(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
          + Nova Proposta
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
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
  const { projetos, phases, timeLogs, issues, members, save: saveProjeto, remove: removeProjeto, savePhase, saveTimeLog, saveIssue, removeIssue, setProjetos, setPhases, setTimeLogs, setIssues, setMembers } = useProjects()
  const { opps } = useOpportunities()
  const [attachments] = useState(MOCK_PROJECT_ATTACHMENTS)
  const [modal,        setModal]       = useState(null)
  const [drawer,       setDrawer]      = useState(null)
  const [filtros,      setFiltros]     = useState({ status: '', franchise: '' })
  const [filtrosOpen,  setFiltrosOpen] = useState(false)
  const [dragId,       setDragId]      = useState(null)
  const [tab,       setTab]       = useLocalState('projetos:tab', 'projetos')
  const [showKpis,  setShowKpis]  = useLocalState('projetos:showKpis', true)

  // Handle ?tab=propostas URL param from Pipeline "Abrir em Projetos →" link
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const t = p.get('tab')
    if (t && ['propostas','recursos','financeiro','fechamento'].includes(t)) setTab(t)
  }, []) // eslint-disable-line

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
    const np = { ...form, id: 'prj_' + Date.now(), tenant_id: 't1', company_id: null, franchise_id: null, created_at: new Date().toISOString().slice(0, 10) }

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
        <PageHeader
          breadcrumb={['Projetos']}
          title={tab === 'fechamento' ? 'Fechamento de Horas' : tab === 'recursos' ? 'Mapa de Recursos' : tab === 'financeiro' ? 'Financeiro' : tab === 'propostas' ? 'Propostas de Implantação' : 'Projetos de Implantação'}
          showKpis={showKpis}
          onToggleKpis={() => setShowKpis(v => !v)}
          actions={
            tab === 'projetos' ? <Button onClick={() => setModal({ _new: true, phase: 'iniciacao', phaseIndex: 1 })}>+ Novo projeto</Button>
            : tab === 'recursos' ? <span style={{ fontSize:12, color:'var(--text-muted)' }}>Capacidade padrão: {CAPACIDADE_MENSAL}h/mês por analista</span>
            : undefined
          }
        />

        {/* Tab switcher — fixo centralizado */}
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, display: 'flex', gap: 2,
          background: 'var(--surface)', borderRadius: 10, padding: 3,
          border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
          {[{ id: 'projetos', label: 'Projetos' }, { id: 'propostas', label: 'Propostas' }, { id: 'recursos', label: 'Recursos' }, { id: 'financeiro', label: 'Financeiro' }, { id: 'fechamento', label: 'Fechamento' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: tab === t.id ? 700 : 500, fontFamily: 'var(--font)',
                background: tab === t.id ? 'var(--accent)' : 'none',
                color: tab === t.id ? '#fff' : 'var(--text-muted)',
                boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.18)' : 'none',
                transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* KPIs */}
        {tab === 'fechamento' && <FechamentoHoras embedded showKpis={showKpis} />}
        {tab === 'recursos'   && <MapaRecursos projetos={projetos} members={members} timeLogs={timeLogs} showKpis={showKpis} />}
        {tab === 'financeiro' && <PainelFinanceiro projetos={projetos} timeLogs={timeLogs} showKpis={showKpis} />}

        {tab === 'projetos' && showKpis && <div style={pg.kpis}>
          <KpiCard label="Total projetos"   value={projetos.length}               color="var(--accent)" />
          <KpiCard label="Em andamento"     value={emAndamento}                   color="#3B82F6" />
          <KpiCard label="Bloqueados"       value={blockedIds.size}               color="#EF4444" />
          <KpiCard label="Horas estimadas"  value={`${totalHrsEst}h`}            color="#10B981" />
          <KpiCard label="Executadas"       value={`${totalHrsExe.toFixed(0)}h`} color="var(--accent)" />
        </div>}

        {/* Toolbar — igual Pipeline */}
        <div style={{ ...pg.toolbar, display: (tab === 'fechamento' || tab === 'recursos' || tab === 'financeiro' || tab === 'propostas') ? 'none' : undefined }}>

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
        <div style={{ ...pg.resultRow, display: (tab === 'fechamento' || tab === 'recursos' || tab === 'financeiro' || tab === 'propostas') ? 'none' : undefined }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            {filtered.length} projeto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Propostas — área scrollável própria */}
      {tab === 'propostas' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 24px' }}>
          <PropostasTab projetos={projetos} phases={phases} opps={opps} />
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
