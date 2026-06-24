import { useState, useRef } from 'react'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useTiposAcao } from '../../hooks/useTiposAcao'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

const DEFAULTS = [
  { id: 1, label: 'Treinamento',  icon: '🎓', color: 'var(--accent)', bg: 'var(--accent-lite)', text: 'var(--accent)', slug: 'treinamento', uso: 'acao' },
  { id: 2, label: 'Evento',       icon: '📅', color: '#3B82F6', bg: '#DBEAFE', text: '#1D4ED8', slug: 'evento', uso: 'acao' },
  { id: 3, label: 'Capacitação',  icon: '🚀', color: '#10B981', bg: '#D1FAE5', text: '#065F46', slug: 'capacitacao', uso: 'acao' },
  { id: 4, label: 'Outros',       icon: '◎',  color: '#6B7280', bg: '#F3F4F6', text: '#374151', slug: 'outros', uso: 'acao' },
  { id: 5, label: 'Ligação',      icon: '📞', color: '#3B82F6', bg: '#DBEAFE', text: '#1D4ED8', slug: 'ligacao', uso: 'tarefa' },
  { id: 6, label: 'E-mail',       icon: '📧', color: '#10B981', bg: '#D1FAE5', text: '#065F46', slug: 'email', uso: 'tarefa' },
  { id: 7, label: 'Reunião',      icon: '🤝', color: '#F59E0B', bg: '#FEF3C7', text: '#B45309', slug: 'reuniao', uso: 'tarefa' },
  { id: 8, label: 'Visita',       icon: '📍', color: '#EC4899', bg: '#FCE7F3', text: '#9D174D', slug: 'visita', uso: 'tarefa' },
  { id: 9, label: 'Proposta',     icon: '📋', color: 'var(--accent)', bg: 'var(--accent-lite)', text: 'var(--accent)', slug: 'proposta', uso: 'tarefa' },
  { id:10, label: 'Follow-up',    icon: '🔔', color: '#EF4444', bg: '#FEE2E2', text: '#991B1B', slug: 'follow_up', uso: 'tarefa' },
]

