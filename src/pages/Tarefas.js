import { useState, useMemo, useRef, useEffect } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useOpportunities } from '../hooks/useOpportunities'
import { useCompanies } from '../hooks/useCompanies'
import { useLocalState } from '../hooks/useLocalState'
import Button from '../components/Button'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormField, FormSection } from '../components/ui/SlideOver'
import { MOCK_USUARIOS } from '../data/mockUsuarios'
import { useContacts } from '../hooks/useContacts'
import { STORAGE_KEY as TIPOS_ATIVIDADE_KEY } from './settings/TiposAcao'
import { SESSOES_MOCK } from '../data/mockPerfis'

const SESSAO_ATIVA = SESSOES_MOCK[0]

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
// Fallback para quando não há tipos cadastrados nas Configurações
const TIPOS_TAREFA_DEFAULT = [
  { slug:'ligacao',   label:'Ligação',  icon:'📞' },
  { slug:'email',     label:'E-mail',   icon:'📧' },
  { slug:'reuniao',   label:'Reunião',  icon:'🤝' },
  { slug:'visita',    label:'Visita',   icon:'📍' },
  { slug:'proposta',  label:'Proposta', icon:'📋' },
  { slug:'follow_up', label:'Follow-up',icon:'🔔' },
]

// Ícone por slug ou label (cobre dados antigos com tipo em texto livre)
const ICON_FALLBACK = { ligacao:'📞', email:'📧', reuniao:'🤝', visita:'📍', proposta:'📋', follow_up:'🔔',
  'ligação':'📞', 'reunião':'🤝', 'follow-up':'🔔' }
