import { useState, useMemo, useRef } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import BrowseLayout from '../../components/BrowseLayout'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../../components/ui'

// ─── Colunas exportadas / importadas ─────────────────────────────────────────
const IMPORT_COLS = ['nome', 'codigo', 'classificacao', 'situacao', 'franquia_mae']

// ─── CSV helpers ──────────────────────────────────────────────────────────────
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
    const vals = parseLine(l)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    return obj
  })
  return { headers, rows }
}

function downloadText(content, filename, mime) {
  const blob = new Blob(['﻿' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function toCSVRow(cols, row, sep = ';') {
  return cols.map(c => {
    const v = String(row[c] ?? '')
    return v.includes(sep) || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
  }).join(sep)
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImport, existingNomes }) {
  const [step, setStep] = useState('upload')
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState({})
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows: parsed } = parseCSV(e.target.result)
      const errs = {}
      parsed.forEach((row, i) => {
        const rowErrs = []
        if (!row.nome?.trim()) rowErrs.push('Nome obrigatório')
        else if (existingNomes.includes(row.nome.trim().toLowerCase())) rowErrs.push('Nome já existe')
        else if (parsed.slice(0, i).some(r => r.nome?.trim().toLowerCase() === row.nome?.trim().toLowerCase())) rowErrs.push('Nome duplicado no arquivo')
        if (row.classificacao && !['franquia', 'unidade'].includes(row.classificacao)) rowErrs.push('Classificação inválida (franquia ou unidade)')
        if (row.situacao && !['ativo', 'inativo'].includes(row.situacao)) rowErrs.push('Situação inválida (ativo ou inativo)')
        if (rowErrs.length) errs[i] = rowErrs
      })
      setRows(parsed); setErrors(errs); setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const okRows  = rows.filter((_, i) => !errors[i])
  const errRows = rows.filter((_, i) => errors[i])

  function handleImport() {
    onImport(okRows.map(r => ({
      id: Date.now() + Math.random(),
      nome: r.nome.trim(),
      codigo: r.codigo?.trim() || '',
      classificacao: r.classificacao || 'franquia',
      situacao: r.situacao || 'ativo',
    })))
    onClose()
  }

  function downloadTemplate() {
    const header = IMPORT_COLS.join(';')
    const example = 'Parceiro Norte;PRC-001;franquia;ativo;'
    downloadText(`${header}\n${example}`, 'template_parceiros.csv', 'text/csv')
  }

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(2px)' }
  const modal   = { background:'var(--surface)', borderRadius:14, width:660, maxHeight:'82vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:2 }}>Parceiros</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{step === 'upload' ? 'Importar dados' : `${rows.length} linhas encontradas`}</div>
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
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>CSV (separado por ; ou ,)</div>
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Colunas: {IMPORT_COLS.join(', ')}</span>
                <button onClick={downloadTemplate} style={{ fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>⬇ Baixar template</button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1, padding:'10px 14px', borderRadius:8, background:'var(--green-bg)', color:'var(--green-text)', fontSize:12, fontWeight:600 }}>✓ {okRows.length} registros válidos</div>
                {errRows.length > 0 && <div style={{ flex:1, padding:'10px 14px', borderRadius:8, background:'var(--red-bg)', color:'var(--red-text)', fontSize:12, fontWeight:600 }}>✕ {errRows.length} com erro (serão ignorados)</div>}
              </div>
              <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                      <th style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>#</th>
                      {IMPORT_COLS.map(c => <th key={c} style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>{c}</th>)}
                      <th style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border2)', background: errors[i] ? 'var(--red-bg)' : 'transparent' }}>
                        <td style={{ padding:'6px 10px', color:'var(--text-muted)' }}>{i+1}</td>
                        {IMPORT_COLS.map(c => <td key={c} style={{ padding:'6px 10px', color:'var(--text)' }}>{row[c] || '—'}</td>)}
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
            <button onClick={handleImport} disabled={okRows.length === 0} style={{ padding:'8px 18px', borderRadius:8, border:'none', background: okRows.length ? 'var(--accent)' : 'var(--border)', color:'#fff', cursor: okRows.length ? 'pointer' : 'default', fontSize:13, fontWeight:700 }}>
              Importar {okRows.length} registro{okRows.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function uid() { return Date.now() + Math.floor(Math.random() * 999) }

const CLASSIF_CONFIG = {
  franquia: { label: 'Parceiro', color: 'var(--accent)',  bg: 'var(--accent-lite)' },
  unidade:  { label: 'Unidade',  color: '#10B981',        bg: '#D1FAE5'            },
}

const TIPO_PARCEIRO_OPTIONS = [
  { value: '',          label: '— Selecione —'   },
  { value: 'vendas',    label: 'Parceiro vendas'  },
  { value: 'tecnico',   label: 'Parceiro técnico' },
  { value: 'finder',    label: 'Finder'           },
]

function ClassifBadge({ value }) {
  const cfg = CLASSIF_CONFIG[value] || CLASSIF_CONFIG.franquia
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

function SituacaoBadge({ situacao }) {
  const ativo = situacao === 'ativo'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
      background: ativo ? '#D1FAE5' : '#F1F5F9',
      color:      ativo ? '#065F46' : '#475569',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ativo ? '#10B981' : '#9A9590' }} />
      {ativo ? 'Ativa' : 'Inativa'}
    </span>
  )
}

// ─── Bulk reclassify modal ────────────────────────────────────────────────────
function BulkReclassifyModal({ ids, franquias, onConfirm, onClose }) {
  const [classificacao, setClassificacao] = useState('franquia')
  const [franquiaId, setFranquiaId] = useState('')
  const franquiasMae = franquias.filter(f => f.classificacao !== 'unidade')
  const precisaFranquia = classificacao === 'unidade'
  const podeConfirmar = !precisaFranquia || franquiaId

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'var(--surface)', borderRadius:14, padding:28, width:420, boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:4 }}>Reclassificar em lote</div>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>{ids.length} registro{ids.length > 1 ? 's' : ''} selecionado{ids.length > 1 ? 's' : ''}</div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:6 }}>Classificação</div>
          <div style={{ display:'flex', gap:8 }}>
            {Object.entries(CLASSIF_CONFIG).map(([val, cfg]) => (
              <button key={val} type="button" onClick={() => { setClassificacao(val); setFranquiaId('') }}
                style={{ flex:1, padding:'10px 0', borderRadius:9, cursor:'pointer', fontWeight:700, fontSize:13,
                  border: classificacao === val ? `2px solid ${cfg.color}` : '2px solid var(--border)',
                  background: classificacao === val ? cfg.bg : 'var(--surface)',
                  color: classificacao === val ? cfg.color : 'var(--text-muted)',
                  transition:'all 0.12s' }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {precisaFranquia && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:6 }}>Parceiro detentor *</div>
            <select className="fpe-field" value={franquiaId} onChange={e => setFranquiaId(e.target.value)}>
              <option value="">— Selecione a franquia —</option>
              {franquiasMae.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button type="button" onClick={onClose}
            style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:'none', cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>
            Cancelar
          </button>
          <button type="button" disabled={!podeConfirmar} onClick={() => onConfirm({ classificacao, franquia_id: franquiaId || null })}
            style={{ padding:'8px 18px', borderRadius:8, border:'none', background: podeConfirmar ? 'var(--accent)' : 'var(--border)', color:'#fff', cursor: podeConfirmar ? 'pointer' : 'default', fontSize:13, fontWeight:700, transition:'background 0.12s' }}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Parceiros() {
  const [franquias, setFranquias] = useLocalState('settings:franquias_v2', [])
  const [editando, setEditando]   = useState(null)
  const [form, setForm]           = useState(null)
  const [search, setSearch]       = useState('')
  const [bulkModal, setBulkModal] = useState(null)
  const [importModal, setImportModal] = useState(false)

  const franquiasMae = useMemo(() => franquias.filter(f => f.classificacao !== 'unidade'), [franquias])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return franquias.filter(f => f.nome.toLowerCase().includes(q))
  }, [franquias, search])

  function abrirNovo() {
    setForm({ nome: '', codigo: '', situacao: 'ativo', classificacao: 'franquia', franquia_id: null, tipo_parceiro: '' })
    setEditando('novo')
  }

  function abrirEdicao(row) {
    setForm({ ...row })
    setEditando(row)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const nomeErr = useMemo(() => {
    if (!form?.nome?.trim()) return null
    return franquias.some(
      f => f.id !== editando?.id && f.nome.trim().toLowerCase() === form.nome.trim().toLowerCase()
    ) ? 'Já existe um registro com este nome' : null
  }, [form?.nome, franquias, editando])

  const podeGravar = form?.nome?.trim() && !nomeErr

  function handleSave() {
    if (!podeGravar) return
    const data = {
      ...form,
      nome: form.nome.trim(),
      franquia_id:   form.classificacao === 'unidade' ? form.franquia_id : null,
      tipo_parceiro: form.classificacao === 'franquia' ? form.tipo_parceiro : '',
    }
    if (editando !== 'novo') {
      setFranquias(prev => prev.map(f => f.id === editando.id ? { ...f, ...data } : f))
    } else {
      setFranquias(prev => [...prev, { ...data, id: uid() }])
    }
    setEditando(null)
  }

  function handleDelete(id) {
    setFranquias(prev => prev.filter(f => f.id !== id))
    setEditando(null)
  }

  function handleBulkReclassify(ids) {
    setBulkModal(ids)
  }

  function toRow(f) {
    const mae = f.franquia_id ? franquias.find(x => x.id === f.franquia_id) : null
    return { nome: f.nome, codigo: f.codigo || '', classificacao: f.classificacao || 'franquia', situacao: f.situacao || 'ativo', franquia_mae: mae?.nome || '' }
  }

  function exportCSV() {
    const header = IMPORT_COLS.join(';')
    const body   = filtered.map(f => toCSVRow(IMPORT_COLS, toRow(f))).join('\n')
    downloadText(`${header}\n${body}`, 'parceiros.csv', 'text/csv')
  }

  function exportExcel() {
    const header = IMPORT_COLS.join('\t')
    const body   = filtered.map(f => IMPORT_COLS.map(c => toRow(f)[c] ?? '').join('\t')).join('\n')
    downloadText(`${header}\n${body}`, 'parceiros.xls', 'application/vnd.ms-excel')
  }

  function handleImport(rows) {
    setFranquias(prev => [...prev, ...rows.map(r => ({ ...r, id: Date.now() + Math.random() }))])
  }

  function applyBulk({ classificacao, franquia_id }) {
    const ids = new Set(bulkModal)
    setFranquias(prev => prev.map(f =>
      ids.has(f.id)
        ? { ...f, classificacao, franquia_id: classificacao === 'unidade' ? franquia_id : null }
        : f
    ))
    setBulkModal(null)
  }

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      render: (v, row) => {
        const franquiaMae = row.franquia_id ? franquias.find(f => f.id === row.franquia_id) : null
        return (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {row.codigo && <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:5, padding:'1px 6px' }}>{row.codigo}</span>}
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{v}</span>
            </div>
            {franquiaMae && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                ↳ {franquiaMae.codigo ? `[${franquiaMae.codigo}] ` : ''}{franquiaMae.nome}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'classificacao',
      label: 'Classificação',
      width: 130,
      render: v => <ClassifBadge value={v || 'franquia'} />,
    },
    {
      key: 'situacao',
      label: 'Situação',
      width: 110,
      render: v => <SituacaoBadge situacao={v} />,
    },
  ]

  // ── Form (early return) ───────────────────────────────────────────────────
  if (editando) {
    const isUnidade = form.classificacao === 'unidade'
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Parceiros', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Novo parceiro' : `Editar: ${editando.nome}`}
        onSave={podeGravar ? handleSave : undefined}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
      >
        <FPESection title="Identificação" columns={4}>
          {/* Classificação */}
          <FPEField label="Classificação" required style={{ gridColumn: 'span 2' }}>
            <select className="fpe-field" value={form.classificacao || 'franquia'}
              onChange={e => { set('classificacao', e.target.value); set('franquia_id', null); set('tipo_parceiro', '') }}>
              {Object.entries(CLASSIF_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
          </FPEField>

          {/* Situação */}
          <FPEField label="Situação" style={{ gridColumn: 'span 2' }}>
            <select className="fpe-field" value={form.situacao || 'ativo'}
              onChange={e => set('situacao', e.target.value)}>
              <option value="ativo">Ativa</option>
              <option value="inativo">Inativa</option>
            </select>
          </FPEField>

          {/* Código */}
          <FPEField label="Código" style={{ gridColumn: 'span 1' }}>
            <input className="fpe-field" value={form.codigo || ''}
              onChange={e => set('codigo', e.target.value)}
              placeholder="Ex: PRC-001" />
          </FPEField>

          {/* Estado */}
          <FPEField label="Estado" style={{ gridColumn: 'span 1' }}>
            <select className="fpe-field" value={form.estado || ''}
              onChange={e => set('estado', e.target.value)}>
              <option value="">— UF —</option>
              {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </FPEField>

          {/* Nome */}
          <FPEField label={isUnidade ? 'Nome da Unidade' : 'Nome do Parceiro'} required error={nomeErr} style={{ gridColumn: '1/-1' }}>
            <input className="fpe-field" value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder={isUnidade ? 'Ex: Unidade Norte' : 'Ex: Parceiro Norte'}
              style={nomeErr ? { borderColor: 'var(--red)' } : {}} />
          </FPEField>

          {/* Tipo de Parceiro — só se Parceiro (não Unidade) */}
          {!isUnidade && (
            <FPEField label="Tipo de Parceiro" style={{ gridColumn: '1/-1' }}>
              <select className="fpe-field" value={form.tipo_parceiro || ''}
                onChange={e => set('tipo_parceiro', e.target.value)}>
                {TIPO_PARCEIRO_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FPEField>
          )}

          {/* Parceiro detentor — só se Unidade */}
          {isUnidade && (
            <FPEField label="Parceiro detentor" style={{ gridColumn: '1/-1' }}>
              <select className="fpe-field" value={form.franquia_id || ''}
                onChange={e => set('franquia_id', e.target.value || null)}>
                <option value="">— Nenhum —</option>
                {franquiasMae.filter(f => f.id !== editando?.id).map(f => (
                  <option key={f.id} value={f.id}>{f.codigo ? `[${f.codigo}] ` : ''}{f.nome}</option>
                ))}
              </select>
            </FPEField>
          )}
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <>
      {bulkModal && (
        <BulkReclassifyModal
          ids={bulkModal}
          franquias={franquias}
          onConfirm={applyBulk}
          onClose={() => setBulkModal(null)}
        />
      )}
      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onImport={handleImport}
          existingNomes={franquias.map(f => f.nome.toLowerCase())}
        />
      )}
      <BrowseLayout
        columns={columns}
        data={filtered}
        keyField="id"
        storageKey="settings_parceiros"
        newLabel="Novo parceiro"
        onNew={abrirNovo}
        onRowClick={abrirEdicao}
        search={search}
        onSearchChange={setSearch}
        onImport={() => setImportModal(true)}
        onExportCsv={exportCSV}
        onExportExcel={exportExcel}
        bulkActions={[
          { label: 'Reclassificar', onClick: handleBulkReclassify },
        ]}
        emptyState={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>🏢</span>
            <span style={{ fontSize: 13 }}>Nenhum parceiro ou unidade cadastrado.</span>
          </div>
        }
      />
    </>
  )
}
