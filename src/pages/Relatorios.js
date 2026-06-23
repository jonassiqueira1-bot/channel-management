import { useState, useMemo } from 'react'
import { BarChart2, Plus, ChevronLeft, Trash2, Download, Save } from 'lucide-react'
import {
  buildDataSources, COMPONENT_TYPES, PRESET_CORES,
  RELATORIOS_STORAGE_KEY, PRESET_RELATORIOS,
} from '../data/mockRelatorios'
import { useLocalState } from '../hooks/useLocalState'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function joinSources(regsLeft, campoLeft, regsRight, campoRight) {
  return regsLeft.map(row => {
    const match = regsRight.find(r => String(r[campoRight] ?? '') === String(row[campoLeft] ?? ''))
    return match ? { ...match, ...row } : row
  })
}
function campoEmpresa(fields) {
  return fields.find(f => /^(empresa|company)/i.test(f.key))?.key || null
}
function agrupar(registros, campoX, metrica, campoY) {
  const map = {}
  registros.forEach(r => {
    const chave = r[campoX] ?? '(vazio)'
    if (!map[chave]) map[chave] = []
    map[chave].push(r)
  })
  return Object.entries(map).map(([label, rows]) => {
    let valor = 0
    if (metrica === 'COUNT') valor = rows.length
    else if (metrica === 'SUM' && campoY) valor = rows.reduce((s, r) => s + (Number(r[campoY]) || 0), 0)
    else if (metrica === 'AVG' && campoY) valor = rows.length ? rows.reduce((s, r) => s + (Number(r[campoY]) || 0), 0) / rows.length : 0
    else if (metrica === 'MAX' && campoY) valor = Math.max(...rows.map(r => Number(r[campoY]) || 0))
    else if (metrica === 'MIN' && campoY) valor = Math.min(...rows.map(r => Number(r[campoY]) || 0))
    return { label, valor: Math.round(valor * 100) / 100 }
  }).sort((a, b) => b.valor - a.valor)
}
function avaliarFormula(formula, registros) {
  if (!formula?.trim()) return null
  try {
    let expr = formula
      .replace(/COUNT\(\*\)/gi, registros.length)
      .replace(/SUM\((\w+)\)/gi, (_, f) => registros.reduce((s, r) => s + (Number(r[f]) || 0), 0))
      .replace(/AVG\((\w+)\)/gi, (_, f) => registros.length ? registros.reduce((s, r) => s + (Number(r[f]) || 0), 0) / registros.length : 0)
      .replace(/MAX\((\w+)\)/gi, (_, f) => Math.max(...registros.map(r => Number(r[f]) || 0)))
      .replace(/MIN\((\w+)\)/gi, (_, f) => Math.min(...registros.map(r => Number(r[f]) || 0)))
    // eslint-disable-next-line no-new-func
    const resultado = new Function('return ' + expr)()
    return typeof resultado === 'number' ? Math.round(resultado * 100) / 100 : null
  } catch { return null }
}
function fmtNum(v) {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`
  return String(Math.round(v * 10) / 10)
}
function fmtDate(s) {
  if (!s) return ''
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Gráficos SVG ─────────────────────────────────────────────────────────────
function Empty() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:120, color:'var(--text-muted)', fontSize:13 }}>
      Configure a fonte e os campos para visualizar
    </div>
  )
}
function BarChart({ dados, cor, altura = 220, onDrill, drillLabel }) {
  const [hover, setHover] = useState(null)
  if (!dados?.length) return <Empty />
  const maxVal = Math.max(...dados.map(d => d.valor), 1)
  const W = 520, H = altura, PAD = { top:30, right:16, bottom:64, left:52 }
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom
  const barW = Math.min(48, (plotW / dados.length) * 0.65)
  const gap  = plotW / dados.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:altura }}>
      {Array.from({ length: 5 }, (_, i) => {
        const y = PAD.top + (plotH / 4) * i
        const val = maxVal * (1 - i / 4)
        return <g key={i}>
          <line x1={PAD.left} y1={y} x2={W-PAD.right} y2={y} stroke="var(--border)" strokeWidth="1"/>
          <text x={PAD.left-6} y={y+4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{fmtNum(val)}</text>
        </g>
      })}
      {dados.map((d, i) => {
        const barH = (d.valor / maxVal) * plotH
        const x = PAD.left + gap * i + gap / 2 - barW / 2
        const y = PAD.top + plotH - barH
        const isHover = hover === i, isDrilled = drillLabel === d.label
        return (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            onClick={() => onDrill?.(d.label)} style={{ cursor: onDrill ? 'pointer' : 'default' }}>
            <rect x={x} y={y} width={barW} height={barH} fill={cor}
              opacity={isDrilled ? 1 : isHover ? 0.95 : 0.82} rx="3" />
            <text x={x+barW/2} y={y-6} textAnchor="middle" fontSize="10" fill="var(--text-soft)"
              fontWeight={isHover||isDrilled?'700':'400'}>{fmtNum(d.valor)}</text>
            <text x={x+barW/2} y={PAD.top+plotH+14} textAnchor="end" fontSize="10"
              fill={isDrilled?cor:'var(--text-muted)'} fontWeight={isDrilled?'700':'400'}
              transform={`rotate(-35,${x+barW/2},${PAD.top+plotH+14})`}>
              {String(d.label).slice(0,18)}
            </text>
            {isHover && (
              <g>
                <rect x={x+barW/2-52} y={y-34} width={104} height={22} rx="4"
                  fill="var(--surface)" stroke="var(--border)"/>
                <text x={x+barW/2} y={y-19} textAnchor="middle" fontSize="11"
                  fill="var(--text)" fontWeight="600">{fmtNum(d.valor)}</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
function PieChart({ dados, onDrill, drillLabel }) {
  const [hover, setHover] = useState(null)
  if (!dados?.length) return <Empty />
  const total = dados.reduce((s, d) => s + d.valor, 0) || 1
  const CX = 100, CY = 100, R = 80
  let angulo = -Math.PI / 2
  const fatias = dados.map((d, i) => {
    const frac = d.valor / total, ini = angulo
    angulo += frac * 2 * Math.PI
    return { ...d, frac, ini, fim: angulo,
      x1: CX+R*Math.cos(ini), y1: CY+R*Math.sin(ini),
      x2: CX+R*Math.cos(angulo), y2: CY+R*Math.sin(angulo),
      large: frac > 0.5 ? 1 : 0, cor: PRESET_CORES[i % PRESET_CORES.length] }
  })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:24 }}>
      <svg viewBox="0 0 200 200" style={{ width:180, height:180, flexShrink:0 }}>
        {fatias.map((f, i) => (
          <path key={i}
            d={`M${CX},${CY} L${f.x1},${f.y1} A${R},${R} 0 ${f.large},1 ${f.x2},${f.y2} Z`}
            fill={f.cor} opacity={drillLabel===f.label ? 1 : hover===i ? 1 : 0.82}
            stroke={drillLabel===f.label?'#fff':'var(--surface)'}
            strokeWidth={drillLabel===f.label?3:2}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            onClick={() => onDrill?.(f.label)}
            style={{ cursor:onDrill?'pointer':'default', transition:'opacity 0.15s' }} />
        ))}
        {hover !== null && (
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
            fontSize="14" fontWeight="700" fill="var(--text)">
            {Math.round(fatias[hover].frac * 100)}%
          </text>
        )}
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {fatias.map((f, i) => (
          <div key={i} onClick={() => onDrill?.(f.label)}
            style={{ display:'flex', alignItems:'center', gap:8,
              opacity:hover!==null&&hover!==i?0.4:1, transition:'opacity 0.15s',
              cursor:onDrill?'pointer':'default', fontWeight:drillLabel===f.label?700:400 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:f.cor, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'var(--text-soft)', overflow:'hidden',
              textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:120 }}>{f.label}</span>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', marginLeft:'auto' }}>
              {fmtNum(f.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
function LineChart({ dados, cor, altura = 220 }) {
  if (!dados?.length) return <Empty />
  const W = 520, H = altura, PAD = { top:24, right:16, bottom:40, left:52 }
  const plotW = W-PAD.left-PAD.right, plotH = H-PAD.top-PAD.bottom
  const maxVal = Math.max(...dados.map(d => d.valor), 1)
  const pts = dados.map((d, i) => ({
    x: PAD.left + (i / Math.max(dados.length-1, 1)) * plotW,
    y: PAD.top + plotH - (d.valor / maxVal) * plotH, ...d,
  }))
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M${pts[0].x},${PAD.top+plotH} `+pts.map(p=>`L${p.x},${p.y}`).join(' ')+` L${pts[pts.length-1].x},${PAD.top+plotH} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:altura }}>
      {[0,1,2,3,4].map(i => <line key={i} x1={PAD.left} y1={PAD.top+(plotH/4)*i} x2={W-PAD.right} y2={PAD.top+(plotH/4)*i} stroke="var(--border)" strokeWidth="1"/>)}
      <path d={area} fill={cor} opacity="0.12"/>
      <polyline points={polyline} fill="none" stroke={cor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={cor}/>
          <text x={p.x} y={PAD.top+plotH+14} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
            {String(p.label).slice(0,10)}
          </text>
        </g>
      ))}
    </svg>
  )
}
function KpiCard({ titulo, valor, subtitulo, cor }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'32px 16px', height:'100%', gap:8 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
        letterSpacing:'0.07em', textAlign:'center' }}>{titulo}</div>
      <div style={{ fontSize:48, fontWeight:800, color:cor||'var(--accent)',
        fontFamily:'var(--mono)', lineHeight:1, textAlign:'center' }}>{fmtNum(valor)}</div>
      {subtitulo && <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>{subtitulo}</div>}
    </div>
  )
}
function DataTable({ registros, campos }) {
  if (!registros?.length || !campos?.length) return <Empty />
  return (
    <div style={{ overflowX:'auto', maxHeight:260 }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ position:'sticky', top:0, background:'var(--surface2)' }}>
            {campos.map(c => (
              <th key={c.key} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700,
                color:'var(--text-muted)', fontSize:11, textTransform:'uppercase',
                letterSpacing:'0.05em', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registros.map((row, i) => (
            <tr key={i} style={{ background:i%2===0?'transparent':'var(--surface2)' }}>
              {campos.map(c => (
                <td key={c.key} style={{ padding:'7px 12px', color:'var(--text-soft)',
                  borderBottom:'1px solid var(--border2)', whiteSpace:'nowrap' }}>
                  {c.type === 'number' ? fmtNum(row[c.key]) : String(row[c.key]??'—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── renderWidget ──────────────────────────────────────────────────────────────
function renderWidget(w, source, sources, { filtrosGlobais={}, onDrill, drillState } = {}) {
  let regs = source?.registros || []
  if (w.joinSourceId && w.joinLeft && w.joinRight) {
    const joinSrc = sources.find(s => s.id === w.joinSourceId)
    if (joinSrc) regs = joinSources(regs, w.joinLeft, joinSrc.registros, w.joinRight)
  }
  if (filtrosGlobais.empresa) {
    const cf = campoEmpresa(source?.fields || [])
    if (cf) regs = regs.filter(r => String(r[cf]||'').toLowerCase().includes(filtrosGlobais.empresa.toLowerCase()))
  }
  if (filtrosGlobais.periodo && filtrosGlobais.periodo !== 'todos') {
    const agora = new Date(), limite = new Date()
    if (filtrosGlobais.periodo === 'este_mes') limite.setDate(1)
    else if (filtrosGlobais.periodo === 'ultimos_3m') limite.setMonth(agora.getMonth()-3)
    else if (filtrosGlobais.periodo === 'este_ano') limite.setMonth(0,1)
    const cf = (source?.fields||[]).find(f => f.key==='created_at')?.key
    if (cf) regs = regs.filter(r => r[cf] && new Date(r[cf]) >= limite)
  }
  ;(w.filtros||[]).forEach(f => {
    if (f.campo && f.valor) regs = regs.filter(r => String(r[f.campo]||'').toLowerCase().includes(f.valor.toLowerCase()))
  })
  const cor = w.cor || source?.color || 'var(--accent)'
  if (w.tipo === 'kpi' && w.formula) {
    const res = avaliarFormula(w.formula, regs)
    return <KpiCard titulo={w.titulo||'KPI'} valor={res} cor={cor} subtitulo={w.formula}/>
  }
  if (w.tipo === 'kpi') {
    const val = w.metrica==='COUNT' ? regs.length
      : w.metrica==='SUM'&&w.campoY ? regs.reduce((s,r)=>s+(Number(r[w.campoY])||0),0)
      : w.metrica==='AVG'&&w.campoY ? (regs.length?regs.reduce((s,r)=>s+(Number(r[w.campoY])||0),0)/regs.length:0)
      : regs.length
    return <KpiCard titulo={w.titulo||'KPI'} valor={val} cor={cor}
      subtitulo={`${w.metrica}${w.campoY?`(${w.campoY})`:'(*)'} · ${regs.length} registros`}/>
  }
  if (w.tipo === 'table') {
    let linhas = regs
    if (drillState && drillState.sourceId===w.sourceId && drillState.campo)
      linhas = regs.filter(r => String(r[drillState.campo]??'').toLowerCase()===String(drillState.valor).toLowerCase())
    const campos = w.camposTabela?.length
      ? (source?.fields||[]).filter(f => w.camposTabela.includes(f.key))
      : (source?.fields||[]).slice(0,4)
    return <DataTable registros={linhas} campos={campos}/>
  }
  if (!w.campoX) return <Empty/>
  const dados = agrupar(regs, w.campoX, w.metrica||'COUNT', w.campoY)
  const drillLabel = drillState?.sourceId===w.sourceId ? drillState?.valor : null
  const handleDrill = onDrill ? (label) => onDrill({ sourceId:w.sourceId, campo:w.campoX, valor:label, registros:regs }) : null
  if (w.tipo==='pie')  return <PieChart dados={dados} onDrill={handleDrill} drillLabel={drillLabel}/>
  if (w.tipo==='line') return <LineChart dados={dados} cor={cor}/>
  return <BarChart dados={dados} cor={cor} onDrill={handleDrill} drillLabel={drillLabel}/>
}

// ─── Widget Wrapper ────────────────────────────────────────────────────────────
function Widget({ w, selecionado, onSelect, onDelete, children }) {
  return (
    <div onClick={() => onSelect(w.id)}
      style={{ gridColumn:`span ${w.colSpan||6}`, background:'var(--surface)',
        border:`1.5px solid ${selecionado?'var(--accent)':'var(--border)'}`,
        borderRadius:12, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:240,
        boxShadow:selecionado?'0 0 0 3px var(--accent)22':'none',
        transition:'border-color 0.15s, box-shadow 0.15s', cursor:'pointer' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
        borderBottom:'1px solid var(--border2)', background:'var(--surface2)', flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-soft)', flex:1,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {w.titulo||'Sem título'}
        </span>
        {[3,6,9,12].map(s => (
          <button key={s} onClick={e => { e.stopPropagation(); onSelect(w.id,{colSpan:s}) }}
            style={{ fontSize:9, padding:'2px 5px', borderRadius:3,
              border:w.colSpan===s?'none':'1px solid var(--border)',
              background:w.colSpan===s?'var(--accent)':'none',
              color:w.colSpan===s?'#fff':'var(--text-muted)', cursor:'pointer', lineHeight:1 }}>
            {s/3}
          </button>
        ))}
        <button onClick={e => { e.stopPropagation(); onDelete(w.id) }}
          style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, padding:'2px 4px', lineHeight:1 }}
          onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>✕</button>
      </div>
      <div style={{ flex:1, padding:16, overflow:'hidden' }}>{children}</div>
    </div>
  )
}

// ─── DrillPanel ────────────────────────────────────────────────────────────────
function DrillPanel({ drill, sources, onClose }) {
  const { sourceId, campo, valor, registros } = drill
  const src = sources.find(s => s.id === sourceId)
  if (!src) return null
  const linhas = registros.filter(r => String(r[campo]??'').toLowerCase() === String(valor).toLowerCase())
  return (
    <div style={{ position:'absolute', bottom:0, left:260, right:0,
      background:'var(--surface)', borderTop:'2px solid var(--accent)',
      boxShadow:'0 -4px 24px #0002', zIndex:50, display:'flex', flexDirection:'column', maxHeight:260 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px',
        borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Detalhe:</span>
        <span style={{ fontSize:13, color:'var(--text-soft)' }}>{src.icon} {src.label}</span>
        <span style={{ fontSize:12, padding:'2px 10px', background:'var(--accent)18',
          color:'var(--accent)', borderRadius:20, fontWeight:700, border:'1px solid var(--accent)44' }}>
          {campo} = {valor}
        </span>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>{linhas.length} registro{linhas.length!==1?'s':''}</span>
        <div style={{ flex:1 }}/>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:16, padding:'2px 6px' }}>✕</button>
      </div>
      <div style={{ overflowX:'auto', overflowY:'auto', flex:1 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ position:'sticky', top:0, background:'var(--surface2)' }}>
              {src.fields.map(c => (
                <th key={c.key} style={{ padding:'7px 14px', textAlign:'left', fontWeight:700,
                  color:'var(--text-muted)', fontSize:11, textTransform:'uppercase',
                  letterSpacing:'0.05em', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((row, i) => (
              <tr key={i} style={{ background:i%2===0?'transparent':'var(--surface2)' }}>
                {src.fields.map(c => (
                  <td key={c.key} style={{ padding:'6px 14px', color:'var(--text-soft)',
                    borderBottom:'1px solid var(--border2)', whiteSpace:'nowrap' }}>
                    {c.type==='number'?fmtNum(row[c.key]):String(row[c.key]??'—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── ConfigPanel ───────────────────────────────────────────────────────────────
const cfgLabel = { fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block' }
const cfgSelect = { width:'100%', padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:12, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box', marginTop:4 }

function ConfigPanel({ widget, source, sources, onUpdate, onClose }) {
  const campos = source?.fields || []
  const numCampos = campos.filter(f => f.type === 'number')
  return (
    <div style={{ width:280, flexShrink:0, background:'var(--surface)',
      borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', overflowY:'auto' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Configurar visual</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:16, padding:'2px 4px' }}>✕</button>
      </div>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
        {/* Tipo */}
        <div>
          <label style={cfgLabel}>Tipo de visual</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4, marginTop:6 }}>
            {COMPONENT_TYPES.map(t => (
              <button key={t.id} onClick={() => onUpdate({ tipo:t.id })} title={t.label}
                style={{ padding:'6px 2px', fontSize:18,
                  border:`1.5px solid ${widget.tipo===t.id?'var(--accent)':'var(--border)'}`,
                  borderRadius:7, background:widget.tipo===t.id?'var(--accent)11':'none', cursor:'pointer', textAlign:'center' }}>
                {t.icon}
              </button>
            ))}
          </div>
        </div>
        {/* Fonte */}
        <div>
          <label style={cfgLabel}>Fonte de dados</label>
          <select style={cfgSelect} value={widget.sourceId||''}
            onChange={e => onUpdate({ sourceId:e.target.value, campoX:'', campoY:'' })}>
            <option value="">— selecionar —</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label} ({s.registros.length} registros)</option>)}
          </select>
        </div>
        {/* Join */}
        <div>
          <label style={cfgLabel}>Cruzar com (Join)</label>
          <select style={cfgSelect} value={widget.joinSourceId||''}
            onChange={e => onUpdate({ joinSourceId:e.target.value, joinLeft:'', joinRight:'' })}>
            <option value="">— sem join —</option>
            {sources.filter(s => s.id !== widget.sourceId).map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
          </select>
          {widget.joinSourceId && (() => {
            const joinSrc = sources.find(s => s.id === widget.joinSourceId)
            return (
              <div style={{ display:'flex', gap:6, marginTop:6, alignItems:'center' }}>
                <select style={{ ...cfgSelect, flex:1, marginTop:0 }} value={widget.joinLeft||''}
                  onChange={e => onUpdate({ joinLeft:e.target.value })}>
                  <option value="">campo ←</option>
                  {campos.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <span style={{ color:'var(--text-muted)', fontSize:12, flexShrink:0 }}>=</span>
                <select style={{ ...cfgSelect, flex:1, marginTop:0 }} value={widget.joinRight||''}
                  onChange={e => onUpdate({ joinRight:e.target.value })}>
                  <option value="">campo →</option>
                  {(joinSrc?.fields||[]).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
            )
          })()}
        </div>
        {/* Dimensão */}
        {widget.tipo !== 'kpi' && widget.tipo !== 'table' && (
          <div>
            <label style={cfgLabel}>Dimensão (agrupar por)</label>
            <select style={cfgSelect} value={widget.campoX||''} onChange={e => onUpdate({ campoX:e.target.value })}>
              <option value="">— selecionar campo —</option>
              {campos.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
        )}
        {/* Campos tabela */}
        {widget.tipo === 'table' && (
          <div>
            <label style={cfgLabel}>Campos visíveis</label>
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}>
              {campos.map(f => {
                const sel = (widget.camposTabela||[]).includes(f.key)
                return (
                  <label key={f.key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text-soft)', cursor:'pointer' }}>
                    <input type="checkbox" checked={sel} onChange={() => {
                      const cur = widget.camposTabela||[]
                      onUpdate({ camposTabela: sel ? cur.filter(k=>k!==f.key) : [...cur, f.key] })
                    }}/>
                    {f.label}
                  </label>
                )
              })}
            </div>
          </div>
        )}
        {/* Métrica */}
        {widget.tipo !== 'table' && (
          <div>
            <label style={cfgLabel}>Métrica</label>
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              <select style={{ ...cfgSelect, flex:'0 0 90px' }} value={widget.metrica||'COUNT'}
                onChange={e => onUpdate({ metrica:e.target.value })}>
                {['COUNT','SUM','AVG','MAX','MIN'].map(m => <option key={m}>{m}</option>)}
              </select>
              {widget.metrica !== 'COUNT' && (
                <select style={{ ...cfgSelect, flex:1 }} value={widget.campoY||''} onChange={e => onUpdate({ campoY:e.target.value })}>
                  <option value="">— campo —</option>
                  {numCampos.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              )}
            </div>
          </div>
        )}
        {/* Fórmula */}
        <div>
          <label style={cfgLabel}>Fórmula personalizada</label>
          <input style={{ ...cfgSelect, fontFamily:'var(--mono)', fontSize:12 }}
            placeholder="SUM(campo) / COUNT(*)"
            value={widget.formula||''} onChange={e => onUpdate({ formula:e.target.value })}/>
          {widget.formula && source && (() => {
            const res = avaliarFormula(widget.formula, source.registros)
            return <div style={{ marginTop:6, fontSize:12, color:res!==null?'var(--accent)':'#EF4444', fontFamily:'var(--mono)', fontWeight:600 }}>
              {res!==null ? `= ${fmtNum(res)}` : '⚠ Fórmula inválida'}
            </div>
          })()}
        </div>
        {/* Cor */}
        <div>
          <label style={cfgLabel}>Cor</label>
          <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
            {PRESET_CORES.map(c => (
              <button key={c} onClick={() => onUpdate({ cor:c })}
                style={{ width:24, height:24, borderRadius:6, background:c,
                  border:`2.5px solid ${widget.cor===c?'var(--text)':'transparent'}`, cursor:'pointer' }}/>
            ))}
          </div>
        </div>
        {/* Título */}
        <div>
          <label style={cfgLabel}>Título</label>
          <input style={cfgSelect} value={widget.titulo||''} placeholder="Título do visual"
            onChange={e => onUpdate({ titulo:e.target.value })}/>
        </div>
        {/* Filtros */}
        <div>
          <label style={cfgLabel}>Filtros</label>
          {(widget.filtros||[]).map((f, i) => (
            <div key={i} style={{ display:'flex', gap:4, marginTop:4 }}>
              <select style={{ ...cfgSelect, flex:1 }} value={f.campo||''}
                onChange={e => { const fs=[...(widget.filtros||[])]; fs[i]={...f,campo:e.target.value}; onUpdate({filtros:fs}) }}>
                <option value="">campo</option>
                {campos.map(fc => <option key={fc.key} value={fc.key}>{fc.label}</option>)}
              </select>
              <input style={{ ...cfgSelect, flex:1 }} placeholder="valor" value={f.valor||''}
                onChange={e => { const fs=[...(widget.filtros||[])]; fs[i]={...f,valor:e.target.value}; onUpdate({filtros:fs}) }}/>
              <button onClick={() => onUpdate({ filtros:(widget.filtros||[]).filter((_,j)=>j!==i) })}
                style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14 }}>✕</button>
            </div>
          ))}
          <button onClick={() => onUpdate({ filtros:[...(widget.filtros||[]),{campo:'',valor:''}] })}
            style={{ marginTop:6, fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'var(--font)' }}>
            + Adicionar filtro
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Browse View ───────────────────────────────────────────────────────────────
function BrowseView({ relatorios, onOpen, onNew, onDelete, onFromTemplate }) {
  const [tab, setTab] = useState('meus') // 'meus' | 'templates'
  const tabStyle = (id) => ({
    padding:'9px 18px', border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
    fontFamily:'var(--font)', background:'none',
    color: tab===id ? 'var(--accent)' : 'var(--text-muted)',
    borderBottom: tab===id ? '2px solid var(--accent)' : '2px solid transparent',
  })
  return (
    <div style={{ padding:'32px 36px', maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:'var(--accent-glow)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <BarChart2 size={22} style={{ color:'var(--accent)' }}/>
        </div>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>Relatórios</div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>Analise dados em tempo real de todos os módulos do sistema</div>
        </div>
        <div style={{ flex:1 }}/>
        <button onClick={onNew}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px',
            background:'var(--accent)', color:'#fff', border:'none', borderRadius:9,
            fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
          <Plus size={15}/> Novo relatório
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:24 }}>
        <button style={tabStyle('meus')} onClick={() => setTab('meus')}>Meus relatórios ({relatorios.length})</button>
        <button style={tabStyle('templates')} onClick={() => setTab('templates')}>Templates</button>
      </div>

      {/* Grid — Meus */}
      {tab === 'meus' && (
        relatorios.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:16, padding:'64px 0', color:'var(--text-muted)' }}>
            <BarChart2 size={40} style={{ opacity:.3 }}/>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--text-soft)' }}>Nenhum relatório salvo ainda</div>
            <div style={{ fontSize:13 }}>Crie um novo relatório ou comece por um template abaixo</div>
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <button onClick={onNew}
                style={{ padding:'9px 20px', background:'var(--accent)', color:'#fff', border:'none',
                  borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                Criar relatório
              </button>
              <button onClick={() => setTab('templates')}
                style={{ padding:'9px 20px', background:'none', border:'1px solid var(--border)', color:'var(--text-soft)',
                  borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
                Ver templates
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
            {relatorios.map(r => (
              <div key={r.id} onClick={() => onOpen(r)}
                style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12,
                  padding:'18px 20px', cursor:'pointer', transition:'border-color .15s, box-shadow .15s',
                  display:'flex', flexDirection:'column', gap:10 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.boxShadow='0 0 0 2px var(--accent)22' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'var(--accent-glow)',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <BarChart2 size={18} style={{ color:'var(--accent)' }}/>
                  </div>
                  <button onClick={e => { e.stopPropagation(); onDelete(r.id) }}
                    style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px', borderRadius:6 }}
                    onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                    <Trash2 size={14}/>
                  </button>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{r.nome}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                    {r.widgets?.length||0} visual{r.widgets?.length!==1?'is':''} · Atualizado {fmtDate(r.updated_at)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[...new Set((r.widgets||[]).map(w => w.sourceId).filter(Boolean))].slice(0,4).map(sid => {
                    const colors = { oportunidades:'#6366F1', projetos:'#F59E0B', contratos:'#3B82F6',
                      pagamentos:'#10B981', comissoes:'#EC4899', empresas:'#F59E0B', cs_health:'#10B981' }
                    return <span key={sid} style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                      background:`${colors[sid]||'#6366F1'}18`, color:colors[sid]||'#6366F1',
                      border:`1px solid ${colors[sid]||'#6366F1'}33` }}>
                      {sid}
                    </span>
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Grid — Templates */}
      {tab === 'templates' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
          {PRESET_RELATORIOS.map(t => (
            <div key={t.id}
              style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12,
                padding:'18px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:32 }}>{t.icone}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{t.nome}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>{t.descricao}</div>
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                {t.widgets.length} visuais · Dados em tempo real
              </div>
              <button onClick={() => onFromTemplate(t)}
                style={{ marginTop:4, padding:'8px 0', background:'var(--accent)', color:'#fff', border:'none',
                  borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                Usar template
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Editor View ───────────────────────────────────────────────────────────────
function EditorView({ relatorio, onSave, onBack }) {
  const sources = useMemo(() => buildDataSources(), [])

  const [nomeRelatorio, setNomeRelatorio] = useState(relatorio.nome || 'Novo relatório')
  const [editandoNome,  setEditandoNome]  = useState(false)
  const [widgets,       setWidgets]       = useState(relatorio.widgets || [])
  const [selecionadoId, setSelecionadoId] = useState(null)
  const [abaLateral,    setAbaLateral]    = useState('fontes')
  const [expandidos,    setExpandidos]    = useState({})
  const [filtrosGlobais, setFiltrosGlobais] = useState({ empresa:'', periodo:'todos' })
  const [drillState,    setDrillState]    = useState(null)
  const [saved,         setSaved]         = useState(false)

  const selecionado = widgets.find(w => w.id === selecionadoId) || null
  const sourceAtual = selecionado ? sources.find(s => s.id === selecionado.sourceId) : null

  const empresasDisponiveis = useMemo(() => Array.from(new Set(
    widgets.flatMap(w => {
      const src = sources.find(s => s.id === w.sourceId)
      if (!src) return []
      const cf = campoEmpresa(src.fields)
      return cf ? src.registros.map(r => r[cf]).filter(Boolean) : []
    })
  )).sort(), [widgets, sources])

  function addWidget(tipo) {
    const novo = {
      id:`w-${Date.now()}`, tipo, colSpan:6,
      titulo: COMPONENT_TYPES.find(c=>c.id===tipo)?.label||'Visual',
      sourceId:'', campoX:'', campoY:'', metrica:'COUNT',
      formula:'', cor:PRESET_CORES[widgets.length%PRESET_CORES.length],
      filtros:[], camposTabela:[],
    }
    setWidgets(prev => [...prev, novo])
    setSelecionadoId(novo.id)
  }
  function updateWidget(id, patch) { setWidgets(prev => prev.map(w => w.id===id ? {...w,...patch} : w)) }
  function deleteWidget(id) { setWidgets(prev => prev.filter(w => w.id!==id)); if (selecionadoId===id) setSelecionadoId(null) }

  function handleSave() {
    const hoje = new Date().toISOString()
    onSave({ ...relatorio, nome:nomeRelatorio, widgets, updated_at:hoje, created_at:relatorio.created_at||hoje })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function exportarCSV() {
    if (!selecionado) return
    const src = sources.find(s => s.id === selecionado.sourceId)
    if (!src) return
    const campos = src.fields
    const header = campos.map(f => f.label).join(',')
    const linhas = src.registros.map(r => campos.map(f => r[f.key]??'').join(','))
    const csv = [header,...linhas].join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`${nomeRelatorio}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--surface2)', fontFamily:'var(--font)' }}>

      {/* Painel esquerdo */}
      <div style={{ width:260, flexShrink:0, background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          {[{id:'fontes',label:'Dados'},{id:'componentes',label:'Componentes'}].map(t => (
            <button key={t.id} onClick={() => setAbaLateral(t.id)}
              style={{ flex:1, padding:'11px 0', border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
                fontFamily:'var(--font)',
                background:abaLateral===t.id?'var(--surface)':'var(--surface2)',
                color:abaLateral===t.id?'var(--accent)':'var(--text-muted)',
                borderBottom:abaLateral===t.id?'2px solid var(--accent)':'2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'12px 10px' }}>
          {abaLateral === 'fontes' && sources.map(src => {
            const aberto = expandidos[src.id]
            return (
              <div key={src.id} style={{ marginBottom:4 }}>
                <button onClick={() => setExpandidos(e => ({...e,[src.id]:!e[src.id]}))}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                    background:aberto?'var(--surface2)':'none', border:'none', borderRadius:7,
                    cursor:'pointer', fontFamily:'var(--font)', textAlign:'left' }}>
                  <span>{src.icon}</span>
                  <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text-soft)' }}>{src.label}</span>
                  <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{src.registros.length}</span>
                  <span style={{ fontSize:10, color:'var(--text-muted)', transform:aberto?'rotate(90deg)':'none', transition:'transform 0.15s', display:'inline-block' }}>›</span>
                </button>
                {aberto && (
                  <div style={{ paddingLeft:28, paddingBottom:4 }}>
                    {src.fields.map(f => (
                      <div key={f.key} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px', borderRadius:5, fontSize:12, color:'var(--text-muted)' }}>
                        <span style={{ fontSize:9, color:'var(--text-muted)', background:'var(--surface2)', padding:'1px 5px', borderRadius:3, fontFamily:'var(--mono)', border:'1px solid var(--border)', flexShrink:0 }}>
                          {f.type==='number'?'123':f.type==='date'?'dt':'abc'}
                        </span>
                        {f.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {abaLateral === 'componentes' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {COMPONENT_TYPES.map(t => (
                <button key={t.id} onClick={() => addWidget(t.id)}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                    padding:'14px 8px', border:'1px solid var(--border)', borderRadius:9,
                    background:'var(--surface2)', cursor:'pointer', fontFamily:'var(--font)', transition:'border-color .15s, box-shadow .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.boxShadow='0 0 0 2px var(--accent)22' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none' }}>
                  <span style={{ fontSize:24 }}>{t.icon}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text-soft)' }}>{t.label}</span>
                  <span style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', lineHeight:1.3 }}>{t.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Toolbar */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px',
          background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <button onClick={onBack}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', border:'1px solid var(--border)',
              borderRadius:7, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>
            <ChevronLeft size={14}/> Relatórios
          </button>
          {editandoNome ? (
            <input autoFocus value={nomeRelatorio}
              onChange={e => setNomeRelatorio(e.target.value)}
              onBlur={() => setEditandoNome(false)}
              onKeyDown={e => e.key==='Enter' && setEditandoNome(false)}
              style={{ fontSize:15, fontWeight:700, color:'var(--text)', background:'none', border:'none',
                outline:'none', borderBottom:'2px solid var(--accent)', fontFamily:'var(--font)', minWidth:200 }}/>
          ) : (
            <span onClick={() => setEditandoNome(true)}
              style={{ fontSize:15, fontWeight:700, color:'var(--text)', cursor:'text', padding:'2px 4px', borderRadius:4 }}
              title="Clique para renomear">{nomeRelatorio}</span>
          )}
          <div style={{ flex:1 }}/>
          {selecionado && (
            <button onClick={exportarCSV}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                border:'1px solid var(--border)', borderRadius:7, background:'none',
                color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>
              <Download size={13}/> Exportar CSV
            </button>
          )}
          <button onClick={handleSave}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 18px',
              background: saved ? '#10B981' : 'var(--accent)', color:'#fff',
              border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer',
              fontFamily:'var(--font)', transition:'background .3s' }}>
            <Save size={13}/> {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>

        {/* Filtros globais */}
        {widgets.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 20px',
            background:'var(--surface2)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>Filtros:</span>
            <select value={filtrosGlobais.periodo}
              onChange={e => { setFiltrosGlobais(p=>({...p,periodo:e.target.value})); setDrillState(null) }}
              style={{ padding:'5px 10px', border:'1px solid var(--border)', borderRadius:6, background:'var(--surface)', color:'var(--text)', fontSize:12, outline:'none', fontFamily:'var(--font)', cursor:'pointer' }}>
              <option value="todos">Todos os períodos</option>
              <option value="este_mes">Este mês</option>
              <option value="ultimos_3m">Últimos 3 meses</option>
              <option value="este_ano">Este ano</option>
            </select>
            {empresasDisponiveis.length > 0 && (
              <select value={filtrosGlobais.empresa}
                onChange={e => { setFiltrosGlobais(p=>({...p,empresa:e.target.value})); setDrillState(null) }}
                style={{ padding:'5px 10px', border:'1px solid var(--border)', borderRadius:6, background:'var(--surface)', color:'var(--text)', fontSize:12, outline:'none', fontFamily:'var(--font)', cursor:'pointer' }}>
                <option value="">Todas as empresas</option>
                {empresasDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
            {(filtrosGlobais.periodo !== 'todos' || filtrosGlobais.empresa || drillState) && (
              <button onClick={() => { setFiltrosGlobais({empresa:'',periodo:'todos'}); setDrillState(null) }}
                style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', padding:'2px 4px', fontFamily:'var(--font)' }}>
                Limpar
              </button>
            )}
          </div>
        )}

        {/* Grid de widgets */}
        <div style={{ flex:1, overflowY:'auto', padding:20, position:'relative' }}>
          {widgets.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, color:'var(--text-muted)' }}>
              <div style={{ fontSize:48 }}>📊</div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text-soft)' }}>Comece adicionando um visual</div>
              <div style={{ fontSize:13 }}>Escolha um componente no painel esquerdo</div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                {COMPONENT_TYPES.map(t => (
                  <button key={t.id} onClick={() => addWidget(t.id)}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      padding:'12px 16px', border:'1px solid var(--border)', borderRadius:10,
                      background:'var(--surface)', cursor:'pointer', fontFamily:'var(--font)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                    <span style={{ fontSize:22 }}>{t.icon}</span>
                    <span style={{ fontSize:11, color:'var(--text-soft)' }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:16, alignItems:'start' }}
                onClick={e => { if (e.target===e.currentTarget) setSelecionadoId(null) }}>
                {widgets.map(w => {
                  const src = sources.find(s => s.id === w.sourceId)
                  return (
                    <Widget key={w.id} w={w} selecionado={selecionadoId===w.id}
                      onSelect={(id,patch) => { setSelecionadoId(id); if (patch) updateWidget(id,patch) }}
                      onDelete={deleteWidget}>
                      {renderWidget(w, src, sources, {
                        filtrosGlobais, drillState,
                        onDrill: drill => setDrillState(prev =>
                          prev&&prev.campo===drill.campo&&prev.valor===drill.valor ? null : drill
                        ),
                      })}
                    </Widget>
                  )
                })}
              </div>
              <button onClick={() => setAbaLateral('componentes')}
                style={{ marginTop:16, display:'flex', alignItems:'center', gap:8,
                  padding:'10px 18px', border:'2px dashed var(--border)', borderRadius:10,
                  background:'none', color:'var(--text-muted)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>
                + Adicionar visual
              </button>
              {drillState && <DrillPanel drill={drillState} sources={sources} onClose={() => setDrillState(null)}/>}
            </>
          )}
        </div>
      </div>

      {/* Config panel direito */}
      {selecionado && (
        <ConfigPanel
          widget={selecionado}
          source={sourceAtual}
          sources={sources}
          onUpdate={patch => updateWidget(selecionadoId, patch)}
          onClose={() => setSelecionadoId(null)}
        />
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Relatorios() {
  const [saved, setSaved] = useLocalState(RELATORIOS_STORAGE_KEY, [])
  const [current, setCurrent] = useState(null) // null = browse, objeto = editor

  function handleNew() {
    setCurrent({ id: `rel_${Date.now()}`, nome: 'Novo relatório', widgets: [], created_at: new Date().toISOString() })
  }
  function handleFromTemplate(template) {
    setCurrent({ id: `rel_${Date.now()}`, nome: template.nome, widgets: template.widgets.map(w => ({...w, id:`w_${Date.now()}_${Math.random().toString(36).slice(2)}`})), created_at: new Date().toISOString() })
  }
  function handleOpen(r) { setCurrent(r) }
  function handleDelete(id) { setSaved(prev => prev.filter(r => r.id !== id)) }
  function handleSave(r) {
    setSaved(prev => {
      const idx = prev.findIndex(x => x.id === r.id)
      if (idx >= 0) { const n=[...prev]; n[idx]=r; return n }
      return [...prev, r]
    })
    setCurrent(r)
  }

  if (current) {
    return <EditorView relatorio={current} onSave={handleSave} onBack={() => setCurrent(null)}/>
  }

  return (
    <BrowseView
      relatorios={saved}
      onOpen={handleOpen}
      onNew={handleNew}
      onDelete={handleDelete}
      onFromTemplate={handleFromTemplate}
    />
  )
}
