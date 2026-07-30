import { useState, useCallback, useRef, useMemo } from 'react'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useCampanhas } from '../../hooks/useCampanhas'
import { useProfile } from '../../hooks/useProfile'
import { useParceiros } from '../../hooks/useParceiros'
import { useSellers } from '../../hooks/useSellers'
import { useContacts } from '../../hooks/useContacts'
import { useCompanies } from '../../hooks/useCompanies'
import { usePlaybooks } from '../../hooks/usePlaybooks'
import { useFunnels } from '../../hooks/useFunnels'
import { useCentrosCusto } from '../../hooks/useCentrosCusto'
import CustosSection from '../../components/CustosSection'
import { SEGMENTOS_PADRAO } from '../../data/segmentos'
import { checkEmUso } from '../../lib/checkUsage'
import SettingsLayout from '../../components/ui/SettingsLayout'
import SearchSelect from '../../components/SearchSelect'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

/* ─── Constants ─────────────────────────────────────────── */

const IMPORT_COLS = ['name', 'objective', 'description', 'start_date', 'end_date', 'status']

/* ─── CSV helpers ────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  const sep = lines[0].includes(';') ? ';' : ','
  function parseLine(line) {
    const fields = []; let cur = ''; let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === sep && !inQ) { fields.push(cur.trim()); cur = '' }
      else cur += ch
    }
    fields.push(cur.trim()); return fields
  }
  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = parseLine(l); const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    return obj
  })
  return { rows }
}

function downloadText(content, filename, mime) {
  const blob = new Blob(['﻿' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function toCSVValue(v, sep = ';') {
  const s = String(v ?? '')
  return s.includes(sep) || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

/* ─── ImportModal ────────────────────────────────────────── */
function ImportModal({ onClose, onImport, existingNames }) {
  const [step, setStep]     = useState('upload')
  const [rows, setRows]     = useState([])
  const [errors, setErrors] = useState({})
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const VALID_STATUS  = ['draft', 'active', 'paused']
  const VALID_OBJ = ['Atração de Leads','Upgrade de Módulo','Sazonal','Fidelização','Lançamento de Produto','Reativação']

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows: parsed } = parseCSV(e.target.result)
      const errs = {}
      parsed.forEach((row, i) => {
        const rowErrs = []
        if (!row.name?.trim()) rowErrs.push('Nome obrigatório')
        else if (existingNames.includes(row.name.trim().toLowerCase())) rowErrs.push('Nome já existe')
        else if (parsed.slice(0, i).some(r => r.name?.trim().toLowerCase() === row.name?.trim().toLowerCase())) rowErrs.push('Nome duplicado no arquivo')
        if (row.status && !VALID_STATUS.includes(row.status)) rowErrs.push(`Status inválido (${VALID_STATUS.join(', ')})`)
        if (row.objective && !VALID_OBJ.includes(row.objective)) rowErrs.push('Objetivo inválido')
        if (rowErrs.length) errs[i] = rowErrs
      })
      setRows(parsed); setErrors(errs); setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function downloadTemplate() {
    const header  = IMPORT_COLS.join(';')
    const example = 'Campanha Verão;Sazonal;Descrição aqui;2026-01-01;2026-03-31;draft'
    downloadText(`${header}\n${example}`, 'template_campanhas.csv', 'text/csv')
  }

  const okRows  = rows.filter((_, i) => !errors[i])
  const errRows = rows.filter((_, i) =>  errors[i])

  function doImport() {
    onImport(okRows.map(r => ({
      id: crypto.randomUUID(),
      name: r.name.trim(),
      objective: r.objective || '',
      description: r.description || '',
      start_date: r.start_date || '',
      end_date: r.end_date || '',
      status: VALID_STATUS.includes(r.status) ? r.status : 'draft',
    })))
    onClose()
  }

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(2px)' }
  const modal   = { background:'var(--surface)', borderRadius:14, width:680, maxHeight:'84vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ padding:'20px 24px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:2 }}>Campanhas</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{step === 'upload' ? 'Importar dados' : `${rows.length} linha${rows.length !== 1 ? 's' : ''} encontrada${rows.length !== 1 ? 's' : ''}`}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--text-muted)', lineHeight:1 }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {step === 'upload' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => fileRef.current?.click()}
                style={{ border:`2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer', background: dragging ? 'var(--accent-glow)' : 'var(--surface2)', transition:'all 0.15s' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📄</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Solte o arquivo aqui ou clique para selecionar</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>CSV (separado por ; ou ,) — UTF-8</div>
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Colunas: <code style={{ fontSize:11, background:'var(--surface2)', padding:'1px 4px', borderRadius:3 }}>{IMPORT_COLS.join(', ')}</code></span>
                <button onClick={downloadTemplate} style={{ fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>⬇ Baixar template</button>
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', background:'var(--surface2)', borderRadius:8, padding:'10px 14px', lineHeight:1.6 }}>
                <strong>status:</strong> draft, active, paused &nbsp;·&nbsp;
                <strong>datas:</strong> AAAA-MM-DD
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1, padding:'10px 14px', borderRadius:8, background:'var(--green-bg)', color:'var(--green-text)', fontSize:12, fontWeight:600 }}>✓ {okRows.length} campanha{okRows.length !== 1 ? 's' : ''} válida{okRows.length !== 1 ? 's' : ''}</div>
                {errRows.length > 0 && <div style={{ flex:1, padding:'10px 14px', borderRadius:8, background:'var(--red-bg)', color:'var(--red-text)', fontSize:12, fontWeight:600 }}>✕ {errRows.length} com erro (serão ignoradas)</div>}
              </div>
              <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>#</th>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Nome</th>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Objetivo</th>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Status</th>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Período</th>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border2)', background: errors[i] ? 'var(--red-bg)' : 'transparent' }}>
                        <td style={{ padding:'6px 10px', color:'var(--text-muted)' }}>{i+1}</td>
                        <td style={{ padding:'6px 10px', fontWeight:600 }}>{row.name || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)' }}>{row.objective || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)' }}>{row.status || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)', whiteSpace:'nowrap' }}>{row.start_date || '—'}{row.end_date ? ` → ${row.end_date}` : ''}</td>
                        <td style={{ padding:'6px 10px' }}>
                          {errors[i] ? <span style={{ color:'var(--red)', fontSize:11 }}>{errors[i].join('; ')}</span> : <span style={{ color:'var(--green)', fontWeight:600 }}>✓</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
            <button onClick={() => { setStep('upload'); setRows([]); setErrors({}) }} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:'none', cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>← Voltar</button>
            <button onClick={doImport} disabled={okRows.length === 0} style={{ padding:'8px 18px', borderRadius:8, border:'none', background: okRows.length ? 'var(--accent)' : 'var(--border)', color:'#fff', cursor: okRows.length ? 'pointer' : 'default', fontSize:13, fontWeight:700 }}>
              Importar {okRows.length} campanha{okRows.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const OBJETIVOS = [
  'Atração de Leads',
  'Upgrade de Módulo',
  'Sazonal',
  'Fidelização',
  'Lançamento de Produto',
  'Reativação',
]

const STATUS_OPTIONS = [
  { value: 'draft',  label: 'Rascunho', color: '#94A3B8', bg: '#F1F5F9' },
  { value: 'active', label: 'Ativa',    color: '#10B981', bg: '#ECFDF5' },
  { value: 'paused', label: 'Pausada',  color: '#F59E0B', bg: '#FFFBEB' },
]

const EMPTY_FORM = {
  name: '',
  objective: '',
  description: '',
  start_date: '',
  end_date: '',
  status: 'draft',
  franquia_modo: 'todas',
  franquia_ids: [],
  contato_canal_ids: [],
  contato_ids: [],
  empresa_ids: [],
  empresa_segmentos: [],
  empresa_apenas_ativas: false,
  playbook_id: null,
  funil_id: null,
  meta_valor: '',
  meta_oportunidades: '',
  custos: [],
  centro_custo_id: '',
}

function fmtMoeda(v) {
  if (v === '' || v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

/* ─── Status badge ───────────────────────────────────────── */
function StatusBadge({ value }) {
  const opt = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0]
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: opt.bg, color: opt.color, whiteSpace: 'nowrap',
    }}>
      {opt.label}
    </span>
  )
}

/* ─── SearchMultiSelect — sem pílulas: fechado mostra resumo em texto ─────────
   ("3 selecionadas"), aberto mostra busca + checklist. Mesmo padrão da
   MultiSelectDropdown já usada em settings/Indicadores.js. ────────────────── */
function SearchMultiSelect({ options = [], selected = [], onChange, placeholder = 'Todos' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ]       = useState('')
  const ref             = useRef(null)

  const sel = (selected || []).map(String)

  function toggle(id) {
    const sid = String(id)
    onChange(sel.includes(sid) ? sel.filter(x => x !== sid) : [...sel, sid])
  }

  const visible = options.filter(o => !q || o.label.toLowerCase().includes(q.toLowerCase()))
  const selectedLabels = options.filter(o => sel.includes(String(o.id))).map(o => o.label)
  const summary = selectedLabels.length === 0
    ? placeholder
    : selectedLabels.length <= 2
      ? selectedLabels.join(', ')
      : `${selectedLabels.length} selecionados`

  return (
    <div ref={ref} style={{ position: 'relative' }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="fpe-field"
        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selectedLabels.length ? 'var(--text)' : 'var(--text-muted)' }}>
          {summary}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 8px 6px' }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surface2)', color: 'var(--text)', fontSize: 12.5, fontFamily: 'var(--font)', outline: 'none' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {visible.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Nenhum resultado</div>}
            {visible.map(o => {
              const checked = sel.includes(String(o.id))
              return (
                <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer',
                  background: checked ? 'var(--accent-glow)' : 'transparent' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(o.id)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: checked ? 600 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.label}</span>
                </label>
              )
            })}
          </div>
          {sel.length > 0 && (
            <div style={{ padding: '5px 12px 8px', borderTop: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sel.length} selecionado{sel.length !== 1 ? 's' : ''}</span>
              <button type="button" onClick={() => onChange([])} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Limpar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Tela de edição (full page, uma única tela) — bench: Produtos/Parceiros/
   Maturidade de Vendedores em Configurações ─────────────────────────────── */
function CampanhaEdit({ initial, onCancel, onSave, onDelete }) {
  const isNew = !initial?.id
  const [form, setForm] = useState(initial ? { ...EMPTY_FORM, ...initial } : { ...EMPTY_FORM })
  const [errs, setErrs] = useState({})
  const [saving, setSaving] = useState(false)

  const { parceiros } = useParceiros()
  const { sellers }   = useSellers()
  const { contacts }  = useContacts()
  const { companies } = useCompanies()
  const { playbooks }  = usePlaybooks()
  const { funis }      = useFunnels()
  const { centros: centrosCusto } = useCentrosCusto()
  const { profile, isAdmin } = useProfile()
  const nomeUsuario = profile?.full_name || profile?.nome || profile?.email || 'Usuário'

  const franquiasOpts = useMemo(() =>
    (parceiros || []).filter(p => p.classificacao !== 'unidade' && p.situacao !== 'inativo')
      .map(p => ({ id: String(p.id), label: p.codigo ? `[${p.codigo}] ${p.nome}` : p.nome })),
  [parceiros])

  const contatosCanalOpts = useMemo(() =>
    (sellers || []).filter(s => s.status !== 'inativo').map(s => ({ id: String(s.id), label: s.nome })),
  [sellers])

  const contatosOpts = useMemo(() =>
    (contacts || []).map(c => ({ id: String(c.id), label: c.nome || c.email || 'Sem nome' })),
  [contacts])

  const empresasOpts = useMemo(() =>
    (companies || []).map(c => ({ id: String(c.id), label: c.fantasia || c.razao || 'Sem nome' })),
  [companies])

  const segmentosOpts = useMemo(() => SEGMENTOS_PADRAO.map(s => ({ id: s, label: s })), [])

  const playbookOpts = useMemo(() =>
    (playbooks || []).map(p => ({ id: p.id, label: p.title || p.titulo })),
  [playbooks])

  const funilOpts = useMemo(() =>
    (funis || []).map(f => ({ id: f.id, label: f.nome })),
  [funis])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); if (errs[k]) setErrs(e => ({ ...e, [k]: '' })) }

  function validate() {
    const e = {}
    if (!form.name.trim())   e.name = 'Informe o nome da campanha'
    if (!form.objective)     e.objective = 'Selecione um objetivo'
    if (!form.start_date)    e.start_date = 'Informe a data de início'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    await onSave({ ...form, id: form.id || crypto.randomUUID() })
    setSaving(false)
  }

  return (
    <FullPageEdit
      title={isNew ? 'Nova Campanha' : form.name}
      subtitle={isNew ? 'Nova campanha' : 'Editando campanha'}
      breadcrumb={[{ label: 'Campanhas', onClick: onCancel }]}
      onCancel={onCancel}
      onSave={handleSave}
      saving={saving}
      onDelete={!isNew ? onDelete : undefined}
      columns={2}
    >
      <FPESection title="Identificação">
        <FPEField label="Nome da Campanha *" error={errs.name} span={2}>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Ex: Campanha de Verão 2026" className="fpe-field" />
        </FPEField>
        <FPEField label="Objetivo *" error={errs.objective}>
          <select value={form.objective} onChange={e => set('objective', e.target.value)} className="fpe-field">
            <option value="">Selecione…</option>
            {OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </FPEField>
        <FPEField label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)} className="fpe-field">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FPEField>
        <FPEField label="Descrição" span={2}>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Descreva brevemente o objetivo desta campanha para os canais parceiros…"
            rows={3} className="fpe-field" style={{ resize: 'vertical', fontFamily: 'var(--font)' }} />
        </FPEField>
      </FPESection>

      <FPESection title="Vigência">
        <FPEField label="Data de Início *" error={errs.start_date}>
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="fpe-field" />
        </FPEField>
        <FPEField label="Data de Término">
          <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} min={form.start_date || undefined} className="fpe-field" />
        </FPEField>
      </FPESection>

      <FPESection title="Metas" description="Alvos comparados ao realizado (Oportunidades ganhas vinculadas a esta campanha) no relatório de performance.">
        <FPEField label="Meta de Valor (R$)">
          <input type="number" min="0" step="0.01" value={form.meta_valor} onChange={e => set('meta_valor', e.target.value)}
            placeholder="0,00" className="fpe-field" />
        </FPEField>
        <FPEField label="Meta de Oportunidades (qtd.)">
          <input type="number" min="0" step="1" value={form.meta_oportunidades} onChange={e => set('meta_oportunidades', e.target.value)}
            placeholder="0" className="fpe-field" />
        </FPEField>
      </FPESection>

      <FPESection title="Custos">
        <FPEField label="Centro de Custo" hint="Governança financeira — alimenta o Orçamento (planejado x realizado)">
          <select className="fpe-field" value={form.centro_custo_id || ''} onChange={e => set('centro_custo_id', e.target.value)}>
            <option value="">— Nenhum —</option>
            {centrosCusto.filter(c => c.status === 'ativo').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </FPEField>
        <FPEField label="" span={2}>
          <CustosSection
            items={form.custos || []}
            // Aprovar/Rejeitar é restrito a Admin, Financeiro, ou o
            // responsável (dono) do Centro de Custo vinculado à Campanha.
            podeAprovar={isAdmin || profile?.papel === 'financeiro'
              || (!!form.centro_custo_id && centrosCusto.find(c => c.id === form.centro_custo_id)?.responsavel_id === profile?.id)}
            nomeUsuario={nomeUsuario}
            onAdd={() => set('custos', [...(form.custos || []), { id: crypto.randomUUID(), descricao: '', valor_previsto: '', valor_realizado: '', executado: false, aprovacoes: [] }])}
            onUpdate={(id, patch) => set('custos', (form.custos || []).map(c => c.id === id ? { ...c, ...patch } : c))}
            onRemove={id => set('custos', (form.custos || []).filter(c => c.id !== id))}
          />
        </FPEField>
      </FPESection>

      <FPESection title="Relacionamentos" description="Todos opcionais — deixe em branco pra não restringir por esse critério.">
        <FPEField label="Franquias">
          <select value={form.franquia_modo} onChange={e => set('franquia_modo', e.target.value)} className="fpe-field">
            <option value="todas">Todas as franquias</option>
            <option value="algumas">Franquias específicas</option>
          </select>
        </FPEField>
        {form.franquia_modo === 'algumas' && (
          <FPEField label="Quais franquias">
            <SearchMultiSelect options={franquiasOpts} selected={form.franquia_ids} onChange={v => set('franquia_ids', v)} placeholder="Selecionar franquias…" />
          </FPEField>
        )}
        <FPEField label="Contatos Canal (vendedores)">
          <SearchMultiSelect options={contatosCanalOpts} selected={form.contato_canal_ids} onChange={v => set('contato_canal_ids', v)} placeholder="Todos os contatos canal" />
        </FPEField>
        <FPEField label="Contatos">
          <SearchMultiSelect options={contatosOpts} selected={form.contato_ids} onChange={v => set('contato_ids', v)} placeholder="Todos os contatos" />
        </FPEField>
        <FPEField label="Empresas — Segmento(s)">
          <SearchMultiSelect options={segmentosOpts} selected={form.empresa_segmentos} onChange={v => set('empresa_segmentos', v)} placeholder="Todos os segmentos" />
        </FPEField>
        <FPEField label="Empresas — apenas ativas">
          <select value={form.empresa_apenas_ativas ? 'sim' : 'nao'} onChange={e => set('empresa_apenas_ativas', e.target.value === 'sim')} className="fpe-field">
            <option value="nao">Todas (ativas e inativas)</option>
            <option value="sim">Apenas ativas</option>
          </select>
        </FPEField>
        <FPEField label="Empresas específicas" span={2}>
          <SearchMultiSelect options={empresasOpts} selected={form.empresa_ids} onChange={v => set('empresa_ids', v)} placeholder="Nenhuma — usar só segmento/status acima" />
        </FPEField>
        <FPEField label="Playbook">
          <SearchSelect options={playbookOpts} value={form.playbook_id} onChange={id => set('playbook_id', id || null)} placeholder="Pesquisar playbook…" noResults="Nenhum playbook encontrado" />
        </FPEField>
        <FPEField label="Funil">
          <SearchSelect options={funilOpts} value={form.funil_id} onChange={id => set('funil_id', id || null)} placeholder="Pesquisar funil…" noResults="Nenhum funil encontrado" />
        </FPEField>
      </FPESection>
    </FullPageEdit>
  )
}

/* ─── Main page ──────────────────────────────────────────── */
const SEEDS = [
  {
    id: 'c1', name: 'Campanha de Verão 2026', objective: 'Sazonal',
    description: 'Incentivo especial para captação de novos leads no período de verão.',
    start_date: '2026-01-01', end_date: '2026-02-28', status: 'active',
  },
  {
    id: 'c2', name: 'Upgrade Pro Q1', objective: 'Upgrade de Módulo',
    description: 'Campanha para conversão de clientes Basic para plano Pro.',
    start_date: '2026-03-01', end_date: '2026-03-31', status: 'draft',
  },
]

export default function Campanhas() {
  const { campanhas, save: saveCampanha, remove: removeCampanha } = useCampanhas(SEEDS)
  const { registrar: log } = useAuditLog()
  const { profile } = useProfile()
  const tenantId = profile?.tenant_id
  const [editing, setEditing]     = useState(null) // null | 'new' | campanha
  const [search, setSearch]       = useState('')
  const [importModal, setImportModal] = useState(false)

  async function handleSave(c) {
    const isNew = !campanhas.find(x => x.id === c.id)
    await saveCampanha(c)
    log(isNew ? 'criar' : 'editar', 'campanha', c.id, { descricao: `Campanha ${isNew ? 'criada' : 'editada'}: ${c.name || ''}` })
    setEditing(null)
  }

  async function handleDelete(id) {
    const c = campanhas.find(x => x.id === id)
    const bloqueio = await checkEmUso('campanha', String(id), c?.name || id, tenantId)
    if (bloqueio) { alert(bloqueio); return }
    removeCampanha(id)
    log('excluir', 'campanha', id, { descricao: `Campanha excluída: ${c?.name || id}` })
    setEditing(null)
  }

  function handleImport(rows) {
    rows.forEach(r => saveCampanha(r))
  }

  function exportCSV() {
    const header = IMPORT_COLS.join(';')
    const body   = filtered.map(c => IMPORT_COLS.map(col => toCSVValue(c[col] ?? '')).join(';')).join('\n')
    downloadText(`${header}\n${body}`, 'campanhas.csv', 'text/csv')
  }

  function exportExcel() {
    const header = IMPORT_COLS.join('\t')
    const body   = filtered.map(c => IMPORT_COLS.map(col => String(c[col] ?? '')).join('\t')).join('\n')
    downloadText(`${header}\n${body}`, 'campanhas.xls', 'application/vnd.ms-excel')
  }

  const filtered = campanhas.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.objective || '').toLowerCase().includes(search.toLowerCase())
  )

  if (editing) {
    return (
      <CampanhaEdit
        initial={editing === 'new' ? null : editing}
        onCancel={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing !== 'new' ? () => handleDelete(editing.id) : undefined}
      />
    )
  }

  return (
    <>
      <SettingsLayout
        modulo="campanhas"
        title="Campanhas"
        description="Crie e gerencie campanhas para motivar e engajar seus canais parceiros."
        columns={[
          {
            key: 'name',
            label: 'Campanhas',
            render: (v, row) => (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{v}</div>
                {row.description && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.description}
                  </div>
                )}
              </div>
            ),
          },
          { key: 'objective', label: 'Objetivo', priority: 2 },
          {
            key: 'start_date',
            label: 'Período',
            priority: 3,
            render: (v, row) => (
              <span style={{ fontFamily: 'var(--mono)', whiteSpace: 'nowrap', fontSize: 12 }}>
                {fmtDate(v)}{row.end_date ? ` → ${fmtDate(row.end_date)}` : ''}
              </span>
            ),
          },
          { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
          {
            key: 'meta_valor',
            label: 'Metas',
            priority: 2,
            render: (v, row) => {
              const hasMeta = Number(v) > 0 || Number(row.meta_oportunidades) > 0
              return (
                <span style={{ fontSize: 11, color: hasMeta ? 'var(--text-soft)' : 'var(--border2)', fontWeight: 600 }}>
                  {hasMeta ? [Number(v) > 0 && fmtMoeda(v), Number(row.meta_oportunidades) > 0 && `${row.meta_oportunidades} oport.`].filter(Boolean).join(' · ') : '—'}
                </span>
              )
            },
          },
        ]}
        data={filtered}
        onNew={() => setEditing('new')}
        newLabel="Nova Campanha"
        onRowClick={row => setEditing(row)}
        rowActions={[
          { label: 'Editar', onClick: row => setEditing(row) },
          { label: 'Excluir', danger: true, onClick: row => handleDelete(row.id) },
        ]}
        emptyLabel="Nenhuma campanha cadastrada ainda."
        storageKey="settings_campanhas"
        filterDefs={[
          { key: 'status', label: 'Status', options: [
            { value: 'active',  label: 'Ativa' },
            { value: 'paused',  label: 'Encerrada' },
            { value: 'draft',   label: 'Rascunho' },
          ]},
          { key: 'objective', label: 'Tipo / Objetivo', options: [
            { value: 'Atração de Leads',       label: 'Atração de Leads' },
            { value: 'Upgrade de Módulo',      label: 'Upgrade de Módulo' },
            { value: 'Sazonal',                label: 'Sazonal' },
            { value: 'Fidelização',            label: 'Fidelização' },
            { value: 'Lançamento de Produto',  label: 'Lançamento de Produto' },
            { value: 'Reativação',             label: 'Reativação' },
          ]},
        ]}
        bulkEditFields={[
          { key: 'status', label: 'Status', type: 'select', options: [
            { value: 'active',  label: 'Ativa' },
            { value: 'paused',  label: 'Encerrada' },
            { value: 'draft',   label: 'Rascunho' },
          ]},
        ]}
        onBulkEdit={(ids, changes) => ids.forEach(id => { const c = campanhas.find(x => x.id === id); if (c) saveCampanha({ ...c, ...changes }) })}
        search={search}
        onSearchChange={setSearch}
        onImport={() => setImportModal(true)}
        onExportCsv={exportCSV}
        onExportExcel={exportExcel}
      />

      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onImport={handleImport}
          existingNames={campanhas.map(c => (c.name || '').toLowerCase())}
        />
      )}
    </>
  )
}
