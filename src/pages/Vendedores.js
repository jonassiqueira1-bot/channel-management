import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useSellers } from '../hooks/useSellers'
import { useParceiros } from '../hooks/useParceiros'
import { useSellerMaturity, useSellerScores } from '../hooks/useSellerMaturity'
import { useFunnels } from '../hooks/useFunnels'
import { useAuditLog } from '../hooks/useAuditLog'
import { useProfile } from '../hooks/useProfile'
import { useEntityCustomFields } from '../hooks/useEntityCustomFields'
import { useImportJobs, startImportJob, updateImportJob, finishImportJob } from '../hooks/useImportJobs'
import { checkEmUso } from '../lib/checkUsage'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormField, FormSection } from '../components/ui/SlideOver'
import Button from '../components/Button'
import Badge from '../components/Badge'

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

function SearchSelect({ value, onChange, options, placeholder = 'Buscar...' }) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const ref                 = useRef(null)

  const selected = options.find(o => String(o.id) === String(value))

  const filtered = useMemo(() => {
    if (!query) return options
    const q = query.toLowerCase()
    return options.filter(o => (o.label || '').toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery('') }}
        style={{
          width: '100%', textAlign: 'left', padding: '8px 12px',
          border: '1px solid var(--border2)', borderRadius: 8,
          background: 'var(--surface-alt)', color: selected ? 'var(--text)' : 'var(--text-muted)',
          fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'var(--font)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : '— Nenhuma —'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 6,
                border: '1px solid var(--border2)', background: 'var(--surface-alt)',
                color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--font)',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div
              style={{ padding: '7px 12px', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}
              onMouseDown={() => { onChange(null, null); setOpen(false); setQuery('') }}
            >
              — Nenhuma —
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '7px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Nenhum resultado</div>
            )}
            {filtered.map(o => (
              <div
                key={o.id}
                onMouseDown={() => { onChange(o.id, o.label); setOpen(false); setQuery('') }}
                style={{
                  padding: '7px 12px', fontSize: 13, cursor: 'pointer',
                  background: String(o.id) === String(value) ? 'var(--accent-lite)' : 'transparent',
                  color: String(o.id) === String(value) ? 'var(--accent)' : 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {String(o.id) === String(value) && <span style={{ fontSize: 10 }}>✓</span>}
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
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
  funil_id: null,
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.inativo
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:6, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
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
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:6, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
      {label}
    </span>
  )
}

// ─── SlideOver de Cadastro ────────────────────────────────────────────────────
function ContatoCanalSlideOver({ open, initial, onSave, onClose, onDelete, onInvite, franquiasOpts = [], todos = [], scoreData = null }) {
  const isNew = !initial?.id
  const { funis } = useFunnels()
  const funisAtivos = funis.filter(f => f.status === 'ativo')
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
    if (!form.email?.trim()) {
      e.email = 'E-mail é obrigatório'
    } else {
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

  const maturidadeBadge = !isNew && (
    scoreData ? (
      <span title={`Calculado em ${new Date(scoreData.calculado_em).toLocaleDateString('pt-BR')}`}>
        <Badge variant={scoreData.score_pct >= 70 ? 'success' : scoreData.score_pct >= 40 ? 'warning' : 'danger'}>
          🎯 Maturidade {scoreData.score_pct}%
        </Badge>
      </span>
    ) : (
      <Badge variant="neutral">Maturidade ainda não calculada</Badge>
    )
  )

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      onSave={handleSave}
      onDelete={!isNew ? () => onDelete(initial.id) : undefined}
      deleteConfirm="Excluir este contato? Esta ação não pode ser desfeita."
      saving={saving}
      title={isNew ? 'Novo Contato Canal' : form.nome || 'Editar Contato Canal'}
      subtitle={isNew ? 'Preencha os dados do contato' : ROLES[form.role]?.label}
      saveLabel={isNew ? 'Cadastrar contato' : 'Salvar alterações'}
      headerExtra={!isNew && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {form.email && (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{form.email}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Badge variant={form.status === 'ativo' ? 'success' : form.status === 'afastado' ? 'warning' : 'neutral'} dot>
              {STATUS_CFG[form.status]?.label}
            </Badge>
            {maturidadeBadge}
          </div>
        </div>
      )}
    >
      <FormSection label="Dados Pessoais">
        <FormField label="Nome" required error={errs.nome} span={2}>
          <input className="so-field" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo"
            style={{ borderColor: errs.nome ? '#DC2626' : '' }} />
        </FormField>

        <FormField label="E-mail" required error={errs.email}>
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
      </FormSection>

      <FormSection label="Organização">
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

        <FormField label="Funil de acesso (Portal)">
          <select className="so-field" value={form.funil_id || ''} onChange={e => set('funil_id', e.target.value || null)}>
            <option value="">Todos os funis</option>
            {funisAtivos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </FormField>

        <FormField label="Franquia / Equipe" span={2}>
          <SearchSelect
            value={form.franquia_id || ''}
            onChange={(id, label) => setForm(f => ({ ...f, franquia_id: id || null, franquia_nome: label || '' }))}
            options={franquiasOpts.map(o => ({ id: o.id, label: `${o.sublabel ? `[${o.sublabel}] ` : ''}${o.label}` }))}
            placeholder="Buscar parceiro..."
          />
        </FormField>
      </FormSection>

      <FormSection label="Metas">
        <FormField label="Meta mensal (R$)">
          <input className="so-field" type="number" min="0" value={form.meta_mensal} onChange={e => set('meta_mensal', e.target.value)} placeholder="0" />
        </FormField>
      </FormSection>

      <FormSection label="Canais de Contato">
        <FormField label="LinkedIn">
          <input className="so-field" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/usuario" />
        </FormField>

        <FormField label="WhatsApp">
          <input className="so-field" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" />
        </FormField>
      </FormSection>

      <FormSection label="Observações">
        <FormField label="Observações internas" span={2}>
          <textarea className="so-field" rows={3} style={{ resize:'vertical' }} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Notas internas…" />
        </FormField>
      </FormSection>

      {/* Acesso ao portal */}
      {onInvite && (
        <FormSection label="Acesso ao Portal">
          <div style={{ gridColumn: 'span 2' }}>
            {initial?.portal_invited_at ? (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:12, color:'#059669', fontWeight:600 }}>✓ Convite enviado</span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                  em {new Date(initial.portal_invited_at).toLocaleDateString('pt-BR')}
                </span>
                <button
                  type="button"
                  onClick={onInvite}
                  style={{ marginLeft:'auto', fontSize:11, padding:'4px 12px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text-muted)', cursor:'pointer' }}
                >
                  Reenviar convite
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onInvite}
                style={{ width:'100%', padding:'9px 0', borderRadius:8, border:'1px solid #0EA5E9', background:'#E0F2FE', color:'#0369A1', fontWeight:700, fontSize:13, cursor:'pointer' }}
              >
                Convidar para o portal
              </button>
            )}
          </div>
        </FormSection>
      )}
    </SlideOver>
  )
}

// ─── Import SlideOver ─────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  if (lines.length < 2) return { headers: [], rows: [] }
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === sep && !inQ) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
  })
  return { headers, rows }
}

