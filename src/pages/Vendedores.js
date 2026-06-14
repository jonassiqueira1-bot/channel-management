import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useLocalState } from '../hooks/useLocalState'
import { MOCK_COMPANIES, COMPANY_TYPE_CFG, COMPANIES_STORAGE_KEY } from '../data/mockCompanies'
import { useSellers } from '../hooks/useSellers'
import SearchSelect from '../components/SearchSelect'
import { useFormLayout } from '../hooks/useFormLayout'
import DynamicFormLayout from '../components/DynamicFormLayout'

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
  isv_admin:         { label: 'ISV Admin',       bg: '#EDE9FE', text: '#6D28D9' },
  franchise_manager: { label: 'Ger. Franquia',   bg: '#DBEAFE', text: '#1E40AF' },
  seller:            { label: 'Vendedor',         bg: '#F1F5F9', text: '#475569' },
  pre_sales:         { label: 'Pré-vendas',       bg: '#FEF3C7', text: '#92400E' },
  project_manager:   { label: 'Ger. Projetos',   bg: '#ECFDF5', text: '#065F46' },
}

const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']

const STATUS_MAP = {
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
}

const FUNC_STORAGE_KEY = 'funcionarios:data_v2'

// ─── Mock funcionários ────────────────────────────────────────────────────────
const MOCK_FUNCIONARIOS = [
  { id:1, nome:'Lucas Ferreira',   email:'lucas@nexustech.com.br',   telefone:'(11) 98888-1001', cpf:'123.456.789-00', role:'franchise_manager', regiao:'Sudeste', status:'ativo',    company_id:'a0000000-0000-0000-0000-000000000002', meta_mensal:25000, criado:'2024-03-15' },
  { id:2, nome:'Ana Costa',        email:'ana@alphadist.com.br',      telefone:'(41) 97777-2002', cpf:'234.567.890-11', role:'seller',            regiao:'Sul',     status:'ativo',    company_id:'a0000000-0000-0000-0000-000000000003', meta_mensal:18000, criado:'2024-05-28' },
  { id:3, nome:'Pedro Alves',      email:'pedro@nexustech.com.br',    telefone:'(31) 96666-3003', cpf:'345.678.901-22', role:'seller',            regiao:'Sudeste', status:'ativo',    company_id:'a0000000-0000-0000-0000-000000000002', meta_mensal:12000, criado:'2024-06-10' },
  { id:4, nome:'Carla Menezes',    email:'carla@alphadist.com.br',    telefone:'(21) 95555-4004', cpf:'456.789.012-33', role:'pre_sales',         regiao:'Sudeste', status:'ativo',    company_id:'a0000000-0000-0000-0000-000000000003', meta_mensal:22000, criado:'2024-01-20' },
  { id:5, nome:'João Lima',        email:'joao@nexustech.com.br',     telefone:'(16) 94444-5005', cpf:'567.890.123-44', role:'seller',            regiao:'Sudeste', status:'afastado', company_id:'a0000000-0000-0000-0000-000000000002', meta_mensal:10000, criado:'2023-11-15' },
  { id:6, nome:'Mariana Silva',    email:'mariana@fincorp.com.br',    telefone:'(11) 93333-6006', cpf:'678.901.234-55', role:'franchise_manager', regiao:'Sudeste', status:'ativo',    company_id:'a0000000-0000-0000-0000-000000000004', meta_mensal:40000, criado:'2023-08-25' },
  { id:7, nome:'Rafael Santos',    email:'rafael@fincorp.com.br',     telefone:'(19) 92222-7007', cpf:'789.012.345-66', role:'pre_sales',         regiao:'Sudeste', status:'ativo',    company_id:'a0000000-0000-0000-0000-000000000004', meta_mensal:8000,  criado:'2024-06-12' },
  { id:8, nome:'Fernanda Rocha',   email:'fernanda@alphadist.com.br', telefone:'(51) 91111-8008', cpf:'890.123.456-77', role:'project_manager',   regiao:'Sul',     status:'inativo',  company_id:'a0000000-0000-0000-0000-000000000003', meta_mensal:20000, criado:'2024-03-05' },
  { id:9, nome:'Bruno Tavares',    email:'bruno@ngi.com.br',          telefone:'(11) 90000-9009', cpf:'901.234.567-88', role:'isv_admin',         regiao:'Sudeste', status:'ativo',    company_id:'a0000000-0000-0000-0000-000000000001', meta_mensal:0,     criado:'2023-01-10' },
]

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.inativo
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function RoleBadge({ role }) {
  const cfg = ROLES[role] || { label: role, bg:'#F1F5F9', text:'#475569' }
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
      {cfg.label}
    </span>
  )
}

