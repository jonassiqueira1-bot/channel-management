import { useState, useMemo, useRef, useEffect } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useAuditLog } from '../hooks/useAuditLog'
import { supabase } from '../lib/supabase'
import { useOpportunities } from '../hooks/useOpportunities'
import { useCompanies } from '../hooks/useCompanies'
import { useLocalState } from '../hooks/useLocalState'
import Button from '../components/Button'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormField, FormSection } from '../components/ui/SlideOver'
import { useContacts } from '../hooks/useContacts'
import { useUsuarios } from '../hooks/useUsuarios'
import { useContracts } from '../hooks/useContracts'
import { useProjects } from '../hooks/useProjects'
import { STORAGE_KEY as TIPOS_ATIVIDADE_KEY } from './settings/TiposAcao'
import { useProfile } from '../hooks/useProfile'

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
  atrasada:    { label:'Atrasada',    color:'#EF4444', bg:'#FEE2E2', text:'#991B1B', dot:'#EF4444' },
  concluida:   { label:'Concluída',   color:'#10B981', bg:'#D1FAE5', text:'#065F46', dot:'#10B981' },
  cancelada:   { label:'Cancelada',   color:'#9CA3AF', bg:'#F3F4F6', text:'#6B7280', dot:'#9CA3AF' },
}

function statusEfetivo(tarefa) {
  if (!tarefa) return 'pendente'
  if (tarefa.status === 'concluida' || tarefa.status === 'cancelada') return tarefa.status
  if (tarefa.data_inicio) {
    const limite = new Date(tarefa.data_inicio)
    limite.setDate(limite.getDate() + 1)
    if (limite < new Date()) return 'atrasada'
  }
  return tarefa.status || 'pendente'
}
const STATUS_KANBAN = ['pendente','em_andamento','atrasada','concluida','cancelada']

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
  prazo:'', data_inicio:'',
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
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, color:cfg.text, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}

function PrioridadeBadge({ prioridade }) {
  const cfg = PRIORIDADE_CFG[prioridade] || PRIORIDADE_CFG.media
  return (
    <span style={{ fontSize:10, fontWeight:700, color:cfg.color }}>
      {cfg.label.toUpperCase()}
    </span>
  )
}

function EntidadeTag({ tipo, nome }) {
  if (!tipo || !nome) return <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>
  const icons = { oportunidade:'▷', empresa:'◈', contrato:'◉', contato:'◎', projeto:'◆' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11,
      color:'var(--accent)', whiteSpace:'nowrap', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis' }}>
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
  const { opps } = useOpportunities()
  const { companies }     = useCompanies()
  const { contratos }     = useContracts()
  const { projetos }      = useProjects()

  useEffect(() => { setQuery(label||'') }, [label])
  useEffect(() => {
    function h(e) { if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return ()=>document.removeEventListener('mousedown', h)
  }, [])

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    if (entidadeTipo==='oportunidade') return opps.filter(o=>(o.titulo||'').toLowerCase().includes(q)).slice(0,8).map(o=>({ id:o.id, nome:o.titulo }))
    if (entidadeTipo==='empresa')      return companies.filter(e=>(e.fantasia||e.razao||e.nome||'').toLowerCase().includes(q)).slice(0,8).map(e=>({ id:e.id, nome:e.fantasia||e.razao||e.nome }))
    if (entidadeTipo==='contrato')     return contratos.filter(c=>(c.titulo||c.nome||'').toLowerCase().includes(q)).slice(0,8).map(c=>({ id:c.id, nome:c.titulo||c.nome }))
    if (entidadeTipo==='projeto')      return projetos.filter(p=>(p.nome||p.titulo||'').toLowerCase().includes(q)).slice(0,8).map(p=>({ id:p.id, nome:p.nome||p.titulo }))
    return []
  }, [query, entidadeTipo, opps, companies, contratos, projetos])

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

// ─── Gatilho de campo opcional — divulgação progressiva ──────────────────────
// Mesma ideia usada em Oportunidades > Equipe: campo opcional some por trás de
// um botão discreto até o usuário pedir pra preencher, em vez de ocupar espaço
// sempre. Nunca pílula — retangular, consistente com o resto do projeto.
function AddFieldTrigger({ label, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px',
        borderRadius:6, border:'1px dashed var(--border2)', background:'var(--surface2)',
        color:'var(--text-soft)', fontSize:12, fontWeight:600, fontFamily:'var(--font)',
        cursor:'pointer', width:'fit-content' }}>
      {label}
    </button>
  )
}

