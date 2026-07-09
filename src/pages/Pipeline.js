import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useFunnels } from '../hooks/useFunnels'
import { usePlaybooks } from '../hooks/usePlaybooks'
import { useTasks } from '../hooks/useTasks'
import { useOppMembros } from '../hooks/useOppMembros'
import MetricasStrip from '../components/MetricasStrip'
import { MOCK_EMPRESAS } from '../data/mockEmpresas'
import { MOCK_TAREFAS } from '../data/mockTarefas'
import { useProducts } from '../hooks/useProducts'
import { MOCK_LOGS_OPORTUNIDADE } from '../data/mockLogsOportunidade'
import { MOCK_ATIVIDADES } from '../data/mockAtividades'
import { MOCK_MEMBROS_OPP, PAPEIS, PERSONAS } from '../data/mockMembroOportunidade'
import { useSellers } from '../hooks/useSellers'
import { useContacts } from '../hooks/useContacts'
import { MOCK_CONTATOS, CONTATOS_STORAGE_KEY } from '../data/mockContatos'
import {
  MOCK_TEMPLATES as MOCK_Q_TEMPLATES,
  MOCK_SUBMISSIONS as MOCK_Q_SUBMISSIONS,
  STORAGE_KEY_TEMPLATES as Q_STORAGE_TEMPLATES,
  STORAGE_KEY_SUBMISSIONS as Q_STORAGE_SUBMISSIONS,
  TIPO_CFG as Q_TIPO_CFG,
  STATUS_CFG as Q_STATUS_CFG,
} from '../data/mockQuestionarios'
import {
  MOCK_DOCS,
  STORAGE_KEY_DOCS as DOCS_MODULE_KEY,
  CATEGORIA_CFG as DOC_CATEGORIA_CFG,
} from '../data/mockDocumentos'

import {
  MOCK_PLAYBOOKS, MOCK_FUNNEL_STEPS, MOCK_REFERENCES, MOCK_RESOURCES,
  PB_STORAGE_KEY, PB_STEPS_STORAGE_KEY, PB_REFS_STORAGE_KEY, PB_RESOURCES_STORAGE_KEY,
  STAGE_CFG, RESOURCE_CFG,
} from '../data/mockPlaybooks'
import { useLocalState } from '../hooks/useLocalState'
import { STORAGE_KEY as TIPOS_ACAO_KEY } from './settings/TiposAcao'
import { useDocuments } from '../hooks/useDocuments'
import { useOpportunities } from '../hooks/useOpportunities'
import { useCompanies } from '../hooks/useCompanies'
import SearchSelect from '../components/SearchSelect'
import ActionFeedback from '../components/ActionFeedback'
import { useCustomFields, CF_TYPES, cfDefaultValue } from '../hooks/useCustomFields'
import { useFormLayout } from '../hooks/useFormLayout'
import { useContracts } from '../hooks/useContracts'
import { useUsuarios } from '../hooks/useUsuarios'
import { useBranches } from '../hooks/useBranches'
import { useParceiros } from '../hooks/useParceiros'
import { useProjects } from '../hooks/useProjects'
import { useQuestionnaires } from '../hooks/useQuestionnaires'
import DynamicFormLayout from '../components/DynamicFormLayout'
import { StickyNote, Mail, MessageCircle, Phone, SlidersHorizontal, ChevronDown, ChevronUp, MoreHorizontal, Filter, X, Check } from 'lucide-react'
import Button from '../components/Button'
import SlideOver from '../components/ui/SlideOver'
import PageHeader from '../components/ui/PageHeader'
import { useAuditLog } from '../hooks/useAuditLog'
import { useCustomerHealth } from '../hooks/useCustomerHealth'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'

// ─── Constantes ───────────────────────────────────────────────────────────────
const STORAGE_KEY_OPP_PROPOSALS = 'opp:proposals_v1'

const ORIGEM_COLORS = {
  Inbound:    { color:'#10B981', bg:'rgba(16,185,129,0.10)', text:'#059669' },
  Outbound:   { color:'#3B82F6', bg:'rgba(59,130,246,0.10)', text:'#2563EB' },
  Canal:      { color:'var(--accent)', bg:'rgba(139,92,246,0.10)', text:'var(--accent)' },
  Indicação:  { color:'#F59E0B', bg:'rgba(245,158,11,0.10)', text:'#D97706' },
  Evento:     { color:'#EC4899', bg:'rgba(236,72,153,0.10)', text:'#DB2777' },
  Prospecção: { color:'#6B7280', bg:'rgba(107,114,128,0.10)', text:'#4B5563' },
}
const ORIGENS = Object.keys(ORIGEM_COLORS)

// ─── Constantes de tarefas (replicadas do módulo Tarefas) ─────────────────────
const TIPOS_TAREFA_PADRAO = [
  { label:'Ligação',   icon:'📞' },
  { label:'Email',     icon:'✉' },
  { label:'Reunião',   icon:'🗓' },
  { label:'Visita',    icon:'🚗' },
  { label:'Proposta',  icon:'📄' },
  { label:'Follow-up', icon:'🔁' },
  { label:'Outro',     icon:'☑' },
]
// Mantido para compatibilidade com dados existentes (strings antigas em minúsculo)
const TIPOS_TAREFA  = ['ligação','email','reunião','visita','proposta','follow-up','outro']
const TIPO_ICONS    = { 'ligação':'📞','email':'✉','reunião':'🗓','visita':'🚗','proposta':'📄','follow-up':'🔁','outro':'☑' }
const STATUS_TAREFA = {
  pendente:    { label:'Pendente',    color:'#F59E0B', bg:'#FEF3C7', text:'#92400E' },
  em_andamento:{ label:'Em andamento',color:'#3B82F6', bg:'#DBEAFE', text:'#1E3A5F' },
  concluida:   { label:'Concluída',   color:'#10B981', bg:'#D1FAE5', text:'#065F46' },
  cancelada:   { label:'Cancelada',   color:'#9CA3AF', bg:'#F3F4F6', text:'#6B7280' },
}
const PRIORIDADE_TAREFA = {
  baixa:{ label:'Baixa',color:'#6B7280',bg:'#F3F4F6',text:'#374151' },
  media:{ label:'Média',color:'#3B82F6',bg:'#DBEAFE',text:'#1E3A5F' },
  alta: { label:'Alta', color:'#F59E0B',bg:'#FEF3C7',text:'#92400E' },
  urgente:{ label:'Urgente',color:'#EF4444',bg:'#FEE2E2',text:'#991B1B' },
}
const EMPTY_TAREFA = { titulo:'', tipo:'ligação', status:'pendente', prioridade:'media', data_inicio:'', responsavel_id:'', responsavel_nome:'', descricao:'' }


// ─── Mock de oportunidades ────────────────────────────────────────────────────
// Em produção: SELECT * FROM oportunidades WHERE organization_id = ? AND funil_id = ?

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoeda(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toLocaleString('pt-BR')}`
}
function fmtData(d) {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y.slice(2)}`
}
function diasRestantes(prazo) {
  if (!prazo) return null
  return Math.ceil((new Date(prazo) - new Date()) / 86400000)
}
function novoId() { return Date.now() + Math.random() }

const SITUACOES = {
  em_andamento: { label:'Em andamento', color:'#3B82F6', bg:'#DBEAFE', text:'#1E3A5F', icon:'🔵' },
  suspensa:     { label:'Suspensa',     color:'#F59E0B', bg:'#FEF3C7', text:'#92400E', icon:'⏸' },
  perdida:      { label:'Perdida',      color:'#EF4444', bg:'#FEE2E2', text:'#991B1B', icon:'✕' },
  ganha:        { label:'Ganha',        color:'#10B981', bg:'#D1FAE5', text:'#065F46', icon:'✓' },
}

const CAMPANHAS_PADRAO = [
  'Inbound orgânico',
  'Outbound prospecção',
  'Canal de parceiros',
  'Indicação de cliente',
  'Evento / feira',
  'Campanha de marketing',
  'Cold outreach',
]

const MOTIVOS_PERDA_PADRAO = [
  'Preço acima do orçamento',
  'Escolheu concorrente',
  'Projeto cancelado',
  'Timing inadequado',
  'Falta de verba / budget cortado',
  'Sem decisão / negociação paralisada',
  'Produto não atende necessidade',
  'Contato perdido',
]

const EMPTY_OPP = {
  titulo:'', empresa_id:null, empresa_nome:'',
  primary_contact_id:null, primary_contact_nome:'',
  valor_cdu:0, valor_sms:0, valor_servico:0, valor_desconto:0,
  valor:0,
  prazo:'', responsavel:'', origem:'Inbound', etapa_id:null,
  playbook_id: null,
  campanha_id: null,
  situacao:'em_andamento', motivo_perda:'',
  custom_fields: {},
}

// ─── Autocomplete de Seller/Responsável ──────────────────────────────────────
function SellerSelect({ value, onChange, style }) {
  const { usuarios } = useUsuarios()
  return (
    <div>
      <select
        style={{ ...m.input, ...style }}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— Responsável —</option>
        {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
      </select>
    </div>
  )
}

// ─── Autocomplete de Empresa ──────────────────────────────────────────────────
function EmpresaSearch({ value, label, onChange, partnerSellerId, onCreateDraft }) {
  const [query, setQuery] = useState(label || '')
  const [open, setOpen]   = useState(false)
  const { companies }     = useCompanies()
  const ref               = useRef(null)

  useEffect(() => { setQuery(label || '') }, [label])
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const baseCompanies = useMemo(() => {
    if (!partnerSellerId) return companies
    return companies.filter(e => String(e.resp_ar_id || '') === String(partnerSellerId))
  }, [companies, partnerSellerId])

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    return baseCompanies
      .filter(e => (e.fantasia || e.razao || '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, baseCompanies])

  const showDraft = onCreateDraft && query.trim().length >= 2 && !opts.some(e => (e.fantasia || e.razao || '').toLowerCase() === query.trim().toLowerCase())

  function getNome(e) { return e.fantasia || e.razao || '' }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input style={{ ...m.input, paddingRight: value ? 28 : 12 }}
          placeholder="Selecione a empresa…" value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null,'') }}
          onFocus={() => setOpen(true)} />
        {value && (
          <button type="button" onClick={() => { onChange(null,''); setQuery('') }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, padding:0 }}>✕</button>
        )}
      </div>
      {open && (opts.length > 0 || showDraft) && (
        <div style={ar.dropdown}>
          {opts.map(e => (
            <button type="button" key={e.id} style={ar.option}
              onMouseDown={() => { onChange(e.id, getNome(e)); setQuery(getNome(e)); setOpen(false) }}>
              <span style={ar.optAvatar}>{getNome(e).slice(0,2).toUpperCase()}</span>
              <span>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{getNome(e)}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{e.cnpj}</div>
              </span>
            </button>
          ))}
          {showDraft && (
            <button type="button" style={{ ...ar.option, borderTop: opts.length ? '1px solid var(--border)' : 'none' }}
              onMouseDown={async () => {
                const nova = await onCreateDraft(query.trim())
                if (nova) { onChange(nova.id, nova.nome); setQuery(nova.nome) }
                setOpen(false)
              }}>
              <span style={{ ...ar.optAvatar, background:'#E0F2FE', color:'#0369A1', fontSize:14 }}>+</span>
              <span>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>Criar "{query.trim()}" como rascunho</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>Nova empresa · Rascunho</div>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Autocomplete de Contato (filtra por empresa) ────────────────────────────
function ContatoSearch({ value, label, empresaId, allContatos, onChange }) {
  const [query, setQuery]   = useState(label || '')
  const [open, setOpen]     = useState(false)
  const ref                 = useRef(null)

  useEffect(() => { setQuery(label || '') }, [label])
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    const base = empresaId
      ? allContatos.filter(c => c.empresa_id === Number(empresaId))
      : allContatos
    return base
      .filter(c => !q || c.nome.toLowerCase().includes(q) || (c.cargo||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, empresaId, allContatos])

  const placeholder = empresaId
    ? 'Selecione o contato…'
    : 'Selecione o contato…'

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input style={{ ...m.input, paddingRight: value ? 28 : 12 }}
          placeholder={placeholder} value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null,'') }}
          onFocus={() => setOpen(true)} />
        {value && (
          <button type="button" onClick={() => { onChange(null,''); setQuery('') }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, padding:0 }}>✕</button>
        )}
      </div>
      {open && opts.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, right:0, zIndex:400,
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
          {opts.map(c => (
            <div key={c.id}
              onMouseDown={() => { onChange(c.id, c.nome); setQuery(c.nome); setOpen(false) }}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                cursor:'pointer', background: value===c.id ? 'var(--surface2)' : 'transparent',
                borderLeft:`3px solid ${value===c.id ? 'var(--accent)' : 'transparent'}` }}
              onMouseEnter={e => { if (value!==c.id) e.currentTarget.style.background='var(--surface2)' }}
              onMouseLeave={e => { if (value!==c.id) e.currentTarget.style.background='transparent' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'#EDE9FE',
                color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0 }}>
                {(c.nome||'?').charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap',
                  overflow:'hidden', textOverflow:'ellipsis' }}>{c.nome}</div>
                {c.cargo && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.cargo}</div>}
              </div>
            </div>
          ))}
          {!empresaId && (
            <div style={{ padding:'6px 12px', fontSize:11, color:'var(--text-muted)',
              borderTop:'1px solid var(--border2)', background:'var(--surface2)' }}>
              Selecione uma empresa para filtrar os contatos
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const ar = {
  dropdown: { position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)', zIndex:100, overflow:'hidden', maxHeight:240, overflowY:'auto' },
  option:   { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left' },
  optAvatar:{ width:28, height:28, borderRadius:6, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0, border:'1px solid rgba(30,58,95,0.12)' },
}

// ─── Aba de Produtos da Oportunidade ─────────────────────────────────────────

const COB_LABEL = { mensal:'MRR', anual:'Anual', unico:'Único' }
const COB_BG    = { mensal:'#DBEAFE', anual:'#EDE9FE', unico:'#FEF3C7' }
const COB_TEXT  = { mensal:'#1E3A5F', anual:'#4C1D95', unico:'#92400E' }

function fmtBRL(v) {
  return Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 })
}

function ProdutoSearch({ onAdd }) {
  const [q, setQ]           = useState('')
  const [open, setOpen]     = useState(false)
  const ref                 = useRef(null)
  const { produtos }        = useProducts()
  const produtosAtivos      = (produtos || []).filter(p => p.status === 'ativo')

  const sugestoes = useMemo(() => {
    if (!q.trim()) return produtosAtivos.slice(0, 6)
    const lq = q.toLowerCase()
    return produtosAtivos.filter(p =>
      (p.nome||'').toLowerCase().includes(lq) || (p.codigo||'').toLowerCase().includes(lq)
    ).slice(0, 8)
  }, [q, produtosAtivos])

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function selectProduto(p) {
    onAdd(p)
    setQ('')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position:'relative', flex:1 }}>
      <input
        style={{ ...m.input, width:'100%' }}
        placeholder="Buscar produto por nome ou código…"
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && sugestoes.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--surface)',
          border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,.12)',
          zIndex:200, maxHeight:220, overflowY:'auto', marginTop:4 }}>
          {sugestoes.map(p => (
            <div key={p.id} onClick={() => selectProduto(p)}
              style={{ padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                borderBottom:'1px solid var(--border2)' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.nome}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{p.codigo}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                background: COB_BG[p.cobranca]||'#f3f4f6', color: COB_TEXT[p.cobranca]||'#374151' }}>
                {COB_LABEL[p.cobranca]||p.cobranca}
              </span>
              <span style={{ fontSize:12, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)', whiteSpace:'nowrap' }}>
                {fmtBRL(p.preco)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OppProdutosTab({ itens, onChange, onSyncValor }) {
  function addProduto(p) {
    const jaExiste = itens.find(i => i.produto_id === p.id)
    if (jaExiste) {
      // incrementa quantidade
      onChange(itens.map(i => i.produto_id===p.id
        ? recalc({ ...i, quantidade: i.quantidade + 1 })
        : i
      ))
      return
    }
    onChange([...itens, recalc({
      produto_id:    p.id,
      produto_nome:  p.nome,
      produto_codigo:p.codigo,
      tipo:          p.tipo,
      cobranca:      p.cobranca,
      desconto_max:  p.desconto_max || 0,
      quantidade:    1,
      preco_unitario: p.preco,
      desconto_pct:  0,
      subtotal:      p.preco,
    })])
  }

  function recalc(item) {
    const base     = Number(item.preco_unitario || 0)
    const qty      = Number(item.quantidade     || 1)
    const desc     = Math.min(Number(item.desconto_pct||0), item.desconto_max||0)
    const subtotal = base * qty * (1 - desc / 100)
    return { ...item, desconto_pct: Number(item.desconto_pct||0), subtotal }
  }

  function updateItem(id, field, value) {
    onChange(itens.map(i => i.produto_id===id ? recalc({ ...i, [field]: value }) : i))
  }

  function removeItem(id) { onChange(itens.filter(i => i.produto_id !== id)) }

  const totalMRR    = itens.filter(i=>i.cobranca==='mensal').reduce((s,i)=>s+i.subtotal,0)
  const totalAnual  = itens.filter(i=>i.cobranca==='anual' ).reduce((s,i)=>s+i.subtotal,0)
  const totalUnico  = itens.filter(i=>i.cobranca==='unico' ).reduce((s,i)=>s+i.subtotal,0)
  const totalRecorr = totalMRR + totalAnual / 12   // anual prorrateado em MRR

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* Barra de busca */}
      <div style={{ display:'flex', gap:8, paddingTop:10, paddingBottom:12, borderBottom:'1px solid var(--border2)', flexShrink:0 }}>
        <ProdutoSearch onAdd={addProduto} />
      </div>

      {/* Tabela de itens */}
      <div style={{ flex:1, overflowY:'auto', marginTop:2 }}>
        {itens.length === 0 && (
          <div style={{ textAlign:'center', padding:'36px 0', color:'var(--text-muted)' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📦</div>
            <div style={{ fontSize:13, marginBottom:4 }}>Nenhum produto vinculado</div>
            <div style={{ fontSize:12, opacity:0.7 }}>Busque um produto acima para adicionar à oportunidade</div>
          </div>
        )}

        {itens.length > 0 && (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                {['Produto','Qtd','Preço unit.','Desc. %','Subtotal','Cob.',''].map((h,i) => (
                  <th key={i} style={{ padding:'6px 8px', textAlign: i>=1&&i<=4 ? 'right' : i===6?'center':'left',
                    color:'var(--text-muted)', fontWeight:700, fontSize:10, fontFamily:'var(--mono)',
                    borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map(item => (
                <tr key={item.produto_id} style={{ borderBottom:'1px solid var(--border2)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

                  {/* Nome */}
                  <td style={{ padding:'8px 8px' }}>
                    <div style={{ fontWeight:600, color:'var(--text)' }}>{item.produto_nome}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{item.produto_codigo}</div>
                  </td>

                  {/* Quantidade */}
                  <td style={{ padding:'4px 6px', textAlign:'right' }}>
                    <input type="number" min="1" step="1"
                      value={item.quantidade}
                      onChange={e => updateItem(item.produto_id, 'quantidade', Math.max(1, Number(e.target.value)))}
                      style={{ ...m.input, width:54, textAlign:'right', padding:'3px 6px', fontFamily:'var(--mono)', fontSize:12 }} />
                  </td>

                  {/* Preço unitário */}
                  <td style={{ padding:'4px 6px', textAlign:'right' }}>
                    <input type="number" min="0" step="1"
                      value={item.preco_unitario}
                      onChange={e => updateItem(item.produto_id, 'preco_unitario', Number(e.target.value))}
                      style={{ ...m.input, width:90, textAlign:'right', padding:'3px 6px', fontFamily:'var(--mono)', fontSize:12 }} />
                  </td>

                  {/* Desconto % */}
                  <td style={{ padding:'4px 6px', textAlign:'right' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:3, justifyContent:'flex-end' }}>
                      <input type="number" min="0" step="1"
                        max={item.desconto_max}
                        value={item.desconto_pct}
                        onChange={e => updateItem(item.produto_id, 'desconto_pct', Math.min(Number(e.target.value), item.desconto_max))}
                        style={{ ...m.input, width:46, textAlign:'right', padding:'3px 6px', fontFamily:'var(--mono)', fontSize:12,
                          borderColor: item.desconto_pct>=item.desconto_max&&item.desconto_max>0 ? '#F59E0B' : undefined }} />
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>%</span>
                    </div>
                    {item.desconto_max > 0 && (
                      <div style={{ fontSize:9, color:'var(--text-muted)', textAlign:'right', marginTop:1 }}>máx {item.desconto_max}%</div>
                    )}
                  </td>

                  {/* Subtotal */}
                  <td style={{ padding:'8px 8px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:'var(--text)', whiteSpace:'nowrap' }}>
                    {fmtBRL(item.subtotal)}
                  </td>

                  {/* Cobrança */}
                  <td style={{ padding:'8px 6px', textAlign:'center' }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4,
                      background: COB_BG[item.cobranca]||'#f3f4f6',
                      color:      COB_TEXT[item.cobranca]||'#374151',
                      fontFamily:'var(--mono)' }}>
                      {COB_LABEL[item.cobranca]||item.cobranca}
                    </span>
                  </td>

                  {/* Remover */}
                  <td style={{ padding:'4px 6px', textAlign:'center' }}>
                    <button type="button" onClick={() => removeItem(item.produto_id)}
                      title="Remover produto"
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
                        fontSize:14, padding:'2px 4px', borderRadius:4 }}
                      onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
                      onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Totais */}
      {itens.length > 0 && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, flexShrink:0, marginTop:4 }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:16, flexWrap:'wrap' }}>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
              {totalMRR > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'var(--text-muted)' }}>Recorrente mensal (MRR)</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'#3B82F6' }}>{fmtBRL(totalMRR)}</span>
                </div>
              )}
              {totalAnual > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'var(--text-muted)' }}>Anual (÷12 = {fmtBRL(totalAnual/12)}/mês)</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--accent)' }}>{fmtBRL(totalAnual)}</span>
                </div>
              )}
              {totalUnico > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'var(--text-muted)' }}>Setup / Único</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'#F59E0B' }}>{fmtBRL(totalUnico)}</span>
                </div>
              )}
              {(totalMRR>0||totalAnual>0) && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, paddingTop:6,
                  borderTop:'1px solid var(--border2)', marginTop:4 }}>
                  <span style={{ fontWeight:700, color:'var(--text)' }}>MRR total estimado</span>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:800, color:'var(--text)', fontSize:15 }}>
                    {fmtBRL(totalRecorr)}
                  </span>
                </div>
              )}
            </div>

            <button type="button" onClick={() => onSyncValor(itens)}
              title="Sobrescrever o campo Valor MRR da oportunidade com o total calculado"
              style={{ padding:'7px 14px', background:'var(--accent)', color:'#fff',
                border:'none', borderRadius:6, fontSize:12, fontWeight:600,
                cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' }}>
              ↑ Usar como valor da oportunidade
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Badge de situação da oportunidade ───────────────────────────────────────
function SituacaoBadge({ situacao }) {
  const cfg = SITUACOES[situacao] || SITUACOES.em_andamento
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20,
      background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:700, whiteSpace:'nowrap',
      border:`1px solid ${cfg.color}44` }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}

// ─── Seletor de situação — 4 botões visuais ───────────────────────────────────
function SituacaoSelector({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
      {Object.entries(SITUACOES).map(([k, cfg]) => {
        const ativo = value === k
        return (
          <button key={k} type="button" onClick={() => onChange(k)}
            style={{ padding:'6px 14px', borderRadius:8, cursor:'pointer', fontFamily:'var(--font)',
              fontSize:12, fontWeight: ativo ? 700 : 500, transition:'all 0.15s',
              border: `1.5px solid ${ativo ? cfg.color : 'var(--border)'}`,
              background: ativo ? cfg.bg : 'none',
              color: ativo ? cfg.text : 'var(--text-muted)',
              boxShadow: ativo ? `0 0 0 2px ${cfg.color}33` : 'none',
              display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: ativo ? cfg.color : 'var(--border)', flexShrink:0 }} />
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Campo de Motivo de Perda com gerenciador inline ─────────────────────────
function MotivoPerdaField({ value, onChange }) {
  const [motivos, setMotivos] = useLocalState('pipeline:motivosPerda', MOTIVOS_PERDA_PADRAO)
  const [mgr, setMgr]         = useState(false)
  const [novoMotivo, setNovoMotivo] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!mgr) return
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setMgr(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [mgr])

  function addMotivo() {
    const t = novoMotivo.trim()
    if (!t || motivos.includes(t)) return
    setMotivos([...motivos, t])
    setNovoMotivo('')
  }

  function removeMotivo(m) {
    setMotivos(motivos.filter(x => x !== m))
    if (value === m) onChange('')
  }

  return (
    <div style={{ position:'relative' }}>
      {/* Label com botão de gerenciar */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <label style={{ fontSize:11, fontWeight:700, color:'var(--text-soft)', textTransform:'uppercase', letterSpacing:.5 }}>
          Motivo de perda
        </label>
        <button type="button" onClick={() => setMgr(v => !v)}
          title="Gerenciar lista de motivos"
          style={{ fontSize:10, padding:'1px 6px', borderRadius:4, border:'1px solid var(--border)',
            background:'none', color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)',
            lineHeight:1.6 }}>
          ⚙ editar lista
        </button>
      </div>

      {/* Select do motivo */}
      <select style={{ ...m.input, width:'100%' }} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Selecione o motivo —</option>
        {motivos.map(mot => <option key={mot} value={mot}>{mot}</option>)}
      </select>

      {/* Popup de gerenciamento */}
      {mgr && (
        <div ref={ref} style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:300, marginTop:4,
          background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
          boxShadow:'0 12px 32px rgba(0,0,0,.18)', padding:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:10 }}>
            Motivos de perda disponíveis
          </div>

          {/* Lista de motivos */}
          <div style={{ maxHeight:180, overflowY:'auto', marginBottom:10, display:'flex', flexDirection:'column', gap:2 }}>
            {motivos.map(mot => (
              <div key={mot} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px',
                borderRadius:6, background:'var(--surface2)', border:'1px solid var(--border2)' }}>
                <span style={{ flex:1, fontSize:12, color:'var(--text)' }}>{mot}</span>
                <button type="button" onClick={() => removeMotivo(mot)}
                  title="Remover motivo"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
                    fontSize:13, padding:'0 3px', lineHeight:1 }}
                  onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
                  ✕
                </button>
              </div>
            ))}
            {motivos.length === 0 && (
              <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:'12px 0' }}>
                Nenhum motivo cadastrado
              </div>
            )}
          </div>

          {/* Adicionar novo */}
          <div style={{ display:'flex', gap:6 }}>
            <input style={{ ...m.input, flex:1, fontSize:12 }}
              placeholder="Novo motivo…"
              value={novoMotivo}
              onChange={e => setNovoMotivo(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addMotivo() } }} />
            <button type="button" onClick={addMotivo}
              style={{ padding:'6px 12px', background:'var(--accent)', color:'#fff',
                border:'none', borderRadius:6, fontSize:12, fontWeight:600,
                cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' }}>
              + Adicionar
            </button>
          </div>

          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:8 }}>
            A lista é salva automaticamente e fica disponível em todas as oportunidades.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Campo de Campanha — lê da fonte única em settings:campanhas_v1 ──────────
const CAMPANHAS_SETTINGS_DEFAULT = []

function CampanhaField({ value, onChange }) {
  const [campanhas] = useLocalState('settings:campanhas_v1', CAMPANHAS_SETTINGS_DEFAULT)
  const ativas = campanhas.filter(c => c.status === 'active' || c.status === 'draft')
  const opts = ativas.map(c => ({
    id: c.id,
    label: c.name + (c.status === 'draft' ? ' (rascunho)' : ''),
    sublabel: c.objetivo || '',
    color: 'var(--accent)',
  }))

  return (
    <div>
      <SearchSelect
        options={opts}
        value={value}
        onChange={(id) => onChange(id)}
        placeholder="Pesquisar campanha…"
        noResults={ativas.length === 0 ? 'Nenhuma campanha cadastrada' : 'Nenhuma campanha encontrada'}
        inputStyle={m.input}
      />
      {ativas.length === 0 && (
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:5 }}>
          Cadastre campanhas em <strong>Configurações → Campanhas de Incentivo</strong>.
        </div>
      )}
    </div>
  )
}

// ─── Campo de Tipo de Tarefa — usa mesma fonte de Configurações → Tipos de Ação ─
const TIPOS_TAREFA_FALLBACK = [
  { label:'Ligação', icon:'📞', slug:'ligacao' },
  { label:'E-mail',  icon:'✉',  slug:'email' },
  { label:'Reunião', icon:'🗓', slug:'reuniao' },
  { label:'Visita',  icon:'🚗', slug:'visita' },
  { label:'WhatsApp',icon:'💬', slug:'whatsapp' },
  { label:'Proposta',icon:'📄', slug:'proposta' },
]

