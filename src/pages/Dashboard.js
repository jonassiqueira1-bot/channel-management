import { useState, useEffect, useRef, Fragment } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, arrayMove, rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Settings2, Check, X, AlertTriangle, Info,
  TrendingUp, Users, FileText, Target, FolderKanban,
  MessageSquare, ExternalLink, Plus, LayoutGrid,
  PieChart, BarChart2, List, Percent, Ticket, FileCheck,
  Settings, Search, Filter, Layers, ChevronDown,
} from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useLocalState } from '../hooks/useLocalState'
import { useDashboard } from '../hooks/useDashboard'
import {
  DEFAULT_SECTIONS_ISV, DEFAULT_SECTIONS_FRANCHISE,
  SECTIONS_STORAGE_KEY, GLOBAL_FILTERS_KEY,
  applyFilters,
} from '../data/mockDashboard'

// ─── Layouts de seção disponíveis ────────────────────────────────────────────
const SECTION_LAYOUTS = {
  '1-1-1-1': { label:'Quatro colunas',    cols:[1,1,1,1] },
  '2-2':     { label:'Duas colunas',      cols:[2,2]     },
  '4':       { label:'Coluna única',      cols:[4]       },
  '2-1-1':   { label:'1/2 + 1/4 + 1/4',  cols:[2,1,1]   },
  '1-1-2':   { label:'1/4 + 1/4 + 1/2',  cols:[1,1,2]   },
  '3-1':     { label:'3/4 + 1/4',         cols:[3,1]     },
  '1-3':     { label:'1/4 + 3/4',         cols:[1,3]     },
}

const FILTER_PERIODS = [
  { id:'this_month', label:'Este mês',    shortLabel:'Mês atual'  },
  { id:'last_3m',    label:'Últimos 3M',  shortLabel:'Últ. 3M'   },
  { id:'this_year',  label:'Este ano',    shortLabel:'Ano atual'  },
]

// ─── Paleta de cores ──────────────────────────────────────────────────────────
const PALETTE = ['#6366F1','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6']

// ─── Catálogos de widgets ─────────────────────────────────────────────────────
const WIDGET_CATALOG_ISV = [
  { id:'isv_cdu',        title:'Receita CDU',           desc:'Total CDU consolidado',             type:'kpi',   Icon:TrendingUp,    defaultSettings:{ meta:850000 } },
  { id:'isv_sms',        title:'Receita SMS',           desc:'Total SMS consolidado',             type:'kpi',   Icon:MessageSquare, defaultSettings:{ meta:320000 } },
  { id:'isv_servicos',   title:'Receita Serviços',      desc:'Total de serviços',                 type:'kpi',   Icon:FileText,      defaultSettings:{ meta:210000 } },
  { id:'isv_franquias',  title:'Franquias Ativas',      desc:'Quantidade de franquias ativas',    type:'kpi',   Icon:Users,         defaultSettings:{} },
  { id:'isv_oport',      title:'Oportunidades Ativas',  desc:'Total de oportunidades em aberto',  type:'kpi',   Icon:Target,        defaultSettings:{} },
  { id:'isv_projetos',   title:'Projetos em Andamento', desc:'Projetos MIT ativos',               type:'kpi',   Icon:FolderKanban,  defaultSettings:{} },
  { id:'isv_taxa_conv',  title:'Taxa de Conversão',     desc:'% de oportunidades convertidas',    type:'kpi',   Icon:Percent,       defaultSettings:{} },
  { id:'isv_ticket',     title:'Ticket Médio CDU',      desc:'Valor médio por contrato CDU',      type:'kpi',   Icon:Ticket,        defaultSettings:{} },
  { id:'isv_contratos',  title:'Contratos Ativos',      desc:'Total de contratos vigentes',       type:'kpi',   Icon:FileCheck,     defaultSettings:{} },
  { id:'isv_chart_bar',  title:'Receita por Franquia',  desc:'Comparativo CDU/SMS/Serviços',      type:'chart', Icon:BarChart2,     defaultSettings:{ chartType:'bar'   } },
  { id:'isv_chart_pie',  title:'Distribuição de Receita',desc:'Proporção CDU × SMS × Serviços',  type:'chart', Icon:PieChart,      defaultSettings:{ chartType:'donut' } },
  { id:'isv_pipeline',   title:'Pipeline por Etapa',    desc:'Oportunidades e valor por fase',    type:'chart', Icon:BarChart2,     defaultSettings:{} },
]

const WIDGET_CATALOG_FRANCHISE = [
  { id:'fr_oport',    title:'Minhas Oportunidades',  desc:'Oportunidades em aberto',          type:'kpi',   Icon:Target,       defaultSettings:{ meta:15 } },
  { id:'fr_projetos', title:'Projetos Ativos',       desc:'Projetos MIT em andamento',        type:'kpi',   Icon:FolderKanban, defaultSettings:{ meta:8 } },
  { id:'fr_quest',    title:'Questionários Enviados',desc:'Suporte técnico aberto',           type:'kpi',   Icon:MessageSquare,defaultSettings:{} },
  { id:'fr_cdu',      title:'Receita CDU',           desc:'Minha receita CDU',                type:'kpi',   Icon:TrendingUp,   defaultSettings:{ meta:120000 } },
  { id:'fr_sms',      title:'Receita SMS',           desc:'Minha receita SMS',                type:'kpi',   Icon:MessageSquare,defaultSettings:{} },
  { id:'fr_servicos', title:'Receita Serviços',      desc:'Minha receita de serviços',        type:'kpi',   Icon:FileText,     defaultSettings:{} },
  { id:'fr_taxa_conv',title:'Taxa de Conversão',     desc:'% de oportunidades convertidas',   type:'kpi',   Icon:Percent,      defaultSettings:{} },
  { id:'fr_ticket',   title:'Ticket Médio',          desc:'Ticket médio por contrato',        type:'kpi',   Icon:Ticket,       defaultSettings:{} },
  { id:'fr_contratos',title:'Contratos Ativos',      desc:'Contratos vigentes na unidade',    type:'kpi',   Icon:FileCheck,    defaultSettings:{} },
  { id:'fr_pipeline', title:'Pipeline por Etapa',   desc:'Oportunidades e valor por fase',   type:'chart', Icon:BarChart2,    defaultSettings:{} },
  { id:'fr_atv',      title:'Atividades Recentes',  desc:'Últimas movimentações',            type:'list',  Icon:List,         defaultSettings:{} },
]

// ─── Formatação ───────────────────────────────────────────────────────────────
function fmtCur(n) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `R$ ${(n / 1_000).toFixed(0)}k`
  return `R$ ${n}`
}

