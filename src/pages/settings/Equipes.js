import { useState, useRef, useEffect } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../../components/ui'
import { MOCK_PERFIS } from '../../data/mockPerfis'

export const EQUIPES_STORAGE_KEY = 'settings:equipes_v1'

const IMPORT_COLS = ['nome', 'descricao', 'lider', 'status']

const STATUS_CFG = {
  ativa:    { label: 'Ativa',    color: 'var(--green)',   bg: 'var(--green-bg)',   text: 'var(--green-text)'  },
  inativa:  { label: 'Inativa',  color: '#9A9590',        bg: 'var(--surface3)',   text: 'var(--text-muted)'  },
  pausada:  { label: 'Pausada',  color: '#F59E0B',        bg: '#FEF3C7',           text: '#92400E'            },
}

function uid() { return Date.now() + Math.floor(Math.random() * 9999) }

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

function toCSVValue(v) {
  const s = String(v ?? '')
  return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

// ─── SearchableMultiSelect ────────────────────────────────────────────────────
function SearchableMultiSelect({ options, value = [], onChange, placeholder = 'Selecionar…', disabled = false }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selected = options.filter(o => value.includes(o.value))

  function toggle(val) {
    onChange(value.includes(val) ? value.filter(v => v !== val) : [...value, val])
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button type="button" disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', minHeight: 38, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: 'var(--font)' }}>
        {selected.length === 0
          ? <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{placeholder}</span>
          : selected.map(o => (
            <span key={o.value} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-lite)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {o.label}
              <span onClick={e => { e.stopPropagation(); toggle(o.value) }} style={{ cursor: 'pointer', opacity: 0.7 }}>×</span>
            </span>
          ))
        }
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border2)' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar…" className="fpe-field" style={{ height: 30, fontSize: 12 }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Nenhum resultado</div>
              : filtered.map(o => {
                const checked = value.includes(o.value)
                return (
                  <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', background: checked ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>{o.label}</span>
                    {o.sub && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{o.sub}</span>}
                  </label>
                )
              })
            }
          </div>
          {value.length > 0 && (
            <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{value.length} selecionado{value.length !== 1 ? 's' : ''}</span>
              <button type="button" onClick={() => onChange([])} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>Limpar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Badge de status ──────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.ativa
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20,
      background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  )
}