// ─── Formulário de Tarefa (usado dentro do SlideOver) ────────────────────────
// Ordem segue o fluxo mental do usuário: o que é (Contexto) → quando acontece
// e em que pé está (Execução) → quem faz (Responsáveis) → detalhes complementares
// por último, já que normalmente são só apoio pra quem já entendeu a tarefa.
function TarefaForm({ form, onChange, tiposTarefa = TIPOS_TAREFA_DEFAULT, errs = {}, clearErr }) {
  const { usuarios: usuariosRaw } = useUsuarios()
  const usuarios = usuariosRaw.filter(u => u.status !== 'inativo')
  function set(k, v) { onChange({ ...form, [k]: v }) }

  // Só nasce fechado quando realmente não há nada — se a tarefa já tem contato
  // externo vinculado, o campo já vem visível (nunca esconde dado existente).
  const [contatoAberto, setContatoAberto] = useState(!!form.contato_id)

  return (
    <>
      <FormSection label="Contexto" description="O que é esta tarefa e a que ela se refere.">
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

        <FormField label="Vínculo">
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

      <FormSection label="Execução" description="Status atual, prioridade e quando deve acontecer.">
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

        <FormField label="Data e Hora de Início *">
          <input className="so-field" type="datetime-local" value={form.data_inicio || ''}
            onChange={e => set('data_inicio', e.target.value)}
            required />
        </FormField>
      </FormSection>

      <FormSection label="Responsáveis" description="Quem interno cuida disso e, se houver, o contato do outro lado.">
        <FormField label="Responsável interno" span={2}>
          <select className="so-field"
            value={form.responsavel_id || ''}
            onChange={e => {
              const u = usuarios.find(u => String(u.id) === e.target.value) || null
              onChange({ ...form, responsavel_id: u?.id || null, responsavel_nome: u?.nome || '' })
            }}>
            <option value="">— Nenhum —</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>{u.nome}{u.cargo ? ` — ${u.cargo}` : u.papel ? ` — ${u.papel}` : ''}</option>
            ))}
          </select>
        </FormField>

        <div style={{ gridColumn: '1 / -1' }}>
          {contatoAberto ? (
            <>
              <label className="so-label">Contato externo</label>
              <ContatoSearch
                value={form.contato_id}
                label={form.contato_nome}
                onChange={(id, nome, empresa) => onChange({ ...form, contato_id: id, contato_nome: nome, contato_empresa: empresa || '' })}
              />
              {form.contato_id && form.contato_empresa && (
                <span className="so-hint">{form.contato_empresa}</span>
              )}
            </>
          ) : (
            <AddFieldTrigger label="+ Adicionar contato externo" onClick={() => setContatoAberto(true)} />
          )}
        </div>
      </FormSection>

      <FormSection label="Detalhes" description="Contexto adicional — normalmente complementar ao que já foi dito acima.">
        <FormField label="Descrição" span={2}>
          <textarea className="so-field" rows={3} value={form.descricao || ''}
            onChange={e => set('descricao', e.target.value)}
            placeholder="Detalhes, contexto ou notas sobre esta tarefa…" />
        </FormField>
      </FormSection>
    </>
  )
}

// ─── Resumo executivo do header — status, prioridade, prazo, responsável e
// vínculo visíveis sem rolar, pra responder de cara "em que pé está e quem
// cuida" antes mesmo de abrir qualquer seção do formulário. ────────────────────
function TarefaHeaderResumo({ form }) {
  if (!form) return null
  const statusCfg = STATUS_CFG[form.status] || STATUS_CFG.pendente
  const prioCfg   = PRIORIDADE_CFG[form.prioridade] || PRIORIDADE_CFG.media
  const dataFmt   = form.data_inicio
    ? new Date(form.data_inicio).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
    : null

  const itens = [
    { key:'status', node: (
      <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:statusCfg.dot, flexShrink:0 }} />
        <span style={{ color:statusCfg.text, fontWeight:700 }}>{statusCfg.label}</span>
      </span>
    ) },
    { key:'prio', node: (
      <span style={{ color:prioCfg.text, fontWeight:700 }}>{prioCfg.label}</span>
    ) },
    dataFmt ? { key:'data', node: <span style={{ fontFamily:'var(--mono)' }}>{dataFmt}</span> } : null,
    form.responsavel_nome ? { key:'resp', node: <span>👤 {form.responsavel_nome}</span> } : null,
    (form.entidade_tipo && form.entidade_nome) ? { key:'vinc', node: <EntidadeTag tipo={form.entidade_tipo} nome={form.entidade_nome} /> } : null,
  ].filter(Boolean)

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', fontSize:11.5, color:'var(--text-muted)' }}>
      {itens.map((it, i) => (
        <span key={it.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
          {i > 0 && <span style={{ opacity:0.4 }}>·</span>}
          {it.node}
        </span>
      ))}
    </div>
  )
}

// ─── Enviar ao Calendário (Google/Outlook) ────────────────────────────────────
// Formata um datetime-local (YYYY-MM-DDTHH:mm, sem timezone) pro formato UTC
// exigido pelo .ics e pela URL do Google Calendar (YYYYMMDDTHHMMSSZ).
function toIcsUtc(dataInicioLocal, minutosDuracao = 60) {
  const inicio = new Date(dataInicioLocal)
  const fim    = new Date(inicio.getTime() + minutosDuracao * 60000)
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  return { inicio: fmt(inicio), fim: fmt(fim) }
}