function polar(cx, cy, r, deg) {
  const a = (deg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}
function arc(cx, cy, oR, iR, start, end) {
  const gap = 1.5
  const s1 = polar(cx, cy, oR, start + gap), e1 = polar(cx, cy, oR, end - gap)
  const s2 = polar(cx, cy, iR, end - gap),   e2 = polar(cx, cy, iR, start + gap)
  const lg = (end - start) > 180 ? 1 : 0
  return `M${s1.x} ${s1.y} A${oR} ${oR} 0 ${lg} 1 ${e1.x} ${e1.y} L${s2.x} ${s2.y} A${iR} ${iR} 0 ${lg} 0 ${e2.x} ${e2.y}Z`
}

// ─── Helpers de slot ──────────────────────────────────────────────────────────
function getSlotAnalytics(slot, baseAnalytics, globalFilters) {
  if (slot.settings?.ignoreGlobalFilter) {
    const p = slot.settings?.localFilter?.period
    return p ? applyFilters(baseAnalytics, { period:p, franchise:'all' }) : baseAnalytics
  }
  const period  = slot.settings?.localFilter?.period || globalFilters.period
  return applyFilters(baseAnalytics, { ...globalFilters, period })
}

function genId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}` }

// ─── Alertas ──────────────────────────────────────────────────────────────────
const ALERT_CFG = {
  critical: { border:'#EF4444', bg:'rgba(239,68,68,0.07)', stripe:'repeating-linear-gradient(135deg,rgba(239,68,68,0.04) 0px,rgba(239,68,68,0.04) 4px,transparent 4px,transparent 12px)', text:'#EF4444', label:'Crítico',  Icon:AlertTriangle },
  warning:  { border:'#F59E0B', bg:'rgba(245,158,11,0.07)',  stripe:null, text:'#D97706', label:'Atenção', Icon:AlertTriangle },
  info:     { border:'#6366F1', bg:'rgba(99,102,241,0.07)',  stripe:null, text:'#6366F1', label:'Info',    Icon:Info },
}

function AlertCard({ alert, onDismiss }) {
  const cfg = ALERT_CFG[alert.severity] || ALERT_CFG.info
  const { Icon } = cfg
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px', backgroundColor:cfg.bg, backgroundImage:cfg.stripe||undefined, border:`1px solid ${cfg.border}44`, borderLeft:`4px solid ${cfg.border}`, borderRadius:10, animation:'fadeIn 0.3s ease' }}>
      <span style={{ color:cfg.text, marginTop:1, flexShrink:0 }}><Icon size={15} strokeWidth={2}/></span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:cfg.text, padding:'1px 6px', background:`${cfg.border}18`, borderRadius:4 }}>{cfg.label}</span>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{alert.title}</span>
        </div>
        {alert.description && <p style={{ fontSize:12, color:'var(--text-soft)', margin:0, lineHeight:1.5 }}>{alert.description}</p>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        {alert.action_url && (
          <a href={alert.action_url} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:cfg.text, textDecoration:'none', padding:'4px 10px', border:`1px solid ${cfg.border}44`, borderRadius:6, background:`${cfg.border}10`, whiteSpace:'nowrap' }}>
            {alert.action_label||'Ver'} <ExternalLink size={11} strokeWidth={2}/>
          </a>
        )}
        <button onClick={() => onDismiss(alert.id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:2, display:'flex', alignItems:'center', borderRadius:4 }}>
          <X size={14} strokeWidth={2}/>
        </button>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ widget, label, value, unit, defaultColor, isCustomizing, onUpdateMeta }) {
  const settings     = widget.settings || {}
  const color        = settings.color || defaultColor
  const displayLabel = settings.label || label
  const showProgress = settings.showProgress !== false
  const meta         = settings.meta
  const pct          = meta ? Math.min(Math.round((value / meta) * 100), 200) : null
  const barColor     = pct >= 100 ? '#10B981' : color
  const [editing, setEditing] = useState(false)
  const [metaVal, setMetaVal] = useState(String(meta || ''))
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])
  useEffect(() => { setMetaVal(String(meta || '')) }, [meta])

  function commit() {
    const n = Number(String(metaVal).replace(/\D/g, ''))
    if (n > 0) onUpdateMeta(n)
    setEditing(false)
  }

  const displayValue = unit === 'R$' ? fmtCur(value) : unit === '%' ? `${value}%` : Number(value).toLocaleString('pt-BR')
  const displayMeta  = meta ? (unit === 'R$' ? fmtCur(meta) : unit === '%' ? `${meta}%` : Number(meta).toLocaleString('pt-BR')) : null

  return (
    <div style={{ ...s.card, height:'100%', display:'flex', flexDirection:'column', minHeight:130 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', lineHeight:1.3, flex:1 }}>{displayLabel}</span>
        <div style={{ width:30, height:30, borderRadius:8, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <div style={{ color }}>{widget._icon}</div>
        </div>
      </div>
      <div style={{ fontSize:30, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)', letterSpacing:'-1px', lineHeight:1, marginBottom:12 }}>{displayValue}</div>
      {showProgress && meta !== undefined && meta !== null && (
        <div style={{ marginTop:'auto' }}>
          <div style={{ height:4, background:'var(--surface2)', borderRadius:99, marginBottom:7, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:barColor, borderRadius:99, transition:'width 0.6s cubic-bezier(0.4,0,0.2,1)' }}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)' }}>
            <span style={{ fontWeight:600, color: pct>=100 ? '#10B981' : 'var(--text-soft)' }}>{pct}%</span>
            {!isCustomizing && editing ? (
              <input ref={inputRef} type="number" value={metaVal}
                onChange={e => setMetaVal(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if(e.key==='Enter') commit(); if(e.key==='Escape') setEditing(false) }}
                style={{ width:100, fontSize:11, border:'1px solid var(--accent)', borderRadius:5, padding:'2px 6px', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--mono)', outline:'none' }}
              />
            ) : (
              <span onClick={() => { if(!isCustomizing&&meta!==undefined){ setMetaVal(String(meta)); setEditing(true) } }}
                title={isCustomizing?'':'Clique para editar a meta'}
                style={{ cursor:isCustomizing?'default':'pointer', textDecoration:isCustomizing?'none':'underline dotted', textUnderlineOffset:2 }}>
                Meta: {displayMeta}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutWidget({ widget, data }) {
  const chartType = widget.settings?.chartType || 'donut'
  const segments  = [
    { label:'CDU',      value: data.cdu_receita,      color:'#6366F1' },
    { label:'SMS',      value: data.sms_receita,      color:'#0EA5E9' },
    { label:'Serviços', value: data.servicos_receita, color:'#10B981' },
  ]
  const total = segments.reduce((s,x) => s + x.value, 0)

  const DonutSVG = () => {
    let cursor = 0
    const paths = segments.map(seg => {
      const start = cursor, sweep = (seg.value/total)*360
      cursor += sweep
      return { ...seg, start, end:cursor }
    })
    return (
      <svg viewBox="0 0 180 180" style={{ width:120, flexShrink:0 }}>
        {paths.map((seg,i) => <path key={i} d={arc(90,90,75,50,seg.start,seg.end)} fill={seg.color} opacity={0.9}/>)}
        <text x="90" y="85"  textAnchor="middle" fontSize="9"  fill="var(--text-muted)" fontFamily="var(--font)">Total</text>
        <text x="90" y="102" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--text)" fontFamily="var(--mono)">{fmtCur(total)}</text>
      </svg>
    )
  }

  const BarSVG = () => {
    const maxV = Math.max(...segments.map(s => s.value))
    return (
      <svg viewBox="0 0 260 120" width="100%" style={{ overflow:'visible' }}>
        {segments.map((seg, i) => {
          const bh = (seg.value / maxV) * 80
          const x  = 20 + i * 80
          return (
            <g key={seg.label}>
              <rect x={x} y={100-bh} width={50} height={bh} rx={5} fill={seg.color} opacity={0.85}/>
              <text x={x+25} y={110} textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontFamily="var(--font)">{seg.label}</text>
              <text x={x+25} y={100-bh-6} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{fmtCur(seg.value)}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <div style={{ ...s.card, height:'100%' }}>
      <div style={s.wTitle}>{widget.settings?.label || 'Distribuição de Receita'}</div>
      {chartType === 'donut' ? (
        <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:12 }}>
          <DonutSVG/>
          <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1 }}>
            {segments.map(seg => (
              <div key={seg.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:9, height:9, borderRadius:3, background:seg.color, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{seg.label}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmtCur(seg.value)}</div>
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{Math.round((seg.value/total)*100)}%</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop:16 }}><BarSVG/></div>
      )}
    </div>
  )
}

// ─── Bar Chart Franquias ──────────────────────────────────────────────────────
function BarFranquiasWidget({ widget, data }) {
  const chartType = widget.settings?.chartType || 'bar'
  const maxTotal  = Math.max(...data.map(f => f.cdu+f.sms+f.servicos))
  const COLORS    = ['#6366F1','#0EA5E9','#10B981']
  const BAR_H = 34, GAP = 14, LBL_W = 90, BAR_W = 300
  const svgH  = data.length * (BAR_H + GAP) + 32

  const DonutFranquias = () => {
    const segments = data.map((f,i) => ({ label:f.nome, value:f.cdu+f.sms+f.servicos, color:COLORS[i%COLORS.length] }))
    const total    = segments.reduce((s,x) => s+x.value, 0)
    let cursor = 0
    const paths = segments.map(seg => {
      const start = cursor, sweep = (seg.value/total)*360
      cursor += sweep
      return { ...seg, start, end:cursor }
    })
    return (
      <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:12 }}>
        <svg viewBox="0 0 180 180" style={{ width:130, flexShrink:0 }}>
          {paths.map((seg,i) => <path key={i} d={arc(90,90,75,50,seg.start,seg.end)} fill={seg.color} opacity={0.9}/>)}
          <text x="90" y="85"  textAnchor="middle" fontSize="9"  fill="var(--text-muted)" fontFamily="var(--font)">Total</text>
          <text x="90" y="102" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--text)" fontFamily="var(--mono)">{fmtCur(total)}</text>
        </svg>
        <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1 }}>
          {segments.map(seg => (
            <div key={seg.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:9, height:9, borderRadius:3, background:seg.color, flexShrink:0 }}/>
              <span style={{ flex:1, fontSize:12, color:'var(--text-soft)' }}>{seg.label}</span>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmtCur(seg.value)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...s.card, height:'100%' }}>
      <div style={s.wTitle}>{widget.settings?.label || 'Receita por Franquia'}</div>
      {chartType === 'donut' ? <DonutFranquias/> : (
        <div style={{ marginTop:10 }}>
          <svg viewBox={`0 0 ${LBL_W+BAR_W+68} ${svgH}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ overflow:'visible' }}>
            {['CDU','SMS','Serviços'].map((l,i) => (
              <g key={l} transform={`translate(${LBL_W+i*82},0)`}>
                <rect x="0" y="2" width="9" height="9" rx="2.5" fill={COLORS[i]} opacity="0.85"/>
                <text x="13" y="10" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font)">{l}</text>
              </g>
            ))}
            {data.map((f,i) => {
              const y = 26+i*(BAR_H+GAP), tot = f.cdu+f.sms+f.servicos
              const cW = (f.cdu/maxTotal)*BAR_W, sW = (f.sms/maxTotal)*BAR_W, vW = (f.servicos/maxTotal)*BAR_W
              return (
                <g key={f.nome}>
                  <text x={LBL_W-8} y={y+BAR_H/2+4} textAnchor="end" fontSize="11" fill="var(--text-soft)" fontFamily="var(--font)">{f.nome}</text>
                  <rect x={LBL_W}       y={y} width={Math.max(cW,0)} height={BAR_H} rx="3" fill={COLORS[0]} opacity="0.88"/>
                  <rect x={LBL_W+cW}    y={y} width={Math.max(sW,0)} height={BAR_H} rx="0" fill={COLORS[1]} opacity="0.88"/>
                  <rect x={LBL_W+cW+sW} y={y} width={Math.max(vW,0)} height={BAR_H} rx="3" fill={COLORS[2]} opacity="0.88"/>
                  <text x={LBL_W+cW+sW+vW+8} y={y+BAR_H/2+4} fontSize="11" fill="var(--text-muted)" fontFamily="var(--mono)">{fmtCur(tot)}</text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function PipelineWidget({ widget, data }) {
  const maxVal = Math.max(...data.map(e => e.valor))
  return (
    <div style={{ ...s.card, height:'100%' }}>
      <div style={s.wTitle}>{widget.settings?.label || 'Pipeline por Etapa'}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:14 }}>
        {data.map((etapa,i) => {
          const pct = (etapa.valor/maxVal)*100, op = 1-i*0.08
          return (
            <div key={etapa.etapa}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>
                <span style={{ color:'var(--text-soft)', fontWeight:500 }}>{etapa.etapa}</span>
                <span style={{ display:'flex', gap:10, fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>
                  <span>{etapa.qtd} oport.</span>
                  <span style={{ color:'var(--text-soft)', fontWeight:600 }}>{fmtCur(etapa.valor)}</span>
                </span>
              </div>
              <div style={{ height:5, background:'var(--surface2)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:'var(--accent)', borderRadius:99, opacity:op, transition:'width 0.6s ease' }}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Atividades ───────────────────────────────────────────────────────────────
const ATI_CFG = {
  oportunidade: { Icon:TrendingUp,    color:'#6366F1' },
  projeto:      { Icon:FolderKanban,  color:'#0EA5E9' },
  questionario: { Icon:MessageSquare, color:'#F59E0B' },
}
const ST_CFG = {
  em_andamento: { label:'Em andamento', color:'#3B82F6' },
  pendente:     { label:'Pendente',     color:'#F59E0B' },
  ganho:        { label:'Ganho',        color:'#10B981' },
  concluido:    { label:'Concluído',    color:'#6B7280' },
}

function ActivityWidget({ widget, data }) {
  return (
    <div style={{ ...s.card, height:'100%' }}>
      <div style={s.wTitle}>{widget.settings?.label || 'Atividades Recentes'}</div>
      <div style={{ display:'flex', flexDirection:'column', marginTop:12 }}>
        {data.map((atv,i) => {
          const ac = ATI_CFG[atv.tipo]||ATI_CFG.oportunidade, sc = ST_CFG[atv.status]||ST_CFG.pendente
          return (
            <div key={atv.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:i<data.length-1?'1px solid var(--border2)':'none' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:`${ac.color}14`, color:ac.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <ac.Icon size={13} strokeWidth={1.75}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{atv.titulo}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{new Date(atv.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:600, color:sc.color, background:`${sc.color}12`, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>{sc.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── WidgetRenderer ───────────────────────────────────────────────────────────
function getAnalyticsValue(id, analytics) {
  const map = {
    isv_cdu:       { value: analytics.cdu_receita,      unit:'R$', color:'#6366F1', Icon:TrendingUp    },
    isv_sms:       { value: analytics.sms_receita,      unit:'R$', color:'#0EA5E9', Icon:MessageSquare },
    isv_servicos:  { value: analytics.servicos_receita, unit:'R$', color:'#10B981', Icon:FileText      },
    isv_franquias: { value: analytics.franquias_ativas, unit:'',   color:'#F59E0B', Icon:Users         },
    isv_oport:     { value: analytics.oportunidades,    unit:'',   color:'#8B5CF6', Icon:Target        },
    isv_projetos:  { value: analytics.projetos_ativos,  unit:'',   color:'#EC4899', Icon:FolderKanban  },
    isv_taxa_conv: { value: analytics.taxa_conversao,   unit:'%',  color:'#14B8A6', Icon:Percent       },
    isv_ticket:    { value: analytics.ticket_medio,     unit:'R$', color:'#F59E0B', Icon:Ticket        },
    isv_contratos: { value: analytics.contratos_ativos, unit:'',   color:'#6366F1', Icon:FileCheck     },
    fr_oport:      { value: analytics.oportunidades,    unit:'',   color:'#6366F1', Icon:Target        },
    fr_projetos:   { value: analytics.projetos_ativos,  unit:'',   color:'#0EA5E9', Icon:FolderKanban  },
    fr_quest:      { value: analytics.questionarios,    unit:'',   color:'#F59E0B', Icon:MessageSquare },
    fr_cdu:        { value: analytics.cdu_receita,      unit:'R$', color:'#10B981', Icon:TrendingUp    },
    fr_sms:        { value: analytics.sms_receita,      unit:'R$', color:'#0EA5E9', Icon:MessageSquare },
    fr_servicos:   { value: analytics.servicos_receita, unit:'R$', color:'#10B981', Icon:FileText      },
    fr_taxa_conv:  { value: analytics.taxa_conversao,   unit:'%',  color:'#14B8A6', Icon:Percent       },
    fr_ticket:     { value: analytics.ticket_medio,     unit:'R$', color:'#F59E0B', Icon:Ticket        },
    fr_contratos:  { value: analytics.contratos_ativos, unit:'',   color:'#6366F1', Icon:FileCheck     },
  }
  return map[id] || null
}

function WidgetRenderer({ widget, analytics, isCustomizing, onUpdateMeta, catalog }) {
  const kv = getAnalyticsValue(widget.id, analytics)
  const catalogEntry = catalog.find(c => c.id === widget.id)

  if (kv) {
    const icon = kv.Icon ? <kv.Icon size={14} strokeWidth={1.75}/> : null
    const enriched = { ...widget, _icon: icon }
    return (
      <KpiCard
        widget={enriched}
        label={catalogEntry?.title || widget.id}
        value={kv.value}
        unit={kv.unit}
        defaultColor={kv.color}
        isCustomizing={isCustomizing}
        onUpdateMeta={v => onUpdateMeta(widget.id, v)}
      />
    )
  }
  if (widget.id === 'isv_chart_bar') return <BarFranquiasWidget widget={widget} data={analytics.por_franquia}/>
  if (widget.id === 'isv_chart_pie') return <DonutWidget widget={widget} data={analytics}/>
  if (widget.id === 'isv_pipeline')  return <PipelineWidget widget={widget} data={analytics.pipeline}/>
  if (widget.id === 'fr_pipeline')   return <PipelineWidget widget={widget} data={analytics.pipeline}/>
  if (widget.id === 'fr_atv')        return <ActivityWidget widget={widget} data={analytics.atividades_recentes}/>

  return <div style={{ ...s.card, color:'var(--text-muted)', fontSize:13 }}>Widget: {widget.id}</div>
}

// ─── Categorias do catálogo ───────────────────────────────────────────────────
const TYPE_CFG = {
  kpi:   { label:'KPI',     bg:'rgba(99,102,241,0.12)',  color:'#6366F1' },
  chart: { label:'Gráfico', bg:'rgba(14,165,233,0.12)',  color:'#0EA5E9' },
  list:  { label:'Lista',   bg:'rgba(16,185,129,0.12)',  color:'#10B981' },
}

// ─── Preview mini ─────────────────────────────────────────────────────────────
function WidgetPreview({ entry, analytics }) {
  if (!analytics) return null
  const kpiMap = {
    isv_cdu:{ value:analytics.cdu_receita, unit:'R$', color:'#6366F1' }, isv_sms:{ value:analytics.sms_receita, unit:'R$', color:'#0EA5E9' },
    isv_servicos:{ value:analytics.servicos_receita, unit:'R$', color:'#10B981' }, isv_franquias:{ value:analytics.franquias_ativas, unit:'', color:'#F59E0B' },
    isv_oport:{ value:analytics.oportunidades, unit:'', color:'#8B5CF6' }, isv_projetos:{ value:analytics.projetos_ativos, unit:'', color:'#EC4899' },
    isv_taxa_conv:{ value:analytics.taxa_conversao, unit:'%', color:'#14B8A6' }, isv_ticket:{ value:analytics.ticket_medio, unit:'R$', color:'#F59E0B' },
    isv_contratos:{ value:analytics.contratos_ativos, unit:'', color:'#6366F1' }, fr_oport:{ value:analytics.oportunidades, unit:'', color:'#6366F1' },
    fr_projetos:{ value:analytics.projetos_ativos, unit:'', color:'#0EA5E9' }, fr_quest:{ value:analytics.questionarios, unit:'', color:'#F59E0B' },
    fr_cdu:{ value:analytics.cdu_receita, unit:'R$', color:'#10B981' }, fr_sms:{ value:analytics.sms_receita, unit:'R$', color:'#0EA5E9' },
    fr_servicos:{ value:analytics.servicos_receita, unit:'R$', color:'#10B981' }, fr_taxa_conv:{ value:analytics.taxa_conversao, unit:'%', color:'#14B8A6' },
    fr_ticket:{ value:analytics.ticket_medio, unit:'R$', color:'#F59E0B' }, fr_contratos:{ value:analytics.contratos_ativos, unit:'', color:'#6366F1' },
  }
  const kv = kpiMap[entry.id]
  if (kv) {
    const display = kv.unit === 'R$' ? fmtCur(kv.value) : kv.unit === '%' ? `${kv.value}%` : Number(kv.value).toLocaleString('pt-BR')
    const meta = entry.defaultSettings?.meta
    const pct  = meta ? Math.min(Math.round((kv.value / meta) * 100), 100) : 72
    return (
      <div style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:10, padding:'14px 16px' }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:10 }}>{entry.title}</div>
        <div style={{ fontSize:28, fontWeight:800, color:kv.color, fontFamily:'var(--mono)', letterSpacing:'-1px', marginBottom:12 }}>{display}</div>
        <div style={{ height:4, background:'var(--surface2)', borderRadius:99, overflow:'hidden', marginBottom:7 }}>
          <div style={{ height:'100%', width:`${pct}%`, background:kv.color, borderRadius:99 }}/>
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{pct}% {meta ? `· Meta: ${kv.unit==='R$'?fmtCur(meta):meta}` : 'do objetivo'}</div>
      </div>
    )
  }
  if (entry.type === 'chart') {
    const colors = ['#6366F1','#0EA5E9','#10B981']
    const labels = entry.id.includes('bar') || entry.id.includes('pipeline')
      ? (analytics.por_franquia||analytics.pipeline||[]).slice(0,3).map(x => x.nome||x.etapa||'')
      : ['CDU','SMS','Serviços']
    const vals = entry.id.includes('bar') && analytics.por_franquia
      ? analytics.por_franquia.slice(0,3).map(f => f.cdu+f.sms+f.servicos)
      : [analytics.cdu_receita||0, analytics.sms_receita||0, analytics.servicos_receita||0]
    const maxV = Math.max(...vals, 1)
    return (
      <div style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:10, padding:'14px 16px' }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:12 }}>{entry.title}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {labels.map((lbl,i) => (
            <div key={i}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                <span style={{ color:'var(--text-soft)' }}>{lbl}</span>
                <span style={{ color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{fmtCur(vals[i]||0)}</span>
              </div>
              <div style={{ height:6, background:'var(--surface2)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.round((vals[i]||0)/maxV*100)}%`, background:colors[i%3], borderRadius:99 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return <div style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:10, padding:'14px 16px', color:'var(--text-muted)', fontSize:13 }}>Prévia não disponível</div>
}

// ─── Widget Config Modal ──────────────────────────────────────────────────────
function WidgetConfigModal({ slot, catalog, onSave, onClose }) {
  const widget  = { id: slot.widgetId, settings: slot.settings }
  const entry   = catalog.find(c => c.id === widget.id)
  const isChart = entry?.type === 'chart'
  const isKpi   = entry?.type === 'kpi'

  const [cfg, setCfg] = useState({
    label:              widget.settings?.label              || '',
    color:              widget.settings?.color              || '',
    showProgress:       widget.settings?.showProgress       !== false,
    chartType:          widget.settings?.chartType          || (isChart ? (widget.id.includes('pie') ? 'donut' : 'bar') : undefined),
    ignoreGlobalFilter: widget.settings?.ignoreGlobalFilter || false,
    localPeriod:        widget.settings?.localFilter?.period || null,
  })

  function save() {
    const ns = { ...widget.settings }
    if (cfg.label.trim()) ns.label = cfg.label.trim(); else delete ns.label
    if (cfg.color)        ns.color = cfg.color;        else delete ns.color
    if (isKpi)            ns.showProgress  = cfg.showProgress
    if (isChart && cfg.chartType) ns.chartType = cfg.chartType
    ns.ignoreGlobalFilter = cfg.ignoreGlobalFilter
    if (cfg.localPeriod) ns.localFilter = { period: cfg.localPeriod }
    else delete ns.localFilter
    onSave(ns)
  }

  const Toggle = ({ on, onChange, label, sub }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!on)}
        style={{ width:42, height:24, borderRadius:99, background:on?'var(--accent)':'var(--border)', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
        <span style={{ position:'absolute', top:2, left:on?20:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
      </button>
    </div>
  )

  return (
    <div style={s.overlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth:440 }}>
        <div style={s.mHeader}>
          <div>
            <div style={s.mTitle}>Configurar indicador</div>
            <div style={s.mSub}>{entry?.title || widget.id}</div>
          </div>
          <button onClick={onClose} style={s.closeBtn}><X size={15} strokeWidth={2}/></button>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:20, overflowY:'auto', maxHeight:'70vh' }}>
          {/* Label */}
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Título do indicador</label>
            <input style={s.input} placeholder={entry?.title || 'Título padrão'} value={cfg.label}
              onChange={e => setCfg(c => ({...c, label:e.target.value}))}/>
          </div>

          {/* Cor (KPI) */}
          {isKpi && (
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Cor de destaque</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={() => setCfg(c => ({...c, color:''}))} title="Padrão"
                  style={{ width:28, height:28, borderRadius:7, background:'var(--surface2)', border:`2px solid ${!cfg.color?'var(--accent)':'var(--border)'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--text-muted)' }}>—</button>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setCfg(cfg2 => ({...cfg2, color:c}))}
                    style={{ width:28, height:28, borderRadius:7, background:c, border:`2px solid ${cfg.color===c?'#fff':'transparent'}`, cursor:'pointer', boxShadow:cfg.color===c?`0 0 0 2px ${c}`:'none', transition:'box-shadow 0.15s' }}/>
                ))}
              </div>
            </div>
          )}

          {/* Barra de progresso (KPI com meta) */}
          {isKpi && widget.settings?.meta !== undefined && (
            <Toggle on={cfg.showProgress} onChange={v => setCfg(c => ({...c, showProgress:v}))}
              label="Barra de progresso" sub="Exibir % atingido da meta"/>
          )}

          {/* Tipo de gráfico */}
          {isChart && (
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Tipo de visualização</label>
              <div style={{ display:'flex', gap:8 }}>
                {[{ type:'bar', label:'Barras', Icon:BarChart2 },{ type:'donut', label:'Rosca', Icon:PieChart }].map(opt => (
                  <button key={opt.type} onClick={() => setCfg(c => ({...c, chartType:opt.type}))}
                    style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', border:`1.5px solid ${cfg.chartType===opt.type?'var(--accent)':'var(--border)'}`, borderRadius:10, background:cfg.chartType===opt.type?'var(--accent-glow)':'var(--surface2)', cursor:'pointer', color:cfg.chartType===opt.type?'var(--accent)':'var(--text-muted)', transition:'all 0.15s' }}>
                    <opt.Icon size={22} strokeWidth={1.5}/>
                    <span style={{ fontSize:12, fontWeight:600 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divisor Filtros */}
          <div style={{ borderTop:'1px solid var(--border2)', paddingTop:16, display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:-4 }}>
              <Filter size={13} strokeWidth={1.75} style={{ color:'var(--text-muted)' }}/>
              <span style={s.fieldLabel}>Filtros</span>
            </div>

            <Toggle
              on={!cfg.ignoreGlobalFilter}
              onChange={v => setCfg(c => ({...c, ignoreGlobalFilter:!v}))}
              label="Usar filtros globais da tela"
              sub="Período e franquia selecionados no topo do dashboard"
            />

            {/* Período local (override ou quando ignora global) */}
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>
                {cfg.ignoreGlobalFilter ? 'Período para este indicador' : 'Período local (substitui o global)'}
              </label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <button
                  onClick={() => setCfg(c => ({...c, localPeriod:null}))}
                  style={{ fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:99, border:`1.5px solid ${!cfg.localPeriod?'var(--accent)':'var(--border)'}`, background:!cfg.localPeriod?'var(--accent-glow)':'var(--surface2)', color:!cfg.localPeriod?'var(--accent)':'var(--text-muted)', cursor:'pointer', transition:'all 0.12s' }}>
                  {cfg.ignoreGlobalFilter ? 'Sem filtro' : 'Herdar global'}
                </button>
                {FILTER_PERIODS.map(p => (
                  <button key={p.id}
                    onClick={() => setCfg(c => ({...c, localPeriod:p.id}))}
                    style={{ fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:99, border:`1.5px solid ${cfg.localPeriod===p.id?'var(--accent)':'var(--border)'}`, background:cfg.localPeriod===p.id?'var(--accent-glow)':'var(--surface2)', color:cfg.localPeriod===p.id?'var(--accent)':'var(--text-muted)', cursor:'pointer', transition:'all 0.12s' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'14px 24px', borderTop:'1px solid var(--border)', background:'var(--surface2)' }}>
          <button onClick={onClose} style={s.ghostBtn}>Cancelar</button>
          <button onClick={save}    style={s.accentBtn}><Check size={13} strokeWidth={2.5}/> Aplicar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Catalog Picker Panel ─────────────────────────────────────────────────────
function CatalogPickerPanel({ catalog, usedWidgetIds, analytics, onPick, onClose }) {
  const [search,    setSearch]    = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [hoverId,   setHoverId]   = useState(null)
  const searchRef = useRef(null)

  useState(() => { searchRef.current?.focus() })

  const TABS = [
    { id:'all', label:'Todos' }, { id:'kpi', label:'KPI' },
    { id:'chart', label:'Gráfico' }, { id:'list', label:'Lista' },
  ]

  const filtered = catalog.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q)
    const matchTab = activeTab === 'all' ? true : e.type === activeTab
    return matchSearch && matchTab
  })

  const hovered = catalog.find(e => e.id === hoverId) || filtered[0] || null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex' }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ flex:1, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)' }} onClick={onClose}/>
      <div style={{ width:700, maxWidth:'95vw', background:'var(--surface)', display:'flex', flexDirection:'column', height:'100%', boxShadow:'-8px 0 40px rgba(0,0,0,0.18)', animation:'slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Cabeçalho */}
        <div style={{ padding:'20px 24px 0', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text)', letterSpacing:'-0.2px' }}>Adicionar indicador</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Clique para adicionar ao quadrante</div>
            </div>
            <button onClick={onClose} style={s.closeBtn}><X size={16} strokeWidth={2}/></button>
          </div>
          <div style={{ position:'relative', marginBottom:14 }}>
            <Search size={14} strokeWidth={1.75} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar indicadores..."
              style={{ ...s.input, paddingLeft:34, paddingRight:search?32:10 }}/>
            {search && (
              <button onClick={() => setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center' }}>
                <X size={13} strokeWidth={2}/>
              </button>
            )}
          </div>
          <div style={{ display:'flex', gap:2, overflowX:'auto' }}>
            {TABS.map(tab => {
              const count = tab.id === 'all' ? catalog.length : catalog.filter(e => e.type === tab.id).length
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', fontSize:12, fontWeight:activeTab===tab.id?700:500, color:activeTab===tab.id?'var(--accent)':'var(--text-muted)', background:'none', border:'none', borderBottom:activeTab===tab.id?'2px solid var(--accent)':'2px solid transparent', cursor:'pointer', whiteSpace:'nowrap', transition:'color 0.15s', fontFamily:'var(--font)' }}>
                  {tab.label}
                  {tab.id !== 'all' && count > 0 && (
                    <span style={{ fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:99, background:activeTab===tab.id?'var(--accent)':'var(--surface2)', color:activeTab===tab.id?'#fff':'var(--text-muted)' }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Corpo */}
        <div style={{ flex:1, display:'flex', minHeight:0 }}>
          <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
            {filtered.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, color:'var(--text-muted)' }}>
                <Search size={28} strokeWidth={1} style={{ opacity:0.3 }}/>
                <span style={{ fontSize:14 }}>Nenhum indicador encontrado</span>
                {search && <button onClick={() => setSearch('')} style={{ fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer' }}>Limpar busca</button>}
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {filtered.map(entry => {
                  const tc      = TYPE_CFG[entry.type] || TYPE_CFG.kpi
                  const isHover = hoverId === entry.id
                  const inUse   = usedWidgetIds.includes(entry.id)
                  return (
                    <button key={entry.id}
                      onClick={() => onPick(entry)}
                      onMouseEnter={() => setHoverId(entry.id)}
                      onMouseLeave={() => setHoverId(null)}
                      style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'13px 14px', background:isHover?'var(--accent-glow)':'var(--surface2)', border:`${isHover?'1.5px':'1px'} solid ${isHover?'var(--accent)':'var(--border2)'}`, borderRadius:10, cursor:'pointer', textAlign:'left', transition:'all 0.12s', position:'relative' }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:isHover?'var(--accent)':`${tc.color}18`, color:isHover?'#fff':tc.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                        <entry.Icon size={16} strokeWidth={1.75}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:3, lineHeight:1.3 }}>{entry.title}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.4, marginBottom:8 }}>{entry.desc}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background:tc.bg, color:tc.color, letterSpacing:'0.04em' }}>{tc.label}</span>
                          {inUse && <span style={{ fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:4, background:'rgba(245,158,11,0.12)', color:'#D97706' }}>Em uso</span>}
                        </div>
                      </div>
                      <div style={{ width:20, height:20, borderRadius:'50%', background:isHover?'var(--accent)':'var(--surface)', border:isHover?'none':'1.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                        {isHover && <Plus size={11} strokeWidth={3} color="#fff"/>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Preview */}
          {hovered && (
            <div style={{ width:220, borderLeft:'1px solid var(--border)', padding:'20px 18px', display:'flex', flexDirection:'column', gap:16, overflowY:'auto', background:'var(--surface2)', flexShrink:0 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, textAlign:'center' }}>
                <div style={{ width:52, height:52, borderRadius:14, background:`${(TYPE_CFG[hovered.type]||TYPE_CFG.kpi).color}18`, color:(TYPE_CFG[hovered.type]||TYPE_CFG.kpi).color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <hovered.Icon size={24} strokeWidth={1.5}/>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', lineHeight:1.3 }}>{hovered.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{hovered.desc}</div>
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:10 }}>Prévia</div>
                <WidgetPreview entry={hovered} analytics={analytics}/>
              </div>
              <button onClick={() => onPick(hovered)}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 14px', background:'var(--accent)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'var(--font)', width:'100%' }}>
                <Plus size={13} strokeWidth={2.5}/> Adicionar
              </button>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div style={{ display:'flex', justifyContent:'flex-end', padding:'14px 24px', borderTop:'1px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
          <button onClick={onClose} style={s.ghostBtn}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Global Filter Bar ────────────────────────────────────────────────────────
function GlobalFilterBar({ filters, onChange, isISV, franchises, activeCount }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:10, padding:'9px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
      <button onClick={() => setOpen(!open)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:0, color:'var(--text-muted)', fontFamily:'var(--font)' }}>
        <Filter size={13} strokeWidth={1.75}/>
        <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Filtros</span>
        <ChevronDown size={12} strokeWidth={2} style={{ transform:open?'rotate(180deg)':'none', transition:'transform 0.15s' }}/>
      </button>

      {activeCount > 0 && (
        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--accent)', color:'#fff' }}>
          {activeCount} ativo{activeCount>1?'s':''}
        </span>
      )}

      {/* Period pills — always visible */}
      <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
        {FILTER_PERIODS.map(p => (
          <button key={p.id} onClick={() => onChange({ ...filters, period:p.id })}
            style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:99, border:'none', cursor:'pointer', background:filters.period===p.id?'var(--accent)':'var(--surface2)', color:filters.period===p.id?'#fff':'var(--text-muted)', transition:'all 0.12s', fontFamily:'var(--font)' }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Expanded: franchise + reset */}
      {open && (
        <>
          {isISV && franchises.length > 0 && (
            <div style={{ width:'100%', display:'flex', alignItems:'center', gap:10, paddingTop:8, borderTop:'1px solid var(--border2)', marginTop:4 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', whiteSpace:'nowrap' }}>Franquia:</span>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                <button onClick={() => onChange({ ...filters, franchise:'all' })}
                  style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:99, border:'none', cursor:'pointer', background:filters.franchise==='all'?'var(--accent)':'var(--surface2)', color:filters.franchise==='all'?'#fff':'var(--text-muted)', transition:'all 0.12s', fontFamily:'var(--font)' }}>
                  Todas
                </button>
                {franchises.map(f => (
                  <button key={f} onClick={() => onChange({ ...filters, franchise:f })}
                    style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:99, border:'none', cursor:'pointer', background:filters.franchise===f?'var(--accent)':'var(--surface2)', color:filters.franchise===f?'#fff':'var(--text-muted)', transition:'all 0.12s', fontFamily:'var(--font)' }}>
                    {f}
                  </button>
                ))}
              </div>
              {activeCount > 0 && (
                <button onClick={() => { onChange({ period:'this_month', franchise:'all' }); setOpen(false) }}
                  style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'1px solid var(--border)', cursor:'pointer', padding:'3px 10px', borderRadius:6, marginLeft:'auto', fontFamily:'var(--font)' }}>
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Layout Thumbnail ─────────────────────────────────────────────────────────
function LayoutThumb({ cols, active }) {
  return (
    <div style={{ display:'flex', gap:2, width:56, height:34, border:`${active?'1.5px':'1px'} solid ${active?'var(--accent)':'var(--border)'}`, borderRadius:6, padding:4, background:active?'var(--accent-glow)':'var(--surface)', cursor:'pointer' }}>
      {cols.map((c,i) => (
        <div key={i} style={{ flex:c, background:active?'var(--accent)':'var(--border2)', borderRadius:2, opacity:active?0.5:0.8 }}/>
      ))}
    </div>
  )
}

// ─── Add Section Inserter ─────────────────────────────────────────────────────
function AddSectionInserter({ isOpen, onOpen, onClose, onAdd }) {
  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ flex:1, height:1, background:'var(--border2)' }}/>
        <button onClick={isOpen ? onClose : onOpen}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 14px', background:isOpen?'var(--accent)':'var(--surface)', border:`1px solid ${isOpen?'var(--accent)':'var(--border2)'}`, borderRadius:99, fontSize:11, fontWeight:600, color:isOpen?'#fff':'var(--text-muted)', cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)' }}>
          <Plus size={11} strokeWidth={2.5}/> Adicionar seção
        </button>
        <div style={{ flex:1, height:1, background:'var(--border2)' }}/>
      </div>
      {isOpen && (
        <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', top:'calc(100% + 6px)', zIndex:200, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', boxShadow:'0 8px 30px rgba(0,0,0,0.14)', animation:'fadeIn 0.15s ease', minWidth:460 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:12 }}>Escolha o layout da seção</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {Object.entries(SECTION_LAYOUTS).map(([key, layout]) => (
              <button key={key} onClick={() => onAdd(key)}
                title={layout.label}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'10px 12px', background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--accent-glow)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.background='var(--surface2)' }}>
                <LayoutThumb cols={layout.cols}/>
                <span style={{ fontSize:10, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{layout.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Empty Slot ───────────────────────────────────────────────────────────────
function EmptySlot({ slotId, onAdd }) {
  const { setNodeRef, isOver } = useSortable({ id: slotId })
  return (
    <div ref={setNodeRef}
      style={{ minHeight:120, border:`2px dashed ${isOver?'var(--accent)':'var(--border2)'}`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:isOver?'var(--accent-glow)':'transparent', transition:'all 0.15s', height:'100%' }}>
      <button onClick={onAdd}
        style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:'16px 24px', borderRadius:8, color:'var(--text-muted)' }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--surface2)' }}
        onMouseLeave={e => { e.currentTarget.style.background='none' }}>
        <div style={{ width:36, height:36, borderRadius:10, border:'1.5px dashed var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Plus size={18} strokeWidth={1.5}/>
        </div>
        <span style={{ fontSize:12, fontWeight:500 }}>Adicionar indicador</span>
      </button>
    </div>
  )
}

// ─── Sortable Slot ────────────────────────────────────────────────────────────
function SortableSlot({ slotId, colSpan, isCustomizing, onOpenConfig, onRemove, filterBadge, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slotId })
  const [confirmRemove, setConfirmRemove] = useState(false)

  return (
    <div ref={setNodeRef}
      style={{ gridColumn:`span ${colSpan}`, transform:CSS.Transform.toString(transform), transition:transition||undefined, opacity:isDragging?0.4:1, position:'relative', zIndex:isDragging?10:1 }}
      {...attributes}>
      {isCustomizing && (
        <>
          <div style={{ position:'absolute', top:8, left:8, right:8, zIndex:20, display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, pointerEvents:'none' }}>
            <div {...listeners} style={{ display:'flex', alignItems:'center', gap:4, cursor:'grab', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:6, padding:'3px 8px', color:'var(--text-muted)', boxShadow:'var(--shadow)', pointerEvents:'all' }}>
              <GripVertical size={13} strokeWidth={1.75}/>
              <span style={{ fontSize:10, fontWeight:600 }}>mover</span>
            </div>
            <button onClick={onOpenConfig}
              style={{ display:'flex', alignItems:'center', gap:3, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:6, padding:'3px 8px', cursor:'pointer', color:'var(--text-muted)', boxShadow:'var(--shadow)', pointerEvents:'all' }}>
              <Settings size={12} strokeWidth={1.75}/>
              <span style={{ fontSize:10, fontWeight:600 }}>config</span>
            </button>
          </div>
          {!confirmRemove ? (
            <button onClick={() => setConfirmRemove(true)} title="Remover indicador"
              style={{ position:'absolute', top:-8, right:-8, zIndex:30, width:22, height:22, borderRadius:'50%', background:'#EF4444', border:'2px solid var(--surface)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 6px rgba(0,0,0,0.2)' }}>
              <X size={11} strokeWidth={3}/>
            </button>
          ) : (
            <div style={{ position:'absolute', top:-10, right:-10, zIndex:30, display:'flex', alignItems:'center', gap:4, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:'3px 6px 3px 10px', boxShadow:'0 4px 14px rgba(0,0,0,0.15)', animation:'fadeIn 0.15s ease' }}>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap' }}>Remover?</span>
              <button onClick={() => { onRemove(); setConfirmRemove(false) }}
                style={{ display:'flex', alignItems:'center', gap:3, padding:'3px 8px', background:'#EF4444', border:'none', borderRadius:12, fontSize:11, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                <Check size={10} strokeWidth={3}/> Sim
              </button>
              <button onClick={() => setConfirmRemove(false)}
                style={{ display:'flex', alignItems:'center', padding:'3px 6px', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', borderRadius:12 }}>
                <X size={11} strokeWidth={2.5}/>
              </button>
            </div>
          )}
        </>
      )}
      <div style={{ paddingTop:isCustomizing?40:0, height:'100%', position:'relative' }}>
        {children}
        {filterBadge && (
          <div style={{ position:'absolute', bottom:10, right:10, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', padding:'2px 6px', borderRadius:99, background:filterBadge.bg, color:filterBadge.color, border:`1px solid ${filterBadge.border}`, pointerEvents:'none' }}>
            {filterBadge.label}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section Row ──────────────────────────────────────────────────────────────
function SectionRow({ section, isCustomizing, onDeleteSection, onChangeLayout, onAddToSlot, onRemoveFromSlot, onOpenConfig, onUpdateMeta, catalog, analytics, globalFilters }) {
  const layout = SECTION_LAYOUTS[section.layout] || SECTION_LAYOUTS['1-1-1-1']
  const cols   = layout.cols
  const [showLayoutPicker, setShowLayoutPicker] = useState(false)
  const hasAnyWidget = section.slots.some(s => s.widgetId)

  if (!isCustomizing && !hasAnyWidget) return null

  return (
    <div style={{ position:'relative' }}>
      {/* Barra da seção (modo edição) */}
      {isCustomizing && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, position:'relative' }}>
          <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>Seção</span>
          <span style={{ fontSize:10, color:'var(--border)', margin:'0 2px' }}>·</span>

          {/* Layout picker inline */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowLayoutPicker(!showLayoutPicker)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 8px', background:showLayoutPicker?'var(--accent-glow)':'var(--surface2)', border:`1px solid ${showLayoutPicker?'var(--accent)':'var(--border2)'}`, borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:600, color:showLayoutPicker?'var(--accent)':'var(--text-muted)', fontFamily:'var(--font)' }}>
              <LayoutGrid size={11} strokeWidth={1.75}/> {layout.label}
              <ChevronDown size={10} strokeWidth={2} style={{ transform:showLayoutPicker?'rotate(180deg)':'none', transition:'transform 0.15s' }}/>
            </button>
            {showLayoutPicker && (
              <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:100, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', animation:'fadeIn 0.12s ease', display:'flex', flexWrap:'wrap', gap:8, minWidth:360 }}>
                {Object.entries(SECTION_LAYOUTS).map(([key, lay]) => (
                  <button key={key} onClick={() => { onChangeLayout(section.id, key); setShowLayoutPicker(false) }}
                    title={lay.label}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'8px 10px', background:'var(--surface2)', border:`1px solid ${key===section.layout?'var(--accent)':'var(--border2)'}`, borderRadius:7, cursor:'pointer', fontFamily:'var(--font)' }}>
                    <LayoutThumb cols={lay.cols} active={key===section.layout}/>
                    <span style={{ fontSize:9, color:key===section.layout?'var(--accent)':'var(--text-muted)', whiteSpace:'nowrap' }}>{lay.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { onDeleteSection(section.id); setShowLayoutPicker(false) }}
            style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, padding:'3px 8px', background:'none', border:'1px solid var(--border2)', borderRadius:6, fontSize:10, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)' }}>
            <X size={10} strokeWidth={2}/> Remover seção
          </button>
        </div>
      )}

      {/* Grid de slots */}
      <SortableContext items={section.slots.map(s => s.id)} strategy={rectSortingStrategy}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, alignItems:'start' }}>
          {section.slots.map((slot, slotIdx) => {
            const colSpan = cols[slotIdx] || 1
            if (!slot.widgetId) {
              if (!isCustomizing) return <div key={slot.id} style={{ gridColumn:`span ${colSpan}` }}/>
              return (
                <div key={slot.id} style={{ gridColumn:`span ${colSpan}` }}>
                  <EmptySlot slotId={slot.id} onAdd={() => onAddToSlot(slot.id)}/>
                </div>
              )
            }
            const widgetAnalytics = getSlotAnalytics(slot, analytics, globalFilters)
            const ignoring = slot.settings?.ignoreGlobalFilter
            const localP   = slot.settings?.localFilter?.period
            let filterBadge = null
            if (!isCustomizing && ignoring) {
              filterBadge = { label: localP ? FILTER_PERIODS.find(p=>p.id===localP)?.shortLabel : 'Sem filtro global', bg:'var(--surface2)', color:'var(--text-muted)', border:'var(--border2)' }
            } else if (!isCustomizing && localP) {
              filterBadge = { label: FILTER_PERIODS.find(p=>p.id===localP)?.shortLabel, bg:'var(--accent-glow)', color:'var(--accent)', border:'rgba(99,102,241,0.2)' }
            }
            return (
              <SortableSlot key={slot.id} slotId={slot.id} colSpan={colSpan}
                isCustomizing={isCustomizing}
                onOpenConfig={() => onOpenConfig(slot.id)}
                onRemove={() => onRemoveFromSlot(slot.id)}
                filterBadge={filterBadge}>
                <WidgetRenderer
                  widget={{ id:slot.widgetId, settings:slot.settings }}
                  analytics={widgetAnalytics}
                  isCustomizing={isCustomizing}
                  onUpdateMeta={(_, newMeta) => onUpdateMeta(slot.id, newMeta)}
                  catalog={catalog}
                />
              </SortableSlot>
            )
          })}
        </div>
      </SortableContext>
    </div>
  )
}

function SkeletonCard({ span=1 }) {
  return (
    <div style={{ gridColumn:`span ${span}`, height:130, background:'var(--surface2)', borderRadius:12, border:'1px solid var(--border2)', backgroundImage:'linear-gradient(90deg,var(--surface2) 0%,var(--surface) 50%,var(--surface2) 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.6s infinite' }}/>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { profile, loading:profileLoading } = useProfile()

  const isISV      = !profile || profile.role==='admin_isv' || profile.papel==='admin_isv' || profile.papel==='gestor_canais'
  const defaultSec = isISV ? DEFAULT_SECTIONS_ISV : DEFAULT_SECTIONS_FRANCHISE
  const catalog    = isISV ? WIDGET_CATALOG_ISV   : WIDGET_CATALOG_FRANCHISE
  const storageKey = `${SECTIONS_STORAGE_KEY}:${isISV?'isv':'fr'}`

  const [sections,       setSections]      = useLocalState(storageKey, defaultSec)
  const [globalFilters,  setGlobalFilters] = useLocalState(GLOBAL_FILTERS_KEY, { period:'this_month', franchise:'all' })

  const { analytics: liveAnalytics, alerts, loading: analyticsLoading, dismissAlert } = useDashboard(globalFilters.period)
  const [pendingSec,     setPendingSec]    = useState(null)
  const [editing,        setEditing]       = useState(false)
  const [configSlotId,   setConfigSlotId]  = useState(null)
  const [addingToSlotId, setAddingToSlotId]= useState(null)
  const [addSectionAt,   setAddSectionAt]  = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:6 } }))

  const currentSec = pendingSec || sections

  function startCustomize() { setPendingSec(JSON.parse(JSON.stringify(sections))); setEditing(true) }
  function saveLayout()     { setSections(pendingSec); setPendingSec(null); setEditing(false) }
  function cancelCustomize(){ setPendingSec(null); setEditing(false) }

  function handleDragEnd({ active, over }) {
    if (!over || active.id===over.id) return
    setPendingSec(prev => {
      const next = JSON.parse(JSON.stringify(prev || sections))
      let asi=-1, aii=-1, osi=-1, oii=-1
      next.forEach((sec,si) => sec.slots.forEach((sl,i) => {
        if (sl.id===active.id) { asi=si; aii=i }
        if (sl.id===over.id)   { osi=si; oii=i }
      }))
      if (asi===-1||osi===-1) return prev
      if (asi===osi) {
        next[asi].slots = arrayMove(next[asi].slots, aii, oii)
      } else {
        const a=next[asi].slots[aii], o=next[osi].slots[oii]
        ;[a.widgetId, o.widgetId] = [o.widgetId, a.widgetId]
        ;[a.settings, o.settings] = [o.settings, a.settings]
      }
      return next
    })
  }

  function handleAddSection(layout, insertAt) {
    const layoutDef = SECTION_LAYOUTS[layout]
    const newSec = {
      id: genId('sc'),
      layout,
      slots: layoutDef.cols.map((_, i) => ({ id: genId('sl')+i, widgetId:null, settings:{} })),
    }
    setPendingSec(prev => {
      const next = [...(prev||sections)]
      next.splice(insertAt, 0, newSec)
      return next
    })
    setAddSectionAt(null)
  }

  function handleDeleteSection(sectionId) {
    setPendingSec(prev => (prev||sections).filter(s => s.id !== sectionId))
  }

  function handleChangeLayout(sectionId, newLayout) {
    const layoutDef = SECTION_LAYOUTS[newLayout]
    setPendingSec(prev => (prev||sections).map(sec => {
      if (sec.id !== sectionId) return sec
      const newSlots = layoutDef.cols.map((_, i) => ({
        id:       sec.slots[i]?.id      || genId('sl')+i,
        widgetId: sec.slots[i]?.widgetId|| null,
        settings: sec.slots[i]?.settings|| {},
      }))
      return { ...sec, layout:newLayout, slots:newSlots }
    }))
  }

  function handleAddToSlot(slotId, catalogEntry) {
    setPendingSec(prev => {
      const next = JSON.parse(JSON.stringify(prev||sections))
      for (const sec of next) {
        const slot = sec.slots.find(s => s.id===slotId)
        if (slot) { slot.widgetId=catalogEntry.id; slot.settings={...catalogEntry.defaultSettings}; break }
      }
      return next
    })
    setAddingToSlotId(null)
  }

  function handleRemoveFromSlot(slotId) {
    setPendingSec(prev => {
      const next = JSON.parse(JSON.stringify(prev||sections))
      for (const sec of next) {
        const slot = sec.slots.find(s => s.id===slotId)
        if (slot) { slot.widgetId=null; slot.settings={}; break }
      }
      return next
    })
  }

  function handleUpdateMeta(slotId, newMeta) {
    const apply = secs => secs.map(sec => ({ ...sec, slots: sec.slots.map(sl =>
      sl.id===slotId ? { ...sl, settings:{ ...sl.settings, meta:newMeta } } : sl
    )}))
    setSections(apply)
    if (pendingSec) setPendingSec(apply)
  }

  function handleSaveSlotConfig(slotId, newSettings) {
    const apply = secs => secs.map(sec => ({ ...sec, slots: sec.slots.map(sl =>
      sl.id===slotId ? { ...sl, settings:newSettings } : sl
    )}))
    if (pendingSec) setPendingSec(apply); else setSections(apply)
    setConfigSlotId(null)
  }

  const baseData    = liveAnalytics || (isISV ? { cdu_receita:0, sms_receita:0, servicos_receita:0, franquias_ativas:0, oportunidades:0, projetos_ativos:0, contratos_ativos:0, taxa_conversao:0, ticket_medio:0, por_franquia:[], pipeline:[] } : { oportunidades:0, projetos_ativos:0, questionarios:0, cdu_receita:0, sms_receita:0, servicos_receita:0, taxa_conversao:0, ticket_medio:0, contratos_ativos:0, pipeline:[], atividades_recentes:[] })
  const configSlot  = configSlotId ? currentSec.flatMap(s => s.slots).find(sl => sl.id===configSlotId) : null
  const franchises  = isISV ? (baseData.por_franquia||[]).map(f => f.nome) : []
  const activeFilters = [globalFilters.period!=='this_month', globalFilters.franchise!=='all'].filter(Boolean).length
  const usedWidgetIds = currentSec.flatMap(s => s.slots.map(sl => sl.widgetId).filter(Boolean))
  const userName    = profile?.nome?.split(' ')[0] || 'usuário'
  const hour        = new Date().getHours()
  const greeting    = hour<12 ? 'Bom dia' : hour<18 ? 'Boa tarde' : 'Boa noite'
  const unresolved  = alerts.filter(a => !a.is_resolved)
  const nCritical   = unresolved.filter(a => a.severity==='critical').length

  return (
    <div style={s.page}>
      <style>{`
        @keyframes fadeIn      { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer     { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideInRight{ from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>

      {/* Cabeçalho */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
        <div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>
            {isISV?'Diretoria ISV':'Franquia'} · {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
          </div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', margin:0, lineHeight:1.25 }}>
            {greeting}, {profileLoading?'…':userName}.
            {nCritical>0 && <span style={{ fontSize:15, fontWeight:500, color:'#EF4444', marginLeft:10 }}>⚠ {nCritical} alerta{nCritical>1?'s':''} crítico{nCritical>1?'s':''}.</span>}
          </h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {editing ? (
            <>
              <button onClick={cancelCustomize} style={s.ghostBtn}><X size={14} strokeWidth={2}/> Cancelar</button>
              <button onClick={saveLayout}      style={s.accentBtn}><Check size={14} strokeWidth={2.5}/> Salvar layout</button>
            </>
          ) : (
            <button onClick={startCustomize} style={s.ghostBtn}><Settings2 size={14} strokeWidth={1.75}/> Customizar</button>
          )}
        </div>
      </div>

      {/* Barra de filtros globais (somente em modo normal) */}
      {!editing && (
        <GlobalFilterBar
          filters={globalFilters}
          onChange={setGlobalFilters}
          isISV={isISV}
          franchises={franchises}
          activeCount={activeFilters}
        />
      )}

      {/* Banner modo customização */}
      {editing && (
        <div style={{ background:'var(--accent-glow)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--accent)', animation:'fadeIn 0.2s ease' }}>
          <Layers size={14} strokeWidth={2}/>
          <span><strong>Layout do dashboard</strong> — Crie seções e defina os quadrantes. Clique <strong>+</strong> nos quadrantes vazios para inserir indicadores.</span>
        </div>
      )}

      {/* Alertas */}
      {unresolved.length>0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {unresolved.map(alert => <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert}/>)}
        </div>
      )}

      {/* Grid de seções */}
      {profileLoading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
          {[1,1,1,1,2,1,1,2,2].map((span,i) => <SkeletonCard key={i} span={span}/>)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {editing && (
              <AddSectionInserter
                isOpen={addSectionAt===0}
                onOpen={() => setAddSectionAt(0)}
                onClose={() => setAddSectionAt(null)}
                onAdd={layout => handleAddSection(layout, 0)}
              />
            )}

            {currentSec.map((section, secIdx) => (
              <Fragment key={section.id}>
                <SectionRow
                  section={section}
                  isCustomizing={editing}
                  onDeleteSection={handleDeleteSection}
                  onChangeLayout={handleChangeLayout}
                  onAddToSlot={setAddingToSlotId}
                  onRemoveFromSlot={handleRemoveFromSlot}
                  onOpenConfig={setConfigSlotId}
                  onUpdateMeta={handleUpdateMeta}
                  catalog={catalog}
                  analytics={baseData}
                  globalFilters={globalFilters}
                />
                {editing && (
                  <AddSectionInserter
                    isOpen={addSectionAt===secIdx+1}
                    onOpen={() => setAddSectionAt(secIdx+1)}
                    onClose={() => setAddSectionAt(null)}
                    onAdd={layout => handleAddSection(layout, secIdx+1)}
                  />
                )}
              </Fragment>
            ))}

            {editing && currentSec.length===0 && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'60px 20px', border:'2px dashed var(--border2)', borderRadius:14, color:'var(--text-muted)', textAlign:'center' }}>
                <LayoutGrid size={36} strokeWidth={1} style={{ opacity:0.3 }}/>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-soft)', marginBottom:6 }}>Dashboard vazio</div>
                  <div style={{ fontSize:13 }}>Use "Adicionar seção" acima para começar a organizar os indicadores.</div>
                </div>
              </div>
            )}
          </div>
        </DndContext>
      )}

      {/* Modais */}
      {configSlot && (
        <WidgetConfigModal
          slot={configSlot}
          catalog={catalog}
          onSave={ns => handleSaveSlotConfig(configSlotId, ns)}
          onClose={() => setConfigSlotId(null)}
        />
      )}
      {addingToSlotId && (
        <CatalogPickerPanel
          catalog={catalog}
          usedWidgetIds={usedWidgetIds}
          analytics={baseData}
          onPick={entry => handleAddToSlot(addingToSlotId, entry)}
          onClose={() => setAddingToSlotId(null)}
        />
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  page:       { display:'flex', flexDirection:'column', gap:20, padding:'28px', flex:1, minHeight:0, overflowY:'auto' },
  card:       { background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, padding:'18px 20px', boxShadow:'var(--shadow)' },
  wTitle:     { fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)' },
  overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(3px)' },
  modal:      { background:'var(--surface)', borderRadius:14, width:'100%', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.25)', overflow:'hidden', animation:'fadeIn 0.2s ease' },
  mHeader:    { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  mTitle:     { fontSize:16, fontWeight:800, color:'var(--text)', letterSpacing:'-0.2px' },
  mSub:       { fontSize:12, color:'var(--text-muted)', marginTop:3 },
  closeBtn:   { background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px 8px', borderRadius:6, display:'flex', alignItems:'center' },
  fieldGroup: { display:'flex', flexDirection:'column', gap:6 },
  fieldLabel: { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' },
  input:      { padding:'7px 10px', fontSize:13, borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' },
  ghostBtn:   { display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, color:'var(--text-soft)', fontFamily:'var(--font)', cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' },
  accentBtn:  { display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'var(--accent)', border:'none', borderRadius:8, fontSize:13, color:'#fff', fontFamily:'var(--font)', cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' },
}
