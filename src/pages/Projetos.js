import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  FASES_MIT, STATUS_PROJETO, CRITICALITY_CFG, PHASE_NAMES,
  MOCK_PROJECT_ATTACHMENTS, MOCK_OPP_HISTORICO, MOCK_OPORTUNIDADES_LISTA,
} from '../data/mockProjetos'
import { useLocalState } from '../hooks/useLocalState'
import { useProjects } from '../hooks/useProjects'
import SearchSelect from '../components/SearchSelect'
import { MOCK_USUARIOS } from '../data/mockUsuarios'
import { useFormLayout } from '../hooks/useFormLayout'
import DynamicFormLayout from '../components/DynamicFormLayout'
import Button from '../components/Button'
import Drawer, { DrawerSidePanel, DrawerSidePanelSection, DrawerSidePanelField } from '../components/Drawer'

const ACCENT = 'var(--accent)'

const EMPTY_FORM = {
  name: '', company_nome: '', franchise_nome: '',
  phase: 'iniciacao', current_phase_index: 1, status: 'em_andamento',
  total_hours_estimated: '', total_hours_executed: 0,
  start_date: '', end_date_estimated: '', notes: '', opportunity_id: '',
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
function NovoProjetoModal({ defaultPhase, defaultPhaseIndex, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, phase: defaultPhase || 'iniciacao', current_phase_index: defaultPhaseIndex || 1 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Drawer
      open
      onClose={onClose}
      title="Novo Projeto"
      subtitle="Operação · Projetos"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => form.name.trim() && onSave(form)}>Criar projeto</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, margin: '-12px -14px' }}>
        {/* Formulário principal */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={ms.fg}>
              <label style={ms.lbl}>Nome do Projeto <span style={{ color: 'var(--red)' }}>*</span></label>
              <input style={ms.inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Implantação ERP — Empresa X" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={ms.fg}>
                <label style={ms.lbl}>Empresa <span style={{ color: 'var(--red)' }}>*</span></label>
                <input style={ms.inp} value={form.company_nome} onChange={e => set('company_nome', e.target.value)} placeholder="Nexus Tech" />
              </div>
              <div style={ms.fg}>
                <label style={ms.lbl}>Franquia / Canal</label>
                <input style={ms.inp} value={form.franchise_nome} onChange={e => set('franchise_nome', e.target.value)} placeholder="Canal SP Sul" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={ms.fg}>
                <label style={ms.lbl}>Data de Início</label>
                <input style={ms.inp} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div style={ms.fg}>
                <label style={ms.lbl}>Previsão de Término</label>
                <input style={ms.inp} type="date" value={form.end_date_estimated} onChange={e => set('end_date_estimated', e.target.value)} />
              </div>
            </div>
            <div style={ms.fg}>
              <label style={ms.lbl}>Horas Estimadas</label>
              <input style={ms.inp} type="number" value={form.total_hours_estimated} onChange={e => set('total_hours_estimated', e.target.value)} placeholder="160" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={ms.fg}>
              <label style={ms.lbl}>Observações</label>
              <textarea style={{ ...ms.inp, height: 80, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Contexto, requisitos iniciais…" />
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        <DrawerSidePanel width={200}>
          <DrawerSidePanelSection label="Classificação">
            <DrawerSidePanelField label="Fase" as="select" editing value={form.phase} onChange={e => { set('phase', e.target.value); set('current_phase_index', FASES_MIT.find(x => x.value === e.target.value)?.order || 1); }}>
              {FASES_MIT.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </DrawerSidePanelField>
            <DrawerSidePanelField label="Status" as="select" editing value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUS_PROJETO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </DrawerSidePanelField>
          </DrawerSidePanelSection>
        </DrawerSidePanel>
      </div>
    </Drawer>
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
  'Líder de Projeto': { bg: 'rgba(99,102,241,0.12)', text: '#4338CA' },
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
          <div style={ms.fg}>
            <label style={ms.lbl}>Nome do projeto</label>
            <input style={ms.inp} value={form.name} onChange={set('name')} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...ms.fg, flex: 1 }}>
              <label style={ms.lbl}>Empresa cliente</label>
              <input style={ms.inp} value={form.company_nome || ''} onChange={set('company_nome')} placeholder="Nexus Tech" />
            </div>
            <div style={{ ...ms.fg, flex: 1 }}>
              <label style={ms.lbl}>Canal / Franquia</label>
              <input style={ms.inp} value={form.franchise_nome || ''} onChange={set('franchise_nome')} placeholder="Canal SP Sul" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...ms.fg, flex: 1 }}>
              <label style={ms.lbl}>Fase MIT</label>
              <select style={ms.inp} value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value, current_phase_index: FASES_MIT.find(x => x.value === e.target.value)?.order || 1 }))}>
                {FASES_MIT.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div style={{ ...ms.fg, flex: 1 }}>
              <label style={ms.lbl}>Status</label>
              <select style={ms.inp} value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_PROJETO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ ...ms.fg, flex: 1 }}>
              <label style={ms.lbl}>Horas estimadas</label>
              <input style={ms.inp} type="number" value={form.total_hours_estimated} onChange={set('total_hours_estimated')} />
            </div>
            <div style={{ ...ms.fg, flex: 1 }}>
              <label style={ms.lbl}>Início</label>
              <input style={ms.inp} type="date" value={form.start_date || ''} onChange={set('start_date')} />
            </div>
            <div style={{ ...ms.fg, flex: 1 }}>
              <label style={ms.lbl}>Previsão término</label>
              <input style={ms.inp} type="date" value={form.end_date_estimated || ''} onChange={set('end_date_estimated')} />
            </div>
          </div>
          <div style={ms.fg}>
            <label style={ms.lbl}>Observações</label>
            <textarea style={{ ...ms.inp, height: 72, resize: 'vertical' }} value={form.notes || ''} onChange={set('notes')} />
          </div>
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