// ─── ImportModal ──────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImport, existingNames }) {
  const [step, setStep]     = useState('upload')
  const [rows, setRows]     = useState([])
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
        else if (existingNames.includes(row.nome.trim().toLowerCase())) rowErrs.push('Nome já existe')
        else if (parsed.slice(0, i).some(r => r.nome?.trim().toLowerCase() === row.nome?.trim().toLowerCase())) rowErrs.push('Nome duplicado no arquivo')
        if (row.status && !STATUS_CFG[row.status]) rowErrs.push(`Status inválido (${Object.keys(STATUS_CFG).join(', ')})`)
        if (rowErrs.length) errs[i] = rowErrs
      })
      setRows(parsed); setErrors(errs); setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function downloadTemplate() {
    const header  = IMPORT_COLS.join(';')
    const example = `Equipe Comercial SP;Equipe focada em prospecção;Jonas Siqueira;ativa\nEquipe Técnica;Suporte e implantação;;ativa`
    downloadText(`${header}\n${example}`, 'template_equipes.csv', 'text/csv')
  }

  const okRows  = rows.filter((_, i) => !errors[i])
  const errRows = rows.filter((_, i) =>  errors[i])

  function doImport() {
    onImport(okRows.map(r => ({
      id: uid(),
      nome:       r.nome.trim(),
      descricao:  r.descricao?.trim() || '',
      lider:      r.lider?.trim() || '',
      status:     STATUS_CFG[r.status] ? r.status : 'ativa',
      membro_ids: [],
      meta_ids:   [],
    })))
    onClose()
  }

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(2px)' }
  const modal   = { background:'var(--surface)', borderRadius:14, width:620, maxHeight:'84vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ padding:'20px 24px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:2 }}>Equipes</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{step === 'upload' ? 'Importar equipes' : `${rows.length} linha${rows.length !== 1 ? 's' : ''} encontrada${rows.length !== 1 ? 's' : ''}`}</div>
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
                style={{ border:`2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer', background: dragging ? 'var(--accent-glow, var(--surface2))' : 'var(--surface2)', transition:'all 0.15s' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📄</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Solte o arquivo aqui ou clique para selecionar</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>CSV (separado por ; ou ,) — UTF-8</div>
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Colunas: <code style={{ fontSize:11, background:'var(--surface2)', padding:'1px 4px', borderRadius:3 }}>{IMPORT_COLS.join(', ')}</code></span>
                <button onClick={downloadTemplate} style={{ fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>⬇ Baixar template</button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1, padding:'10px 14px', borderRadius:8, background:'var(--green-bg)', color:'var(--green-text)', fontSize:12, fontWeight:600 }}>✓ {okRows.length} equipe{okRows.length !== 1 ? 's' : ''} válida{okRows.length !== 1 ? 's' : ''}</div>
                {errRows.length > 0 && <div style={{ flex:1, padding:'10px 14px', borderRadius:8, background:'var(--red-bg)', color:'var(--red-text)', fontSize:12, fontWeight:600 }}>✕ {errRows.length} com erro (serão ignoradas)</div>}
              </div>
              <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                      {['#','Nome','Líder','Status','Resultado'].map(h => (
                        <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border2)', background: errors[i] ? 'var(--red-bg)' : 'transparent' }}>
                        <td style={{ padding:'6px 10px', color:'var(--text-muted)' }}>{i+1}</td>
                        <td style={{ padding:'6px 10px', fontWeight:600 }}>{row.nome || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)' }}>{row.lider || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)' }}>{row.status || '—'}</td>
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
              Importar {okRows.length} equipe{okRows.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Formulário de edição ─────────────────────────────────────────────────────
const EMPTY = { nome: '', descricao: '', status: 'ativa', lider_id: '', membro_ids: [], meta_ids: [] }

export default function Equipes() {
  const [equipes, setEquipes]   = useLocalState(EQUIPES_STORAGE_KEY, [])
  const [usuarios]              = useLocalState('settings:perfis_v2', MOCK_PERFIS)
  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [busca, setBusca]       = useState('')
  const [importModal, setImportModal] = useState(false)

  const usuariosAtivos = usuarios.filter(u => u.status !== 'inativo')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function toggleMembro(id) {
    setForm(f => ({
      ...f,
      membro_ids: f.membro_ids.includes(id)
        ? f.membro_ids.filter(x => x !== id)
        : [...f.membro_ids, id],
    }))
  }

  const filtered = equipes.filter(e =>
    !busca || e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (e.descricao || '').toLowerCase().includes(busca.toLowerCase())
  )

  function abrirNovo() {
    setForm({ ...EMPTY })
    setEditando('novo')
  }

  function abrirEdicao(eq) {
    setForm({
      nome:       eq.nome,
      descricao:  eq.descricao || '',
      status:     eq.status || 'ativa',
      lider_id:   eq.lider_id || '',
      membro_ids: eq.membro_ids || [],
      meta_ids:   eq.meta_ids || [],
      _id:        eq.id,
    })
    setEditando(eq)
  }

  function handleSave() {
    if (!form.nome.trim()) return
    const record = {
      id:         editando === 'novo' ? uid() : form._id,
      nome:       form.nome.trim(),
      descricao:  form.descricao.trim(),
      status:     form.status,
      lider_id:   form.lider_id || null,
      membro_ids: form.membro_ids,
      meta_ids:   form.meta_ids,
    }
    if (editando === 'novo') {
      setEquipes(prev => [...prev, record])
    } else {
      setEquipes(prev => prev.map(e => e.id === record.id ? record : e))
    }
    setEditando(null)
  }

  function handleDelete(id) {
    setEquipes(prev => prev.filter(e => e.id !== id))
    setEditando(null)
  }

  function handleImport(rows) { setEquipes(prev => [...prev, ...rows]) }

  function exportCSV() {
    const header = IMPORT_COLS.join(';')
    const body   = filtered.map(e => {
      const liderNome = usuarios.find(u => u.id === e.lider_id)?.nome || e.lider || ''
      return IMPORT_COLS.map(col => toCSVValue(col === 'lider' ? liderNome : (e[col] ?? ''))).join(';')
    }).join('\n')
    downloadText(`${header}\n${body}`, 'equipes.csv', 'text/csv')
  }

  function exportExcel() {
    const header = IMPORT_COLS.join('\t')
    const body   = filtered.map(e => {
      const liderNome = usuarios.find(u => u.id === e.lider_id)?.nome || e.lider || ''
      return IMPORT_COLS.map(col => col === 'lider' ? liderNome : String(e[col] ?? '')).join('\t')
    }).join('\n')
    downloadText(`${header}\n${body}`, 'equipes.xls', 'application/vnd.ms-excel')
  }

  const liderNome = id => usuarios.find(u => u.id === id)?.nome || '—'

  if (editando) {
    const membros = usuariosAtivos.filter(u => form.membro_ids.includes(u.id))
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Equipes', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Nova Equipe' : `Editar: ${editando.nome}`}
        subtitle={editando === 'novo' ? 'Agrupe usuários para métricas e metas' : `${(form.membro_ids || []).length} membro${(form.membro_ids || []).length !== 1 ? 's' : ''}`}
        onSave={handleSave}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(form._id) : undefined}
      >
        {/* Identificação */}
        <FPESection title="Identificação">
          <FPEGrid>
            <FPEField label="Nome da equipe" required>
              <input className="fpe-field" value={form.nome} maxLength={60}
                placeholder="Ex: Equipe Comercial SP"
                onChange={e => set('nome', e.target.value)} />
            </FPEField>
            <FPEField label="Status">
              <select className="fpe-field" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_CFG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </FPEField>
          </FPEGrid>
          <FPEField label="Descrição">
            <textarea className="fpe-field" style={{ minHeight:64, resize:'vertical' }}
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Descreva o objetivo ou foco desta equipe…" />
          </FPEField>
        </FPESection>

        {/* Líder */}
        <FPESection title="Liderança">
          <FPEField label="Líder da equipe" style={{ gridColumn:'1/-1' }}>
            <select className="fpe-field" value={form.lider_id}
              onChange={e => set('lider_id', e.target.value)}>
              <option value="">— Sem líder definido —</option>
              {usuariosAtivos.map(u => (
                <option key={u.id} value={u.id}>{u.nome} ({u.papel})</option>
              ))}
            </select>
          </FPEField>
          {form.lider_id && !form.membro_ids.includes(form.lider_id) && (
            <div style={{ gridColumn:'1/-1', fontSize:11, color:'var(--text-muted)', background:'var(--surface2)', padding:'8px 12px', borderRadius:7 }}>
              O líder não está na lista de membros. Você pode adicioná-lo abaixo se desejar que ele também apareça como membro.
            </div>
          )}
        </FPESection>

        {/* Membros */}
        <FPESection
          title={`Membros${form.membro_ids.length ? ` (${form.membro_ids.length})` : ''}`}
          description="Selecione os usuários que fazem parte desta equipe."
          columns={1}
        >
          {usuariosAtivos.length === 0
            ? <div style={{ fontSize:13, color:'var(--text-muted)', fontStyle:'italic' }}>Nenhum usuário ativo cadastrado.</div>
            : <SearchableMultiSelect
                options={usuariosAtivos.map(u => ({ value: u.id, label: u.nome, sub: u.papel }))}
                value={form.membro_ids}
                onChange={ids => set('membro_ids', ids)}
                placeholder="Selecionar membros…"
              />
          }
        </FPESection>

        {/* Métricas e metas — informativo */}
        <FPESection title="Métricas e Metas" description="As metas configuradas em Settings → Metas e KPIs podem ser vinculadas a equipes. Após salvar esta equipe, acesse o cadastro de metas para associá-la.">
          <div style={{ gridColumn:'1/-1', display:'flex', gap:12, flexWrap:'wrap' }}>
            <div style={{ padding:'12px 16px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', flex:1, minWidth:200 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:6 }}>Membros</div>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--accent)', fontFamily:'var(--mono)' }}>{form.membro_ids.length}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>usuário{form.membro_ids.length !== 1 ? 's' : ''} na equipe</div>
            </div>
            <div style={{ padding:'12px 16px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', flex:1, minWidth:200 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:6 }}>Metas vinculadas</div>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{(form.meta_ids || []).length}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Configure em Metas e KPIs</div>
            </div>
          </div>
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
          existingNames={equipes.map(e => e.nome.toLowerCase())}
        />
      )}
      <SettingsLayout
        title="Equipes"
        description="Agrupe usuários em equipes para acompanhar métricas, metas e desempenho coletivo."
        columns={[
          { key: 'nome',      label: 'Equipe', render: (v, row) => (
            <div>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{v}</div>
              {row.descricao && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{row.descricao}</div>}
            </div>
          )},
          { key: 'status',    label: 'Status',  width:100, render: v => <StatusBadge status={v} /> },
          { key: 'lider_id',  label: 'Líder',   priority:2, render: v => <span style={{ fontSize:12, color:'var(--text-soft)' }}>{liderNome(v)}</span> },
          { key: 'membro_ids', label: 'Membros', width:90, align:'center', render: v => (
            <span style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>{(v || []).length}</span>
          )},
        ]}
        data={filtered}
        keyField="id"
        emptyLabel="Nenhuma equipe cadastrada ainda."
        onNew={abrirNovo}
        newLabel="+ Nova equipe"
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
