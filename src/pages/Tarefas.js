import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useTasks } from '../hooks/useTasks'
import { MOCK_EMPRESAS } from '../data/mockEmpresas'
import { useLocalState } from '../hooks/useLocalState'
import { MetaSection, MetaRow, InlineText, InlineTextarea, InlineSelect, InlineDate, DeleteZone } from '../components/NotionDrawer'
import Drawer from '../components/Drawer'
import Button from '../components/Button'

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
  prazo:'', responsavel:'',
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
        <input style={{ ...m.input, paddingRight: value?28:12 }}
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

// ─── Notion Drawer: Tarefa Detail ─────────────────────────────────────────────
function TarefaDetail({ item, onClose, onSave, onDelete }) {
  const isNew = !item?.id
  const [form, setForm] = useState(item || EMPTY_FORM)
  function patch(f, v) {
    const next = { ...form, [f]: v }
    setForm(next)
    if (!isNew) onSave({ ...next, id: item.id, criado: item.criado })
  }
  function handleCreate() {
    if (!form.titulo.trim()) return alert('Título é obrigatório')
    onSave({ ...form, id: novoId(), criado: new Date().toISOString().slice(0,10) })
    onClose()
  }

  const tipoCfg = STATUS_CFG[form.status] || STATUS_CFG.pendente
  const prioCfg = PRIORIDADE_CFG[form.prioridade] || PRIORIDADE_CFG.media

  const left = (
    <div style={{ padding:'32px 40px', display:'flex', flexDirection:'column', gap:16, flex:1 }}>
      {/* Tipo icon + título editável */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <span style={{ fontSize:28, flexShrink:0, lineHeight:1.1, paddingTop:4 }}>
          {TIPO_ICONS[form.tipo] || '☑'}
        </span>
        <div style={{ flex:1 }}>
          <textarea
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            onBlur={e => patch('titulo', e.target.value)}
            placeholder="Título da tarefa…"
            rows={1}
            style={{ width:'100%', boxSizing:'border-box', resize:'none', overflow:'hidden',
              border:'none', outline:'none', background:'transparent',
              fontSize:22, fontWeight:700, color:'var(--text)', lineHeight:1.3,
              fontFamily:'var(--font)', padding:0,
              borderBottom: '2px solid transparent',
              transition:'border-color 0.15s' }}
            onFocus={e => { e.target.style.borderBottomColor = 'var(--accent)' }}
            onBlurCapture={e => { e.target.style.borderBottomColor = 'transparent' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
          />
          <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
            marginTop:4, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ padding:'1px 7px', borderRadius:10, fontSize:10, fontWeight:700,
              background: tipoCfg.bg, color: tipoCfg.text }}>
              {tipoCfg.label}
            </span>
            <span>·</span>
            <span style={{ padding:'1px 7px', borderRadius:10, fontSize:10, fontWeight:700,
              background: prioCfg.bg, color: prioCfg.text }}>
              {prioCfg.label}
            </span>
            {form.criado && <><span>·</span><span>Criado {fmtData(form.criado)}</span></>}
          </div>
        </div>
      </div>

      {/* Tipo de tarefa pills */}
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
          textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Tipo</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {TIPOS_TAREFA.map(t => (
            <button key={t} onClick={() => patch('tipo', t)}
              style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                border:'1.5px solid',
                borderColor: form.tipo === t ? 'var(--accent)' : 'var(--border)',
                background: form.tipo === t ? 'var(--accent-glow)' : 'var(--surface2)',
                color: form.tipo === t ? 'var(--accent)' : 'var(--text-muted)',
                cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.12s' }}>
              {TIPO_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Descrição */}
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
          textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Descrição</div>
        <InlineTextarea value={form.descricao} onChange={v => patch('descricao', v)}
          placeholder="Adicione detalhes, contexto ou notas sobre esta tarefa…" minRows={4} />
      </div>

      {/* Vínculo */}
      {form.entidade_tipo && form.entidade_nome && (
        <div style={{ padding:'10px 14px', background:'var(--blue-bg)', borderRadius:8,
          border:'1px solid rgba(30,58,95,0.12)', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'var(--accent)', fontFamily:'var(--mono)', fontWeight:700 }}>
            {ENTIDADE_TIPOS.find(t => t.value === form.entidade_tipo)?.label}
          </span>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{form.entidade_nome}</span>
        </div>
      )}

      {/* Criar button for new items */}
      {isNew && (
        <button onClick={handleCreate}
          style={{ alignSelf:'flex-start', marginTop:8, padding:'9px 20px',
            background:'var(--accent)', color:'#fff', border:'none', borderRadius:8,
            fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
          Cadastrar tarefa
        </button>
      )}
    </div>
  )

  const statusOptions = Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label }))
  const tipoVinculo   = ENTIDADE_TIPOS.map(t => ({ value: t.value, label: t.label }))

  const right = (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <MetaSection label="Execução" />

      <MetaRow label="Status">
        <InlineSelect value={form.status} onChange={v => patch('status', v)} options={statusOptions} />
      </MetaRow>

      <MetaRow label="Prioridade">
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', paddingLeft:6 }}>
          {Object.entries(PRIORIDADE_CFG).map(([k, cfg]) => (
            <button key={k} onClick={() => patch('prioridade', k)}
              style={{ padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:700,
                border:'none', cursor:'pointer', transition:'all 0.12s',
                background: form.prioridade === k ? cfg.bg : 'var(--surface2)',
                color: form.prioridade === k ? cfg.text : 'var(--text-muted)' }}>
              {cfg.label}
            </button>
          ))}
        </div>
      </MetaRow>

      <MetaRow label="Prazo">
        <InlineDate value={form.prazo} onChange={v => patch('prazo', v)} placeholder="Definir prazo" />
      </MetaRow>

      <MetaRow label="Responsável">
        <InlineText value={form.responsavel} onChange={v => patch('responsavel', v)} placeholder="Atribuir…" />
      </MetaRow>

      <MetaSection label="Vínculo" />

      <MetaRow label="Tipo">
        <InlineSelect
          value={form.entidade_tipo || ''}
          onChange={v => { patch('entidade_tipo', v || null); setForm(f => ({ ...f, entidade_id: null, entidade_nome: '' })) }}
          options={tipoVinculo} placeholder="Sem vínculo" />
      </MetaRow>

      {form.entidade_tipo && (
        <MetaRow label={ENTIDADE_TIPOS.find(t => t.value === form.entidade_tipo)?.label || 'Entidade'}>
          <EntidadeSearch
            entidadeTipo={form.entidade_tipo}
            value={form.entidade_id}
            label={form.entidade_nome}
            onChange={(id, nome) => { patch('entidade_id', id); patch('entidade_nome', nome) }}
          />
        </MetaRow>
      )}

      {!isNew && (
        <DeleteZone label="Excluir tarefa" onDelete={() => { onDelete(item.id); onClose() }} />
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <div style={{ flex: '0 0 65%', overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
        {left}
      </div>
      <div style={{ flex: '0 0 35%', overflowY: 'auto', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
        {right}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--mono)', margin:'16px 0 8px', paddingTop:4 }}>{children}</div>
}
function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'var(--text-soft)' }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Export Tray ─────────────────────────────────────────────────────────────
const SCOPE_LABEL = { todos:'Todos os registros', filtrados:'Registros filtrados', selecionados:'Selecionados' }
function ExportTray({ logs, onClose, onClear }) {
  const ref = useRef(null)
  useEffect(()=>{
    function h(e){ if(ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h)
  },[onClose])
  return (
    <div ref={ref} style={et.tray}>
      <div style={et.trayHeader}>
        <span style={et.trayTitle}>Histórico de exportações</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {logs.length>0 && <button style={et.clearBtn} onClick={onClear}>Limpar</button>}
          <button style={et.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>
      {logs.length===0 ? (
        <div style={et.empty}><span style={{ fontSize:24 }}>📭</span><span style={{ fontSize:13, color:'var(--text-muted)' }}>Nenhuma exportação ainda</span></div>
      ) : (
        <div style={et.list}>
          {logs.map(log=>(
            <div key={log.id} style={et.item}>
              <div style={et.itemIconWrap}><span style={{ fontSize:14, color:'var(--green-text)' }}>✓</span></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={et.itemFile}>{log.fileName}</div>
                <div style={et.itemMeta}>
                  <span style={et.metaTag}>{SCOPE_LABEL[log.scope]||log.scope}</span>
                  <span style={et.metaDot}>·</span>
                  <span style={et.metaVal}>{log.total} registro{log.total!==1?'s':''}</span>
                  <span style={et.metaDot}>·</span>
                  <span style={{ ...et.metaVal, color:'var(--green-text)', fontWeight:600 }}>Concluído</span>
                </div>
                <div style={et.itemDate}>{log.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={et.trayFooter}>
        <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{logs.length} exportação{logs.length!==1?'ões':''} · sessão atual</span>
      </div>
    </div>
  )
}
const et = {
  tray:       { position:'absolute', top:'calc(100% + 8px)', right:0, width:320, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', zIndex:200, overflow:'hidden' },
  trayHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' },
  trayTitle:  { fontSize:13, fontWeight:700, color:'var(--text)' },
  clearBtn:   { fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', fontFamily:'var(--font)' },
  closeBtn:   { fontSize:13, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'28px 0' },
  list:       { maxHeight:280, overflowY:'auto' },
  item:       { display:'flex', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border2)' },
  itemIconWrap:{ width:26, height:26, borderRadius:7, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  itemFile:   { fontSize:12, fontWeight:600, color:'var(--text)', fontFamily:'var(--mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  itemMeta:   { display:'flex', alignItems:'center', gap:5, marginTop:2, flexWrap:'wrap' },
  metaTag:    { fontSize:10, fontFamily:'var(--mono)', color:'var(--text-muted)' },
  metaDot:    { fontSize:10, color:'var(--border)' },
  metaVal:    { fontSize:10, fontFamily:'var(--mono)', color:'var(--text-soft)' },
  itemDate:   { fontSize:10, color:'var(--text-muted)', marginTop:2, fontFamily:'var(--mono)' },
  trayFooter: { padding:'8px 14px', borderTop:'1px solid var(--border2)', background:'var(--surface2)' },
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
const IMPORT_COLS = ['titulo','tipo','status','prioridade','prazo','responsavel','entidade_tipo','entidade_nome']

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

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate, onChange, title }) {
  return (
    <label title={title} style={{ display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', width:18, height:18 }}>
      <input type="checkbox" checked={checked}
        ref={el=>{ if(el) el.indeterminate=!!indeterminate }}
        onChange={onChange}
        style={{ width:15, height:15, cursor:'pointer', accentColor:'var(--accent)' }} />
    </label>
  )
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

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({ tarefas, onEdit, selected, onToggleAll, onToggleOne, allSelected, someSelected }) {
  return (
    <div style={p.tableWrap}>
      <table style={p.table}>
        <thead>
          <tr>
            <th style={{ ...p.th, width:40, textAlign:'center' }}>
              <Checkbox checked={allSelected} indeterminate={someSelected} onChange={onToggleAll} title="Selecionar todos" />
            </th>
            {['Tarefa','Vínculo','Prioridade','Status','Prazo','Responsável',''].map(h=>(
              <th key={h} style={p.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tarefas.length===0 && (
            <tr><td colSpan={8} style={{ ...p.td, textAlign:'center', color:'var(--text-muted)', padding:40 }}>Nenhuma tarefa encontrada</td></tr>
          )}
          {tarefas.map(t=>{
            const isSel    = selected.has(t.id)
            const dias     = diasRestantes(t.prazo)
            const atrasado = t.status!=='concluida' && t.status!=='cancelada' && dias!==null && dias<0
            const urgente  = t.status!=='concluida' && t.status!=='cancelada' && dias!==null && dias>=0 && dias<=2
            const concluida = t.status==='concluida'
            return (
              <tr key={t.id} style={{ ...p.tr, ...(isSel?p.trSelected:{}), opacity:concluida?0.65:1 }}>
                <td style={{ ...p.td, textAlign:'center', width:40 }}>
                  <Checkbox checked={isSel} onChange={()=>onToggleOne(t.id)} />
                </td>
                <td style={p.td}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ fontSize:16, marginTop:1, flexShrink:0 }}>{TIPO_ICONS[t.tipo]||'☑'}</span>
                    <div>
                      <div style={{ fontWeight:600, color:'var(--text)', fontSize:13, textDecoration:concluida?'line-through':undefined }}>{t.titulo}</div>
                      {t.descricao && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:240 }}>{t.descricao}</div>}
                    </div>
                  </div>
                </td>
                <td style={p.td}><EntidadeTag tipo={t.entidade_tipo} nome={t.entidade_nome} /></td>
                <td style={p.td}><PrioridadeBadge prioridade={t.prioridade} /></td>
                <td style={p.td}><StatusBadge status={t.status} /></td>
                <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:12, fontWeight:(atrasado||urgente)?700:400,
                  color:atrasado?'var(--red)':urgente?'#D97706':'var(--text-soft)' }}>
                  {t.prazo ? (atrasado?'⚠ ':urgente?'⏰ ':'')+fmtData(t.prazo) : '—'}
                </td>
                <td style={{ ...p.td, fontSize:12, color:'var(--text-soft)' }}>{t.responsavel||'—'}</td>
                <td style={{ ...p.td, textAlign:'right' }}>
                  <button style={p.editBtn} onClick={()=>onEdit(t)}>Editar</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
      {tarefa.responsavel && (
        <div style={{ marginTop:7, paddingTop:7, borderTop:'1px solid var(--border2)', fontSize:11, color:'var(--text-muted)' }}>
          {tarefa.responsavel}
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

// ─── Menu ··· ─────────────────────────────────────────────────────────────────
function AcoesMenu({ onExport, onImport, onClose, anchorRef, selected, exportLogs, showTray, setShowTray }) {
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  const item = {
    display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px',
    background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
    color:'var(--text)', fontFamily:'var(--font)', textAlign:'left', borderRadius:7,
    transition:'background 0.12s',
  }
  return (
    <div ref={ref} style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:500,
      width:220, background:'var(--surface)', borderRadius:10,
      border:'1px solid var(--border)', boxShadow:'0 8px 28px rgba(0,0,0,0.13)', padding:6 }}>
      <button style={item}
        onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e=>e.currentTarget.style.background='none'}
        onClick={onImport}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 11V4M3 7l3-3 3 3M1 2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Importar dados
      </button>
      <button style={item}
        onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e=>e.currentTarget.style.background='none'}
        onClick={onExport}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {selected?.size > 0 ? `Exportar selecionados (${selected.size})` : 'Exportar dados'}
      </button>
      {exportLogs?.length > 0 && (
        <>
          <div style={{ height:1, background:'var(--border)', margin:'4px 0' }} />
          <button style={{ ...item, color:'var(--text-muted)', fontSize:12 }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}
            onClick={() => { setShowTray(true); onClose() }}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Ver exportações ({exportLogs.length})
          </button>
        </>
      )}
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Tarefas() {
  // ── estado persistido em localStorage ───────────────────────────────────
  const [view, setView]                 = useLocalState('tarefas:view', 'list')
  const [search, setSearch]             = useLocalState('tarefas:search', '')
  const [filterStatus, setFilterStatus] = useLocalState('tarefas:filterStatus', '')
  const [filterTipo, setFilterTipo]     = useLocalState('tarefas:filterTipo', '')
  const [filterPrioridade, setFilterPrioridade] = useLocalState('tarefas:filterPrioridade', '')
  const [filterEntidade, setFilterEntidade]     = useLocalState('tarefas:filterEntidade', '')
  const [sortBy, setSortBy]             = useLocalState('tarefas:sortBy', 'prazo')
  // ── estado efêmero (não persiste) ────────────────────────────────────────
  const { tarefas, save: saveTarefa, remove: deleteTarefa, bulkSetStatus: bulkTarefaStatus } = useTasks()
  const [modal, setModal]               = useState(null)
  const [importModal, setImportModal]   = useState(false)
  const [exportLogs, setExportLogs]     = useState([])
  const [showTray, setShowTray]         = useState(false)
  const [selected, setSelected]         = useState(new Set())
  const [acoesOpen, setAcoesOpen]       = useState(false)
  const [showMetrics, setShowMetrics]   = useLocalState('tarefas:showMetrics', true)
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useLocalState('tarefas:periodoIni', '')
  const [filtroPeriodoFim, setFiltroPeriodoFim]       = useLocalState('tarefas:periodoFim', '')
  const [filtrosOpen, setFiltrosOpen]   = useState(false)
  const filtrosRef                      = useRef(null)
  const trayRef                         = useRef(null)
  const acoesRef                        = useRef(null)

  // ── filtro + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(()=>{
    const q = search.toLowerCase()
    let list = tarefas.filter(t=>{
      if (filterStatus    && t.status       !== filterStatus)    return false
      if (filterTipo      && t.tipo         !== filterTipo)      return false
      if (filterPrioridade && t.prioridade  !== filterPrioridade) return false
      if (filterEntidade  && t.entidade_tipo !== filterEntidade) return false
      if (filtroPeriodoInicio && t.prazo && t.prazo < filtroPeriodoInicio) return false
      if (filtroPeriodoFim    && t.prazo && t.prazo > filtroPeriodoFim)    return false
      if (q && !(t.titulo.toLowerCase().includes(q) || (t.entidade_nome||'').toLowerCase().includes(q) || (t.responsavel||'').toLowerCase().includes(q))) return false
      return true
    })
    return [...list].sort((a,b)=>{
      if (sortBy==='titulo')    return a.titulo.localeCompare(b.titulo)
      if (sortBy==='prioridade'){
        const ord={urgente:0,alta:1,media:2,baixa:3}
        return (ord[a.prioridade]??9)-(ord[b.prioridade]??9)
      }
      if (sortBy==='criado')    return new Date(b.criado)-new Date(a.criado)
      // prazo: null prazo vai para o fim
      const pa=a.prazo||'9999', pb=b.prazo||'9999'
      return pa<pb?-1:pa>pb?1:0
    })
  },[tarefas, search, filterStatus, filterTipo, filterPrioridade, filterEntidade, filtroPeriodoInicio, filtroPeriodoFim, sortBy])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const hoje       = new Date().toISOString().slice(0,10)
  const pendentes  = tarefas.filter(t=>t.status==='pendente'||t.status==='em_andamento').length
  const concluidas = tarefas.filter(t=>t.status==='concluida').length
  const atrasadas  = tarefas.filter(t=>t.status!=='concluida'&&t.status!=='cancelada'&&t.prazo&&t.prazo<hoje).length

  // ── seleção ───────────────────────────────────────────────────────────────
  const allIds      = filtered.map(t=>t.id)
  const allSelected = allIds.length>0 && allIds.every(id=>selected.has(id))
  const someSelected= allIds.some(id=>selected.has(id)) && !allSelected
  function toggleAll() {
    if(allSelected) setSelected(prev=>{ const s=new Set(prev); allIds.forEach(id=>s.delete(id)); return s })
    else setSelected(prev=>new Set([...prev,...allIds]))
  }
  function toggleOne(id) { setSelected(prev=>{ const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s }) }
  function clearSelection() { setSelected(new Set()) }

  // ── bulk actions ──────────────────────────────────────────────────────────
  function applyBulk(action) {
    const ids=[...selected]
    if (action==='delete'){
      if(!window.confirm(`Excluir ${ids.length} tarefa(s)?`)) return
      ids.forEach(id => deleteTarefa(id)); clearSelection()
    } else {
      bulkTarefaStatus(ids, action); clearSelection()
    }
  }

  // ── export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const scope  = selected.size>0 ? 'selecionados' : (search||filterStatus||filterTipo||filterPrioridade) ? 'filtrados' : 'todos'
    const rows   = selected.size>0 ? tarefas.filter(t=>selected.has(t.id)) : filtered
    const headers= ['titulo','tipo','status','prioridade','prazo','responsavel','entidade_tipo','entidade_nome','criado']
    const fileName= `tarefas_${new Date().toISOString().slice(0,10)}.csv`
    const csv = [headers.join(';'), ...rows.map(t=>headers.map(h=>t[h]??'').join(';'))].join('\n')
    const blob = new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'})
    const url  = URL.createObjectURL(blob); const a=document.createElement('a')
    a.href=url; a.download=fileName; a.click(); URL.revokeObjectURL(url)
    setExportLogs(prev=>[{id:Date.now(),fileName,date:new Date().toLocaleString('pt-BR'),total:rows.length,scope,status:'concluido'},...prev])
    setShowTray(true)
  }

  // ── save / delete ─────────────────────────────────────────────────────────
  function handleSave(data) { saveTarefa(data); setModal(null) }
  function handleDelete(id) { deleteTarefa(id); setModal(null) }

  const hasFilter = search||filterStatus||filterTipo||filterPrioridade||filterEntidade||filtroPeriodoInicio||filtroPeriodoFim

  return (
    <div style={{ ...p.page, ...(view==='kanban'?{ maxWidth:'none' }:{}) }}>

      {/* ── Page header ── */}
      <div style={p.pageHeader}>
        <div>
          <div style={p.breadcrumb}><span>Geral</span><span style={p.sep}>›</span><span>Tarefas</span></div>
          <h1 style={p.title}>Tarefas</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button
            onClick={() => setShowMetrics(v => !v)}
            title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28,
              borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)',
              color:'var(--text-muted)', cursor:'pointer', flexShrink:0, marginTop:18 }}>
            {showMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <div ref={acoesRef} style={{ position:'relative' }}>
            <button style={{ ...p.ghostBtn, height:36, ...(acoesOpen ? { borderColor:'var(--accent)', color:'var(--accent)' } : {}) }}
              onClick={() => setAcoesOpen(v => !v)}>
              Ações <span style={{ fontSize:10 }}>▾</span>
            </button>
            {acoesOpen && (
              <AcoesMenu
                onExport={() => { handleExport(); setAcoesOpen(false) }}
                onImport={() => { setImportModal(true); setAcoesOpen(false) }}
                onClose={() => setAcoesOpen(false)}
                anchorRef={acoesRef}
                selected={selected}
                exportLogs={exportLogs}
                showTray={showTray}
                setShowTray={setShowTray}
              />
            )}
          </div>
          <Button onClick={()=>setModal({ _new:true })}>+ Nova tarefa</Button>
        </div>
      </div>

      {/* ── KPIs collapsible ── */}
      <div style={{ display:'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr', transition:'grid-template-rows 0.22s ease', overflow:'hidden' }}>
        <div style={{ minHeight:0, overflow:'hidden' }}>
          <div style={p.kpis}>
            <KpiCard label="Total de tarefas"   value={tarefas.length} />
            <KpiCard label="Abertas"            value={pendentes} accent />
            <KpiCard label="Concluídas"         value={concluidas} />
            <KpiCard label="Atrasadas"          value={atrasadas} red />
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={p.toolbar}>
        <div style={p.tbLeft}>
          <div style={p.searchWrap}>
            <span style={p.searchIcon}>⌕</span>
            <input style={p.searchInput} placeholder="Buscar tarefa ou vínculo…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select style={p.select} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CFG).map(([k,cfg])=><option key={k} value={k}>{cfg.label}</option>)}
          </select>

          {/* Filtros agrupados */}
          <div ref={filtrosRef} style={{ position:'relative' }}>
            {(() => {
              const activeCount = [filterPrioridade, filterTipo, filterEntidade, filtroPeriodoInicio, filtroPeriodoFim].filter(Boolean).length
              return (
                <button
                  onClick={() => setFiltrosOpen(v => !v)}
                  style={{ display:'flex', alignItems:'center', gap:6, height:36, padding:'0 12px',
                    borderRadius:8, border:`1.5px solid ${filtrosOpen || activeCount > 0 ? 'var(--accent)' : 'var(--border)'}`,
                    background: activeCount > 0 ? 'var(--accent-glow)' : 'var(--surface)',
                    color: activeCount > 0 ? 'var(--accent)' : 'var(--text-soft)',
                    fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 4h12M4 8h8M6 12h4"/></svg>
                  Filtros
                  {activeCount > 0 && (
                    <span style={{ background:'var(--accent)', color:'#fff', borderRadius:10,
                      fontSize:10, fontWeight:800, padding:'1px 6px', lineHeight:'16px' }}>
                      {activeCount}
                    </span>
                  )}
                  <span style={{ fontSize:10, opacity:0.6 }}>▾</span>
                </button>
              )
            })()}
            {filtrosOpen && (() => {
              function closeOnOutside(e) {
                if (filtrosRef.current && !filtrosRef.current.contains(e.target)) {
                  setFiltrosOpen(false)
                  document.removeEventListener('mousedown', closeOnOutside)
                }
              }
              document.addEventListener('mousedown', closeOnOutside)
              const selStyle = { width:'100%', padding:'8px 10px', borderRadius:7,
                border:'1px solid var(--border)', background:'var(--surface2)',
                fontSize:13, color:'var(--text)', fontFamily:'var(--font)',
                outline:'none', cursor:'pointer' }
              const lblStyle = { fontSize:11, fontWeight:700, color:'var(--text-muted)',
                textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:5 }
              return (
                <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:300,
                  width:280, background:'var(--surface)', border:'1px solid var(--border)',
                  borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,0.14)', overflow:'hidden' }}>
                  <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Filtros</span>
                    <button onClick={() => setFiltrosOpen(false)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, lineHeight:1, padding:2 }}>✕</button>
                  </div>
                  <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:12 }}>
                    <div>
                      <label style={lblStyle}>Prioridade</label>
                      <select style={selStyle} value={filterPrioridade} onChange={e=>setFilterPrioridade(e.target.value)}>
                        <option value="">Todas</option>
                        {Object.entries(PRIORIDADE_CFG).map(([k,cfg])=><option key={k} value={k}>{cfg.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lblStyle}>Tipo</label>
                      <select style={selStyle} value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}>
                        <option value="">Todos</option>
                        {TIPOS_TAREFA.map(t=><option key={t} value={t}>{TIPO_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lblStyle}>Vínculo</label>
                      <select style={selStyle} value={filterEntidade} onChange={e=>setFilterEntidade(e.target.value)}>
                        <option value="">Todos</option>
                        {ENTIDADE_TIPOS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lblStyle}>Prazo — De</label>
                      <input type="date" style={{ ...selStyle }} value={filtroPeriodoInicio}
                        onChange={e=>setFiltroPeriodoInicio(e.target.value)} />
                    </div>
                    <div>
                      <label style={lblStyle}>Prazo — Até</label>
                      <input type="date" style={{ ...selStyle }} value={filtroPeriodoFim}
                        onChange={e=>setFiltroPeriodoFim(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                    <button onClick={() => { setFilterPrioridade(''); setFilterTipo(''); setFilterEntidade(''); setFiltroPeriodoInicio(''); setFiltroPeriodoFim('') }}
                      style={{ background:'none', border:'none', fontSize:12, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline', fontWeight:600 }}>
                      Limpar
                    </button>
                    <button onClick={() => setFiltrosOpen(false)}
                      style={{ padding:'7px 18px', background:'var(--accent)', color:'#fff', border:'none',
                        borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                      Aplicar
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
        <div style={p.tbDivider} />
        <div style={p.tbRight}>
          <select style={p.select} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="prazo">Prazo mais próximo</option>
            <option value="prioridade">Maior prioridade</option>
            <option value="criado">Mais recentes</option>
            <option value="titulo">Título A–Z</option>
          </select>
          <div style={p.viewToggle}>
            <button style={{ ...p.viewBtn, ...(view==='list'  ?p.viewBtnOn:{}) }} onClick={()=>setView('list')}   title="Lista">☰</button>
            <button style={{ ...p.viewBtn, ...(view==='kanban'?p.viewBtnOn:{}) }} onClick={()=>setView('kanban')} title="Kanban por status">⊞</button>
          </div>
        </div>
      </div>

      {/* ── Result row ── */}
      <div style={p.resultRow}>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' }}>
          {filtered.length} tarefa{filtered.length!==1?'s':''} encontrada{filtered.length!==1?'s':''}
        </span>
        {hasFilter && (
          <button style={p.clearBtn} onClick={()=>{ setSearch(''); setFilterStatus(''); setFilterTipo(''); setFilterPrioridade(''); setFilterEntidade(''); setFiltroPeriodoInicio(''); setFiltroPeriodoFim('') }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Bulk bar ── */}
      {selected.size>0 && (
        <div style={p.bulkBar}>
          <span style={p.bulkCount}><span style={p.bulkDot}/>{selected.size} selecionada{selected.size>1?'s':''}</span>
          <div style={p.bulkActions}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.75)' }}>Alterar status:</span>
            {Object.entries(STATUS_CFG).map(([k,cfg])=>(
              <button key={k} style={p.bulkBtn} onClick={()=>applyBulk(k)}>→ {cfg.label}</button>
            ))}
            <div style={{ width:1, background:'rgba(255,255,255,0.2)', alignSelf:'stretch', margin:'0 4px' }} />
            <button style={{ ...p.bulkBtn, color:'#FCA5A5', borderColor:'rgba(252,165,165,0.3)' }} onClick={()=>applyBulk('delete')}>Excluir</button>
          </div>
          <button style={p.bulkClear} onClick={clearSelection}>✕ Limpar seleção</button>
        </div>
      )}

      {/* ── Views ── */}
      {view==='list' && (
        <ListView tarefas={filtered} onEdit={t=>setModal(t)}
          selected={selected} onToggleAll={toggleAll} onToggleOne={toggleOne}
          allSelected={allSelected} someSelected={someSelected} />
      )}

      {view==='kanban' && (
        <KanbanView
          tarefas={filtered}
          onEdit={t=>setModal(t)}
          onAddTarefa={status=>setModal({ _new:true, status })}
        />
      )}

      {/* ── Notion Drawer ── */}
      <Drawer
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal && !modal._new ? modal.titulo : 'Nova tarefa'}
        subtitle="Comercial · Tarefas"
        bodyStyle={{ padding: 0, gap: 0, overflow: 'hidden' }}
      >
        {modal && (
          <TarefaDetail
            item={modal._new ? (modal.status ? { ...EMPTY_FORM, status: modal.status } : null) : modal}
            onClose={() => setModal(null)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </Drawer>

      {importModal && (
        <ImportModal onClose={()=>setImportModal(false)}
          onImport={(rows,log)=>{ rows.forEach(t=>saveTarefa(t)); setExportLogs(prev=>[log,...prev]) }} />
      )}

    </div>
  )
}

// ─── Styles (padrão Empresas/Pipeline) ───────────────────────────────────────
const p = {
  page:       { display:'flex', flexDirection:'column', gap:16, maxWidth:1200 },
  pageHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between' },
  iconBtn:    { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text-muted)', cursor:'pointer' },
  iconBtnActive: { borderColor:'var(--accent)', color:'var(--accent)', background:'var(--accent-glow)' },
  breadcrumb: { display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', marginBottom:4 },
  sep:        { color:'var(--border)' },
  title:      { margin:0, fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px' },
  newBtn:     { padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  kpis:       { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 },
  kpi:        { background:'var(--surface)', borderRadius:10, padding:'16px 18px', display:'flex', flexDirection:'column', gap:4, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', borderTop:'3px solid var(--border)' },
  kpiVal:     { fontSize:26, fontWeight:700, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1 },
  kpiLbl:     { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  toolbar:    { background:'var(--surface)', borderRadius:10, padding:'8px 12px', border:'1px solid var(--border2)', boxShadow:'var(--shadow)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  tbLeft:     { display:'flex', alignItems:'center', gap:6, flexShrink:1, minWidth:0 },
  tbRight:    { display:'flex', alignItems:'center', gap:6, flexShrink:0 },
  tbDivider:  { width:1, height:24, background:'var(--border)', flexShrink:0, margin:'0 4px' },
  searchWrap: { position:'relative', width:220, flexShrink:0 },
  searchIcon: { position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14, pointerEvents:'none' },
  searchInput:{ width:'100%', height:36, padding:'0 10px 0 28px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box' },
  select:     { height:36, padding:'0 8px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:12, outline:'none', cursor:'pointer', fontFamily:'var(--font)', flexShrink:0 },
  viewToggle: { display:'flex', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', padding:3, gap:2, flexShrink:0 },
  viewBtn:    { width:34, height:32, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', borderRadius:6, fontSize:14, transition:'all 0.15s' },
  viewBtnOn:  { background:'var(--accent)', color:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.18)' },
  ghostBtn:   { height:36, display:'flex', alignItems:'center', gap:5, padding:'0 10px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-muted)', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap', flexShrink:0 },
  resultRow:  { display:'flex', alignItems:'center', gap:12 },
  clearBtn:   { fontSize:12, color:'var(--accent2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' },
  tableWrap:  { background:'var(--surface)', borderRadius:10, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', overflow:'hidden' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', background:'var(--surface2)', borderBottom:'1px solid var(--border)' },
  tr:         { borderBottom:'1px solid var(--border2)' },
  trSelected: { backgroundColor:'rgba(30,58,95,0.05)' },
  td:         { padding:'11px 14px', fontSize:13, verticalAlign:'middle' },
  editBtn:    { padding:'4px 10px', border:'1px solid var(--border)', borderRadius:5, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' },
  trayBtn:    { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', position:'relative' },
  trayBtnActive:{ background:'var(--accent-glow)', borderColor:'rgba(30,58,95,0.2)', color:'var(--accent)' },
  trayBadge:  { position:'absolute', top:-5, right:-5, background:'var(--accent)', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)' },
  bulkBar:    { display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'var(--accent)', borderRadius:10, flexWrap:'wrap' },
  bulkCount:  { display:'flex', alignItems:'center', gap:6, color:'#fff', fontSize:13, fontWeight:600, fontFamily:'var(--mono)' },
  bulkDot:    { width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.7)' },
  bulkActions:{ display:'flex', alignItems:'center', gap:6, flex:1, flexWrap:'wrap' },
  bulkBtn:    { padding:'4px 10px', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, background:'rgba(255,255,255,0.12)', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' },
  bulkClear:  { fontSize:12, color:'rgba(255,255,255,0.6)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', marginLeft:'auto' },
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