// ─── Tab 1: Cronograma MIT ────────────────────────────────────────────────────
function TabCronograma({ projeto, phases, timeLogs, onAdvancePhase }) {
  const myPhases = phases.filter(p => p.project_id === projeto.id).sort((a, b) => a.phase_order - b.phase_order)
  const currentIdx = projeto.current_phase_index

  // Horas executadas por phase_id
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Sugestão de avanço de fase */}
      {showSugestao && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>💡 Sugestão do Sistema</div>
          <div style={{ fontSize: 12.5, color: '#065F46', lineHeight: 1.5 }}>
            O escopo da fase <strong>{currentPhase?.phase_name}</strong> foi concluído ({currentPct.toFixed(0)}% das horas executadas). Deseja avançar o projeto para a próxima fase?
          </div>
          <button
            style={{ ...ms.btnSuccess, alignSelf: 'flex-start', fontSize: 12 }}
            onClick={() => onAdvancePhase(projeto, currentPhase)}
          >
            Avançar para {PHASE_NAMES[currentIdx]} →
          </button>
        </div>
      )}

      {/* Timeline vertical */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {myPhases.map((ph, i) => {
          const fase    = FASES_MIT[i]
          const exe     = execByPhase[ph.id] || 0
          const est     = Number(ph.hours_estimated)
          const pct     = est > 0 ? Math.min(100, Math.round((exe / est) * 100)) : 0
          const isActive  = ph.phase_order === currentIdx
          const isDone    = ph.is_completed
          const isFuture  = ph.phase_order > currentIdx

          return (
            <div key={ph.id} style={{ display: 'flex', gap: 14 }}>
              {/* Linha vertical + dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? '#10B981' : isActive ? fase.color : 'var(--surface2)',
                  border: `2px solid ${isDone ? '#10B981' : isActive ? fase.color : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff', fontWeight: 700, marginTop: 14,
                }}>
                  {isDone ? '✓' : ph.phase_order}
                </div>
                {i < myPhases.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: isDone ? '#10B981' : 'var(--border)', minHeight: 12 }} />
                )}
              </div>

              {/* Conteúdo da fase */}
              <div style={{
                flex: 1, paddingBottom: i < myPhases.length - 1 ? 14 : 0, paddingTop: 10,
                opacity: isFuture ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: isActive ? 800 : 600, color: isActive ? fase.color : 'var(--text)' }}>{ph.phase_name}</span>
                    {isDone && <span style={{ fontSize: 10, fontWeight: 700, background: '#D1FAE5', color: '#065F46', borderRadius: 20, padding: '1px 7px' }}>Concluída</span>}
                    {isActive && <span style={{ fontSize: 10, fontWeight: 700, background: fase.bg, color: fase.text, borderRadius: 20, padding: '1px 7px' }}>Atual</span>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{est}h est.</span>
                </div>

                {/* Datas */}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {fmtDate(ph.start_date_planned)} → {fmtDate(ph.end_date_planned)}
                </div>

                {/* Progress bar por fase */}
                {!isFuture && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>{exe.toFixed(1)}h executadas</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981' }}>{pct}%</span>
                    </div>
                    <ProgressBar executed={exe} estimated={est} thin />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab 2: Timesheet ─────────────────────────────────────────────────────────
function TabTimesheet({ projeto, phases, timeLogs, onAddLog }) {
  const myPhases   = phases.filter(p => p.project_id === projeto.id).sort((a, b) => a.phase_order - b.phase_order)
  const myLogs     = timeLogs.filter(l => l.project_id === projeto.id).sort((a, b) => b.logged_at.localeCompare(a.logged_at))
  const currentPhId = `ph_${projeto.id}_${projeto.current_phase_index}`

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
              options={MOCK_USUARIOS.map(u => ({ id: u.id, label: u.nome, sublabel: u.cargo, avatar: u.avatar, color: '#6366F1' }))}
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
                        const u = MOCK_USUARIOS.find(u => u.id === log.user_id)
                        return (
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                            {u && (
                              <span style={{ width:16, height:16, borderRadius:'50%', background:'#EDE9FE', color:'#7C3AED',
                                display:'inline-flex', alignItems:'center', justifyContent:'center',
                                fontSize:8, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0 }}>
                                {u.avatar}
                              </span>
                            )}
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

function ProjetoDrawer({ projeto, phases, timeLogs, issues, attachments, members, blockedIds, onClose, onUpdate, onUpdateOpp, onAdvancePhase, onAddLog, onAddIssue, onResolveIssue, onAddMember, onRemoveMember }) {
  const [tab,      setTab]      = useState('projeto')
  const [expanded, setExpanded] = useState(false)
  const fase = FASES_MIT[projeto.current_phase_index - 1] || FASES_MIT[0]
  const isBlocked   = blockedIds.has(projeto.id)
  const pendAbertas = issues.filter(i => i.project_id === projeto.id && i.status === 'aberta').length
  const myTeam      = members.filter(m => m.project_id === projeto.id).length

  const drawerWidth = expanded ? 'calc(100vw - 160px)' : 560

  return (
    <Drawer
      open
      onClose={onClose}
      title={projeto.name}
      subtitle={`${projeto.company_nome}${projeto.franchise_nome ? ` · ${projeto.franchise_nome}` : ''}`}
    >
      {/* Badges + progress */}
      <div style={{ margin: '-12px -14px 12px', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: fase.bg, color: fase.text }}>{fase.label}</span>
          <StatusBadge status={projeto.status} />
          {isBlocked && (
            <div className="prj-blocked-badge" style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: '#EF4444', borderRadius: 20, padding: '2px 8px', letterSpacing: '0.04em' }}>⚠ BLOQUEADO</div>
          )}
        </div>
        <ProgressBar executed={Number(projeto.total_hours_executed)} estimated={Number(projeto.total_hours_estimated)} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{projeto.total_hours_executed}h executadas de {projeto.total_hours_estimated}h estimadas (projeto total)</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', margin: '0 -14px 12px', overflowX: 'auto' }}>
        {DRAWER_TABS.map(t => {
          const active = tab === t.key
          let badge = null
          if (t.key === 'bloqueios'  && pendAbertas > 0) badge = pendAbertas
          if (t.key === 'projeto'    && myTeam > 0)      badge = `${myTeam}👤`
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, minWidth: 80, padding: '10px 4px', fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'var(--accent)' : 'var(--text-muted)', background: 'none', border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: -1, whiteSpace: 'nowrap' }}>
              {t.label}
              {badge && <span style={{ fontSize: 9.5, fontWeight: 700, background: t.key === 'bloqueios' ? '#EF4444' : 'var(--surface2)', color: t.key === 'bloqueios' ? '#fff' : 'var(--text-muted)', borderRadius: 20, padding: '0 5px' }}>{badge}</span>}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'projeto'    && <TabProjeto    projeto={projeto} members={members} onUpdate={onUpdate} onUpdateOpp={onUpdateOpp} onAddMember={onAddMember} onRemoveMember={onRemoveMember} />}
      {tab === 'cronograma' && <TabCronograma projeto={projeto} phases={phases} timeLogs={timeLogs} onAdvancePhase={onAdvancePhase} />}
      {tab === 'timesheet'  && <TabTimesheet  projeto={projeto} phases={phases} timeLogs={timeLogs} onAddLog={onAddLog} />}
      {tab === 'bloqueios'  && <TabBloqueios  projeto={projeto} issues={issues} onAddIssue={onAddIssue} onResolveIssue={onResolveIssue} />}
      {tab === 'documentos' && <TabDocumentos projectId={projeto.id} attachments={attachments} />}
    </Drawer>
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
  const { projetos, phases, timeLogs, issues, members, setProjetos, setPhases, setTimeLogs, setIssues, setMembers } = useProjects()
  const [attachments] = useState(MOCK_PROJECT_ATTACHMENTS)
  const [modal,        setModal]       = useState(null)
  const [drawer,       setDrawer]      = useState(null)
  const [filtros,      setFiltros]     = useState({ status: '', franchise: '' })
  const [filtrosOpen,  setFiltrosOpen] = useState(false)
  const [dragId,       setDragId]      = useState(null)
  const [search,       setSearch]      = useLocalState('projetos:search', '')
  const [showMetrics,  setShowMetrics] = useLocalState('projetos:showMetrics', true)
  const [sortBy,       setSortBy]      = useLocalState('projetos:sortBy', 'recente')

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
  function handleCreate(form) {
    const np = { ...form, id: 'prj_' + Date.now(), tenant_id: 't1', company_id: null, franchise_id: null, created_at: new Date().toISOString().slice(0, 10) }
    setProjetos(ps => [np, ...ps])
    // Create 6 blank phases for the new project
    const now = new Date().toISOString().slice(0, 10)
    const newPhases = PHASE_NAMES.map((name, i) => ({
      id: `ph_${np.id}_${i + 1}`, project_id: np.id, tenant_id: 't1',
      phase_name: name, phase_order: i + 1,
      start_date_planned: '', end_date_planned: '',
      hours_estimated: Math.round(Number(form.total_hours_estimated) / 6) || 20,
      is_completed: false, completed_at: null,
    }))
    setPhases(ps => [...ps, ...newPhases])
    setModal(null)
  }

  function handleUpdate(updated) {
    setProjetos(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setDrawer(d => d?.id === updated.id ? { ...d, ...updated } : d)
  }

  // Advance phase
  const handleAdvancePhase = useCallback((projeto, currentPhase) => {
    const nextIdx = projeto.current_phase_index + 1
    if (nextIdx > 6) return
    const nextFase = FASES_MIT[nextIdx - 1]
    // Mark phase as completed
    setPhases(ps => ps.map(p => p.id === currentPhase.id ? { ...p, is_completed: true, completed_at: new Date().toISOString() } : p))
    // Advance project
    const updated = { ...projeto, phase: nextFase.value, current_phase_index: nextIdx, total_hours_executed: Math.round(execTotals[projeto.id] || 0) }
    setProjetos(ps => ps.map(p => p.id === projeto.id ? updated : p))
    setDrawer(updated)
  }, [execTotals, setPhases, setProjetos])

  function handleAddLog(log) {
    setTimeLogs(prev => [log, ...prev])
    // Update project total_hours_executed
    setProjetos(ps => ps.map(p => p.id === log.project_id ? { ...p, total_hours_executed: Number(p.total_hours_executed) + Number(log.hours_executed) } : p))
    setDrawer(d => d?.id === log.project_id ? { ...d, total_hours_executed: Number(d.total_hours_executed) + Number(log.hours_executed) } : d)
  }

  function handleAddIssue(iss)    { setIssues(prev => [iss, ...prev]) }
  function handleResolveIssue(id) {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status: 'resolvida', resolved_at: new Date().toISOString().slice(0, 10) } : i))
  }

  // Members
  function handleAddMember(m)       { setMembers(prev => [...prev, m]) }
  function handleRemoveMember(id)   { setMembers(prev => prev.filter(m => m.id !== id)) }

  // Pipeline link
  function handleUpdateOpp(projectId, oppId) {
    setProjetos(ps => ps.map(p => p.id === projectId ? { ...p, opportunity_id: oppId } : p))
    setDrawer(d => d?.id === projectId ? { ...d, opportunity_id: oppId } : d)
  }

  const hasFilters   = filtros.status || filtros.franchise || search
  const filterCount  = [filtros.status, filtros.franchise].filter(Boolean).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', gap: 0, overflow: 'hidden' }}>
      <PulseStyle />

      {/* ── Área de scroll (tudo exceto kanban) ── */}
      <div style={{ flexShrink: 0, padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Page header — igual Pipeline */}
        <div style={pg.pageHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={pg.breadcrumb}>
                <span>Operação</span>
                <span style={pg.sep}>›</span>
                <span>Projetos</span>
              </div>
              <h1 style={pg.title}>Projetos de Implantação</h1>
            </div>
            <button
              onClick={() => setShowMetrics(v => !v)}
              title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, marginTop: 18 }}
            >
              {showMetrics ? '∧' : '∨'}
            </button>
          </div>
          <Button onClick={() => setModal({ _new: true, phase: 'iniciacao', phaseIndex: 1 })}>+ Novo projeto</Button>
        </div>

        {/* KPIs retráteis — igual Pipeline */}
        <div style={{ display: 'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease', overflow: 'hidden' }}>
          <div style={{ minHeight: 0 }}>
            <div style={pg.kpis}>
              <KpiCard label="Total projetos"   value={projetos.length}               color="#6366F1" />
              <KpiCard label="Em andamento"     value={emAndamento}                   color="#3B82F6" />
              <KpiCard label="Bloqueados"       value={blockedIds.size}               color="#EF4444" />
              <KpiCard label="Horas estimadas"  value={`${totalHrsEst}h`}            color="#10B981" />
              <KpiCard label="Executadas"       value={`${totalHrsExe.toFixed(0)}h`} color="#8B5CF6" />
            </div>
          </div>
        </div>

        {/* Toolbar — igual Pipeline */}
        <div style={pg.toolbar}>

          {/* ── Esquerda ── */}
          <div style={pg.tbLeft}>
            {/* Badge metodologia fixo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', fontSize: 12, fontWeight: 600, color: 'var(--text)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              ▦ Kanban MIT
            </div>

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

            {/* Filtros avançados */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setFiltrosOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 13px', height: 36, borderRadius: 8, border: `1.5px solid ${filterCount > 0 ? 'var(--accent)' : 'var(--border)'}`, background: filterCount > 0 ? 'var(--accent-glow)' : 'var(--surface)', color: filterCount > 0 ? 'var(--accent)' : 'var(--text-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'var(--font)' }}
              >
                ⚡ Filtros
                {filterCount > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{filterCount}</span>}
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

            {/* View toggle (apenas kanban disponível) */}
            <div style={pg.viewToggle}>
              <button style={{ ...pg.viewBtn, ...pg.viewBtnOn }} title="Kanban">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="4" height="12" rx="1" fill="currentColor"/><rect x="5.5" y="1" width="3" height="9" rx="1" fill="currentColor"/><rect x="9" y="1" width="4" height="11" rx="1" fill="currentColor"/></svg>
              </button>
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
        <div style={pg.resultRow}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            {filtered.length} projeto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Kanban */}
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

      {/* Modal — criar */}
      {modal && (
        <NovoProjetoModal
          defaultPhase={modal.phase}
          defaultPhaseIndex={modal.phaseIndex}
          onSave={handleCreate}
          onClose={() => setModal(null)}
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
          onAddLog={handleAddLog}
          onAddIssue={handleAddIssue}
          onResolveIssue={handleResolveIssue}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
        />
      )}
    </div>
  )
}