function CompanyTag({ companyId, companies }) {
  const company = companies.find(c => c.id === companyId)
  if (!company) return <span style={{ color:'var(--border)', fontSize:12 }}>—</span>
  const typeCfg = COMPANY_TYPE_CFG[company.type] || {}
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12 }}>
      <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4, background:typeCfg.bg, color:typeCfg.color, letterSpacing:'0.04em', flexShrink:0 }}>
        {typeCfg.label}
      </span>
      <span style={{ color:'var(--text-soft)', fontWeight:500 }}>{company.name}</span>
    </span>
  )
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate, onChange, title }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate }, [indeterminate])
  return (
    <label style={{ display:'flex', alignItems:'center', cursor:'pointer' }} title={title}>
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
        style={{ width:15, height:15, cursor:'pointer', accentColor:'var(--accent)' }} />
    </label>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, accent, mono }) {
  return (
    <div style={{ ...p.kpi, ...(accent ? { borderTopColor:'var(--accent)' } : {}) }}>
      <span style={{ ...p.kpiVal, fontFamily: mono ? 'var(--mono)' : 'var(--font)' }}>{value}</span>
      <span style={p.kpiLbl}>{label}</span>
    </div>
  )
}

// ─── Company Search autocomplete ───────────────────────────────────────────────
function CompanySearch({ value, valueName, onChange, companies, filterTypes }) {
  const [query, setQuery] = useState(valueName || '')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  const options = useMemo(() => {
    const q = query.toLowerCase()
    return companies.filter(c =>
      (!filterTypes || filterTypes.includes(c.type)) &&
      c.name.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [query, companies, filterTypes])

  useEffect(() => { setQuery(valueName || '') }, [valueName])

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input
          style={{ ...m.input, paddingRight: value ? 28 : 12 }}
          placeholder="Buscar empresa…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {value && (
          <button type="button" onClick={() => { onChange(null); setQuery('') }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, padding:0 }}>
            ✕
          </button>
        )}
      </div>
      {open && options.length > 0 && (
        <div style={ar.dropdown}>
          {options.map(c => {
            const typeCfg = COMPANY_TYPE_CFG[c.type] || {}
            return (
              <button type="button" key={c.id} style={ar.option}
                onMouseDown={() => { onChange(c.id); setQuery(c.name); setOpen(false) }}>
                <span style={{ width:28, height:28, borderRadius:6, background: typeCfg.bg || 'var(--accent-glow)', color: typeCfg.color || 'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0, border:'1px solid rgba(0,0,0,0.06)' }}>
                  {c.name.slice(0,2).toUpperCase()}
                </span>
                <span>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{typeCfg.label} · {c.city}/{c.state}</div>
                </span>
              </button>
            )
          })}
        </div>
      )}
      {open && query.length > 1 && options.length === 0 && (
        <div style={{ ...ar.dropdown, padding:'12px 14px', color:'var(--text-muted)', fontSize:13 }}>Nenhuma empresa encontrada</div>
      )}
    </div>
  )
}

const ar = {
  dropdown: { position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:200, overflow:'hidden', maxHeight:240, overflowY:'auto' },
  option:   { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left' },
}

// ─── Section / Field helpers ───────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', padding:'16px 0 6px', borderBottom:'1px solid var(--border2)', marginBottom:12 }}>
      {children}
    </div>
  )
}