function TipoTarefaField({ value, onChange }) {
  const [tiposAcao] = useLocalState(TIPOS_ACAO_KEY, [])
  const tipos = tiposAcao.length ? tiposAcao : TIPOS_TAREFA_FALLBACK

  return (
    <div>
      <label style={{ fontSize:11, fontWeight:700, color:'var(--text-soft)', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:6 }}>
        Tipo
      </label>
      <select style={{ ...m.input, width:'100%' }} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Selecione —</option>
        {tipos.map(t => (
          <option key={t.slug || t.label} value={t.slug || t.label}>
            {t.icon} {t.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Mini badge de status de tarefa ──────────────────────────────────────────
function TarefaStatusBadge({ status }) {
  const cfg = STATUS_TAREFA[status] || STATUS_TAREFA.pendente
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'1px 7px', borderRadius:20,
      background:cfg.bg, color:cfg.text, fontSize:10, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />{cfg.label}
    </span>
  )
}

// ─── Aba de Tarefas da Oportunidade ──────────────────────────────────────────
function OppTarefasTab({ oppId, oppNome, tarefas, onSaveTarefa, onToggleStatus }) {
  const { usuarios } = useUsuarios()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [quickForm, setQuickForm] = useState({ ...EMPTY_TAREFA })
  const [formErr, setFormErr] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const oppTarefas = useMemo(() =>
    [...tarefas.filter(t => t.entidade_tipo==='oportunidade' && String(t.entidade_id)===String(oppId))]
      .sort((a,b) => {
        // pendente/em_andamento primeiro, depois por prazo
        const ord = { pendente:0, em_andamento:1, concluida:2, cancelada:3 }
        const d = (ord[a.status]??9) - (ord[b.status]??9)
        if (d!==0) return d
        return (a.prazo||'9999') < (b.prazo||'9999') ? -1 : 1
      }),
    [tarefas, oppId]
  )

  const abertas    = oppTarefas.filter(t=>t.status==='pendente'||t.status==='em_andamento').length
  const concluidas = oppTarefas.filter(t=>t.status==='concluida').length

  function qset(f,v) { setQuickForm(prev=>({ ...prev,[f]:v })) }

  function handleQuickSave() {
    if (!quickForm.titulo.trim())   { setFormErr('Título é obrigatório'); return }
    if (!quickForm.data_inicio)     { setFormErr('Data e Hora de Início é obrigatória'); return }
    if (!quickForm.responsavel_id)  { setFormErr('Responsável é obrigatório'); return }
    setFormErr('')
    const u = usuarios.find(u => u.id === quickForm.responsavel_id)
    const tarefa = {
      ...quickForm,
      id: editingId || novoId(),
      responsavel:      u?.nome || quickForm.responsavel_nome || '',
      responsavel_nome: u?.nome || quickForm.responsavel_nome || '',
      entidade_tipo: 'oportunidade',
      entidade_id:   oppId,
      entidade_nome: oppNome,
      concluida_em:  null,
      criado:        new Date().toISOString().slice(0,10),
    }
    onSaveTarefa(tarefa)
    setQuickForm({ ...EMPTY_TAREFA })
    setShowForm(false)
    setEditingId(null)
  }

  function openEdit(t) {
    setQuickForm({ titulo:t.titulo, tipo:t.tipo, status:t.status, prioridade:t.prioridade,
      data_inicio:t.data_inicio||'', responsavel_id:t.responsavel_id||'', responsavel_nome:t.responsavel_nome||t.responsavel||'', descricao:t.descricao||'' })
    setEditingId(t.id)
    setShowForm(true)
  }

  function cancelForm() {
    setQuickForm({ ...EMPTY_TAREFA }); setShowForm(false); setEditingId(null)
  }

  const hoje = new Date().toISOString().slice(0,10)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* Resumo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0 14px', borderBottom:'1px solid var(--border2)' }}>
        <div style={tb.kpi}><span style={tb.kpiN}>{oppTarefas.length}</span><span style={tb.kpiL}>Total</span></div>
        <div style={tb.kpi}><span style={{ ...tb.kpiN, color:'#F59E0B' }}>{abertas}</span><span style={tb.kpiL}>Abertas</span></div>
        <div style={tb.kpi}><span style={{ ...tb.kpiN, color:'#10B981' }}>{concluidas}</span><span style={tb.kpiL}>Concluídas</span></div>
        <div style={{ flex:1 }} />
        {!showForm && (
          <button style={tb.addBtn} onClick={()=>{ setShowForm(true); setEditingId(null); setQuickForm({...EMPTY_TAREFA}) }}>
            + Nova tarefa
          </button>
        )}
      </div>

      {/* Formulário rápido */}
      {showForm && (
        <div style={tb.form}>
          <div style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-end' }}>
            <div style={{ flex:1 }}>
              <input style={{ ...m.input, width:'100%' }} placeholder="Título da tarefa *"
                value={quickForm.titulo} onChange={e=>qset('titulo',e.target.value)}
                autoFocus />
            </div>
            <div style={{ width:160, position:'relative' }}>
              <TipoTarefaField value={quickForm.tipo} onChange={v => qset('tipo', v)} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:8 }}>
            <div>
              <label style={tb.lbl}>Prioridade</label>
              <select style={m.input} value={quickForm.prioridade} onChange={e=>qset('prioridade',e.target.value)}>
                {Object.entries(PRIORIDADE_TAREFA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={tb.lbl}>Status</label>
              <select style={m.input} value={quickForm.status} onChange={e=>qset('status',e.target.value)}>
                {Object.entries(STATUS_TAREFA).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={tb.lbl}>Data e Hora de Início *</label>
              <input type="datetime-local" style={m.input} value={quickForm.data_inicio} onChange={e=>qset('data_inicio',e.target.value)} />
            </div>
            <div>
              <label style={tb.lbl}>Responsável *</label>
              <select style={m.input} value={quickForm.responsavel_id} onChange={e=>qset('responsavel_id',e.target.value)}>
                <option value="">— Selecione —</option>
                {usuarios.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          </div>
          {formErr && <div style={{ fontSize:12, color:'#ef4444', marginBottom:6 }}>{formErr}</div>}
          <textarea style={{ ...m.input, height:52, resize:'none', marginBottom:8, fontSize:12 }}
            placeholder="Descrição (opcional)…" value={quickForm.descricao} onChange={e=>qset('descricao',e.target.value)} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Button variant="secondary" onClick={cancelForm}>Cancelar</Button>
            <Button onClick={handleQuickSave}>
              {editingId ? 'Salvar tarefa' : 'Criar tarefa'}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de tarefas */}
      <div style={{ flex:1, overflowY:'auto', marginTop:4 }}>
        {oppTarefas.length===0 && !showForm && (
          <div style={{ textAlign:'center', padding:'36px 0', color:'var(--text-muted)' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>☑</div>
            <div style={{ fontSize:13, marginBottom:4 }}>Nenhuma tarefa vinculada</div>
            <div style={{ fontSize:12, opacity:0.7 }}>Crie tarefas para acompanhar o progresso desta oportunidade</div>
          </div>
        )}
        {oppTarefas.map(t => {
          const atrasado = t.status!=='concluida'&&t.status!=='cancelada'&&t.prazo&&t.prazo<hoje
          const expanded = expandedId===t.id
          const concluida = t.status==='concluida'
          const priorCfg  = PRIORIDADE_TAREFA[t.prioridade]
          return (
            <div key={t.id} style={{ ...tb.item, opacity:concluida?0.65:1 }}>
              {/* Linha principal */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {/* Checkbox rápido de concluir */}
                <button type="button"
                  title={concluida ? 'Reabrir tarefa' : 'Marcar como concluída'}
                  onClick={()=>onToggleStatus(t.id, concluida?'pendente':'concluida')}
                  style={{ width:18, height:18, borderRadius:4, border:`2px solid ${concluida?'#10B981':'var(--border)'}`,
                    background:concluida?'#10B981':'none', flexShrink:0, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                  {concluida && <span style={{ color:'#fff', fontSize:10, lineHeight:1 }}>✓</span>}
                </button>

                <span style={{ fontSize:15, flexShrink:0 }}>{TIPO_ICONS[t.tipo]||'☑'}</span>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', textDecoration:concluida?'line-through':undefined,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.titulo}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                    <TarefaStatusBadge status={t.status} />
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3,
                      background:priorCfg.bg, color:priorCfg.text, fontFamily:'var(--mono)' }}>
                      {priorCfg.label.toUpperCase()}
                    </span>
                    {t.prazo && (
                      <span style={{ fontSize:10, fontFamily:'var(--mono)', fontWeight:600,
                        color:atrasado?'var(--red)':concluida?'var(--text-muted)':'var(--text-muted)' }}>
                        {atrasado?'⚠ ':''}{t.prazo.split('-').reverse().slice(0,2).join('/')}
                      </span>
                    )}
                    {t.responsavel && (
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>{t.responsavel.split(' ')[0]}</span>
                    )}
                  </div>
                </div>

                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  {t.descricao && (
                    <button type="button" onClick={()=>setExpandedId(expanded?null:t.id)}
                      style={{ ...tb.iconBtn, color:expanded?'var(--accent)':'var(--text-muted)' }}
                      title="Ver descrição">
                      {expanded?'▲':'▼'}
                    </button>
                  )}
                  <button type="button" onClick={()=>openEdit(t)} style={tb.iconBtn} title="Editar">✎</button>
                </div>
              </div>

              {/* Descrição expandida */}
              {expanded && t.descricao && (
                <div style={{ marginTop:8, padding:'8px 10px', background:'var(--surface2)', borderRadius:6,
                  fontSize:12, color:'var(--text-soft)', lineHeight:1.5, borderLeft:'3px solid var(--border)' }}>
                  {t.descricao}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const tb = {
  kpi:    { display:'flex', flexDirection:'column', alignItems:'center', gap:1, padding:'4px 10px', background:'var(--surface2)', borderRadius:7, border:'1px solid var(--border2)' },
  kpiN:   { fontSize:18, fontWeight:700, color:'var(--text)', lineHeight:1 },
  kpiL:   { fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' },
  addBtn: { padding:'6px 12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  form:   { background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:12, marginBottom:10 },
  lbl:    { fontSize:11, fontWeight:600, color:'var(--text-soft)', display:'block', marginBottom:4 },
  item:   { padding:'10px 0', borderBottom:'1px solid var(--border2)' },
  iconBtn:{ background:'none', border:'none', cursor:'pointer', padding:'3px 6px', borderRadius:4, fontSize:13, color:'var(--text-muted)', fontFamily:'var(--font)' },
}

// ─── Painel de histórico de alterações ───────────────────────────────────────
const EVENTO_CFG = {
  criado:             { icon:'✦', label:'Oportunidade criada',    color:'#10B981', bg:'#D1FAE5' },
  editado:            { icon:'✎', label:'Dados alterados',        color:'#3B82F6', bg:'#DBEAFE' },
  etapa_alterada:     { icon:'→', label:'Etapa avançada',         color:'var(--accent)', bg:'#EDE9FE' },
  situacao_alterada:  { icon:'◎', label:'Situação alterada',      color:'#F59E0B', bg:'#FEF3C7' },
  produto_adicionado: { icon:'＋', label:'Produto adicionado',     color:'#06B6D4', bg:'#CFFAFE' },
  produto_removido:   { icon:'−', label:'Produto removido',       color:'#EF4444', bg:'#FEE2E2' },
  tarefa_criada:      { icon:'☑', label:'Tarefa criada',          color:'#6B7280', bg:'#F3F4F6' },
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
}

function LogPanel({ oppId, logs }) {
  const oppLogs = [...(logs || []).filter(l => l.opp_id === oppId)]
    .sort((a,b) => new Date(b.criado_em) - new Date(a.criado_em))

  return (
    <div style={lp.panel}>
      <div style={lp.header}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Histórico de alterações</span>
        <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{oppLogs.length} evento{oppLogs.length!==1?'s':''}</span>
      </div>

      <div style={lp.list}>
        {oppLogs.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)' }}>
            <div style={{ fontSize:24, marginBottom:8 }}>📋</div>
            <div style={{ fontSize:12 }}>Nenhuma alteração registrada</div>
          </div>
        )}

        {oppLogs.map((log, idx) => {
          const cfg = EVENTO_CFG[log.evento] || EVENTO_CFG.editado
          const isLast = idx === oppLogs.length - 1
          return (
            <div key={log.id} style={{ display:'flex', gap:10, paddingBottom: isLast ? 0 : 16, position:'relative' }}>

              {/* Linha vertical da timeline */}
              {!isLast && (
                <div style={{ position:'absolute', left:14, top:28, bottom:0, width:1, background:'var(--border2)' }} />
              )}

              {/* Ícone do evento */}
              <div style={{ width:28, height:28, borderRadius:'50%', background:cfg.bg,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, flexShrink:0, border:`1.5px solid ${cfg.color}55`,
                color:cfg.color, fontWeight:700, zIndex:1 }}>
                {cfg.icon}
              </div>

              {/* Conteúdo */}
              <div style={{ flex:1, minWidth:0, paddingTop:4 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:2 }}>
                  {cfg.label}
                </div>

                {/* Campos alterados */}
                {log.campos && log.campos.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:4 }}>
                    {log.campos.map((c, i) => (
                      <div key={i} style={{ fontSize:11, display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:600, color:'var(--text-soft)' }}>{c.campo}:</span>
                        {c.de && c.de !== '—' && (
                          <>
                            <span style={{ background:'#FEE2E2', color:'#991B1B', padding:'0 5px', borderRadius:3,
                              fontFamily:'var(--mono)', fontSize:10, textDecoration:'line-through' }}>
                              {c.de}
                            </span>
                            <span style={{ color:'var(--text-muted)', fontSize:10 }}>→</span>
                          </>
                        )}
                        <span style={{ background:'#D1FAE5', color:'#065F46', padding:'0 5px', borderRadius:3,
                          fontFamily:'var(--mono)', fontSize:10 }}>
                          {c.para}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Meta: usuário + data */}
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:'var(--surface3)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:8, fontWeight:700, color:'var(--text-muted)', flexShrink:0,
                    border:'1px solid var(--border)' }}>
                    {(log.usuario||'?').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>{log.usuario}</span>
                  <span style={{ fontSize:10, color:'var(--border)', lineHeight:1 }}>·</span>
                  <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                    {fmtDateTime(log.criado_em)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={lp.footer}>
        <span style={{ fontSize:10, color:'var(--text-muted)' }}>
          💡 Em produção, cada alteração salva é registrada automaticamente com usuário e timestamp.
        </span>
      </div>
    </div>
  )
}

const lp = {
  panel: {
    width: 300,
    flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--surface2)',
    overflow: 'hidden',
  },
  header: {
    padding: '14px 16px 10px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 14px',
  },
  footer: {
    padding: '10px 14px',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
}

// ─── Coluna 2: Notas do vendedor (sempre visível) ────────────────────────────
// Número de linhas a partir do qual o card de nota ativa o "Ler mais"
const NOTA_MAX_LINES = 5

// Sub-componente: card de uma nota com truncamento inteligente
function NotaCard({ nota }) {
  const [expanded, setExpanded] = useState(false)

  // Divide em linhas para contar
  const linhas = (nota.conteudo || '').split('\n')
  // Também estima linhas longas (aprox 45 chars por linha na coluna)
  const charsPerLine = 45
  const linhasEstimadas = linhas.reduce((acc, l) =>
    acc + Math.max(1, Math.ceil(l.length / charsPerLine)), 0)
  const needsTruncate = linhasEstimadas > NOTA_MAX_LINES

  // Texto truncado: pega até N_MAX_LINES de linhas estimadas
  function truncado() {
    let out = [], count = 0
    for (const linha of linhas) {
      const linesUsed = Math.max(1, Math.ceil(linha.length / charsPerLine))
      if (count + linesUsed > NOTA_MAX_LINES) {
        // Adiciona parcialmente a linha se for muito longa
        const charsLeft = (NOTA_MAX_LINES - count) * charsPerLine
        if (charsLeft > 0 && linha.length > 0) out.push(linha.slice(0, charsLeft) + '…')
        break
      }
      out.push(linha)
      count += linesUsed
    }
    return out.join('\n')
  }

  const textoExibido = needsTruncate && !expanded ? truncado() : nota.conteudo

  return (
    <div style={{
      marginBottom: 10, background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px',
      borderLeft: '3px solid var(--accent)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Conteúdo da nota */}
      <div style={{
        fontSize: 12.5, color: 'var(--text)', lineHeight: 1.65, marginBottom: 8,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {textoExibido}
      </div>

      {/* Botão Ler mais / Ler menos */}
      {needsTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: 'none', padding: '0 0 7px',
            fontSize: 11, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer',
            fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 4,
          }}>
          {expanded ? '− Ler menos' : '+ Ler mais'}
        </button>
      )}

      {/* Rodapé: avatar + autor + data */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6,
        paddingTop: needsTruncate ? 0 : 4, borderTop: needsTruncate ? 'none' : '1px solid var(--border2)' }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'var(--accent)22', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 800, flexShrink: 0, border: '1px solid var(--accent)33',
        }}>
          {(nota.usuario || '?').charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)' }}>
          {nota.usuario}
        </span>
        <span style={{ fontSize: 11, color: 'var(--border)', marginInline: 1 }}>·</span>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
          {fmtDateTime(nota.criado_em)}
        </span>
      </div>
    </div>
  )
}

function NotasPanel({ oppId, atividades, onAddNota }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const notas = useMemo(() =>
    (atividades || [])
      .filter(a => a.opp_id === oppId && a.tipo === 'nota')
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)),
    [atividades, oppId]
  )

  function handleSave() {
    if (!text.trim()) return
    onAddNota({
      id: novoId(), opp_id: oppId, tipo: 'nota',
      titulo: '', conteudo: text.trim(),
      usuario: 'Você', criado_em: new Date().toISOString(),
    })
    setText('')
    // Volta o textarea ao tamanho mínimo após salvar
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  // Auto-grow do textarea
  function handleChange(e) {
    setText(e.target.value)
    // Ajusta a altura dinamicamente, respeitando min/max
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 320) + 'px'
  }

  const hasText = text.trim().length > 0
  const charCount = text.length

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* ── Seção de input (fixa no topo) ── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StickyNote size={13} color="var(--accent)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: 'var(--mono)' }}>
              Registrar Nota
            </span>
          </div>
          {notas.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)',
              background: 'var(--surface2)', borderRadius: 20, padding: '1px 8px',
              border: '1px solid var(--border)' }}>
              {notas.length} nota{notas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Textarea auto-grow */}
        <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              style={{
                ...m.input,
                minHeight: 120,
                height: 120,
                maxHeight: 320,
                resize: 'vertical',
                fontSize: 12.5,
                lineHeight: 1.65,
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                paddingBottom: 22, // espaço para o contador
                transition: 'border-color 0.15s, box-shadow 0.15s',
                ...(hasText ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px var(--accent)18' } : {}),
              }}
              placeholder="Digite uma observação sobre esta oportunidade…&#10;&#10;Dica: Ctrl+Enter para salvar rapidamente."
              value={text}
              onChange={handleChange}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave() }}
            />
            {/* Contador de caracteres */}
            {hasText && (
              <span style={{
                position: 'absolute', bottom: 6, right: 9,
                fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--mono)',
                pointerEvents: 'none', userSelect: 'none',
              }}>
                {charCount} car.
              </span>
            )}
          </div>

          {/* Rodapé do input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>
              {hasText ? 'Ctrl+Enter para salvar' : ''}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasText}
              style={{
                padding: '6px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 700,
                fontFamily: 'var(--font)', cursor: hasText ? 'pointer' : 'default',
                transition: 'all 0.15s',
                background: hasText ? 'var(--accent)' : 'var(--surface3)',
                color:       hasText ? '#fff'    : 'var(--text-muted)',
                boxShadow:   hasText ? '0 2px 8px var(--accent)40' : 'none',
              }}>
              Salvar nota
            </button>
          </div>
        </div>
      </div>

      {/* ── Lista de notas (scroll independente) ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px' }}>
        {notas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: .5 }}>📝</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Nenhuma nota ainda</div>
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>
              Registre observações, decisões ou pontos de atenção desta oportunidade.
            </div>
          </div>
        ) : (
          notas.map(nota => <NotaCard key={nota.id} nota={nota} />)
        )}
      </div>
    </div>
  )
}

// ─── Coluna 3: Histórico de alterações automáticas (retrátil) ────────────────
function HistoricoPanel({ oppId, logs }) {
  const oppLogs = useMemo(() =>
    (logs || [])
      .filter(l => l.opp_id === oppId)
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)),
    [logs, oppId]
  )

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'12px 12px' }}>
      {oppLogs.length === 0 && (
        <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text-muted)' }}>
          <div style={{ fontSize:22, marginBottom:6 }}>📋</div>
          <div style={{ fontSize:12 }}>Nenhuma alteração registrada</div>
        </div>
      )}
      {oppLogs.map((log, idx) => {
        const cfg    = EVENTO_CFG[log.evento] || EVENTO_CFG.editado
        const isLast = idx === oppLogs.length - 1
        return (
          <div key={log.id} style={{ display:'flex', gap:9, paddingBottom: isLast ? 0 : 13, position:'relative' }}>
            {!isLast && <div style={{ position:'absolute', left:13, top:27, bottom:0, width:1, background:'var(--border)' }} />}
            <div style={{ width:27, height:27, borderRadius:'50%', background:cfg.bg,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, flexShrink:0, border:`1.5px solid ${cfg.color}55`,
              color:cfg.color, fontWeight:700, zIndex:1 }}>
              {cfg.icon}
            </div>
            <div style={{ flex:1, minWidth:0, paddingTop:3 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{cfg.label}</div>
              {log.campos && log.campos.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:5 }}>
                  {log.campos.map((c, i) => (
                    <div key={i} style={{ fontSize:11, display:'flex', alignItems:'center', gap:3, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:600, color:'var(--text-soft)' }}>{c.campo}:</span>
                      {c.de && c.de !== '—' && (
                        <>
                          <span style={{ background:'#FEE2E2', color:'#991B1B', padding:'0 4px', borderRadius:3,
                            fontFamily:'var(--mono)', fontSize:10, textDecoration:'line-through' }}>{c.de}</span>
                          <span style={{ color:'var(--text-muted)', fontSize:10 }}>→</span>
                        </>
                      )}
                      <span style={{ background:'#D1FAE5', color:'#065F46', padding:'0 4px', borderRadius:3,
                        fontFamily:'var(--mono)', fontSize:10 }}>{c.para}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:13, height:13, borderRadius:'50%', background:'var(--surface3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:7, fontWeight:700, color:'var(--text-muted)',
                  border:'1px solid var(--border)', flexShrink:0 }}>
                  {(log.usuario||'?').charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize:10, color:'var(--text-muted)' }}>{log.usuario}</span>
                <span style={{ fontSize:10, color:'var(--border)' }}>·</span>
                <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                  {fmtDateTime(log.criado_em)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Seção de Campos Adicionais (inline editor) ──────────────────────────────
function CustomFieldsSection({ fields, cfActions, values, onChange }) {
  const [editMode, setEditMode] = useState(false)
  const [editingField, setEditingField] = useState(null) // id of field being edited inline

  function renderFieldInput(field) {
    const value = values[field.key] ?? cfDefaultValue(field.type)
    if (field.type === 'select') {
      return (
        <Field key={field.id} label={field.label}>
          <select style={m.input} value={value}
            onChange={e => onChange(field.key, e.target.value)}>
            <option value="">— Selecione —</option>
            {(field.options||[]).map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </Field>
      )
    }
    if (field.type === 'boolean') {
      return (
        <Field key={field.id} label={field.label}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button type="button" onClick={() => onChange(field.key, !value)}
              style={{ position:'relative', width:42, height:24, borderRadius:12, border:'none',
                cursor:'pointer', transition:'background 0.2s', flexShrink:0, padding:0,
                background: value ? 'var(--accent)' : 'var(--surface3)' }}>
              <span style={{ position:'absolute', top:3, left: value ? 21 : 3,
                width:18, height:18, borderRadius:'50%', background:'#fff',
                boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s' }} />
            </button>
            <span style={{ fontSize:13, fontWeight:600, color: value ? 'var(--accent)' : 'var(--text-muted)' }}>
              {value ? 'Sim' : 'Não'}
            </span>
          </div>
        </Field>
      )
    }
    if (field.type === 'number') {
      return (
        <Field key={field.id} label={field.label}>
          <input style={m.input} type="number" value={value}
            placeholder={field.placeholder || ''}
            onChange={e => onChange(field.key, e.target.value)} />
        </Field>
      )
    }
    if (field.type === 'date') {
      return (
        <Field key={field.id} label={field.label}>
          <input style={m.input} type="date" value={value}
            onChange={e => onChange(field.key, e.target.value)} />
        </Field>
      )
    }
    // text default
    return (
      <Field key={field.id} label={field.label}>
        <input style={m.input} type="text" value={value}
          placeholder={field.placeholder || ''}
          onChange={e => onChange(field.key, e.target.value)} />
      </Field>
    )
  }

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'20px 0 8px' }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)' }}>
          Campos Adicionais
        </span>
        <button type="button" onClick={() => { setEditMode(e => !e); setEditingField(null) }}
          style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'2px 10px',
            fontSize:11, color: editMode ? 'var(--accent)' : 'var(--text-muted)', cursor:'pointer',
            fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
          {editMode ? '✓ Concluir' : '✎ Editar campos'}
        </button>
      </div>

      {!editMode ? (
        /* ── View mode ── */
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {fields.length === 0 && (
            <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>
              Nenhum campo adicional. Clique em "✎ Editar campos" para adicionar.
            </p>
          )}
          {fields.map(renderFieldInput)}
        </div>
      ) : (
        /* ── Edit mode ── */
        <div style={{ display:'flex', flexDirection:'column', gap:8, background:'var(--surface2)', borderRadius:10, padding:14, border:'1px solid var(--border)' }}>
          {fields.length === 0 && (
            <p style={{ fontSize:12, color:'var(--text-muted)', margin:'0 0 4px' }}>Nenhum campo ainda.</p>
          )}
          {fields.map((field, idx) => (
            <div key={field.id} style={{ background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)', padding:'10px 12px' }}>
              {editingField === field.id ? (
                /* ── Inline expand editor for this field ── */
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 140px', gap:8 }}>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:3 }}>NOME DO CAMPO</label>
                      <input style={m.input} value={field.label}
                        onChange={e => cfActions.updateField(field.id, { label: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:3 }}>TIPO</label>
                      <select style={m.input} value={field.type}
                        onChange={e => cfActions.updateField(field.id, { type: e.target.value, options: e.target.value === 'select' ? field.options : [] })}>
                        {CF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {field.type === 'text' && (
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:3 }}>PLACEHOLDER</label>
                      <input style={m.input} value={field.placeholder || ''}
                        placeholder="Texto de ajuda opcional"
                        onChange={e => cfActions.updateField(field.id, { placeholder: e.target.value })} />
                    </div>
                  )}
                  {field.type === 'select' && (
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:3 }}>OPÇÕES (uma por linha)</label>
                      <textarea style={{ ...m.input, height:72, resize:'vertical', fontFamily:'var(--mono)', fontSize:12 }}
                        value={(field.options||[]).join('\n')}
                        onChange={e => cfActions.updateField(field.id, { options: e.target.value.split('\n').map(s=>s.trim()).filter(Boolean) })} />
                    </div>
                  )}
                  <button type="button" onClick={() => setEditingField(null)}
                    style={{ alignSelf:'flex-start', background:'var(--accent)', color:'#fff', border:'none', borderRadius:6, padding:'4px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    OK
                  </button>
                </div>
              ) : (
                /* ── Collapsed row ── */
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text)' }}>{field.label}</span>
                  <span style={{ fontSize:10, color:'var(--text-muted)', background:'var(--surface2)', borderRadius:4, padding:'2px 7px', fontWeight:600 }}>
                    {CF_TYPES.find(t=>t.value===field.type)?.label || field.type}
                  </span>
                  <button type="button" onClick={() => setEditingField(field.id)} title="Editar"
                    style={{ background:'none', border:'none', fontSize:13, cursor:'pointer', color:'var(--text-soft)', padding:'2px 4px' }}>✎</button>
                  <button type="button" onClick={() => cfActions.moveField(field.id, 'up')} disabled={idx===0} title="Mover para cima"
                    style={{ background:'none', border:'none', fontSize:11, cursor: idx===0 ? 'default':'pointer', color: idx===0 ? 'var(--border)':'var(--text-muted)', padding:'2px 3px' }}>▲</button>
                  <button type="button" onClick={() => cfActions.moveField(field.id, 'down')} disabled={idx===fields.length-1} title="Mover para baixo"
                    style={{ background:'none', border:'none', fontSize:11, cursor: idx===fields.length-1 ? 'default':'pointer', color: idx===fields.length-1 ? 'var(--border)':'var(--text-muted)', padding:'2px 3px' }}>▼</button>
                  <button type="button" onClick={() => cfActions.removeField(field.id)} title="Remover campo"
                    style={{ background:'none', border:'none', fontSize:13, cursor:'pointer', color:'var(--red)', padding:'2px 4px' }}>✕</button>
                </div>
              )}
            </div>
          ))}

          <button type="button" onClick={() => { const id = cfActions.addField(); setEditingField(id) }}
            style={{ alignSelf:'flex-start', background:'none', border:'1px dashed var(--border)', borderRadius:7, padding:'6px 14px',
              fontSize:12, color:'var(--accent)', fontWeight:600, cursor:'pointer', marginTop:4 }}>
            + Adicionar campo
          </button>
        </div>
      )}
    </>
  )
}

// ─── Aba Equipe do Negócio ────────────────────────────────────────────────────
const PAPEL_CFG = {
  vendedor:       { label:'Vendedor',              color:'#3B82F6', bg:'#DBEAFE' },
  pre_vendas:     { label:'Pré-vendas',            color:'var(--accent)', bg:'#EDE9FE' },
  gerente_canais: { label:'Gerente de Canais',     color:'#10B981', bg:'#D1FAE5' },
  engenheiro:     { label:'Engenheiro de Soluções',color:'#F59E0B', bg:'#FEF3C7' },
  supervisor:     { label:'Supervisor',            color:'#EC4899', bg:'#FCE7F3' },
  outro:          { label:'Outro',                 color:'#6B7280', bg:'#F3F4F6' },
}

function PapelBadge({ papel, tipoMembro }) {
  if (tipoMembro === 'externo') {
    const p = PERSONAS.find(x => x.value === papel) || PERSONAS[0]
    return (
      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
        background:p.bg, color:p.color, whiteSpace:'nowrap', fontFamily:'var(--mono)',
        border:`1px solid ${p.color}33` }}>
        {p.label}
      </span>
    )
  }
  const cfg = PAPEL_CFG[papel] || PAPEL_CFG.outro
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
      background:cfg.bg, color:cfg.color, whiteSpace:'nowrap', fontFamily:'var(--mono)' }}>
      {cfg.label}
    </span>
  )
}

function TipoMemboBadge({ tipo }) {
  const interno = tipo === 'interno'
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4,
      background: interno ? '#1E3A5F22' : '#F59E0B18',
      color:      interno ? '#1E3A5F'   : '#D97706',
      border:     `1px solid ${interno ? '#1E3A5F44' : '#F59E0B44'}`,
      fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      {interno ? 'ISV' : 'Parceiro'}
    </span>
  )
}

function UserAvatar({ usuario, size = 32 }) {
  const interno = usuario.tipo === 'interno'
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0,
      background: interno ? '#1E3A5F22' : '#F59E0B18',
      border:     `2px solid ${interno ? '#1E3A5F55' : '#F59E0B55'}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: size * 0.3, fontWeight:800, fontFamily:'var(--mono)',
      color: interno ? '#1E3A5F' : '#D97706' }}>
      {usuario.avatar}
    </div>
  )
}

// ── Bloco reutilizável: formulário de busca inline ────────────────────────────
function AddMembroForm({ pool, jaAdicionados, onAdd, onCancel, selectorLabel, selectorOptions, defaultPapel }) {
  const [query,    setQuery]    = useState('')
  const [selUser,  setSelUser]  = useState(null)
  const [papel,    setPapel]    = useState(defaultPapel)
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    function h(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const sugestoes = useMemo(() => {
    const q = query.toLowerCase()
    return pool.filter(u =>
      !jaAdicionados.has(u.id) &&
      ((u.nome||'').toLowerCase().includes(q) || (u.cargo||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q))
    ).slice(0, 8)
  }, [query, jaAdicionados, pool])

  function handleAdd() {
    if (!selUser) return
    onAdd(selUser, papel)
    setSelUser(null); setQuery(''); setPapel(defaultPapel); setDropOpen(false)
  }

  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8,
      padding:12, marginTop:8 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 180px', gap:8, alignItems:'flex-end' }}>
        <div ref={dropRef} style={{ position:'relative' }}>
          <label style={tb.lbl}>Buscar</label>
          {selUser ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
              background:'var(--surface)', border:'1px solid var(--accent)', borderRadius:6 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--accent-glow)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:10,
                fontWeight:800, color:'var(--accent)', fontFamily:'var(--mono)', flexShrink:0 }}>
                {(selUser.nome||'?').slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selUser.nome}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)' }}>{selUser.cargo}</div>
              </div>
              <button type="button" onClick={() => { setSelUser(null); setQuery('') }}
                style={{ background:'none', border:'none', cursor:'pointer',
                  color:'var(--text-muted)', fontSize:14, padding:'0 2px' }}>✕</button>
            </div>
          ) : (
            <input style={m.input} placeholder="Nome, cargo ou e-mail…" value={query} autoFocus
              onChange={e => { setQuery(e.target.value); setDropOpen(true) }}
              onFocus={() => setDropOpen(true)} />
          )}
          {!selUser && dropOpen && sugestoes.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4,
              background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
              boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:300, maxHeight:220, overflowY:'auto' }}>
              {sugestoes.map(u => (
                <div key={u.id} onMouseDown={() => { setSelUser(u); setQuery(''); setDropOpen(false) }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                    cursor:'pointer', borderBottom:'1px solid var(--border2)' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface2)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:10,
                    fontWeight:700, color:'var(--text-muted)', fontFamily:'var(--mono)', flexShrink:0 }}>
                    {(u.nome||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.nome}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.cargo || u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!selUser && dropOpen && query.length > 1 && sugestoes.length === 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4,
              background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
              padding:'12px 16px', fontSize:12, color:'var(--text-muted)', zIndex:300 }}>
              Nenhum resultado
            </div>
          )}
        </div>
        <div>
          <label style={tb.lbl}>{selectorLabel}</label>
          <select style={m.input} value={papel} onChange={e => setPapel(e.target.value)}>
            {selectorOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:10 }}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleAdd} disabled={!selUser}>Adicionar</Button>
      </div>
    </div>
  )
}

// OppEquipeTab: dois blocos independentes — Time Interno e Contatos Externos
function CopyChip({ value, href, label, bg, children }) {
  const [copied, setCopied] = useState(false)
  function handleCopy(e) {
    e.preventDefault()
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, background:'var(--surface2)',
      border:'1px solid var(--border)', borderRadius:6, overflow:'hidden', flexShrink:0 }}>
      <a href={href} target="_blank" rel="noreferrer"
        style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
          width:22, height:22, background:bg, color:'#fff', textDecoration:'none',
          fontSize:11, fontWeight:800, flexShrink:0 }}>
        {children}
      </a>
      <span style={{ fontSize:10, color:'var(--text-muted)', padding:'0 4px', maxWidth:110,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
      <button onClick={handleCopy} title="Copiar"
        style={{ background:'none', border:'none', cursor:'pointer', padding:'0 4px',
          color: copied ? '#10B981' : 'var(--text-muted)', fontSize:10, lineHeight:1 }}>
        {copied ? '✓' : '⎘'}
      </button>
    </span>
  )
}

function OppEquipeTab({ oppId }) {
  const { membros, add: addMembro, remove: removeMembro } = useOppMembros()
  const { contacts } = useContacts()
  const { usuarios }  = useUsuarios()
  const { sellers }   = useSellers()
  const [contatosExt, setContatosExt] = useLocalState(`opp_contatos_ext_${oppId}`, [])

  // Internos: profiles do Supabase (usuários do sistema ISV)
  const poolInternos = useMemo(() => {
    return usuarios
      .filter(u => u.status !== 'inativo')
      .map(u => ({ id: `s_${u.id}`, nome: u.nome, cargo: u.cargo || '', email: u.email || '', telefone: u.telefone || '', linkedin_url: u.linkedin_url || '' }))
  }, [usuarios])

  // Canal: useSellers() = página "Contatos Canais"
  const poolCanais = useMemo(() =>
    sellers
      .filter(u => u.status !== 'inativo' && u.status !== 'afastado')
      .map(u => ({ id: `c_${u.id}`, nome: u.nome, cargo: u.cargo || u.role || '', email: u.email || '', telefone: u.telefone || '', linkedin_url: u.linkedin_url || '', franquia: u.franquia_nome || '' })),
  [sellers])

  // Pool de contatos externos (cadastro de Contatos)
  const poolContatos = useMemo(() =>
    contacts.map(c => ({
      id:           c.id,
      nome:         c.nome || c.email || 'Sem nome',
      cargo:        c.cargo || '',
      email:        c.email || '',
      whatsapp:     c.whatsapp || '',
      linkedin_url: c.linkedin_url || '',
    })),
  [contacts])

  // Membros desta opp separados por tipo_membro
  const timeInterno = useMemo(() =>
    membros.filter(m => m.oportunidade_id === oppId && m.tipo_membro === 'interno')
      .map(m => ({ ...m, usuario: poolInternos.find(u => u.id === m.user_id) }))
      .filter(m => m.usuario),
  [membros, oppId, poolInternos])

  const timeCanal = useMemo(() =>
    membros.filter(m => m.oportunidade_id === oppId && m.tipo_membro === 'canal')
      .map(m => ({ ...m, usuario: poolCanais.find(u => u.id === m.user_id) }))
      .filter(m => m.usuario),
  [membros, oppId, poolCanais])

  const [showAddInterno, setShowAddInterno] = useState(false)
  const [showAddCanal,   setShowAddCanal]   = useState(false)
  const [showAddExterno, setShowAddExterno] = useState(false)

  const jaInternosIds = useMemo(() => new Set(timeInterno.map(m => m.user_id)), [timeInterno])
  const jaCanaisIds   = useMemo(() => new Set(timeCanal.map(m => m.user_id)),   [timeCanal])
  const jaExternosIds = useMemo(() => new Set(contatosExt.map(c => c.contato_id)), [contatosExt])

  function handleAddInterno(usuario, papel) {
    addMembro({ id:`m_${Date.now()}`, oportunidade_id: oppId, user_id: usuario.id, tipo_membro:'interno', papel, tenant_id:'t1' })
    setShowAddInterno(false)
  }
  function handleAddCanal(usuario, papel) {
    addMembro({ id:`m_${Date.now()}`, oportunidade_id: oppId, user_id: usuario.id, tipo_membro:'canal', papel, tenant_id:'t1' })
    setShowAddCanal(false)
  }
  function handleAddExterno(contato, persona) {
    const c = contacts.find(x => x.id === contato.id) || contato
    setContatosExt(prev => [...prev, {
      id: `ce_${Date.now()}`, contato_id: contato.id,
      nome: contato.nome, cargo: contato.cargo, email: contato.email,
      whatsapp: c.whatsapp || '', linkedin_url: c.linkedin_url || '', persona,
    }])
    setShowAddExterno(false)
  }
  function removeExterno(id) { setContatosExt(prev => prev.filter(c => c.id !== id)) }

  function BlocoHeader({ titulo, subtitulo, onAdd, showAdd }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        paddingBottom:8, borderBottom:'2px solid var(--border2)' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{titulo}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{subtitulo}</div>
        </div>
        {!showAdd && <button style={tb.addBtn} onClick={onAdd}>+ Adicionar</button>}
      </div>
    )
  }

  function MembroInternoRow({ mb }) {
    const [hover, setHover] = useState(false)
    const u = mb.usuario
    const cfg = PAPEL_CFG[mb.papel] || PAPEL_CFG.outro
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 4px',
        borderBottom:'1px solid var(--border2)', borderRadius:6,
        background: hover ? 'var(--surface2)' : 'transparent', transition:'background 0.12s' }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:'var(--accent-glow)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:11,
          fontWeight:800, color:'var(--accent)', fontFamily:'var(--mono)',
          border:'1px solid var(--accent)33' }}>
          {(u.nome||'?').slice(0,2).toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{u.nome}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:8, marginTop:2, flexWrap:'wrap' }}>
            {u.cargo && <span>{u.cargo}</span>}
            {u.telefone && <span style={{ fontFamily:'var(--mono)' }}>{u.telefone}</span>}
            {u.email && <a href={`mailto:${u.email}`} style={{ color:'var(--accent)', textDecoration:'none' }}>{u.email}</a>}
            {u.whatsapp && (
              <CopyChip value={u.whatsapp} href={`https://wa.me/55${u.whatsapp.replace(/\D/g,'')}`} label={u.whatsapp} bg="#25D366">
                💬
              </CopyChip>
            )}
            {u.linkedin_url && (
              <CopyChip value={u.linkedin_url} href={u.linkedin_url} label={u.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\//,'')} bg="#0A66C2">
                in
              </CopyChip>
            )}
          </div>
        </div>
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
          background:cfg.bg, color:cfg.color, whiteSpace:'nowrap', fontFamily:'var(--mono)' }}>
          {cfg.label}
        </span>
        <button onClick={() => removeMembro(mb.id)}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'0 4px', flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>✕</button>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:20, paddingTop:8 }}>

        {/* ── Bloco 1: Time ISV (internos) ── */}
        <div>
          <BlocoHeader titulo="Time Interno" subtitulo="Usuários internos da empresa"
            onAdd={() => setShowAddInterno(true)} showAdd={showAddInterno} />
          {showAddInterno && (
            <AddMembroForm pool={poolInternos} jaAdicionados={jaInternosIds}
              selectorLabel="Papel" selectorOptions={PAPEIS} defaultPapel="vendedor"
              onAdd={handleAddInterno} onCancel={() => setShowAddInterno(false)} />
          )}
          {timeInterno.length === 0 && !showAddInterno
            ? <div style={{ padding:'14px 0', fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>Nenhum membro ISV adicionado</div>
            : timeInterno.map(mb => <MembroInternoRow key={mb.id} mb={mb} />)
          }
        </div>

        {/* ── Bloco 2: Contatos Canal (parceiros/franquias) ── */}
        <div>
          <BlocoHeader titulo="Contatos Canal" subtitulo="Usuários de parceiros e franquias"
            onAdd={() => setShowAddCanal(true)} showAdd={showAddCanal} />
          {showAddCanal && (
            <AddMembroForm pool={poolCanais} jaAdicionados={jaCanaisIds}
              selectorLabel="Papel" selectorOptions={PAPEIS} defaultPapel="vendedor"
              onAdd={handleAddCanal} onCancel={() => setShowAddCanal(false)} />
          )}
          {timeCanal.length === 0 && !showAddCanal
            ? <div style={{ padding:'14px 0', fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>Nenhum contato de canal adicionado</div>
            : timeCanal.map(mb => <MembroInternoRow key={mb.id} mb={mb} />)
          }
        </div>

        {/* ── Bloco 3: Contatos Externos (clientes) ── */}
        <div>
          <BlocoHeader titulo="Contatos Externos" subtitulo="Decisores e influenciadores do cliente"
            onAdd={() => setShowAddExterno(true)} showAdd={showAddExterno} />
          {showAddExterno && (
            <AddMembroForm
              pool={poolContatos.filter(c => !jaExternosIds.has(c.id))} jaAdicionados={jaExternosIds}
              selectorLabel="Persona da negociação" selectorOptions={PERSONAS} defaultPapel="nao_informado"
              onAdd={handleAddExterno} onCancel={() => setShowAddExterno(false)} />
          )}

          {contatosExt.length === 0 && !showAddExterno ? (
            <div style={{ padding:'16px 0', fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
              Nenhum contato externo adicionado
            </div>
          ) : (
            contatosExt.map(c => {
              const fresh   = poolContatos.find(p => String(p.id) === String(c.contato_id)) || {}
              const merged  = { ...c, whatsapp: fresh.whatsapp || c.whatsapp || '', linkedin_url: fresh.linkedin_url || c.linkedin_url || '', email: fresh.email || c.email || '' }
              const persona = PERSONAS.find(p => p.value === c.persona) || PERSONAS[0]
              const waTel   = merged.whatsapp.replace(/\D/g, '')
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 4px',
                  borderBottom:'1px solid var(--border2)', borderRadius:6 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
                    background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:800, color:'#6B7280', fontFamily:'var(--mono)' }}>
                    {(c.nome||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{c.nome}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:8, marginTop:2, flexWrap:'wrap' }}>
                      {merged.cargo && <span>{merged.cargo}</span>}
                      {merged.email && <a href={`mailto:${merged.email}`} style={{ color:'var(--accent)', textDecoration:'none' }}>{merged.email}</a>}
                      {waTel && (
                        <CopyChip value={merged.whatsapp} href={`https://wa.me/55${waTel}`} label={merged.whatsapp} bg="#25D366">
                          💬
                        </CopyChip>
                      )}
                      {merged.linkedin_url && (
                        <CopyChip value={merged.linkedin_url} href={merged.linkedin_url} label={merged.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\//,'')} bg="#0A66C2">
                          in
                        </CopyChip>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                    background:persona.bg, color:persona.color, whiteSpace:'nowrap',
                    fontFamily:'var(--mono)', border:`1px solid ${persona.color}33` }}>
                    {persona.label}
                  </span>
                  <button onClick={() => removeExterno(c.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
                      fontSize:14, padding:'0 4px', flexShrink:0 }}
                    onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>✕</button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function MembroRow({ membro, onRemove }) {
  const [hover, setHover] = useState(false)
  const u = membro.usuario
  if (!u) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 4px',
      borderBottom:'1px solid var(--border2)', background: hover ? 'var(--surface2)' : 'transparent',
      borderRadius:6, transition:'background 0.12s' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <UserAvatar usuario={u} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
          {u.nome}
          <TipoMemboBadge tipo={membro.tipo_membro} />
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, display:'flex', alignItems:'center', gap:8 }}>
          {u.cargo}
          {u.whatsapp && (
            <CopyChip value={u.whatsapp} href={`https://wa.me/55${u.whatsapp.replace(/\D/g,'')}`} label={u.whatsapp} bg="#25D366">
              💬
            </CopyChip>
          )}
          {u.linkedin_url && (
            <CopyChip value={u.linkedin_url} href={u.linkedin_url} label={u.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\//,'')} bg="#0A66C2">
              in
            </CopyChip>
          )}
        </div>
      </div>
      <PapelBadge papel={membro.papel} tipoMembro={membro.tipo_membro} />
      <button type="button" onClick={() => onRemove(membro.id)} title="Remover da equipe"
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
          fontSize:14, padding:'4px 6px', borderRadius:4, opacity: hover ? 1 : 0,
          transition:'opacity 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
        ✕
      </button>
    </div>
  )
}

// ─── Seção financeira do formulário de oportunidade ──────────────────────────
function ValorFinanceiroSection({ form, set }) {
  const bruto   = (Number(form.valor_cdu)||0) + (Number(form.valor_sms)||0) + (Number(form.valor_servico)||0)
  const desconto = Math.min(Number(form.valor_desconto)||0, bruto)
  const liquido  = Math.max(0, bruto - desconto)
  const descontoInvalido = Number(form.valor_desconto) > bruto && bruto > 0

  function numInput(field) {
    return {
      type: 'text',
      inputMode: 'numeric',
      style: { ...m.input, paddingLeft: 28, fontFamily: 'var(--mono)', fontWeight: 600, fontSize:13 },
      value: form[field] > 0
        ? Number(form[field]).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '',
      placeholder: '0,00',
      onChange: e => {
        const raw = e.target.value.replace(/\./g,'').replace(',','.')
        const num = parseFloat(raw)
        set(field, isNaN(num) ? 0 : num)
      },
      onBlur: () => {
        const num = parseFloat(String(form[field]).replace(/\./g,'').replace(',','.'))
        set(field, isNaN(num) ? 0 : num)
      },
    }
  }

  const SL = (color) => ({
    fontSize:10, fontWeight:700, color: color || 'var(--text-muted)',
    textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:5,
  })

  return (
    <div style={{
      borderTop:'1px solid var(--border)',
      paddingTop:16,
      marginTop:8,
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-soft)', textTransform:'uppercase',
        letterSpacing:'0.08em', marginBottom:12 }}>Composição do valor</div>

      {/* Grid 3 cols: CDU | SMS | Serviço */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
        {[
          { field:'valor_cdu',     label:'CDU',     color:'var(--accent)' },
          { field:'valor_sms',     label:'SMS',     color:'#3B82F6' },
          { field:'valor_servico', label:'Serviço', color:'#10B981' },
        ].map(({ field, label, color }) => (
          <div key={field}>
            <label style={SL(color)}>
              <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%',
                background:color, marginRight:4, verticalAlign:'middle', marginBottom:1 }} />
              {label}
            </label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
                fontSize:10, fontWeight:600, color:'var(--text-muted)', pointerEvents:'none',
                fontFamily:'var(--mono)' }}>R$</span>
              <input {...numInput(field)} />
            </div>
          </div>
        ))}
      </div>

      {/* Row inferior: Desconto (esq) | Total Líquido (dir) */}
      <div style={{
        display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12,
        borderTop:'1px solid var(--border2)', paddingTop:14,
      }}>
        <div>
          <label style={SL(descontoInvalido ? 'var(--red)' : '#F59E0B')}>
            Desconto (R$)
            {descontoInvalido && (
              <span style={{ marginLeft:5, fontSize:9, color:'var(--red)',
                textTransform:'none', letterSpacing:0, fontWeight:500 }}>
                ⚠ excede o bruto
              </span>
            )}
          </label>
          <div style={{ position:'relative', width:140 }}>
            <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
              fontSize:10, fontWeight:600, color:'var(--text-muted)', pointerEvents:'none',
              fontFamily:'var(--mono)' }}>R$</span>
            <input {...numInput('valor_desconto')}
              style={{ ...numInput('valor_desconto').style,
                borderColor: descontoInvalido ? 'var(--red)' : undefined,
                boxShadow: descontoInvalido ? '0 0 0 2px rgba(239,68,68,0.12)' : undefined }} />
          </div>
        </div>

        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)',
            textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
            Total líquido
          </div>
          <div style={{
            fontSize:22, fontWeight:800, letterSpacing:'-0.03em',
            fontFamily:'var(--mono)', lineHeight:1, color:'var(--text)',
          }}>
            {fmtMoeda(liquido)}
          </div>
          {bruto > 0 && desconto > 0 && (
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3, fontFamily:'var(--mono)' }}>
              bruto {fmtMoeda(bruto)} − desc. {fmtMoeda(desconto)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Aba Documentos ───────────────────────────────────────────────────────────
const DOC_STORAGE_KEY = 'pipeline:opp_docs_v1'

const MOCK_DOC_TYPES = [
  { value: 'proposta',   label: 'Proposta Comercial', icon: '📄' },
  { value: 'contrato',   label: 'Contrato',           icon: '📝' },
  { value: 'nda',        label: 'NDA / Sigilo',       icon: '🔒' },
  { value: 'tecnico',    label: 'Documento Técnico',  icon: '⚙️' },
  { value: 'financeiro', label: 'Financeiro',         icon: '💰' },
  { value: 'outro',      label: 'Outro',              icon: '📎' },
]

function fmtBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(1)} MB`
}

function OppDocumentosTab({ oppId }) {
  const { docs: allDocs, save: saveDoc, remove: removeDoc, uploadFile, loading } = useDocuments()
  const [dragging,   setDragging]   = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const fileInputRef = useRef(null)

  // Arquivos anexados diretamente à oportunidade (têm file_url)
  const files = allDocs.filter(d => d.opportunity_id === oppId && d.file_url)

  async function handleFiles(fileList) {
    const file = fileList[0]
    if (!file) return
    setUploading(true)
    const res = await uploadFile(file)
    if (!res.ok) { setUploading(false); alert('Erro ao enviar: ' + res.message); return }
    await saveDoc({
      title:          file.name,
      description:    '',
      categoria:      'outro',
      status:         'ativo',
      version:        1,
      content:        '',
      opportunity_id: oppId,
      file_url:       res.url,
      file_name:      res.name,
      file_size:      res.size,
      file_path:      res.path || null,
    })
    setUploading(false)
  }

  async function handleRemove(doc) {
    if (!window.confirm(`Remover "${doc.file_name}" desta oportunidade?`)) return
    await removeDoc(doc.id)
  }

  function fmtBytes(b) {
    if (!b) return ''
    if (b < 1024) return `${b} B`
    if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
    return `${(b/1048576).toFixed(1)} MB`
  }

  const EXT_COLOR = { pdf:'#EF4444', doc:'#3B82F6', docx:'#3B82F6', xls:'#10B981', xlsx:'#10B981', ppt:'#F59E0B', pptx:'#F59E0B', png:'var(--accent)', jpg:'var(--accent)', jpeg:'var(--accent)' }

  if (loading) return <div style={{ padding:'24px 0', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Carregando…</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, paddingTop:8 }}>

      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{ border:`2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius:10, padding:'28px 20px', textAlign:'center', cursor: uploading ? 'wait' : 'pointer',
          background: dragging ? '#eef2ff' : 'var(--surface2)', transition:'all 0.15s', flexShrink:0 }}>
        <input ref={fileInputRef} type="file" style={{ display:'none' }}
          onChange={e => handleFiles(e.target.files)} />
        {uploading ? (
          <div style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600 }}>Enviando…</div>
        ) : (
          <>
            <div style={{ fontSize:28, marginBottom:8 }}>📎</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-soft)' }}>
              Arraste um arquivo ou{' '}
              <span style={{ color:'var(--accent)', textDecoration:'underline' }}>clique para selecionar</span>
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              PDF, Word, Excel, PowerPoint, imagens… · {files.length} arquivo{files.length !== 1 ? 's' : ''} anexado{files.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {/* Lista de arquivos */}
      {files.length === 0 && (
        <div style={{ textAlign:'center', padding:'16px 0', color:'var(--text-muted)', fontSize:12 }}>
          Nenhum arquivo anexado ainda.
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {files.map(doc => {
            const ext = doc.file_name?.split('.').pop()?.toLowerCase() || ''
            const extColor = EXT_COLOR[ext] || '#6B7280'
            return (
              <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:12,
                padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border2)',
                borderRadius:9, borderLeft:`3px solid ${extColor}` }}>

                <div style={{ width:36, height:36, borderRadius:7, background:`${extColor}18`,
                  border:`1.5px solid ${extColor}44`, display:'flex', alignItems:'center',
                  justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800,
                  color:extColor, fontFamily:'var(--mono)', textTransform:'uppercase' }}>
                  {ext || '?'}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {doc.file_name}
                  </div>
                  {doc.file_size && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                      {fmtBytes(doc.file_size)}
                    </div>
                  )}
                </div>

                <a href={doc.file_url} target="_blank" rel="noreferrer" download={doc.file_name}
                  style={{ fontSize:12, color:'var(--accent)', fontWeight:600, textDecoration:'none',
                    padding:'5px 10px', border:'1px solid var(--accent)', borderRadius:6, flexShrink:0 }}>
                  ↓ Baixar
                </a>

                <button type="button" onClick={() => handleRemove(doc)}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    color:'var(--text-muted)', fontSize:13, padding:'4px 6px', borderRadius:5, flexShrink:0 }}
                  onMouseEnter={e=>e.currentTarget.style.color='#EF4444'}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const docLbl = { fontSize:11, fontWeight:700, color:'var(--text-soft)', textTransform:'uppercase', letterSpacing:0.4 }
const docInp = { padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)', width:'100%', boxSizing:'border-box' }
const docCancelBtn = { padding:'6px 14px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-muted)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }
const docSaveBtn   = { padding:'6px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }

// ─── Word export ─────────────────────────────────────────────────────────────
function markdownToHtml(md) {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,    '<em>$1</em>')
    .replace(/^---$/gm,       '<hr/>')
    .replace(/^\| (.+) \|$/gm, (_, row) => {
      const cells = row.split(' | ')
      return '<tr>' + cells.map(c => c.startsWith('---') ? '' : `<td style="border:1px solid #ccc;padding:4px 8px">${c}</td>`).filter(Boolean).join('') + '</tr>'
    })
    .replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table style="border-collapse:collapse;width:100%">$1</table>')
    .replace(/^- (.+)$/gm,    '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, s => '<ul>' + s + '</ul>')
    .replace(/^\d+\. (.+)$/gm,'<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[a-z])/gm, '')
    .replace(/\n/g, '<br/>')
}

function downloadAsWord(title, content) {
  const body = markdownToHtml(content)
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8"/>
<meta name=ProgId content=Word.Document/>
<meta name=Generator content="Microsoft Word 15"/>
<!--[if gte mso 9]>
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml>
<![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 2cm; color: #111; }
  h1   { font-size: 18pt; color: #1a1a2e; border-bottom: 2px solid #e5e7eb; padding-bottom: 4pt; }
  h2   { font-size: 14pt; color: #374151; margin-top: 14pt; }
  h3   { font-size: 12pt; color: #6b7280; }
  table{ border-collapse: collapse; width: 100%; margin: 8pt 0; }
  td,th{ border: 1px solid #d1d5db; padding: 4pt 8pt; font-size: 10pt; }
  th   { background: #f3f4f6; font-weight: bold; }
  ul,ol{ padding-left: 16pt; }
  li   { margin-bottom: 3pt; }
  p    { margin: 6pt 0; line-height: 1.5; }
  strong{ font-weight: bold; }
  em   { font-style: italic; }
  hr   { border: none; border-top: 1px solid #e5e7eb; margin: 10pt 0; }
</style>
</head>
<body><p>${body}</p></body>
</html>`
  const blob = new Blob([html], { type: 'application/msword' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${title.replace(/[^a-zA-Z0-9À-ú\s-]/g, '').trim()}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Aba Proposta da Oportunidade ────────────────────────────────────────────
const MOCK_OPP_PROPOSALS = []

function mergeTemplate(content, opp) {
  const fmt = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
  const map = {
    '{{EMPRESA}}':      opp.empresa_nome   || '',
    '{{OPORTUNIDADE}}': opp.titulo         || '',
    '{{RESPONSAVEL}}':  opp.responsavel    || '',
    '{{CONTATO}}':      opp.primary_contact_nome || '',
    '{{PRAZO}}':        fmtDate(opp.prazo),
    '{{VALOR_CDU}}':    fmt(opp.valor_cdu),
    '{{VALOR_SMS}}':    fmt(opp.valor_sms),
    '{{VALOR_SERVICO}}': fmt(opp.valor_servico),
    '{{VALOR_TOTAL}}':  fmt(opp.valor),
  }
  return Object.entries(map).reduce((txt, [ph, val]) => txt.split(ph).join(val), content)
}

const PROP_STATUS_LABEL = { rascunho:'Rascunho', enviada:'Enviada', aceita:'Aceita', recusada:'Recusada' }
const PROP_STATUS_COLOR = { rascunho:'#6B7280', enviada:'#3B82F6', aceita:'#10B981', recusada:'#EF4444' }

function OppPropostaTab({ opp }) {
  const { docs: allDocs, linkToOpp, loading: loadingDocs } = useDocuments()
  const [proposals, setProposals] = useLocalState(STORAGE_KEY_OPP_PROPOSALS, MOCK_OPP_PROPOSALS)
  // Propostas de Implantação (módulo Projetos)
  const [implPropostas] = useLocalState('projects:propostas_v1', [])
  const minhasImplantacoes = useMemo(
    () => implPropostas.filter(p => String(p.opp_id) === String(opp.id))
          .sort((a, b) => new Date(b.updated_at||0) - new Date(a.updated_at||0)),
    [implPropostas, opp.id]
  )

  const [pickerOpen,    setPickerOpen]    = useState(false)
  const [linkPickerOpen, setLinkPickerOpen] = useState(false)
  const [editing,       setEditing]       = useState(null)
  const [linkSearch,    setLinkSearch]    = useState('')

  // Propostas geradas localmente (editor markdown)
  const linked = useMemo(
    () => proposals.filter(p => p.opp_id === String(opp.id))
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
    [proposals, opp.id]
  )

  // Documentos do módulo Documentos, tipo proposta, vinculados a esta oportunidade
  const linkedDocs = useMemo(
    () => allDocs.filter(d => d.opportunity_id === String(opp.id) && d.categoria === 'proposta'),
    [allDocs, opp.id]
  )

  // Documentos tipo proposta disponíveis para vincular
  const availableDocs = useMemo(
    () => allDocs.filter(d =>
      d.categoria === 'proposta' &&
      d.opportunity_id !== String(opp.id) &&
      (linkSearch.trim() === '' || d.title.toLowerCase().includes(linkSearch.toLowerCase()))
    ),
    [allDocs, opp.id, linkSearch]
  )

  // Templates de proposta ativos (para gerar via editor markdown)
  const docs = useMemo(
    () => allDocs.filter(d => d.status === 'ativo' && d.categoria === 'proposta'),
    [allDocs]
  )

  async function handleLinkDoc(doc) {
    await linkToOpp(doc.id, String(opp.id))
    setLinkPickerOpen(false)
    setLinkSearch('')
  }

  async function handleUnlinkDoc(doc) {
    if (window.confirm(`Desvincular "${doc.title}" desta oportunidade?`))
      await linkToOpp(doc.id, null)
  }

  function abrirNovaProposta(doc) {
    setEditing({
      id: `prop-${Date.now()}`,
      opp_id: String(opp.id),
      template_id: doc.id,
      template_title: doc.title,
      title: `${doc.title} — ${opp.empresa_nome}`,
      content: mergeTemplate(doc.content, opp),
      usuario: 'Você',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isNew: true,
    })
    setPickerOpen(false)
  }

  function salvarProposta(p) {
    const saved = { ...p, updated_at: new Date().toISOString(), isNew: undefined }
    setProposals(prev => {
      const idx = prev.findIndex(x => x.id === saved.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
      return [...prev, saved]
    })
    setEditing(null)
  }

  function excluirProposta(id) {
    setProposals(prev => prev.filter(p => p.id !== id))
    setEditing(null)
  }

  function fmtData(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  /* ── Editor de proposta ── */
  function PropostaEditor({ prop, onClose, onSave, onDelete }) {
    const [draft, setDraft] = useState(() => ({ ...prop }))
    const [confirmDel, setConfirmDel] = useState(false)

    return (
      <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1199 }} onClick={onClose} />
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1200,
          width: 780, maxWidth: '97vw', display: 'flex', flexDirection: 'column',
          background: 'var(--surface)', boxShadow: '-6px 0 32px rgba(0,0,0,0.18)',
          borderLeft: '1px solid var(--border2)' }}>

          {/* Header */}
          <div style={{ padding: '16px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: 6 }}>
                Template: {draft.template_title}
              </div>
              <input
                style={{ width: '100%', fontSize: 15, fontWeight: 700, color: 'var(--text)',
                  border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)',
                  padding: 0, boxSizing: 'border-box' }}
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="Título da proposta"
              />
            </div>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: '4px 6px', lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>

          {/* Barra de placeholders */}
          <div style={{ padding: '8px 22px', borderBottom: '1px solid var(--border2)', flexShrink: 0,
            display: 'flex', gap: 8, flexWrap: 'wrap', background: 'var(--surface2)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 4 }}>Inserir:</span>
            {[
              ['{{EMPRESA}}',    opp.empresa_nome],
              ['{{RESPONSAVEL}}', opp.responsavel],
              ['{{VALOR_TOTAL}}', Number(opp.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2})],
              ['{{PRAZO}}',       opp.prazo ? new Date(opp.prazo).toLocaleDateString('pt-BR') : ''],
            ].map(([ph, val]) => val ? (
              <button key={ph}
                onClick={() => setDraft(d => ({ ...d, content: d.content + ' ' + ph }))}
                style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer',
                  fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: 'var(--accent)' }}>{ph}</span>
                <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>→ {val.length > 14 ? val.slice(0,14)+'…' : val}</span>
              </button>
            ) : null)}
          </div>

          {/* Editor de conteúdo */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '14px 22px' }}>
            <textarea
              style={{ flex: 1, width: '100%', padding: '14px 16px',
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'var(--surface)', color: 'var(--text)',
                fontSize: 13, lineHeight: 1.75, outline: 'none',
                fontFamily: 'var(--mono)', resize: 'none', boxSizing: 'border-box' }}
              value={draft.content}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
              spellCheck={false}
            />
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 22px 16px', borderTop: '1px solid var(--border2)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              {!prop.isNew && !confirmDel && (
                <button onClick={() => setConfirmDel(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 13,
                    cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}>
                  Excluir proposta
                </button>
              )}
              {confirmDel && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Confirmar exclusão?</span>
                  <button onClick={() => onDelete(prop.id)}
                    style={{ padding: '5px 12px', background: 'var(--red)', color: '#fff',
                      border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Sim</button>
                  <button onClick={() => setConfirmDel(false)}
                    style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--border)',
                      borderRadius: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => downloadAsWord(draft.title || 'Proposta', draft.content || '')}
                style={{ padding: '8px 14px', background: 'none', border: '1px solid var(--border)',
                  borderRadius: 7, fontSize: 13, color: 'var(--text-soft)', cursor: 'pointer', fontFamily: 'var(--font)',
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>⬇</span> Baixar Word
              </button>
              <button onClick={onClose}
                style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border)',
                  borderRadius: 7, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Cancelar
              </button>
              <button onClick={() => onSave(draft)}
                style={{ padding: '8px 22px', background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {prop.isNew ? 'Salvar proposta' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* ── Picker de template de documento ── */
  function DocTemplatePicker({ onClose }) {
    const [search, setSearch] = useState('')
    // já filtrado por proposta+ativo no useMemo acima
    const lista = docs
      .filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()))

    return (
      <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1199 }} onClick={onClose} />
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 1200, width: 540, maxWidth: '95vw', maxHeight: '72vh',
          background: 'var(--surface)', borderRadius: 12, boxShadow: '0 16px 56px rgba(0,0,0,0.20)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Selecionar template</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Os dados da oportunidade serão mesclados automaticamente
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: '2px 6px', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border2)', flexShrink: 0 }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar template…"
              style={{ width: '100%', padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 7,
                background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none',
                fontFamily: 'var(--font)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {lista.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhum template ativo encontrado.
              </div>
            )}
            {lista.map(doc => {
              const cfg = DOC_CATEGORIA_CFG[doc.categoria] || DOC_CATEGORIA_CFG.outro
              const hasPlaceholders = doc.content?.includes('{{')
              return (
                <button key={doc.id} onClick={() => abrirNovaProposta(doc)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: '12px 12px',
                    background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
                    fontFamily: 'var(--font)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
                      {hasPlaceholders && (
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5,
                          background: 'var(--accent-glow)', color: 'var(--accent)',
                          border: '1px solid var(--accent)33', fontWeight: 600, flexShrink: 0 }}>
                          auto-preenchido
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {cfg.label} · v{doc.version} · {doc.created_by}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, flexShrink: 0, alignSelf: 'center' }}>
                    Usar →
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Documentos do módulo vinculados ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Propostas vinculadas do módulo Documentos
          </span>
          <button type="button" onClick={() => { setLinkPickerOpen(l => !l); setLinkSearch('') }}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
              border:'1px solid var(--border)', borderRadius:7,
              background: linkPickerOpen ? 'var(--accent)' : 'none',
              color: linkPickerOpen ? '#fff' : 'var(--text-muted)',
              fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>
            {linkPickerOpen ? '✕ Cancelar' : '+ Vincular proposta'}
          </button>
        </div>

        {linkPickerOpen && (
          <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10,
            padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
            <input autoFocus style={docInp} value={linkSearch}
              placeholder="Buscar proposta no módulo Documentos…"
              onChange={e => setLinkSearch(e.target.value)} />
            {availableDocs.length === 0 ? (
              <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:'8px 0' }}>
                {linkSearch ? 'Nenhuma proposta encontrada.' : 'Nenhuma proposta disponível para vincular.'}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                {availableDocs.map(doc => (
                  <div key={doc.id}
                    onClick={() => handleLinkDoc(doc)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                      background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:8, cursor:'pointer' }}>
                    <span style={{ fontSize:16 }}>📄</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.title}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>v{doc.version} · {doc.status}</div>
                    </div>
                    {doc.file_url && (
                      <span style={{ fontSize:10, color:'var(--text-muted)', background:'var(--surface2)',
                        padding:'2px 6px', borderRadius:4, border:'1px solid var(--border)', flexShrink:0 }}>
                        com arquivo
                      </span>
                    )}
                    <span style={{ fontSize:11, color:'var(--accent)', fontWeight:600, flexShrink:0 }}>Vincular →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {linkedDocs.length === 0 && !linkPickerOpen && (
          <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 0' }}>
            Nenhuma proposta vinculada. Vincule documentos do módulo Documentos ou gere uma abaixo.
          </div>
        )}

        {linkedDocs.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {linkedDocs.map(doc => (
              <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:9,
                borderLeft:'3px solid var(--accent)' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>📄</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.title}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>v{doc.version} · {doc.status}</div>
                  {doc.description && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.description}</div>}
                </div>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noreferrer" download={doc.file_name}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize:12, color:'var(--accent)', fontWeight:600, textDecoration:'none',
                      padding:'4px 10px', border:'1px solid var(--accent)', borderRadius:6, flexShrink:0 }}>
                    ↓ Baixar
                  </a>
                )}
                <button type="button" onClick={() => handleUnlinkDoc(doc)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
                    fontSize:12, padding:'4px 8px', borderRadius:5, flexShrink:0 }}
                  onMouseEnter={e=>e.currentTarget.style.color='#EF4444'}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Propostas de Implantação (Projetos) */}
      <div style={{ border:'1px solid var(--accent)33', borderRadius:10, overflow:'hidden',
        background:'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)', marginBottom:2 }}>Propostas de Implantação</div>
            <div style={{ fontSize:11, color:'var(--text-soft)' }}>
              {minhasImplantacoes.length === 0
                ? 'Nenhuma proposta criada — clique para acessar Projetos'
                : `${minhasImplantacoes.length} proposta${minhasImplantacoes.length > 1 ? 's' : ''} vinculada${minhasImplantacoes.length > 1 ? 's' : ''}`}
            </div>
          </div>
          <a onClick={e => { e.preventDefault(); window.location.href = `/projetos?tab=propostas&opp_id=${opp.id}` }}
            href={`/projetos?tab=propostas&opp_id=${opp.id}`}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
              background:'var(--accent)', color:'#fff', borderRadius:7, fontSize:12,
              fontWeight:600, textDecoration:'none', flexShrink:0 }}>
            {minhasImplantacoes.length === 0 ? '+ Nova proposta' : 'Abrir em Projetos →'}
          </a>
        </div>
        {minhasImplantacoes.length > 0 && (
          <div style={{ borderTop:'1px solid var(--accent)22' }}>
            {minhasImplantacoes.map(p => {
              const valor = (p.tarifas||[]).reduce((s,t)=>{
                const hrs = (p.itens||[]).filter(i=>i.nivel===2&&i.tipo_hora===t.id).reduce((a,i)=>(a+(i.hr_analista||0)+(i.hr_coord||0)),0)
                return s + hrs*(t.valor||0)
              }, 0)
              return (
                <div key={p.id}
                  onClick={() => { window.location.href = `/projetos?tab=propostas&opp_id=${opp.id}` }}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                    borderBottom:'1px solid var(--accent)11', cursor:'pointer',
                    transition:'background 0.12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,0.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                    background: PROP_STATUS_COLOR[p.status] || '#6B7280' }} />
                  <span style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--text)' }}>{p.titulo}</span>
                  <span style={{ fontSize:11, color: PROP_STATUS_COLOR[p.status] || '#6B7280', fontWeight:600 }}>
                    {PROP_STATUS_LABEL[p.status] || p.status}
                  </span>
                  {valor > 0 && (
                    <span style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:700, color:'#10B981' }}>
                      {valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ height:1, background:'var(--border2)' }} />

      {/* Toolbar — propostas comerciais simples */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
          {linked.length} proposta{linked.length !== 1 ? 's' : ''} comercial{linked.length !== 1 ? 'is' : ''} (editor simples)
        </span>
        <button onClick={() => setPickerOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: 'none', color: 'var(--text-soft)', border: '1px solid var(--border)', borderRadius: 7,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          + Gerar proposta comercial
        </button>
      </div>

      {/* Contexto da oportunidade */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--surface2)',
        borderRadius: 8, border: '1px solid var(--border2)', flexWrap: 'wrap' }}>
        {[
          { lbl: 'Empresa', val: opp.empresa_nome },
          { lbl: 'Responsável', val: opp.responsavel },
          { lbl: 'Valor', val: Number(opp.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}) },
          { lbl: 'Contato', val: opp.primary_contact_nome },
        ].filter(x => x.val).map(({ lbl, val }) => (
          <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{lbl}</span>
            <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Lista de propostas */}
      {linked.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nenhuma proposta gerada</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Clique em "+ Gerar proposta" para criar a partir de um template</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {linked.map(p => {
            const doc = docs.find(d => d.id === p.template_id)
            const cfg = DOC_CATEGORIA_CFG[doc?.categoria] || DOC_CATEGORIA_CFG.proposta
            return (
              <div key={p.id}
                onClick={() => setEditing({ ...p, isNew: false })}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 9,
                  cursor: 'pointer', transition: 'box-shadow 0.15s',
                  borderLeft: `3px solid ${cfg.color}` }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{cfg.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {p.template_title} · {p.usuario} · {fmtData(p.updated_at)}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>Editar →</span>
              </div>
            )
          })}
        </div>
      )}

      {pickerOpen && <DocTemplatePicker onClose={() => setPickerOpen(false)} />}
      {editing && (
        <PropostaEditor
          prop={editing}
          onClose={() => setEditing(null)}
          onSave={salvarProposta}
          onDelete={excluirProposta}
        />
      )}
    </div>
  )
}

// ─── Aba Questionários da Oportunidade ───────────────────────────────────────
function OppQuestionariosTab({ oppId, oppNome, empresaNome, empresaId }) {
  const { templates, submissions, saveSubmission, removeSubmission } = useQuestionnaires()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editSub,    setEditSub]    = useState(null)

  const linked = useMemo(
    () => submissions.filter(s => s.opportunity_id === String(oppId))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [submissions, oppId]
  )

  async function criarSubmission(template) {
    const nova = {
      template_id:      template.id,
      opportunity_id:   String(oppId),
      company_id:       empresaId || null,
      company_nome:     empresaNome || '',
      status:           'rascunho',
      respondente_nome: 'Você',
      respostas:        {},
    }
    const res = await saveSubmission(nova)
    setPickerOpen(false)
    // abre editor com o objeto retornado (tem id real do Supabase ou temporário)
    const criada = res?.data || { ...nova, id: `sub-opp-${Date.now()}` }
    setEditSub(criada)
  }

  async function salvarSubmission(updated) {
    await saveSubmission(updated)
    setEditSub(null)
  }

  function fmtData(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'2-digit' })
  }

  /* ── Modal de edição/preenchimento de respostas ── */
  function RespostaEditModal({ sub, onClose, onSave }) {
    const tpl    = templates.find(t => t.id === sub.template_id)
    const secoes = tpl?.estrutura_secoes?.secoes || []

    const [draft, setDraft] = useState(() => ({
      ...sub,
      company_nome:     sub.company_nome     || empresaNome || '',
      respondente_nome: sub.respondente_nome || sub.answered_by_nome || 'Você',
      respostas:        { ...(sub.respostas || sub.valores_respostas || {}) },
    }))

    function setResp(pid, val) {
      setDraft(d => ({ ...d, respostas: { ...d.respostas, [pid]: val } }))
    }

    function toggleOpcao(pid, opcao) {
      const atual = Array.isArray(draft.respostas[pid]) ? draft.respostas[pid] : []
      const next  = atual.includes(opcao) ? atual.filter(v => v !== opcao) : [...atual, opcao]
      setResp(pid, next)
    }

    function handleSave() {
      const now = new Date().toISOString()
      const isSubmitting = draft.status !== 'rascunho'
      onSave({
        ...draft,
        enviado_em: draft.enviado_em || (isSubmitting ? now : null),
      })
    }

    const tipoCfg = Q_TIPO_CFG[tpl?.type] || Q_TIPO_CFG.pre_venda
    const inp = { width:'100%', padding:'8px 11px', border:'1px solid var(--border)', borderRadius:7,
      background:'var(--surface)', color:'var(--text)', fontSize:13, outline:'none',
      fontFamily:'var(--font)', boxSizing:'border-box' }
    const lbl = { fontSize:11, fontWeight:700, color:'var(--text-soft)', textTransform:'uppercase',
      letterSpacing:0.4, display:'block', marginBottom:5 }

    return (
      <>
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1199 }} onClick={onClose} />
        <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          zIndex:1200, width:620, maxWidth:'97vw', maxHeight:'90vh',
          background:'var(--surface)', borderRadius:14, boxShadow:'0 24px 64px rgba(0,0,0,0.22)',
          display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'16px 22px 12px', borderBottom:'1px solid var(--border)', flexShrink:0,
            display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:18 }}>{tipoCfg.icon}</span>
                <span style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{tpl?.title || 'Questionário'}</span>
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                Oportunidade: <strong style={{ color:'var(--text-soft)' }}>{oppNome}</strong>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:18, cursor:'pointer', padding:'4px 6px', lineHeight:1 }}>✕</button>
          </div>

          {/* Corpo */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>

            {/* Dados da empresa — pré-preenchidos, editáveis */}
            <div style={{ background:'var(--surface2)', borderRadius:9, padding:'14px 16px',
              marginBottom:20, border:'1px solid var(--border2)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:12 }}>Dados da empresa</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Empresa <span style={{ color:'var(--red)' }}>*</span></label>
                  <input style={inp} value={draft.company_nome}
                    onChange={e => setDraft(d => ({ ...d, company_nome: e.target.value }))}
                    placeholder="Nome da empresa" />
                </div>
                <div>
                  <label style={lbl}>Respondido por</label>
                  <input style={inp} value={draft.respondente_nome}
                    onChange={e => setDraft(d => ({ ...d, respondente_nome: e.target.value }))}
                    placeholder="Nome do respondente" />
                </div>
              </div>
            </div>

            {/* Seções e perguntas */}
            {secoes.length === 0 && (
              <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
                Template sem perguntas configuradas.
              </div>
            )}
            {secoes.map((sec, si) => (
              <div key={sec.id} style={{ marginBottom: si < secoes.length - 1 ? 24 : 0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
                  letterSpacing:'0.07em', marginBottom:14, paddingBottom:6,
                  borderBottom:'1px solid var(--border2)', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:20, height:20, borderRadius:5, background:'var(--accent)',
                    color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0 }}>{si + 1}</span>
                  {sec.titulo}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {(sec.perguntas || []).map(p => (
                    <div key={p.id}>
                      <label style={lbl}>
                        {p.label}
                        {p.obrigatorio && <span style={{ color:'var(--red)', marginLeft:3 }}>*</span>}
                      </label>

                      {p.tipo === 'texto' && (
                        <input style={inp}
                          value={draft.respostas[p.id] || ''}
                          onChange={e => setResp(p.id, e.target.value)}
                          placeholder="Digite sua resposta…" />
                      )}

                      {p.tipo === 'numero' && (
                        <input type="number" style={inp}
                          value={draft.respostas[p.id] || ''}
                          onChange={e => setResp(p.id, e.target.value)}
                          placeholder="0" />
                      )}

                      {p.tipo === 'multipla_escolha' && (
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {(p.opcoes || []).map((opt, oi) => {
                            const sel = Array.isArray(draft.respostas[p.id])
                              ? draft.respostas[p.id].includes(opt)
                              : false
                            return (
                              <label key={oi}
                                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                                  borderRadius:7, border:`1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                                  background: sel ? 'var(--accent-glow)' : 'var(--surface2)',
                                  cursor:'pointer', transition:'all 0.12s', userSelect:'none' }}>
                                <input type="checkbox" checked={sel}
                                  onChange={() => toggleOpcao(p.id, opt)}
                                  style={{ accentColor:'var(--accent)', cursor:'pointer', flexShrink:0 }} />
                                <span style={{ fontSize:13, color: sel ? 'var(--accent)' : 'var(--text)',
                                  fontWeight: sel ? 600 : 400 }}>{opt}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding:'12px 22px 16px', borderTop:'1px solid var(--border)', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-soft)', textTransform:'uppercase', letterSpacing:0.4 }}>
                Status
              </label>
              <select value={draft.status}
                onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                style={{ height:32, padding:'0 8px', border:'1px solid var(--border)', borderRadius:7,
                  background:'var(--surface2)', color:'var(--text)', fontSize:12, outline:'none',
                  cursor:'pointer', fontFamily:'var(--font)' }}>
                {Object.entries(Q_STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose}
                style={{ padding:'8px 16px', background:'none', border:'1px solid var(--border)',
                  borderRadius:7, fontSize:13, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)' }}>
                Cancelar
              </button>
              <button onClick={handleSave}
                style={{ padding:'8px 20px', background:'var(--accent)', color:'#fff', border:'none',
                  borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
                Salvar respostas
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* ── Picker de template ── */
  function TemplatePicker({ onClose }) {
    const [search, setSearch] = useState('')
    const lista = templates.filter(t =>
      t.is_active &&
      (!search || t.title.toLowerCase().includes(search.toLowerCase()))
    )
    return (
      <>
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1199 }} onClick={onClose} />
        <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          zIndex:1200, width:520, maxWidth:'95vw', maxHeight:'70vh',
          background:'var(--surface)', borderRadius:12, boxShadow:'0 16px 56px rgba(0,0,0,0.20)',
          display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px 10px', borderBottom:'1px solid var(--border)', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Selecionar template</span>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:16, cursor:'pointer', padding:'2px 6px', lineHeight:1 }}>✕</button>
          </div>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border2)', flexShrink:0 }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar template…"
              style={{ width:'100%', padding:'7px 12px', border:'1px solid var(--border)', borderRadius:7,
                background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none',
                fontFamily:'var(--font)', boxSizing:'border-box' }} />
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>
            {lista.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:13 }}>Nenhum template ativo encontrado.</div>
            )}
            {lista.map(t => {
              const cfg   = Q_TIPO_CFG[t.type] || Q_TIPO_CFG.pre_venda
              const total = (t.estrutura_secoes?.secoes || []).reduce((s, sec) => s + (sec.perguntas || []).length, 0)
              return (
                <button key={t.id} onClick={() => criarSubmission(t)}
                  style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'11px 12px',
                    background:'none', border:'none', cursor:'pointer', borderRadius:8, textAlign:'left',
                    fontFamily:'var(--font)', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{cfg.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{cfg.label} · {total} pergunta{total !== 1 ? 's' : ''}</div>
                  </div>
                  <span style={{ fontSize:11, color:'var(--accent)', fontWeight:600, flexShrink:0 }}>Vincular →</span>
                </button>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
          {linked.length} questionário{linked.length !== 1 ? 's' : ''} vinculado{linked.length !== 1 ? 's' : ''}
        </span>
        <button onClick={() => setPickerOpen(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
            background:'var(--accent)', color:'#fff', border:'none', borderRadius:7,
            fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
          + Vincular questionário
        </button>
      </div>

      {/* Lista */}
      {linked.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Nenhum questionário vinculado</div>
          <div style={{ fontSize:12, opacity:0.7 }}>Clique em "+ Vincular questionário" para associar um template</div>
        </div>
      ) : (
        <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                {['Template', 'Tipo', 'Status', 'Respondido por', 'Data', ''].map((h, i) => (
                  <th key={i} style={{ padding:'8px 12px', fontSize:10, fontWeight:700,
                    color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em',
                    textAlign:'left', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linked.map((sub, i) => {
                const tpl     = templates.find(t => t.id === sub.template_id)
                const tipoCfg = Q_TIPO_CFG[tpl?.type] || Q_TIPO_CFG.pre_venda
                const stCfg   = Q_STATUS_CFG[sub.status] || Q_STATUS_CFG.rascunho
                return (
                  <tr key={sub.id}
                    onClick={() => setEditSub(sub)}
                    style={{ borderBottom: i < linked.length - 1 ? '1px solid var(--border2)' : 'none',
                      cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:'var(--text)' }}>
                      {tpl?.title || sub.template_id}
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px',
                        borderRadius:20, fontSize:11, fontWeight:700, fontFamily:'var(--mono)',
                        background:tipoCfg.bg, color:tipoCfg.text, border:`1px solid ${tipoCfg.color}33` }}>
                        {tipoCfg.icon} {tipoCfg.label}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px',
                        borderRadius:20, fontSize:11, fontWeight:700, fontFamily:'var(--mono)',
                        background:stCfg.bg, color:stCfg.text }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:stCfg.dot, flexShrink:0 }} />
                        {stCfg.label}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px', fontSize:12, color:'var(--text-soft)' }}>
                      {sub.respondente_nome || '—'}
                    </td>
                    <td style={{ padding:'10px 12px', fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                      {fmtData(sub.enviado_em || sub.criado)}
                    </td>
                    <td style={{ padding:'10px 12px', textAlign:'right' }}>
                      {sub.status === 'rascunho' && (
                        <button
                          title="Desconectar questionário"
                          onClick={e => {
                            e.stopPropagation()
                            if (window.confirm('Desconectar este questionário da oportunidade?')) removeSubmission(sub.id)
                          }}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'2px 6px', borderRadius:5, lineHeight:1 }}
                          onMouseEnter={e => { e.currentTarget.style.color='var(--red)'; e.currentTarget.style.background='var(--red-bg)' }}
                          onMouseLeave={e => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='none' }}>
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pickerOpen && <TemplatePicker onClose={() => setPickerOpen(false)} />}
      {editSub && (
        <RespostaEditModal
          sub={editSub}
          onClose={() => setEditSub(null)}
          onSave={salvarSubmission}
        />
      )}
    </div>
  )
}


// ─── Modal de fechamento de oportunidade ganha ───────────────────────────────
function FechamentoModal({ opp, onClose }) {
  const { save: saveContrato, contratos }       = useContracts()
  const { save: saveProjeto, projetos }         = useProjects()
  const [implPropostas]                         = useLocalState('projects:propostas_v1', [])

  const propostasImplantacao = useMemo(
    () => implPropostas
      .filter(p => String(p.opp_id) === String(opp.id))
      .sort((a, b) => ({ aceita:0, enviada:1, rascunho:2, recusada:3 }[a.status]??9) - ({ aceita:0, enviada:1, rascunho:2, recusada:3 }[b.status]??9)),
    [implPropostas, opp.id]
  )
  const propostaImplantacao = propostasImplantacao[0] || null

  const temServico = (opp.valor_servico > 0) ||
    (opp.itens||[]).some(it => it.tipo === 'servico' || it.slot === 'servico' || it.tipo === 'consultoria')

  const { records: csRecords, save: saveHealth } = useCustomerHealth()

  const [gerarContrato, setGerarContrato] = useState(true)
  const [gerarProjeto,  setGerarProjeto]  = useState(temServico && !!propostaImplantacao)
  // Se não tem proposta de implantação → vai direto para CS (já marcado)
  // Se tem proposta de implantação → CS virá depois do projeto (desmarcado)
  const [criarCS, setCriarCS] = useState(!propostaImplantacao)

  const contratosDuplicados = (contratos||[]).filter(c =>
    c.opportunity_id && String(c.opportunity_id) === String(opp.id)
  )
  const projetosDuplicados = (projetos||[]).filter(p =>
    (p.opportunity_id && String(p.opportunity_id) === String(opp.id)) ||
    (p.name || '').trim().toLowerCase() === (opp.titulo || '').trim().toLowerCase()
  )
  const [salvando, setSalvando]           = useState(false)
  const [feito, setFeito]                 = useState(null) // null | { contrato, projeto }

  function gerarNumero() {
    const ano = new Date().getFullYear()
    const seq = (contratos || []).filter(c => (c.numero||'').startsWith(`CTR-${ano}`)).length + 1
    return `CTR-${ano}-${String(seq).padStart(3,'0')}`
  }

  async function confirmar() {
    setSalvando(true)
    const resultados = {}
    const hoje = new Date().toISOString().slice(0,10)

    if (gerarContrato) {
      const numero = gerarNumero()
      const res = await saveContrato({
        numero,
        empresa_id:      opp.empresa_id,
        empresa_nome:    opp.empresa_nome,
        origem:          'direta',
        status:          'rascunho',
        primeira_compra: false,
        vigencia_inicio: opp.data_fechamento || hoje,
        vigencia_fim:    '',
        itens_adesao:  (opp.itens||[]).filter(i=> ['licenca','hardware'].includes(i.tipo)).map(i=>({ produto_id: i.produto_id, nome: i.produto_nome||i.nome||'', valor: i.subtotal||i.valor||0, tabela: i.preco_unitario||i.valor||null, desconto_pct: i.desconto_pct||0, desconto_autorizado: false })),
        itens_mrr:     (opp.itens||[]).filter(i=> i.tipo==='saas').map(i=>({ produto_id: i.produto_id, nome: i.produto_nome||i.nome||'', valor: i.subtotal||i.valor||0, tabela: i.preco_unitario||i.valor||null, desconto_pct: i.desconto_pct||0, desconto_autorizado: false })),
        itens_servico: (opp.itens||[]).filter(i=> ['servico','consultoria'].includes(i.tipo)).map(i=>({ produto_id: i.produto_id, nome: i.produto_nome||i.nome||'', valor: i.subtotal||i.valor||0, tabela: i.preco_unitario||i.valor||null, desconto_pct: i.desconto_pct||0, desconto_autorizado: false })),
        responsavel:         opp.responsavel || '',
        observacoes:         `Gerado automaticamente ao fechar oportunidade: ${opp.titulo}`,
        opportunity_id:      opp.id,
        opportunity_titulo:  opp.titulo,
      })
      if (res.ok) resultados.contrato = numero
      else resultados.contratoErro = res.message
    }

    if (gerarProjeto) {
      // Um projeto por proposta de implantação vinculada
      const itensServico = (opp.itens||[]).filter(i => ['servico','consultoria'].includes(i.tipo))
      const projetosGerados = []
      const projetosErros   = []
      const listaPropostas  = propostasImplantacao.length > 0 ? propostasImplantacao : [null]
      for (const prop of listaPropostas) {
        const allItens = prop ? (prop.itens || []) : []
        const fases    = allItens.filter(i => i.nivel === 1)
        const totalHoras = fases.reduce((s, fase) => {
          const filhos = allItens.filter(f => f.nivel === 2 && f.parent_id === fase.id)
          return s + filhos.reduce((a, f) => a + (Number(f.hr_analista)||0) + (Number(f.hr_coord)||0), 0)
        }, 0)
        const nomeProjeto = prop
          ? `${opp.titulo}${propostasImplantacao.length > 1 ? ` — ${prop.titulo || prop.id}` : ''}`
          : opp.titulo
        const res = await saveProjeto({
          name:                  nomeProjeto,
          company_id:            opp.empresa_id || null,
          company_nome:          opp.empresa_nome,
          franchise_nome:        '',
          phase:                 'iniciacao',
          current_phase_index:   1,
          status:                'em_andamento',
          total_hours_estimated: Math.round(totalHoras) || 0,
          total_hours_executed:  0,
          start_date:            hoje,
          end_date_estimated:    '',
          responsavel:           opp.responsavel || '',
          opportunity_id:        opp.id,
          proposta_id:           prop?.id || null,
          notes: [
            `Projeto criado a partir da oportunidade: ${opp.titulo}`,
            opp.empresa_nome ? `Cliente: ${opp.empresa_nome}` : '',
            itensServico.length ? `Serviços: ${itensServico.map(i => i.produto_nome||i.nome).join(', ')}` : '',
            prop ? `Proposta de implantação: ${prop.titulo || prop.id}` : '',
          ].filter(Boolean).join('\n'),
          _fasesWBS: fases.map((fase, i) => {
            const filhos = allItens.filter(f => f.nivel === 2 && f.parent_id === fase.id)
            const horas  = filhos.reduce((a, f) => a + (Number(f.hr_analista)||0) + (Number(f.hr_coord)||0), 0)
            return { phase_name: fase.titulo, phase_order: i + 1, hours_estimated: Math.round(horas) || 0, start_date_planned: '', end_date_planned: '', is_completed: false }
          }),
        })
        if (res.ok) projetosGerados.push(nomeProjeto)
        else projetosErros.push(res.message || 'Erro')
      }
      if (projetosGerados.length) resultados.projetos = projetosGerados
      if (projetosErros.length)   resultados.projetosErros = projetosErros
    }

    if (criarCS) {
      const checkin = {
        id:            'ci_opp_' + Date.now(),
        date:          hoje,
        type:          'Reunião',
        summary:       `Oportunidade "${opp.titulo}" ganha. Check-in gerado automaticamente.`,
        produto_id:    null,
        produto_nome:  '',
        oportunidade_id:   opp.id   || null,
        oportunidade_nome: opp.titulo || '',
      }
      const csExistente = csRecords.find(r => String(r.company_id) === String(opp.empresa_id))
      if (csExistente) {
        const res = await saveHealth({
          ...csExistente,
          checkins: [checkin, ...(csExistente.checkins || [])],
        })
        resultados.cs = res?.ok === false ? null : csExistente.company_name
        resultados.csErro = res?.ok === false ? res.message : null
        resultados.csNovo = false
      } else {
        const res = await saveHealth({
          company_id:   opp.empresa_id || null,
          company_name: opp.empresa_nome || '',
          laer_stage:   'Land',
          touch_model:  'Tech-Touch',
          health_score: 75,
          notes:        `Cliente adicionado ao fechar a oportunidade "${opp.titulo}".`,
          checkins:     [checkin],
          action_plans: [],
          attachments:  [],
        })
        resultados.cs = res?.ok === false ? null : opp.empresa_nome
        resultados.csErro = res?.ok === false ? res.message : null
        resultados.csNovo = res?.ok !== false
      }
    }

    setSalvando(false)
    setFeito(resultados)
  }

  const overlay = {
    position:'fixed', inset:0, zIndex:2000, background:'rgba(10,15,30,0.65)',
    backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20,
  }
  const card = {
    background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:460,
    boxShadow:'0 24px 60px rgba(0,0,0,0.25)', overflow:'hidden',
  }
  const chkRow = (on) => ({
    display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', borderRadius:10, cursor:'pointer',
    border:`1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
    background: on ? 'var(--accent-glow)' : 'var(--surface2)', transition:'all 0.15s',
  })

  if (feito) {
    const steps = [
      { id: 'opp',      label: 'Oportunidade marcada como Ganha', sublabel: opp.titulo },
      ...(gerarContrato ? [{
        id: 'contrato',
        label:    feito.contrato    ? `Contrato ${feito.contrato} criado em Rascunho` : `Erro ao criar contrato`,
        sublabel: feito.contrato    ? 'Pendente de auditoria' : feito.contratoErro,
        error:    !!feito.contratoErro,
      }] : []),
      ...(gerarProjeto && feito.projetos ? feito.projetos.map((nome, i) => ({
        id: `projeto_${i}`,
        label: `Projeto "${nome}" criado`,
        sublabel: 'Etapa: Iniciação',
      })) : []),
      ...(gerarProjeto && feito.projetosErros ? feito.projetosErros.map((err, i) => ({
        id: `projeto_err_${i}`,
        label: 'Erro ao criar projeto',
        sublabel: err,
        error: true,
      })) : []),
      ...(criarCS ? [feito.csErro
        ? { id: 'cs', label: 'Erro ao registrar em Sucesso do Cliente', sublabel: feito.csErro, error: true }
        : feito.csNovo
          ? { id: 'cs', label: 'Registro criado em Sucesso do Cliente', sublabel: `${opp.empresa_nome} · estágio Land` }
          : { id: 'cs', label: 'Check-in adicionado em Sucesso do Cliente', sublabel: opp.empresa_nome }
      ] : [{ id: 'cs', label: 'Sucesso do Cliente', skip: true }]),
    ]
    return (
      <ActionFeedback
        title="Oportunidade fechada com sucesso!"
        subtitle={opp.empresa_nome}
        steps={steps}
        onClose={onClose}
        stepDelay={700}
        autoClose={0}
      />
    )
  }

  return (
    <div style={overlay}>
      <div style={card}>
        {/* Header */}
        <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>🏆</span>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>Oportunidade ganha!</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                O que deseja gerar para <strong>{opp.empresa_nome}</strong>?
              </div>
            </div>
          </div>
        </div>

        {/* Opções */}
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:10 }}>
          {/* Contrato */}
          <label style={chkRow(gerarContrato)} onClick={() => setGerarContrato(v => !v)}>
            <input type="checkbox" checked={gerarContrato} onChange={() => {}} style={{ marginTop:2, accentColor:'var(--accent)', width:15, height:15, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color: gerarContrato ? 'var(--accent)' : 'var(--text)' }}>
                📄 Gerar Contrato
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                Cria um contrato em status <strong>Rascunho</strong> (pendente de auditoria) vinculado a esta oportunidade.
              </div>
              {contratosDuplicados.length > 0 && (
                <div style={{ marginTop:6, padding:'6px 10px', borderRadius:6,
                  background:'#FEF3C7', border:'1px solid #F59E0B',
                  fontSize:11, color:'#92400E', lineHeight:1.4 }}>
                  ⚠ Já existe {contratosDuplicados.length} contrato{contratosDuplicados.length > 1 ? 's' : ''} vinculado{contratosDuplicados.length > 1 ? 's' : ''} a esta oportunidade. Gerar novamente criará um duplicado.
                </div>
              )}
            </div>
          </label>

          {/* Projeto — só se tiver serviço */}
          {temServico && (
            <label
              style={{ ...chkRow(gerarProjeto), ...(!propostaImplantacao ? { opacity:0.6, cursor:'not-allowed' } : {}) }}
              onClick={() => { if (propostaImplantacao) setGerarProjeto(v => !v) }}
            >
              <input type="checkbox" checked={gerarProjeto} onChange={() => {}} disabled={!propostaImplantacao} style={{ marginTop:2, accentColor:'var(--accent)', width:15, height:15, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color: gerarProjeto ? 'var(--accent)' : 'var(--text)' }}>
                  🗂 Gerar Projeto
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                  {propostasImplantacao.length > 1
                    ? <>{propostasImplantacao.length} propostas vinculadas — <strong>um projeto por proposta</strong> será criado com fases MIT.</>
                    : propostaImplantacao
                      ? <>Proposta <strong>{propostaImplantacao.titulo || 'vinculada'}</strong> — fases MIT serão pré-populadas automaticamente.</>
                      : 'Cria um projeto na etapa Iniciação para os serviços desta venda.'}
                </div>
                {!propostaImplantacao && (
                  <div style={{ marginTop:6, padding:'6px 10px', borderRadius:6,
                    background:'#FEE2E2', border:'1px solid #EF4444',
                    fontSize:11, color:'#991B1B', lineHeight:1.4 }}>
                    ✗ É necessário ter uma <strong>Proposta de Implantação</strong> vinculada a esta oportunidade (aba Proposta → módulo Projetos) para gerar o projeto.
                  </div>
                )}
                {propostaImplantacao && projetosDuplicados.length > 0 && (
                  <div style={{ marginTop:6, padding:'6px 10px', borderRadius:6,
                    background:'#FEF3C7', border:'1px solid #F59E0B',
                    fontSize:11, color:'#92400E', lineHeight:1.4 }}>
                    ⚠ Já existe um projeto com o nome <strong>"{opp.titulo}"</strong>. Gerar novamente criará um duplicado.
                  </div>
                )}
              </div>
            </label>
          )}

          {/* Sucesso do Cliente */}
          <label style={chkRow(criarCS)} onClick={() => setCriarCS(v => !v)}>
            <input type="checkbox" checked={criarCS} onChange={() => {}} style={{ marginTop:2, accentColor:'var(--accent)', width:15, height:15, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color: criarCS ? 'var(--accent)' : 'var(--text)' }}>
                💚 Registrar em Sucesso do Cliente
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                {propostaImplantacao
                  ? <>Oportunidade tem proposta de implantação — o check-in CS normalmente é gerado ao <strong>concluir o projeto</strong>.</>
                  : <>Cria um check-in automático para <strong>{opp.empresa_nome}</strong> no módulo de CS.</>}
              </div>
            </div>
          </label>

          {!gerarContrato && !gerarProjeto && !criarCS && (
            <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 0', textAlign:'center' }}>
              Nenhuma opção selecionada — a oportunidade será fechada sem registros adicionais.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'0 24px 22px', display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px', borderRadius:8, border:'1px solid var(--border)',
              background:'var(--surface)', color:'var(--text-soft)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
            Pular
          </button>
          <button onClick={confirmar} disabled={salvando}
            style={{ padding:'9px 22px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
            {salvando ? 'Gerando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de Oportunidade (com abas Dados / Tarefas) ────────────────────────
function OppModal({ onClose, onSave, onDelete, onFechamento, initial, etapas, funilId, tarefas, onSaveTarefa, onToggleStatus, atividades, onAddAtividade, defaultResponsavel, isParceiro, partnerSellerId }) {
  const isEditing = !!initial
  const { funis } = useFunnels()
  const [tab, setTab]       = useState('dados')
  const [logOpen, setLogOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState(
    initial
      ? { titulo:initial.titulo, empresa_id:initial.empresa_id, empresa_nome:initial.empresa_nome,
          primary_contact_id:   initial.primary_contact_id   ?? null,
          primary_contact_nome: initial.primary_contact_nome ?? '',
          valor_cdu:     initial.valor_cdu      ?? 0,
          valor_sms:     initial.valor_sms      ?? 0,
          valor_servico: initial.valor_servico  ?? 0,
          valor_desconto:initial.valor_desconto ?? 0,
          valor:         initial.valor          ?? 0,
          prazo:initial.prazo, responsavel:initial.responsavel,
          origem:initial.origem, etapa_id:initial.etapa_id, itens: initial.itens || [],
          playbook_id: initial.playbook_id || null,
          campanha_id: initial.campanha_id || null,
          funil_id: initial.funil_id || funilId || null,
          situacao: initial.situacao || 'em_andamento', motivo_perda: initial.motivo_perda || '',
          custom_fields: { ...(initial.custom_fields || {}) } }
      : { ...EMPTY_OPP, funil_id: funilId || null, etapa_id: etapas[0]?.id || null, itens: [], responsavel: defaultResponsavel || '' }
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moverFunilPopup, setMoverFunilPopup] = useState(null) // { novoFunil, etapaId }
  const [cfFields, cfActions] = useCustomFields('oportunidade')
  const [todosContatos] = useLocalState(CONTATOS_STORAGE_KEY, MOCK_CONTATOS)
  const { sections: oppSections, fieldById: oppFieldById } = useFormLayout('opportunities')
  const { companies: allCompanies, add: addCompany } = useCompanies()
  const { sellers: allSellers } = useSellers()
  const { contacts: allContacts } = useContacts()
  const { produtos: allProdutos } = useProducts()
  const { usuarios: allUsuarios } = useUsuarios()
  const { branches: allBranches } = useBranches()
  const { parceiros: allParceiros } = useParceiros()

  // Mapa de entidade → opções para campos de Referência (lookup)
  const lookupOptions = useMemo(() => ({
    companies:       allCompanies.map(c => ({ id: String(c.id), label: c.nome || c.name || String(c.id) })),
    contacts:        allContacts.map(c => ({ id: String(c.id), label: c.nome || c.email || String(c.id) })),
    sellers:         allSellers.map(s => ({ id: String(s.id), label: s.nome || s.email || String(s.id) })),
    products:        allProdutos.map(p => ({ id: String(p.id), label: p.nome || String(p.id) })),
    sellers_users:   allUsuarios.map(u => ({ id: String(u.id), label: u.nome || u.email || String(u.id) })),
    tenant_branches: allBranches.map(b => ({ id: String(b.id), label: b.nome || String(b.id) })),
    parceiros:       allParceiros.map(p => ({ id: String(p.id), label: p.nome || String(p.id) })),
    opportunities:   [],
    contracts:       [],
  }), [allCompanies, allContacts, allSellers, allProdutos, allUsuarios, allBranches, allParceiros])
  const [errs, setErrs] = useState({})
  function set(f, v) { setForm(prev => ({ ...prev, [f]: v })); if (errs[f]) setErrs(p => ({ ...p, [f]: '' })) }
  // helper específico para custom_fields — atualiza o JSONB sem sobrescrever outras chaves
  function setCustomField(key, value) {
    setForm(prev => ({ ...prev, custom_fields: { ...prev.custom_fields, [key]: value } }))
  }

  async function handleCreateDraftCompany(nome) {
    const draft = {
      razao: nome, fantasia: nome, cnpj: '', tipo: 'cliente_final',
      segmento: '', status: 'rascunho', email: '', telefone: '', site: '',
      mrr: 0, contratos: 0, contatos: 0, cnae_codigo: '', cnae_descricao: '',
      inscricao_estadual: '', cep: '', logradouro: '', bairro: '', cidade: '',
      uf: '', numero: '', complemento: '', franquia_ar_id: null, franquia_ar_nome: '',
      resp_ar_id: partnerSellerId || null,
      origem: 'Canal',
    }
    const result = await addCompany(draft)
    if (result?.ok && result?.data?.id) return { id: result.data.id, nome }
    return null
  }

  const { playbooks } = usePlaybooks()
  const [playbookHintOpen, setPlaybookHintOpen] = useState(false)

  // Playbook contextual: steps da etapa atual
  const playbookContextual = useMemo(() => {
    const pb = playbooks.find(p => p.id === form.playbook_id) || playbooks[0] || null
    if (!pb) return null
    const etapa  = etapas.find(e => e.id === form.etapa_id)
    const stage  = etapa ? mapEtapaToStage(etapa.nome) : null
    const steps  = (pb.steps || []).filter(s =>
      s.stage === stage || (form.etapa_id != null && String(s.stage) === String(form.etapa_id))
    )
    if (!steps.length) return null
    return { pb, etapa, stage, steps }
  }, [playbooks, form.playbook_id, form.etapa_id, etapas])

  const oppTarefasCount   = tarefas.filter(t => t.entidade_tipo==='oportunidade' && t.entidade_id===initial?.id).length
  const oppTarefasAbertas = tarefas.filter(t => t.entidade_tipo==='oportunidade' && t.entidade_id===initial?.id && (t.status==='pendente'||t.status==='em_andamento')).length
  const itensCount        = form.itens.length
  const { membros: todosMembrosOpp } = useOppMembros()
  const oppEquipeCount    = todosMembrosOpp.filter(m => m.oportunidade_id === initial?.id).length
  const [allDocsOpp]      = useLocalState(DOC_STORAGE_KEY, [])
  const [allPropostas]    = useLocalState(STORAGE_KEY_OPP_PROPOSALS, MOCK_OPP_PROPOSALS)
  const { submissions: allSubmissions } = useQuestionnaires()
  const oppDocumentosCount   = allDocsOpp.filter(d => d.opp_id === initial?.id).length
  const oppPropostaCount     = allPropostas.filter(p => p.opp_id === String(initial?.id)).length
  const oppQuestionariosCount = allSubmissions.filter(s => String(s.opportunity_id) === String(initial?.id)).length
  const oppPlaybookCount     = form.playbook_id ? 1 : 0

  function handleSave() {
    const e = {}
    if (!form.titulo.trim()) e.titulo = 'Título é obrigatório'
    if (!form.empresa_id)    e.empresa_id = 'Selecione uma empresa'
    if (Object.keys(e).length) { setErrs(e); setTab('dados'); return }

    // Regra: ao fechar como ganha, exige ao menos um produto vinculado
    if (form.situacao === 'ganha') {
      const temProduto = (form.itens||[]).length > 0 ||
        form.produto_adesao_id || form.produto_mrr_id || form.produto_servico_id
      if (!temProduto) {
        setErrs({ _produto: 'Vincule ao menos um produto para fechar como Ganha.' })
        setTab('produtos')
        return
      }
    }

    const bruto   = (Number(form.valor_cdu)||0) + (Number(form.valor_sms)||0) + (Number(form.valor_servico)||0)
    const desconto = Math.min(Number(form.valor_desconto)||0, bruto)
    const liquido  = Math.max(0, bruto - desconto)
    const eraGanha = initial?.situacao === 'ganha'
    const hoje = new Date().toISOString().slice(0, 10)
    const oppSalva = { ...form, valor_desconto: desconto, valor: liquido,
      funil_id: form.funil_id || funilId, id:initial?.id||novoId(), criado:initial?.criado||hoje,
      data_fechamento: form.situacao === 'ganha' && !eraGanha ? hoje : (initial?.data_fechamento || null),
    }

    onSave(oppSalva)
    if (form.situacao === 'ganha' && !eraGanha) {
      onFechamento(oppSalva)
    }
    onClose()
  }

  // label slate — usado no DadosFormBody
  const SL = { fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:5 }

  // Conteúdo dos campos do formulário — reutilizado em edição e criação
  function renderOppField(key, field) {
    switch (key) {
      case 'titulo':
        return <>
          <input style={{ ...m.input, borderColor: errs.titulo ? '#DC2626' : '' }} value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Proposta expansão SP" />
          {errs.titulo && <span style={{ color:'#DC2626', fontSize:11, marginTop:2, display:'block' }}>{errs.titulo}</span>}
        </>
      case 'empresa_id':
        return <>
          <EmpresaSearch value={form.empresa_id} label={form.empresa_nome}
            partnerSellerId={isParceiro ? partnerSellerId : undefined}
            onCreateDraft={isParceiro ? handleCreateDraftCompany : undefined}
            onChange={(id, nome) => {
              set('empresa_id', id); set('empresa_nome', nome)
              if (id && form.primary_contact_id) {
                const c = todosContatos.find(c => c.id === form.primary_contact_id)
                if (!c || c.empresa_id !== Number(id)) { set('primary_contact_id', null); set('primary_contact_nome', '') }
              }
              if (!id) { set('primary_contact_id', null); set('primary_contact_nome', '') }
            }} />
          {errs.empresa_id && <span style={{ color:'#DC2626', fontSize:11, marginTop:2, display:'block' }}>{errs.empresa_id}</span>}
        </>
      case 'primary_contact_id':
        return <ContatoSearch value={form.primary_contact_id} label={form.primary_contact_nome}
          empresaId={form.empresa_id} allContatos={todosContatos}
          onChange={(id, nome) => { set('primary_contact_id', id); set('primary_contact_nome', nome) }} />
      case 'responsavel':
        return <SellerSelect value={form.responsavel} onChange={nome => set('responsavel', nome)} style={m.input} />
      case 'situacao':
        return (<>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)',
              width:8, height:8, borderRadius:'50%', pointerEvents:'none',
              background: SITUACOES[form.situacao]?.color || '#94a3b8' }} />
            <select style={{ ...m.input, paddingLeft:26, fontWeight:600, color: SITUACOES[form.situacao]?.text || 'var(--text)' }}
              value={form.situacao}
              onChange={e => { set('situacao', e.target.value); if (e.target.value !== 'perdida') set('motivo_perda', '') }}>
              {Object.entries(SITUACOES).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
            </select>
          </div>
          {form.situacao === 'perdida' && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Motivo da perda</div>
              <MotivoPerdaField value={form.motivo_perda || ''} onChange={v => set('motivo_perda', v)} />
            </div>
          )}
        </>)
      // etapa_id renderizada como stepper fixo acima do DynamicFormLayout — ocultar aqui
      case 'etapa_id':
        return null
      case 'origem':
        return <select style={m.input} value={form.origem || ''} onChange={e => set('origem', e.target.value)}>
          <option value="">—</option>
          {['Inbound','Outbound','Canal','Indicação','Evento'].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      case 'campanha_id':
        return <CampanhaField value={form.campanha_id} onChange={v => set('campanha_id', v)} />
      case 'prazo':
        return (
          <div>
            <input type="date" style={m.input} value={form.prazo || ''} onChange={e => set('prazo', e.target.value)} />
            {form.proxima_acao_data && (
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                Próxima ação agendada: {new Date(form.proxima_acao_data).toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
              </div>
            )}
          </div>
        )
      case 'playbook_id':
        return <select style={m.input} value={form.playbook_id || ''} onChange={e => set('playbook_id', e.target.value || null)}>
          <option value="">— Nenhum —</option>
          {playbooks.map(p => <option key={p.id} value={p.id}>{p.title || p.titulo}</option>)}
        </select>
      // Valores mostrados em seção separada — não renderizar aqui
      case 'valor_cdu':
      case 'valor_sms':
      case 'valor_servico':
      case 'valor_desconto':
        return null
      case 'motivo_perda':
        return form.situacao === 'perdida'
          ? <MotivoPerdaField value={form.motivo_perda} onChange={v => set('motivo_perda', v)} />
          : null
      default: {
        // Campos de Referência (lookup) criados em Configuração de Campos
        if (field?.field_type === 'lookup' && field.lookup_target) {
          const opts = lookupOptions[field.lookup_target] || []
          const val  = form.custom_fields?.[key] ?? ''
          const selected = opts.find(o => o.id === String(val))
          return (
            <SearchSelect
              options={opts}
              value={val ? String(val) : ''}
              onChange={v => setCustomField(key, v || '')}
              placeholder={selected ? selected.label : `Buscar ${field.label}…`}
            />
          )
        }
        // Campo customizado genérico — usa GenericInput do DynamicFormLayout
        return undefined
      }
    }
  }

  const dadosFormBody = (
    <>
      {/* Etapa do funil — sempre fixo no topo */}
      <SectionLabel>Posição no funil</SectionLabel>
      <EtapaStepper etapas={etapas} value={form.etapa_id} onChange={id => set('etapa_id', id)} />
      <div style={{ marginTop:16 }}>
        <DynamicFormLayout
          sections={oppSections}
          fieldById={oppFieldById}
          renderField={renderOppField}
          sectionStyle={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', gap:12 }}
          labelStyle={{ ...SL }}
        />
      </div>
    </>
  )

  // ── chips do header (valor, produtos) ────────────────────────────────────
  const headerChips = (() => {
    const bruto  = (Number(form.valor_cdu)||0)+(Number(form.valor_sms)||0)+(Number(form.valor_servico)||0)
    const liq    = Math.max(0, bruto - Math.min(Number(form.valor_desconto)||0, bruto))
    const nItens = (form.itens||[]).length
    const dot  = <span style={{ color:'var(--border2)', fontSize:12 }}>·</span>
    const chip = (label, color) => (
      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
        background: color+'18', color, fontFamily:'var(--mono)', letterSpacing:'0.02em' }}>
        {label}
      </span>
    )
    const dataAbertura = initial?.criado || initial?.created_at
    const dataFmt = dataAbertura
      ? new Date(dataAbertura).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })
      : null
    const funilAtual = funis.find(f => String(f.id) === String(form.funil_id))
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        {funis.length > 0 && (
          isParceiro ? (
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 10px', borderRadius:20,
              border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text-muted)' }}>
              {funilAtual?.nome || '— Funil —'}
            </span>
          ) : (
          <select
            value={form.funil_id || funilId || ''}
            onChange={e => {
              const novoFunilId = e.target.value
              if (!novoFunilId || novoFunilId === String(form.funil_id)) return
              const novoFunil = funis.find(f => String(f.id) === novoFunilId)
              if (!novoFunil) return
              setMoverFunilPopup({ novoFunil, etapaId: novoFunil.etapas?.[0]?.id || null })
            }}
            style={{ fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:20,
              border:'1px solid var(--border)', background:'var(--surface2)',
              color:'var(--text-muted)', cursor:'pointer', outline:'none', maxWidth:140 }}
          >
            <option value="">— Funil —</option>
            {funis.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          )
        )}

        {/* Popup: escolher etapa no funil de destino */}
        {moverFunilPopup && createPortal(
          <div style={{ position:'fixed', inset:0, zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.4)', backdropFilter:'blur(2px)' }}
            onClick={e => { if (e.target === e.currentTarget) setMoverFunilPopup(null) }}
          >
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14,
              padding:'28px 32px', minWidth:340, maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
                Mover para "{moverFunilPopup.novoFunil.nome}"
              </div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
                Em qual etapa deste funil a oportunidade deve entrar?
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
                {(moverFunilPopup.novoFunil.etapas || []).map(etapa => (
                  <label key={etapa.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer',
                    padding:'10px 14px', borderRadius:8, border:`2px solid ${moverFunilPopup.etapaId === etapa.id ? etapa.cor : 'var(--border)'}`,
                    background: moverFunilPopup.etapaId === etapa.id ? etapa.cor + '18' : 'var(--surface2)',
                    transition:'all 0.15s' }}>
                    <input type="radio" name="etapa_destino"
                      checked={moverFunilPopup.etapaId === etapa.id}
                      onChange={() => setMoverFunilPopup(p => ({ ...p, etapaId: etapa.id }))}
                      style={{ accentColor: etapa.cor }} />
                    <span style={{ width:10, height:10, borderRadius:'50%', background: etapa.cor, flexShrink:0 }} />
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{etapa.nome}</span>
                    <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                      {etapa.probabilidade}%
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button onClick={() => setMoverFunilPopup(null)}
                  style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:'none',
                    color:'var(--text-muted)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
                  Cancelar
                </button>
                <button
                  disabled={!moverFunilPopup.etapaId}
                  onClick={() => {
                    set('funil_id', String(moverFunilPopup.novoFunil.id))
                    set('etapa_id', moverFunilPopup.etapaId)
                    setMoverFunilPopup(null)
                  }}
                  style={{ padding:'8px 22px', borderRadius:8, border:'none', background:'var(--accent)',
                    color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)',
                    opacity: moverFunilPopup.etapaId ? 1 : 0.4 }}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        {dataFmt && <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>Aberta em {dataFmt}</span>}
        {dataFmt && (nItens > 0 || liq > 0) && dot}
        {nItens > 0 && chip(`${nItens} produto${nItens>1?'s':''}`, 'var(--text-muted)')}
        {nItens > 0 && liq > 0 && dot}
        {form.valor_cdu > 0 && chip(`CDU ${fmtMoeda(form.valor_cdu)}`, 'var(--accent)')}
        {form.valor_sms > 0 && chip(`SMS ${fmtMoeda(form.valor_sms)}`, '#3B82F6')}
        {form.valor_servico > 0 && chip(`Serv. ${fmtMoeda(form.valor_servico)}`, '#10B981')}
        {liq > 0 && (
          <>
            {(form.valor_cdu>0||form.valor_sms>0||form.valor_servico>0) && dot}
            <span style={{ fontSize:11, fontWeight:800, fontFamily:'var(--mono)',
              color:'var(--text)', letterSpacing:'-0.02em' }}>
              {fmtMoeda(liq)}
            </span>
          </>
        )}
      </div>
    )
  })()

  // ── tabs para edição ──────────────────────────────────────────────────────
  const OPP_TABS = isEditing ? [
    { key: 'dados',         label: 'Dados' },
    { key: 'produtos',      label: 'Produtos',      badge: itensCount || undefined },
    { key: 'tarefas',       label: 'Tarefas',       badge: oppTarefasCount || undefined },
    { key: 'equipe',        label: 'Equipe',        badge: oppEquipeCount || undefined },
    { key: 'documentos',    label: 'Documentos',    badge: oppDocumentosCount || undefined },
    { key: 'proposta',      label: 'Proposta',      badge: oppPropostaCount || undefined },
    { key: 'questionarios', label: 'Questionários', badge: oppQuestionariosCount || undefined },
    { key: 'playbook',      label: 'Playbook',      badge: oppPlaybookCount || undefined },
  ] : undefined

  // ── botão de histórico (headerActions) ───────────────────────────────────
  const logToggleBtn = isEditing ? (
    <button type="button"
      title={logOpen ? 'Fechar histórico' : 'Histórico de alterações'}
      onClick={() => setLogOpen(v => !v)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)', background: logOpen ? 'var(--accent-glow)' : 'var(--surface)',
        cursor: 'pointer', color: logOpen ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0,
        fontSize: 14,
      }}>
      🕐
    </button>
  ) : null

  // ── painel histórico (rightPanel) ─────────────────────────────────────────
  const logPanelContent = isEditing ? (
    <>
      <div style={{ padding:'10px 12px 8px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexShrink:0, minWidth:0 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)',
          textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
          🕐 Histórico
        </span>
        <button type="button" onClick={() => setLogOpen(false)} title="Fechar histórico"
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
            fontSize:13, padding:'2px 4px', lineHeight:1, borderRadius:4, flexShrink:0 }}>
          ✕
        </button>
      </div>
      <HistoricoPanel oppId={initial.id} logs={MOCK_LOGS_OPORTUNIDADE} />
    </>
  ) : null

  // ── slot extra: confirmação de exclusão ───────────────────────────────────
  const extraSlot = isEditing ? (
    confirmDelete ? (
      <div style={m.deleteConfirm}>
        <span style={m.deleteConfirmText}>Excluir permanentemente?</span>
        <button type="button" style={m.deleteConfirmYes} onClick={() => { onDelete(initial.id); onClose() }}>Sim, excluir</button>
        <button type="button" style={m.deleteConfirmNo} onClick={() => setConfirmDelete(false)}>Cancelar</button>
      </div>
    ) : (
      <Button variant="danger" onClick={() => setConfirmDelete(true)}>Excluir oportunidade</Button>
    )
  ) : null

  // ── conteúdo do body (tab ativa ou form simples) ──────────────────────────
  const bodyContent = isEditing ? (
    <>
      {/* Aba: Dados */}
      {tab==='dados' && (
        <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0 }}>

          {/* ── Playbook contextual — aparece automaticamente quando há steps para a etapa ── */}
          {playbookContextual && (
            <div style={{ flexShrink:0, borderBottom:'1px solid var(--border2)',
              background:'linear-gradient(135deg,#EEF2FF 0%,#F5F3FF 100%)' }}>
              <button onClick={() => setPlaybookHintOpen(o => !o)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'10px 20px',
                  background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textAlign:'left' }}>
                <span style={{ fontSize:14 }}>📋</span>
                <span style={{ flex:1, fontSize:12, fontWeight:700, color:'var(--accent)' }}>
                  Playbook · {playbookContextual.etapa?.nome || playbookContextual.stage}
                </span>
                <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:4 }}>
                  {playbookContextual.steps.length} orientaç{playbookContextual.steps.length === 1 ? 'ão' : 'ões'}
                </span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{playbookHintOpen ? '▲' : '▼'}</span>
              </button>
              {playbookHintOpen && (
                <div style={{ padding:'0 20px 14px', display:'flex', flexDirection:'column', gap:8,
                  maxHeight:320, overflowY:'auto' }}>
                  {playbookContextual.steps.map((s, i) => (
                    <div key={s.id || i} style={{ background:'#fff', border:'1px solid var(--accent)22',
                      borderRadius:8, padding:'10px 14px' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:4 }}>
                        {s.icone ? `${s.icone} ` : ''}{s.title}
                      </div>
                      {s.content && (
                        <div style={{ fontSize:12, color:'var(--text-soft)', lineHeight:1.6,
                          whiteSpace:'pre-wrap', maxHeight:120, overflow:'hidden',
                          WebkitMaskImage:'linear-gradient(to bottom, black 70%, transparent 100%)' }}>
                          {s.content.replace(/[#*`]/g, '').trim()}
                        </div>
                      )}
                      <button onClick={() => setTab('playbook')}
                        style={{ marginTop:6, fontSize:11, color:'var(--accent)', background:'none',
                          border:'none', cursor:'pointer', fontFamily:'var(--font)', padding:0, fontWeight:600 }}>
                        Ver playbook completo →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={m.body}>{dadosFormBody}</div>
        </div>
      )}

      {/* Aba: Playbook */}
      {tab==='playbook' && (
        <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0 }}>
          <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
            <OppPlaybookTab opp={initial} etapaId={form.etapa_id} etapas={etapas} playbookId={form.playbook_id} onChangePlaybook={v => set('playbook_id', v || null)} />
          </div>
        </div>
      )}

      {/* Aba: Produtos */}
      {tab==='produtos' && (
        <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0, padding:'0 24px' }}>
          <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingBottom:16 }}>
            <OppProdutosTab
              itens={form.itens}
              onChange={itens => set('itens', itens)}
              onSyncValor={itens => {
                const sms     = itens.filter(i => (i.tipo||'').toLowerCase() === 'saas').reduce((s,i) => s+i.subtotal, 0)
                const cdu     = itens.filter(i => (i.tipo||'').toLowerCase() === 'licenca').reduce((s,i) => s+i.subtotal, 0)
                const servico = itens.filter(i => !['saas','licenca'].includes((i.tipo||'').toLowerCase())).reduce((s,i) => s+i.subtotal, 0)
                if (sms     > 0) set('valor_sms',     Math.round(sms))
                if (cdu     > 0) set('valor_cdu',     Math.round(cdu))
                if (servico > 0) set('valor_servico', Math.round(servico))
                setTab('dados')
              }}
            />
            <ValorFinanceiroSection form={form} set={set} />
          </div>
        </div>
      )}

      {/* Aba: Tarefas */}
      {tab==='tarefas' && (
        <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0, padding:'0 24px' }}>
          <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingTop:8, paddingBottom:16 }}>
            <OppTarefasTab
              oppId={initial.id}
              oppNome={initial.titulo}
              tarefas={tarefas}
              onSaveTarefa={onSaveTarefa}
              onToggleStatus={onToggleStatus}
            />
          </div>
        </div>
      )}

      {/* Aba: Proposta */}
      {tab==='proposta' && (
        <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0, padding:'0 24px' }}>
          <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingTop:16, paddingBottom:16 }}>
            <OppPropostaTab opp={{ ...form, id: initial.id }} />
          </div>
        </div>
      )}

      {/* Aba: Questionários */}
      {tab==='questionarios' && (
        <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0, padding:'0 24px' }}>
          <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingTop:16, paddingBottom:16 }}>
            <OppQuestionariosTab
              oppId={initial.id}
              oppNome={initial.titulo}
              empresaNome={initial.empresa_nome}
              empresaId={initial.empresa_id}
            />
          </div>
        </div>
      )}

      {/* Aba: Equipe do Negócio */}
      {tab==='equipe' && (
        <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0, padding:'0 24px' }}>
          <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingTop:4, paddingBottom:16 }}>
            <OppEquipeTab oppId={initial.id} />
          </div>
        </div>
      )}

      {/* Aba: Documentos */}
      {tab==='documentos' && (
        <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0, padding:'0 24px' }}>
          <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingTop:4, paddingBottom:16 }}>
            <OppDocumentosTab oppId={initial.id} />
          </div>
        </div>
      )}

      {/* Coluna 2: Notas (sempre visível — rendered outside SlideOver via rightPanel) */}
    </>
  ) : (
    /* Nova oportunidade: form simples */
    <div style={m.body}>{dadosFormBody}</div>
  )

  return (
    <>
      <SlideOver
        open={true}
        onClose={onClose}
        onSave={handleSave}
        onDelete={isEditing ? () => { onDelete(initial.id); onClose() } : undefined}
        deleteConfirm={`Excluir a oportunidade "${form.titulo}"? Esta ação não pode ser desfeita.`}
        title={isEditing ? form.titulo || 'Editar oportunidade' : 'Nova oportunidade'}
        subtitle={isEditing ? form.empresa_nome : 'Oportunidade vinculada ao funil de vendas'}
        headerExtra={headerChips}
        headerActions={logToggleBtn}
        tabs={OPP_TABS}
        activeTab={tab}
        onTabChange={setTab}
        defaultWidth={isEditing ? 860 : 580}
        saveLabel={isEditing ? 'Salvar' : 'Criar oportunidade'}
        cancelLabel="Cancelar"
        rightPanel={logPanelContent}
        rightPanelOpen={logOpen}
      >
        {bodyContent}
      </SlideOver>

      {/* Modal de pós-fechamento — geração de contrato e/ou projeto */}
    </>
  )
}