const USO_CFG = {
  acao:   { label: 'Ações',   color: '#6366F1', bg: '#EDE9FE', text: '#5B21B6' },
  tarefa: { label: 'Tarefas', color: '#F59E0B', bg: '#FEF3C7', text: '#B45309' },
  ambos:  { label: 'Ambos',   color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
}

function UsoBadge({ uso }) {
  const cfg = USO_CFG[uso] || USO_CFG.ambos
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20,
      fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.color}33` }}>
      {cfg.label}
    </span>
  )
}

const PALETTE = [
  { color: 'var(--accent)', bg: 'var(--accent-lite)', text: 'var(--accent)', label: 'Violeta' },
  { color: '#3B82F6', bg: '#DBEAFE', text: '#1D4ED8', label: 'Azul' },
  { color: '#10B981', bg: '#D1FAE5', text: '#065F46', label: 'Verde' },
  { color: '#F59E0B', bg: '#FEF3C7', text: '#B45309', label: 'Âmbar' },
  { color: '#EF4444', bg: '#FEE2E2', text: '#991B1B', label: 'Vermelho' },
  { color: '#EC4899', bg: '#FCE7F3', text: '#9D174D', label: 'Rosa' },
  { color: 'var(--accent)', bg: 'var(--accent-lite)', text: '#5B21B6', label: 'Roxo' },
  { color: '#6B7280', bg: '#F3F4F6', text: '#374151', label: 'Cinza' },
]

const ICONS = ['🎓','📅','🚀','◎','⭐','🔔','📋','💡','🎯','🏆','🤝','📊','🛠️','🧩','📌','✅']

const IMPORT_COLS = ['label', 'icon', 'cor']

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

function uid() { return Date.now() + Math.floor(Math.random() * 9999) }

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function TipoBadge({ label, icon, bg, text, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: bg, color: text, border: `1px solid ${color}44`, fontFamily: 'var(--mono)',
    }}>
      {icon} {label}
    </span>
  )
}

function ImportModal({ onClose, onImport, existingLabels }) {
  const [step, setStep]     = useState('upload')
  const [rows, setRows]     = useState([])
  const [errors, setErrors] = useState({})
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const VALID_CORES = PALETTE.map(p => p.label)

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows: parsed } = parseCSV(e.target.result)
      const errs = {}
      parsed.forEach((row, i) => {
        const rowErrs = []
        if (!row.label?.trim()) rowErrs.push('Nome obrigatório')
        else if (existingLabels.includes(row.label.trim().toLowerCase())) rowErrs.push('Nome já existe')
        else if (parsed.slice(0, i).some(r => r.label?.trim().toLowerCase() === row.label?.trim().toLowerCase())) rowErrs.push('Nome duplicado no arquivo')
        if (row.cor && !VALID_CORES.includes(row.cor)) rowErrs.push(`Cor inválida (${VALID_CORES.join(', ')})`)
        if (rowErrs.length) errs[i] = rowErrs
      })
      setRows(parsed); setErrors(errs); setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function downloadTemplate() {
    const header  = IMPORT_COLS.join(';')
    const example = `Workshop;🎓;Azul\nWebinar;💡;Verde\nVisita;🤝;Âmbar`
    downloadText(`${header}\n${example}`, 'template_tipos_acao.csv', 'text/csv')
  }

  function resolvePaleta(corLabel) {
    return PALETTE.find(p => p.label === corLabel) || PALETTE[0]
  }

  const okRows  = rows.filter((_, i) => !errors[i])
  const errRows = rows.filter((_, i) =>  errors[i])

  function doImport() {
    onImport(okRows.map(r => {
      const p = resolvePaleta(r.cor)
      return { id: uid(), label: r.label.trim(), icon: r.icon || '◎', slug: slugify(r.label.trim()), color: p.color, bg: p.bg, text: p.text }
    }))
    onClose()
  }

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(2px)' }
  const modal   = { background:'var(--surface)', borderRadius:14, width:620, maxHeight:'84vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ padding:'20px 24px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:2 }}>Tipos de Ações</div>
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
                <strong>icon:</strong> qualquer emoji &nbsp;·&nbsp;
                <strong>cor:</strong> {VALID_CORES.join(', ')}
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1, padding:'10px 14px', borderRadius:8, background:'var(--green-bg)', color:'var(--green-text)', fontSize:12, fontWeight:600 }}>✓ {okRows.length} tipo{okRows.length !== 1 ? 's' : ''} válido{okRows.length !== 1 ? 's' : ''}</div>
                {errRows.length > 0 && <div style={{ flex:1, padding:'10px 14px', borderRadius:8, background:'var(--red-bg)', color:'var(--red-text)', fontSize:12, fontWeight:600 }}>✕ {errRows.length} com erro (serão ignorados)</div>}
              </div>
              <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>#</th>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Nome</th>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Ícone</th>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Cor</th>
                      <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border2)', background: errors[i] ? 'var(--red-bg)' : 'transparent' }}>
                        <td style={{ padding:'6px 10px', color:'var(--text-muted)' }}>{i+1}</td>
                        <td style={{ padding:'6px 10px', fontWeight:600 }}>{row.label || '—'}</td>
                        <td style={{ padding:'6px 10px', fontSize:16 }}>{row.icon || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)' }}>{row.cor || '—'}</td>
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
              Importar {okRows.length} tipo{okRows.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export const STORAGE_KEY = 'settings:tipos_acao_v1'

export default function SettingsTiposAcao() {
  const { tipos, save: saveTipo, remove: removeTipo } = useTiposAcao(DEFAULTS)
  const { registrar: log } = useAuditLog()
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)
  const [busca, setBusca] = useState('')
  const [importModal, setImportModal] = useState(false)

  const filtered = tipos.filter(t => !busca || t.label.toLowerCase().includes(busca.toLowerCase()))

  function handleImport(rows) { rows.forEach(r => saveTipo(r)) }

  function exportCSV() {
    const header = IMPORT_COLS.join(';')
    const body   = filtered.map(t => {
      const palLabel = PALETTE.find(p => p.color === t.color)?.label || 'Cinza'
      return [t.label, t.icon, palLabel].join(';')
    }).join('\n')
    downloadText(`${header}\n${body}`, 'tipos_acao.csv', 'text/csv')
  }

  function exportExcel() {
    const header = IMPORT_COLS.join('\t')
    const body   = filtered.map(t => {
      const palLabel = PALETTE.find(p => p.color === t.color)?.label || 'Cinza'
      return [t.label, t.icon, palLabel].join('\t')
    }).join('\n')
    downloadText(`${header}\n${body}`, 'tipos_acao.xls', 'application/vnd.ms-excel')
  }

  function abrirNovo() {
    const p = PALETTE[0]
    setForm({ label: '', icon: '🎓', color: p.color, bg: p.bg, text: p.text, uso: 'acao' })
    setEditando('novo')
  }

  function abrirEdicao(tipo) {
    setForm({ ...tipo })
    setEditando(tipo)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function escolherPaleta(p) { setForm(f => ({ ...f, color: p.color, bg: p.bg, text: p.text })) }

  function handleSave() {
    if (!form.label.trim()) return
    const isNew = editando === 'novo'
    const id = isNew ? uid() : editando.id
    const record = isNew ? { ...form, id, slug: slugify(form.label) } : { ...form, id, slug: editando.slug }
    saveTipo(record)
    log(isNew ? 'criar' : 'editar', 'tipo_acao', id, { descricao: `Tipo de ação ${isNew ? 'criado' : 'editado'}: ${form.label}` })
    setEditando(null)
  }

  function handleDelete(id) {
    const t = tipos.find(x => x.id === id)
    removeTipo(id)
    log('excluir', 'tipo_acao', id, { descricao: `Tipo de ação excluído: ${t?.label || id}` })
    setEditando(null)
  }

  if (editando) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Tipos de Ações', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Novo Tipo de Ação' : `Editar: ${editando.label}`}
        subtitle="Categorias usadas no cadastro de ações comerciais"
        onSave={handleSave}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
      >
        <FPESection title="Identificação">
          <FPEField label="Prévia">
            <TipoBadge label={form.label || 'Prévia'} icon={form.icon} bg={form.bg} text={form.text} color={form.color} />
          </FPEField>
          <FPEField label="Nome" required>
            <input className="fpe-field" value={form.label} maxLength={40}
              placeholder="Ex: Workshop, Webinar…"
              onChange={e => set('label', e.target.value)} />
          </FPEField>
          <FPEField label="Usado em" required>
            <div style={{ display:'flex', gap:8 }}>
              {Object.entries(USO_CFG).map(([k, cfg]) => {
                const ativo = (form.uso || 'acao') === k
                return (
                  <button key={k} type="button" onClick={() => set('uso', k)}
                    style={{ padding:'7px 16px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
                      fontSize:12, fontWeight: ativo ? 700 : 500,
                      border:`1.5px solid ${ativo ? cfg.color : 'var(--border)'}`,
                      background: ativo ? cfg.bg : 'var(--surface2)',
                      color: ativo ? cfg.text : 'var(--text-muted)', transition:'all 0.15s' }}>
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </FPEField>
        </FPESection>

        <FPESection title="Aparência">
          <FPEField label="Ícone">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => set('icon', ic)}
                  style={{
                    width: 38, height: 38, borderRadius: 8, cursor: 'pointer', fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${ic === form.icon ? form.color : 'var(--border)'}`,
                    background: ic === form.icon ? form.bg : 'var(--surface2)',
                  }}>
                  {ic}
                </button>
              ))}
            </div>
          </FPEField>
          <FPEField label="Cor">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {PALETTE.map(p => (
                <button key={p.color} type="button" onClick={() => escolherPaleta(p)} title={p.label}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', background: p.color, cursor: 'pointer',
                    border: `3px solid ${p.color === form.color ? p.color : 'transparent'}`,
                    outline: p.color === form.color ? `2px solid ${p.color}44` : 'none',
                    outlineOffset: 2,
                  }} />
              ))}
            </div>
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <>
      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onImport={handleImport}
          existingLabels={tipos.map(t => t.label.toLowerCase())}
        />
      )}
      <SettingsLayout
        title="Tipos de Atividades"
        description="Categorias usadas no cadastro de Ações e Tarefas do canal."
        columns={[
          { key: 'label', label: 'Tipo', render: (v, row) => <TipoBadge label={row.label} icon={row.icon} bg={row.bg} text={row.text} color={row.color} /> },
          { key: 'uso',   label: 'Usado em', render: val => <UsoBadge uso={val || 'acao'} /> },
          { key: 'slug',  label: 'Slug', muted: true, priority: 2 },
        ]}
        data={filtered}
        keyField="id"
        emptyLabel="Nenhum tipo cadastrado."
        onNew={abrirNovo}
        newLabel="+ Novo tipo"
        rowActions={[
          { label: 'Editar',  onClick: abrirEdicao },
          { label: 'Excluir', danger: true, onClick: row => handleDelete(row.id) },
        ]}
        search={busca}
        onSearchChange={setBusca}
        onImport={() => setImportModal(true)}
        onExportCsv={exportCSV}
        onExportExcel={exportExcel}
      />
    </>
  )
}
