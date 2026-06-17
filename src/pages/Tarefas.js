import { useState, useMemo, useRef, useEffect } from 'react'
import { useTasks } from '../hooks/useTasks'
import { MOCK_EMPRESAS } from '../data/mockEmpresas'
import { useLocalState } from '../hooks/useLocalState'
import Button from '../components/Button'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormField, FormSection } from '../components/ui/SlideOver'
import { MOCK_USUARIOS } from '../data/mockUsuarios'
import { MOCK_CONTATOS } from '../data/mockContatos'

// Oportunidades inline (até existir mockOportunidades.js independente)
const MOCK_OPPS = [
  { id:1,  nome:'Expansão Canal SP' },
  { id:2,  nome:'Renovação Contrato 2025' },
  { id:3,  nome:'Nova unidade RS' },
  { id:4,  nome:'Upgrade Pro' },
  { id:5,  nome:'Contrato financeiro SP' },
  { id:6,  nome:'Piloto agro PR' },
  { id:7,  nome:'Parceria distribuição' },
  { id:8,  nome:'Demo Canal Sul' },
  { id:9,  nome:'Proposta distribuidora' },
  { id:10, nome:'Aprovação parceiro RJ' },
]

const MOCK_CONTRATOS = [
  { id:1, nome:'CTR-2024-001' },
  { id:2, nome:'CTR-2024-002' },
  { id:3, nome:'CTR-2025-001' },
]

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIPOS_TAREFA = ['ligação','email','reunião','visita','proposta','follow-up','outro']
const TIPO_ICONS   = { 'ligação':'📞', 'email':'✉', 'reunião':'🗓', 'visita':'🚗', 'proposta':'📄', 'follow-up':'🔁', 'outro':'☑' }

const STATUS_CFG = {
  pendente:    { label:'Pendente',    color:'#F59E0B', bg:'#FEF3C7', text:'#92400E', dot:'#F59E0B' },
  em_andamento:{ label:'Em andamento',color:'#3B82F6', bg:'#DBEAFE', text:'#1E3A5F', dot:'#3B82F6' },
  concluida:   { label:'Concluída',   color:'#10B981', bg:'#D1FAE5', text:'#065F46', dot:'#10B981' },
  cancelada:   { label:'Cancelada',   color:'#9CA3AF', bg:'#F3F4F6', text:'#6B7280', dot:'#9CA3AF' },
}
const STATUS_KANBAN = ['pendente','em_andamento','concluida','cancelada']

const PRIORIDADE_CFG = {
  baixa:   { label:'Baixa',   color:'#6B7280', bg:'#F3F4F6', text:'#374151' },
  media:   { label:'Média',   color:'#3B82F6', bg:'#DBEAFE', text:'#1E3A5F' },
  alta:    { label:'Alta',    color:'#F59E0B', bg:'#FEF3C7', text:'#92400E' },
  urgente: { label:'Urgente', color:'#EF4444', bg:'#FEE2E2', text:'#991B1B' },
}

const ENTIDADE_TIPOS = [
  { value:'oportunidade', label:'Oportunidade' },
  { value:'empresa',      label:'Empresa'      },
  { value:'contrato',     label:'Contrato'     },
]