function Field({ label, children, required }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--text-muted)' }}>
        {label}{required && <span style={{ color:'var(--red)', marginLeft:3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Eye icon ─────────────────────────────────────────────────────────────────

// ─── Import modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onDownloadTemplate, existingFunc, onImport }) {
  const [file, setFile]           = useState(null)
  const [preview, setPreview]     = useState([])
  const [errors, setErrors]       = useState([])
  const [importing, setImporting] = useState(false)
  const dropRef                   = useRef(null)

  function parseCSV(text) {
    const lines   = text.split(/\r?\n/).filter(l => l.trim())
    const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map((line, i) => {
      const vals = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''))
      const row  = {}
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

  async function handleImport() {
    setImporting(true)
    await new Promise(r => setTimeout(r, 600))
    const rows = parseCSV(await file.text())
    const existing = new Set(existingFunc.map(v => v.email?.toLowerCase()))
    const newRows = [], skipped = []
    rows.forEach(({ row }) => {
      if (!row.nome?.trim()) return
      if (existing.has(row.email?.toLowerCase())) { skipped.push(row.nome); return }
      newRows.push({ ...EMPTY_FORM, ...row, id: uid(), criado: new Date().toISOString().slice(0,10), status: row.status || 'ativo', role: row.role || 'seller' })
    })
    onImport(newRows, { id: Date.now(), fileName: file.name, date: new Date().toLocaleString('pt-BR'), total: newRows.length, skipped: skipped.length })
    setImporting(false)
  }

  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...m.modal, maxWidth:520 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Importar Contatos Canais</div>
            <div style={m.subtitle}>Arquivo CSV separado por ponto-e-vírgula (;)</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={m.body}>
          <button onClick={onDownloadTemplate}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'var(--accent-glow)', color:'var(--accent)', border:'1px solid rgba(30,58,95,0.15)', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 }}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Baixar template CSV
          </button>

          <div ref={dropRef}
            onDragOver={e => { e.preventDefault(); dropRef.current.style.borderColor = 'var(--accent)' }}
            onDragLeave={() => { dropRef.current.style.borderColor = 'var(--border)' }}
            onDrop={e => { e.preventDefault(); dropRef.current.style.borderColor = 'var(--border)'; handleFile(e.dataTransfer.files[0]) }}
            style={{ border:'2px dashed var(--border)', borderRadius:10, padding:'24px', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s' }}
            onClick={() => document.getElementById('func-csv-input').click()}>
            <input id="func-csv-input" type="file" accept=".csv" style={{ display:'none' }}
              onChange={e => handleFile(e.target.files[0])} />
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>
              {file ? <span style={{ color:'var(--accent)', fontWeight:600 }}>{file.name}</span> : 'Arraste ou clique para selecionar o CSV'}
            </div>
          </div>

          {errors.length > 0 && (
            <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'10px 14px' }}>
              {errors.map((e, i) => <div key={i} style={{ fontSize:12, color:'var(--red)', fontFamily:'var(--mono)' }}>{e}</div>)}
            </div>
          )}

          {preview.length > 0 && (
            <div style={{ overflowX:'auto' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:6 }}>Pré-visualização ({preview.length} linhas)</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{Object.keys(preview[0]).map(k => <th key={k} style={{ ...p.th, background:'var(--surface2)' }}>{k}</th>)}</tr></thead>
                <tbody>{preview.map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j} style={{ ...p.td, borderBottom:'1px solid var(--border2)', fontFamily:'var(--mono)', fontSize:11 }}>{v || '—'}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
        <div style={m.footer}>
          <button style={m.btn} onClick={onClose}>Cancelar</button>
          <button style={{ ...m.btnPrimary, opacity: (!file || errors.length > 0 || importing) ? 0.6 : 1 }}
            disabled={!file || errors.length > 0 || importing}
            onClick={handleImport}>
            {importing ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Contato Canal modal (criar / editar) ─────────────────────────────────────
function FuncionarioModal({ onClose, onSave, onDelete, initial, companies }) {
  const franchiseOptions = useMemo(() =>
    companies
      .filter(c => c.type === 'FRANCHISE')
      .map(c => ({ id: c.id, label: c.name, sublabel: c.type }))
  , [companies])

  const [form, setForm] = useState(() => {
    if (!initial) return { ...EMPTY_FORM }
    return {
      nome:          initial.nome          || '',
      email:         initial.email         || '',
      telefone:      initial.telefone      || '',
      cpf:           initial.cpf           || '',
      role:          initial.role          || 'seller',
      regiao:        initial.regiao        || '',
      status:        initial.status        || 'ativo',
      company_id:    initial.company_id    || null,
      franquia_id:   initial.franquia_id   || null,
      franquia_nome: initial.franquia_nome || '',
      meta_mensal:   initial.meta_mensal   || '',
      observacoes:   initial.observacoes   || '',
    }
  })

  const companyName = useMemo(() =>
    companies.find(c => c.id === form.company_id)?.name || ''
  , [form.company_id, companies])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const { sections: veSections, fieldById: veFieldById } = useFormLayout('sellers')

  function renderVendedorField(key) {
    switch (key) {
      case 'nome':
        return <input style={m.input} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" required />
      case 'email':
        return <input style={m.input} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@empresa.com" />
      case 'telefone':
        return <input style={m.input} value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" />
      case 'cargo':
        return (
          <select style={m.input} value={form.role} onChange={e => set('role', e.target.value)}>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        )
      case 'status':
        return (
          <select style={m.input} value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        )
      case 'regiao':
        return (
          <select style={m.input} value={form.regiao} onChange={e => set('regiao', e.target.value)}>
            <option value="">Selecionar…</option>
            {REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )
      case 'equipe':
        return (
          <SearchSelect
            options={franchiseOptions}
            value={form.franquia_id}
            onChange={(id, nome) => setForm(f => ({ ...f, franquia_id: id, franquia_nome: nome || '' }))}
            placeholder="Pesquisar franquia…"
            allowClear
            inputStyle={m.input}
          />
        )
      case 'data_admissao': return null
      case 'meta_mensal':
        return <input style={m.input} type="number" min="0" value={form.meta_mensal} onChange={e => set('meta_mensal', e.target.value)} placeholder="0,00" />
      case 'comissao_perc': return null
      case 'observacoes':
        return <textarea style={{ ...m.input, resize:'vertical', minHeight:72 }} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Notas internas…" />
      default: return null
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) return
    onSave(form)
  }

  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.modal}>
        <div style={m.header}>
          <div>
            <div style={m.title}>{initial ? 'Editar Contato Canal' : 'Novo Contato Canal'}</div>
            {initial && <div style={m.subtitle}>{initial.email}</div>}
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display:'contents' }}>
          <div style={m.body}>
            <DynamicFormLayout
              sections={veSections}
              fieldById={veFieldById}
              renderField={renderVendedorField}
              sectionStyle={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', gap:12 }}
              labelStyle={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', display:'block', marginBottom:5 }}
            />
          </div>
          <div style={m.footer}>
            {initial
              ? <button type="button" style={{ ...m.btn, color:'var(--red)', borderColor:'rgba(239,68,68,0.3)' }}
                  onClick={() => window.confirm('Excluir este contato?') && onDelete(initial.id)}>
                  Excluir
                </button>
              : <button type="button" style={m.btn} onClick={onClose}>Cancelar</button>
            }
            <div style={{ display:'flex', gap:8 }}>
              {initial && <button type="button" style={m.btn} onClick={onClose}>Cancelar</button>}
              <button type="submit" style={m.btnPrimary}>{initial ? 'Salvar alterações' : 'Criar contato'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Table view ───────────────────────────────────────────────────────────────
function TableView({ funcionarios, onEdit, selected, onToggleAll, onToggleOne, allSelected, someSelected, companies }) {
  return (
    <div style={{ background:'var(--surface)', borderRadius:10, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid var(--border2)' }}>
            <th style={{ ...p.th, width:32, paddingLeft:14, paddingRight:4 }}>
              <Checkbox checked={allSelected} indeterminate={someSelected} onChange={onToggleAll} title="Selecionar todos" />
            </th>
            <th style={p.th}>Contato Canal</th>
            <th style={p.th}>Role</th>
            <th style={p.th}>Empresa</th>
            <th style={p.th}>Região</th>
            <th style={p.th}>Status</th>
            <th style={p.th}>Meta/mês</th>
            <th style={{ ...p.th, textAlign:'right' }} />
          </tr>
        </thead>
        <tbody>
          {funcionarios.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:14 }}>Nenhum contato encontrado</td></tr>
          )}
          {funcionarios.map((f, i) => {
            const isSelected = selected.has(f.id)
            return (
              <tr key={f.id} onClick={() => onEdit(f)}
                style={{ borderBottom: i < funcionarios.length - 1 ? '1px solid var(--border2)' : 'none',
                  cursor:'pointer', background: isSelected ? 'var(--accent-glow)' : 'transparent',
                  transition:'background 0.1s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                <td style={{ ...p.td, paddingLeft:14, paddingRight:4 }} onClick={e => { e.stopPropagation(); onToggleOne(f.id) }}>
                  <Checkbox checked={isSelected} onChange={() => onToggleOne(f.id)} />
                </td>
                <td style={p.td}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ ...p.avatar }}>
                      {initials(f.nome)}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{f.nome}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:1 }}>{f.email}</div>
                    </div>
                  </div>
                </td>
                <td style={p.td}><RoleBadge role={f.role} /></td>
                <td style={p.td}><CompanyTag companyId={f.company_id} companies={companies} /></td>
                <td style={p.td}><span style={{ fontSize:12, color:'var(--text-soft)' }}>{f.regiao || '—'}</span></td>
                <td style={p.td}><StatusBadge status={f.status} /></td>
                <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:12, color:'var(--text-soft)' }}>
                  {f.meta_mensal ? `R$ ${Number(f.meta_mensal).toLocaleString('pt-BR')}` : '—'}
                </td>
                <td style={{ ...p.td, textAlign:'right' }}>
                  <button onClick={e => { e.stopPropagation(); onEdit(f) }}
                    style={{ fontSize:11, color:'var(--accent)', background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontFamily:'var(--font)' }}>
                    Editar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Cards view ───────────────────────────────────────────────────────────────
function CardsView({ funcionarios, onEdit, selected, onToggleOne, companies }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
      {funcionarios.length === 0 && (
        <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'48px 0', color:'var(--text-muted)', fontSize:14 }}>
          Nenhum contato encontrado
        </div>
      )}
      {funcionarios.map(f => {
        const isSelected = selected.has(f.id)
        const company = companies.find(c => c.id === f.company_id)
        const typeCfg = company ? (COMPANY_TYPE_CFG[company.type] || {}) : {}
        return (
          <div key={f.id}
            style={{ background:'var(--surface)', border:`1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border2)'}`, borderRadius:12, padding:'16px', cursor:'pointer', boxShadow:'var(--shadow)', transition:'border-color 0.15s, box-shadow 0.15s', position:'relative' }}
            onClick={() => onEdit(f)}
            onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = 'var(--border)' }}}
            onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--border2)' }}}>
            <div style={{ position:'absolute', top:12, right:12 }} onClick={e => { e.stopPropagation(); onToggleOne(f.id) }}>
              <Checkbox checked={isSelected} onChange={() => onToggleOne(f.id)} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ ...p.avatar, width:40, height:40, fontSize:14, borderRadius:10 }}>{initials(f.nome)}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{f.nome}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{f.email}</div>
              </div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
              <RoleBadge role={f.role} />
              <StatusBadge status={f.status} />
            </div>
            {company && (
              <div style={{ fontSize:12, color:'var(--text-soft)', display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:4, background:typeCfg.bg, color:typeCfg.color }}>{typeCfg.label}</span>
                {company.name}
              </div>
            )}
            {f.regiao && (
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>📍 {f.regiao}</div>
            )}
            {f.meta_mensal > 0 && (
              <div style={{ fontSize:12, color:'var(--text-soft)', fontFamily:'var(--mono)', marginTop:6 }}>
                Meta: R$ {Number(f.meta_mensal).toLocaleString('pt-BR')}/mês
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Vendedores() {
  const [companies]                     = useLocalState(COMPANIES_STORAGE_KEY, MOCK_COMPANIES)
  const { sellers: funcionarios, save: saveSeller, remove: deleteSeller, bulkSetStatus, importMany, setFuncionarios } = useSellers()

  const [search, setSearch]             = useLocalState('func:search', '')
  const [filterType, setFilterType]     = useLocalState('func:filterType', '')
  const [filterStatus, setFilterStatus] = useLocalState('func:filterStatus', '')
  const [filterRole, setFilterRole]     = useLocalState('func:filterRole', '')
  const [sortBy, setSortBy]             = useLocalState('func:sortBy', 'nome')
  const [viewMode, setViewMode]         = useLocalState('func:viewMode', 'list')

  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(new Set())
  const [importModal, setImportModal]   = useState(false)
  const [showMetrics, setShowMetrics]   = useLocalState('vendedores:showMetrics', true)

  // Franchises disponíveis para bulk
  const franchiseOptions = useMemo(() =>
    companies.filter(c => c.type === 'FRANCHISE' || c.type === 'ISV')
  , [companies])

  const filtered = useMemo(() => {
    let list = funcionarios
    if (search) {
      const q = search.toLowerCase()
      const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))
      list = list.filter(f =>
        f.nome.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q) ||
        f.cpf?.includes(q) ||
        companyMap[f.company_id]?.name?.toLowerCase().includes(q)
      )
    }
    if (filterStatus) list = list.filter(f => f.status === filterStatus)
    if (filterRole)   list = list.filter(f => f.role === filterRole)
    if (filterType) {
      const companyIds = new Set(companies.filter(c => c.type === filterType).map(c => c.id))
      list = list.filter(f => companyIds.has(f.company_id))
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'nome_z')    return b.nome?.localeCompare?.(a.nome) ?? 0
      if (sortBy === 'meta_desc') return (b.meta_mensal||0) - (a.meta_mensal||0)
      if (sortBy === 'meta_asc')  return (a.meta_mensal||0) - (b.meta_mensal||0)
      if (sortBy === 'criado')    return new Date(b.criado) - new Date(a.criado)
      return a.nome?.localeCompare?.(b.nome) ?? 0
    })
  }, [funcionarios, companies, search, filterStatus, filterRole, filterType, sortBy])

  // ── Seleção ──────────────────────────────────────────────────────────────────
  const allFilteredIds = filtered.map(f => f.id)
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected   = allFilteredIds.some(id => selected.has(id)) && !allSelected

  function toggleAll() {
    if (allSelected) setSelected(prev => { const s = new Set(prev); allFilteredIds.forEach(id => s.delete(id)); return s })
    else setSelected(prev => new Set([...prev, ...allFilteredIds]))
  }
  function toggleOne(id) { setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s }) }
  function clearSelection() { setSelected(new Set()) }

  // ── Ações em lote ────────────────────────────────────────────────────────────
  function applyBulkStatus(status) {
    const ids = [...selected]
    bulkSetStatus(ids, status)
    clearSelection()
  }
  function applyBulkCompany(companyId) {
    if (!companyId) return
    const ids = [...selected]
    setFuncionarios(prev => prev.map(f => ids.includes(f.id) ? { ...f, company_id: companyId } : f))
    clearSelection()
  }
  function applyBulkDelete() {
    if (!window.confirm(`Excluir ${selected.size} contato(s) permanentemente?`)) return
    const ids = [...selected]
    ids.forEach(id => deleteSeller(id))
    clearSelection()
  }

  // ── Export ───────────────────────────────────────────────────────────────────
  function handleExport() {
    const rows  = selected.size > 0 ? funcionarios.filter(f => selected.has(f.id)) : filtered
    const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))
    const headers = ['nome','email','telefone','cpf','role','regiao','status','empresa','meta_mensal','criado']
    const csv = [headers.join(';'), ...rows.map(f => [
      f.nome, f.email||'', f.telefone||'', f.cpf||'', f.role||'', f.regiao||'', f.status||'',
      companyMap[f.company_id]?.name || '', f.meta_mensal||'', f.criado||''
    ].join(';'))].join('\n')
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `funcionarios_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadTemplate() {
    const headers = ['nome','email','telefone','cpf','role','regiao','status','meta_mensal']
    const example = ['João da Silva','joao@empresa.com','(11) 99999-0000','123.456.789-00','seller','Sudeste','ativo','15000']
    const csv = [headers.join(';'), example.join(';')].join('\n')
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href=url; a.download='template_funcionarios.csv'; a.click(); URL.revokeObjectURL(url)
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  function handleSave(form) {
    saveSeller(modal?.editing ? { ...modal.editing, ...form } : form)
    setModal(null)
  }
  function handleDelete(id) { deleteSeller(id); setModal(null) }

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const totalAtivos   = funcionarios.filter(f => f.status === 'ativo').length
  const totalAfastado = funcionarios.filter(f => f.status === 'afastado').length
  const metaMedia     = funcionarios.length > 0
    ? Math.round(funcionarios.reduce((s, f) => s + (Number(f.meta_mensal) || 0), 0) / funcionarios.length)
    : 0

  const hasFilters = !!(search || filterStatus || filterRole || filterType)

  return (
    <div style={p.page}>
      {/* ── Cabeçalho ── */}
      <div style={p.pageHeader}>
        <div>
          <div style={p.breadcrumb}><span>Canal</span><span style={p.sep}>›</span><span>Contatos Canais</span></div>
          <h1 style={p.title}>Contatos Canais</h1>
        </div>
        {/* Right actions */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button
            onClick={() => setShowMetrics(v => !v)}
            title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28,
              borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)',
              color:'var(--text-muted)', cursor:'pointer', flexShrink:0, marginTop:18 }}>
            {showMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* ── KPIs collapsible ── */}
      <div style={{ display:'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr', transition:'grid-template-rows 0.22s ease', overflow:'hidden' }}>
        <div style={{ minHeight:0, overflow:'hidden' }}>
          <div style={p.kpis}>
            <KpiCard label="Total de contatos" value={funcionarios.length} />
            <KpiCard label="Ativos"                value={totalAtivos} accent />
            <KpiCard label="Afastados"             value={totalAfastado} />
            <KpiCard label="Meta média/mês"        value={metaMedia ? `R$ ${metaMedia.toLocaleString('pt-BR')}` : '—'} mono />
          </div>
        </div>
      </div>

      {/* ── Toolbar unificada ── */}
      <div style={p.toolbar}>
        {/* Left: busca + filtros */}
        <div style={p.tbLeft}>
          <div style={p.searchWrap}>
            <span style={p.searchIcon}>⌕</span>
            <input style={p.searchInput} placeholder="Buscar nome, e-mail, empresa…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={p.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(COMPANY_TYPE_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select style={p.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={p.select} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Todos os roles</option>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div style={p.tbDivider} />

        {/* Right: view toggle + import + export + novo */}
        <div style={p.tbRight}>
          {/* List / Cards toggle */}
          <div style={p.viewToggle}>
            <button title="Tabela" onClick={() => setViewMode('list')}
              style={{ ...p.viewBtn, ...(viewMode === 'list' ? p.viewBtnOn : {}) }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor"/><rect x="1" y="6.25" width="12" height="1.5" rx="0.75" fill="currentColor"/><rect x="1" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor"/></svg>
            </button>
            <button title="Cards" onClick={() => setViewMode('cards')}
              style={{ ...p.viewBtn, borderLeft:'1px solid var(--border)', ...(viewMode === 'cards' ? p.viewBtnOn : {}) }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.6"/><rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.6"/><rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.6"/><rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.6"/></svg>
            </button>
          </div>

          {/* Import */}
          <button title="Importar CSV" style={p.iconBtn} onClick={() => setImportModal(true)}>
            <svg width="15" height="15" viewBox="0 0 12 12" fill="none"><path d="M6 11V4M3 7l3-3 3 3M1 2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {/* Export */}
          <button title={selected.size > 0 ? `Exportar ${selected.size} selecionados` : 'Exportar CSV'} style={p.iconBtn} onClick={handleExport}>
            <svg width="15" height="15" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          <button style={p.newBtn} onClick={() => setModal('new')}>+ Novo Contato</button>
        </div>
      </div>

      {/* ── Contagem + limpar filtros ── */}
      <div style={p.resultRow}>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' }}>
          {filtered.length} contato{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          {selected.size > 0 && <span style={{ marginLeft:8, color:'var(--accent)', fontWeight:600 }}>· {selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>}
        </span>
        {hasFilters && (
          <button style={p.clearBtn} onClick={() => { setSearch(''); setFilterStatus(''); setFilterRole(''); setFilterType('') }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Barra de ações em lote ── */}
      {selected.size > 0 && (
        <div style={p.bulkBar}>
          <span style={p.bulkCount}>
            <span style={p.bulkDot} />{selected.size} selecionado{selected.size > 1 ? 's' : ''}
          </span>
          <div style={p.bulkActions}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>Status:</span>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <button key={k} style={p.bulkBtn} onClick={() => applyBulkStatus(k)}>→ {v.label}</button>
            ))}
            <div style={{ width:1, background:'rgba(255,255,255,0.2)', alignSelf:'stretch', margin:'0 4px' }} />
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>Mover para:</span>
            <select style={{ ...p.bulkBtn, cursor:'pointer', minWidth:140 }}
              defaultValue=""
              onChange={e => { if (e.target.value) applyBulkCompany(e.target.value) }}>
              <option value="">Selecionar empresa…</option>
              {franchiseOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ width:1, background:'rgba(255,255,255,0.2)', alignSelf:'stretch', margin:'0 4px' }} />
            <button style={{ ...p.bulkBtn, color:'#FCA5A5', borderColor:'rgba(248,113,113,0.35)' }} onClick={applyBulkDelete}>
              Excluir
            </button>
          </div>
          <button style={p.bulkClear} onClick={clearSelection}>✕ Limpar seleção</button>
        </div>
      )}

      {/* ── Lista / Cards ── */}
      {viewMode === 'list' ? (
        <TableView
          funcionarios={filtered}
          onEdit={f => setModal({ editing: f })}
          selected={selected}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          allSelected={allSelected}
          someSelected={someSelected}
          companies={companies}
        />
      ) : (
        <CardsView
          funcionarios={filtered}
          onEdit={f => setModal({ editing: f })}
          selected={selected}
          onToggleOne={toggleOne}
          companies={companies}
        />
      )}

      {/* ── Modals ── */}
      {modal && (
        <FuncionarioModal
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          initial={modal?.editing || null}
          companies={companies}
        />
      )}

      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onDownloadTemplate={handleDownloadTemplate}
          existingFunc={funcionarios}
          onImport={(rows, log) => {
            importMany(rows)
            setImportModal(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const p = {
  page:          { display:'flex', flexDirection:'column', gap:16, maxWidth:1200 },
  pageHeader:    { display:'flex', alignItems:'flex-end', justifyContent:'space-between' },
  breadcrumb:    { display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', marginBottom:4 },
  sep:           { color:'var(--border)' },
  title:         { fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px', margin:0 },
  newBtn:        { padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' },
  kpis:          { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 },
  kpi:           { background:'var(--surface)', borderRadius:10, padding:'16px 18px', display:'flex', flexDirection:'column', gap:4, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', borderTop:'3px solid var(--border)' },
  kpiVal:        { fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1 },
  kpiLbl:        { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  toolbar:       { background:'var(--surface)', borderRadius:10, padding:'8px 12px', border:'1px solid var(--border2)', boxShadow:'var(--shadow)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'nowrap' },
  tbLeft:        { display:'flex', alignItems:'center', gap:6, flexShrink:1, minWidth:0 },
  tbDivider:     { width:1, height:24, background:'var(--border)', flexShrink:0, margin:'0 4px' },
  tbRight:       { display:'flex', alignItems:'center', gap:6, flexShrink:0 },
  searchWrap:    { position:'relative', width:240, flexShrink:0 },
  searchIcon:    { position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14, pointerEvents:'none' },
  searchInput:   { width:'100%', height:36, padding:'0 10px 0 28px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box' },
  select:        { height:36, padding:'0 8px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:12, outline:'none', cursor:'pointer', fontFamily:'var(--font)', flexShrink:0 },
  iconBtn:       { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text-muted)', cursor:'pointer', flexShrink:0 },
  iconBtnActive: { borderColor:'var(--accent)', color:'var(--accent)', background:'var(--accent-glow)' },
  viewToggle:    { display:'flex', border:'1px solid var(--border)', borderRadius:7, overflow:'hidden', flexShrink:0 },
  viewBtn:       { width:34, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', transition:'all 0.15s' },
  viewBtnOn:     { background:'var(--accent-glow)', color:'var(--accent)' },
  resultRow:     { display:'flex', alignItems:'center', gap:12 },
  clearBtn:      { fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' },
  bulkBar:       { display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'var(--accent)', borderRadius:10, flexWrap:'wrap' },
  bulkCount:     { display:'flex', alignItems:'center', gap:6, color:'#fff', fontSize:13, fontWeight:600, fontFamily:'var(--mono)' },
  bulkDot:       { width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.7)' },
  bulkActions:   { display:'flex', alignItems:'center', gap:6, flex:1, flexWrap:'wrap' },
  bulkBtn:       { padding:'4px 10px', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, background:'rgba(255,255,255,0.12)', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' },
  bulkClear:     { fontSize:12, color:'rgba(255,255,255,0.6)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', marginLeft:'auto' },
  th:            { padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', background:'var(--surface2)', borderBottom:'1px solid var(--border)' },
  td:            { padding:'11px 14px', fontSize:13, verticalAlign:'middle' },
  avatar:        { width:32, height:32, borderRadius:8, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0, border:'1px solid rgba(30,58,95,0.10)' },
}

const m = {
  overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400, backdropFilter:'blur(2px)' },
  modal:      { background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:600, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,.22)', overflow:'hidden' },
  header:     { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  title:      { fontSize:16, fontWeight:800, color:'var(--text)', letterSpacing:'-0.2px' },
  subtitle:   { fontSize:12, color:'var(--text-muted)', marginTop:3 },
  closeBtn:   { background:'none', border:'none', color:'var(--text-muted)', fontSize:16, cursor:'pointer', padding:'4px 8px', borderRadius:6 },
  body:       { padding:'20px 24px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:12 },
  grid2:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  input:      { padding:'6px 10px', fontSize:12.5, borderRadius:6, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' },
  footer:     { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderTop:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 },
  btn:        { fontSize:13, color:'var(--text-soft)', background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontFamily:'var(--font)' },
  btnPrimary: { fontSize:13, fontWeight:700, color:'#fff', background:'var(--accent)', border:'none', borderRadius:8, padding:'7px 18px', cursor:'pointer', fontFamily:'var(--font)' },
}