const IMPORT_COLS_BASE = ['nome','email','telefone','cpf','role','regiao','status','franquia_nome','meta_mensal','linkedin_url','whatsapp']

function normEmail(v)    { return (v || '').trim().toLowerCase() }
function normDigits(v)   { return (v || '').replace(/\D/g, '') }
function normLinkedin(v) { return (v || '').trim().toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '') }

// Identidade de duplicidade: e-mail, CPF, LinkedIn ou WhatsApp já cadastrados
// não podem gerar um segundo registro — nem entre si nem dentro do próprio arquivo.
function validateImportRow(row, existingContacts, imported) {
  const errors = []
  if (!row.nome?.trim()) errors.push('Nome é obrigatório')
  if (row.role && !Object.keys(ROLES).includes(row.role))
    errors.push(`Perfil inválido: "${row.role}". Use: ${Object.keys(ROLES).join(', ')}`)
  if (row.status && !Object.keys(STATUS_CFG).includes(row.status))
    errors.push(`Status inválido: "${row.status}". Use: ${Object.keys(STATUS_CFG).join(', ')}`)

  const email    = normEmail(row.email)
  const cpf      = normDigits(row.cpf)
  const linkedin = normLinkedin(row.linkedin_url)
  const whatsapp = normDigits(row.whatsapp)

  if (email) {
    if (existingContacts.some(c => normEmail(c.email) === email)) errors.push(`E-mail já cadastrado: ${row.email}`)
    else if (imported.some(r => normEmail(r.email) === email)) errors.push('E-mail duplicado no arquivo')
  }
  if (cpf) {
    if (existingContacts.some(c => normDigits(c.cpf) === cpf)) errors.push(`CPF já cadastrado: ${row.cpf}`)
    else if (imported.some(r => normDigits(r.cpf) === cpf)) errors.push('CPF duplicado no arquivo')
  }
  if (linkedin) {
    if (existingContacts.some(c => normLinkedin(c.linkedin_url) === linkedin)) errors.push('LinkedIn já cadastrado para outro contato')
    else if (imported.some(r => normLinkedin(r.linkedin_url) === linkedin)) errors.push('LinkedIn duplicado no arquivo')
  }
  if (whatsapp) {
    if (existingContacts.some(c => normDigits(c.whatsapp) === whatsapp)) errors.push('WhatsApp já cadastrado para outro contato')
    else if (imported.some(r => normDigits(r.whatsapp) === whatsapp)) errors.push('WhatsApp duplicado no arquivo')
  }
  return errors
}