const EMPTY_FORM = {
  titulo:'', descricao:'', tipo:'ligação', status:'pendente', prioridade:'media',
  prazo:'',
  responsavel_id: null, responsavel_nome: '',
  contato_id: null, contato_nome: '', contato_empresa: '',
  entidade_tipo: null, entidade_id: null, entidade_nome: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtData(d) {
  if (!d) return '—'
  const [y,m,dd] = d.split('-')
  return `${dd}/${m}/${y.slice(2)}`
}
function diasRestantes(prazo) {
  if (!prazo) return null
  return Math.ceil((new Date(prazo) - new Date()) / 86400000)
}
function novoId() { return Date.now() + Math.random() }

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pendente
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20,
      background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function PrioridadeBadge({ prioridade }) {
  const cfg = PRIORIDADE_CFG[prioridade] || PRIORIDADE_CFG.media
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:3,
      background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.color}44`, fontFamily:'var(--mono)' }}>
      {cfg.label.toUpperCase()}
    </span>
  )
}

function EntidadeTag({ tipo, nome }) {
  if (!tipo || !nome) return <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>
  const icons = { oportunidade:'▷', empresa:'◈', contrato:'◉', contato:'◎' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11,
      color:'var(--accent)', fontFamily:'var(--mono)', background:'var(--blue-bg)',
      padding:'2px 7px', borderRadius:4, border:'1px solid rgba(30,58,95,0.12)', whiteSpace:'nowrap', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis' }}>
      <span style={{ fontSize:10 }}>{icons[tipo]||'○'}</span>
      {nome}
    </span>
  )
}

// ─── Autocomplete genérico de entidade ───────────────────────────────────────
function EntidadeSearch({ entidadeTipo, value, label, onChange }) {
  const [query, setQuery] = useState(label||'')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  useEffect(() => { setQuery(label||'') }, [label])
  useEffect(() => {
    function h(e) { if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return ()=>document.removeEventListener('mousedown', h)
  }, [])

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    if (entidadeTipo==='oportunidade') return MOCK_OPPS.filter(o=>o.nome.toLowerCase().includes(q)).slice(0,8)
    if (entidadeTipo==='empresa')      return MOCK_EMPRESAS.filter(e=>(e.fantasia||e.razao).toLowerCase().includes(q)).slice(0,8).map(e=>({ id:e.id, nome:e.fantasia||e.razao }))
    if (entidadeTipo==='contrato')     return MOCK_CONTRATOS.filter(c=>c.nome.toLowerCase().includes(q)).slice(0,8)
    return []
  }, [query, entidadeTipo])

  if (!entidadeTipo) return null

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input className="so-field" style={{ paddingRight: value ? 28 : undefined }}
          placeholder={`Buscar ${entidadeTipo}…`} value={query}
          onChange={e=>{ setQuery(e.target.value); setOpen(true); if(!e.target.value) onChange(null,'') }}
          onFocus={()=>setOpen(true)} />
        {value && (
          <button type="button" onClick={()=>{ onChange(null,''); setQuery('') }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, padding:0 }}>✕</button>
        )}
      </div>
      {open && opts.length>0 && (
        <div style={ar.dropdown}>
          {opts.map(o=>(
            <button type="button" key={o.id} style={ar.option}
              onMouseDown={()=>{ onChange(o.id, o.nome); setQuery(o.nome); setOpen(false) }}>
              <span style={ar.optAvatar}>{o.nome.slice(0,2).toUpperCase()}</span>
              <span style={{ fontSize:13, color:'var(--text)' }}>{o.nome}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.length>0 && opts.length===0 && (
        <div style={{ ...ar.dropdown, padding:'12px 14px', color:'var(--text-muted)', fontSize:12 }}>Nenhum resultado</div>
      )}
    </div>
  )
}

const ar = {
  dropdown: { position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)', zIndex:100, overflow:'hidden', maxHeight:240, overflowY:'auto' },
  option:   { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left' },
  optAvatar:{ width:26, height:26, borderRadius:6, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0 },
}

// ─── Autocomplete: Contato externo ────────────────────────────────────────────
function ContatoSearch({ value, label, onChange }) {
  const [query, setQuery] = useState(label || '')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  useEffect(() => { setQuery(label || '') }, [label])
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    return MOCK_CONTATOS
      .filter(c => c.nome.toLowerCase().includes(q) || c.empresa_nome.toLowerCase().includes(q) || (c.cargo||'').toLowerCase().includes(q))
      .slice(0, 8)
  }, [query])

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input className="so-field" style={{ paddingRight: value ? 28 : undefined }}
          placeholder="Buscar por nome, empresa ou cargo…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null, '', '') }}
          onFocus={() => setOpen(true)} />
        {value && (
          <button type="button" onClick={() => { onChange(null, '', ''); setQuery('') }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, padding:0 }}>✕</button>
        )}
      </div>
      {open && opts.length > 0 && (
        <div style={ar.dropdown}>
          {opts.map(c => (
            <button type="button" key={c.id} style={ar.option}
              onMouseDown={() => { onChange(c.id, c.nome, c.empresa_nome); setQuery(c.nome); setOpen(false) }}>
              <span style={ar.optAvatar}>{c.nome.slice(0,2).toUpperCase()}</span>
              <div style={{ textAlign:'left', lineHeight:1.3 }}>
                <div style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>{c.nome}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.cargo}{c.cargo && c.empresa_nome ? ' · ' : ''}{c.empresa_nome}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.length > 0 && opts.length === 0 && (
        <div style={{ ...ar.dropdown, padding:'12px 14px', color:'var(--text-muted)', fontSize:12 }}>Nenhum contato encontrado</div>
      )}
    </div>
  )
}

// ─── Formulário de Tarefa (usado dentro do SlideOver) ────────────────────────
function TarefaForm({ form, onChange }) {
  function set(k, v) { onChange({ ...form, [k]: v }) }

  return (
    <>
      <FormSection label="Identificação">
        <FormField label="Título" required span={2}>
          <input className="so-field" value={form.titulo}
            onChange={e => set('titulo', e.target.value)}
            placeholder="Título da tarefa…" />
        </FormField>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="so-label">Tipo</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
            {TIPOS_TAREFA.map(t => (
              <button key={t} type="button" onClick={() => set('tipo', t)}
                style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                  border: `1.5px solid ${form.tipo === t ? 'var(--accent)' : 'var(--border)'}`,
                  background: form.tipo === t ? 'var(--accent-glow)' : 'transparent',
                  color: form.tipo === t ? 'var(--accent)' : 'var(--text-muted)',
                  cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.12s' }}>
                {TIPO_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <FormField label="Descrição" span={2}>
          <textarea className="so-field" rows={3} value={form.descricao || ''}
            onChange={e => set('descricao', e.target.value)}
            placeholder="Detalhes, contexto ou notas sobre esta tarefa…" />
        </FormField>
      </FormSection>

      <FormSection label="Execução">
        <FormField label="Status">
          <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_CFG).map(([k, cfg]) => (
              <option key={k} value={k}>{cfg.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Prioridade">
          <select className="so-field" value={form.prioridade} onChange={e => set('prioridade', e.target.value)}>
            {Object.entries(PRIORIDADE_CFG).map(([k, cfg]) => (
              <option key={k} value={k}>{cfg.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Prazo">
          <input className="so-field" type="date" value={form.prazo || ''} onChange={e => set('prazo', e.target.value)} />
        </FormField>
      </FormSection>

      <FormSection label="Participantes">
        <FormField label="Responsável interno" span={2}>
          <select className="so-field"
            value={form.responsavel_id || ''}
            onChange={e => {
              const u = MOCK_USUARIOS.find(u => u.id === e.target.value) || null
              onChange({ ...form, responsavel_id: u?.id || null, responsavel_nome: u?.nome || '' })
            }}>
            <option value="">— Nenhum —</option>
            <optgroup label="Internos (ISV)">
              {MOCK_USUARIOS.filter(u => u.tipo === 'interno').map(u => (
                <option key={u.id} value={u.id}>{u.nome} — {u.cargo}</option>
              ))}
            </optgroup>
            <optgroup label="Parceiros / Franquias">
              {MOCK_USUARIOS.filter(u => u.tipo === 'externo').map(u => (
                <option key={u.id} value={u.id}>{u.nome} — {u.cargo}</option>
              ))}
            </optgroup>
          </select>
        </FormField>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="so-label">Contato externo</label>
          <ContatoSearch
            value={form.contato_id}
            label={form.contato_nome}
            onChange={(id, nome, empresa) => onChange({ ...form, contato_id: id, contato_nome: nome, contato_empresa: empresa || '' })}
          />
          {form.contato_id && form.contato_empresa && (
            <span className="so-hint">{form.contato_empresa}</span>
          )}
        </div>
      </FormSection>

      <FormSection label="Vínculo">
        <FormField label="Tipo de vínculo" span={2}>
          <select className="so-field" value={form.entidade_tipo || ''}
            onChange={e => onChange({ ...form, entidade_tipo: e.target.value || null, entidade_id: null, entidade_nome: '' })}>
            <option value="">Sem vínculo</option>
            {ENTIDADE_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </FormField>

        {form.entidade_tipo && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="so-label">
              {ENTIDADE_TIPOS.find(t => t.value === form.entidade_tipo)?.label || 'Entidade'}
            </label>
            <EntidadeSearch
              entidadeTipo={form.entidade_tipo}
              value={form.entidade_id}
              label={form.entidade_nome}
              onChange={(id, nome) => onChange({ ...form, entidade_id: id, entidade_nome: nome })}
            />
          </div>
        )}
      </FormSection>
    </>
  )
}

// ─── Export helper ────────────────────────────────────────────────────────────
function buildExportCsv(rows) {
  const headers = ['titulo','tipo','status','prioridade','prazo','responsavel','entidade_tipo','entidade_nome','criado']
  const fileName = `tarefas_${new Date().toISOString().slice(0,10)}.csv`
  const csv = [headers.join(';'), ...rows.map(t=>headers.map(h=>t[h]??'').join(';'))].join('\n')
  const blob = new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'})
  const url  = URL.createObjectURL(blob); const a=document.createElement('a')
  a.href=url; a.download=fileName; a.click(); URL.revokeObjectURL(url)
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
const IMPORT_COLS = ['titulo','tipo','status','prioridade','prazo','responsavel_nome','contato_nome','contato_empresa','entidade_tipo','entidade_nome']

function parseCSV(text) {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n')
  if (lines.length<2) return { headers:[], rows:[] }
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h=>h.trim().replace(/^"|"$/g,''))
  const rows = lines.slice(1).map(line=>{
    const cells=[]; let cur='', inQ=false
    for(const ch of line){ if(ch==='"'){inQ=!inQ} else if(ch===sep&&!inQ){cells.push(cur.trim());cur=''}else cur+=ch }
    cells.push(cur.trim())
    return Object.fromEntries(headers.map((h,i)=>[h, cells[i]??'']))
  })
  return { headers, rows }
}

function validateImportRow(row) {
  const errors = []
  if (!row.titulo?.trim()) errors.push('Título é obrigatório')
  if (row.tipo && !TIPOS_TAREFA.includes(row.tipo)) errors.push(`Tipo inválido. Use: ${TIPOS_TAREFA.join(', ')}`)
  if (row.status && !Object.keys(STATUS_CFG).includes(row.status)) errors.push(`Status inválido. Use: ${Object.keys(STATUS_CFG).join(', ')}`)
  if (row.prioridade && !Object.keys(PRIORIDADE_CFG).includes(row.prioridade)) errors.push(`Prioridade inválida`)
  if (row.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(row.prazo)) errors.push('Prazo inválido (use AAAA-MM-DD)')
  return errors
}

function ImportModal({ onClose, onImport }) {
  const [step, setStep]     = useState('upload')
  const [parsed, setParsed] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef             = useRef(null)

  function handleDownloadTemplate() {
    const example = ['Ligar para cliente','ligação','pendente','alta','2026-07-01','João Silva','oportunidade','Expansão Canal SP']
    const csv = [IMPORT_COLS.join(';'), example.join(';')].join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download='template_tarefas.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function processFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows } = parseCSV(e.target.result)
      const rowResults = rows.map((row,i)=>({ row, errors:validateImportRow(row), ok:validateImportRow(row).length===0, line:i+2 }))
      setParsed({ fileName:file.name, rowResults }); setStep('preview')
    }
    reader.readAsText(file,'UTF-8')
  }

  function handleConfirm() {
    const okRows = parsed.rowResults.filter(r=>r.ok).map(r=>({
      ...EMPTY_FORM, ...r.row,
      id:novoId(), criado:new Date().toISOString().slice(0,10),
      tipo: r.row.tipo||'outro', status:r.row.status||'pendente', prioridade:r.row.prioridade||'media',
      entidade_tipo: r.row.entidade_tipo||null, entidade_nome:r.row.entidade_nome||'',
    }))
    onImport(okRows, { id:Date.now(), fileName:parsed.fileName, date:new Date().toLocaleString('pt-BR'),
      total:parsed.rowResults.length, imported:okRows.length,
      errors:parsed.rowResults.filter(r=>!r.ok).length, scope:'importados' })
    onClose()
  }

  const okCount  = parsed?.rowResults.filter(r=>r.ok).length??0
  const errCount = parsed?.rowResults.filter(r=>!r.ok).length??0

  return (
    <div style={m.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ ...m.modal, maxWidth:680 }}>
        <div style={m.header}>
          <div><div style={m.title}>Importar tarefas</div><div style={m.subtitle}>CSV com separador ponto-e-vírgula (;) — UTF-8</div></div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        {step==='upload' && (
          <div style={{ padding:24 }}>
            <div style={imp.templateBox}>
              <div><div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Template CSV</div><div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{IMPORT_COLS.length} colunas</div></div>
              <button style={imp.templateBtn} onClick={handleDownloadTemplate}>↓ Baixar template</button>
            </div>
            <div style={{ ...imp.dropzone, ...(dragging?imp.dropzoneActive:{}) }}
              onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);processFile(e.dataTransfer.files[0])}}
              onClick={()=>fileRef.current?.click()}>
              <span style={{ fontSize:28 }}>📂</span>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>Arraste o arquivo ou clique para selecionar</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Apenas arquivos .csv</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={e=>processFile(e.target.files[0])} />
            </div>
            <div style={imp.colsBox}>
              <div style={imp.colsLabel}>Colunas esperadas</div>
              <div style={imp.colsList}>{IMPORT_COLS.map(c=><span key={c} style={imp.colTag}>{c}</span>)}</div>
            </div>
          </div>
        )}
        {step==='preview' && parsed && (
          <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
            <div style={imp.summary}>
              <div style={imp.summaryItem}><span style={imp.summaryVal}>{parsed.rowResults.length}</span><span style={imp.summaryLbl}>linhas</span></div>
              <div style={imp.summaryItem}><span style={{ ...imp.summaryVal, color:'var(--green)' }}>{okCount}</span><span style={imp.summaryLbl}>prontas</span></div>
              <div style={imp.summaryItem}><span style={{ ...imp.summaryVal, color:errCount>0?'var(--red)':'var(--text-muted)' }}>{errCount}</span><span style={imp.summaryLbl}>com erro</span></div>
              <div style={{ marginLeft:'auto', fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{parsed.fileName}</div>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'0 24px' }}>
              <table style={{ ...p.table, marginBottom:0 }}>
                <thead><tr>{['Linha','Título','Tipo','Status','Prazo','Resultado'].map(h=><th key={h} style={p.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {parsed.rowResults.map(({row,errors,ok,line})=>(
                    <tr key={line} style={{ ...p.tr, background:ok?undefined:'rgba(220,38,38,0.03)' }}>
                      <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)', width:50 }}>{line}</td>
                      <td style={{ ...p.td, fontSize:12 }}>{row.titulo||<span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ ...p.td, fontSize:11 }}>{row.tipo||'—'}</td>
                      <td style={{ ...p.td, fontSize:11 }}>{row.status||'—'}</td>
                      <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:11 }}>{row.prazo||'—'}</td>
                      <td style={p.td}>{ok ? <span style={{ color:'var(--green)', fontSize:11, fontWeight:600 }}>✓ OK</span> : <div>{errors.map((e,i)=><div key={i} style={{ color:'var(--red)', fontSize:11 }}>✕ {e}</div>)}</div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={m.footer}>
              <Button variant="secondary" onClick={()=>setStep('upload')}>← Voltar</Button>
              <div style={{ flex:1 }} />
              {errCount>0&&okCount>0&&<span style={{ fontSize:12, color:'var(--yellow-text)' }}>{errCount} linha{errCount>1?'s':''} serão ignoradas</span>}
              <Button disabled={okCount===0} onClick={handleConfirm}>Importar {okCount} tarefa{okCount!==1?'s':''}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const imp = {
  templateBox:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', marginBottom:16 },
  templateBtn:   { padding:'7px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  dropzone:      { border:'2px dashed var(--border)', borderRadius:10, padding:'36px 24px', textAlign:'center', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginBottom:16, transition:'all 0.15s', background:'var(--surface2)' },
  dropzoneActive:{ borderColor:'var(--accent)', background:'var(--accent-glow)' },
  colsBox:       { background:'var(--surface2)', borderRadius:8, padding:'12px 14px', border:'1px solid var(--border)' },
  colsLabel:     { fontSize:11, fontWeight:600, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 },
  colsList:      { display:'flex', flexWrap:'wrap', gap:5 },
  colTag:        { padding:'2px 8px', background:'var(--surface3)', border:'1px solid var(--border)', borderRadius:4, fontSize:11, fontFamily:'var(--mono)', color:'var(--text-soft)' },
  summary:       { display:'flex', alignItems:'center', gap:20, padding:'12px 24px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' },
  summaryItem:   { display:'flex', flexDirection:'column', alignItems:'center', gap:2 },
  summaryVal:    { fontSize:22, fontWeight:700, fontFamily:'var(--mono)', lineHeight:1 },
  summaryLbl:    { fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' },
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, accent, red }) {
  return (
    <div style={{ ...p.kpi, ...(accent?{ borderTopColor:'var(--accent)' }:{}), ...(red?{ borderTopColor:'var(--red)' }:{}) }}>
      <span style={p.kpiVal}>{value}</span>
      <span style={p.kpiLbl}>{label}</span>
    </div>
  )
}

// ─── Kanban card ──────────────────────────────────────────────────────────────
function TarefaCard({ tarefa, onClick }) {
  const dias     = diasRestantes(tarefa.prazo)
  const atrasado = tarefa.status!=='concluida'&&tarefa.status!=='cancelada'&&dias!==null&&dias<0
  const urgente  = tarefa.status!=='concluida'&&tarefa.status!=='cancelada'&&dias!==null&&dias>=0&&dias<=2
  const cfg      = STATUS_CFG[tarefa.status]

  return (
    <div style={{ ...k.card, opacity:tarefa.status==='concluida'||tarefa.status==='cancelada'?0.7:1 }} onClick={onClick}>
      <div style={{ height:3, background:cfg.color, borderRadius:'6px 6px 0 0', margin:'-12px -12px 10px' }} />
      <div style={{ display:'flex', alignItems:'flex-start', gap:7, marginBottom:6 }}>
        <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{TIPO_ICONS[tarefa.tipo]||'☑'}</span>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', lineHeight:1.3 }}>{tarefa.titulo}</div>
      </div>
      {tarefa.entidade_nome && (
        <div style={{ marginBottom:7 }}>
          <EntidadeTag tipo={tarefa.entidade_tipo} nome={tarefa.entidade_nome} />
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        <PrioridadeBadge prioridade={tarefa.prioridade} />
        {tarefa.prazo && (
          <span style={{ fontSize:10, fontFamily:'var(--mono)', fontWeight:600, whiteSpace:'nowrap',
            color:atrasado?'var(--red)':urgente?'#D97706':'var(--text-muted)' }}>
            {atrasado?'⚠ ':urgente?'⏰ ':''}{fmtData(tarefa.prazo)}
          </span>
        )}
      </div>
      {(tarefa.responsavel_nome || tarefa.responsavel || tarefa.contato_nome) && (
        <div style={{ marginTop:7, paddingTop:7, borderTop:'1px solid var(--border2)', display:'flex', flexDirection:'column', gap:2 }}>
          {(tarefa.responsavel_nome || tarefa.responsavel) && (
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>👤 {tarefa.responsavel_nome || tarefa.responsavel}</span>
          )}
          {tarefa.contato_nome && (
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>📋 {tarefa.contato_nome}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Kanban View ─────────────────────────────────────────────────────────────
function KanbanView({ tarefas, onEdit, onAddTarefa, onMoveStatus }) {
  return (
    <div style={{ overflowX:'auto', overflowY:'hidden', flex:1, paddingBottom:16 }}>
      <div style={{ display:'flex', gap:12, minWidth:'max-content', height:'calc(100vh - 360px)' }}>
        {STATUS_KANBAN.map(status=>{
          const cfg    = STATUS_CFG[status]
          const colOpps = tarefas.filter(t=>t.status===status)
          return (
            <div key={status} style={{ ...k.coluna, minHeight:200 }}>
              <div style={{ padding:'10px 12px 8px', borderBottom:`2px solid ${cfg.color}`, background:'var(--surface)', borderRadius:'10px 10px 0 0', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:cfg.color, fontFamily:'var(--mono)' }}>{cfg.label}</span>
                  <span style={{ fontSize:10, fontWeight:700, fontFamily:'var(--mono)', background:cfg.bg, color:cfg.text, padding:'1px 7px', borderRadius:10, flexShrink:0 }}>{colOpps.length}</span>
                </div>
              </div>
              <div style={k.cards}>
                {colOpps.map(t=><TarefaCard key={t.id} tarefa={t} onClick={()=>onEdit(t)} />)}
                {colOpps.length===0 && <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:12, opacity:0.5 }}>Vazio</div>}
              </div>
              <button style={k.addBtn} onClick={()=>onAddTarefa(status)}>+ Adicionar</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const k = {
  coluna: { width:240, flexShrink:0, background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)', display:'flex', flexDirection:'column' },
  cards:  { flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:8 },
  card:   { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:12, cursor:'pointer', transition:'box-shadow 0.15s' },
  addBtn: { margin:8, padding:'6px 0', borderRadius:6, border:'1px dashed var(--border)', background:'none', fontSize:12, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)', flexShrink:0 },
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Tarefas() {
  const { tarefas, save: saveTarefa, remove: deleteTarefa, bulkSetStatus: bulkTarefaStatus } = useTasks()

  // ── SlideOver state ───────────────────────────────────────────────────────
  const [editItem, setEditItem]   = useState(null)   // tarefa obj | { _new:true, status? } | null
  const [form, setForm]           = useState(null)

  function openNew(status) {
    setForm({ ...EMPTY_FORM, ...(status ? { status } : {}) })
    setEditItem({ _new: true })
  }
  function openEdit(tarefa) {
    setForm({ ...tarefa })
    setEditItem(tarefa)
  }
  function closeSlideOver() { setEditItem(null); setForm(null) }

  function handleSave() {
    if (!form.titulo.trim()) return
    const isNew = !!editItem?._new
    saveTarefa(isNew
      ? { ...form, id: novoId(), criado: new Date().toISOString().slice(0, 10) }
      : { ...form })
    closeSlideOver()
  }

  function handleDelete() {
    deleteTarefa(editItem.id || form.id)
    closeSlideOver()
  }

  // ── outros ────────────────────────────────────────────────────────────────
  const [importModal, setImportModal] = useState(false)
  const [kanban, setKanban]       = useLocalState('tarefas:kanban', false)
  const [search, setSearch]       = useLocalState('tarefas:search', '')
  const [filterStatus, setFilterStatus]         = useLocalState('tarefas:filterStatus2', [])
  const [filterTipo, setFilterTipo]             = useLocalState('tarefas:filterTipo2', [])
  const [filterPrioridade, setFilterPrioridade] = useLocalState('tarefas:filterPrioridade2', [])
  const [filterEntidade, setFilterEntidade]     = useLocalState('tarefas:filterEntidade2', [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tarefas.filter(t => {
      if (filterStatus.length     && !filterStatus.includes(t.status))          return false
      if (filterTipo.length       && !filterTipo.includes(t.tipo))              return false
      if (filterPrioridade.length && !filterPrioridade.includes(t.prioridade))  return false
      if (filterEntidade.length   && !filterEntidade.includes(t.entidade_tipo)) return false
      if (q && !(t.titulo.toLowerCase().includes(q) || (t.entidade_nome||'').toLowerCase().includes(q) || (t.responsavel||'').toLowerCase().includes(q))) return false
      return true
    })
  }, [tarefas, search, filterStatus, filterTipo, filterPrioridade, filterEntidade])

  const hoje       = new Date().toISOString().slice(0, 10)
  const pendentes  = tarefas.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length
  const concluidas = tarefas.filter(t => t.status === 'concluida').length
  const atrasadas  = tarefas.filter(t => t.status !== 'concluida' && t.status !== 'cancelada' && t.prazo && t.prazo < hoje).length

  // ── BrowseLayout config ───────────────────────────────────────────────────
  const columns = [
    {
      key: 'titulo', label: 'Tarefa',
      render: (v, row) => (
        <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
          <span style={{ fontSize:16, marginTop:1, flexShrink:0 }}>{TIPO_ICONS[row.tipo]||'☑'}</span>
          <div>
            <div style={{ fontWeight:600, color:'var(--text)', fontSize:13, textDecoration:row.status==='concluida'?'line-through':undefined }}>{v}</div>
            {row.descricao && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:240 }}>{row.descricao}</div>}
          </div>
        </div>
      ),
    },
    { key: 'entidade_nome', label: 'Vínculo', render: (v, row) => <EntidadeTag tipo={row.entidade_tipo} nome={v} /> },
    { key: 'prioridade', label: 'Prioridade', width: 100, render: v => <PrioridadeBadge prioridade={v} /> },
    { key: 'status', label: 'Status', width: 140, render: v => <StatusBadge status={v} /> },
    { key: 'prazo', label: 'Prazo', width: 110, render: (v, row) => {
      const dias = diasRestantes(v)
      const atrasado = row.status!=='concluida'&&row.status!=='cancelada'&&dias!==null&&dias<0
      const urgente  = row.status!=='concluida'&&row.status!=='cancelada'&&dias!==null&&dias>=0&&dias<=2
      return <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:(atrasado||urgente)?700:400, color:atrasado?'var(--red)':urgente?'#D97706':'var(--text-soft)' }}>
        {v ? (atrasado?'⚠ ':urgente?'⏰ ':'')+fmtData(v) : '—'}
      </span>
    }},
    { key: 'responsavel_nome', label: 'Participantes', render: (v, row) => {
      const resp    = v || row.responsavel || ''
      const contato = row.contato_nome || ''
      if (!resp && !contato) return <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {resp    && <span style={{ fontSize:12, color:'var(--text-soft)' }}>👤 {resp}</span>}
          {contato && <span style={{ fontSize:11, color:'var(--text-muted)' }}>📋 {contato}</span>}
        </div>
      )
    }},
    { key: '_edit', label: '', sortable: false, width: 70, render: (_, row) => (
      <button style={{ padding:'4px 10px', border:'1px solid var(--border)', borderRadius:5, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}
        onClick={() => openEdit(row)}>Editar</button>
    )},
  ]

  const filterDefs = [
    { key: 'status',        label: 'Status',    options: Object.entries(STATUS_CFG).map(([k,cfg]) => ({ value:k, label:cfg.label })) },
    { key: 'tipo',          label: 'Tipo',       options: TIPOS_TAREFA.map(t => ({ value:t, label:`${TIPO_ICONS[t]} ${t.charAt(0).toUpperCase()+t.slice(1)}` })) },
    { key: 'prioridade',    label: 'Prioridade', options: Object.entries(PRIORIDADE_CFG).map(([k,cfg]) => ({ value:k, label:cfg.label })) },
    { key: 'entidade_tipo', label: 'Vínculo',    options: ENTIDADE_TIPOS.map(t => ({ value:t.value, label:t.label })) },
  ]

  const activeFilters = { status: filterStatus, tipo: filterTipo, prioridade: filterPrioridade, entidade_tipo: filterEntidade }

  function handleFilterChange(next) {
    setFilterStatus(next.status || [])
    setFilterTipo(next.tipo || [])
    setFilterPrioridade(next.prioridade || [])
    setFilterEntidade(next.entidade_tipo || [])
  }

  const bulkActions = [
    ...Object.entries(STATUS_CFG).map(([k, cfg]) => ({
      label: `→ ${cfg.label}`,
      onClick: ids => bulkTarefaStatus(ids, k),
    })),
    { label: 'Excluir', variant: 'danger', onClick: ids => {
      if (window.confirm(`Excluir ${ids.length} tarefa(s)?`)) ids.forEach(id => deleteTarefa(id))
    }},
  ]

  const kpisNode = (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, paddingTop:4 }}>
      <KpiCard label="Total de tarefas" value={tarefas.length} />
      <KpiCard label="Abertas"          value={pendentes} accent />
      <KpiCard label="Concluídas"       value={concluidas} />
      <KpiCard label="Atrasadas"        value={atrasadas} red />
    </div>
  )

  const kanbanToggle = (
    <button title="Visão Kanban" onClick={() => setKanban(true)}
      style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32,
        borderRadius:'var(--radius-md)', border:'1px solid var(--border)', background:'var(--surface)',
        cursor:'pointer', color:'var(--text-soft)', fontSize:15 }}>
      ⊞
    </button>
  )

  // ── SlideOver compartilhado (list + kanban) ───────────────────────────────
  const isNew = !!editItem?._new
  const slideOver = (
    <SlideOver
      open={!!editItem}
      onClose={closeSlideOver}
      onSave={handleSave}
      title={isNew ? 'Nova tarefa' : (form?.titulo || 'Editar tarefa')}
      subtitle={isNew ? 'Preencha os dados da tarefa' : `${TIPO_ICONS[form?.tipo] || '☑'} ${STATUS_CFG[form?.status]?.label || ''}`}
      saveLabel={isNew ? 'Criar tarefa' : 'Salvar alterações'}
      columns={2}
      extra={!isNew && (
        <button type="button" onClick={handleDelete}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', border:'1px solid var(--red)',
            borderRadius:7, background:'none', color:'var(--red)', fontSize:13, fontWeight:600,
            cursor:'pointer', fontFamily:'var(--font)' }}>
          Excluir tarefa
        </button>
      )}
    >
      {form && <TarefaForm form={form} onChange={setForm} />}
    </SlideOver>
  )

  // ── Kanban view ───────────────────────────────────────────────────────────
  if (kanban) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', marginBottom:4 }}>
              <span>Geral</span><span style={{ margin:'0 4px', color:'var(--border)' }}>›</span><span>Tarefas</span><span style={{ margin:'0 4px', color:'var(--border)' }}>›</span><span>Kanban</span>
            </div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:'var(--text)', letterSpacing:'-0.3px' }}>Tarefas — Kanban</h1>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setKanban(false)}
              style={{ height:34, padding:'0 14px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-soft)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>
              ← Lista
            </button>
            <button onClick={() => openNew()}
              style={{ height:34, padding:'0 14px', border:'none', borderRadius:7, background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
              + Nova tarefa
            </button>
          </div>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:20 }}>
          <KanbanView tarefas={filtered} onEdit={openEdit} onAddTarefa={status => openNew(status)} />
        </div>
        {slideOver}
      </div>
    )
  }

  // ── List / card view via BrowseLayout ─────────────────────────────────────
  return (
    <>
      <BrowseLayout
        columns={columns}
        data={filtered}
        keyField="id"
        kpis={kpisNode}
        kpisLabel="Métricas"
        filters={filterDefs}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        search={search}
        onSearchChange={setSearch}
        bulkActions={bulkActions}
        renderCard={row => <TarefaCard tarefa={row} onClick={() => openEdit(row)} />}
        onNew={() => openNew()}
        newLabel="+ Nova tarefa"
        onImport={() => setImportModal(true)}
        onExportCsv={() => buildExportCsv(filtered)}
        secondaryActions={kanbanToggle}
        storageKey="tarefas"
      />
      {slideOver}
      {importModal && (
        <ImportModal onClose={() => setImportModal(false)} onImport={rows => rows.forEach(t => saveTarefa(t))} />
      )}
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const p = {
  kpi:    { background:'var(--surface)', borderRadius:10, padding:'16px 18px', display:'flex', flexDirection:'column', gap:4, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', borderTop:'3px solid var(--border)' },
  kpiVal: { fontSize:26, fontWeight:700, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1 },
  kpiLbl: { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  table:  { width:'100%', borderCollapse:'collapse' },
  th:     { padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', background:'var(--surface2)', borderBottom:'1px solid var(--border)' },
  td:     { padding:'11px 14px', fontSize:13, verticalAlign:'middle' },
}

const m = {
  overlay:          { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
  modal:            { background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:640, boxShadow:'0 20px 60px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', maxHeight:'90vh' },
  header:           { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border2)' },
  title:            { fontSize:16, fontWeight:700, color:'var(--text)', margin:0 },
  subtitle:         { fontSize:13, color:'var(--text-muted)', marginTop:3 },
  closeBtn:         { background:'none', border:'none', color:'var(--text-muted)', fontSize:16, cursor:'pointer', padding:4, lineHeight:1 },
  body:             { padding:'4px 24px 16px', overflowY:'auto', flex:1 },
  grid2:            { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  input:            { padding:'8px 12px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)', width:'100%', boxSizing:'border-box' },
  footer:           { display:'flex', alignItems:'center', gap:10, padding:'14px 24px', borderTop:'1px solid var(--border2)', flexShrink:0 },
  cancelBtn:        { padding:'8px 16px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-soft)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' },
  saveBtn:          { padding:'8px 18px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  deleteBtn:        { padding:'7px 14px', border:'1px solid rgba(220,38,38,0.3)', borderRadius:7, background:'none', color:'var(--red)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' },
  deleteConfirm:    { display:'flex', alignItems:'center', gap:8 },
  deleteConfirmText:{ fontSize:13, color:'var(--red)', fontWeight:600 },
  deleteConfirmYes: { padding:'6px 12px', background:'var(--red)', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  deleteConfirmNo:  { padding:'6px 12px', border:'1px solid var(--border)', borderRadius:6, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' },
}
