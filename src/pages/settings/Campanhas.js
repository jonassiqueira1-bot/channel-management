import { useState, useCallback, useRef } from 'react'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useCampanhas } from '../../hooks/useCampanhas'
import SettingsLayout from '../../components/ui/SettingsLayout'

/* ─── Constants ─────────────────────────────────────────── */

const IMPORT_COLS = ['name', 'objective', 'description', 'start_date', 'end_date', 'status', 'pontua_metas']

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
    const example = 'Campanha Verão;Sazonal;Descrição aqui;2026-01-01;2026-03-31;draft;false'
    downloadText(`${header}\n${example}`, 'template_campanhas.csv', 'text/csv')
  }

  const okRows  = rows.filter((_, i) => !errors[i])
  const errRows = rows.filter((_, i) =>  errors[i])

  function doImport() {
    onImport(okRows.map(r => ({
      id: Math.random().toString(36).slice(2),
      name: r.name.trim(),
      objective: r.objective || '',
      description: r.description || '',
      start_date: r.start_date || '',
      end_date: r.end_date || '',
      status: VALID_STATUS.includes(r.status) ? r.status : 'draft',
      pontua_metas: r.pontua_metas === 'true' || r.pontua_metas === '1',
      materials: [''],
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
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:2 }}>Campanhas de Incentivo</div>
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
                <strong>pontua_metas:</strong> true / false &nbsp;·&nbsp;
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
  materials: [''],
  pontua_metas: false,
  start_date: '',
  end_date: '',
  status: 'draft',
}

const STEPS = [
  { label: 'Identificação',       desc: 'Nome, objetivo e descrição' },
  { label: 'Materiais e Regras',  desc: 'Links e configurações' },
  { label: 'Período e Ativação',  desc: 'Datas e status inicial' },
]

function uid() { return Math.random().toString(36).slice(2, 10) }

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

/* ─── Progress bar ───────────────────────────────────────── */
function WizardProgress({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '24px 32px 0', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
      {STEPS.map((s, i) => {
        const done    = i < step
        const current = i === step
        const last    = i === STEPS.length - 1
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: last ? 0 : 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, flexShrink: 0,
                background: done ? ACCENT : current ? ACCENT : 'var(--surface3)',
                color: done || current ? '#fff' : 'var(--text-muted)',
                border: current ? `2px solid ${ACCENT}` : done ? `2px solid ${ACCENT}` : '2px solid var(--border2)',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: current ? ACCENT : done ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 1 }}>{s.desc}</div>
              </div>
            </div>
            {!last && (
              <div style={{
                flex: 1, height: 2, marginTop: 13, marginLeft: 8, marginRight: 8,
                background: done ? ACCENT : 'var(--border2)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Step 1 — Identificação ─────────────────────────────── */
function Step1({ form, onChange, errors }) {
  return (
    <div style={wz.body}>
      <div style={wz.fieldGroup}>
        <Label text="Nome da Campanha" required />
        <input
          value={form.name}
          onChange={e => onChange('name', e.target.value)}
          placeholder="Ex: Campanha de Verão 2026"
          style={{ ...wz.input, ...(errors.name ? { border: '1px solid var(--red)' } : {}) }}
        />
        {errors.name && <span style={wz.err}>{errors.name}</span>}
      </div>

      <div style={wz.fieldGroup}>
        <Label text="Objetivo" required />
        <select
          value={form.objective}
          onChange={e => onChange('objective', e.target.value)}
          style={{ ...wz.input, ...(errors.objective ? { border: '1px solid var(--red)' } : {}) }}
        >
          <option value="">Selecione o objetivo...</option>
          {OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {errors.objective && <span style={wz.err}>{errors.objective}</span>}
      </div>

      <div style={wz.fieldGroup}>
        <Label text="Descrição" />
        <textarea
          value={form.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Descreva brevemente o objetivo desta campanha para os canais parceiros..."
          rows={4}
          style={{ ...wz.input, resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.6 }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{form.description.length} / 500 caracteres</span>
      </div>
    </div>
  )
}

/* ─── Step 2 — Materiais e Regras ────────────────────────── */
function Step2({ form, onChange }) {
  function addMaterial() { onChange('materials', [...form.materials, '']) }
  function updateMaterial(i, v) {
    const next = [...form.materials]
    next[i] = v
    onChange('materials', next)
  }
  function removeMaterial(i) {
    onChange('materials', form.materials.filter((_, idx) => idx !== i))
  }

  return (
    <div style={wz.body}>
      <div style={wz.fieldGroup}>
        <Label text="Links de Materiais de Apoio" />
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Adicione URLs de arquivos, pastas compartilhadas ou assets da campanha (PDFs, artes, apresentações).
        </p>
        {form.materials.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={m}
              onChange={e => updateMaterial(i, e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{ ...wz.input, flex: 1, marginBottom: 0 }}
            />
            {form.materials.length > 1 && (
              <button type="button" onClick={() => removeMaterial(i)} style={wz.btnRemove}>✕</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addMaterial} style={wz.btnAdd}>+ Adicionar link</button>
      </div>

      <div style={{ ...wz.fieldGroup, marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Pontuação Especial nas Metas</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Ativar para que ações desta campanha pontuem de forma diferenciada no ranking de metas.
            </div>
          </div>
          <Toggle value={form.pontua_metas} onChange={v => onChange('pontua_metas', v)} />
        </div>
      </div>
    </div>
  )
}

/* ─── Step 3 — Período e Ativação ────────────────────────── */
function Step3({ form, onChange, errors }) {
  return (
    <div style={wz.body}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={wz.fieldGroup}>
          <Label text="Data de Início" required />
          <input
            type="date"
            value={form.start_date}
            onChange={e => onChange('start_date', e.target.value)}
            style={{ ...wz.input, ...(errors.start_date ? { border: '1px solid var(--red)' } : {}) }}
          />
          {errors.start_date && <span style={wz.err}>{errors.start_date}</span>}
        </div>
        <div style={wz.fieldGroup}>
          <Label text="Data de Término" />
          <input
            type="date"
            value={form.end_date}
            onChange={e => onChange('end_date', e.target.value)}
            min={form.start_date || undefined}
            style={wz.input}
          />
        </div>
      </div>

      <div style={{ ...wz.fieldGroup, marginTop: 24 }}>
        <Label text="Status Inicial" />
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('status', opt.value)}
              style={{
                flex: 1, padding: '14px 12px', borderRadius: 10, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                border: form.status === opt.value ? `2px solid ${opt.color}` : '2px solid var(--border)',
                background: form.status === opt.value ? opt.bg : 'var(--surface)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: form.status === opt.value ? opt.color : 'var(--text-muted)' }}>
                {opt.label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                {opt.value === 'draft'  && 'Salvar sem publicar ainda'}
                {opt.value === 'active' && 'Publicar imediatamente'}
                {opt.value === 'paused' && 'Criar já pausada'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Toggle ─────────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: value ? ACCENT : 'var(--border2)', position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 22 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

/* ─── Label ──────────────────────────────────────────────── */
function Label({ text, required }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
      {text}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
    </label>
  )
}

/* ─── Wizard modal ───────────────────────────────────────── */
function CampanhaWizard({ initial, onClose, onSave }) {
  const [step, setStep]   = useState(0)
  const [form, setForm]   = useState(initial || { ...EMPTY_FORM })
  const [errors, setErrs] = useState({})

  const update = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), [])

  function validate() {
    const e = {}
    if (step === 0) {
      if (!form.name.trim())     e.name      = 'Informe o nome da campanha'
      if (!form.objective)       e.objective  = 'Selecione um objetivo'
    }
    if (step === 2) {
      if (!form.start_date)      e.start_date = 'Informe a data de início'
    }
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validate()) return
    setStep(s => Math.min(s + 1, STEPS.length - 1))
    setErrs({})
  }
  function back() { setStep(s => Math.max(s - 1, 0)); setErrs({}) }

  function handleSave(status) {
    if (!validate()) return
    onSave({ ...form, status, id: form.id || uid() })
  }

  const isLast = step === STEPS.length - 1

  return (
    <div style={wz.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={wz.modal}>

        {/* Header */}
        <div style={wz.header}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
              {initial ? 'Editar Campanha' : 'Nova Campanha'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Passo {step + 1} de {STEPS.length} — {STEPS[step].label}
            </div>
          </div>
          <button onClick={onClose} style={wz.closeBtn}>✕</button>
        </div>

        {/* Progress */}
        <WizardProgress step={step} />

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {step === 0 && <Step1 form={form} onChange={update} errors={errors} />}
          {step === 1 && <Step2 form={form} onChange={update} />}
          {step === 2 && <Step3 form={form} onChange={update} errors={errors} />}
        </div>

        {/* Footer */}
        <div style={wz.footer}>
          <button type="button" onClick={() => handleSave('draft')} style={wz.btnDraft}>
            Salvar como Rascunho
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button type="button" onClick={back} style={wz.btnBack}>← Voltar</button>
            )}
            {!isLast ? (
              <button type="button" onClick={next} style={wz.btnPrimary}>Próximo →</button>
            ) : (
              <button type="button" onClick={() => handleSave(form.status)} style={{ ...wz.btnPrimary, background: '#10B981' }}>
                ✓ Publicar Campanha
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */
const SEEDS = [
  {
    id: 'c1', name: 'Campanha de Verão 2026', objective: 'Sazonal',
    description: 'Incentivo especial para captação de novos leads no período de verão.',
    start_date: '2026-01-01', end_date: '2026-02-28', status: 'active',
    materials: ['https://drive.google.com/arts-verao'], pontua_metas: true,
  },
  {
    id: 'c2', name: 'Upgrade Pro Q1', objective: 'Upgrade de Módulo',
    description: 'Campanha para conversão de clientes Basic para plano Pro.',
    start_date: '2026-03-01', end_date: '2026-03-31', status: 'draft',
    materials: [''], pontua_metas: false,
  },
]

export default function Campanhas() {
  const { campanhas, save: saveCampanha, remove: removeCampanha } = useCampanhas(SEEDS)
  const { registrar: log } = useAuditLog()
  const [wizard, setWizard]       = useState(null)
  const [search, setSearch]       = useState('')
  const [importModal, setImportModal] = useState(false)

  function handleSave(c) {
    const isNew = !campanhas.find(x => x.id === c.id)
    saveCampanha(c)
    log(isNew ? 'criar' : 'editar', 'campanha', c.id, { descricao: `Campanha ${isNew ? 'criada' : 'editada'}: ${c.nome || c.titulo || ''}` })
    setWizard(null)
  }

  function handleDelete(id) {
    const c = campanhas.find(x => x.id === id)
    removeCampanha(id)
    log('excluir', 'campanha', id, { descricao: `Campanha excluída: ${c?.nome || c?.titulo || id}` })
  }

  function handleImport(rows) {
    rows.forEach(r => saveCampanha(r))
  }

  function exportCSV() {
    const header = IMPORT_COLS.join(';')
    const body   = filtered.map(c =>
      IMPORT_COLS.map(col => toCSVValue(col === 'pontua_metas' ? String(c[col] ?? false) : (c[col] ?? ''))).join(';')
    ).join('\n')
    downloadText(`${header}\n${body}`, 'campanhas.csv', 'text/csv')
  }

  function exportExcel() {
    const header = IMPORT_COLS.join('\t')
    const body   = filtered.map(c =>
      IMPORT_COLS.map(col => String(col === 'pontua_metas' ? (c[col] ?? false) : (c[col] ?? ''))).join('\t')
    ).join('\n')
    downloadText(`${header}\n${body}`, 'campanhas.xls', 'application/vnd.ms-excel')
  }

  const filtered = campanhas.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.objective.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <SettingsLayout
        title="Campanhas de Incentivo"
        description="Crie e gerencie campanhas para motivar e engajar seus canais parceiros."
        columns={[
          {
            key: 'name',
            label: 'Campanha',
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
            key: 'pontua_metas',
            label: 'Metas',
            priority: 2,
            render: (v) => (
              <span style={{ fontSize: 11, color: v ? '#10B981' : 'var(--border2)', fontWeight: 700 }}>
                {v ? '✓ Sim' : '—'}
              </span>
            ),
          },
        ]}
        data={filtered}
        onNew={() => setWizard('new')}
        newLabel="+ Nova Campanha"
        rowActions={[
          { label: 'Editar', onClick: row => setWizard(row) },
          { label: 'Excluir', danger: true, onClick: row => handleDelete(row.id) },
        ]}
        emptyLabel="Nenhuma campanha cadastrada ainda."
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
          existingNames={campanhas.map(c => c.name.toLowerCase())}
        />
      )}

      {wizard && (
        <CampanhaWizard
          initial={wizard === 'new' ? null : wizard}
          onClose={() => setWizard(null)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

/* ─── Styles ─────────────────────────────────────────────── */

const ACCENT = 'var(--accent)'

const pg = {
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '28px 32px 16px', borderBottom: '1px solid var(--border)',
  },
  title: { fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.3px' },
  desc:  { fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' },
  btnNew: {
    background: ACCENT, color: '#fff', border: 'none', borderRadius: 8,
    padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0,
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 32px',
    borderBottom: '1px solid var(--border)', background: 'var(--surface)',
  },
  search: {
    padding: '7px 12px', fontSize: 12.5, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface2)',
    color: 'var(--text)', fontFamily: 'var(--font)', width: 240,
    outline: 'none',
  },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th: { padding: '8px 12px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' },
  td: { padding: '10px 12px', fontSize: 12.5, verticalAlign: 'middle' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 240, background: 'var(--surface2)', borderRadius: 12, border: '1px dashed var(--border2)', marginTop: 16 },
  btnAction: { fontSize: 11.5, fontWeight: 600, color: ACCENT, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font)' },
}

const wz = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 500, backdropFilter: 'blur(2px)',
  },
  modal: {
    background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 640,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
  },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 },
  body:     { padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  fieldGroup: { display: 'flex', flexDirection: 'column' },
  input: {
    padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  err:      { fontSize: 11, color: 'var(--red)', marginTop: 4 },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', borderTop: '1px solid var(--border)',
    background: 'var(--surface2)', flexShrink: 0,
  },
  btnDraft:   { fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnBack:    { fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)',  background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnPrimary: { fontSize: 13, fontWeight: 700, color: '#fff', background: ACCENT, border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnAdd:     { fontSize: 12, fontWeight: 600, color: ACCENT, background: 'none', border: `1px dashed ${ACCENT}55`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 4 },
  btnRemove:  { fontSize: 13, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', flexShrink: 0 },
}