function tipoIcon(tipo, tiposList = TIPOS_TAREFA_DEFAULT) {
  const found = tiposList.find(t => t.slug === tipo || t.label?.toLowerCase() === tipo?.toLowerCase())
  return found?.icon || ICON_FALLBACK[tipo] || '☑'
}

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
  { value:'projeto',      label:'Projeto'      },
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
  const icons = { oportunidade:'▷', empresa:'◈', contrato:'◉', contato:'◎', projeto:'◆' }
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
  const { opps }          = useOpportunities()
  const { companies }     = useCompanies()

  useEffect(() => { setQuery(label||'') }, [label])
  useEffect(() => {
    function h(e) { if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return ()=>document.removeEventListener('mousedown', h)
  }, [])

  const projetos = useMemo(() => {
    try { const s = localStorage.getItem('projetos:lista_v2'); return s ? JSON.parse(s) : [] } catch { return [] }
  }, [])

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    if (entidadeTipo==='oportunidade') return opps.filter(o=>(o.titulo||'').toLowerCase().includes(q)).slice(0,8).map(o=>({ id:o.id, nome:o.titulo }))
    if (entidadeTipo==='empresa')      return companies.filter(e=>(e.fantasia||e.razao||'').toLowerCase().includes(q)).slice(0,8).map(e=>({ id:e.id, nome:e.fantasia||e.razao }))
    if (entidadeTipo==='contrato')     return MOCK_CONTRATOS.filter(c=>c.nome.toLowerCase().includes(q)).slice(0,8)
    if (entidadeTipo==='projeto')      return projetos.filter(p=>(p.nome||p.titulo||'').toLowerCase().includes(q)).slice(0,8).map(p=>({ id:p.id, nome:p.nome||p.titulo }))
    return []
  }, [query, entidadeTipo, opps, companies, projetos])

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
  const { contacts }      = useContacts()

  useEffect(() => { setQuery(label || '') }, [label])
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    return contacts
      .filter(c => (c.nome||'').toLowerCase().includes(q) || (c.empresa_nome||'').toLowerCase().includes(q) || (c.cargo||'').toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, contacts])

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
function TarefaForm({ form, onChange, tiposTarefa = TIPOS_TAREFA_DEFAULT, errs = {}, clearErr }) {
  const [profiles] = useLocalState('usuarios:profiles', MOCK_USUARIOS)
  const usuarios = profiles.length ? profiles : MOCK_USUARIOS
  function set(k, v) { onChange({ ...form, [k]: v }) }

  return (
    <>
      <FormSection label="Identificação">
        <FormField label="Título" required span={2} error={errs.titulo}>
          <input className="so-field" value={form.titulo}
            onChange={e => { set('titulo', e.target.value); clearErr?.('titulo') }}
            placeholder="Título da tarefa…"
            style={{ borderColor: errs.titulo ? '#DC2626' : '' }} />
        </FormField>

        <FormField label="Tipo">
          <select className="so-field" value={form.tipo || ''} onChange={e => set('tipo', e.target.value)}>
            <option value="">— Selecione —</option>
            {tiposTarefa.map(t => {
              const key = t.slug || t.key || t.id
              return <option key={key} value={key}>{t.icon} {t.label}</option>
            })}
          </select>
        </FormField>

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
              const u = usuarios.find(u => String(u.id) === e.target.value) || null
              onChange({ ...form, responsavel_id: u?.id || null, responsavel_nome: u?.nome || '' })
            }}>
            <option value="">— Nenhum —</option>
            {usuarios.filter(u => u.tipo === 'interno' || u.papel).map(u => (
              <option key={u.id} value={u.id}>{u.nome}{u.cargo ? ` — ${u.cargo}` : u.papel ? ` — ${u.papel}` : ''}</option>
            ))}
            {usuarios.filter(u => u.tipo === 'externo' && !u.papel).length > 0 && (
              <>
                <option disabled>────────────</option>
                {usuarios.filter(u => u.tipo === 'externo' && !u.papel).map(u => (
                  <option key={u.id} value={u.id}>{u.nome}{u.cargo ? ` — ${u.cargo}` : ''}</option>
                ))}
              </>
            )}
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
  // validação de tipo relaxada — aceita qualquer slug cadastrado
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
        <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{tipoIcon(tarefa.tipo)}</span>
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
// ─── Calendário ───────────────────────────────────────────────────────────────
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function CalendarioView({ tarefas, sessao, onEdit, onNew }) {
  const hoje = new Date()
  const [ano,  setAno]  = useState(hoje.getFullYear())
  const [mes,  setMes]  = useState(hoje.getMonth())
  const [meusFiltro, setMeusFiltro] = useState(true) // padrão: só as do usuário logado

  const tarefasFiltradas = useMemo(() => {
    if (!meusFiltro) return tarefas
    return tarefas.filter(t =>
      t.responsavel_id === sessao.id ||
      String(t.responsavel_nome || t.responsavel || '').toLowerCase().includes((sessao.nome||'').toLowerCase())
    )
  }, [tarefas, meusFiltro, sessao])

  // Agrupa tarefas por data de prazo (YYYY-MM-DD)
  const porDia = useMemo(() => {
    const map = {}
    tarefasFiltradas.forEach(t => {
      if (!t.prazo) return
      if (!map[t.prazo]) map[t.prazo] = []
      map[t.prazo].push(t)
    })
    return map
  }, [tarefasFiltradas])

  // Dias do mês
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia   = new Date(ano, mes + 1, 0)
  const diasNoMes   = ultimoDia.getDate()
  const offsetInicio = primeiroDia.getDay() // 0=Dom

  function navMes(delta) {
    let nm = mes + delta, na = ano
    if (nm < 0)  { nm = 11; na-- }
    if (nm > 11) { nm = 0;  na++ }
    setMes(nm); setAno(na)
  }

  const hoje8 = hoje.toISOString().slice(0,10)

  // sem prazo do usuário
  const semPrazo = tarefasFiltradas.filter(t => !t.prazo && t.status !== 'concluida' && t.status !== 'cancelada')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Barra superior */}
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        {/* Nav mês */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => navMes(-1)}
            style={{ width:32, height:32, border:'1px solid var(--border)', borderRadius:7,
              background:'var(--surface)', cursor:'pointer', fontSize:16, color:'var(--text-soft)' }}>‹</button>
          <span style={{ fontSize:16, fontWeight:700, color:'var(--text)', minWidth:160, textAlign:'center' }}>
            {MESES[mes]} {ano}
          </span>
          <button onClick={() => navMes(1)}
            style={{ width:32, height:32, border:'1px solid var(--border)', borderRadius:7,
              background:'var(--surface)', cursor:'pointer', fontSize:16, color:'var(--text-soft)' }}>›</button>
          <button onClick={() => { setMes(hoje.getMonth()); setAno(hoje.getFullYear()) }}
            style={{ height:32, padding:'0 12px', border:'1px solid var(--border)', borderRadius:7,
              background:'var(--surface)', cursor:'pointer', fontSize:12, color:'var(--text-soft)', fontFamily:'var(--font)' }}>
            Hoje
          </button>
        </div>

        <div style={{ flex:1 }}/>

        {/* Filtro: minhas / todas */}
        <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
          {[{v:true,l:'Minhas'},{v:false,l:'Todas'}].map(opt => (
            <button key={String(opt.v)} onClick={() => setMeusFiltro(opt.v)}
              style={{ padding:'6px 14px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                fontFamily:'var(--font)',
                background: meusFiltro===opt.v ? 'var(--accent)' : 'var(--surface)',
                color:       meusFiltro===opt.v ? '#fff'          : 'var(--text-muted)' }}>
              {opt.l}
            </button>
          ))}
        </div>

        {/* Legenda status */}
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {Object.entries(STATUS_CFG).map(([k, cfg]) => (
            <span key={k} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-muted)' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, display:'inline-block' }}/>
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* Grade do calendário */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {/* Cabeçalho dias da semana */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)',
          borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ padding:'8px 0', textAlign:'center', fontSize:11,
              fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {/* Offset inicial */}
          {Array.from({ length: offsetInicio }, (_, i) => (
            <div key={`off-${i}`} style={{ minHeight:100, borderRight:'1px solid var(--border2)',
              borderBottom:'1px solid var(--border2)', background:'var(--surface2)', opacity:.5 }}/>
          ))}

          {/* Dias do mês */}
          {Array.from({ length: diasNoMes }, (_, i) => {
            const dia = i + 1
            const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
            const isHoje  = dataStr === hoje8
            const col     = (offsetInicio + i) % 7
            const tarefasDia = porDia[dataStr] || []
            const isUltimaColunaLinha = col === 6

            return (
              <div key={dia}
                style={{ minHeight:100, padding:'6px 8px', cursor:'pointer',
                  borderRight: isUltimaColunaLinha ? 'none' : '1px solid var(--border2)',
                  borderBottom:'1px solid var(--border2)',
                  background: isHoje ? 'var(--accent-glow)' : 'var(--surface)',
                  transition:'background .15s' }}
                onClick={() => onNew({ prazo: dataStr })}
                onMouseEnter={e => { if (!isHoje) e.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={e => { if (!isHoje) e.currentTarget.style.background = 'var(--surface)' }}>

                {/* Número do dia */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight: isHoje ? 800 : 400,
                    color: isHoje ? 'var(--accent)' : 'var(--text-soft)',
                    width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    background: isHoje ? 'var(--accent)' : 'none',
                    color: isHoje ? '#fff' : 'var(--text-soft)' }}>
                    {dia}
                  </span>
                  {tarefasDia.length > 0 && (
                    <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                      {tarefasDia.length}
                    </span>
                  )}
                </div>

                {/* Tarefas do dia (max 3, depois +N) */}
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {tarefasDia.slice(0,3).map(t => {
                    const cfg = STATUS_CFG[t.status] || STATUS_CFG.pendente
                    const passado = dataStr < hoje8 && t.status !== 'concluida' && t.status !== 'cancelada'
                    return (
                      <div key={t.id}
                        onClick={e => { e.stopPropagation(); onEdit(t) }}
                        title={`${t.titulo}${t.responsavel_nome ? ` · ${t.responsavel_nome}` : ''}`}
                        style={{ fontSize:10, padding:'2px 6px', borderRadius:4,
                          background: passado ? '#FEE2E2' : cfg.bg,
                          color:       passado ? '#991B1B' : cfg.text,
                          fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          borderLeft:`3px solid ${passado?'#EF4444':cfg.dot}`,
                          cursor:'pointer', lineHeight:1.5 }}>
                        {tipoIcon(t.tipo)} {t.titulo}
                      </div>
                    )
                  })}
                  {tarefasDia.length > 3 && (
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)', paddingLeft:4 }}>
                      +{tarefasDia.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Completar última linha */}
          {(() => {
            const total = offsetInicio + diasNoMes
            const resto = total % 7 === 0 ? 0 : 7 - (total % 7)
            return Array.from({ length: resto }, (_, i) => (
              <div key={`fim-${i}`} style={{ minHeight:100,
                borderRight: i < resto - 1 ? '1px solid var(--border2)' : 'none',
                borderBottom:'none', background:'var(--surface2)', opacity:.5 }}/>
            ))
          })()}
        </div>
      </div>

      {/* Tarefas sem prazo */}
      {semPrazo.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 18px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
            letterSpacing:'0.06em', marginBottom:10 }}>
            Sem prazo definido ({semPrazo.length})
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {semPrazo.map(t => {
              const cfg = STATUS_CFG[t.status] || STATUS_CFG.pendente
              return (
                <div key={t.id} onClick={() => onEdit(t)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                    background:'var(--surface2)', borderRadius:8, cursor:'pointer',
                    border:'1px solid var(--border2)', transition:'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border2)'}>
                  <span style={{ fontSize:15 }}>{tipoIcon(t.tipo)}</span>
                  <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text)' }}>{t.titulo}</span>
                  {t.responsavel_nome && <span style={{ fontSize:11, color:'var(--text-muted)' }}>👤 {t.responsavel_nome}</span>}
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.text, fontWeight:600 }}>{cfg.label}</span>
                  <PrioridadeBadge prioridade={t.prioridade}/>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Tarefas() {
  const { tarefas, save: saveTarefa, remove: deleteTarefa, bulkSetStatus: bulkTarefaStatus } = useTasks()
  const [tiposAtividade] = useLocalState(TIPOS_ATIVIDADE_KEY, [])
  const tiposTarefa = useMemo(
    () => {
      const lista = tiposAtividade.filter(t => t.uso === 'tarefa' || t.uso === 'ambos')
      return lista.length ? lista : TIPOS_TAREFA_DEFAULT
    },
    [tiposAtividade]
  )

  // ── SlideOver state ───────────────────────────────────────────────────────
  const [editItem, setEditItem]   = useState(null)   // tarefa obj | { _new:true, status? } | null
  const [form, setForm]           = useState(null)
  const [errs, setErrs]           = useState({})

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
    if (!form?.titulo?.trim()) { setErrs({ titulo: 'Título é obrigatório' }); return }
    setErrs({})
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
  const [kanban,      setKanban]      = useLocalState('tarefas:kanban', false)
  const [calendario,  setCalendario]  = useLocalState('tarefas:calendario', false)
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
          <span style={{ fontSize:16, marginTop:1, flexShrink:0 }}>{tipoIcon(row.tipo)}</span>
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
  ]

  const filterDefs = [
    { key: 'status',        label: 'Status',    options: Object.entries(STATUS_CFG).map(([k,cfg]) => ({ value:k, label:cfg.label })) },
    { key: 'tipo',          label: 'Tipo',       options: tiposTarefa.map(t => ({ value: t.slug || t.key || t.id, label:`${t.icon} ${t.label}` })) },
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

  const viewToggles = (
    <div style={{ display:'flex', gap:4 }}>
      <button title="Visão Kanban" onClick={() => { setKanban(true); setCalendario(false) }}
        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32,
          borderRadius:'var(--radius-md)', border:'1px solid var(--border)', background:'var(--surface)',
          cursor:'pointer', color:'var(--text-soft)', fontSize:15 }}>
        ⊞
      </button>
      <button title="Visão Calendário" onClick={() => { setCalendario(true); setKanban(false) }}
        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32,
          borderRadius:'var(--radius-md)', border:'1px solid var(--border)', background:'var(--surface)',
          cursor:'pointer', color:'var(--text-soft)', fontSize:15 }}>
        📅
      </button>
    </div>
  )

  // ── SlideOver compartilhado (list + kanban) ───────────────────────────────
  const isNew = !!editItem?._new
  const slideOver = (
    <SlideOver
      open={!!editItem}
      onClose={closeSlideOver}
      onSave={handleSave}
      title={isNew ? 'Nova tarefa' : (form?.titulo || 'Editar tarefa')}
      subtitle={isNew ? 'Preencha os dados da tarefa' : `${tipoIcon(form?.tipo)} ${STATUS_CFG[form?.status]?.label || ''}`}
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
      {form && <TarefaForm form={form} onChange={setForm} tiposTarefa={tiposTarefa}
        errs={errs} clearErr={k => setErrs(p => ({ ...p, [k]: '' }))} />}
    </SlideOver>
  )

  // ── Calendário view ───────────────────────────────────────────────────────
  if (calendario) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 20px', borderBottom:'1px solid var(--border)',
          background:'var(--surface)', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', marginBottom:4 }}>
              <span>Geral</span><span style={{ margin:'0 4px', color:'var(--border)' }}>›</span>
              <span>Tarefas</span><span style={{ margin:'0 4px', color:'var(--border)' }}>›</span>
              <span>Calendário</span>
            </div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:'var(--text)', letterSpacing:'-0.3px' }}>
              Tarefas — Calendário
            </h1>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setCalendario(false)}
              style={{ height:34, padding:'0 14px', border:'1px solid var(--border)', borderRadius:7,
                background:'none', color:'var(--text-soft)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>
              ← Lista
            </button>
            <button onClick={() => openNew()}
              style={{ height:34, padding:'0 14px', border:'none', borderRadius:7,
                background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600,
                cursor:'pointer', fontFamily:'var(--font)' }}>
              + Nova tarefa
            </button>
          </div>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:20 }}>
          <CalendarioView tarefas={tarefas} sessao={SESSAO_ATIVA} onEdit={openEdit} onNew={openNew} />
        </div>
        {slideOver}
      </div>
    )
  }

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
        bulkEditFields={[
          { key: 'prioridade', label: 'Prioridade', type: 'select',
            options: Object.entries(PRIORIDADE_CFG).map(([k, v]) => ({ value: k, label: v.label })) },
          { key: 'prazo', label: 'Prazo', type: 'date' },
        ]}
        onBulkEdit={(ids, changes) =>
          ids.forEach(id => { const t = tarefas.find(t => t.id === id); if (t) saveTarefa({ ...t, ...changes }) })
        }
        renderCard={row => <TarefaCard tarefa={row} onClick={() => openEdit(row)} />}
        onRowClick={row => openEdit(row)}
        onNew={() => openNew()}
        newLabel="+ Nova tarefa"
        onImport={() => setImportModal(true)}
        onExportCsv={() => buildExportCsv(filtered)}
        secondaryActions={viewToggles}
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
