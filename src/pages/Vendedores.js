import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { MOCK_COMPANIES, COMPANY_TYPE_CFG, COMPANIES_STORAGE_KEY } from '../data/mockCompanies'
import { useSellers } from '../hooks/useSellers'
import { useAuditLog } from '../hooks/useAuditLog'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField } from '../components/ui/SlideOver'
import Button from '../components/Button'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCPF(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}
function fmtPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}
function uid() { return Date.now() + Math.floor(Math.random() * 1000) }
function initials(nome) {
  if (!nome) return '?'
  return nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = {
  isv_admin:         { label: 'ISV Admin'      },
  franchise_manager: { label: 'Ger. Franquia'  },
  seller:            { label: 'Vendedor'        },
  pre_sales:         { label: 'Pré-vendas'     },
  project_manager:   { label: 'Ger. Projetos'  },
}

const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']

const STATUS_CFG = {
  ativo:    { label: 'Ativo',    color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  inativo:  { label: 'Inativo',  color: '#9A9590', bg: '#F1F5F9', text: '#475569' },
  afastado: { label: 'Afastado', color: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
}

const EMPTY_FORM = {
  nome: '', email: '', telefone: '', cpf: '',
  role: 'seller', regiao: '', status: 'ativo',
  company_id: null,
  franquia_id: null, franquia_nome: '',
  meta_mensal: '', observacoes: '',
  linkedin_url: '', whatsapp: '',
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.inativo
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function RoleBadge({ role }) {
  const ROLE_COLORS = {
    isv_admin:         { bg:'#EDE9FE', text:'#6D28D9' },
    franchise_manager: { bg:'#DBEAFE', text:'#1E40AF' },
    seller:            { bg:'#F1F5F9', text:'#475569' },
    pre_sales:         { bg:'#FEF3C7', text:'#92400E' },
    project_manager:   { bg:'#ECFDF5', text:'#065F46' },
  }
  const cfg = ROLE_COLORS[role] || { bg:'#F1F5F9', text:'#475569' }
  const label = ROLES[role]?.label || role
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
      {label}
    </span>
  )
}

// ─── SlideOver de Cadastro ────────────────────────────────────────────────────
function ContatoCanalSlideOver({ open, initial, onSave, onClose, onDelete, franquiasOpts = [], todos = [] }) {
  const isNew = !initial?.id
  const [form, setForm] = useState(initial ? { ...EMPTY_FORM, ...initial } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [errs, setErrs] = useState({})

  useMemo(() => {
    setForm(initial ? { ...EMPTY_FORM, ...initial } : { ...EMPTY_FORM })
    setErrs({})
  }, [initial])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errs[k]) setErrs(p => ({ ...p, [k]: '' })) }

  function handleSave() {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (form.email?.trim()) {
      const emailLow = form.email.trim().toLowerCase()
      const dup = todos.find(s => s.id !== initial?.id && s.email?.toLowerCase() === emailLow)
      if (dup) e.email = `E-mail já cadastrado: ${dup.nome}`
    }
    if (form.cpf?.replace(/\D/g,'')) {
      const cpfRaw = form.cpf.replace(/\D/g,'')
      const dup = todos.find(s => s.id !== initial?.id && s.cpf?.replace(/\D/g,'') === cpfRaw)
      if (dup) e.cpf = `CPF já cadastrado: ${dup.nome}`
    }
    if (Object.keys(e).length) { setErrs(e); return }
    setSaving(true)
    onSave(form)
    setSaving(false)
  }

  const headerActions = !isNew ? (
    <Button variant="danger" onClick={() => {
      if (window.confirm('Excluir este contato? Esta ação não pode ser desfeita.')) onDelete(initial.id)
    }}>Excluir</Button>
  ) : null

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      title={isNew ? 'Novo Contato Canal' : form.nome || 'Editar Contato Canal'}
      subtitle={isNew ? 'Preencha os dados do contato' : form.email}
      headerActions={headerActions}
      columns={2}
    >
      <FormGrid cols={2}>
        <FormField label="Nome" required error={errs.nome} style={{ gridColumn: 'span 2' }}>
          <input className="so-field" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo"
            style={{ borderColor: errs.nome ? '#DC2626' : '' }} />
        </FormField>

        <FormField label="E-mail" error={errs.email}>
          <input className="so-field" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@empresa.com"
            style={{ borderColor: errs.email ? '#DC2626' : '' }} />
        </FormField>

        <FormField label="Telefone">
          <input className="so-field" value={form.telefone} onChange={e => set('telefone', fmtPhone(e.target.value))} placeholder="(00) 00000-0000" />
        </FormField>

        <FormField label="CPF" error={errs.cpf}>
          <input className="so-field" value={form.cpf} onChange={e => set('cpf', fmtCPF(e.target.value))} placeholder="000.000.000-00"
            style={{ borderColor: errs.cpf ? '#DC2626' : '' }} />
        </FormField>

        <FormField label="Cargo / Papel">
          <select className="so-field" value={form.role} onChange={e => set('role', e.target.value)}>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </FormField>

        <FormField label="Status">
          <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </FormField>

        <FormField label="Região">
          <select className="so-field" value={form.regiao} onChange={e => set('regiao', e.target.value)}>
            <option value="">Selecionar…</option>
            {REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </FormField>

        <FormField label="Franquia / Equipe" style={{ gridColumn: 'span 2' }}>
          <select className="so-field" value={form.franquia_id || ''}
            onChange={e => {
              const opt = franquiasOpts.find(o => String(o.id) === e.target.value)
              setForm(f => ({ ...f, franquia_id: e.target.value || null, franquia_nome: opt?.label || '' }))
            }}>
            <option value="">— Nenhuma —</option>
            {franquiasOpts.map(o => (
              <option key={o.id} value={o.id}>{o.sublabel ? `[${o.sublabel}] ` : ''}{o.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Meta mensal (R$)">
          <input className="so-field" type="number" min="0" value={form.meta_mensal} onChange={e => set('meta_mensal', e.target.value)} placeholder="0" />
        </FormField>

        <FormField label="LinkedIn">
          <input className="so-field" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/usuario" />
        </FormField>

        <FormField label="WhatsApp">
          <input className="so-field" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" />
        </FormField>

        <FormField label="Observações internas" style={{ gridColumn: 'span 2' }}>
          <textarea className="so-field" rows={3} style={{ resize:'vertical' }} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Notas internas…" />
        </FormField>
      </FormGrid>
    </SlideOver>
  )
}

// ─── Import SlideOver ─────────────────────────────────────────────────────────
function ImportSlideOver({ open, onClose, existingContacts, onImport }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map((line, i) => {
      const vals = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''))
      const row = {}
      headers.forEach((h, hi) => { row[h] = vals[hi] || '' })
      return { row, idx: i + 2 }
    })
  }

  function handleFile(f) {
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const rows = parseCSV(e.target.result)
      const errs = []
      rows.forEach(({ row, idx }) => {
        if (!row.nome?.trim()) errs.push(`Linha ${idx}: nome obrigatório`)
      })
      setErrors(errs)
      setPreview(rows.slice(0, 5).map(r => r.row))
    }
    reader.readAsText(f, 'UTF-8')
  }

  function handleDownloadTemplate() {
    const headers = ['nome','email','telefone','cpf','role','regiao','status','meta_mensal']
    const example = ['João da Silva','joao@empresa.com','(11) 99999-0000','123.456.789-00','seller','Sudeste','ativo','15000']
    const csv = [headers.join(';'), example.join(';')].join('\n')
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='template_contatos_canais.csv'; a.click(); URL.revokeObjectURL(url)
  }

  async function handleImport() {
    setImporting(true)
    await new Promise(r => setTimeout(r, 600))
    const rows = parseCSV(await file.text())
    const existing = new Set(existingContacts.map(v => v.email?.toLowerCase()))
    const newRows = [], skipped = []
    rows.forEach(({ row }) => {
      if (!row.nome?.trim()) return
      if (existing.has(row.email?.toLowerCase())) { skipped.push(row.nome); return }
      newRows.push({ ...EMPTY_FORM, ...row, id: uid(), criado: new Date().toISOString().slice(0,10), status: row.status || 'ativo', role: row.role || 'seller' })
    })
    onImport(newRows)
    setImporting(false)
    onClose()
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      onSave={handleImport}
      saving={importing}
      saveLabel="Importar"
      title="Importar Contatos Canais"
      subtitle="Arquivo CSV separado por ponto-e-vírgula (;)"
      columns={1}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <Button variant="secondary" onClick={handleDownloadTemplate}>
          ↓ Baixar template CSV
        </Button>

        <div
          style={{ border:'2px dashed var(--border)', borderRadius:10, padding:24, textAlign:'center', cursor:'pointer' }}
          onClick={() => document.getElementById('import-csv-input').click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}>
          <input id="import-csv-input" type="file" accept=".csv" style={{ display:'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          <div style={{ fontSize:13, color:'var(--text-muted)' }}>
            {file
              ? <span style={{ color:'var(--accent)', fontWeight:600 }}>{file.name}</span>
              : 'Arraste ou clique para selecionar o CSV'}
          </div>
        </div>

        {errors.length > 0 && (
          <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'10px 14px' }}>
            {errors.map((e, i) => <div key={i} style={{ fontSize:12, color:'var(--red)', fontFamily:'var(--mono)' }}>{e}</div>)}
          </div>
        )}

        {preview.length > 0 && (
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:6 }}>
              Pré-visualização ({preview.length} linhas)
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>{Object.keys(preview[0]).map(k => <th key={k} style={{ padding:'6px 10px', textAlign:'left', background:'var(--surface2)', fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase' }}>{k}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>{Object.values(row).map((v, j) => <td key={j} style={{ padding:'6px 10px', borderBottom:'1px solid var(--border2)', fontFamily:'var(--mono)', fontSize:11 }}>{v || '—'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SlideOver>
  )
}

// ─── Avatar cell ──────────────────────────────────────────────────────────────
function AvatarCell({ nome, email }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:32, height:32, borderRadius:8, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0 }}>
        {initials(nome)}
      </div>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{nome}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:1 }}>{email}</div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Vendedores() {
  const [companies]   = useLocalState(COMPANIES_STORAGE_KEY, MOCK_COMPANIES)
  const [franquiasCad] = useLocalState('settings:franquias_v2', [])
  const { sellers, save: saveSeller, remove: deleteSeller, bulkSetStatus, importMany } = useSellers()
  const { registrar: log } = useAuditLog()

  const franquiasOpts = useMemo(() =>
    franquiasCad.length > 0
      ? franquiasCad.filter(f => f.classificacao !== 'unidade' && f.situacao !== 'inativo')
          .map(f => ({ id: String(f.id), label: f.nome, sublabel: f.codigo || '' }))
      : companies.filter(c => c.type === 'FRANCHISE').map(c => ({ id: String(c.id), label: c.name, sublabel: '' }))
  , [franquiasCad, companies])

  const [search, setSearch]           = useLocalState('contatos_canais:search', '')
  const [filterStatus, setFilterStatus] = useLocalState('contatos_canais:status', '')
  const [filterRole, setFilterRole]   = useLocalState('contatos_canais:role', '')

  const [slideOpen, setSlideOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  // ── Filtrar ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = sellers
    if (search) {
      const q = search.toLowerCase()
      const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))
      list = list.filter(f =>
        f.nome?.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q) ||
        f.cpf?.includes(q) ||
        companyMap[f.company_id]?.name?.toLowerCase().includes(q)
      )
    }
    if (filterStatus) list = list.filter(f => f.status === filterStatus)
    if (filterRole)   list = list.filter(f => f.role === filterRole)
    return [...list].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
  }, [sellers, companies, search, filterStatus, filterRole])

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  function handleSave(form) {
    const isNew = !editing?.id
    saveSeller(isNew ? form : { ...editing, ...form })
    log(isNew ? 'criar' : 'editar', 'vendedor', editing?.id || form.id, { descricao: `Vendedor ${isNew ? 'criado' : 'editado'}: ${form.nome || ''}` })
    setSlideOpen(false)
    setEditing(null)
  }
  function handleDelete(id) {
    const s = sellers.find(x => x.id === id)
    deleteSeller(id)
    log('excluir', 'vendedor', id, { descricao: `Vendedor excluído: ${s?.nome || id}` })
    setSlideOpen(false)
    setEditing(null)
  }
  function openNew() { setEditing(null); setSlideOpen(true) }
  function openEdit(row) { setEditing(row); setSlideOpen(true) }

  // ── Export ───────────────────────────────────────────────────────────────────
  function handleExport() {
    const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))
    const headers = ['nome','email','telefone','cpf','role','regiao','status','empresa','meta_mensal','criado']
    const csv = [headers.join(';'), ...filtered.map(f => [
      f.nome, f.email||'', f.telefone||'', f.cpf||'', f.role||'', f.regiao||'', f.status||'',
      companyMap[f.company_id]?.name || '', f.meta_mensal||'', f.criado||''
    ].join(';'))].join('\n')
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `contatos_canais_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const totalAtivos   = sellers.filter(f => f.status === 'ativo').length
  const totalAfastado = sellers.filter(f => f.status === 'afastado').length
  const metaMedia     = sellers.length > 0
    ? Math.round(sellers.reduce((s, f) => s + (Number(f.meta_mensal) || 0), 0) / sellers.length)
    : 0

  const kpis = (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
      {[
        { label:'Total de contatos', value: sellers.length },
        { label:'Ativos',            value: totalAtivos, accent: true },
        { label:'Afastados',         value: totalAfastado },
        { label:'Meta média/mês',    value: metaMedia ? `R$ ${metaMedia.toLocaleString('pt-BR')}` : '—', mono: true },
      ].map(k => (
        <div key={k.label} style={{ background:'var(--surface)', borderRadius:10, padding:'14px 16px', border:'1px solid var(--border2)', borderTop: k.accent ? '3px solid var(--accent)' : '3px solid var(--border)' }}>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px', fontFamily: k.mono ? 'var(--mono)' : 'var(--font)' }}>{k.value}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{k.label}</div>
        </div>
      ))}
    </div>
  )

  // ── Colunas ───────────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'nome',
      label: 'Contato Canal',
      render: (_, row) => <AvatarCell nome={row.nome} email={row.email} />,
    },
    {
      key: 'role',
      label: 'Papel',
      render: (val) => <RoleBadge role={val} />,
    },
    {
      key: 'company_id',
      label: 'Empresa',
      render: (val) => {
        const c = companies.find(co => co.id === val)
        if (!c) return <span style={{ color:'var(--border)', fontSize:12 }}>—</span>
        const tc = COMPANY_TYPE_CFG[c.type] || {}
        return (
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12 }}>
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4, background:tc.bg, color:tc.color, letterSpacing:'0.04em' }}>{tc.label}</span>
            <span style={{ color:'var(--text-soft)', fontWeight:500 }}>{c.name}</span>
          </span>
        )
      },
    },
    {
      key: 'regiao',
      label: 'Região',
      render: (val) => <span style={{ fontSize:12, color:'var(--text-soft)' }}>{val || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'meta_mensal',
      label: 'Meta/mês',
      render: (val) => (
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-soft)' }}>
          {val ? `R$ ${Number(val).toLocaleString('pt-BR')}` : '—'}
        </span>
      ),
    },
  ]

  // ── Filtros ───────────────────────────────────────────────────────────────────
  const filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label })),
    },
    {
      key: 'role',
      label: 'Papel',
      type: 'select',
      options: Object.entries(ROLES).map(([k, v]) => ({ value: k, label: v.label })),
    },
  ]

  const activeFilters = { status: filterStatus, role: filterRole }
  function handleFilterChange(key, val) {
    if (key === 'status') setFilterStatus(val)
    if (key === 'role')   setFilterRole(val)
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────────
  const bulkActions = Object.entries(STATUS_CFG).map(([k, v]) => ({
    label: `→ ${v.label}`,
    onClick: (ids) => bulkSetStatus(ids, k),
  }))

  // ── Card render ───────────────────────────────────────────────────────────────
  function renderCard(row) {
    const company = companies.find(c => c.id === row.company_id)
    const tc = company ? (COMPANY_TYPE_CFG[company.type] || {}) : {}
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0 }}>
            {initials(row.nome)}
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{row.nome}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{row.email}</div>
          </div>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          <RoleBadge role={row.role} />
          <StatusBadge status={row.status} />
        </div>
        {company && (
          <div style={{ fontSize:12, color:'var(--text-soft)', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:4, background:tc.bg, color:tc.color }}>{tc.label}</span>
            {company.name}
          </div>
        )}
        {row.regiao && <div style={{ fontSize:11, color:'var(--text-muted)' }}>📍 {row.regiao}</div>}
        {row.meta_mensal > 0 && (
          <div style={{ fontSize:12, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>
            Meta: R$ {Number(row.meta_mensal).toLocaleString('pt-BR')}/mês
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <BrowseLayout
        columns={columns}
        data={filtered}
        kpis={kpis}
        kpisLabel="Indicadores"
        onNew={openNew}
        newLabel="+ Novo Contato"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        bulkActions={bulkActions}
        bulkEditFields={[
          { key: 'role', label: 'Perfil', type: 'select',
            options: Object.entries(ROLES).map(([k, v]) => ({ value: k, label: v.label })) },
          { key: 'regiao', label: 'Região', type: 'select',
            options: REGIOES.map(r => ({ value: r, label: r })) },
        ]}
        onBulkEdit={(ids, changes) =>
          ids.forEach(id => { const s = sellers.find(s => s.id === id); if (s) saveSeller({ ...s, ...changes }) })
        }
        renderCard={renderCard}
        storageKey="contatos_canais"
        onRowClick={openEdit}
        onImport={() => setImportOpen(true)}
        onExportCsv={handleExport}
        emptyState={<div style={{ textAlign:'center', color:'var(--text-muted)', padding:'40px 0', fontSize:13 }}>Nenhum contato encontrado.</div>}
      />

      <ContatoCanalSlideOver
        open={slideOpen}
        initial={editing}
        todos={sellers}
        onSave={handleSave}
        onClose={() => { setSlideOpen(false); setEditing(null) }}
        onDelete={handleDelete}
        franquiasOpts={franquiasOpts}
      />

      <ImportSlideOver
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingContacts={sellers}
        onImport={rows => { importMany(rows); setImportOpen(false) }}
      />
    </>
  )
}