function icsEscape(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function downloadIcs(tarefa) {
  if (!tarefa?.data_inicio) return
  const { inicio, fim } = toIcsUtc(tarefa.data_inicio)
  const agora = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Boostly//Tarefas//PT-BR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:tarefa-${tarefa.id}@boostly`,
    `DTSTAMP:${agora}`,
    `DTSTART:${inicio}`,
    `DTEND:${fim}`,
    `SUMMARY:${icsEscape(tarefa.titulo)}`,
    tarefa.descricao ? `DESCRIPTION:${icsEscape(tarefa.descricao)}` : null,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `tarefa-${(tarefa.titulo || 'sem-titulo').slice(0, 40).replace(/\s+/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

function googleCalendarUrl(tarefa) {
  const { inicio, fim } = toIcsUtc(tarefa.data_inicio)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: tarefa.titulo || 'Tarefa',
    dates: `${inicio}/${fim}`,
    details: tarefa.descricao || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
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
  const stEf     = statusEfetivo(tarefa)
  const atrasado = stEf!=='concluida'&&stEf!=='cancelada'&&dias!==null&&dias<0
  const urgente  = stEf!=='concluida'&&stEf!=='cancelada'&&dias!==null&&dias>=0&&dias<=2
  const cfg      = STATUS_CFG[stEf] || STATUS_CFG.pendente

  return (
    <div style={{ ...k.card, opacity:stEf==='concluida'||stEf==='cancelada'?0.7:1 }} onClick={onClick}>
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
          const colOpps = tarefas.filter(t=>statusEfetivo(t)===status)
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
              {status !== 'atrasada' && <button style={k.addBtn} onClick={()=>onAddTarefa(status)}>+ Adicionar</button>}
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

function dataParaStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

// Popup listando todas as tarefas de um dia — só abre automaticamente quando
// o dia tem mais de 3 tarefas (senão os 3 chips já visíveis na célula bastam).
function DiaTarefasPopup({ dataStr, tarefas, onEdit, onNew, onClose }) {
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1199 }} onClick={onClose} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        zIndex:1200, width:480, maxWidth:'92vw', maxHeight:'80vh',
        background:'var(--surface)', borderRadius:14, boxShadow:'0 24px 64px rgba(0,0,0,0.22)',
        display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>
              {new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--text-muted)', lineHeight:1 }}>×</button>
        </div>
        <div style={{ overflowY:'auto', padding:'12px 20px', display:'flex', flexDirection:'column', gap:6 }}>
          {tarefas.map(t => {
            const cfg = STATUS_CFG[t.status] || STATUS_CFG.pendente
            return (
              <div key={t.id} onClick={() => { onEdit(t); onClose() }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
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
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <button onClick={() => { onNew({ prazo: dataStr }); onClose() }}
            style={{ width:'100%', padding:'8px 0', border:'1px dashed var(--border)', borderRadius:8,
              background:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--accent)', fontFamily:'var(--font)' }}>
            + Nova tarefa neste dia
          </button>
        </div>
      </div>
    </>
  )
}

// Uma célula-dia da grade — usada tanto na visão Mês quanto Semana/Semana útil.
// `maxVisiveis` varia conforme a visão: semana tem menos colunas → mais altura
// por célula → cabe mais tarefa antes de precisar do "+N mais".
function CelulaDia({ data, dataStr, tarefasDia, isHoje, hoje8, borderRight, borderBottom, maxVisiveis, onEdit, onNew, onAbrirPopup }) {
  return (
    <div
      style={{ minWidth:0, minHeight:0, padding:'6px 8px', cursor:'pointer', overflow:'hidden',
        borderRight: borderRight ? '1px solid var(--border2)' : 'none',
        borderBottom: borderBottom ? '1px solid var(--border2)' : 'none',
        background: isHoje ? 'var(--accent-glow)' : 'var(--surface)',
        transition:'background .15s', display:'flex', flexDirection:'column' }}
      onClick={() => tarefasDia.length > maxVisiveis ? onAbrirPopup({ dataStr, tarefas: tarefasDia }) : onNew({ prazo: dataStr })}
      onMouseEnter={e => { if (!isHoje) e.currentTarget.style.background = 'var(--surface2)' }}
      onMouseLeave={e => { if (!isHoje) e.currentTarget.style.background = 'var(--surface)' }}>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4, flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight: isHoje ? 800 : 400,
          width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
          background: isHoje ? 'var(--accent)' : 'none',
          color: isHoje ? '#fff' : 'var(--text-soft)' }}>
          {data.getDate()}
        </span>
        {tarefasDia.length > 0 && (
          <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
            {tarefasDia.length}
          </span>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:2, overflow:'hidden' }}>
        {tarefasDia.slice(0, maxVisiveis).map(t => {
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
                cursor:'pointer', lineHeight:1.5, flexShrink:0 }}>
              {tipoIcon(t.tipo)} {t.titulo}
            </div>
          )
        })}
        {tarefasDia.length > maxVisiveis && (
          <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)', paddingLeft:4, flexShrink:0 }}>
            +{tarefasDia.length - maxVisiveis} mais
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Grade por hora (visões Semana / Semana útil) ─────────────────────────────
const HORAS = Array.from({ length: 24 }, (_, h) => h)
const ALTURA_HORA = 48 // px por hora
const DURACAO_PADRAO_MIN = 45 // tarefa só tem horário de início — usa duração fixa pra desenhar o bloco

function horaDecimal(dataInicio) {
  const t = dataInicio && dataInicio.split('T')[1]
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h + (m || 0) / 60
}

// Distribui tarefas com horário sobreposto em raias lado a lado (algoritmo guloso)
function organizarEmRaias(itens) {
  const ordenados = [...itens].sort((a, b) => a._hora - b._hora)
  const finsRaia = []
  const posicionados = ordenados.map(t => {
    const fim = t._hora + DURACAO_PADRAO_MIN / 60
    let raia = finsRaia.findIndex(f => f <= t._hora)
    if (raia === -1) { raia = finsRaia.length; finsRaia.push(fim) }
    else finsRaia[raia] = fim
    return { ...t, _raia: raia }
  })
  const totalRaias = finsRaia.length || 1
  return posicionados.map(t => ({ ...t, _totalRaias: totalRaias }))
}

// Mede a altura de um container via ResizeObserver — usado pra "encaixar" a
// faixa de horários configurada na altura disponível, sem precisar rolar.
function useAlturaContainer(ref, ativo) {
  const [altura, setAltura] = useState(0)
  useEffect(() => {
    if (!ativo || !ref.current) return
    const el = ref.current
    const obs = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect?.height
      if (h) setAltura(h)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [ativo, ref])
  return altura
}

// Bloco de uma tarefa na grade por hora — componente de módulo (não aninhado
// dentro de GradeHoras) porque precisa manter a MESMA identidade entre
// renders: como recebe Pointer Capture no pointerdown, se fosse recriado a
// cada render (ex: a cada pointermove durante o arraste) o React desmontaria
// o elemento que segurava a captura e o gesto de arrastar quebraria no meio.
function BlocoTarefa({ t, dataStr, fantasma, hoje8, agoraHoraDecimal, horaBase, alturaHora, onEdit, onIniciar, onMover, onSoltar }) {
  const [hover, setHover] = useState(false)
  const cfg = STATUS_CFG[t.status] || STATUS_CFG.pendente
  const passado = (dataStr < hoje8 || (dataStr === hoje8 && t._hora < agoraHoraDecimal))
    && t.status !== 'concluida' && t.status !== 'cancelada'
  const largura = 100 / t._totalRaias
  const h = Math.floor(t._hora), m = Math.round((t._hora % 1) * 60)
  return (
    <div
      onClick={e => { e.stopPropagation(); if (!fantasma) onEdit(t) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${t.titulo}${t.responsavel_nome ? ` · ${t.responsavel_nome}` : ''}`}
      style={{ position:'absolute', top:(t._hora - horaBase) * alturaHora + 1,
        height: (DURACAO_PADRAO_MIN / 60) * alturaHora - 2,
        left:`calc(${t._raia * largura}% + 2px)`, width:`calc(${largura}% - 4px)`,
        background: passado ? '#FEE2E2' : cfg.bg, color: passado ? '#991B1B' : cfg.text,
        borderLeft:`3px solid ${passado?'#EF4444':cfg.dot}`, borderRadius:4,
        opacity: fantasma ? 0.85 : 1, boxShadow: fantasma ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
        fontSize:10, fontWeight:600, padding:'2px 5px', overflow:'hidden',
        cursor: fantasma ? 'grabbing' : 'pointer', zIndex: fantasma ? 3 : 1 }}>
      <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight: fantasma ? 0 : 12 }}>
        {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')} {t.titulo}
      </span>
      {/* Alça de arrastar — só aparece no hover, no canto direito. O resto do card abre a edição. */}
      {!fantasma && (
        <div
          onPointerDown={e => { e.stopPropagation(); onIniciar(e, t, dataStr) }}
          onPointerMove={onMover}
          onPointerUp={onSoltar}
          onClick={e => e.stopPropagation()}
          title="Arrastar para reagendar"
          style={{ position:'absolute', top:0, right:0, bottom:0, width:13,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'grab', opacity: hover ? 1 : 0, transition:'opacity .12s',
            background:'rgba(0,0,0,0.10)', touchAction:'none' }}>
          <span style={{ fontSize:8, lineHeight:1 }}>⋮⋮</span>
        </div>
      )}
    </div>
  )
}