// ─── Aba Playbook / Manual de Vendas ─────────────────────────────────────────
// Mapeia o nome da etapa do funil para uma chave do STAGE_CFG do playbook
function mapEtapaToStage(etapaNome) {
  const n = (etapaNome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (n.includes('prospec') || n.includes('lead'))           return 'prospeccao'
  if (n.includes('qualif') || n.includes('demo') || n.includes('mapeamento') || n.includes('stakeholder')) return 'qualificacao'
  if (n.includes('diagn') || n.includes('poc') || n.includes('tecn'))    return 'diagnostico'
  if (n.includes('proposta') || n.includes('comercial'))     return 'proposta'
  if (n.includes('negoc') || n.includes('aprovac') || n.includes('fechado') || n.includes('contrato') || n.includes('perdido')) return 'fechamento'
  return null
}

function OppPlaybookTab({ opp, etapaId, etapas, playbookId, onChangePlaybook }) {
  const { playbooks } = usePlaybooks()

  // playbookId vem do form (editável); cai de volta para opp.playbook_id se não passado
  const activeId = playbookId !== undefined ? playbookId : opp?.playbook_id
  const playbook = useMemo(() => playbooks.find(p => p.id === activeId) || null, [playbooks, activeId])
  const etapa    = useMemo(() => etapas.find(e => e.id === etapaId), [etapas, etapaId])
  const stage    = useMemo(() => etapa ? mapEtapaToStage(etapa.nome) : null, [etapa])
  const stageCfg = stage ? STAGE_CFG[stage] : null

  const steps = useMemo(() =>
    playbook ? (playbook.steps || []).filter(s =>
      s.stage === stage || (etapaId != null && String(s.stage) === String(etapaId))
    ) : [],
  [playbook, stage, etapaId])

  const resources = useMemo(() =>
    playbook ? (playbook.resources || []) : [],
    [playbook])

  const refs = useMemo(() => {
    if (!playbook) return []
    const oppSeg  = (opp?.custom_fields?.segmento_industria || '').toLowerCase()
    return (playbook.refs || []).sort((a, b) => {
      const aMatch = oppSeg && (a.summary || '').toLowerCase().includes(oppSeg) ? 1 : 0
      const bMatch = oppSeg && (b.summary || '').toLowerCase().includes(oppSeg) ? 1 : 0
      return bMatch - aMatch
    }).slice(0, 3)
  }, [playbook, opp])

  // ── Inline styles ──────────────────────────────────────────────────────────
  const S = {
    root:      { padding:'24px 28px', display:'flex', flexDirection:'column', gap:24 },
    header:    { display:'flex', alignItems:'center', gap:10, paddingBottom:16, borderBottom:'1px solid var(--border2)' },
    pbTitle:   { fontSize:15, fontWeight:700, color:'var(--text)', letterSpacing:'-0.2px', margin:0 },
    pbSub:     { fontSize:12, color:'var(--text-muted)', marginTop:2 },
    stageBadge:{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:20,
                 fontSize:12, fontWeight:600, background: stageCfg?.bg || 'var(--surface2)',
                 color: stageCfg?.color || 'var(--text-muted)', flexShrink:0 },
    section:   { display:'flex', flexDirection:'column', gap:10 },
    sLabel:    { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
                 color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 },
    sLabelLine:{ flex:1, height:1, background:'var(--border2)' },
    stepCard:  { background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10,
                 padding:'14px 16px' },
    stepTitle: { fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:8 },
    mdP:       { fontSize:13, color:'var(--text-soft)', lineHeight:1.7, margin:'0 0 6px' },
    mdH2:      { fontSize:13, fontWeight:700, color:'var(--text)', margin:'12px 0 4px', borderBottom:'1px solid var(--border2)', paddingBottom:4 },
    mdH3:      { fontSize:12, fontWeight:700, color:'var(--text)', margin:'10px 0 4px' },
    mdLi:      { fontSize:13, color:'var(--text-soft)', lineHeight:1.65, marginBottom:3 },
    resGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:8 },
    resCard:   { border:'1px solid var(--border2)', borderRadius:9, padding:'10px 12px',
                 background:'var(--surface)', display:'flex', flexDirection:'column', gap:6 },
    resTitle:  { fontSize:12, fontWeight:600, color:'var(--text)', lineHeight:1.35 },
    resType:   { fontSize:10, fontWeight:600, borderRadius:8, padding:'1px 7px', alignSelf:'flex-start' },
    resLink:   { fontSize:11, color:'var(--accent)', textDecoration:'none', fontWeight:600, marginTop:'auto' },
    refCard:   { border:'1px solid var(--border2)', borderRadius:9, padding:'12px 14px',
                 background:'var(--surface)', display:'flex', alignItems:'flex-start', gap:10 },
    refLogo:   { width:32, height:32, borderRadius:7, display:'flex', alignItems:'center',
                 justifyContent:'center', fontWeight:800, fontSize:11, flexShrink:0,
                 fontFamily:'var(--mono)', letterSpacing:'-0.5px' },
    refName:   { fontSize:13, fontWeight:700, color:'var(--text)' },
    refSub:    { fontSize:12, color:'var(--text-muted)', marginTop:2, lineHeight:1.4 },
    kpiRow:    { display:'flex', gap:6, flexWrap:'wrap', marginTop:6 },
    kpi:       { background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7,
                 padding:'4px 10px', fontSize:11, color:'var(--text-muted)' },
    kpiVal:    { fontWeight:700, color:'var(--text)', marginRight:3 },
    empty:     { padding:'32px 0', textAlign:'center', color:'var(--text-muted)', fontSize:13,
                 display:'flex', flexDirection:'column', alignItems:'center', gap:8 },
    emptyIcon: { fontSize:32, opacity:0.25 },
    noPlkBtn:  { marginTop:8, padding:'6px 14px', background:'none', border:'1px solid var(--border)',
                 borderRadius:7, fontSize:12, color:'var(--text-muted)', cursor:'pointer',
                 fontFamily:'var(--font)' },
    assignLink:{ fontSize:12, color:'var(--accent)', background:'var(--accent-glow)',
                 border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer',
                 fontFamily:'var(--font)', fontWeight:600 },
  }

  // Inline mini-markdown renderer (only h2, h3, p, ul, li — no heavy import needed)
  function MiniMd({ content }) {
    if (!content) return null
    return (
      <div>
        {(content || '').split('\n').map((line, i) => {
          if (line.startsWith('## '))  return <div key={i} style={S.mdH2}>{line.slice(3)}</div>
          if (line.startsWith('### ')) return <div key={i} style={S.mdH3}>{line.slice(4)}</div>
          if (line.startsWith('- ') || line.startsWith('* '))
            return <div key={i} style={{ display:'flex', gap:6, marginBottom:3 }}>
              <span style={{ color:'var(--accent)', flexShrink:0, marginTop:1 }}>•</span>
              <span style={S.mdLi}>{line.slice(2)}</span>
            </div>
          if (line.startsWith('> '))
            return <div key={i} style={{ borderLeft:'3px solid var(--accent)', paddingLeft:10,
              margin:'6px 0', background:'var(--accent-glow)', borderRadius:'0 6px 6px 0', padding:'6px 10px' }}>
              <span style={{ fontSize:13, color:'var(--text-soft)', fontStyle:'italic' }}>{line.slice(2)}</span>
            </div>
          if (line.startsWith('- [x]') || line.startsWith('- [ ]'))
            return <div key={i} style={{ display:'flex', gap:6, marginBottom:3 }}>
              <span style={{ color: line.startsWith('- [x]') ? '#10B981' : 'var(--border)' }}>
                {line.startsWith('- [x]') ? '☑' : '☐'}
              </span>
              <span style={{ ...S.mdLi, opacity: line.startsWith('- [x]') ? 0.55 : 1 }}>{line.slice(6)}</span>
            </div>
          if (line.trim() === '') return null
          return <p key={i} style={S.mdP}>{line}</p>
        })}
      </div>
    )
  }

  function SectionHeading({ icon, label }) {
    return (
      <div style={S.sLabel}>
        <span>{icon}</span>
        <span>{label}</span>
        <span style={S.sLabelLine} />
      </div>
    )
  }

  const playbookSelector = (
    <div style={{ padding:'16px 28px 0', borderBottom:'1px solid var(--border2)', paddingBottom:16 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
        letterSpacing:'0.07em', display:'block', marginBottom:6 }}>
        Playbook <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0, fontSize:10 }}>(opcional)</span>
      </label>
      <SearchSelect
        options={playbooks.map(pb => ({ id: pb.id, label: pb.title, sublabel: pb.description || pb.segment || '', color: 'var(--accent)' }))}
        value={activeId || null}
        onChange={(id) => onChangePlaybook && onChangePlaybook(id)}
        placeholder="Pesquisar playbook…"
        noResults="Nenhum playbook encontrado"
      />
    </div>
  )

  // ── No playbook assigned ──────────────────────────────────────────────────
  if (!playbook) {
    return (
      <div>
        {playbookSelector}
        <div style={S.empty}>
          <div style={S.emptyIcon}>📖</div>
          <div style={{ fontWeight:600, color:'var(--text)', fontSize:14 }}>Nenhum playbook vinculado</div>
          <div>Selecione um playbook acima para ver guias contextuais por etapa.</div>
        </div>
      </div>
    )
  }

  // ── Playbook found but no content for this stage ───────────────────────────
  const hasStepContent = steps.length > 0

  return (
    <div style={S.root}>
      {/* ── Seletor de playbook ── */}
      {playbookSelector}
      {/* ── Playbook header ── */}
      <div style={S.header}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={S.pbTitle}>{playbook.title}</p>
          <p style={S.pbSub}>{playbook.description || playbook.segment}</p>
        </div>
        {etapa && (
          <span style={S.stageBadge}>{stageCfg?.icon} {etapa.nome}</span>
        )}
      </div>

      {/* ── Atividades sugeridas ── */}
      <div style={S.section}>
        <SectionHeading icon="🎯" label="Atividades Sugeridas para esta Etapa" />
        {!stage ? (
          <div style={{ fontSize:13, color:'var(--text-muted)', padding:'8px 0' }}>
            Etapa atual não mapeada para o playbook.
          </div>
        ) : !hasStepContent ? (
          <div style={{ ...S.empty, padding:'16px 0' }}>
            <div style={S.emptyIcon}>🎯</div>
            <div>Nenhum guia prático cadastrado para este produto nesta etapa.</div>
          </div>
        ) : (
          steps.map(step => (
            <div key={step.id} style={S.stepCard}>
              <div style={S.stepTitle}>{step.title}</div>
              <MiniMd content={step.content} />
            </div>
          ))
        )}
      </div>

      {/* ── Materiais de apoio ── */}
      {resources.length > 0 && (
        <div style={S.section}>
          <SectionHeading icon="📂" label="Materiais de Apoio" />
          <div style={S.resGrid}>
            {resources.map(res => {
              const cfg = RESOURCE_CFG[res.type] || RESOURCE_CFG.outro
              return (
                <div key={res.id} style={S.resCard}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:18 }}>{cfg.icon}</span>
                    <span style={{ ...S.resType, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
                  </div>
                  <div style={S.resTitle}>{res.title}</div>
                  {res.tags?.length > 0 && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {res.tags.slice(0,2).map(t => (
                        <span key={t} style={{ fontSize:10, color:'var(--text-muted)', background:'var(--surface2)',
                          border:'1px solid var(--border)', borderRadius:8, padding:'1px 6px' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <a href={res.url} target="_blank" rel="noreferrer" style={S.resLink}>↗ Abrir</a>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Objeções ── */}
      {(() => {
        const OBJ_CATS_VIEW = {
          preco:        { label:'Preço',        icon:'💰', bg:'#FEF3C7', color:'#92400E' },
          timing:       { label:'Timing',       icon:'⏱', bg:'#EDE9FE', color:'#5B21B6' },
          concorrencia: { label:'Concorrência', icon:'⚔️', bg:'#DBEAFE', color:'#1E40AF' },
          necessidade:  { label:'Necessidade',  icon:'🎯', bg:'#D1FAE5', color:'#065F46' },
          autoridade:   { label:'Autoridade',   icon:'👤', bg:'#FEF9C3', color:'#854D0E' },
          confianca:    { label:'Confiança',    icon:'🛡️', bg:'#F0FDF4', color:'#166534' },
          outro:        { label:'Outro',        icon:'💬', bg:'#F3F4F6', color:'#374151' },
        }
        const todasObjecoes = playbook.objecoes || []
        console.log('[OppPlaybook] objecoes:', todasObjecoes, 'stage:', stage, 'playbook.id:', playbook.id)
        // stage null = etapa não mapeada → mostra todas
        // stage definido: mostra sem etapa + com etapa correspondente
        const objecoesFiltradas = !stage
          ? todasObjecoes
          : todasObjecoes.filter(o =>
              !o.etapa ||
              o.etapa === stage ||
              (etapaId != null && String(o.etapa) === String(etapaId))
            )
        if (!objecoesFiltradas.length) return null
        return (
          <div style={S.section}>
            <SectionHeading icon="🛡️" label="Objeções Comuns" />
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {objecoesFiltradas.map((obj, i) => {
                const cat = OBJ_CATS_VIEW[obj.categoria] || OBJ_CATS_VIEW.outro
                const etapaCfg = obj.etapa ? STAGE_CFG[obj.etapa] : null
                return (
                  <div key={obj.id || i} style={{ background:'var(--surface)', border:'1px solid var(--border2)',
                    borderRadius:10, overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
                      background:'var(--surface2)', borderBottom:'1px solid var(--border2)' }}>
                      <span style={{ fontSize:14 }}>{cat.icon}</span>
                      <span style={{ flex:1, fontSize:12, fontWeight:700, color:'var(--text)' }}>
                        {obj.objecao || '—'}
                      </span>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
                        background: cat.bg, color: cat.color }}>{cat.label}</span>
                      {etapaCfg && (
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:10,
                          background: etapaCfg.bg || 'var(--surface2)', color: etapaCfg.color || 'var(--text-muted)' }}>
                          {etapaCfg.icon} {etapaCfg.label || obj.etapa}
                        </span>
                      )}
                    </div>
                    <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
                          letterSpacing:'0.06em', marginBottom:4 }}>Resposta sugerida</div>
                        <div style={{ fontSize:13, color:'var(--text-soft)', lineHeight:1.65 }}>{obj.resposta}</div>
                      </div>
                      {obj.escalonamento?.trim() && (
                        <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:7, padding:'8px 12px' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#92400E', textTransform:'uppercase',
                            letterSpacing:'0.06em', marginBottom:3 }}>Dica de escalonamento</div>
                          <div style={{ fontSize:12, color:'#78350F', lineHeight:1.6 }}>{obj.escalonamento}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Clientes de referência ── */}
      {refs.length > 0 && (
        <div style={S.section}>
          <SectionHeading icon="🏆" label="Clientes de Referência" />
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {refs.map(ref => (
              <div key={ref.id} style={S.refCard}>
                <div style={{ ...S.refLogo, background:ref.logo_color+'22', color:ref.logo_color, border:`1px solid ${ref.logo_color}44` }}>
                  {ref.logo_initials || ref.company_name.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={S.refName}>{ref.company_name}</span>
                    {ref.region && (
                      <span style={{ fontSize:10, background:'var(--surface2)', border:'1px solid var(--border)',
                        borderRadius:8, padding:'1px 6px', color:'var(--text-muted)' }}>{ref.region}</span>
                    )}
                  </div>
                  {ref.summary && <div style={S.refSub}>{ref.summary}</div>}
                  {ref.results?.filter(r => r.label).length > 0 && (
                    <div style={S.kpiRow}>
                      {ref.results.filter(r => r.label).slice(0,3).map((r, i) => (
                        <span key={i} style={S.kpi}>
                          <span style={S.kpiVal}>{r.value}</span>{r.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stepper de etapas (Connected Dots) ──────────────────────────────────────
function EtapaStepper({ etapas, value, onChange }) {
  const activeIdx = etapas.findIndex(e => e.id === value)

  return (
    <div style={{ overflowX:'auto', paddingBottom:4 }}>
      <div style={{
        display:'flex', alignItems:'flex-start',
        minWidth: etapas.length * 80,
        paddingTop:8, paddingBottom:4,
      }}>
        {etapas.map((etapa, idx) => {
          const isDone    = idx < activeIdx
          const isActive  = idx === activeIdx
          const isFuture  = idx > activeIdx
          // Cor do nó: azul-escuro do tema para concluídas/ativa, cinza para futuras
          const nodeColor  = isFuture ? '#CBD5E1' : '#1E3A5F'
          const labelColor = isActive  ? '#1E3A5F' : isFuture ? '#94A3B8' : '#475569'

          return (
            <div key={etapa.id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>

              {/* ── Linha conectora (metade esquerda + metade direita) ── */}
              {/* Linha à esquerda */}
              {idx > 0 && (
                <div style={{
                  position:'absolute', top:13, right:'50%', left:'-50%',
                  height:2,
                  background: idx <= activeIdx ? '#1E3A5F' : '#E2E8F0',
                  transition:'background 0.3s',
                  zIndex:0,
                }} />
              )}
              {/* Linha à direita */}
              {idx < etapas.length - 1 && (
                <div style={{
                  position:'absolute', top:13, left:'50%', right:'-50%',
                  height:2,
                  background: idx < activeIdx ? '#1E3A5F' : '#E2E8F0',
                  transition:'background 0.3s',
                  zIndex:0,
                }} />
              )}

              {/* ── Botão / Nó ── */}
              <button
                type="button"
                onClick={() => onChange(etapa.id)}
                title={etapa.nome}
                style={{
                  position:'relative', zIndex:1,
                  width:28, height:28, borderRadius:'50%',
                  background: isFuture ? '#F1F5F9' : '#1E3A5F',
                  border: isActive
                    ? '3px solid #1E3A5F'
                    : `2px solid ${isFuture ? '#CBD5E1' : '#1E3A5F'}`,
                  outline: isActive ? '3px solid rgba(30,58,95,0.18)' : 'none',
                  outlineOffset: isActive ? '2px' : '0',
                  cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 0.22s ease',
                  boxShadow: isActive ? '0 0 0 4px rgba(30,58,95,0.12)' : 'none',
                  padding:0, flexShrink:0,
                }}
              >
                {isDone ? (
                  /* Check SVG */
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : isActive ? (
                  /* Ponto sólido branco */
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />
                ) : (
                  /* Ponto futuro — vazio */
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#CBD5E1' }} />
                )}
              </button>

              {/* ── Label ── */}
              <span style={{
                marginTop:7, fontSize:10, fontWeight: isActive ? 700 : 500,
                color: labelColor, textAlign:'center', lineHeight:1.3,
                maxWidth:72, wordBreak:'break-word',
                transition:'color 0.2s',
                fontFamily:'var(--font)',
              }}>
                {etapa.nome}
              </span>
            </div>
          )
        })}
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

// ─── Dropdown seletor de funil ────────────────────────────────────────────────
function FunilDropdown({ funis, funilAtivo, onChange }) {
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)
  const ativo           = funis.find(f => f.id === funilAtivo)

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:8, height:36, padding:'0 12px', borderRadius:7,
          border:`1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          background: open ? 'var(--blue-bg)' : 'var(--surface2)',
          cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.15s', minWidth:160, boxSizing:'border-box' }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
          <path d="M1 2h14l-5 6v5l-4-2V8L1 2z" stroke={open ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
        </svg>
        <span style={{ fontSize:13, fontWeight:700, color:open ? 'var(--accent)' : 'var(--text)', flex:1, textAlign:'left' }}>
          {ativo?.nome || 'Selecionar funil'}
        </span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink:0, transform:open?'rotate(180deg)':'none', transition:'transform 0.2s' }}>
          <path d="M2 4l4 4 4-4" stroke={open?'var(--accent)':'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, minWidth:240, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 8px 30px rgba(0,0,0,0.14)', zIndex:200, overflow:'hidden' }}>
          <div style={{ padding:'7px 12px 6px', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'var(--mono)', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' }}>
            Funil de vendas
          </div>
          {funis.map(f => {
            const isSel = f.id === funilAtivo
            return (
              <button key={f.id} onMouseDown={() => { onChange(f.id); setOpen(false) }}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 14px',
                  background:isSel ? 'var(--blue-bg)' : 'none', border:'none', cursor:'pointer',
                  textAlign:'left', fontFamily:'var(--font)',
                  borderLeft:`3px solid ${isSel ? 'var(--accent)' : 'transparent'}` }}>
                <span style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:isSel?700:500, color:isSel?'var(--accent)':'var(--text)' }}>{f.nome}</div>
                  {f.descricao && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{f.descricao}</div>}
                </span>
                <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--text-muted)', flexShrink:0 }}>{f.etapas.length} etapas</span>
                {isSel && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}>
                    <path d="M2 7l4 4 6-7" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )
          })}
          <div style={{ padding:'8px 14px', borderTop:'1px solid var(--border2)', background:'var(--surface2)' }}>
            <a href="/settings/funis" style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', fontWeight:500 }}>⚙ Configurar funis</a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Export Tray ─────────────────────────────────────────────────────────────
const SCOPE_LABEL = { todos:'Todos os registros', filtrados:'Registros filtrados', selecionados:'Selecionados' }
const ST_ICON  = { concluido:'✓', erro:'✕', gerando:'⟳' }
const ST_COLOR = { concluido:'var(--green-text)', erro:'var(--red)', gerando:'var(--text-muted)' }

function ExportTray({ logs, onClose, onClear }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} style={et.tray}>
      <div style={et.trayHeader}>
        <span style={et.trayTitle}>Histórico de exportações</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {logs.length > 0 && <button style={et.clearBtn} onClick={onClear}>Limpar</button>}
          <button style={et.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>
      {logs.length === 0 ? (
        <div style={et.empty}><span style={{ fontSize:24 }}>📭</span><span style={{ fontSize:13, color:'var(--text-muted)' }}>Nenhuma exportação ainda</span></div>
      ) : (
        <div style={et.list}>
          {logs.map(log => (
            <div key={log.id} style={et.item}>
              <div style={et.itemIconWrap}><span style={{ fontSize:14, color:ST_COLOR[log.status] }}>{ST_ICON[log.status]}</span></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={et.itemFile}>{log.fileName}</div>
                <div style={et.itemMeta}>
                  <span style={et.metaTag}>{SCOPE_LABEL[log.scope]||log.scope}</span>
                  <span style={et.metaDot}>·</span>
                  <span style={et.metaVal}>{log.total} registro{log.total!==1?'s':''}</span>
                  <span style={et.metaDot}>·</span>
                  <span style={{ ...et.metaVal, color:ST_COLOR[log.status], fontWeight:600 }}>{log.status==='concluido'?'Concluído':'Erro'}</span>
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
  tray:       { position:'absolute', top:'calc(100% + 8px)', right:0, width:340, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', zIndex:200, overflow:'hidden' },
  trayHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' },
  trayTitle:  { fontSize:13, fontWeight:700, color:'var(--text)' },
  clearBtn:   { fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' },
  closeBtn:   { fontSize:13, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'32px 0' },
  list:       { maxHeight:320, overflowY:'auto' },
  item:       { display:'flex', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border2)' },
  itemIconWrap:{ width:28, height:28, borderRadius:7, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 },
  itemFile:   { fontSize:12, fontWeight:600, color:'var(--text)', fontFamily:'var(--mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  itemMeta:   { display:'flex', alignItems:'center', gap:5, marginTop:2, flexWrap:'wrap' },
  metaTag:    { fontSize:10, fontFamily:'var(--mono)', color:'var(--text-muted)' },
  metaDot:    { fontSize:10, color:'var(--border)', fontFamily:'var(--mono)' },
  metaVal:    { fontSize:10, fontFamily:'var(--mono)', color:'var(--text-soft)' },
  itemDate:   { fontSize:10, color:'var(--text-muted)', marginTop:3, fontFamily:'var(--mono)' },
  trayFooter: { padding:'8px 14px', borderTop:'1px solid var(--border2)', background:'var(--surface2)' },
}

// ─── Bulk Action Modals ────────────────────────────────────────────────────────

function BulkTaskModal({ oppIds, opps, onClose, saveTask }) {
  const [tiposAcao] = useLocalState(TIPOS_ACAO_KEY, [])
  const tipos = tiposAcao.length ? tiposAcao : TIPOS_TAREFA_FALLBACK
  const { usuarios } = useUsuarios()
  const [form, setForm] = useState({ titulo:'', tipo: tipos[0]?.slug||tipos[0]?.label||'', prazo:'', responsavel:'', prioridade:'media', descricao:'' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.titulo.trim()) return
    setSaving(true)
    const oppList = opps.filter(o => oppIds.has(o.id))
    for (const opp of oppList) {
      await saveTask({
        titulo:        form.titulo,
        tipo:          form.tipo,
        prazo:         form.prazo || null,
        responsavel:   form.responsavel || '',
        prioridade:    form.prioridade,
        descricao:     form.descricao || '',
        status:        'pendente',
        entidade_tipo: 'oportunidade',
        entidade_id:   opp.id,
        entidade_nome: opp.titulo || opp.empresa_nome || '',
      })
    }
    setSaving(false)
    onClose()
  }

  return (
    <div style={m.overlay} onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth:480 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Criar tarefa em massa</div>
            <div style={m.subtitle}>{oppIds.size} oportunidade{oppIds.size!==1?'s':''} selecionada{oppIds.size!==1?'s':''}</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={blk.label}>Título da tarefa *</label>
            <input style={blk.input} value={form.titulo} onChange={e=>set('titulo',e.target.value)} placeholder="Ex: Ligar para cliente" autoFocus />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={blk.label}>Tipo</label>
              <select style={blk.input} value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
                {tipos.map(t=><option key={t.slug||t.label} value={t.slug||t.label}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={blk.label}>Prioridade</label>
              <select style={blk.input} value={form.prioridade} onChange={e=>set('prioridade',e.target.value)}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={blk.label}>Prazo</label>
              <input style={blk.input} type="date" value={form.prazo} onChange={e=>set('prazo',e.target.value)} />
            </div>
            <div>
              <label style={blk.label}>Responsável</label>
              <select style={blk.input} value={form.responsavel} onChange={e=>set('responsavel',e.target.value)}>
                <option value="">— Nenhum —</option>
                {usuarios.filter(u=>u.status!=='inativo').map(u=><option key={u.id} value={u.nome}>{u.nome}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={blk.label}>Descrição</label>
            <textarea style={{ ...blk.input, height:64, resize:'vertical' }} value={form.descricao} onChange={e=>set('descricao',e.target.value)} placeholder="Detalhes opcionais..." />
          </div>
        </div>
        <div style={m.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.titulo.trim()||saving} onClick={handleSave}>
            {saving ? 'Criando...' : `Criar ${oppIds.size} tarefa${oppIds.size!==1?'s':''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function BulkPlaybookModal({ oppIds, opps, onClose, saveOpp }) {
  const { playbooks } = usePlaybooks()
  const ativos = playbooks.filter(p => p.status !== 'inativo')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    const pb = ativos.find(p => p.id === selected)
    const oppList = opps.filter(o => oppIds.has(o.id))
    for (const opp of oppList) {
      await saveOpp({ ...opp, playbook_id: selected, playbook_nome: pb?.titulo || pb?.title || '' })
    }
    setSaving(false)
    onClose()
  }

  return (
    <div style={m.overlay} onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth:480 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Relacionar playbook</div>
            <div style={m.subtitle}>{oppIds.size} oportunidade{oppIds.size!==1?'s':''} selecionada{oppIds.size!==1?'s':''}</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:24 }}>
          {ativos.length === 0
            ? <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:24 }}>Nenhum playbook ativo cadastrado.</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {ativos.map(pb => (
                  <label key={pb.id} style={{ ...blk.radioRow, ...(selected===pb.id?blk.radioRowActive:{}) }}>
                    <input type="radio" name="pb" value={pb.id} checked={selected===pb.id} onChange={()=>setSelected(pb.id)} style={{ marginRight:10, accentColor:'var(--accent)' }} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{pb.titulo||pb.title}</div>
                      {pb.description && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{pb.description}</div>}
                    </div>
                  </label>
                ))}
              </div>
          }
        </div>
        <div style={m.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!selected||saving} onClick={handleSave}>
            {saving ? 'Salvando...' : `Relacionar em ${oppIds.size} oportunidade${oppIds.size!==1?'s':''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function BulkEquipeModal({ oppIds, opps, onClose, addMembro }) {
  const { usuarios }  = useUsuarios()
  const { sellers }   = useSellers()
  const { contacts }  = useContacts()
  const [tipoMembro, setTipoMembro] = useState('interno')
  const [papel, setPapel]           = useState('vendedor')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [saving, setSaving] = useState(false)

  const pool = useMemo(() => {
    if (tipoMembro === 'interno') return usuarios.filter(u=>u.status!=='inativo').map(u=>({ id:`s_${u.id}`, nome:u.nome, sub:u.cargo||u.email||'' }))
    if (tipoMembro === 'canal')   return sellers.map(s=>({ id:`c_${s.id}`, nome:s.nome, sub:s.empresa||'' }))
    return contacts.map(c=>({ id:`ct_${c.id}`, nome:`${c.primeiro_nome||''} ${c.sobrenome||''}`.trim(), sub:c.empresa||'' }))
  }, [tipoMembro, usuarios, sellers, contacts])

  function toggle(id) {
    setSelectedIds(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }

  function selectAll() { setSelectedIds(new Set(pool.map(p=>p.id))) }
  function clearAll()  { setSelectedIds(new Set()) }

  async function handleSave() {
    if (!selectedIds.size) return
    setSaving(true)
    const oppList = opps.filter(o => oppIds.has(o.id))
    for (const opp of oppList) {
      for (const uid of selectedIds) {
        await addMembro({ oportunidade_id: opp.id, user_id: uid, papel, tipo_membro: tipoMembro })
      }
    }
    setSaving(false)
    onClose()
  }

  return (
    <div style={m.overlay} onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth:520 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Adicionar à equipe</div>
            <div style={m.subtitle}>{oppIds.size} oportunidade{oppIds.size!==1?'s':''} selecionada{oppIds.size!==1?'s':''}</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:'16px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={blk.label}>Tipo de membro</label>
              <select style={blk.input} value={tipoMembro} onChange={e=>{setTipoMembro(e.target.value);setSelectedIds(new Set())}}>
                <option value="interno">Equipe interna</option>
                <option value="canal">Parceiro / Canal</option>
                <option value="contato">Contato externo</option>
              </select>
            </div>
            <div>
              <label style={blk.label}>Papel</label>
              <select style={blk.input} value={papel} onChange={e=>setPapel(e.target.value)}>
                <option value="vendedor">Vendedor</option>
                <option value="cs">Customer Success</option>
                <option value="tecnico">Técnico</option>
                <option value="gerente">Gerente</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <label style={{ ...blk.label, margin:0 }}>{pool.length} disponíveis</label>
            <div style={{ display:'flex', gap:8 }}>
              <button style={blk.linkBtn} onClick={selectAll}>Todos</button>
              <button style={blk.linkBtn} onClick={clearAll}>Limpar</button>
            </div>
          </div>
          <div style={{ maxHeight:240, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
            {pool.length===0
              ? <div style={{ color:'var(--text-muted)', fontSize:12, textAlign:'center', padding:16 }}>Nenhum {tipoMembro==='interno'?'usuário':tipoMembro==='canal'?'parceiro':'contato'} encontrado.</div>
              : pool.map(p=>(
                  <label key={p.id} style={{ ...blk.radioRow, cursor:'pointer', ...(selectedIds.has(p.id)?blk.radioRowActive:{}) }}>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={()=>toggle(p.id)} style={{ marginRight:10, accentColor:'var(--accent)' }} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.nome}</div>
                      {p.sub && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.sub}</div>}
                    </div>
                  </label>
                ))
            }
          </div>
        </div>
        <div style={m.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!selectedIds.size||saving} onClick={handleSave}>
            {saving ? 'Adicionando...' : `Adicionar ${selectedIds.size||''} membro${selectedIds.size!==1?'s':''} em ${oppIds.size} opp${oppIds.size!==1?'s':''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function BulkOrigemCampanhaModal({ oppIds, opps, onClose, saveOpp }) {
  const [campanhas] = useLocalState('settings:campanhas_v1', CAMPANHAS_SETTINGS_DEFAULT)
  const campanhasAtivas = campanhas.filter(c => c.status === 'active' || c.status === 'draft')
  const [origem, setOrigem]     = useState('')
  const [campanha, setCampanha] = useState('')
  const [saving, setSaving]     = useState(false)

  async function handleSave() {
    if (!origem && !campanha) return
    setSaving(true)
    const oppList = opps.filter(o => oppIds.has(o.id))
    for (const opp of oppList) {
      await saveOpp({
        ...opp,
        ...(origem   ? { origem }                      : {}),
        ...(campanha ? { campanha_id: campanha || null } : {}),
      })
    }
    setSaving(false)
    onClose()
  }

  return (
    <div style={m.overlay} onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth:440 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Editar Origem e Campanha</div>
            <div style={m.subtitle}>{oppIds.size} oportunidade{oppIds.size!==1?'s':''} selecionada{oppIds.size!==1?'s':''} — apenas os campos preenchidos serão alterados</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={blk.label}>Origem <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(deixe em branco para não alterar)</span></label>
            <select style={blk.input} value={origem} onChange={e=>setOrigem(e.target.value)}>
              <option value="">— Não alterar —</option>
              {ORIGENS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={blk.label}>Campanha <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(deixe em branco para não alterar)</span></label>
            <select style={blk.input} value={campanha} onChange={e=>setCampanha(e.target.value)}>
              <option value="">— Não alterar —</option>
              <option value="__clear__">Remover campanha</option>
              {campanhasAtivas.map(c=><option key={c.id} value={c.id}>{c.nome||c.name||c.id}</option>)}
              {campanhasAtivas.length===0 && CAMPANHAS_PADRAO.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={m.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={(!origem && !campanha) || saving} onClick={handleSave}>
            {saving ? 'Salvando...' : `Aplicar em ${oppIds.size} oportunidade${oppIds.size!==1?'s':''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function BulkProdutosModal({ oppIds, opps, onClose, saveOpp }) {
  const { produtos } = useProducts()
  const produtosAtivos = (produtos || []).filter(p => p.status === 'ativo')
  const [q, setQ]             = useState('')
  const [selected, setSelected] = useState([]) // [{ produto_id, produto_nome, produto_codigo, tipo, cobranca, desconto_max, quantidade, preco_unitario, desconto_pct, subtotal }]
  const [syncValor, setSyncValor] = useState(false)
  const [saving, setSaving]   = useState(false)

  const sugestoes = useMemo(() => {
    const lq = q.toLowerCase()
    return produtosAtivos.filter(p =>
      !selected.find(s => s.produto_id === p.id) &&
      (!q.trim() || (p.nome||'').toLowerCase().includes(lq) || (p.codigo||'').toLowerCase().includes(lq))
    ).slice(0, 8)
  }, [q, produtosAtivos, selected])

  function recalc(item) {
    const base = Number(item.preco_unitario || 0)
    const qty  = Number(item.quantidade || 1)
    const desc = Math.min(Number(item.desconto_pct || 0), item.desconto_max || 0)
    return { ...item, desconto_pct: Number(item.desconto_pct || 0), subtotal: base * qty * (1 - desc / 100) }
  }

  function addProduto(p) {
    setSelected(prev => [...prev, recalc({
      produto_id: p.id, produto_nome: p.nome, produto_codigo: p.codigo,
      tipo: p.tipo, cobranca: p.cobranca, desconto_max: p.desconto_max || 0,
      quantidade: 1, preco_unitario: p.preco, desconto_pct: 0, subtotal: p.preco,
    })])
    setQ('')
  }

  function removeProduto(pid) { setSelected(prev => prev.filter(s => s.produto_id !== pid)) }

  async function handleSave() {
    if (!selected.length) return
    setSaving(true)
    const oppList = opps.filter(o => oppIds.has(o.id))
    for (const opp of oppList) {
      const existentes = opp.itens || []
      const novos = selected.filter(s => !existentes.find(e => e.produto_id === s.produto_id))
      if (!novos.length && !syncValor) continue
      const allItens = [...existentes, ...novos]
      const patch = { ...opp, itens: allItens }
      if (syncValor) {
        const sms     = allItens.filter(i => (i.tipo||'').toLowerCase() === 'saas').reduce((s,i) => s+i.subtotal, 0)
        const cdu     = allItens.filter(i => (i.tipo||'').toLowerCase() === 'licenca').reduce((s,i) => s+i.subtotal, 0)
        const servico = allItens.filter(i => !['saas','licenca'].includes((i.tipo||'').toLowerCase())).reduce((s,i) => s+i.subtotal, 0)
        if (sms     > 0) patch.valor_sms     = Math.round(sms)
        if (cdu     > 0) patch.valor_cdu     = Math.round(cdu)
        if (servico > 0) patch.valor_servico  = Math.round(servico)
      }
      await saveOpp(patch)
    }
    setSaving(false)
    onClose()
  }

  return (
    <div style={m.overlay} onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth:480 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Adicionar Produtos</div>
            <div style={m.subtitle}>{oppIds.size} oportunidade{oppIds.size!==1?'s':''} — produtos já vinculados à oportunidade não serão duplicados</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ position:'relative' }}>
            <label style={blk.label}>Buscar produto</label>
            <input style={blk.input} placeholder="Nome ou código…" value={q} onChange={e=>setQ(e.target.value)} />
            {q.trim() && sugestoes.length > 0 && (
              <div style={{ position:'absolute', left:0, right:0, background:'var(--surface)',
                border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,.12)',
                zIndex:200, maxHeight:200, overflowY:'auto', marginTop:2 }}>
                {sugestoes.map(p => (
                  <div key={p.id} onClick={() => addProduto(p)}
                    style={{ padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid var(--border2)' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.nome}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{p.codigo}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text-soft)' }}>
                      {Number(p.preco||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={blk.label}>Produtos selecionados</label>
              {selected.map(s => (
                <div key={s.produto_id} style={{ display:'flex', alignItems:'center', gap:8,
                  background:'var(--surface2)', borderRadius:7, padding:'8px 10px', border:'1px solid var(--border)' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{s.produto_nome}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{s.produto_codigo}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text-soft)' }}>
                    {Number(s.preco_unitario||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                  </span>
                  <button onClick={() => removeProduto(s.produto_id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'0 2px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {selected.length === 0 && !q.trim() && (
            <div style={{ textAlign:'center', padding:'12px 0', color:'var(--text-muted)', fontSize:12 }}>
              Busque e selecione os produtos a adicionar
            </div>
          )}
          {selected.length > 0 && (
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer',
              padding:'10px 12px', borderRadius:8, border:'1px solid var(--border)',
              background: syncValor ? 'var(--accent-glow)' : 'var(--surface2)',
              borderColor: syncValor ? 'var(--accent)' : 'var(--border)', transition:'all .15s' }}>
              <input type="checkbox" checked={syncValor} onChange={e => setSyncValor(e.target.checked)}
                style={{ width:15, height:15, accentColor:'var(--accent)', cursor:'pointer' }} />
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>
                  Usar valores dos produtos como valor das oportunidades
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                  SaaS → MRR · Licença → CDU · Demais → Serviço
                </div>
              </div>
            </label>
          )}
        </div>
        <div style={m.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!selected.length || saving} onClick={handleSave}>
            {saving ? 'Salvando...' : `Adicionar em ${oppIds.size} oportunidade${oppIds.size!==1?'s':''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

const blk = {
  label:         { fontSize:11, fontWeight:700, color:'var(--text-soft)', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 },
  input:         { width:'100%', padding:'8px 10px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, fontSize:13, color:'var(--text)', fontFamily:'var(--font)', boxSizing:'border-box' },
  radioRow:      { display:'flex', alignItems:'center', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', transition:'all .15s', background:'var(--surface2)' },
  radioRowActive:{ borderColor:'var(--accent)', background:'var(--accent-glow)' },
  linkBtn:       { fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:'2px 4px', fontFamily:'var(--font)' },
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
const IMPORT_COLS_BASE = ['titulo','empresa_nome','empresa_cnpj','etapa_nome','valor','prazo','responsavel','origem']

function parseCSV(text) {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n')
  if (lines.length < 2) return { headers:[], rows:[] }
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g,''))
  const rows = lines.slice(1).map(line => {
    const cells = []; let cur='', inQ=false
    for (const ch of line) {
      if (ch==='"') { inQ=!inQ }
      else if (ch===sep && !inQ) { cells.push(cur.trim()); cur='' }
      else cur+=ch
    }
    cells.push(cur.trim())
    return Object.fromEntries(headers.map((h,i) => [h, cells[i]??'']))
  })
  return { headers, rows }
}

function validateImportRow(row, idx, etapas, cfFields) {
  const errors = []
  if (!row.titulo?.trim()) errors.push('Título é obrigatório')
  if (!row.empresa_nome?.trim()) errors.push('Empresa é obrigatória')
  if (row.valor && isNaN(parseFloat(row.valor))) errors.push('Valor inválido')
  if (row.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(row.prazo)) errors.push('Prazo inválido (use AAAA-MM-DD)')
  if (row.origem && !ORIGENS.includes(row.origem)) errors.push(`Origem inválida. Use: ${ORIGENS.join(', ')}`)
  // campos customizados obrigatórios
  ;(cfFields || []).filter(f => f.required).forEach(f => {
    if (!row[f.key]?.trim()) errors.push(`${f.label} é obrigatório`)
  })
  return errors
}

// Campos de oportunidade que NÃO são colunas base do CSV (mapeados por field_key)
const IMPORT_BASE_KEYS = new Set(['titulo','empresa_id','empresa_nome','primary_contact_id','situacao','etapa_id','responsavel','origem','campanha_id','prazo','playbook_id','valor_cdu','valor_sms','valor_servico','valor_desconto','motivo_perda'])

function ImportModal({ onClose, funilAtivo, etapas, onImport, companies, addCompany }) {
  // lê campos do formLayout — mesma fonte dos campos que aparecem na tela de oportunidade
  const { fieldById } = useFormLayout('opportunities')
  const customFormFields = useMemo(() => {
    return Object.values(fieldById)
      .filter(f => f.entity === 'opportunities' && !IMPORT_BASE_KEYS.has(f.field_key))
      .map(f => ({ key: f.field_key, label: f.label, required: f.is_required || false }))
  }, [fieldById])

  const [step, setStep]     = useState('upload')
  const [progress, setProgress] = useState({ current: 0, total: 0, empresasCriadas: 0, label: '' })
  const [parsed, setParsed] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef             = useRef(null)

  // colunas dinâmicas = base + campos customizados do formLayout
  const allCols = useMemo(() => {
    const cfCols = customFormFields.map(f => f.key)
    return [...IMPORT_COLS_BASE, ...cfCols]
  }, [customFormFields])

  function handleDownloadTemplate() {
    const cfExample = customFormFields.map(() => '')
    const example = ['Expansão norte','Empresa Exemplo','12.345.678/0001-99','Proposta','1200','2026-09-30','João Silva','Inbound', ...cfExample]
    const csv = [allCols.join(';'), example.join(';')].join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download='template_oportunidades.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function processFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { headers, rows } = parseCSV(e.target.result)
      const rowResults = rows.map((row, i) => {
        const errors = validateImportRow(row, i, etapas, customFormFields)
        return { row, errors, ok: errors.length===0, line: i+2 }
      })
      setParsed({ fileName:file.name, rowResults })
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleConfirmImport() {
    const okRows = parsed.rowResults.filter(r => r.ok)
    const total  = okRows.length
    setProgress({ current: 0, total, empresasCriadas: 0, label: 'Preparando…' })
    setStep('importing')

    const companiesByName = {}
    ;(companies || []).forEach(c => {
      const n = (c.fantasia || c.razao || '').toLowerCase()
      if (n) companiesByName[n] = c
    })
    const companiesByCnpj = {}
    ;(companies || []).forEach(c => { if (c.cnpj) companiesByCnpj[c.cnpj.replace(/\D/g,'')] = c })
    const createdCache = {}
    let empresasCriadas = 0

    async function resolveEmpresa(nome, cnpj) {
      const key = nome.toLowerCase()
      const cnpjClean = (cnpj||'').replace(/\D/g,'')
      if (cnpjClean && companiesByCnpj[cnpjClean]) return companiesByCnpj[cnpjClean].id
      if (companiesByName[key]) return companiesByName[key].id
      if (createdCache[key]) return createdCache[key]
      const result = await addCompany({ razao: nome, fantasia: nome, cnpj: cnpj || '', tipo: 'rascunho' })
      if (result?.ok && result?.data?.id) {
        createdCache[key] = result.data.id
        empresasCriadas++
        return result.data.id
      }
      return null
    }

    const importRows = []
    for (let i = 0; i < okRows.length; i++) {
      const { row } = okRows[i]
      setProgress({ current: i + 1, total, empresasCriadas, label: row.titulo || row.empresa_nome || `Linha ${i + 2}` })
      const etapa = etapas.find(e => e.nome.toLowerCase()===row.etapa_nome?.toLowerCase()) || etapas[0]
      const custom_fields = {}
      customFormFields.forEach(f => { if (row[f.key] !== undefined) custom_fields[f.key] = row[f.key] })
      const empresa_id = await resolveEmpresa(row.empresa_nome, row.empresa_cnpj)
      importRows.push({
        ...EMPTY_OPP,
        titulo:       row.titulo,
        empresa_nome: row.empresa_nome,
        empresa_id:   empresa_id,
        funil_id:     funilAtivo,
        etapa_id:     etapa?.id,
        valor:        parseFloat(row.valor)||0,
        prazo:        row.prazo || null,
        responsavel:  row.responsavel || '',
        origem:       row.origem || 'Inbound',
        id:           novoId(),
        criado:       new Date().toISOString().slice(0,10),
        custom_fields,
      })
    }

    setProgress(p => ({ ...p, current: total, empresasCriadas, label: 'Salvando oportunidades…' }))
    const log = {
      id:Date.now(), fileName:parsed.fileName, date:new Date().toLocaleString('pt-BR'),
      total:parsed.rowResults.length, imported:importRows.length,
      errors:parsed.rowResults.filter(r=>!r.ok).length, rows:parsed.rowResults, scope:'importados',
    }
    await onImport(importRows, log)
    setStep('done')
    setProgress(p => ({ ...p, empresasCriadas, label: 'Concluído!' }))
  }

  const okCount  = parsed?.rowResults.filter(r=>r.ok).length ?? 0
  const errCount = parsed?.rowResults.filter(r=>!r.ok).length ?? 0

  return (
    <div style={m.overlay} onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth:680 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Importar oportunidades</div>
            <div style={m.subtitle}>CSV com separador ponto-e-vírgula (;) — UTF-8</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        {step==='upload' && (
          <div style={{ padding:24 }}>
            <div style={imp.templateBox}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Template CSV</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{allCols.length} colunas — inclui linha de exemplo{customFormFields.length > 0 ? ` + ${customFormFields.length} campo(s) personalizado(s)` : ''}</div>
              </div>
              <button style={imp.templateBtn} onClick={handleDownloadTemplate}>↓ Baixar template</button>
            </div>
            <div style={{ ...imp.dropzone, ...(dragging?imp.dropzoneActive:{}) }}
              onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);processFile(e.dataTransfer.files[0])}}
              onClick={()=>fileRef.current?.click()}>
              <span style={{ fontSize:28 }}>📂</span>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>Arraste o arquivo aqui ou clique para selecionar</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Apenas arquivos .csv</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={e=>processFile(e.target.files[0])} />
            </div>
            <div style={imp.colsBox}>
              <div style={imp.colsLabel}>Colunas esperadas</div>
              <div style={imp.colsList}>
                {IMPORT_COLS_BASE.map(c=><span key={c} style={imp.colTag}>{c}</span>)}
                {customFormFields.map(f=><span key={f.key} style={{ ...imp.colTag, background:'var(--accent)22', color:'var(--accent)', borderColor:'var(--accent)44' }}>{f.key}{f.required?' *':''}</span>)}
              </div>
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
                <thead><tr>
                  {['Linha','Título','Empresa','Etapa','Valor','Resultado'].map(h=><th key={h} style={p.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {parsed.rowResults.map(({row, errors, ok, line}) => (
                    <tr key={line} style={{ ...p.tr, background:ok?undefined:'rgba(220,38,38,0.03)' }}>
                      <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)', width:50 }}>{line}</td>
                      <td style={{ ...p.td, fontSize:12 }}>{row.titulo||<span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ ...p.td, fontSize:12 }}>{row.empresa_nome||'—'}</td>
                      <td style={{ ...p.td, fontSize:11 }}>{row.etapa_nome||'—'}</td>
                      <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:11 }}>{row.valor||'—'}</td>
                      <td style={p.td}>
                        {ok ? <span style={{ color:'var(--green)', fontSize:11, fontWeight:600 }}>✓ OK</span>
                            : <div>{errors.map((e,i)=><div key={i} style={{ color:'var(--red)', fontSize:11 }}>✕ {e}</div>)}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ ...m.footer }}>
              <Button variant="secondary" onClick={()=>setStep('upload')}>← Voltar</Button>
              <div style={{ flex:1 }} />
              {errCount>0&&okCount>0&&<span style={{ fontSize:12, color:'var(--yellow-text)' }}>{errCount} linha{errCount>1?'s':''} serão ignoradas</span>}
              <Button disabled={okCount===0} onClick={handleConfirmImport}>
                {`Importar ${okCount} oportunidade${okCount!==1?'s':''}`}
              </Button>
            </div>
          </div>
        )}

        {(step==='importing' || step==='done') && (
          <div style={{ padding:'32px 28px', display:'flex', flexDirection:'column', gap:24, alignItems:'center' }}>
            {step==='importing' ? (
              <>
                <div style={{ fontSize:32 }}>⏳</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Importando…</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:40 }}>✅</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Importação concluída!</div>
              </>
            )}

            {/* Barra de progresso */}
            <div style={{ width:'100%', maxWidth:440 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)', maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {progress.label}
                </span>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)', flexShrink:0 }}>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div style={{ height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:99, transition:'width 0.2s ease',
                  background: step==='done' ? '#10B981' : 'var(--accent)',
                  width: progress.total ? `${Math.round((progress.current/progress.total)*100)}%` : '0%',
                }} />
              </div>
              <div style={{ marginTop:6, fontSize:11, color:'var(--text-muted)', display:'flex', gap:16 }}>
                <span>✓ <strong>{progress.current}</strong> oportunidade{progress.current!==1?'s':''} processada{progress.current!==1?'s':''}</span>
                {progress.empresasCriadas > 0 && (
                  <span>🏢 <strong>{progress.empresasCriadas}</strong> empresa{progress.empresasCriadas!==1?'s':''} criada{progress.empresasCriadas!==1?'s':''}</span>
                )}
              </div>
            </div>

            {step==='done' && (
              <Button onClick={onClose}>Fechar</Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const imp = {
  templateBox:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', marginBottom:16 },
  templateBtn:   { padding:'7px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  dropzone:      { border:'2px dashed var(--border)', borderRadius:10, padding:'40px 24px', textAlign:'center', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginBottom:16, transition:'all 0.15s', background:'var(--surface2)' },
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
        ref={el => { if (el) el.indeterminate = !!indeterminate }}
        onChange={onChange}
        style={{ width:15, height:15, cursor:'pointer', accentColor:'var(--accent)' }} />
    </label>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, accent, mono }) {
  return (
    <div style={{ ...p.kpi, ...(accent?{ borderTopColor:'var(--accent)' }:{}) }}>
      <span style={{ ...p.kpiVal, fontFamily: mono?'var(--mono)':'var(--font)' }}>{value}</span>
      <span style={p.kpiLbl}>{label}</span>
    </div>
  )
}

// ─── Etapa Badge ─────────────────────────────────────────────────────────────
function EtapaBadge({ etapa }) {
  if (!etapa) return <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20,
      background: etapa.cor+'22', color: etapa.cor, fontSize:11, fontWeight:600, fontFamily:'var(--mono)',
      whiteSpace:'nowrap', border:`1px solid ${etapa.cor}44` }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:etapa.cor, display:'inline-block' }} />
      {etapa.nome}
    </span>
  )
}

// ─── Origem Badge ─────────────────────────────────────────────────────────────
function OrigemBadge({ origem }) {
  const cfg = ORIGEM_COLORS[origem] || { color:'#6B7280', bg:'rgba(107,114,128,0.10)', text:'#4B5563' }
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20,
      background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.color}30`,
      fontFamily:'var(--font)', letterSpacing:'0.01em', whiteSpace:'nowrap' }}>
      {origem}
    </span>
  )
}

// ─── Card do Kanban ───────────────────────────────────────────────────────────
function OppCard({ opp, cor, onClick, onDragStart, onDragEnd }) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dias     = diasRestantes(opp.prazo)
  const atrasado = dias !== null && dias < 0
  const urgente  = dias !== null && dias >= 0 && dias <= 7

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragging(true); onDragStart && onDragStart() }}
      onDragEnd={() => { setDragging(false); onDragEnd && onDragEnd() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...k.card,
        opacity: dragging ? 0.4 : 1,
        transform: dragging ? 'scale(0.97)' : hovered ? 'translateY(-2px) scale(1.01)' : 'none',
        boxShadow: hovered && !dragging
          ? '0 8px 24px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.07)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        borderColor: hovered ? cor + '55' : 'var(--border)',
        cursor: 'grab',
      }}
    >
      {/* Barra de etapa */}
      <div style={{ height:4, background: `linear-gradient(90deg, ${cor}, ${cor}99)`,
        borderRadius:'14px 14px 0 0', margin:'-14px -14px 12px' }} />

      {/* Título */}
      <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:6,
        lineHeight:1.35, letterSpacing:'-0.01em' }}>
        {opp.titulo}
      </div>

      {/* Empresa + Contato Principal */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom: opp.primary_contact_nome ? 5 : 10 }}>
        <div style={{ width:24, height:24, borderRadius:7, background: cor + '18',
          color:cor, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:9, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
          border:`1px solid ${cor}30` }}>
          {opp.empresa_nome.slice(0,2).toUpperCase()}
        </div>
        <span style={{ fontSize:12, color:'var(--text-soft)', overflow:'hidden',
          textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {opp.empresa_nome}
        </span>
      </div>

      {/* Contato principal — exibição discreta quando vinculado */}
      {opp.primary_contact_nome && (
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:10 }}>
          <div style={{ width:14, height:14, borderRadius:'50%', background:'var(--surface3)',
            border:'1px solid var(--border2)', display:'flex', alignItems:'center',
            justifyContent:'center', flexShrink:0 }}>
            <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5.5" r="3" fill="#94A3B8"/>
              <path d="M2 13.5c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden',
            textOverflow:'ellipsis', whiteSpace:'nowrap', fontStyle:'italic' }}>
            {opp.primary_contact_nome.split(' ')[0]}
            {opp.primary_contact_nome.split(' ').length > 1
              ? ' ' + opp.primary_contact_nome.split(' ').slice(1).join(' ')
              : ''}
          </span>
        </div>
      )}

      {/* Valor + Origem */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        <div>
          <span style={{ fontSize:14, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)',
            letterSpacing:'-0.02em' }}>
            {opp.valor > 0
              ? fmtMoeda(opp.valor)
              : <span style={{ color:'var(--text-muted)', fontWeight:400, fontSize:12 }}>Sem valor</span>}
          </span>
          {/* Breakdown mini — visível só quando há componentes */}
          {(opp.valor_cdu > 0 || opp.valor_sms > 0 || opp.valor_desconto > 0) && (
            <div style={{ display:'flex', gap:5, marginTop:3, flexWrap:'wrap' }}>
              {opp.valor_cdu > 0 && (
                <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--accent)',
                  background:'rgba(99,102,241,0.08)', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>
                  CDU {fmtMoeda(opp.valor_cdu)}
                </span>
              )}
              {opp.valor_sms > 0 && (
                <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'#3B82F6',
                  background:'rgba(59,130,246,0.08)', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>
                  SMS {fmtMoeda(opp.valor_sms)}
                </span>
              )}
              {opp.valor_desconto > 0 && (
                <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'#EF4444',
                  background:'rgba(239,68,68,0.08)', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>
                  ↓ {fmtMoeda(opp.valor_desconto)}
                </span>
              )}
            </div>
          )}
        </div>
        <OrigemBadge origem={opp.origem} />
      </div>

      {/* Situação (se não for padrão) */}
      {opp.situacao && opp.situacao !== 'em_andamento' && (
        <div style={{ marginTop:8 }}>
          <SituacaoBadge situacao={opp.situacao} />
        </div>
      )}

      {/* Rodapé: responsável + prazo */}
      {(opp.prazo || opp.responsavel) && (
        <div style={{ marginTop:10, paddingTop:9, borderTop:'1px solid var(--border2)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
          {opp.responsavel && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--surface3)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:8, fontWeight:700, color:'var(--text-muted)',
                border:'1px solid var(--border)', flexShrink:0 }}>
                {opp.responsavel.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {opp.responsavel.split(' ')[0]}
              </span>
            </div>
          )}
          {opp.prazo && (
            <span style={{ fontSize:10, fontFamily:'var(--mono)', fontWeight:600,
              whiteSpace:'nowrap', padding:'2px 6px', borderRadius:4,
              background: atrasado ? 'rgba(239,68,68,0.1)' : urgente ? 'rgba(245,158,11,0.1)' : 'transparent',
              color: atrasado ? 'var(--red)' : urgente ? '#D97706' : 'var(--text-muted)' }}>
              {atrasado ? '⚠ ' : urgente ? '⏰ ' : ''}{fmtData(opp.prazo)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Coluna Kanban ────────────────────────────────────────────────────────────
function calcTaxaConversao(etapas, allOpps, etapaId) {
  const ids = etapas.map(e => String(e.id))
  const idx = ids.indexOf(String(etapaId))
  if (idx < 0) return null
  const posteriores = new Set(ids.slice(idx + 1))
  const entraram = allOpps.filter(o =>
    String(o.etapa_id) === String(etapaId) ||
    posteriores.has(String(o.etapa_id)) ||
    o.situacao === 'ganha'
  )
  if (!entraram.length) return null
  const passaram = allOpps.filter(o =>
    posteriores.has(String(o.etapa_id)) || o.situacao === 'ganha'
  )
  return Math.round((passaram.length / entraram.length) * 100)
}

function KanbanBoard({ etapas, filtered, allOpps, setModal, moveToStage }) {
  const draggedId = useRef(null)
  const [overEtapa, setOverEtapa] = useState(null)

  function handleDrop(etapaId) {
    if (draggedId.current && etapaId) {
      moveToStage(draggedId.current, etapaId)
    }
    draggedId.current = null
    setOverEtapa(null)
  }

  const n = etapas.length || 1
  const colWidth = `max(220px, calc((100vw - 240px - ${(n - 1) * 12}px - 20px) / ${n}))`

  return (
    <div style={{ flex:1, overflowX:'auto', overflowY:'hidden', paddingBottom:16 }}>
      <div style={{ display:'flex', gap:12, height:'100%', paddingRight:4 }}>
        {etapas.map(etapa => (
          <KanbanColuna
            key={etapa.id}
            etapa={etapa}
            colWidth={colWidth}
            taxa={calcTaxaConversao(etapas, allOpps || [], etapa.id)}
            opps={filtered.filter(o => String(o.etapa_id) === String(etapa.id))}
            onAddOpp={etapa_id => setModal({ _new:true, etapa_id })}
            onClickOpp={o => setModal(o)}
            isDragOver={overEtapa === etapa.id}
            onDragOver={() => { if (draggedId.current) setOverEtapa(etapa.id) }}
            onDrop={() => handleDrop(etapa.id)}
            onCardDragStart={id => { draggedId.current = id }}
            onCardDragEnd={() => { draggedId.current = null; setOverEtapa(null) }}
          />
        ))}
      </div>
    </div>
  )
}

function KanbanColuna({ etapa, opps, taxa, colWidth, onAddOpp, onClickOpp, onDragOver, onDrop, isDragOver, onCardDragStart, onCardDragEnd }) {
  const totalValor     = opps.reduce((s,o)=>s+(parseFloat(o.valor)||0),0)
  const valorPonderado = opps.reduce((s,o)=>s+(parseFloat(o.valor)||0)*etapa.probabilidade/100,0)
  const taxaCor = taxa === null ? null : taxa >= 60 ? '#10B981' : taxa >= 30 ? '#F59E0B' : '#EF4444'
  return (
    <div
      style={{ ...k.coluna, width: colWidth, borderColor: isDragOver ? etapa.cor : 'rgba(0,0,0,0.07)', boxShadow: isDragOver ? `0 0 0 2px ${etapa.cor}44, 0 2px 12px rgba(0,0,0,0.05)` : k.coluna.boxShadow }}
      onDragOver={e => { e.preventDefault(); onDragOver && onDragOver() }}
      onDragLeave={onDrop && (() => onDragOver && onDragOver(null))}
      onDrop={e => { e.preventDefault(); onDrop && onDrop() }}
    >
      <div style={{ padding:'11px 13px 9px', borderBottom:`2px solid ${etapa.cor}`, background: isDragOver ? etapa.cor+'11' : 'rgba(255,255,255,0.85)', borderRadius:'14px 14px 0 0', flexShrink:0, transition:'background 0.15s' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontSize:12, fontWeight:700, color:etapa.cor, fontFamily:'var(--mono)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{etapa.nome}</span>
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            {taxa !== null && (
              <span title="Taxa de conversão desta etapa" style={{ fontSize:9, fontWeight:700, fontFamily:'var(--mono)',
                background: taxaCor + '22', color: taxaCor, padding:'1px 6px', borderRadius:8, letterSpacing:'0.03em' }}>
                {taxa}%
              </span>
            )}
            <span style={{ fontSize:10, fontWeight:700, fontFamily:'var(--mono)', background:etapa.cor+'22', color:etapa.cor, padding:'1px 7px', borderRadius:10 }}>{opps.length}</span>
          </div>
        </div>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
          {opps.length>0 ? fmtMoeda(totalValor) : <span style={{ opacity:0.5 }}>vazio</span>}
          {etapa.probabilidade>0&&etapa.probabilidade<100&&opps.length>0&&(
            <span style={{ color:etapa.cor, marginLeft:5 }}>≈ {fmtMoeda(valorPonderado)}</span>
          )}
        </div>
      </div>
      <div style={{ ...k.cards, background: isDragOver ? etapa.cor+'08' : 'transparent', transition:'background 0.15s' }}>
        {opps.map(o => <OppCard key={o.id} opp={o} cor={etapa.cor} onClick={()=>onClickOpp(o)} onDragStart={()=>onCardDragStart&&onCardDragStart(o.id)} onDragEnd={()=>onCardDragEnd&&onCardDragEnd()} />)}
        {opps.length===0 && <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:12, opacity:0.6 }}>—</div>}
      </div>
      <button style={k.addBtn} onClick={()=>onAddOpp(etapa.id)}>+ Adicionar</button>
    </div>
  )
}

const k = {
  coluna: { width:'var(--col-w, 232px)', flexShrink:0, background:'rgba(255,255,255,0.65)', backdropFilter:'blur(8px)', borderRadius:14, border:'1px solid rgba(0,0,0,0.07)', boxShadow:'0 2px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)', display:'flex', flexDirection:'column' },
  cards:  { flex:1, overflowY:'auto', padding:'8px 8px 4px', display:'flex', flexDirection:'column', gap:8 },
  card:   { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:14, cursor:'pointer', transition:'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease' },
  addBtn: { margin:'4px 8px 8px', padding:'7px 0', borderRadius:8, border:'1px dashed rgba(0,0,0,0.12)', background:'rgba(255,255,255,0.5)', fontSize:12, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)', flexShrink:0, transition:'all 0.15s' },
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({ opps, etapas, funis = [], onEdit, selected, onToggleAll, onToggleOne, allSelected, someSelected }) {
  return (
    <div style={p.tableWrap}>
      <table style={p.table}>
        <thead>
          <tr>
            <th style={{ ...p.th, width:40, textAlign:'center' }}>
              <Checkbox checked={allSelected} indeterminate={someSelected} onChange={onToggleAll} title={allSelected?'Desmarcar todos':'Selecionar todos'} />
            </th>
            {['Oportunidade','Funil','Situação','Etapa','Valor MRR','Prazo','Origem','Responsável',''].map(h => (
              <th key={h} style={p.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {opps.length===0 && (
            <tr><td colSpan={10} style={{ ...p.td, textAlign:'center', color:'var(--text-muted)', padding:40 }}>Nenhuma oportunidade encontrada</td></tr>
          )}
          {opps.map(o => {
            const etapa    = etapas.find(e => e.id===o.etapa_id)
            const funilOpp = funis.find(f => String(f.id) === String(o.funil_id))
            const isSel    = selected.has(o.id)
            const dias     = diasRestantes(o.prazo)
            const atrasado = dias!==null && dias<0
            const urgente  = dias!==null && dias>=0 && dias<=7
            return (
              <tr key={o.id} style={{ ...p.tr, ...(isSel?p.trSelected:{}) }}>
                <td style={{ ...p.td, textAlign:'center', width:40 }}>
                  <Checkbox checked={isSel} onChange={()=>onToggleOne(o.id)} />
                </td>
                <td style={p.td}>
                  <div style={{ fontWeight:600, color:'var(--text)', fontSize:13 }}>{o.titulo}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                    <div style={{ width:18, height:18, borderRadius:4, background:'var(--blue-bg)', color:'var(--blue-text)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, fontFamily:'var(--mono)', border:'1px solid rgba(30,58,95,0.12)', flexShrink:0 }}>
                      {o.empresa_nome.slice(0,2).toUpperCase()}
                    </div>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{o.empresa_nome}</span>
                  </div>
                </td>
                <td style={p.td}>
                  {funilOpp ? (
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                      background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border)',
                      whiteSpace:'nowrap' }}>
                      {funilOpp.nome}
                    </span>
                  ) : (
                    <span style={{ fontSize:11, color:'var(--red)', fontWeight:600 }}>Sem funil</span>
                  )}
                </td>
                <td style={p.td}><SituacaoBadge situacao={o.situacao||'em_andamento'} /></td>
                <td style={p.td}><EtapaBadge etapa={etapa} /></td>
                <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:13, fontWeight:600, color:o.valor>0?'var(--accent)':'var(--text-muted)' }}>
                  {o.valor>0 ? fmtMoeda(o.valor) : '—'}
                </td>
                <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:12, color: atrasado?'var(--red)':urgente?'#D97706':'var(--text-soft)', fontWeight: (atrasado||urgente)?700:400 }}>
                  {o.prazo ? (atrasado?'⚠ ':urgente?'⏰ ':'')+fmtData(o.prazo) : '—'}
                </td>
                <td style={p.td}><OrigemBadge origem={o.origem} /></td>
                <td style={{ ...p.td, fontSize:12, color:'var(--text-soft)' }}>{o.responsavel||'—'}</td>
                <td style={{ ...p.td, textAlign:'right' }}>
                  <button style={p.editBtn} onClick={()=>onEdit(o)}>Editar</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Menu de Ações (⋯) ───────────────────────────────────────────────────────
function AcoesMenu({ onExport, onImport, onClose, anchorRef, selected, exportLogs, showTray, setShowTray, setExportLogs }) {
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  const itemStyle = {
    display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px',
    background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
    color:'var(--text)', fontFamily:'var(--font)', textAlign:'left', borderRadius:7,
    transition:'background 0.12s',
  }

  return (
    <div ref={ref} style={{
      position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:500,
      width:220, background:'var(--surface)', borderRadius:10,
      border:'1px solid var(--border)', boxShadow:'0 8px 28px rgba(0,0,0,0.13)',
      padding:6, overflow:'hidden',
    }}>
      <button style={itemStyle}
        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background='none'}
        onClick={onImport}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 11V4M3 7l3-3 3 3M1 2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Importar dados
      </button>
      <button style={itemStyle}
        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background='none'}
        onClick={onExport}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {selected?.size > 0 ? `Exportar selecionados (${selected.size})` : 'Exportar dados'}
      </button>
      {exportLogs?.length > 0 && (
        <>
          <div style={{ height:1, background:'var(--border)', margin:'4px 0' }} />
          <button style={{ ...itemStyle, color:'var(--text-muted)', fontSize:12 }}
            onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}
            onClick={() => { setShowTray(true); onClose() }}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Ver exportações ({exportLogs.length})
          </button>
        </>
      )}
    </div>
  )
}

// ─── Painel de Filtros (drawer lateral direito, padrão BrowseLayout) ──────────
function FiltrosPanel({
  open, onClose, onClear,
  // campos nativos
  etapas, responsaveis, oppsDoFunil,
  filterEtapa,       setFilterEtapa,
  filterOrigem,      setFilterOrigem,
  filterSituacao,    setFilterSituacao,
  filterResponsavel, setFilterResponsavel,
  filterAbertura,    setFilterAbertura,
  filterAberturaIni, setFilterAberturaIni,
  filterAberturaFim, setFilterAberturaFim,
  filterPrazo,       setFilterPrazo,
  filterPrazoIni,    setFilterPrazoIni,
  filterPrazoFim,    setFilterPrazoFim,
  filterValorMin,    setFilterValorMin,
  filterValorMax,    setFilterValorMax,
  filterTarefa,      setFilterTarefa,
  // campos custom
  cfFields,
  filterCF,          setFilterCF,
  activeFilterCount,
}) {
  const [campanhas] = useLocalState('pipeline:campanhas', CAMPANHAS_PADRAO)
  if (!open) return null

  // Opções dinâmicas extraídas das oportunidades do funil ativo
  const origensDisponiveis = [...new Set((oppsDoFunil||[]).map(o => o.origem).filter(Boolean))].sort()

  const inp = {
    width:'100%', padding:'7px 10px', borderRadius:7,
    border:'1px solid var(--border)', background:'var(--surface2)',
    fontSize:13, color:'var(--text)', fontFamily:'var(--font)', outline:'none', boxSizing:'border-box',
  }
  const lbl = {
    fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
    letterSpacing:'0.07em', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8,
  }

  function CheckList({ options, values, onChange }) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {options.map(opt => {
          const checked = (values||[]).includes(opt.value)
          return (
            <label key={opt.value} style={{
              display:'flex', alignItems:'center', gap:9, padding:'7px 10px',
              borderRadius:7, cursor:'pointer',
              background: checked ? 'var(--accent-lite,#EEF2FF)' : 'transparent',
            }}>
              <div onClick={() => {
                const next = checked ? (values||[]).filter(v=>v!==opt.value) : [...(values||[]), opt.value]
                onChange(next)
              }} style={{
                width:15, height:15, borderRadius:3, flexShrink:0,
                border:`1.5px solid ${checked?'var(--accent)':'var(--border)'}`,
                background: checked?'var(--accent)':'var(--surface)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {checked && <Check size={10} color="#fff"/>}
              </div>
              <span style={{ fontSize:13, color: checked?'var(--accent)':'var(--text)', fontWeight: checked?600:400 }}>
                {opt.label}
              </span>
            </label>
          )
        })}
      </div>
    )
  }

  function QuickBtns({ options, value, onChange }) {
    return (
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {options.map(opt => (
          <button key={opt.value} type="button"
            onClick={() => onChange(value===opt.value ? '' : opt.value)}
            style={{
              padding:'5px 11px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
              border:`1px solid ${value===opt.value?'var(--accent)':'var(--border)'}`,
              background: value===opt.value?'var(--accent-glow,#EFF6FF)':'var(--surface2)',
              color: value===opt.value?'var(--accent)':'var(--text-soft)',
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    )
  }

  function Section({ title, hasValue, onClear: clr, children }) {
    return (
      <div>
        <div style={lbl}>
          <span>{title}</span>
          {hasValue && (
            <button type="button" onClick={clr}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:0 }}>
              <X size={11}/>
            </button>
          )}
        </div>
        {children}
      </div>
    )
  }

  function DateRange({ ini, fim, setIni, setFim }) {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>De</div>
          <input type="date" style={inp} value={ini} onChange={e=>setIni(e.target.value)}/>
        </div>
        <div>
          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>Até</div>
          <input type="date" style={inp} value={fim} onChange={e=>setFim(e.target.value)}/>
        </div>
      </div>
    )
  }

  return createPortal(
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:80, background:'rgba(0,0,0,0.18)' }}/>
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, width:340, zIndex:81,
        background:'var(--surface)', borderLeft:'1px solid var(--border)',
        boxShadow:'-8px 0 32px rgba(0,0,0,0.10)',
        display:'flex', flexDirection:'column', fontFamily:'var(--font)',
      }}>
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'16px 20px', borderBottom:'1px solid var(--border)',
          borderTop:'3px solid var(--accent)', flexShrink:0,
        }}>
          <Filter size={15} color="var(--accent)"/>
          <span style={{ flex:1, fontSize:14, fontWeight:700, color:'var(--text)' }}>Filtros</span>
          {activeFilterCount > 0 && (
            <button type="button" onClick={onClear}
              style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', padding:0 }}>
              Limpar todos
            </button>
          )}
          <button type="button" onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}>
            <X size={15}/>
          </button>
        </div>

        {/* Corpo */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* ── Etapa ── */}
          <Section title="Etapa" hasValue={filterEtapa.length>0} onClear={()=>setFilterEtapa([])}>
            <CheckList
              options={etapas.map(e=>({ value:String(e.id), label:e.nome }))}
              values={filterEtapa}
              onChange={setFilterEtapa}
            />
          </Section>

          {/* ── Situação ── */}
          <Section title="Situação" hasValue={filterSituacao.length>0} onClear={()=>setFilterSituacao([])}>
            <CheckList
              options={[
                { value:'em_andamento', label:'Em andamento' },
                { value:'ganha',        label:'Ganha'        },
                { value:'perdida',      label:'Perdida'      },
              ]}
              values={filterSituacao}
              onChange={setFilterSituacao}
            />
          </Section>

          {/* ── Origem / Campanha ── */}
          <Section title="Origem / Campanha" hasValue={filterOrigem.length>0} onClear={()=>setFilterOrigem([])}>
            <CheckList
              options={[
                ...campanhas.map(c=>({ value:c, label:c })),
                ...ORIGENS.filter(o=>!campanhas.includes(o)).map(o=>({ value:o, label:o })),
                ...origensDisponiveis.filter(o=>!campanhas.includes(o)&&!ORIGENS.includes(o)).map(o=>({ value:o, label:o })),
              ]}
              values={filterOrigem}
              onChange={setFilterOrigem}
            />
          </Section>

          {/* ── Responsável ── */}
          <Section title="Responsável" hasValue={filterResponsavel.length>0} onClear={()=>setFilterResponsavel([])}>
            <CheckList
              options={responsaveis.map(r=>({ value:r, label:r }))}
              values={filterResponsavel}
              onChange={setFilterResponsavel}
            />
          </Section>

          {/* ── Data de abertura ── */}
          <Section title="Data de abertura"
            hasValue={!!filterAbertura||!!filterAberturaIni||!!filterAberturaFim}
            onClear={()=>{ setFilterAbertura(''); setFilterAberturaIni(''); setFilterAberturaFim('') }}>
            <QuickBtns value={filterAbertura} onChange={setFilterAbertura}
              options={[{ value:'mes_atual', label:'Este mês' }, { value:'custom', label:'Personalizado' }]}/>
            {filterAbertura==='custom' && (
              <DateRange ini={filterAberturaIni} fim={filterAberturaFim} setIni={setFilterAberturaIni} setFim={setFilterAberturaFim}/>
            )}
          </Section>

          {/* ── Previsão de fechamento ── */}
          <Section title="Previsão de fechamento"
            hasValue={!!filterPrazo||!!filterPrazoIni||!!filterPrazoFim}
            onClear={()=>{ setFilterPrazo(''); setFilterPrazoIni(''); setFilterPrazoFim('') }}>
            <QuickBtns value={filterPrazo} onChange={setFilterPrazo}
              options={[
                { value:'mes_atual', label:'Este mês'       },
                { value:'prox30',    label:'Próximos 30d'   },
                { value:'custom',    label:'Personalizado'  },
              ]}/>
            {filterPrazo==='custom' && (
              <DateRange ini={filterPrazoIni} fim={filterPrazoFim} setIni={setFilterPrazoIni} setFim={setFilterPrazoFim}/>
            )}
          </Section>

          {/* ── Valor ── */}
          <Section title="Valor (R$)"
            hasValue={!!filterValorMin||!!filterValorMax}
            onClear={()=>{ setFilterValorMin(''); setFilterValorMax('') }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              <div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>Mínimo</div>
                <input type="number" style={inp} min={0} placeholder="0" value={filterValorMin}
                  onChange={e=>setFilterValorMin(e.target.value)}/>
              </div>
              <div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>Máximo</div>
                <input type="number" style={inp} min={0} placeholder="∞" value={filterValorMax}
                  onChange={e=>setFilterValorMax(e.target.value)}/>
              </div>
            </div>
          </Section>

          {/* ── Tarefas ── */}
          <Section title="Próxima atividade" hasValue={!!filterTarefa} onClear={()=>setFilterTarefa('')}>
            <QuickBtns value={filterTarefa} onChange={setFilterTarefa}
              options={[
                { value:'hoje',      label:'Hoje'        },
                { value:'semana',    label:'Esta semana' },
                { value:'atrasadas', label:'Atrasadas'   },
                { value:'sem',       label:'Sem tarefas' },
              ]}/>
          </Section>

          {/* ── Campos personalizados ── */}
          {cfFields.length > 0 && cfFields.map(field => {
            const val = filterCF[field.key]
            const hasVal = val !== undefined && val !== '' && val !== null
            function setCFField(v) { setFilterCF(prev=>({ ...prev, [field.key]: v })) }
            function clearCF() { setFilterCF(prev=>{ const n={...prev}; delete n[field.key]; return n }) }

            if (field.type === 'select') {
              return (
                <Section key={field.id} title={field.label} hasValue={hasVal} onClear={clearCF}>
                  <CheckList
                    options={(field.options||[]).map(o=>({ value:o, label:o }))}
                    values={hasVal ? (Array.isArray(val)?val:[val]) : []}
                    onChange={v=>setCFField(v)}
                  />
                </Section>
              )
            }
            if (field.type === 'boolean') {
              return (
                <Section key={field.id} title={field.label} hasValue={hasVal} onClear={clearCF}>
                  <CheckList
                    options={[{ value:'sim', label:'Sim' }, { value:'nao', label:'Não' }]}
                    values={hasVal ? [val] : []}
                    onChange={v=>setCFField(v[v.length-1]||'')}
                  />
                </Section>
              )
            }
            if (field.type === 'number') {
              return (
                <Section key={field.id} title={field.label} hasValue={hasVal} onClear={clearCF}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    <div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>Mín.</div>
                      <input type="number" style={inp} value={val?.min||''} placeholder="0"
                        onChange={e=>setCFField({ ...val, min:e.target.value })}/>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>Máx.</div>
                      <input type="number" style={inp} value={val?.max||''} placeholder="∞"
                        onChange={e=>setCFField({ ...val, max:e.target.value })}/>
                    </div>
                  </div>
                </Section>
              )
            }
            // text / date / default
            return (
              <Section key={field.id} title={field.label} hasValue={hasVal} onClear={clearCF}>
                <input
                  type={field.type==='date'?'date':'text'}
                  style={inp} value={val||''}
                  placeholder={field.type==='date' ? '' : `Filtrar por ${field.label.toLowerCase()}…`}
                  onChange={e=>setCFField(e.target.value)}
                />
              </Section>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding:'12px 20px', borderTop:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
        }}>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>
            {activeFilterCount > 0 ? `${activeFilterCount} filtro${activeFilterCount>1?'s':''} ativo${activeFilterCount>1?'s':''}` : 'Nenhum filtro ativo'}
          </span>
          <button type="button" onClick={onClose}
            style={{ padding:'6px 16px', borderRadius:7, border:'none', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
            Aplicar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Pipeline() {
  // ── estado persistido em localStorage ───────────────────────────────────
  const { profile } = useProfile()
  const isParceiro = profile?.papel === 'parceiro' || profile?.role === 'parceiro'
  const [partnerFunilId, setPartnerFunilId] = useState(null)
  const [partnerNome, setPartnerNome]       = useState('')

  useEffect(() => {
    if (!isParceiro || !profile?.contact_id) return
    supabase.from('sellers').select('funil_id, nome').eq('id', profile.contact_id).single()
      .then(({ data }) => {
        if (data?.funil_id) setPartnerFunilId(data.funil_id)
        if (data?.nome)     setPartnerNome(data.nome)
      })
  }, [isParceiro, profile?.contact_id])

  const { funis: todosOsFunis } = useFunnels()
  const FUNIS_ATIVOS = (isParceiro && partnerFunilId)
    ? todosOsFunis.filter(f => f.status === 'ativo' && String(f.id) === String(partnerFunilId))
    : todosOsFunis.filter(f => f.status === 'ativo')
  const funis        = FUNIS_ATIVOS  // alias conveniente para uso no handleSave
  const funilPadrao  = FUNIS_ATIVOS.find(f => f.is_padrao) || FUNIS_ATIVOS[0]
  const [funilAtivo, setFunilAtivo]     = useLocalState('pipeline:funilAtivo', funilPadrao?.id || null)
  const [view, setView]                 = useLocalState('pipeline:view', 'kanban')
  const [search, setSearch]             = useLocalState('pipeline:search', '')
  const [filterOrigem, setFilterOrigem]           = useLocalState('pipeline:filterOrigem2', [])
  const [filterEtapa, setFilterEtapa]             = useLocalState('pipeline:filterEtapa2', [])
  const [filterSituacao, setFilterSituacao]       = useLocalState('pipeline:filterSituacao', [])
  const [filterResponsavel, setFilterResponsavel] = useLocalState('pipeline:filterResponsavel2', [])
  const [filterAbertura, setFilterAbertura]       = useLocalState('pipeline:filterAbertura', '')
  const [filterAberturaIni, setFilterAberturaIni] = useLocalState('pipeline:filterAberturaIni', '')
  const [filterAberturaFim, setFilterAberturaFim] = useLocalState('pipeline:filterAberturaFim', '')
  const [filterPrazo, setFilterPrazo]             = useLocalState('pipeline:filterPrazo', '')
  const [filterPrazoIni, setFilterPrazoIni]       = useLocalState('pipeline:filterPrazoIni', '')
  const [filterPrazoFim, setFilterPrazoFim]       = useLocalState('pipeline:filterPrazoFim', '')
  const [filterValorMin, setFilterValorMin]       = useLocalState('pipeline:filterValorMin', '')
  const [filterValorMax, setFilterValorMax]       = useLocalState('pipeline:filterValorMax', '')
  const [filterTarefa, setFilterTarefa]           = useLocalState('pipeline:filterTarefa', '')
  const [filterCF, setFilterCF]                   = useLocalState('pipeline:filterCF', {})
  const [sortBy, setSortBy]                   = useLocalState('pipeline:sortBy', 'criado')
  const [showMetrics, setShowMetrics]         = useLocalState('pipeline:showMetrics', true)
  // Quando parceiro tem funil definido, força o funil ativo para o dele
  useEffect(() => {
    if (partnerFunilId) setFunilAtivo(String(partnerFunilId))
  }, [partnerFunilId])

  // ── dados via Supabase (com fallback mock automático) ────────────────────
  const { opps, save: saveOpp, remove: removeOpp, removeMany: removeManyOpps, moveToStage, bulkMoveToStage, importMany: importOpps } = useOpportunities()
  const { companies, add: addCompany } = useCompanies()
  const { registrar: log } = useAuditLog()
  // Corrige opps sem funil_id — atribui o funil padrão automaticamente
  useEffect(() => {
    if (!funilPadrao || !opps.length) return
    const semFunil = opps.filter(o => !o.funil_id)
    semFunil.forEach(o => saveOpp({ ...o, funil_id: funilPadrao.id, funil_nome: funilPadrao.nome }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opps.length, funilPadrao?.id])
  // ── campos personalizados de oportunidade (para FiltrosPanel) ───────────
  const [cfFields] = useCustomFields('oportunidade')
  // ── estado efêmero (não persiste) ────────────────────────────────────────
  const { tarefas, save: saveTask, bulkSetStatus: bulkSetTaskStatus } = useTasks()
  const { add: addMembroOpp } = useOppMembros()
  const [atividades, setAtividades]     = useState(MOCK_ATIVIDADES)
  const [filtrosOpen, setFiltrosOpen]   = useState(false)
  const [acoesOpen, setAcoesOpen]       = useState(false)
  const acoesRef                        = useRef(null)
  const [modal, setModal]               = useState(null)
  const [fechamentoModal, setFechamentoModal] = useState(null)
  const [importModal, setImportModal]   = useState(false)
  const [importLogs, setImportLogs]     = useState([])
  const [bulkTaskModal, setBulkTaskModal]             = useState(false)
  const [bulkPlaybookModal, setBulkPlaybookModal]     = useState(false)
  const [bulkEquipeModal, setBulkEquipeModal]         = useState(false)
  const [bulkOrigemModal, setBulkOrigemModal]         = useState(false)
  const [bulkProdutosModal, setBulkProdutosModal]     = useState(false)
  const [exportLogs, setExportLogs]     = useState([])
  const [showTray, setShowTray]         = useState(false)
  const [selected, setSelected]         = useState(new Set())
  // trayRef removido — ExportTray agora é flutuante (fixed)

  const funil  = FUNIS_ATIVOS.find(f => f.id === funilAtivo)
  const etapas = funil?.etapas || []

  // ── filtro + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const today   = new Date(); today.setHours(0,0,0,0)
    const todayStr = today.toISOString().slice(0,10)
    const prox30   = new Date(today); prox30.setDate(prox30.getDate()+30)
    const prox30Str = prox30.toISOString().slice(0,10)
    const mesIni   = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10)
    const mesFim   = new Date(today.getFullYear(), today.getMonth()+1, 0).toISOString().slice(0,10)
    const semFim   = new Date(today); semFim.setDate(semFim.getDate()+(6-semFim.getDay())); const semFimStr=semFim.toISOString().slice(0,10)

    // Pega ids de opps com tarefas abertas no período
    const oppTaskMap = MOCK_TAREFAS.reduce((acc, t) => {
      if (!acc[t.entidade_id]) acc[t.entidade_id] = []
      acc[t.entidade_id].push(t)
      return acc
    }, {})

    const q = search.toLowerCase()
    let list = opps.filter(o => {
      if (String(o.funil_id) !== String(funilAtivo)) { return false }
      if (filterOrigem.length      && !filterOrigem.includes(o.origem))                          return false
      if (filterEtapa.length       && !filterEtapa.includes(String(o.etapa_id)))               return false
      if (filterSituacao.length    && !filterSituacao.includes(o.situacao||'em_andamento'))     return false
      if (filterResponsavel.length && !filterResponsavel.includes(o.responsavel))              return false
      if (q && !(o.titulo.toLowerCase().includes(q) || o.empresa_nome.toLowerCase().includes(q))) return false

      // Filtro data de abertura
      if (filterAbertura === 'mes_atual') {
        if (!o.criado || o.criado < mesIni || o.criado > mesFim) return false
      } else if (filterAbertura === 'custom') {
        if (filterAberturaIni && o.criado < filterAberturaIni) return false
        if (filterAberturaFim && o.criado > filterAberturaFim) return false
      }

      // Filtro previsão de fechamento
      if (filterPrazo === 'mes_atual') {
        if (!o.prazo || o.prazo < mesIni || o.prazo > mesFim) return false
      } else if (filterPrazo === 'prox30') {
        if (!o.prazo || o.prazo < todayStr || o.prazo > prox30Str) return false
      } else if (filterPrazo === 'custom') {
        if (filterPrazoIni && (!o.prazo || o.prazo < filterPrazoIni)) return false
        if (filterPrazoFim && (!o.prazo || o.prazo > filterPrazoFim)) return false
      }

      // Filtro valor
      const val = parseFloat(o.valor)||0
      if (filterValorMin !== '' && !isNaN(parseFloat(filterValorMin)) && val < parseFloat(filterValorMin)) return false
      if (filterValorMax !== '' && !isNaN(parseFloat(filterValorMax)) && val > parseFloat(filterValorMax)) return false

      // Filtro tarefas
      if (filterTarefa) {
        const tasks = (oppTaskMap[o.id]||[]).filter(t => t.entidade_tipo==='oportunidade' && t.status!=='concluida')
        if (filterTarefa === 'sem') { if (tasks.length > 0) return false }
        else if (filterTarefa === 'hoje') { if (!tasks.some(t => t.prazo === todayStr)) return false }
        else if (filterTarefa === 'semana') { if (!tasks.some(t => t.prazo >= todayStr && t.prazo <= semFimStr)) return false }
        else if (filterTarefa === 'atrasadas') { if (!tasks.some(t => t.prazo && t.prazo < todayStr)) return false }
      }

      // Filtro campos personalizados
      for (const [key, fv] of Object.entries(filterCF||{})) {
        if (!fv || fv === '' || (Array.isArray(fv) && fv.length===0)) continue
        const cfVal = o.custom_fields?.[key]
        if (Array.isArray(fv)) {
          if (!fv.includes(cfVal) && !fv.includes(cfVal===true?'sim':cfVal===false?'nao':cfVal)) return false
        } else if (typeof fv === 'object' && (fv.min!==undefined||fv.max!==undefined)) {
          const n = parseFloat(cfVal)
          if (fv.min!=='' && !isNaN(parseFloat(fv.min)) && n < parseFloat(fv.min)) return false
          if (fv.max!=='' && !isNaN(parseFloat(fv.max)) && n > parseFloat(fv.max)) return false
        } else {
          if (String(cfVal||'').toLowerCase().indexOf(String(fv).toLowerCase()) === -1) return false
        }
      }

      return true
    })
    return [...list].sort((a,b) => {
      if (sortBy==='valor_desc') return (parseFloat(b.valor)||0)-(parseFloat(a.valor)||0)
      if (sortBy==='valor_asc')  return (parseFloat(a.valor)||0)-(parseFloat(b.valor)||0)
      if (sortBy==='prazo')      return (a.prazo||'9999') < (b.prazo||'9999') ? -1 : 1
      if (sortBy==='titulo')     return a.titulo.localeCompare(b.titulo)
      return new Date(b.criado)-new Date(a.criado)
    })
  }, [opps, funilAtivo, search, filterOrigem, filterEtapa, filterSituacao, filterResponsavel, filterAbertura, filterAberturaIni, filterAberturaFim, filterPrazo, filterPrazoIni, filterPrazoFim, filterValorMin, filterValorMax, filterTarefa, filterCF, sortBy])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalValor      = filtered.reduce((s,o)=>s+(parseFloat(o.valor)||0),0)
  const valorPonderado  = filtered.reduce((s,o)=>{ const e=etapas.find(e=>e.id===o.etapa_id); return s+(parseFloat(o.valor)||0)*(e?.probabilidade||0)/100 },0)
  const qtdFechadas     = opps.filter(o=>String(o.funil_id)===String(funilAtivo) && etapas.find(e=>String(e.id)===String(o.etapa_id)&&e.probabilidade===100)).length

  // ── seleção ───────────────────────────────────────────────────────────────
  const allFilteredIds = filtered.map(o=>o.id)
  const allSelected    = allFilteredIds.length>0 && allFilteredIds.every(id=>selected.has(id))
  const someSelected   = allFilteredIds.some(id=>selected.has(id)) && !allSelected

  function toggleAll() {
    if (allSelected) setSelected(prev=>{ const s=new Set(prev); allFilteredIds.forEach(id=>s.delete(id)); return s })
    else setSelected(prev=>new Set([...prev,...allFilteredIds]))
  }
  function toggleOne(id) { setSelected(prev=>{ const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s }) }
  function clearSelection() { setSelected(new Set()) }

  // ── ações em lote ─────────────────────────────────────────────────────────
  function applyBulk(action) {
    const ids = [...selected]
    if (action==='delete') {
      if (!window.confirm(`Excluir ${ids.length} oportunidade(s) permanentemente?`)) return
      removeManyOpps(ids); clearSelection()
    } else {
      const etapaId = parseInt(action)
      bulkMoveToStage(ids, etapaId); clearSelection()
    }
  }

  // ── export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const scope = selected.size>0 ? 'selecionados' : hasFilter ? 'filtrados' : 'todos'
    const rows  = selected.size>0 ? opps.filter(o=>selected.has(o.id)) : filtered
    const headers = ['titulo','empresa_nome','funil','etapa','valor','prazo','responsavel','origem','criado']
    const fileName = `pipeline_${new Date().toISOString().slice(0,10)}.csv`
    const csv = [
      headers.join(';'),
      ...rows.map(o => {
        const e = etapas.find(e=>e.id===o.etapa_id)
        return [o.titulo, o.empresa_nome, funil?.nome||'', e?.nome||'', o.valor||'', o.prazo||'', o.responsavel||'', o.origem||'', o.criado||''].join(';')
      })
    ].join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download=fileName; a.click(); URL.revokeObjectURL(url)
    setExportLogs(prev=>[{ id:Date.now(), fileName, date:new Date().toLocaleString('pt-BR'), total:rows.length, scope, status:'concluido' },...prev])
    setShowTray(true)
  }

  // ── save/delete ───────────────────────────────────────────────────────────
  function handleSave(data) {
    const isNew = !opps.find(o => o.id === data.id)
    // Garante funil definido — fallback para funil padrão ou primeiro ativo
    const funilFinal = funis.find(f => String(f.id) === String(data.funil_id))
      || funilPadrao
      || FUNIS_ATIVOS[0]
    const funil_id   = funilFinal?.id || funilAtivo
    const funil_nome = funilFinal?.nome || funil?.nome || ''
    saveOpp({ ...data, funil_id, funil_nome })
    log(isNew ? 'criar' : 'editar', 'oportunidade', data.id, { descricao: `Oportunidade ${isNew ? 'criada' : 'editada'}: ${data.nome || data.titulo || ''}` })
  }
  function handleFechamento(opp) { setFechamentoModal(opp) }
  function handleDelete(id) {
    const opp = opps.find(o => o.id === id)
    removeOpp(id)
    log('excluir', 'oportunidade', id, { descricao: `Oportunidade excluída: ${opp?.nome || opp?.titulo || id}` })
    setModal(null)
  }

  async function handleSaveTarefa(tarefa) {
    const result = await saveTask(tarefa)
    if (result?.ok === false) alert('Erro ao salvar tarefa: ' + result.message)
  }
  function handleToggleStatus(tarefaId, novoStatus) {
    bulkSetTaskStatus([tarefaId], novoStatus)
  }

  function handleAddAtividade(ativ) {
    setAtividades(prev => [ativ, ...prev])
  }

  const responsaveis = useMemo(() =>
    [...new Set(opps.filter(o => String(o.funil_id)===String(funilAtivo)).map(o => o.responsavel).filter(Boolean))].sort()
  , [opps, funilAtivo])

  const advancedFilterCount = [
    filterOrigem.length, filterEtapa.length, filterSituacao.length, filterResponsavel.length,
    filterAbertura||filterAberturaIni||filterAberturaFim ? 1 : 0,
    filterPrazo||filterPrazoIni||filterPrazoFim ? 1 : 0,
    filterValorMin||filterValorMax ? 1 : 0,
    filterTarefa ? 1 : 0,
    Object.keys(filterCF||{}).filter(k=>{ const v=filterCF[k]; return v!==''&&v!==null&&!(Array.isArray(v)&&v.length===0) }).length,
  ].reduce((a,b)=>a+b, 0)
  const hasFilter = search || advancedFilterCount > 0

  function clearAllFilters() {
    setSearch('')
    setFilterOrigem([]); setFilterEtapa([]); setFilterSituacao([]); setFilterResponsavel([])
    setFilterAbertura(''); setFilterAberturaIni(''); setFilterAberturaFim('')
    setFilterPrazo(''); setFilterPrazoIni(''); setFilterPrazoFim('')
    setFilterValorMin(''); setFilterValorMax('')
    setFilterTarefa(''); setFilterCF({})
  }

  if (FUNIS_ATIVOS.length===0) {
    return (
      <div style={{ textAlign:'center', padding:'80px 20px' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>▽</div>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Nenhum funil ativo</div>
        <div style={{ fontSize:13, color:'var(--text-muted)', maxWidth:340, margin:'0 auto 20px' }}>
          Configure e ative um funil em <strong>Configuração → Funis de Venda</strong> para começar.
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...p.page, ...(view==='kanban' ? { height:'calc(100vh - 56px)', maxWidth:'none', overflow:'hidden' } : {}) }}>


      {/* ── KPIs retráteis (padrão BrowseLayout) ── */}
      <div style={{ borderBottom:'1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => setShowMetrics(v => !v)}
          style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            width:'100%', padding:'8px 20px', border:'none', background:'none',
            cursor:'pointer', fontFamily:'var(--font)',
          }}>
          <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            <span style={{ width:3, height:12, borderRadius:2, background:'var(--accent)', flexShrink:0, display:'inline-block' }} />
            Indicadores
          </span>
          {showMetrics
            ? <ChevronUp   size={13} color="var(--text-muted)" />
            : <ChevronDown size={13} color="var(--text-muted)" />}
        </button>
        {showMetrics && (
          <div style={{ padding:'0 20px 12px' }}>
            <div style={{ ...p.kpis, paddingTop:4, paddingBottom:0 }}>
              <KpiCard label="Oportunidades"   value={filtered.length} />
              <KpiCard label="Valor total"      value={fmtMoeda(totalValor)} mono />
              <KpiCard label="Valor ponderado"  value={fmtMoeda(valorPonderado)} mono accent />
              <KpiCard label="Fechadas (ganho)" value={qtdFechadas} />
            </div>
            <MetricasStrip modulo="pipeline" />
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div style={p.toolbar}>

        {/* ── Lado Esquerdo: funil + busca + responsável ── */}
        <div style={p.tbLeft}>
          <FunilDropdown funis={FUNIS_ATIVOS} funilAtivo={funilAtivo} onChange={id=>{ setFunilAtivo(id); setFilterEtapa(''); clearSelection() }} />

          <div style={p.searchWrap}>
            <span style={p.searchIcon}>⌕</span>
            <input style={p.searchInput} placeholder="Buscar oportunidade ou empresa…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>

        </div>

        {/* ── Separador ── */}
        <div style={p.tbDivider} />

        {/* ── Lado Direito: filtros + ordenação + view + ações ── */}
        <div style={p.tbRight}>

          {/* Botão Filtros */}
          <button
            onClick={() => setFiltrosOpen(v => !v)}
            style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'0 13px', height:36, borderRadius:8,
              border:`1.5px solid ${advancedFilterCount > 0 ? 'var(--accent)' : 'var(--border)'}`,
              background: advancedFilterCount > 0 ? 'var(--accent-glow)' : 'var(--surface)',
              color: advancedFilterCount > 0 ? 'var(--accent)' : 'var(--text-soft)',
              fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
              transition:'all 0.15s',
            }}>
            <SlidersHorizontal size={14} />
            Filtros
            {advancedFilterCount > 0 && (
              <span style={{
                background:'var(--accent)', color:'#fff', borderRadius:10,
                fontSize:10, fontWeight:700, padding:'1px 6px', lineHeight:'16px',
              }}>
                {advancedFilterCount}
              </span>
            )}
          </button>

          {/* Ordenação */}
          <select style={{ ...p.select, color:'var(--text-muted)' }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="criado">Mais recentes</option>
            <option value="valor_desc">Maior valor</option>
            <option value="valor_asc">Menor valor</option>
            <option value="prazo">Prazo mais próximo</option>
            <option value="titulo">Título A–Z</option>
          </select>

          {/* View toggle */}
          <div style={p.viewToggle}>
            <button style={{ ...p.viewBtn, ...(view==='list'?p.viewBtnOn:{}) }} onClick={()=>setView('list')} title="Lista">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="2" rx="1" fill="currentColor"/><rect x="1" y="6" width="12" height="2" rx="1" fill="currentColor"/><rect x="1" y="10" width="12" height="2" rx="1" fill="currentColor"/></svg>
            </button>
            <button style={{ ...p.viewBtn, ...(view==='kanban'?p.viewBtnOn:{}) }} onClick={()=>setView('kanban')} title="Kanban">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="4" height="12" rx="1" fill="currentColor"/><rect x="5.5" y="1" width="3" height="9" rx="1" fill="currentColor"/><rect x="9" y="1" width="4" height="11" rx="1" fill="currentColor"/></svg>
            </button>
          </div>

          {/* Nova oportunidade */}
          <Button onClick={()=>setModal({ _new:true, etapa_id:etapas[0]?.id })}>Nova oportunidade</Button>

          {/* ⋯ Menu de ações */}
          <div ref={acoesRef} style={{ position:'relative' }}>
            <button
              onClick={() => setAcoesOpen(v => !v)}
              style={{ display:'flex', alignItems:'center', justifyContent:'center',
                width:36, height:36, borderRadius:8, border:'1px solid var(--border)',
                background:'var(--surface)', color:'var(--text-soft)', cursor:'pointer',
                transition:'all 0.15s',
              }}>
              <MoreHorizontal size={16} />
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
                exportLogs2={exportLogs}
                setExportLogs={setExportLogs}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Result row ── */}
      <div style={p.resultRow}>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' }}>
          {filtered.length} oportunidade{filtered.length!==1?'s':''} encontrada{filtered.length!==1?'s':''}
        </span>
        {hasFilter && (
          <button style={p.clearBtn} onClick={clearAllFilters}>Limpar filtros</button>
        )}
      </div>

      {/* ── Export Tray (flutuante) ── */}
      {showTray && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:800 }}>
          <ExportTray logs={exportLogs} onClose={()=>setShowTray(false)} onClear={()=>setExportLogs([])} />
        </div>
      )}

      {/* ── Bulk bar ── */}
      {selected.size>0 && (
        <div style={p.bulkBar}>
          <span style={p.bulkCount}><span style={p.bulkDot} />{selected.size} selecionada{selected.size>1?'s':''}</span>
          <div style={p.bulkActions}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.75)' }}>Mover para:</span>
            {etapas.map(e=>(
              <button key={e.id} style={p.bulkBtn} onClick={()=>applyBulk(String(e.id))}>
                → {e.nome}
              </button>
            ))}
            <div style={{ width:1, background:'rgba(255,255,255,0.2)', alignSelf:'stretch', margin:'0 4px' }} />
            <button style={p.bulkBtn} onClick={()=>setBulkTaskModal(true)} title="Criar tarefa para todas selecionadas">
              ✓ Tarefa
            </button>
            <button style={p.bulkBtn} onClick={()=>setBulkPlaybookModal(true)} title="Relacionar playbook">
              📋 Playbook
            </button>
            <button style={p.bulkBtn} onClick={()=>setBulkEquipeModal(true)} title="Adicionar membros à equipe">
              👥 Equipe
            </button>
            <button style={p.bulkBtn} onClick={()=>setBulkOrigemModal(true)} title="Editar Origem e Campanha">
              🏷 Origem
            </button>
            <button style={p.bulkBtn} onClick={()=>setBulkProdutosModal(true)} title="Adicionar produtos">
              📦 Produtos
            </button>
            <div style={{ width:1, background:'rgba(255,255,255,0.2)', alignSelf:'stretch', margin:'0 4px' }} />
            <button style={{ ...p.bulkBtn, color:'#FCA5A5', borderColor:'rgba(252,165,165,0.3)' }} onClick={()=>applyBulk('delete')}>
              Excluir
            </button>
          </div>
          <button style={p.bulkClear} onClick={clearSelection}>✕ Limpar seleção</button>
        </div>
      )}

      {/* ── Views ── */}
      {view==='list' && (
        <ListView
          opps={filtered} etapas={etapas} funis={FUNIS_ATIVOS}
          onEdit={o=>setModal(o)}
          selected={selected} onToggleAll={toggleAll} onToggleOne={toggleOne}
          allSelected={allSelected} someSelected={someSelected}
        />
      )}

      {view==='kanban' && (
        <KanbanBoard
          etapas={etapas}
          filtered={filtered}
          allOpps={opps.filter(o => String(o.funil_id) === String(funilAtivo))}
          setModal={setModal}
          moveToStage={moveToStage}
        />
      )}

      {/* ── Modais ── */}
      {modal && (funil || FUNIS_ATIVOS.length > 0) && (
        <OppModal
          onClose={()=>setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onFechamento={handleFechamento}
          initial={modal._new ? null : modal}
          defaultResponsavel={partnerNome || undefined}
          isParceiro={isParceiro}
          partnerSellerId={isParceiro ? String(profile?.contact_id || '') : undefined}
          etapas={etapas}
          funilId={funilAtivo || FUNIS_ATIVOS[0]?.id}
          tarefas={tarefas}
          onSaveTarefa={handleSaveTarefa}
          onToggleStatus={handleToggleStatus}
          atividades={atividades}
          onAddAtividade={handleAddAtividade}
        />
      )}

      {fechamentoModal && (
        <FechamentoModal
          opp={fechamentoModal}
          onClose={() => setFechamentoModal(null)}
        />
      )}

      {importModal && (
        <ImportModal
          onClose={()=>setImportModal(false)}
          funilAtivo={funilAtivo}
          etapas={etapas}
          companies={companies}
          addCompany={addCompany}
          onImport={async (rows, log)=>{ await importOpps(rows); setImportLogs(prev=>[log,...prev]) }}
        />
      )}

      {bulkTaskModal && (
        <BulkTaskModal
          oppIds={selected}
          opps={opps}
          onClose={()=>setBulkTaskModal(false)}
          saveTask={saveTask}
        />
      )}

      {bulkPlaybookModal && (
        <BulkPlaybookModal
          oppIds={selected}
          opps={opps}
          onClose={()=>setBulkPlaybookModal(false)}
          saveOpp={saveOpp}
        />
      )}

      {bulkEquipeModal && (
        <BulkEquipeModal
          oppIds={selected}
          opps={opps}
          onClose={()=>setBulkEquipeModal(false)}
          addMembro={addMembroOpp}
        />
      )}

      {bulkOrigemModal && (
        <BulkOrigemCampanhaModal
          oppIds={selected}
          opps={opps}
          onClose={()=>setBulkOrigemModal(false)}
          saveOpp={saveOpp}
        />
      )}
      {bulkProdutosModal && (
        <BulkProdutosModal
          oppIds={selected}
          opps={opps}
          onClose={()=>setBulkProdutosModal(false)}
          saveOpp={saveOpp}
        />
      )}

      <FiltrosPanel
        open={filtrosOpen}
        onClose={() => setFiltrosOpen(false)}
        onClear={clearAllFilters}
        etapas={etapas}
        responsaveis={responsaveis}
        oppsDoFunil={opps.filter(o => String(o.funil_id)===String(funilAtivo))}
        filterEtapa={filterEtapa}             setFilterEtapa={setFilterEtapa}
        filterSituacao={filterSituacao}       setFilterSituacao={setFilterSituacao}
        filterOrigem={filterOrigem}           setFilterOrigem={setFilterOrigem}
        filterResponsavel={filterResponsavel} setFilterResponsavel={setFilterResponsavel}
        filterAbertura={filterAbertura}       setFilterAbertura={setFilterAbertura}
        filterAberturaIni={filterAberturaIni} setFilterAberturaIni={setFilterAberturaIni}
        filterAberturaFim={filterAberturaFim} setFilterAberturaFim={setFilterAberturaFim}
        filterPrazo={filterPrazo}             setFilterPrazo={setFilterPrazo}
        filterPrazoIni={filterPrazoIni}       setFilterPrazoIni={setFilterPrazoIni}
        filterPrazoFim={filterPrazoFim}       setFilterPrazoFim={setFilterPrazoFim}
        filterValorMin={filterValorMin}       setFilterValorMin={setFilterValorMin}
        filterValorMax={filterValorMax}       setFilterValorMax={setFilterValorMax}
        filterTarefa={filterTarefa}           setFilterTarefa={setFilterTarefa}
        cfFields={cfFields}
        filterCF={filterCF}                   setFilterCF={setFilterCF}
        activeFilterCount={advancedFilterCount}
      />
    </div>
  )
}

// ─── Styles (padrão Empresas) ─────────────────────────────────────────────────
const p = {
  page:       { display:'flex', flexDirection:'column', gap:16, maxWidth:1200 },
  pageHeader: { display:'flex', alignItems:'flex-end', justifyContent:'space-between' },
  breadcrumb: { display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', marginBottom:4 },
  sep:        { color:'var(--border)' },
  title:      { margin:0, fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px' },
  newBtn:     { padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  kpis:       { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 },
  kpi:        { background:'var(--surface)', borderRadius:10, padding:'16px 18px', display:'flex', flexDirection:'column', gap:4, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', borderTop:'3px solid var(--border)' },
  kpiVal:     { fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1 },
  kpiLbl:     { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  toolbar:    { background:'var(--surface)', borderRadius:10, padding:'8px 12px', border:'1px solid var(--border2)', boxShadow:'var(--shadow)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'nowrap' },
  tbLeft:     { display:'flex', alignItems:'center', gap:6, flexShrink:1, minWidth:0 },
  tbRight:    { display:'flex', alignItems:'center', gap:6, flexShrink:0 },
  tbDivider:  { width:1, height:24, background:'var(--border)', flexShrink:0, margin:'0 4px' },
  searchWrap: { position:'relative', width:240, flexShrink:0 },
  searchIcon: { position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14, pointerEvents:'none' },
  searchInput:{ width:'100%', height:36, padding:'0 10px 0 28px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box' },
  select:     { height:36, padding:'0 8px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:12, outline:'none', cursor:'pointer', fontFamily:'var(--font)', flexShrink:0 },
  viewToggle: { display:'flex', border:'1px solid var(--border)', borderRadius:7, overflow:'hidden', flexShrink:0 },
  viewBtn:    { width:34, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', transition:'all 0.15s' },
  viewBtnOn:  { background:'var(--accent-glow)', color:'var(--accent)' },
  ghostBtn:   { height:36, display:'flex', alignItems:'center', gap:5, padding:'0 10px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-muted)', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap', flexShrink:0, transition:'all 0.15s' },
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
  modal:            { background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:620, boxShadow:'0 20px 60px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', maxHeight:'90vh' },
  header:           { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border2)' },
  title:            { fontSize:16, fontWeight:700, color:'var(--text)', margin:0 },
  subtitle:         { fontSize:13, color:'var(--text-muted)', marginTop:3 },
  closeBtn:         { background:'none', border:'none', color:'var(--text-muted)', fontSize:16, cursor:'pointer', padding:4, lineHeight:1 },
  expandBtn:        { background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-muted)', fontSize:14, cursor:'pointer', padding:'2px 6px', lineHeight:1 },
  body:             { padding:'4px 24px 16px', overflowY:'auto', flex:1, minHeight:0 },
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