function ImportModal({ onClose, existingContacts, parceiros, saveParceiro, onImport }) {
  const customFieldsDef = useEntityCustomFields('sellers')
  const allCols = useMemo(() => [...IMPORT_COLS_BASE, ...customFieldsDef.map(f => f.field_key)], [customFieldsDef])

  const [step, setStep] = useState('upload') // upload | preview | importing | done
  const [parsed, setParsed] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [franquiasCriadas, setFranquiasCriadas] = useState(0)
  const jobs = useImportJobs()
  const job = jobs.find(j => j.id === jobId)
  const fileRef = useRef(null)

  function processFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows } = parseCSV(e.target.result)
      const validatedRows = []
      const rowResults = rows.map((row, i) => {
        const errors = validateImportRow(row, existingContacts, validatedRows)
        const ok = errors.length === 0
        if (ok) validatedRows.push(row)
        return { row, errors, ok, line: i + 2 }
      })
      setParsed({ fileName: file.name, rowResults })
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDownloadTemplate() {
    const example = ['João da Silva','joao@empresa.com','(11) 99999-0000','123.456.789-00','seller','Sudeste','ativo','Franquia Exemplo','15000','','', ...customFieldsDef.map(() => '')]
    const csv = [allCols.join(';'), example.join(';')].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'template_contatos_canais.csv'; a.click(); URL.revokeObjectURL(url)
  }

  async function handleConfirmImport() {
    const okRows = parsed.rowResults.filter(r => r.ok)
    const total = okRows.length
    const id = startImportJob({ label: 'Contatos Canais', total })
    updateImportJob(id, { subLabel: 'Preparando…' })
    setJobId(id)
    setStep('importing')

    const franquiasByNome = {}
    ;(parceiros || []).forEach(p => { if (p.nome) franquiasByNome[p.nome.trim().toLowerCase()] = p })
    const franquiasByCodigo = {}
    ;(parceiros || []).forEach(p => { if (p.codigo) franquiasByCodigo[p.codigo.trim().toLowerCase()] = p })
    const createdCache = {}
    let franquiasCriadasCount = 0

    // Franquia/Unidade não cadastrada ainda: cria como rascunho pra não travar
    // a importação — o admin completa o cadastro depois em Parceiros.
    async function resolveFranquia(nome) {
      if (!nome?.trim()) return { id: null, nome: '' }
      const key = nome.trim().toLowerCase()
      if (franquiasByCodigo[key]) return { id: franquiasByCodigo[key].id, nome: franquiasByCodigo[key].nome }
      if (franquiasByNome[key])   return { id: franquiasByNome[key].id, nome: franquiasByNome[key].nome }
      if (createdCache[key]) return createdCache[key]
      const result = await saveParceiro({ nome: nome.trim(), classificacao: 'franquia', situacao: 'rascunho' })
      if (result?.ok && result?.data?.id) {
        const ref = { id: result.data.id, nome: result.data.nome || nome.trim() }
        createdCache[key] = ref
        franquiasCriadasCount++
        return ref
      }
      return { id: null, nome: nome.trim() }
    }

    const newRows = []
    for (let i = 0; i < okRows.length; i++) {
      const { row } = okRows[i]
      updateImportJob(id, { current: i + 1, subLabel: row.nome || `Linha ${i + 2}` })
      setFranquiasCriadas(franquiasCriadasCount)
      const franquia = await resolveFranquia(row.franquia_nome)
      const custom_fields = {}
      customFieldsDef.forEach(f => { if (row[f.field_key] !== undefined && row[f.field_key] !== '') custom_fields[f.field_key] = row[f.field_key] })
      newRows.push({
        ...EMPTY_FORM, ...row,
        id: uid(),
        criado: new Date().toISOString().slice(0, 10),
        status: row.status || 'ativo',
        role: row.role || 'seller',
        franquia_id: franquia.id,
        franquia_nome: franquia.nome,
        custom_fields,
      })
    }

    updateImportJob(id, { current: total, subLabel: 'Salvando contatos…' })
    await onImport(newRows)
    setFranquiasCriadas(franquiasCriadasCount)
    setStep('done')
    finishImportJob(id, { subLabel: `Concluído!${franquiasCriadasCount > 0 ? ` (${franquiasCriadasCount} franquia${franquiasCriadasCount !== 1 ? 's' : ''} criada${franquiasCriadasCount !== 1 ? 's' : ''})` : ''}` })
  }

  const okCount  = parsed?.rowResults.filter(r => r.ok).length ?? 0
  const errCount = parsed?.rowResults.filter(r => !r.ok).length ?? 0

  return (
    <div style={m.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth: 700 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Importar Contatos Canais</div>
            <div style={m.subtitle}>Arquivo CSV com separador ponto-e-vírgula (;) — UTF-8</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        {step === 'upload' && (
          <div style={{ padding: 24 }}>
            <div style={imp.templateBox}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Template CSV</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {allCols.length} colunas — inclui linha de exemplo{customFieldsDef.length > 0 ? ` + ${customFieldsDef.length} campo(s) personalizado(s)` : ''}
                </div>
              </div>
              <button style={imp.templateBtn} onClick={handleDownloadTemplate}>↓ Baixar template</button>
            </div>
            <div
              style={{ ...imp.dropzone, ...(dragging ? imp.dropzoneActive : {}) }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}>
              <span style={{ fontSize: 28 }}>📂</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Arraste o arquivo aqui ou clique para selecionar</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Apenas arquivos .csv</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => processFile(e.target.files[0])} />
            </div>
            <div style={imp.colsBox}>
              <div style={imp.colsLabel}>Colunas esperadas</div>
              <div style={imp.colsList}>
                {IMPORT_COLS_BASE.map(c => <span key={c} style={imp.colTag}>{c}</span>)}
                {customFieldsDef.map(f => <span key={f.field_key} style={{ ...imp.colTag, background: 'var(--accent)22', color: 'var(--accent)', borderColor: 'var(--accent)44' }}>{f.field_key}{f.is_required ? ' *' : ''}</span>)}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
              Se a <strong>Franquia/Unidade</strong> informada ainda não existir, ela é criada automaticamente com status <strong>rascunho</strong> em Parceiros. Contatos com e-mail, CPF, LinkedIn ou WhatsApp já cadastrados são ignorados (sem duplicar).
            </div>
          </div>
        )}

        {step === 'preview' && parsed && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={imp.summary}>
              <div style={imp.summaryItem}><span style={imp.summaryVal}>{parsed.rowResults.length}</span><span style={imp.summaryLbl}>linhas</span></div>
              <div style={imp.summaryItem}><span style={{ ...imp.summaryVal, color: 'var(--green)' }}>{okCount}</span><span style={imp.summaryLbl}>prontas</span></div>
              <div style={imp.summaryItem}><span style={{ ...imp.summaryVal, color: errCount > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{errCount}</span><span style={imp.summaryLbl}>com erro</span></div>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{parsed.fileName}</div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px' }}>
              <table style={{ ...p.table, marginBottom: 0 }}>
                <thead><tr>
                  {['Linha','Nome','E-mail','Perfil','Franquia/Unidade','Resultado'].map(h => <th key={h} style={p.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {parsed.rowResults.map(({ row, errors, ok, line }) => (
                    <tr key={line} style={{ ...p.tr, background: ok ? undefined : 'rgba(220,38,38,0.03)' }}>
                      <td style={{ ...p.td, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', width: 50 }}>{line}</td>
                      <td style={{ ...p.td, fontSize: 12 }}>{row.nome || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ ...p.td, fontSize: 12 }}>{row.email || '—'}</td>
                      <td style={{ ...p.td, fontSize: 11 }}>{ROLES[row.role]?.label || row.role || '—'}</td>
                      <td style={{ ...p.td, fontSize: 11 }}>{row.franquia_nome || '—'}</td>
                      <td style={p.td}>
                        {ok
                          ? <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 600 }}>✓ OK</span>
                          : <div>{errors.map((e, i) => <div key={i} style={{ color: 'var(--red)', fontSize: 11 }}>✕ {e}</div>)}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={m.footer}>
              <Button variant="secondary" onClick={() => setStep('upload')}>← Voltar</Button>
              <div style={{ flex: 1 }} />
              {errCount > 0 && okCount > 0 && <span style={{ fontSize: 12, color: 'var(--yellow-text)' }}>{errCount} linha{errCount > 1 ? 's' : ''} serão ignoradas</span>}
              <Button disabled={okCount === 0} onClick={handleConfirmImport}>
                {`Importar ${okCount} contato${okCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}

        {(step === 'importing' || step === 'done') && (
          <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
            {step === 'importing' ? (
              <><div style={{ fontSize: 32 }}>⏳</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Importando…</div></>
            ) : (
              <><div style={{ fontSize: 40 }}>✅</div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Importação concluída!</div></>
            )}
            <div style={{ width: '100%', maxWidth: 440 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job?.subLabel}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{job?.current ?? 0}/{job?.total ?? 0}</span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.2s ease', background: step === 'done' ? '#10B981' : 'var(--accent)', width: job?.total ? `${Math.round(((job.current || 0) / job.total) * 100)}%` : '0%' }} />
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                <span>✓ <strong>{job?.current ?? 0}</strong> contato{(job?.current ?? 0) !== 1 ? 's' : ''} processado{(job?.current ?? 0) !== 1 ? 's' : ''}</span>
                {franquiasCriadas > 0 && <span>🏢 <strong>{franquiasCriadas}</strong> franquia{franquiasCriadas !== 1 ? 's' : ''} criada{franquiasCriadas !== 1 ? 's' : ''} (rascunho)</span>}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                Pode fechar esta janela ou trocar de tela — o progresso continua visível no canto inferior direito.
              </div>
            </div>
            {step === 'done' && <Button onClick={onClose}>Fechar</Button>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Import styles ────────────────────────────────────────────────────────────
const imp = {
  templateBox:    { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', marginBottom:16 },
  templateBtn:    { padding:'7px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  dropzone:       { border:'2px dashed var(--border)', borderRadius:10, padding:'40px 24px', textAlign:'center', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginBottom:16, transition:'all 0.15s', background:'var(--surface2)' },
  dropzoneActive: { borderColor:'var(--accent)', background:'var(--accent-glow)' },
  colsBox:        { background:'var(--surface2)', borderRadius:8, padding:'12px 14px', border:'1px solid var(--border)' },
  colsLabel:      { fontSize:11, fontWeight:600, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 },
  colsList:       { display:'flex', flexWrap:'wrap', gap:5 },
  colTag:         { padding:'2px 8px', background:'var(--surface3)', border:'1px solid var(--border)', borderRadius:4, fontSize:11, fontFamily:'var(--mono)', color:'var(--text-soft)' },
  summary:        { display:'flex', alignItems:'center', gap:20, padding:'12px 24px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' },
  summaryItem:    { display:'flex', flexDirection:'column', alignItems:'center', gap:2 },
  summaryVal:     { fontSize:22, fontWeight:700, fontFamily:'var(--mono)', lineHeight:1 },
  summaryLbl:     { fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' },
}
const p = {
  table: { width:'100%', borderCollapse:'collapse' },
  th:    { padding:'8px 12px', textAlign:'left', fontSize:10.5, fontWeight:600, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', background:'var(--surface2)', borderBottom:'1px solid var(--border)' },
  tr:    { borderBottom:'1px solid var(--border2)' },
  td:    { padding:'9px 12px', fontSize:12.5, verticalAlign:'middle' },
}
const m = {
  overlay:  { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
  modal:    { background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:680, boxShadow:'0 20px 60px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', maxHeight:'90vh' },
  header:   { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border2)' },
  title:    { fontSize:16, fontWeight:700, color:'var(--text)', margin:0 },
  subtitle: { fontSize:13, color:'var(--text-muted)', marginTop:3 },
  closeBtn: { background:'none', border:'none', color:'var(--text-muted)', fontSize:16, cursor:'pointer', padding:4, lineHeight:1 },
  footer:   { display:'flex', alignItems:'center', gap:10, padding:'14px 24px', borderTop:'1px solid var(--border2)', flexShrink:0 },
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
  const { parceiros, save: saveParceiro }                                    = useParceiros()
  const { sellers, save: saveSeller, remove: deleteSeller, bulkSetStatus, importMany, inviteToPortal } = useSellers()
  const { registrar: log } = useAuditLog()
  const { profile } = useProfile()
  const tenantId = profile?.tenant_id

  const { params: maturityParams } = useSellerMaturity()
  const { scores, calculating, calculate } = useSellerScores(sellers, maturityParams)

  const franquiasMap = useMemo(
    () => Object.fromEntries((parceiros || []).map(p => [String(p.id), p])),
    [parceiros]
  )

  const franquiasOpts = useMemo(() =>
    (parceiros || [])
      .filter(p => p.classificacao !== 'unidade' && p.situacao !== 'inativo')
      .map(p => ({ id: String(p.id), label: p.nome, sublabel: p.codigo || '' }))
  , [parceiros])

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
      list = list.filter(f =>
        f.nome?.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q) ||
        f.cpf?.includes(q) ||
        franquiasMap[String(f.franquia_id)]?.nome?.toLowerCase().includes(q)
      )
    }
    if (filterStatus) list = list.filter(f => f.status === filterStatus)
    if (filterRole)   list = list.filter(f => f.role === filterRole)
    return [...list].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
  }, [sellers, franquiasMap, search, filterStatus, filterRole])

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  function handleSave(form) {
    const isNew = !editing?.id
    saveSeller(isNew ? form : { ...editing, ...form })
    log(isNew ? 'criar' : 'editar', 'vendedor', editing?.id || form.id, { descricao: `Vendedor ${isNew ? 'criado' : 'editado'}: ${form.nome || ''}` })
    setSlideOpen(false)
    setEditing(null)
  }
  async function handleDelete(id) {
    const s = sellers.find(x => x.id === id)
    const bloqueio = await checkEmUso('vendedor_nome', s?.nome || '', s?.nome || id, tenantId)
    if (bloqueio) { alert(bloqueio); return }
    deleteSeller(id)
    log('excluir', 'vendedor', id, { descricao: `Vendedor excluído: ${s?.nome || id}` })
    setSlideOpen(false)
    setEditing(null)
  }
  function openNew() { setEditing(null); setSlideOpen(true) }
  function openEdit(row) { setEditing(row); setSlideOpen(true) }

  async function handleInvite(seller) {
    if (!window.confirm(`Enviar convite de acesso ao portal para ${seller.nome} (${seller.email})?`)) return
    const res = await inviteToPortal(seller)
    if (!res.ok) alert(`Erro ao enviar convite: ${res.message}`)
    else alert(`Convite enviado para ${seller.email}!`)
  }

  // ── Export ───────────────────────────────────────────────────────────────────
  function handleExport() {
    const headers = ['nome','email','telefone','cpf','role','regiao','status','franquia','meta_mensal','criado']
    const csv = [headers.join(';'), ...filtered.map(f => [
      f.nome, f.email||'', f.telefone||'', f.cpf||'', f.role||'', f.regiao||'', f.status||'',
      franquiasMap[String(f.franquia_id)]?.nome || f.franquia_nome || '', f.meta_mensal||'', f.criado||''
    ].join(';'))].join('\n')
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `contatos_canais_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = (data) => {
    const totalAtivos   = data.filter(f => f.status === 'ativo').length
    const totalAfastado = data.filter(f => f.status === 'afastado').length
    const metaMedia     = data.length > 0
      ? Math.round(data.reduce((s, f) => s + (Number(f.meta_mensal) || 0), 0) / data.length)
      : 0
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Total de contatos', value: data.length },
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
  }

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
      key: 'franquia_id',
      label: 'Franquia / Equipe',
      render: (val, row) => {
        const f = franquiasMap[String(val)]
        const nome = f?.nome || row.franquia_nome
        if (!nome) return <span style={{ color:'var(--border)', fontSize:12 }}>—</span>
        return (
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12 }}>
            <span style={{ color:'var(--text-soft)', fontWeight:500 }}>{nome}</span>
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
      key: 'id',
      label: 'Maturidade',
      render: (val) => {
        const s = scores[val]
        if (s == null) return <span style={{ fontSize:11, color:'var(--text-muted)' }}>—</span>
        const color = s.score_pct >= 70 ? '#065F46' : s.score_pct >= 40 ? '#92400E' : '#991B1B'
        const bg    = s.score_pct >= 70 ? '#D1FAE5' : s.score_pct >= 40 ? '#FEF3C7' : '#FEE2E2'
        return (
          <span style={{ fontSize:11, fontWeight:700, fontFamily:'var(--mono)', padding:'2px 8px', borderRadius:6, background:bg, color }}>
            {s.score_pct}%
          </span>
        )
      },
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
    const franquiaNome = franquiasMap[String(row.franquia_id)]?.nome || row.franquia_nome
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
        {franquiaNome && (
          <div style={{ fontSize:12, color:'var(--text-soft)', display:'flex', alignItems:'center', gap:6 }}>
            {franquiaNome}
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
        modulo="contatos_canais"
        columns={columns}
        data={filtered}
        kpis={kpis}
        kpisLabel="Indicadores"
        onNew={openNew}
        newLabel="Novo Contato"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        secondaryActions={
          <Button size="sm" variant="outline" loading={calculating} onClick={calculate}>
            {calculating ? 'Calculando…' : '↻ Calcular maturidade'}
          </Button>
        }
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
        onInvite={editing ? () => handleInvite(editing) : undefined}
        franquiasOpts={franquiasOpts}
        scoreData={editing ? scores[editing.id] : null}
      />

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          existingContacts={sellers}
          parceiros={parceiros}
          saveParceiro={saveParceiro}
          onImport={async rows => { await importMany(rows) }}
        />
      )}
    </>
  )
}