function GradeHoras({ dias, porDia, hoje8, horaRange, onEdit, onNew, onReschedule }) {
  const scrollRef = useRef(null)
  const rangeCustom = !(horaRange.inicio === 0 && horaRange.fim === 24)
  const horasVisiveis = HORAS.filter(h => h >= horaRange.inicio && h < horaRange.fim)
  const alturaMedida = useAlturaContainer(scrollRef, rangeCustom)
  // Faixa padrão (24h): altura fixa + rolagem. Faixa customizada: altura
  // calculada pra "otimizar" — preencher o espaço disponível sem rolar.
  const alturaHora = rangeCustom && alturaMedida > 0
    ? Math.max(28, alturaMedida / horasVisiveis.length)
    : ALTURA_HORA

  useEffect(() => {
    // faixa padrão: abre já rolado pro começo do horário comercial, em vez de 00:00
    if (!rangeCustom && scrollRef.current) scrollRef.current.scrollTop = 7 * ALTURA_HORA
  }, [rangeCustom])

  const agora = new Date()
  const agoraDataStr = dataParaStr(agora)
  const agoraHoraDecimal = agora.getHours() + agora.getMinutes() / 60

  // Arrastar um bloco pra reagendar — usa Pointer Capture no próprio bloco,
  // então o move/up continuam chegando nele mesmo que o cursor saia da
  // célula original (sem precisar de listener em document).
  const [drag, setDrag] = useState(null) // { tarefa, origDataStr, startY, startHora, novaHora, novoDataStr } | null

  function iniciarArraste(e, t, dataStrOrigem) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ tarefa: t, origDataStr: dataStrOrigem, startY: e.clientY, startHora: t._hora, novaHora: t._hora, novoDataStr: dataStrOrigem })
  }
  function moverArraste(e) {
    if (!drag) return
    const deltaHora = (e.clientY - drag.startY) / alturaHora
    const snap = Math.round((drag.startHora + deltaHora) * 4) / 4 // snap de 15min
    const novaHora = Math.min(23.75, Math.max(0, snap))
    const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-dia]')
    setDrag(d => d && ({ ...d, novaHora, novoDataStr: alvo?.dataset.dia || d.novoDataStr }))
  }
  function soltarArraste() {
    if (!drag) return
    if (drag.novaHora !== drag.startHora || drag.novoDataStr !== drag.origDataStr) {
      const hh = String(Math.floor(drag.novaHora)).padStart(2, '0')
      const mm = String(Math.round((drag.novaHora % 1) * 60)).padStart(2, '0')
      onReschedule(drag.tarefa, `${drag.novoDataStr}T${hh}:${mm}`)
    }
    setDrag(null)
  }

  return (
    <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
      {/* Tarefas sem horário definido — faixa "dia inteiro" fixa no topo */}
      <div style={{ display:'grid', gridTemplateColumns:`52px repeat(${dias.length},1fr)`,
        borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div/>
        {dias.map(data => {
          const dataStr = dataParaStr(data)
          const diaInteiro = (porDia[dataStr] || []).filter(t => horaDecimal(t.data_inicio) === null)
          return (
            <div key={dataStr} style={{ padding:'4px 6px', borderLeft:'1px solid var(--border2)', minHeight:26 }}>
              {diaInteiro.slice(0, 2).map(t => {
                const cfg = STATUS_CFG[t.status] || STATUS_CFG.pendente
                return (
                  <div key={t.id} onClick={() => onEdit(t)}
                    title={t.titulo}
                    style={{ fontSize:10, padding:'2px 6px', borderRadius:4, marginBottom:2,
                      background:cfg.bg, color:cfg.text, fontWeight:600, cursor:'pointer',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {tipoIcon(t.tipo)} {t.titulo}
                  </div>
                )
              })}
              {diaInteiro.length > 2 && (
                <div style={{ fontSize:9, color:'var(--text-muted)' }}>+{diaInteiro.length - 2}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Corpo com rolagem própria (faixa padrão) ou já ajustado à altura disponível (faixa customizada) */}
      <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:`52px repeat(${dias.length},1fr)` }}>
          {/* Coluna de horas */}
          <div>
            {horasVisiveis.map(h => (
              <div key={h} style={{ height:alturaHora, borderTop:'1px solid var(--border2)', position:'relative' }}>
                <span style={{ position:'absolute', top:-8, left:0, right:0, textAlign:'center',
                  fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)',
                  background:'var(--surface)', borderRadius:4, padding:'1px 0' }}>
                  {String(h).padStart(2,'0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {dias.map(data => {
            const dataStr = dataParaStr(data)
            // durante o arraste, a tarefa arrastada sai da lista normal desta
            // coluna — ela é redesenhada como "fantasma" na posição do drag
            const semArrastada = drag ? (porDia[dataStr] || []).filter(t => t.id !== drag.tarefa.id) : (porDia[dataStr] || [])
            const comHorario = semArrastada
              .map(t => ({ ...t, _hora: horaDecimal(t.data_inicio) }))
              .filter(t => t._hora !== null)
            const posicionadas = organizarEmRaias(comHorario)
            const mostrarAgora = dataStr === agoraDataStr

            return (
              <div key={dataStr} data-dia={dataStr}
                style={{ position:'relative', borderLeft:'1px solid var(--border2)', cursor:'pointer' }}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const h = Math.min(horaRange.fim - 1, Math.max(horaRange.inicio,
                    horaRange.inicio + Math.floor((e.clientY - rect.top) / alturaHora)))
                  onNew({ prazo: dataStr, data_inicio: `${dataStr}T${String(h).padStart(2,'0')}:00` })
                }}>
                {horasVisiveis.map(h => (
                  <div key={h} style={{ height:alturaHora, borderTop:'1px solid var(--border2)' }}/>
                ))}

                {mostrarAgora && agoraHoraDecimal >= horaRange.inicio && agoraHoraDecimal < horaRange.fim && (
                  <div style={{ position:'absolute', left:0, right:0, top:(agoraHoraDecimal - horaRange.inicio) * alturaHora, zIndex:2 }}>
                    <div style={{ borderTop:'2px solid #EF4444', position:'relative' }}>
                      <span style={{ position:'absolute', left:-4, top:-4, width:8, height:8, borderRadius:'50%', background:'#EF4444' }}/>
                    </div>
                  </div>
                )}

                {posicionadas.map(t => (
                  <BlocoTarefa key={t.id} t={t} dataStr={dataStr} hoje8={hoje8} agoraHoraDecimal={agoraHoraDecimal}
                    horaBase={horaRange.inicio} alturaHora={alturaHora}
                    onEdit={onEdit} onIniciar={iniciarArraste} onMover={moverArraste} onSoltar={soltarArraste} />
                ))}

                {drag && drag.novoDataStr === dataStr && (
                  <BlocoTarefa
                    t={{ ...drag.tarefa, _hora: drag.novaHora, _raia: 0, _totalRaias: 1 }}
                    dataStr={dataStr} hoje8={hoje8} agoraHoraDecimal={agoraHoraDecimal}
                    horaBase={horaRange.inicio} alturaHora={alturaHora}
                    onEdit={onEdit} onIniciar={iniciarArraste} onMover={moverArraste} onSoltar={soltarArraste} fantasma />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const HORA_RANGE_PADRAO = { inicio: 0, fim: 24 }

// Popover da engrenagem — define a faixa de horários exibida nas visões
// Semana/Semana útil (ex: 08–18h), otimizando o uso da altura disponível.
function ConfigHorarioPopover({ horaRange, onSave, onClose }) {
  const [inicio, setInicio] = useState(horaRange.inicio)
  const [fim, setFim] = useState(horaRange.fim)
  const selectStyle = { width:'100%', padding:'6px 8px', border:'1px solid var(--border)', borderRadius:6,
    background:'var(--surface)', color:'var(--text)', fontSize:12, fontFamily:'var(--font)' }
  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:1199 }} onClick={onClose}/>
      <div onClick={e => e.stopPropagation()} style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:1200, width:250,
        background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
        boxShadow:'0 8px 24px rgba(0,0,0,0.14)', padding:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Faixa de horários exibida</div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10, lineHeight:1.4 }}>
          Ajusta a grade das visões Semana e Semana útil pra caber melhor o horário que você usa, sem precisar rolar.
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end', marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:10, color:'var(--text-muted)', display:'block', marginBottom:3 }}>Início</label>
            <select value={inicio} onChange={e => setInicio(Number(e.target.value))} style={selectStyle}>
              {HORAS.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
            </select>
          </div>
          <span style={{ color:'var(--text-muted)', paddingBottom:7 }}>–</span>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:10, color:'var(--text-muted)', display:'block', marginBottom:3 }}>Fim</label>
            <select value={fim} onChange={e => setFim(Number(e.target.value))} style={selectStyle}>
              {HORAS.filter(h => h > 0).concat(24).map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
            </select>
          </div>
        </div>
        {fim <= inicio && (
          <div style={{ fontSize:11, color:'#DC2626', marginBottom:8 }}>O fim precisa ser depois do início.</div>
        )}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { setInicio(HORA_RANGE_PADRAO.inicio); setFim(HORA_RANGE_PADRAO.fim) }}
            style={{ flex:1, padding:'7px 0', border:'1px solid var(--border)', borderRadius:7, background:'none',
              color:'var(--text-muted)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>
            Padrão (24h)
          </button>
          <button onClick={() => { if (fim > inicio) { onSave({ inicio, fim }); onClose() } }}
            disabled={fim <= inicio}
            style={{ flex:1, padding:'7px 0', border:'none', borderRadius:7,
              background: fim > inicio ? 'var(--accent)' : 'var(--border)', color:'#fff', fontSize:12, fontWeight:600,
              cursor: fim > inicio ? 'pointer' : 'not-allowed', fontFamily:'var(--font)' }}>
            Aplicar
          </button>
        </div>
      </div>
    </>
  )
}

const VISOES_CAL = [{ v:'mes', l:'Mês' }, { v:'semana', l:'Semana' }, { v:'semana_util', l:'Semana útil' }]

function CalendarioView({ tarefas, sessao, onEdit, onNew, onReschedule }) {
  const hoje = new Date()
  const [refDate, setRefDate] = useState(hoje)
  const [visao, setVisao] = useLocalState('tarefas:calendario_visao_v1', 'mes') // 'mes' | 'semana' | 'semana_util'
  const [meusFiltro, setMeusFiltro] = useState(true) // padrão: só as do usuário logado
  const [diaPopup, setDiaPopup] = useState(null) // { dataStr, tarefas } | null
  const [semPrazoAberto, setSemPrazoAberto] = useLocalState('tarefas:calendario_semprazo_aberto_v1', true)
  const [horaRange, setHoraRange] = useLocalState('tarefas:calendario_hora_range_v1', HORA_RANGE_PADRAO)
  const [configAberta, setConfigAberta] = useState(false)

  const tarefasFiltradas = useMemo(() => {
    if (!meusFiltro || !sessao) return tarefas
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

  const hoje8 = hoje.toISOString().slice(0,10)
  const semPrazo = tarefasFiltradas.filter(t => !t.prazo && t.status !== 'concluida' && t.status !== 'cancelada')

  // Monta as células e o título do período conforme a visão ativa
  const { celulas, linhas, colunas, diasSemanaLabels, titulo } = useMemo(() => {
    if (visao === 'mes') {
      const ano = refDate.getFullYear(), mes = refDate.getMonth()
      const primeiroDia   = new Date(ano, mes, 1)
      const ultimoDia     = new Date(ano, mes + 1, 0)
      const diasNoMes     = ultimoDia.getDate()
      const offsetInicio  = primeiroDia.getDay() // 0=Dom
      const totalCelulas  = offsetInicio + diasNoMes
      const linhas        = Math.ceil(totalCelulas / 7)
      const cels = []
      for (let i = 0; i < offsetInicio; i++) cels.push(null)
      for (let d = 1; d <= diasNoMes; d++) cels.push(new Date(ano, mes, d))
      while (cels.length < linhas * 7) cels.push(null)
      return { celulas: cels, linhas, colunas: 7, diasSemanaLabels: DIAS_SEMANA, titulo: `${MESES[mes]} ${ano}` }
    }
    // semana / semana_util — semana começa no domingo que contém refDate
    const dow = refDate.getDay()
    const domingo = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - dow)
    const dias = visao === 'semana_util'
      ? Array.from({ length: 5 }, (_, i) => new Date(domingo.getFullYear(), domingo.getMonth(), domingo.getDate() + 1 + i))
      : Array.from({ length: 7 }, (_, i) => new Date(domingo.getFullYear(), domingo.getMonth(), domingo.getDate() + i))
    const primeiro = dias[0], ultimo = dias[dias.length - 1]
    const titulo = primeiro.getMonth() === ultimo.getMonth()
      ? `${primeiro.getDate()} – ${ultimo.getDate()} de ${MESES[primeiro.getMonth()]} ${primeiro.getFullYear()}`
      : `${primeiro.getDate()} de ${MESES[primeiro.getMonth()]} – ${ultimo.getDate()} de ${MESES[ultimo.getMonth()]} ${ultimo.getFullYear()}`
    const labels = visao === 'semana_util' ? DIAS_SEMANA.slice(1, 6) : DIAS_SEMANA
    return { celulas: dias, linhas: 1, colunas: dias.length, diasSemanaLabels: labels, titulo }
  }, [visao, refDate])

  function navegar(delta) {
    if (visao === 'mes') {
      setRefDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1))
    } else {
      setRefDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta * 7))
    }
  }

  const maxVisiveis = 3 // só usado na visão Mês — Semana/Semana útil usam a grade por hora

  const segmented = { display:'flex', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', flexShrink:0 }
  const segBtn = (ativo) => ({ padding:'6px 14px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
    fontFamily:'var(--font)', whiteSpace:'nowrap',
    background: ativo ? 'var(--accent)' : 'var(--surface)',
    color:       ativo ? '#fff'          : 'var(--text-muted)' })

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0, gap:12 }}>
      {/* Barra superior */}
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', flexShrink:0 }}>
        {/* Navegação do período */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => navegar(-1)}
            style={{ width:32, height:32, border:'1px solid var(--border)', borderRadius:7,
              background:'var(--surface)', cursor:'pointer', fontSize:16, color:'var(--text-soft)' }}>‹</button>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--text)', minWidth:180, textAlign:'center' }}>
            {titulo}
          </span>
          <button onClick={() => navegar(1)}
            style={{ width:32, height:32, border:'1px solid var(--border)', borderRadius:7,
              background:'var(--surface)', cursor:'pointer', fontSize:16, color:'var(--text-soft)' }}>›</button>
          <button onClick={() => setRefDate(new Date())}
            style={{ height:32, padding:'0 12px', border:'1px solid var(--border)', borderRadius:7,
              background:'var(--surface)', cursor:'pointer', fontSize:12, color:'var(--text-soft)', fontFamily:'var(--font)' }}>
            Hoje
          </button>
        </div>

        <div style={{ flex:1 }}/>

        {/* Visão: Mês / Semana / Semana útil */}
        <div style={segmented}>
          {VISOES_CAL.map(opt => (
            <button key={opt.v} onClick={() => setVisao(opt.v)} style={segBtn(visao === opt.v)}>{opt.l}</button>
          ))}
        </div>

        {/* Filtro: minhas / todas */}
        <div style={segmented}>
          {[{v:true,l:'Minhas'},{v:false,l:'Todas'}].map(opt => (
            <button key={String(opt.v)} onClick={() => setMeusFiltro(opt.v)} style={segBtn(meusFiltro === opt.v)}>{opt.l}</button>
          ))}
        </div>

        {/* Legenda status */}
        <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
          {Object.entries(STATUS_CFG).map(([k, cfg]) => (
            <span key={k} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, display:'inline-block' }}/>
              {cfg.label}
            </span>
          ))}
        </div>

        {/* Engrenagem — faixa de horários (só afeta Semana/Semana útil) */}
        {visao !== 'mes' && (
          <div style={{ position:'relative', flexShrink:0 }}>
            <button onClick={() => setConfigAberta(o => !o)} title="Faixa de horários exibida"
              style={{ width:32, height:32, border:'1px solid var(--border)', borderRadius:7,
                background: configAberta ? 'var(--surface2)' : 'var(--surface)', cursor:'pointer', fontSize:14 }}>
              ⚙
            </button>
            {configAberta && (
              <ConfigHorarioPopover horaRange={horaRange} onSave={setHoraRange} onClose={() => setConfigAberta(false)} />
            )}
          </div>
        )}
      </div>

      {/* Grade do calendário — preenche a altura disponível, nunca estoura a tela */}
      <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column',
        background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {visao === 'mes' ? (
          <>
            {/* Cabeçalho dias da semana */}
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${colunas},1fr)`,
              borderBottom:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 }}>
              {diasSemanaLabels.map(d => (
                <div key={d} style={{ padding:'8px 0', textAlign:'center', fontSize:11,
                  fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Células */}
            <div style={{ flex:1, minHeight:0, display:'grid',
              gridTemplateColumns:`repeat(${colunas},1fr)`, gridTemplateRows:`repeat(${linhas},1fr)` }}>
              {celulas.map((data, idx) => {
                const col = idx % colunas
                const row = Math.floor(idx / colunas)
                if (!data) {
                  return (
                    <div key={`b-${idx}`} style={{ minWidth:0, minHeight:0,
                      borderRight: col < colunas - 1 ? '1px solid var(--border2)' : 'none',
                      borderBottom: row < linhas - 1 ? '1px solid var(--border2)' : 'none',
                      background:'var(--surface2)', opacity:.5 }}/>
                  )
                }
                const dataStr = dataParaStr(data)
                return (
                  <CelulaDia key={dataStr} data={data} dataStr={dataStr} tarefasDia={porDia[dataStr] || []}
                    isHoje={dataStr === hoje8} hoje8={hoje8} maxVisiveis={maxVisiveis}
                    borderRight={col < colunas - 1} borderBottom={row < linhas - 1}
                    onEdit={onEdit} onNew={onNew} onAbrirPopup={setDiaPopup} />
                )
              })}
            </div>
          </>
        ) : (
          <>
            {/* Cabeçalho dias da semana — com número do dia, já que a grade por hora não repete */}
            <div style={{ display:'grid', gridTemplateColumns:`52px repeat(${colunas},1fr)`,
              borderBottom:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 }}>
              <div/>
              {celulas.map(data => {
                const dataStr = dataParaStr(data)
                const isHoje = dataStr === hoje8
                return (
                  <div key={dataStr} style={{ padding:'6px 0 8px', textAlign:'center', borderLeft:'1px solid var(--border2)' }}>
                    <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      {DIAS_SEMANA[data.getDay()]}
                    </div>
                    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', marginTop:2,
                      width:24, height:24, borderRadius:'50%', fontSize:13, fontWeight: isHoje ? 800 : 400,
                      background: isHoje ? 'var(--accent)' : 'none', color: isHoje ? '#fff' : 'var(--text-soft)' }}>
                      {data.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>
            <GradeHoras dias={celulas} porDia={porDia} hoje8={hoje8} horaRange={horaRange}
              onEdit={onEdit} onNew={onNew} onReschedule={onReschedule} />
          </>
        )}
      </div>

      {/* Tarefas sem prazo — colapsável, com rolagem própria (nunca estoura a tela) */}
      {semPrazo.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, flexShrink:0,
          maxHeight: semPrazoAberto ? 220 : 40, overflow:'hidden', transition:'max-height .15s' }}>
          <button onClick={() => setSemPrazoAberto(o => !o)}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 18px', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Sem prazo definido ({semPrazo.length})
            </span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{semPrazoAberto ? '▲' : '▼'}</span>
          </button>
          {semPrazoAberto && (
            <div style={{ overflowY:'auto', maxHeight:170, padding:'0 18px 14px', display:'flex', flexDirection:'column', gap:6 }}>
              {semPrazo.map(t => {
                const cfg = STATUS_CFG[t.status] || STATUS_CFG.pendente
                return (
                  <div key={t.id} onClick={() => onEdit(t)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                      background:'var(--surface2)', borderRadius:8, cursor:'pointer',
                      border:'1px solid var(--border2)', transition:'border-color .15s', flexShrink:0 }}
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
          )}
        </div>
      )}

      {diaPopup && (
        <DiaTarefasPopup dataStr={diaPopup.dataStr} tarefas={diaPopup.tarefas}
          onEdit={onEdit} onNew={onNew} onClose={() => setDiaPopup(null)} />
      )}
    </div>
  )
}

export default function Tarefas() {
  const { profile: sessao } = useProfile()
  const { tarefas, save: saveTarefa, remove: deleteTarefa, bulkSetStatus: bulkTarefaStatus } = useTasks()
  const { registrar: log } = useAuditLog()
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

  // `overrides` vem do Kanban como string de status, ou do Calendário como
  // objeto de campos a pré-preencher (ex: { prazo, data_inicio } ao clicar
  // num dia/horário vazio).
  function openNew(overrides) {
    const extra = typeof overrides === 'string' ? { status: overrides } : (overrides || {})
    setForm({ ...EMPTY_FORM, ...extra })
    setEditItem({ _new: true })
  }
  function openEdit(tarefa) {
    setForm({ ...tarefa })
    setEditItem(tarefa)
  }
  function closeSlideOver() { setEditItem(null); setForm(null) }

  // Reagendar por arrastar-e-soltar na grade por hora — salva direto, sem abrir o formulário
  function handleReschedule(tarefa, novaDataInicio) {
    saveTarefa({ ...tarefa, data_inicio: novaDataInicio, prazo: novaDataInicio.slice(0, 10) })
  }

  function handleSave() {
    if (!form?.titulo?.trim())      { setErrs({ titulo: 'Título é obrigatório' }); return }
    if (!form?.data_inicio?.trim()) { setErrs({ data_inicio: 'Data e Hora de Início é obrigatória' }); return }
    if (!form?.responsavel_id)      { setErrs({ responsavel_id: 'Responsável é obrigatório' }); return }
    setErrs({})
    const isNew = !!editItem?._new
    const saved = isNew ? { ...form, id: novoId(), criado: new Date().toISOString().slice(0, 10) } : { ...form }
    saveTarefa(saved)
    log(isNew ? 'criar' : 'editar', 'tarefa', saved.id, { descricao: `Tarefa ${isNew ? 'criada' : 'editada'}: ${saved.titulo || ''}` })
    if (isNew && saved.entidade_tipo === 'oportunidade' && saved.entidade_id && saved.data_inicio) {
      supabase.from('oportunidades').select('custom_fields').eq('id', saved.entidade_id).single()
        .then(({ data: cur }) => {
          const cf = cur?.custom_fields || {}
          supabase.from('oportunidades').update({ custom_fields: { ...cf, proxima_acao_data: saved.data_inicio } }).eq('id', saved.entidade_id)
        })
    }
    closeSlideOver()
  }

  function handleDelete() {
    const id = editItem.id || form.id
    log('excluir', 'tarefa', id, { descricao: `Tarefa excluída: ${form?.titulo || id}` })
    deleteTarefa(id)
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
  const [filterDateFrom, setFilterDateFrom]     = useLocalState('tarefas:filterDateFrom', '')
  const [filterDateTo, setFilterDateTo]         = useLocalState('tarefas:filterDateTo', '')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tarefas.filter(t => {
      if (filterStatus.length     && !filterStatus.includes(t.status))          return false
      if (filterTipo.length       && !filterTipo.includes(t.tipo))              return false
      if (filterPrioridade.length && !filterPrioridade.includes(t.prioridade))  return false
      if (filterEntidade.length   && !filterEntidade.includes(t.entidade_tipo)) return false
      if (filterDateFrom && t.data_inicio && t.data_inicio.slice(0, 10) < filterDateFrom) return false
      if (filterDateTo   && t.data_inicio && t.data_inicio.slice(0, 10) > filterDateTo)   return false
      if (q && !(t.titulo.toLowerCase().includes(q) || (t.entidade_nome||'').toLowerCase().includes(q) || (t.responsavel||'').toLowerCase().includes(q))) return false
      return true
    })
  }, [tarefas, search, filterStatus, filterTipo, filterPrioridade, filterEntidade, filterDateFrom, filterDateTo])

  const hoje = new Date().toISOString().slice(0, 10)

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
    { key: 'status', label: 'Status', width: 140, render: (v, row) => <StatusBadge status={statusEfetivo(row)} /> },
    { key: 'prazo', label: 'Prazo', width: 110, render: (v, row) => {
      const dias = diasRestantes(v)
      const stEf = statusEfetivo(row)
      const atrasado = stEf!=='concluida'&&stEf!=='cancelada'&&dias!==null&&dias<0
      const urgente  = stEf!=='concluida'&&stEf!=='cancelada'&&dias!==null&&dias>=0&&dias<=2
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

  const kpisNode = (data) => {
    const pendentes  = data.filter(t => { const s = statusEfetivo(t); return s === 'pendente' || s === 'em_andamento' }).length
    const concluidas = data.filter(t => t.status === 'concluida').length
    const atrasadas  = data.filter(t => statusEfetivo(t) === 'atrasada').length
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, paddingTop:4 }}>
        <KpiCard label="Total de tarefas" value={data.length} />
        <KpiCard label="Abertas"          value={pendentes} accent />
        <KpiCard label="Concluídas"       value={concluidas} />
        <KpiCard label="Atrasadas"        value={atrasadas} red />
      </div>
    )
  }

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
      subtitle={isNew ? 'Preencha os dados da tarefa' : `${tipoIcon(form?.tipo)} ${tiposTarefa.find(t => (t.slug||t.key||t.id) === form?.tipo)?.label || ''}`}
      headerExtra={!isNew ? <TarefaHeaderResumo form={form} /> : undefined}
      saveLabel={isNew ? 'Criar tarefa' : 'Salvar alterações'}
      columns={2}
      onDelete={!isNew ? handleDelete : undefined}
      deleteConfirm="Excluir esta tarefa permanentemente?"
      footerLeft={!isNew && form?.data_inicio ? (
        <>
          <button type="button" onClick={() => downloadIcs(form)} title="Baixar arquivo .ics (Outlook, Apple Calendar)"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:6,
              border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text-soft)',
              fontSize:12, fontWeight:600, fontFamily:'var(--font)', cursor:'pointer' }}>
            📅 Baixar .ics
          </button>
          <a href={googleCalendarUrl(form)} target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:6,
              border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text-soft)',
              fontSize:12, fontWeight:600, fontFamily:'var(--font)', cursor:'pointer', textDecoration:'none' }}>
            📅 Google Calendar
          </a>
        </>
      ) : undefined}
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
        <div style={{ flex:1, minHeight:0, overflow:'hidden', padding:20 }}>
          <CalendarioView tarefas={tarefas} sessao={sessao} onEdit={openEdit} onNew={openNew} onReschedule={handleReschedule} />
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
        modulo="tarefas"
        columns={columns}
        data={filtered}
        keyField="id"
        kpis={kpisNode}
        kpisLabel="Indicadores"
        filters={filterDefs}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        extraFilters={
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:8 }}>
              Data de Início
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'De',  value: filterDateFrom, set: setFilterDateFrom },
                { label:'Até', value: filterDateTo,   set: setFilterDateTo   },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
                  <input type="date" value={value} onChange={e => set(e.target.value)}
                    style={{ width:'100%', boxSizing:'border-box', padding:'7px 9px',
                      borderRadius:7, border:'1px solid var(--border)',
                      background:'var(--surface2)', color:'var(--text)',
                      fontSize:12, fontFamily:'var(--mono)', outline:'none' }} />
                </div>
              ))}
            </div>
          </div>
        }
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
        newLabel="Nova tarefa"
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
