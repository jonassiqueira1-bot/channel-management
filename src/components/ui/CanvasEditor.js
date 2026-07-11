import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Save, Printer, Settings, Layers, Plus, Trash2, Lock, Users, Globe, Maximize2, Minimize2, X, Filter, FileText, ChevronDown, ChevronUp, Pin, PinOff } from 'lucide-react'
import { useDocumentDataSources } from '../../hooks/useDocumentDataSources'
import { useProfile } from '../../hooks/useProfile'

// ── Constantes do canvas ──────────────────────────────────────────────────────
const PAGE_W = 794   // A4 a 96 dpi (fallback)
const PAGE_H = 1123

const PAGE_SIZES = {
  A4:     { w: 794,  h: 1123, label: 'A4 · 210×297mm'     },
  A3:     { w: 1123, h: 1587, label: 'A3 · 297×420mm'     },
  A5:     { w: 559,  h: 794,  label: 'A5 · 148×210mm'     },
  Letter: { w: 816,  h: 1056, label: 'Letter · 216×279mm' },
}

const PALETA = [
  { tipo:'texto',          icon:'T',  label:'Texto'    },
  { tipo:'kpi',            icon:'#',  label:'KPI'      },
  { tipo:'grafico',        icon:'▦',  label:'Gráfico'  },
  { tipo:'tabela',         icon:'⊞',  label:'Tabela'   },
  { tipo:'tabela_dinamica',icon:'⊟',  label:'Dinâmica' },
  { tipo:'imagem',         icon:'🖼', label:'Imagem'   },
  { tipo:'divisor',        icon:'—',  label:'Divisor'  },
  { tipo:'forma',          icon:'□',  label:'Forma'    },
]

const PALETA_SUBS = {
  texto: [
    { label:'Título',    icon:'H1', h:60,  dados:{ tamanhoFonte:28, negrito:true,  alinhamento:'left',   cor:'#18181b', conteudo:'Título' } },
    { label:'Subtítulo', icon:'H2', h:48,  dados:{ tamanhoFonte:20, negrito:true,  alinhamento:'left',   cor:'#374151', conteudo:'Subtítulo' } },
    { label:'Parágrafo', icon:'¶',  h:80,  dados:{ tamanhoFonte:13, negrito:false, alinhamento:'left',   cor:'#18181b', conteudo:'Texto do parágrafo...' } },
    { label:'Citação',   icon:'"',  h:70,  dados:{ tamanhoFonte:15, negrito:false, italico:true, alinhamento:'center', cor:'#6B7280', conteudo:'Citação ou destaque importante...' } },
  ],
  kpi: [
    { label:'KPI simples', icon:'#',  h:100, dados:{ titulo:'Métrica',  metrica:'COUNT', cor:'#2563EB' } },
    { label:'Valor R$',    icon:'R$', h:100, dados:{ titulo:'Receita',  metrica:'SUM',   prefixo:'R$ ', cor:'#10B981' } },
    { label:'Percentual',  icon:'%',  h:100, dados:{ titulo:'Taxa',     metrica:'AVG',   sufixo:'%',   cor:'#F59E0B' } },
  ],
  grafico: [
    { label:'Barras',  icon:'▦', h:200, dados:{ tipoGrafico:'bar',  titulo:'Gráfico de barras', metrica:'COUNT', cor:'#2563EB' } },
    { label:'Pizza',   icon:'◕', h:200, dados:{ tipoGrafico:'pie',  titulo:'Distribuição',      metrica:'COUNT', cor:'#2563EB' } },
    { label:'Linha',   icon:'〜', h:200, dados:{ tipoGrafico:'line', titulo:'Evolução',          metrica:'COUNT', cor:'#10B981' } },
  ],
  tabela: [
    { label:'Tabela completa', icon:'⊞', h:200, dados:{ limite:10, campos:[] } },
    { label:'Top 5',           icon:'⊤', h:140, dados:{ limite:5,  campos:[] } },
  ],
  tabela_dinamica: [
    { label:'Resumo por campo', icon:'⊟', h:240, dados:{ titulo:'Resumo', campoAgrupador:'', colunas:[{id:'c1',tipo:'count',label:'Qtd'}], ordenar:'valor_desc', limite:20 } },
    { label:'Funil Pipeline',   icon:'🔽', h:280, dados:{ titulo:'Funil por Etapa', sourceId:'pipeline', campoAgrupador:'etapa_nome', colunas:[{id:'c1',tipo:'count',label:'Qtd'},{id:'c2',tipo:'pct_total',label:'% do Total'},{id:'c3',tipo:'pct_prev',label:'Conversão'}], ordenar:'grupo_asc', limite:20 } },
  ],
  imagem: [
    { label:'Imagem URL',   icon:'🔗', h:200, dados:{ url:'', fit:'cover',   raio:0 } },
    { label:'Imagem com borda', icon:'🖼', h:200, dados:{ url:'', fit:'contain', raio:8, bordaAtiva:true } },
  ],
  divisor: [
    { label:'Linha fina',  icon:'—', h:16, dados:{ cor:'#e4e4e7', espessura:1, estilo:'solid'  } },
    { label:'Linha média', icon:'━', h:16, dados:{ cor:'#a1a1aa', espessura:2, estilo:'solid'  } },
    { label:'Tracejado',   icon:'╌', h:16, dados:{ cor:'#d4d4d8', espessura:1, estilo:'dashed' } },
    { label:'Espaço',      icon:'↕', h:32, dados:{ cor:'transparent', espessura:1, estilo:'solid' } },
  ],
  forma: [
    { label:'Retângulo', icon:'□', h:80, dados:{ tipoForma:'retangulo', cor:'#2563EB', corFundo:'#EFF6FF', raio:8 } },
    { label:'Círculo',   icon:'○', h:100,dados:{ tipoForma:'circulo',   cor:'#10B981', corFundo:'#D1FAE5', raio:50 } },
    { label:'Caixa info',icon:'⚐', h:60, dados:{ tipoForma:'retangulo', cor:'#F59E0B', corFundo:'#FEF3C7', raio:8, conteudo:'Informação importante' } },
  ],
}

const CORES_PRESET = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#1E3A5F','#374151','#6B7280']

const CONFIG_PADRAO = {
  tamanhoPagina: 'A4',
  margens:    { top: 76, right: 76, bottom: 76, left: 76 },
  fundoPagina:{ tipo:'cor', cor:'#ffffff', gradiente:{ cor1:'#f0f4ff', cor2:'#ffffff', angulo:180 } },
  cabecalho:  { ativo:true, tipoFundo:'cor', corFundo:'#1E3A5F', gradiente:{ cor1:'#1E3A5F', cor2:'#2563EB', angulo:135 }, titulo:'', subtitulo:'' },
  rodape:     { ativo:true, texto:'', paginacao:true, corFundo:'#f4f4f5', corTexto:'#a1a1aa' },
  marcaDagua: { ativo:false, texto:'RASCUNHO', opacidade:0.06 },
}

function pageSize(cfg) {
  return PAGE_SIZES[cfg?.tamanhoPagina || 'A4'] || PAGE_SIZES.A4
}

function cabBg(cab) {
  if (cab?.tipoFundo === 'imagem') return cab?.imagemUrl ? 'none' : '#1E3A5F'
  if (cab?.tipoFundo === 'gradiente') {
    const g = cab.gradiente || {}
    return `linear-gradient(${g.angulo??135}deg, ${g.cor1||'#1E3A5F'}, ${g.cor2||'#2563EB'})`
  }
  return cab?.corFundo || '#1E3A5F'
}

function pageBg(cfg) {
  const f = cfg?.fundoPagina || {}
  if (f.tipo === 'gradiente') {
    const g = f.gradiente || {}
    return `linear-gradient(${g.angulo??180}deg, ${g.cor1||'#f0f4ff'}, ${g.cor2||'#ffffff'})`
  }
  return f.cor || '#ffffff'
}

const PAPEIS = ['admin_isv','gerente','vendedor','analista','operacional','parceiro']

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(v) {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1000000) return `${(v/1000000).toFixed(1)}M`
  if (Math.abs(v) >= 1000)    return `${(v/1000).toFixed(1)}K`
  return String(Math.round(v*10)/10)
}

function calcKpi(source, dados) {
  let regs = source?.registros || []
  if (dados.filtro?.campo && dados.filtro?.valor !== undefined) {
    const fv = String(dados.filtro.valor)
    regs = regs.filter(r => String(r[dados.filtro.campo] ?? '') === fv)
  }
  if (dados.formula?.trim()) {
    try {
      const expr = dados.formula
        .replace(/COUNT\(\*\)/gi, regs.length)
        .replace(/SUM\((\w+)\)/gi, (_, f) => regs.reduce((s,r) => s+(Number(r[f])||0), 0))
        .replace(/AVG\((\w+)\)/gi, (_, f) => regs.length ? regs.reduce((s,r) => s+(Number(r[f])||0), 0)/regs.length : 0)
      // eslint-disable-next-line no-new-func
      const v = new Function('return '+expr)()
      return typeof v === 'number' ? Math.round(v*100)/100 : null
    } catch { return null }
  }
  if (dados.metrica === 'COUNT')  return regs.length
  if (dados.metrica === 'SUM'  && dados.campoY) return regs.reduce((s,r) => s+(Number(r[dados.campoY])||0), 0)
  if (dados.metrica === 'AVG'  && dados.campoY) return regs.length ? regs.reduce((s,r) => s+(Number(r[dados.campoY])||0), 0)/regs.length : 0
  return regs.length
}

function agrupar(registros, campoX, metrica, campoY) {
  const map = {}
  registros.forEach(r => {
    const k = r[campoX] ?? '(vazio)'
    if (!map[k]) map[k] = []
    map[k].push(r)
  })
  return Object.entries(map).map(([label, rows]) => {
    let valor = 0
    if (metrica === 'COUNT')               valor = rows.length
    else if (metrica === 'SUM' && campoY)  valor = rows.reduce((s,r) => s+(Number(r[campoY])||0), 0)
    else if (metrica === 'AVG' && campoY)  valor = rows.length ? rows.reduce((s,r) => s+(Number(r[campoY])||0), 0)/rows.length : 0
    return { label, valor: Math.round(valor*100)/100 }
  }).sort((a,b) => b.valor - a.valor).slice(0, 8)
}

// ── Mini Charts ───────────────────────────────────────────────────────────────
function fmtRotulo(valor, fmt) {
  if (fmt === 'pct') return `${Number(valor).toFixed(1)}%`
  if (fmt === 'pct_inteiro') return `${Math.round(valor)}%`
  if (fmt === 'valor') return fmtNum(valor)
  if (fmt === 'valor_inteiro') return String(Math.round(valor))
  return fmtNum(valor)
}

function MiniBar({ dados, cor, rotulos }) {
  if (!dados?.length) return <span style={{color:'#a1a1aa',fontSize:11}}>Sem dados</span>
  const maxV = Math.max(...dados.map(d => d.valor), 1)
  const total = dados.reduce((s,d) => s+d.valor, 0) || 1
  const showLabel = rotulos?.ativo
  const labelPos  = rotulos?.posicao || 'acima'   // 'acima' | 'dentro' | 'eixo'
  const labelFmt  = rotulos?.formato || 'valor'
  const labelSize = rotulos?.tamanho || 9
  const labelCor  = rotulos?.cor || '#52525b'
  const barW = 28, gap = 36
  const vW = Math.max(dados.length * gap, 120)
  const vH = showLabel && labelPos === 'acima' ? 90 : 80
  const baseY = vH - 14
  return (
    <svg viewBox={`0 0 ${vW} ${vH}`} style={{width:'100%',height:'100%'}}>
      {dados.map((d, i) => {
        const barH = Math.max(2, (d.valor/maxV)*(baseY - 8))
        const x = i*gap+4, y = baseY - barH
        const labelVal = labelFmt.startsWith('pct') ? (d.valor/total*100) : d.valor
        const labelTxt = fmtRotulo(labelVal, labelFmt)
        const labelY = labelPos === 'dentro' ? y + barH/2 + 3 : y - 3
        const labelFill = labelPos === 'dentro' ? '#fff' : labelCor
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={cor||'#2563EB'} rx="2" opacity={0.85}/>
            <text x={x+barW/2} y={baseY+11} textAnchor="middle" fontSize="9" fill="#71717a">
              {String(d.label).slice(0,7)}
            </text>
            {showLabel && labelPos !== 'eixo' && (
              <text x={x+barW/2} y={labelY} textAnchor="middle" fontSize={labelSize} fill={labelFill} fontWeight="600">
                {labelTxt}
              </text>
            )}
          </g>
        )
      })}
      {/* Eixo Y com valores */}
      {showLabel && labelPos === 'eixo' && [0,0.25,0.5,0.75,1].map(frac => {
        const val = maxV * frac
        const y = baseY - frac*(baseY-8)
        return (
          <g key={frac}>
            <line x1={0} y1={y} x2={vW} y2={y} stroke="#e4e4e7" strokeWidth="0.5" strokeDasharray="3,2"/>
            <text x={2} y={y-2} fontSize={labelSize} fill={labelCor}>{fmtRotulo(val, labelFmt)}</text>
          </g>
        )
      })}
    </svg>
  )
}

function MiniPie({ dados, rotulos }) {
  if (!dados?.length) return <span style={{color:'#a1a1aa',fontSize:11}}>Sem dados</span>
  const CORES = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899']
  const total = dados.reduce((s,d) => s+d.valor, 0) || 1
  const showLabel = rotulos?.ativo
  const labelFmt  = rotulos?.formato || 'pct_inteiro'
  const labelSize = rotulos?.tamanho || 8
  // com legenda abaixo precisamos de mais espaço
  const showLegend = rotulos?.legenda !== false
  const VH = showLegend ? 100 : 80
  const CX=40, CY=38, R=32
  let ang = -Math.PI/2
  const fatias = dados.slice(0,6).map((d,i) => {
    const frac = d.valor/total, ini=ang
    ang += frac*2*Math.PI
    const mid = ini + frac*Math.PI
    return { ...d, frac, ini, fim:ang,
      x1:CX+R*Math.cos(ini), y1:CY+R*Math.sin(ini),
      x2:CX+R*Math.cos(ang), y2:CY+R*Math.sin(ang),
      mx:CX+(R*0.65)*Math.cos(mid), my:CY+(R*0.65)*Math.sin(mid),
      large:frac>0.5?1:0, cor:CORES[i%CORES.length] }
  })
  return (
    <svg viewBox={`0 0 80 ${VH}`} style={{width:'100%',height:'100%'}}>
      {fatias.map((f,i) => (
        <path key={i} d={`M${CX},${CY} L${f.x1},${f.y1} A${R},${R} 0 ${f.large},1 ${f.x2},${f.y2} Z`}
          fill={f.cor} opacity={0.85} stroke="white" strokeWidth="0.5"/>
      ))}
      {showLabel && fatias.filter(f=>f.frac>0.04).map((f,i) => {
        const txt = fmtRotulo(labelFmt.startsWith('pct') ? f.frac*100 : f.valor, labelFmt)
        return <text key={i} x={f.mx} y={f.my} textAnchor="middle" fontSize={labelSize} fill="#fff" fontWeight="700">{txt}</text>
      })}
      {showLegend && fatias.map((f,i) => (
        <g key={`leg-${i}`} transform={`translate(2,${CY+R+6+i*10})`}>
          <rect width={7} height={7} fill={f.cor} rx={1}/>
          <text x={10} y={6.5} fontSize={7} fill="#52525b">{String(f.label).slice(0,12)}</text>
        </g>
      ))}
    </svg>
  )
}

function MiniLine({ dados, cor, rotulos }) {
  if (!dados?.length) return <span style={{color:'#a1a1aa',fontSize:11}}>Sem dados</span>
  const maxV = Math.max(...dados.map(d => d.valor), 1)
  const showLabel = rotulos?.ativo
  const labelFmt  = rotulos?.formato || 'valor'
  const labelSize = rotulos?.tamanho || 8
  const labelCor  = rotulos?.cor || '#52525b'
  const W=120, H=70
  const padT = showLabel ? 14 : 6
  const pts = dados.map((d,i) => ({
    x: 4+(i/(Math.max(dados.length-1,1)))*(W-8),
    y: padT+(1-d.valor/maxV)*(H-padT-14),
    v: d.valor, label: d.label
  }))
  const poly = pts.map(p => `${p.x},${p.y}`).join(' ')
  // área abaixo da linha
  const area = `${pts[0].x},${H-14} ` + poly + ` ${pts[pts.length-1].x},${H-14} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'100%'}}>
      <defs>
        <linearGradient id="linegrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor||'#2563EB'} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={cor||'#2563EB'} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`M ${area}`} fill="url(#linegrad)"/>
      <polyline points={poly} fill="none" stroke={cor||'#2563EB'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2.5" fill={cor||'#2563EB'}/>
          {showLabel && (
            <text x={p.x} y={p.y-5} textAnchor="middle" fontSize={labelSize} fill={labelCor} fontWeight="600">
              {fmtRotulo(p.v, labelFmt)}
            </text>
          )}
          <text x={p.x} y={H-4} textAnchor="middle" fontSize={7} fill="#a1a1aa">
            {String(p.label).slice(0,5)}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Renderizador de elemento no canvas ────────────────────────────────────────
function RenderEl({ el, source, sources }) {
  const d = el.dados || {}
  const cor = d.cor || '#2563EB'

  if (el.tipo === 'texto') {
    return (
      <div style={{
        fontSize: d.tamanhoFonte || 14, fontWeight: d.negrito ? 700 : 400,
        fontStyle: d.italico ? 'italic' : 'normal',
        color: d.cor || '#18181b', textAlign: d.alinhamento || 'left',
        lineHeight: 1.6, padding: 4, width:'100%', height:'100%', wordBreak:'break-word',
        whiteSpace:'pre-wrap',
      }}>
        {d.conteudo || 'Clique para editar texto...'}
      </div>
    )
  }

  if (el.tipo === 'kpi') {
    const val = calcKpi(source, d)
    const raio = d.raio ?? 0
    const corFundo = d.corFundo || 'transparent'
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:4,padding:8,background:corFundo,borderRadius:raio,border:d.bordaAtiva?`1.5px solid ${cor}`:'none',boxSizing:'border-box'}}>
        {d.titulo && <div style={{fontSize:10,fontWeight:700,color:corFundo!=='transparent'?cor:'#71717a',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'center'}}>{d.titulo}</div>}
        <div style={{fontSize:Math.min(36, el.h/2.2), fontWeight:800, color:cor, fontFamily:'monospace', lineHeight:1}}>
          {d.prefixo||''}{val !== null ? fmtNum(val) : '—'}{d.sufixo||''}
        </div>
        {source && <div style={{fontSize:9,color:'#a1a1aa'}}>{source.label} · {source.registros.length} registros</div>}
      </div>
    )
  }

  if (el.tipo === 'grafico') {
    const regs = source?.registros || []
    if (!d.campoX || !regs.length) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#a1a1aa',fontSize:12}}>Configure a fonte de dados</div>
    const dados = agrupar(regs, d.campoX, d.metrica||'COUNT', d.campoY)
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%',padding:4}}>
        {d.titulo && <div style={{fontSize:10,fontWeight:700,color:'#71717a',marginBottom:4}}>{d.titulo}</div>}
        <div style={{flex:1,minHeight:0}}>
          {(d.tipoGrafico||'bar') === 'pie'  ? <MiniPie dados={dados} rotulos={d.rotulos}/> :
           (d.tipoGrafico||'bar') === 'line' ? <MiniLine dados={dados} cor={cor} rotulos={d.rotulos}/> :
           <MiniBar dados={dados} cor={cor} rotulos={d.rotulos}/>}
        </div>
      </div>
    )
  }

  if (el.tipo === 'tabela') {
    const regs = (source?.registros || []).slice(0, d.limite||10)
    const campos = d.campos?.length ? (source?.fields||[]).filter(f => d.campos.includes(f.key)) : (source?.fields||[]).slice(0,4)
    if (!regs.length || !campos.length) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#a1a1aa',fontSize:12}}>Configure a fonte de dados</div>
    return (
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
        <thead>
          <tr style={{background:'#f4f4f5'}}>
            {campos.map(c => <th key={c.key} style={{padding:'4px 8px',textAlign:'left',fontWeight:700,color:'#71717a',fontSize:9,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #e4e4e7',whiteSpace:'nowrap'}}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {regs.map((row,i) => (
            <tr key={i} style={{background:i%2?'#fafafa':'#fff'}}>
              {campos.map(c => <td key={c.key} style={{padding:'3px 8px',color:'#52525b',borderBottom:'1px solid #f4f4f5',whiteSpace:'nowrap',overflow:'hidden',maxWidth:120,textOverflow:'ellipsis'}}>{c.type==='number'?fmtNum(row[c.key]):String(row[c.key]??'—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (el.tipo === 'tabela_dinamica') {
    const allRegs = source?.registros || []
    const colunas = d.colunas || [{id:'c1',tipo:'count',label:'Qtd'}]

    // Expande colunas do tipo 'dimensao' em N colunas virtuais (pivot)
    function expandColunas(cols, allRows) {
      const result = []
      cols.forEach(col => {
        if (col.tipo === 'dimensao' && col.campo) {
          const vals = [...new Set(allRows.map(r => String(r[col.campo] ?? '—')))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
          vals.forEach(val => {
            result.push({
              id: `${col.id}_${val}`,
              tipo: col.metrica || 'count',
              label: val,
              campo: col.campoDado || '',
              filtro: { campo: col.campo, valor: val },
              _pivotGrupo: col.label || col.campo,
              _pivotId: col.id,
            })
          })
        } else {
          result.push(col)
        }
      })
      return result
    }
    const colunasExp = expandColunas(colunas, allRegs)

    // Compat: suporta campoAgrupador (legado) e camposAgrupadores (novo)
    const niveis = d.camposAgrupadores?.length
      ? d.camposAgrupadores
      : d.campoAgrupador
        ? [{ campo: d.campoAgrupador, granularidade: d.granularidade || 'nenhuma' }]
        : []

    // Filtro de período
    const periodo = d.periodo || {}
    const regs = (periodo.campo && (periodo.de || periodo.ate))
      ? allRegs.filter(r => {
          const v = String(r[periodo.campo] || '')
          if (periodo.de && v < periodo.de) return false
          if (periodo.ate && v > periodo.ate) return false
          return true
        })
      : allRegs

    if (!niveis.length || !niveis[0].campo || !allRegs.length) {
      return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#a1a1aa',fontSize:12}}>Configure a fonte e o campo de agrupamento</div>
    }

    // Helper: granularidade de data
    const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    function aplicarGran(val, gran) {
      if (!gran || gran === 'nenhuma' || !val || val === '—') return String(val ?? '—')
      const s = String(val)
      const d0 = new Date(s.length === 7 ? s+'-01' : s)
      if (isNaN(d0)) return s
      switch(gran) {
        case 'dia':        return s.slice(0,10)
        case 'dia_semana': return DIAS_PT[d0.getDay()]
        case 'semana': {
          const thu = new Date(d0); thu.setDate(d0.getDate()-((d0.getDay()+6)%7)+3)
          const yr = new Date(thu.getFullYear(),0,1)
          return `S${String(Math.ceil(((thu-yr)/86400000+1)/7)).padStart(2,'0')}/${thu.getFullYear()}`
        }
        case 'mes':        return `${MESES_PT[d0.getMonth()]}/${d0.getFullYear()}`
        case 'trimestre':  return `T${Math.ceil((d0.getMonth()+1)/3)}/${d0.getFullYear()}`
        case 'ano':        return String(d0.getFullYear())
        default:           return s
      }
    }

    // Agrupamento recursivo: retorna árvore de nós { key, rows, children }
    function agruparNiveis(rows, niveisRestantes, ord) {
      if (!niveisRestantes.length) return []
      const { campo, granularidade } = niveisRestantes[0]
      const map = {}
      rows.forEach(r => {
        const k = aplicarGran(r[campo], granularidade)
        if (!map[k]) map[k] = []
        map[k].push(r)
      })
      let nos = Object.entries(map).map(([key, subRows]) => ({
        key, rows: subRows,
        children: niveisRestantes.length > 1 ? agruparNiveis(subRows, niveisRestantes.slice(1), ord) : []
      }))
      if (ord === 'valor_desc') nos.sort((a,b) => b.rows.length - a.rows.length)
      else if (ord === 'valor_asc') nos.sort((a,b) => a.rows.length - b.rows.length)
      else nos.sort((a,b) => a.key.localeCompare(b.key, 'pt-BR'))
      return nos
    }

    const ord = d.ordenar || 'valor_desc'
    const arvore = agruparNiveis(regs, niveis, ord)
    const total = regs.length

    // Achatar árvore em linhas planas com nível de indentação
    function achatar(nos, nivel = 0, parentRows = null, parentPrevRows = null, limite = 9999) {
      const resultado = []
      nos.slice(0, nivel === 0 ? limite : 9999).forEach((no, idx) => {
        resultado.push({ key: no.key, rows: no.rows, nivel, idx, siblings: nos, parentRows, parentPrevRows })
        if (no.children.length) {
          resultado.push(...achatar(no.children, nivel + 1, no.rows, no.rows))
        }
      })
      return resultado
    }
    const linhasFlat = achatar(arvore, 0, null, null, d.limite || 20)

    const calcCol = (col, rows, siblings, idx, parentRows, parentPrevRows) => {
      // Filtro embutido na coluna: {campo, valor} — ex: situacao='ganho'
      const filtro = col.filtro
      const rowsFiltrados = filtro?.campo && filtro?.valor !== undefined
        ? rows.filter(r => String(r[filtro.campo]||'') === String(filtro.valor))
        : rows
      const numField = col.campo
      const nums = numField ? rowsFiltrados.map(r => Number(r[numField]||0)) : rowsFiltrados.map(()=>1)
      const soma = nums.reduce((s,v)=>s+v,0)
      switch(col.tipo) {
        case 'count':     return rowsFiltrados.length
        case 'sum':       return soma
        case 'avg':       return rowsFiltrados.length ? soma/rowsFiltrados.length : 0
        case 'pct_total': return total > 0 ? (rowsFiltrados.length / total * 100) : 0
        case 'pct_group': {
          // % do filtro dentro do próprio grupo (ex: ganhos/total do grupo)
          return rows.length > 0 ? (rowsFiltrados.length / rows.length * 100) : 0
        }
        case 'pct_parent': {
          const parentLen = parentRows?.length || total
          return parentLen > 0 ? (rowsFiltrados.length / parentLen * 100) : 0
        }
        case 'pct_prev': {
          if (idx === 0) return parentPrevRows ? (rowsFiltrados.length / parentPrevRows.length * 100) : 100
          const prev = siblings[idx - 1]
          return prev?.rows.length > 0 ? (rowsFiltrados.length / prev.rows.length * 100) : 0
        }
        default: return rowsFiltrados.length
      }
    }

    const isPercent = (col) => ['pct_total','pct_prev','pct_parent','pct_group'].includes(col.tipo)
    const fmt = (v, col) => {
      if (isPercent(col)) return `${v.toFixed(1)}%`
      if (col.tipo === 'count') return String(Math.round(v))
      if (col.tipo === 'sum' || col.tipo === 'avg') return fmtNum(v)
      return fmtNum(v)
    }

    const thStyle = {padding:'4px 8px',textAlign:'left',fontWeight:700,color:'#71717a',fontSize:9,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #e4e4e7',whiteSpace:'nowrap',background:'#f4f4f5'}
    const tdStyle = (nivel) => ({padding:'3px 8px',color: nivel===0?'#1e293b':'#52525b',borderBottom:'1px solid #f4f4f5',whiteSpace:'nowrap',fontSize:10,fontWeight:nivel===0&&niveis.length>1?600:400})

    const periodoLabel = (periodo.campo && (periodo.de || periodo.ate))
      ? [periodo.de, periodo.ate].filter(Boolean).join(' → ')
      : null

    const headerLabel = niveis.map(n => source?.fields?.find(f=>f.key===n.campo)?.label || n.campo).join(' › ')

    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',padding:'4px 8px',flexShrink:0,gap:8}}>
          {d.titulo && <div style={{fontSize:10,fontWeight:700,color:'#71717a'}}>{d.titulo}</div>}
          {periodoLabel && <div style={{fontSize:8,color:'#2563eb',background:'#eff6ff',borderRadius:4,padding:'1px 6px',whiteSpace:'nowrap',flexShrink:0}}>📅 {periodoLabel} · {regs.length} reg.</div>}
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
            <thead style={{position:'sticky',top:0}}>
              {/* Grupo header para colunas pivot (dimensao) */}
              {colunasExp.some(c => c._pivotGrupo) && (() => {
                const grupos = []
                let i = 0
                while (i < colunasExp.length) {
                  const g = colunasExp[i]._pivotGrupo
                  if (g) {
                    let span = 0
                    while (i + span < colunasExp.length && colunasExp[i + span]._pivotId === colunasExp[i]._pivotId) span++
                    grupos.push({ label: g, span, isPivot: true })
                    i += span
                  } else {
                    grupos.push({ label: colunasExp[i].label, span: 1, isPivot: false })
                    i++
                  }
                }
                return (
                  <tr>
                    <th style={thStyle}></th>
                    {grupos.map((g, gi) => (
                      <th key={gi} colSpan={g.span} style={{...thStyle, textAlign:'center', borderLeft: g.isPivot ? '2px solid #e4e4e7' : undefined, color: g.isPivot ? '#2563eb' : '#71717a', background: g.isPivot ? '#eff6ff' : '#f4f4f5'}}>
                        {g.isPivot ? g.label : ''}
                      </th>
                    ))}
                  </tr>
                )
              })()}
              <tr>
                <th style={thStyle}>{headerLabel}</th>
                {colunasExp.map(col => <th key={col.id} style={{...thStyle,textAlign:'right', borderLeft: col._pivotGrupo ? '1px solid #e4e4e7' : undefined}}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {linhasFlat.map(({key, rows, nivel, idx, siblings, parentRows, parentPrevRows}, ri) => {
                const vals = colunasExp.map(col => calcCol(col, rows, siblings, idx, parentRows, parentPrevRows))
                const isParent = nivel < niveis.length - 1
                return (
                  <tr key={`${nivel}-${key}-${ri}`} style={{background: nivel===0&&niveis.length>1 ? '#f1f5f9' : ri%2?'#fafafa':'#fff'}}>
                    <td style={{...tdStyle(nivel), paddingLeft: 8 + nivel * 14}}>
                      {isParent && <span style={{marginRight:4,color:'#94a3b8',fontSize:8}}>▸</span>}
                      {key}
                    </td>
                    {colunasExp.map((col, ci) => (
                      <td key={col.id} style={{...tdStyle(nivel),textAlign:'right',
                        borderLeft: col._pivotGrupo ? '1px solid #f0f0f0' : undefined,
                        color: isPercent(col) && vals[ci]<50 ? '#ef4444' : isPercent(col) && vals[ci]>=80 ? '#10b981' : nivel===0&&niveis.length>1?'#1e293b':'#52525b',
                        fontWeight: isPercent(col)||isParent?600:400}}>
                        {fmt(vals[ci], col)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (el.tipo === 'divisor') {
    return (
      <div style={{display:'flex',alignItems:'center',height:'100%'}}>
        <div style={{width:'100%',height:d.espessura||1,background:d.cor||'#e4e4e7',borderStyle:d.estilo||'solid'}}/>
      </div>
    )
  }

  if (el.tipo === 'forma') {
    return (
      <div style={{
        width:'100%', height:'100%',
        background: d.corFundo || '#EFF6FF',
        border: `${d.bordaEspessura||1}px solid ${d.cor||'#2563EB'}`,
        borderRadius: d.tipoForma==='circulo' ? '50%' : (d.raio||6),
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: d.tamanhoFonte||13, fontWeight: d.negrito?700:400,
        color: d.cor||'#2563EB',
      }}>
        {d.conteudo||''}
      </div>
    )
  }

  if (el.tipo === 'imagem') {
    if (!d.url) {
      return (
        <div style={{width:'100%',height:'100%',background:'#f4f4f5',border:'2px dashed #d4d4d8',borderRadius:d.raio||0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,color:'#a1a1aa',fontSize:11}}>
          <span style={{fontSize:24}}>🖼</span>
          <span>Defina a URL ou envie uma imagem</span>
        </div>
      )
    }
    return (
      <div style={{width:'100%',height:'100%',borderRadius:d.raio||0,overflow:'hidden',border:d.bordaAtiva?`1.5px solid ${d.corBorda||'#d4d4d8'}`:'none',boxSizing:'border-box'}}>
        <img src={d.url} alt={d.alt||''} style={{width:'100%',height:'100%',objectFit:d.fit||'cover',display:'block'}}
          onError={e=>{e.target.style.display='none'}}/>
      </div>
    )
  }

  if (el.tipo === 'quebra_pagina') {
    return (
      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',gap:8,pointerEvents:'none',userSelect:'none'}}>
        <div style={{flex:1,height:1,borderTop:'2px dashed #94A3B8'}}/>
        <span style={{fontSize:9,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.1em',whiteSpace:'nowrap',background:'transparent'}}>↵ Nova Página</span>
        <div style={{flex:1,height:1,borderTop:'2px dashed #94A3B8'}}/>
      </div>
    )
  }

  // ── Tipos exclusivos de proposta ─────────────────────────────────────────────

  if (el.tipo === 'variavel') {
    const pd = el._projetoData || {}
    const hoje = new Date().toLocaleDateString('pt-BR')
    const vars = {
      '{{produto}}': pd.produto || '—',
      '{{data}}': hoje,
      '{{empresa}}': pd.empresa || pd.nome || '—',
      '{{nome_proposta}}': pd.nome || '—',
      '{{investimento}}': pd.investimento ? `R$ ${Number(pd.investimento).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—',
    }
    const texto = (d.conteudo || '').replace(/\{\{[^}]+\}\}/g, m => vars[m] ?? m)
    return (
      <div style={{
        fontSize: d.tamanhoFonte||14, fontWeight: d.negrito?700:400,
        fontStyle: d.italico?'italic':'normal',
        color: d.cor||'#18181b', textAlign: d.alinhamento||'left',
        lineHeight: 1.6, padding: 4, width:'100%', height:'100%', wordBreak:'break-word',
        whiteSpace:'pre-wrap',
      }}>
        {texto || <span style={{color:'#a1a1aa',fontSize:11}}>Clique para editar conteúdo com variáveis…</span>}
      </div>
    )
  }

  if (el.tipo === 'escopo') {
    const pd = el._projetoData || {}
    const fases = pd.wbs || []
    if (!fases.length) {
      return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#a1a1aa',fontSize:11,flexDirection:'column',gap:4}}>
          <span style={{fontSize:20}}>📋</span>
          <span>WBS/Escopo da proposta</span>
        </div>
      )
    }
    const corCab = d.cor || '#1E3A5F'
    // Separate contemplated (mostrar != false) from not contemplated (mostrar === false)
    const fasesCont = fases.map(f => ({ ...f, atividades: (f.atividades||[]).filter(a=>a.mostrar!==false) })).filter(f=>f.atividades.length>0)
    const naoContemplados = fases.flatMap(f => (f.atividades||[]).filter(a=>a.mostrar===false).map(a=>({ ...a, fase: f.nome })))
    return (
      <div style={{width:'100%',height:'100%',overflowY:'auto',fontSize:10}}>
        <div style={{background:corCab,color:'#fff',padding:'4px 8px',fontWeight:700,fontSize:11,borderRadius:'4px 4px 0 0'}}>
          {d.titulo || 'Escopo do Projeto'}
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#f4f4f5'}}>
              <th style={{padding:'3px 6px',textAlign:'left',fontSize:9,color:'#71717a',fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid #e4e4e7'}}>Fase / Atividade</th>
              <th style={{padding:'3px 6px',textAlign:'center',fontSize:9,color:'#71717a',fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid #e4e4e7',whiteSpace:'nowrap'}}>Horas</th>
            </tr>
          </thead>
          <tbody>
            {fasesCont.map((fase,fi) => [
              <tr key={`f${fi}`} style={{background:'#EFF6FF'}}>
                <td colSpan={2} style={{padding:'3px 6px',fontWeight:700,color:'#1E3A5F',fontSize:10,borderBottom:'1px solid #e4e4e7'}}>{fase.nome}</td>
              </tr>,
              ...(fase.atividades||[]).map((atv,ai) => (
                <tr key={`f${fi}a${ai}`} style={{background:ai%2?'#fafafa':'#fff'}}>
                  <td style={{padding:'2px 6px 2px 14px',color:'#52525b',borderBottom:'1px solid #f4f4f5'}}>{atv.nome||atv.descricao}</td>
                  <td style={{padding:'2px 6px',textAlign:'center',color:'#374151',fontFamily:'monospace',borderBottom:'1px solid #f4f4f5',whiteSpace:'nowrap'}}>{atv.horas||0}h</td>
                </tr>
              ))
            ])}
          </tbody>
        </table>
        {naoContemplados.length > 0 && (
          <div style={{marginTop:6}}>
            <div style={{background:'#fff',borderTop:'2px solid #DC2626',padding:'4px 8px 2px',fontWeight:700,fontSize:10,color:'#DC2626',letterSpacing:'0.03em'}}>
              Itens não contemplados
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <tbody>
                {naoContemplados.map((atv,i) => (
                  <tr key={i} style={{background:i%2?'#fef2f2':'#fff'}}>
                    <td style={{padding:'2px 6px 2px 12px',color:'#7f1d1d',fontSize:9,borderBottom:'1px solid #fecaca'}}>
                      <span style={{color:'#DC2626',marginRight:4,fontWeight:700}}>—</span>
                      {atv.nome||atv.descricao}
                    </td>
                    <td style={{padding:'2px 6px',textAlign:'right',color:'#DC2626',fontSize:9,borderBottom:'1px solid #fecaca',whiteSpace:'nowrap',fontStyle:'italic'}}>{atv.fase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (el.tipo === 'investimento') {
    const pd = el._projetoData || {}
    const tarifas = pd.tarifas || []
    const itens   = pd.itens   || []
    const corCab  = d.cor || '#1E3A5F'
    const fmtR = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
    // Aggregate hours per tarifa papel, multiply by valor_hora
    const tm = {}
    tarifas.forEach(t => { tm[t.papel] = { label: t.label || t.papel, valor: Number(t.valor_hora||0) } })
    const hByPapel = { analista:0, coordenacao:0, especialista:0 }
    itens.filter(i=>i.nivel===2).forEach(a => {
      const hA = Number(a.hr_analista||0), hC = Number(a.hr_coord||0)
      if (a.tipo_hora==='analista'    || a.tipo_hora==='ana_coord') hByPapel.analista    += hA
      if (a.tipo_hora==='coordenacao' || a.tipo_hora==='ana_coord') hByPapel.coordenacao += hC
      if (a.tipo_hora==='especialista')                              hByPapel.especialista+= hA
    })
    const linhas = Object.entries(tm)
      .map(([papel,{label,valor}]) => ({ nome:label, horas:hByPapel[papel]||0, unit:valor, total:(hByPapel[papel]||0)*valor }))
      .filter(l => l.horas > 0)
    const totalGeral = linhas.reduce((s,l)=>s+l.total,0)
    if (!linhas.length) {
      return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#a1a1aa',fontSize:11,flexDirection:'column',gap:4}}>
          <span style={{fontSize:20}}>💰</span>
          <span>Quadro de Investimento</span>
        </div>
      )
    }
    return (
      <div style={{width:'100%',height:'100%',overflowY:'auto',fontSize:10}}>
        <div style={{background:corCab,color:'#fff',padding:'4px 8px',fontWeight:700,fontSize:11,borderRadius:'4px 4px 0 0'}}>
          {d.titulo || 'Quadro de Investimento'}
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#f4f4f5'}}>
              <th style={{padding:'3px 6px',textAlign:'left',fontSize:9,color:'#71717a',fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid #e4e4e7'}}>Perfil</th>
              <th style={{padding:'3px 6px',textAlign:'center',fontSize:9,color:'#71717a',fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid #e4e4e7'}}>Horas</th>
              <th style={{padding:'3px 6px',textAlign:'right',fontSize:9,color:'#71717a',fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid #e4e4e7',whiteSpace:'nowrap'}}>R$/h</th>
              <th style={{padding:'3px 6px',textAlign:'right',fontSize:9,color:'#71717a',fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid #e4e4e7',whiteSpace:'nowrap'}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l,i)=>(
              <tr key={i} style={{background:i%2?'#fafafa':'#fff'}}>
                <td style={{padding:'3px 6px',color:'#374151',borderBottom:'1px solid #f4f4f5'}}>{l.nome}</td>
                <td style={{padding:'3px 6px',textAlign:'center',color:'#52525b',borderBottom:'1px solid #f4f4f5',fontFamily:'monospace'}}>{l.horas}h</td>
                <td style={{padding:'3px 6px',textAlign:'right',color:'#52525b',borderBottom:'1px solid #f4f4f5',fontFamily:'monospace',whiteSpace:'nowrap'}}>{fmtR(l.unit)}</td>
                <td style={{padding:'3px 6px',textAlign:'right',color:'#374151',fontWeight:600,borderBottom:'1px solid #f4f4f5',fontFamily:'monospace',whiteSpace:'nowrap'}}>{fmtR(l.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{background:corCab}}>
              <td colSpan={3} style={{padding:'4px 6px',fontWeight:700,color:'#fff',fontSize:10}}>Total</td>
              <td style={{padding:'4px 6px',textAlign:'right',fontWeight:800,color:'#fff',fontFamily:'monospace',whiteSpace:'nowrap'}}>{fmtR(totalGeral)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  return null
}

// ── Painel de propriedades ────────────────────────────────────────────────────
function PropPanel({ el, sources, onChange, onDelete, config, onConfigChange, mode, projetoData, onToggle }) {
  const [aba, setAba] = useState('el')
  const d = el?.dados || {}
  const source = el ? sources.find(s => s.id === d.sourceId) : null
  const inp = { width:'100%', padding:'6px 9px', border:'1px solid var(--border)', borderRadius:6, background:'var(--surface)', color:'var(--text)', fontSize:12, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box' }
  const lbl = { fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:3 }

  const upd = (patch) => onChange({ ...el, dados: { ...d, ...patch } })

  return (
    <div style={{width:220,flexShrink:0,background:'var(--surface)',borderLeft:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* tab bar */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',flexShrink:0}}>
        {[{id:'el',icon:<Layers size={13}/>,tip:'Elemento'},{id:'pag',icon:<Settings size={13}/>,tip:'Página'}].map(t => (
          <button key={t.id} onClick={()=>setAba(t.id)} title={t.tip}
            style={{flex:1,padding:'9px 0',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
              background:aba===t.id?'var(--surface)':'var(--surface2)',
              color:aba===t.id?'var(--accent)':'var(--text-muted)',
              borderBottom:aba===t.id?'2px solid var(--accent)':'2px solid transparent',fontFamily:'var(--font)'}}>
            {t.icon}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:12}}>

        {/* ── Aba Elemento ── */}
        {aba==='el' && !el && (
          <div style={{color:'var(--text-muted)',fontSize:12,textAlign:'center',padding:'20px 0'}}>
            Selecione um elemento para editar
          </div>
        )}

        {aba==='el' && el && (<>
          {/* Fonte de dados */}
          {['kpi','grafico','tabela','tabela_dinamica'].includes(el.tipo) && (
            <div>
              <label style={lbl}>Fonte de dados</label>
              <select style={inp} value={d.sourceId||''} onChange={e=>upd({sourceId:e.target.value,campoX:'',campoY:'',campos:[],campoAgrupador:''})}>
                <option value="">— selecionar —</option>
                {sources.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label} ({s.registros.length})</option>)}
              </select>
            </div>
          )}

          {/* Tipo gráfico */}
          {el.tipo==='grafico' && (
            <div>
              <label style={lbl}>Tipo de gráfico</label>
              <div style={{display:'flex',gap:4}}>
                {[{v:'bar',l:'Barras'},{v:'pie',l:'Pizza'},{v:'line',l:'Linha'}].map(t=>(
                  <button key={t.v} onClick={()=>upd({tipoGrafico:t.v})}
                    style={{flex:1,padding:'5px 0',fontSize:10,border:`1.5px solid ${(d.tipoGrafico||'bar')===t.v?'var(--accent)':'var(--border)'}`,borderRadius:5,background:(d.tipoGrafico||'bar')===t.v?'var(--accent)11':'none',cursor:'pointer',fontFamily:'var(--font)',color:(d.tipoGrafico||'bar')===t.v?'var(--accent)':'var(--text-muted)'}}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Campo dimensão (grafico) */}
          {el.tipo==='grafico' && source && (
            <div>
              <label style={lbl}>Dimensão (agrupar)</label>
              <select style={inp} value={d.campoX||''} onChange={e=>upd({campoX:e.target.value})}>
                <option value="">— campo —</option>
                {source.fields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </div>
          )}

          {/* Métrica */}
          {['kpi','grafico'].includes(el.tipo) && source && (
            <div>
              <label style={lbl}>Métrica</label>
              <div style={{display:'flex',gap:4}}>
                <select style={{...inp,flex:'0 0 70px',width:70}} value={d.metrica||'COUNT'} onChange={e=>upd({metrica:e.target.value})}>
                  {['COUNT','SUM','AVG','MAX','MIN'].map(m=><option key={m}>{m}</option>)}
                </select>
                {(d.metrica||'COUNT')!=='COUNT' && (
                  <select style={inp} value={d.campoY||''} onChange={e=>upd({campoY:e.target.value})}>
                    <option value="">campo</option>
                    {source.fields.filter(f=>f.type==='number').map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Fórmula (kpi) */}
          {el.tipo==='kpi' && (
            <div>
              <label style={lbl}>Fórmula</label>
              <input style={inp} placeholder="SUM(valor) / COUNT(*)" value={d.formula||''} onChange={e=>upd({formula:e.target.value})}/>
            </div>
          )}

          {/* Campos tabela com reordenação */}
          {el.tipo==='tabela' && source && (
            <div>
              <label style={lbl}>Campos visíveis (arraste para reordenar)</label>
              {/* Campos selecionados — reordenáveis */}
              {(d.campos||[]).filter(k => source.fields.find(f=>f.key===k)).map((k, ci, arr) => {
                const f = source.fields.find(f=>f.key===k)
                return (
                  <div key={k} style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
                    <input type="checkbox" checked={true} style={{accentColor:'var(--accent)',flexShrink:0}} onChange={()=>{
                      upd({campos:(d.campos||[]).filter(c=>c!==k)})
                    }}/>
                    <span style={{flex:1,fontSize:11,color:'var(--text-soft)'}}>{f.label}</span>
                    <button disabled={ci===0} onClick={()=>{const c=[...arr];[c[ci-1],c[ci]]=[c[ci],c[ci-1]];upd({campos:c})}}
                      style={{padding:'1px 5px',fontSize:10,border:'1px solid var(--border)',borderRadius:3,background:'var(--surface2)',cursor:ci===0?'default':'pointer',color:ci===0?'var(--text-muted)':'var(--text)',fontFamily:'var(--font)',lineHeight:1.2}}>↑</button>
                    <button disabled={ci===arr.length-1} onClick={()=>{const c=[...arr];[c[ci],c[ci+1]]=[c[ci+1],c[ci]];upd({campos:c})}}
                      style={{padding:'1px 5px',fontSize:10,border:'1px solid var(--border)',borderRadius:3,background:'var(--surface2)',cursor:ci===arr.length-1?'default':'pointer',color:ci===arr.length-1?'var(--text-muted)':'var(--text)',fontFamily:'var(--font)',lineHeight:1.2}}>↓</button>
                  </div>
                )
              })}
              {/* Campos não selecionados */}
              {source.fields.filter(f=>!(d.campos||[]).includes(f.key)).map(f=>(
                <label key={f.key} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-muted)',cursor:'pointer',marginBottom:3}}>
                  <input type="checkbox" checked={false} style={{accentColor:'var(--accent)'}} onChange={()=>{
                    upd({campos:[...(d.campos||[]),f.key]})
                  }}/> {f.label}
                </label>
              ))}
              <label style={{...lbl,marginTop:6}}>Limite de linhas</label>
              <input type="number" style={inp} min={1} max={500} value={d.limite||10} onChange={e=>upd({limite:Number(e.target.value)})}/>
            </div>
          )}

          {/* Tabela dinâmica — configuração */}
          {el.tipo==='tabela_dinamica' && source && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>

              {/* Filtro de período */}
              <div style={{background:'var(--surface2)',borderRadius:6,padding:'8px 10px',border:'1px solid var(--border)'}}>
                <label style={{...lbl,marginBottom:6,display:'flex',alignItems:'center',gap:5}}>
                  📅 Filtro de Período
                </label>
                <label style={lbl}>Campo de data</label>
                <select style={{...inp,marginBottom:6}} value={d.periodo?.campo||''} onChange={e=>upd({periodo:{...(d.periodo||{}),campo:e.target.value}})}>
                  <option value="">— sem filtro —</option>
                  {source.fields.filter(f=>f.type==='date'||f.key.includes('_at')||f.key.includes('mes')||f.key.includes('semana')).map(f=>
                    <option key={f.key} value={f.key}>{f.label}</option>
                  )}
                </select>
                {d.periodo?.campo && (<>
                  <div style={{display:'flex',gap:6}}>
                    <div style={{flex:1}}>
                      <label style={lbl}>De</label>
                      <input type="date" style={inp} value={d.periodo?.de||''} onChange={e=>upd({periodo:{...d.periodo,de:e.target.value}})}/>
                    </div>
                    <div style={{flex:1}}>
                      <label style={lbl}>Até</label>
                      <input type="date" style={inp} value={d.periodo?.ate||''} onChange={e=>upd({periodo:{...d.periodo,ate:e.target.value}})}/>
                    </div>
                  </div>
                  {/* Atalhos rápidos */}
                  <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:5}}>
                    {[
                      { l:'Este mês', calc:()=>{ const n=new Date(); const y=n.getFullYear(),m=String(n.getMonth()+1).padStart(2,'0'); return {de:`${y}-${m}-01`,ate:`${y}-${m}-31`} } },
                      { l:'Mês passado', calc:()=>{ const n=new Date(new Date().getFullYear(),new Date().getMonth()-1,1); const y=n.getFullYear(),m=String(n.getMonth()+1).padStart(2,'0'); return {de:`${y}-${m}-01`,ate:`${y}-${m}-31`} } },
                      { l:'Este ano', calc:()=>{ const y=new Date().getFullYear(); return {de:`${y}-01-01`,ate:`${y}-12-31`} } },
                      { l:'Limpar', calc:()=>({de:'',ate:''}) },
                    ].map(s=>(
                      <button key={s.l} onClick={()=>{ const r=s.calc(); upd({periodo:{...d.periodo,...r}}) }}
                        style={{fontSize:9,padding:'2px 6px',border:'1px solid var(--border)',borderRadius:4,background:'var(--surface)',cursor:'pointer',color:'var(--text-muted)',fontFamily:'var(--font)'}}>
                        {s.l}
                      </button>
                    ))}
                  </div>
                </>)}
              </div>

              {/* Níveis de agrupamento (multi-nível) */}
              {(() => {
                const nivelAtual = d.camposAgrupadores?.length
                  ? d.camposAgrupadores
                  : d.campoAgrupador
                    ? [{ campo: d.campoAgrupador, granularidade: d.granularidade || 'nenhuma' }]
                    : []
                const isDateField = (campo) => {
                  const f = source.fields.find(f=>f.key===campo)
                  return f && (f.type==='date'||campo.includes('_at')||campo.includes('mes')||campo.includes('semana')||campo.includes('created'))
                }
                const GRAN_OPTS = [
                  {v:'nenhuma',l:'Bruto'},{v:'dia',l:'Dia'},{v:'dia_semana',l:'Dia sem.'},
                  {v:'semana',l:'Semana'},{v:'mes',l:'Mês'},{v:'trimestre',l:'Trim.'},{v:'ano',l:'Ano'},
                ]
                const setNiveis = (novos) => upd({ camposAgrupadores: novos, campoAgrupador: novos[0]?.campo || '', granularidade: novos[0]?.granularidade || 'nenhuma' })
                return (
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <span style={lbl}>Agrupar por (níveis)</span>
                      <button onClick={()=>setNiveis([...nivelAtual,{campo:'',granularidade:'nenhuma'}])}
                        style={{fontSize:10,padding:'2px 7px',border:'1px solid var(--accent)',borderRadius:4,background:'none',cursor:'pointer',color:'var(--accent)',fontFamily:'var(--font)'}}>+ Nível</button>
                    </div>
                    {nivelAtual.map((niv, ni) => (
                      <div key={ni} style={{border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',marginBottom:6,background:'var(--surface2)'}}>
                        <div style={{display:'flex',gap:4,alignItems:'center',marginBottom:isDateField(niv.campo)?4:0}}>
                          <span style={{fontSize:9,color:'var(--text-muted)',flexShrink:0,fontWeight:700}}>N{ni+1}</span>
                          <select style={{...inp,flex:1}} value={niv.campo||''} onChange={e=>{
                            const novos=[...nivelAtual]; novos[ni]={campo:e.target.value,granularidade:'nenhuma'}; setNiveis(novos)
                          }}>
                            <option value="">— campo —</option>
                            {source.fields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                          </select>
                          {nivelAtual.length > 1 && (
                            <button onClick={()=>setNiveis(nivelAtual.filter((_,i)=>i!==ni))}
                              style={{padding:'3px 6px',border:'1px solid #fca5a5',borderRadius:4,background:'none',cursor:'pointer',color:'#ef4444',fontSize:11,fontFamily:'var(--font)'}}>✕</button>
                          )}
                        </div>
                        {niv.campo && isDateField(niv.campo) && (
                          <div style={{display:'flex',flexWrap:'wrap',gap:2,marginTop:2}}>
                            {GRAN_OPTS.map(g=>(
                              <button key={g.v} onClick={()=>{const novos=[...nivelAtual];novos[ni]={...niv,granularidade:g.v};setNiveis(novos)}}
                                style={{fontSize:9,padding:'2px 5px',border:`1px solid ${(niv.granularidade||'nenhuma')===g.v?'var(--accent)':'var(--border)'}`,borderRadius:4,
                                  background:(niv.granularidade||'nenhuma')===g.v?'var(--accent)11':'none',
                                  cursor:'pointer',color:(niv.granularidade||'nenhuma')===g.v?'var(--accent)':'var(--text-muted)',fontFamily:'var(--font)'}}>
                                {g.l}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {!nivelAtual.length && (
                      <div style={{fontSize:11,color:'var(--text-muted)',textAlign:'center',padding:'6px 0'}}>Clique em + Nível para começar</div>
                    )}
                  </div>
                )
              })()}

              <div>
                <label style={lbl}>Ordenação</label>
                <select style={inp} value={d.ordenar||'valor_desc'} onChange={e=>upd({ordenar:e.target.value})}>
                  <option value="valor_desc">Maior primeiro</option>
                  <option value="valor_asc">Menor primeiro</option>
                  <option value="grupo_asc">Alfabética</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Limite de linhas</label>
                <input type="number" style={inp} min={1} max={200} value={d.limite||20} onChange={e=>upd({limite:Number(e.target.value)})}/>
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={lbl}>Colunas de métricas</span>
                  <button onClick={()=>{
                    const cols = d.colunas||[]
                    upd({colunas:[...cols,{id:`c${Date.now()}`,tipo:'count',label:'Qtd',campo:''}]})
                  }} style={{fontSize:10,padding:'2px 7px',border:'1px solid var(--accent)',borderRadius:4,background:'none',cursor:'pointer',color:'var(--accent)',fontFamily:'var(--font)'}}>+ Coluna</button>
                </div>
                {(d.colunas||[]).map((col,ci)=>(
                  <div key={col.id} style={{border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',marginBottom:6,background:'var(--surface2)'}}>
                    <div style={{display:'flex',gap:4,marginBottom:4}}>
                      <input style={{...inp,flex:1}} placeholder="Label" value={col.label||''} onChange={e=>{
                        const cols=[...(d.colunas||[])]; cols[ci]={...col,label:e.target.value}; upd({colunas:cols})
                      }}/>
                      <button onClick={()=>{const cols=(d.colunas||[]).filter((_,i)=>i!==ci);upd({colunas:cols})}}
                        style={{padding:'4px 7px',border:'1px solid #fca5a5',borderRadius:5,background:'none',cursor:'pointer',color:'#ef4444',fontSize:12,fontFamily:'var(--font)'}}>✕</button>
                    </div>
                    <select style={{...inp,marginBottom:4}} value={col.tipo||'count'} onChange={e=>{
                      const cols=[...(d.colunas||[])]; cols[ci]={...col,tipo:e.target.value}; upd({colunas:cols})
                    }}>
                      <optgroup label="Métricas simples">
                        <option value="count">Qtd (COUNT)</option>
                        <option value="sum">Soma (SUM)</option>
                        <option value="avg">Média (AVG)</option>
                      </optgroup>
                      <optgroup label="Percentuais">
                        <option value="pct_total">% do Total geral</option>
                        <option value="pct_group">% do Grupo (com filtro)</option>
                        <option value="pct_parent">% do Grupo Pai</option>
                        <option value="pct_prev">% Conversão (vs anterior)</option>
                      </optgroup>
                      <optgroup label="Pivot">
                        <option value="dimensao">Por Dimensão (pivot automático)</option>
                      </optgroup>
                    </select>

                    {/* Pivot por dimensão */}
                    {col.tipo === 'dimensao' && (<>
                      <label style={{...lbl,marginTop:2}}>Campo da dimensão</label>
                      <select style={{...inp,marginBottom:4}} value={col.campo||''} onChange={e=>{
                        const cols=[...(d.colunas||[])]; cols[ci]={...col,campo:e.target.value}; upd({colunas:cols})
                      }}>
                        <option value="">— selecione o campo —</option>
                        {source.fields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                      <label style={lbl}>Métrica por valor</label>
                      <select style={{...inp,marginBottom:4}} value={col.metrica||'count'} onChange={e=>{
                        const cols=[...(d.colunas||[])]; cols[ci]={...col,metrica:e.target.value}; upd({colunas:cols})
                      }}>
                        <option value="count">Qtd (COUNT)</option>
                        <option value="sum">Soma (SUM)</option>
                        <option value="avg">Média (AVG)</option>
                        <option value="pct_group">% do Grupo</option>
                        <option value="pct_parent">% do Grupo Pai</option>
                        <option value="pct_total">% do Total</option>
                      </select>
                      {['sum','avg'].includes(col.metrica) && (
                        <select style={{...inp,marginBottom:4}} value={col.campoDado||''} onChange={e=>{
                          const cols=[...(d.colunas||[])]; cols[ci]={...col,campoDado:e.target.value,campo_num:e.target.value}; upd({colunas:cols})
                        }}>
                          <option value="">— campo numérico —</option>
                          {source.fields.filter(f=>f.type==='number').map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                      )}
                      <div style={{fontSize:9,color:'var(--text-muted)',background:'var(--surface)',borderRadius:4,padding:'4px 6px',marginTop:2}}>
                        Gera 1 coluna por valor único do campo selecionado
                      </div>
                    </>)}

                    {col.tipo !== 'dimensao' && (<>
                      {['sum','avg'].includes(col.tipo) && (
                        <select style={{...inp,marginBottom:4}} value={col.campo||''} onChange={e=>{
                          const cols=[...(d.colunas||[])]; cols[ci]={...col,campo:e.target.value}; upd({colunas:cols})
                        }}>
                          <option value="">— campo numérico —</option>
                          {source.fields.filter(f=>f.type==='number').map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                      )}
                      {/* Filtro embutido na coluna */}
                      <div style={{display:'flex',gap:4,alignItems:'center',marginTop:2}}>
                        <select style={{...inp,flex:1,fontSize:10}} value={col.filtro?.campo||''} onChange={e=>{
                          const cols=[...(d.colunas||[])]; cols[ci]={...col,filtro:{...(col.filtro||{}),campo:e.target.value,valor:''}}; upd({colunas:cols})
                        }}>
                          <option value="">sem filtro</option>
                          {source.fields.filter(f=>f.type==='text').map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                        {col.filtro?.campo && (
                          <input style={{...inp,flex:1,fontSize:10}} placeholder="valor" value={col.filtro?.valor||''} onChange={e=>{
                            const cols=[...(d.colunas||[])]; cols[ci]={...col,filtro:{...col.filtro,valor:e.target.value}}; upd({colunas:cols})
                          }}/>
                        )}
                      </div>
                    </>)}
                  </div>
                ))}
              </div>
              <div>
                <label style={lbl}>Título</label>
                <input style={inp} value={d.titulo||''} onChange={e=>upd({titulo:e.target.value})}/>
              </div>
            </div>
          )}

          {/* Conteúdo texto/forma */}
          {['texto','forma'].includes(el.tipo) && (
            <div>
              <label style={lbl}>{el.tipo==='forma'?'Texto interno':'Conteúdo'}</label>
              <textarea style={{...inp,resize:'vertical',lineHeight:1.6,minHeight:64}} value={d.conteudo||''} onChange={e=>upd({conteudo:e.target.value})}/>
              {/* Variáveis disponíveis em modo proposta */}
              {mode==='proposta' && el.tipo==='texto' && (
                <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:2}}>
                  <div style={{fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>Inserir variável</div>
                  {[
                    {tag:'{{produto}}',   label:'Produto',       val: projetoData?.produto || ''},
                    {tag:'{{data}}',      label:'Data atual',    val: new Date().toLocaleDateString('pt-BR')},
                    {tag:'{{empresa}}',   label:'Empresa',       val: projetoData?.empresa || projetoData?.nome || ''},
                    {tag:'{{nome_proposta}}', label:'Nome da proposta', val: projetoData?.nome || ''},
                    {tag:'{{investimento}}', label:'Investimento', val: projetoData?.investimento ? `R$ ${Number(projetoData.investimento).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : ''},
                  ].map(v=>(
                    <button key={v.tag} onClick={()=>upd({conteudo:(d.conteudo||'')+v.tag})}
                      style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'3px 7px',border:'1px solid var(--border)',borderRadius:4,background:'var(--surface2)',fontSize:10,cursor:'pointer',fontFamily:'var(--font)',textAlign:'left',gap:6}}>
                      <span style={{color:'var(--accent)',fontFamily:'monospace',fontWeight:700}}>{v.tag}</span>
                      {v.val && <span style={{color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:80}}>{v.val}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rótulos de dados — gráficos */}
          {el.tipo === 'grafico' && (
            <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}>
              <label style={{...lbl,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                Rótulos de dados
                <label style={{display:'flex',alignItems:'center',gap:5,fontWeight:400,textTransform:'none',letterSpacing:0,cursor:'pointer'}}>
                  <input type="checkbox" checked={!!d.rotulos?.ativo} style={{accentColor:'var(--accent)'}}
                    onChange={e=>upd({rotulos:{...(d.rotulos||{}),ativo:e.target.checked}})}/>
                  <span style={{fontSize:11,color:'var(--text-soft)'}}>Exibir</span>
                </label>
              </label>
              {d.rotulos?.ativo && (<>
                <label style={{...lbl,marginTop:6}}>Formato</label>
                <select style={inp} value={d.rotulos?.formato||'valor'} onChange={e=>upd({rotulos:{...d.rotulos,formato:e.target.value}})}>
                  <option value="valor">Valor (ex: 1.234)</option>
                  <option value="valor_inteiro">Valor inteiro (ex: 1234)</option>
                  <option value="pct_inteiro">% inteiro (ex: 42%)</option>
                  <option value="pct">% decimal (ex: 42.3%)</option>
                </select>
                {(d.tipoGrafico||'bar') === 'bar' && (<>
                  <label style={{...lbl,marginTop:6}}>Posição</label>
                  <select style={inp} value={d.rotulos?.posicao||'acima'} onChange={e=>upd({rotulos:{...d.rotulos,posicao:e.target.value}})}>
                    <option value="acima">Acima da barra</option>
                    <option value="dentro">Dentro da barra</option>
                    <option value="eixo">Linhas de grade + valores no eixo</option>
                  </select>
                </>)}
                {(d.tipoGrafico||'bar') === 'pie' && (
                  <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-soft)',cursor:'pointer',marginTop:6}}>
                    <input type="checkbox" checked={d.rotulos?.legenda !== false} style={{accentColor:'var(--accent)'}}
                      onChange={e=>upd({rotulos:{...d.rotulos,legenda:e.target.checked}})}/>
                    Mostrar legenda
                  </label>
                )}
                <div style={{display:'flex',gap:6,marginTop:6}}>
                  <div style={{flex:1}}>
                    <label style={lbl}>Tamanho (px)</label>
                    <input type="number" style={inp} min={6} max={16} value={d.rotulos?.tamanho||9}
                      onChange={e=>upd({rotulos:{...d.rotulos,tamanho:Number(e.target.value)}})}/>
                  </div>
                  <div style={{flex:1}}>
                    <label style={lbl}>Cor</label>
                    <input type="color" value={d.rotulos?.cor||'#52525b'}
                      onChange={e=>upd({rotulos:{...d.rotulos,cor:e.target.value}})}
                      style={{width:'100%',height:28,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/>
                  </div>
                </div>
              </>)}
            </div>
          )}

          {/* Título */}
          {['kpi','grafico'].includes(el.tipo) && (
            <div>
              <label style={lbl}>Título</label>
              <input style={inp} value={d.titulo||''} onChange={e=>upd({titulo:e.target.value})}/>
            </div>
          )}

          {/* Prefixo/sufixo KPI */}
          {el.tipo==='kpi' && (
            <div style={{display:'flex',gap:6}}>
              <div style={{flex:1}}>
                <label style={lbl}>Prefixo</label>
                <input style={inp} placeholder="R$" value={d.prefixo||''} onChange={e=>upd({prefixo:e.target.value})}/>
              </div>
              <div style={{flex:1}}>
                <label style={lbl}>Sufixo</label>
                <input style={inp} placeholder="%  h" value={d.sufixo||''} onChange={e=>upd({sufixo:e.target.value})}/>
              </div>
            </div>
          )}

          {/* Aparência do card KPI */}
          {el.tipo==='kpi' && (
            <div>
              <label style={lbl}>Cantos arredondados (px)</label>
              <input type="range" min={0} max={24} step={1} value={d.raio??0}
                onChange={e=>upd({raio:Number(e.target.value)})}
                style={{width:'100%',accentColor:'var(--accent)'}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--text-muted)',marginTop:2}}>
                <span>0</span><span style={{fontWeight:600,color:'var(--accent)'}}>{d.raio??0}px</span><span>24</span>
              </div>
              <label style={{...lbl,marginTop:8}}>Cor de fundo do card</label>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <input type="color" value={d.corFundo||'#EFF6FF'} onChange={e=>upd({corFundo:e.target.value})}
                  style={{width:32,height:28,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/>
                <button onClick={()=>upd({corFundo:'transparent'})}
                  style={{fontSize:10,padding:'4px 8px',border:'1px solid var(--border)',borderRadius:5,background:'none',cursor:'pointer',color:'var(--text-muted)',fontFamily:'var(--font)'}}>
                  Transparente
                </button>
                <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer',marginLeft:'auto'}}>
                  <input type="checkbox" checked={!!d.bordaAtiva} style={{accentColor:'var(--accent)'}}
                    onChange={e=>upd({bordaAtiva:e.target.checked})}/> Borda
                </label>
              </div>
            </div>
          )}

          {/* Tamanho texto */}
          {['texto','forma','variavel'].includes(el.tipo) && (
            <div>
              <label style={lbl}>Tamanho da fonte</label>
              <input type="number" style={inp} min={8} max={72} value={d.tamanhoFonte||14} onChange={e=>upd({tamanhoFonte:Number(e.target.value)})}/>
              <div style={{display:'flex',gap:6,marginTop:6}}>
                <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer'}}>
                  <input type="checkbox" checked={!!d.negrito} style={{accentColor:'var(--accent)'}} onChange={e=>upd({negrito:e.target.checked})}/> Negrito
                </label>
                {el.tipo==='texto' && (
                  <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer'}}>
                    <input type="checkbox" checked={!!d.italico} style={{accentColor:'var(--accent)'}} onChange={e=>upd({italico:e.target.checked})}/> Itálico
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Alinhamento texto */}
          {['texto','variavel'].includes(el.tipo) && (
            <div>
              <label style={lbl}>Alinhamento</label>
              <div style={{display:'flex',gap:4}}>
                {['left','center','right'].map(a=>(
                  <button key={a} onClick={()=>upd({alinhamento:a})}
                    style={{flex:1,padding:'4px 0',fontSize:11,border:`1.5px solid ${(d.alinhamento||'left')===a?'var(--accent)':'var(--border)'}`,borderRadius:5,background:(d.alinhamento||'left')===a?'var(--accent)11':'none',cursor:'pointer',fontFamily:'var(--font)'}}>
                    {a==='left'?'⊞ Esq':a==='center'?'⊟ Cen':'⊡ Dir'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divisor */}
          {el.tipo==='divisor' && (
            <div>
              <label style={lbl}>Espessura (px)</label>
              <input type="number" style={inp} min={1} max={10} value={d.espessura||1} onChange={e=>upd({espessura:Number(e.target.value)})}/>
              <label style={{...lbl,marginTop:8}}>Estilo</label>
              <select style={inp} value={d.estilo||'solid'} onChange={e=>upd({estilo:e.target.value})}>
                <option value="solid">Sólido</option>
                <option value="dashed">Tracejado</option>
                <option value="dotted">Pontilhado</option>
              </select>
            </div>
          )}

          {/* Forma */}
          {el.tipo==='forma' && (
            <div>
              <label style={lbl}>Tipo</label>
              <div style={{display:'flex',gap:4}}>
                {[{v:'retangulo',l:'Retângulo'},{v:'circulo',l:'Círculo'}].map(t=>(
                  <button key={t.v} onClick={()=>upd({tipoForma:t.v})}
                    style={{flex:1,padding:'5px 0',fontSize:10,border:`1.5px solid ${(d.tipoForma||'retangulo')===t.v?'var(--accent)':'var(--border)'}`,borderRadius:5,background:(d.tipoForma||'retangulo')===t.v?'var(--accent)11':'none',cursor:'pointer',fontFamily:'var(--font)'}}>
                    {t.l}
                  </button>
                ))}
              </div>
              <label style={{...lbl,marginTop:8}}>Cor de fundo</label>
              <input type="color" value={d.corFundo||'#EFF6FF'} onChange={e=>upd({corFundo:e.target.value})} style={{width:'100%',height:32,border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',padding:2}}/>
              <label style={{...lbl,marginTop:8}}>Raio da borda (px)</label>
              <input type="number" style={inp} min={0} max={100} value={d.raio||6} onChange={e=>upd({raio:Number(e.target.value)})}/>
            </div>
          )}

          {/* Imagem */}
          {el.tipo==='imagem' && (
            <div>
              <label style={lbl}>URL da imagem</label>
              <input style={inp} placeholder="https://…" value={d.url||''} onChange={e=>upd({url:e.target.value})}/>
              <label style={{...lbl,marginTop:8}}>Ou envie um arquivo</label>
              <input type="file" accept="image/*"
                style={{fontSize:11,color:'var(--text-muted)',width:'100%'}}
                onChange={e=>{
                  const f=e.target.files?.[0]
                  if(!f) return
                  const reader=new FileReader()
                  reader.onload=ev=>upd({url:ev.target.result})
                  reader.readAsDataURL(f)
                }}/>
              <label style={{...lbl,marginTop:8}}>Ajuste da imagem</label>
              <div style={{display:'flex',gap:4}}>
                {[{v:'cover',l:'Cobrir'},{v:'contain',l:'Conter'},{v:'fill',l:'Esticar'}].map(t=>(
                  <button key={t.v} onClick={()=>upd({fit:t.v})}
                    style={{flex:1,padding:'4px 0',fontSize:10,border:`1.5px solid ${(d.fit||'cover')===t.v?'var(--accent)':'var(--border)'}`,borderRadius:5,background:(d.fit||'cover')===t.v?'var(--accent)11':'none',cursor:'pointer',fontFamily:'var(--font)',color:(d.fit||'cover')===t.v?'var(--accent)':'var(--text-muted)'}}>
                    {t.l}
                  </button>
                ))}
              </div>
              <label style={{...lbl,marginTop:8}}>Cantos arredondados</label>
              <input type="range" min={0} max={32} step={1} value={d.raio??0}
                onChange={e=>upd({raio:Number(e.target.value)})}
                style={{width:'100%',accentColor:'var(--accent)'}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--text-muted)',marginTop:1}}>
                <span>0</span><span style={{fontWeight:600,color:'var(--accent)'}}>{d.raio??0}px</span><span>32</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8}}>
                <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,cursor:'pointer'}}>
                  <input type="checkbox" checked={!!d.bordaAtiva} style={{accentColor:'var(--accent)'}}
                    onChange={e=>upd({bordaAtiva:e.target.checked})}/> Borda
                </label>
                {d.bordaAtiva && (
                  <input type="color" value={d.corBorda||'#d4d4d8'} onChange={e=>upd({corBorda:e.target.value})}
                    style={{width:28,height:24,border:'1px solid var(--border)',borderRadius:4,cursor:'pointer',padding:1,marginLeft:'auto'}}/>
                )}
              </div>
            </div>
          )}

          {/* Variável — conteúdo com tags */}
          {el.tipo==='variavel' && (
            <div>
              <label style={lbl}>Conteúdo</label>
              <textarea style={{...inp,resize:'vertical',lineHeight:1.6,minHeight:72}} value={d.conteudo||''} onChange={e=>upd({conteudo:e.target.value})}/>
              <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:2}}>
                <div style={{fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>Variáveis disponíveis</div>
                {['{{produto}}','{{data}}','{{empresa}}','{{nome_proposta}}','{{investimento}}'].map(v=>(
                  <button key={v} onClick={()=>upd({conteudo:(d.conteudo||'')+v})}
                    style={{textAlign:'left',padding:'3px 6px',border:'1px solid var(--border)',borderRadius:4,background:'var(--surface2)',fontSize:10,cursor:'pointer',fontFamily:'monospace',color:'var(--accent)',fontWeight:600}}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Escopo / Investimento — título e cor */}
          {['escopo','investimento'].includes(el.tipo) && (
            <div>
              <label style={lbl}>Título do bloco</label>
              <input style={inp} value={d.titulo||''} onChange={e=>upd({titulo:e.target.value})}/>
            </div>
          )}

          {/* Cor */}
          {!['tabela','divisor','imagem'].includes(el.tipo) && (
            <div>
              <label style={lbl}>Cor principal</label>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {CORES_PRESET.map(c=>(
                  <button key={c} onClick={()=>upd({cor:c})}
                    style={{width:22,height:22,borderRadius:5,background:c,border:`2.5px solid ${d.cor===c?'var(--text)':'transparent'}`,cursor:'pointer',flexShrink:0}}/>
                ))}
                <input type="color" value={d.cor||'#2563EB'} onChange={e=>upd({cor:e.target.value})} style={{width:22,height:22,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/>
              </div>
            </div>
          )}

          {/* Dimensões do elemento */}
          <div>
            <label style={lbl}>Posição &amp; tamanho</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
              {[['x','X'],['y','Y'],['w','Larg.'],['h','Alt.']].map(([k,l])=>(
                <div key={k}>
                  <label style={{fontSize:9,color:'var(--text-muted)',marginBottom:1,display:'block'}}>{l}</label>
                  <input type="number" style={{...inp,fontSize:11}} value={Math.round(el[k])||0}
                    onChange={e=>onChange({...el,[k]:Number(e.target.value)})}/>
                </div>
              ))}
            </div>
          </div>

          {/* Excluir elemento */}
          <button onClick={onDelete}
            style={{marginTop:4,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'7px',border:'1px solid #FCA5A5',borderRadius:7,background:'#FFF5F5',color:'#DC2626',cursor:'pointer',fontSize:12,fontFamily:'var(--font)'}}>
            <Trash2 size={13}/> Excluir elemento
          </button>
        </>)}

        {/* ── Aba Página ── */}
        {aba==='pag' && config && (<>

          {/* Tamanho de página */}
          <div>
            <label style={lbl}>Tamanho da página</label>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              {Object.entries(PAGE_SIZES).map(([key,ps])=>(
                <button key={key} onClick={()=>onConfigChange({...config,tamanhoPagina:key})}
                  style={{padding:'6px 10px',border:`1.5px solid ${(config.tamanhoPagina||'A4')===key?'var(--accent)':'var(--border)'}`,borderRadius:6,background:(config.tamanhoPagina||'A4')===key?'var(--accent)10':'none',cursor:'pointer',textAlign:'left',fontFamily:'var(--font)',display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontWeight:700,fontSize:12,color:(config.tamanhoPagina||'A4')===key?'var(--accent)':'var(--text-soft)',minWidth:40}}>{key}</span>
                  <span style={{fontSize:10,color:'var(--text-muted)'}}>{ps.label.split('·')[1]?.trim()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fundo da página */}
          <div>
            <label style={lbl}>Fundo da página</label>
            <div style={{display:'flex',gap:4,marginBottom:6}}>
              {['cor','gradiente'].map(t=>(
                <button key={t} onClick={()=>onConfigChange({...config,fundoPagina:{...config.fundoPagina,tipo:t}})}
                  style={{flex:1,padding:'5px 0',fontSize:10,border:`1.5px solid ${(config.fundoPagina?.tipo||'cor')===t?'var(--accent)':'var(--border)'}`,borderRadius:5,background:(config.fundoPagina?.tipo||'cor')===t?'var(--accent)11':'none',cursor:'pointer',fontFamily:'var(--font)',color:(config.fundoPagina?.tipo||'cor')===t?'var(--accent)':'var(--text-muted)'}}>
                  {t==='cor'?'Cor sólida':'Gradiente'}
                </button>
              ))}
            </div>
            {(config.fundoPagina?.tipo||'cor')==='cor' ? (
              <input type="color" value={config.fundoPagina?.cor||'#ffffff'}
                onChange={e=>onConfigChange({...config,fundoPagina:{...config.fundoPagina,cor:e.target.value}})}
                style={{width:'100%',height:32,border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',padding:2}}/>
            ) : (<>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:4}}>
                <div><label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:2}}>Cor 1</label>
                  <input type="color" value={config.fundoPagina?.gradiente?.cor1||'#f0f4ff'}
                    onChange={e=>onConfigChange({...config,fundoPagina:{...config.fundoPagina,gradiente:{...config.fundoPagina?.gradiente,cor1:e.target.value}}})}
                    style={{width:'100%',height:28,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/></div>
                <div><label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:2}}>Cor 2</label>
                  <input type="color" value={config.fundoPagina?.gradiente?.cor2||'#ffffff'}
                    onChange={e=>onConfigChange({...config,fundoPagina:{...config.fundoPagina,gradiente:{...config.fundoPagina?.gradiente,cor2:e.target.value}}})}
                    style={{width:'100%',height:28,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/></div>
              </div>
              <label style={{...lbl}}>Ângulo</label>
              <input type="range" min={0} max={360} step={15} value={config.fundoPagina?.gradiente?.angulo||180}
                onChange={e=>onConfigChange({...config,fundoPagina:{...config.fundoPagina,gradiente:{...config.fundoPagina?.gradiente,angulo:Number(e.target.value)}}})}
                style={{width:'100%',accentColor:'var(--accent)'}}/>
              <div style={{fontSize:9,color:'var(--text-muted)',textAlign:'center'}}>{config.fundoPagina?.gradiente?.angulo||180}°</div>
            </>)}
          </div>

          {/* Margens */}
          <div>
            <label style={lbl}>Margens (px)</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
              {[['top','Topo'],['right','Dir.'],['bottom','Base'],['left','Esq.']].map(([k,l])=>(
                <div key={k}>
                  <label style={{fontSize:9,color:'var(--text-muted)',marginBottom:1,display:'block'}}>{l}</label>
                  <input type="number" style={{...inp,fontSize:11}} min={0} max={200} value={config.margens?.[k]||76}
                    onChange={e=>onConfigChange({...config,margens:{...config.margens,[k]:Number(e.target.value)}})}/>
                </div>
              ))}
            </div>
          </div>

          {/* Cabeçalho */}
          <div>
            <label style={{...lbl,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              Cabeçalho
              <input type="checkbox" checked={!!config.cabecalho?.ativo} style={{accentColor:'var(--accent)'}}
                onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,ativo:e.target.checked}})}/>
            </label>
            {config.cabecalho?.ativo && (<>
              <div style={{display:'flex',gap:3,marginBottom:6,marginTop:4}}>
                {[['cor','Cor'],['gradiente','Gradiente'],['imagem','Imagem']].map(([t,l])=>(
                  <button key={t} onClick={()=>onConfigChange({...config,cabecalho:{...config.cabecalho,tipoFundo:t}})}
                    style={{flex:1,padding:'4px 0',fontSize:10,border:`1.5px solid ${(config.cabecalho?.tipoFundo||'cor')===t?'var(--accent)':'var(--border)'}`,borderRadius:5,background:(config.cabecalho?.tipoFundo||'cor')===t?'var(--accent)11':'none',cursor:'pointer',fontFamily:'var(--font)',color:(config.cabecalho?.tipoFundo||'cor')===t?'var(--accent)':'var(--text-muted)'}}>
                    {l}
                  </button>
                ))}
              </div>
              {(config.cabecalho?.tipoFundo||'cor')==='cor' && (
                <input type="color" value={config.cabecalho?.corFundo||'#1E3A5F'}
                  onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,corFundo:e.target.value}})}
                  style={{width:'100%',height:32,border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',padding:2}}/>
              )}
              {(config.cabecalho?.tipoFundo||'cor')==='gradiente' && (<>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:4}}>
                  <div><label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:2}}>Cor 1</label>
                    <input type="color" value={config.cabecalho?.gradiente?.cor1||'#1E3A5F'}
                      onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,gradiente:{...config.cabecalho?.gradiente,cor1:e.target.value}}})}
                      style={{width:'100%',height:28,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/></div>
                  <div><label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:2}}>Cor 2</label>
                    <input type="color" value={config.cabecalho?.gradiente?.cor2||'#2563EB'}
                      onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,gradiente:{...config.cabecalho?.gradiente,cor2:e.target.value}}})}
                      style={{width:'100%',height:28,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/></div>
                </div>
                <label style={{...lbl}}>Ângulo</label>
                <input type="range" min={0} max={360} step={15} value={config.cabecalho?.gradiente?.angulo||135}
                  onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,gradiente:{...config.cabecalho?.gradiente,angulo:Number(e.target.value)}}})}
                  style={{width:'100%',accentColor:'var(--accent)'}}/>
                <div style={{fontSize:9,color:'var(--text-muted)',textAlign:'center'}}>{config.cabecalho?.gradiente?.angulo||135}°</div>
              </>)}
              {config.cabecalho?.tipoFundo==='imagem' && (<>
                <label style={{...lbl}}>URL da imagem</label>
                <input style={inp} placeholder="https://…" value={config.cabecalho?.imagemUrl||''}
                  onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,imagemUrl:e.target.value}})}/>
                <label style={{...lbl,marginTop:6}}>Ou envie um arquivo</label>
                <input type="file" accept="image/*" style={{fontSize:11,color:'var(--text-muted)',width:'100%'}}
                  onChange={e=>{
                    const f=e.target.files?.[0]; if(!f) return
                    const r=new FileReader(); r.onload=ev=>onConfigChange({...config,cabecalho:{...config.cabecalho,imagemUrl:ev.target.result}}); r.readAsDataURL(f)
                  }}/>
                <label style={{...lbl,marginTop:6}}>Ajuste</label>
                <select style={inp} value={config.cabecalho?.imagemAjuste||'cover'}
                  onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,imagemAjuste:e.target.value}})}>
                  <option value="cover">Cobrir (cover)</option>
                  <option value="contain">Conter (contain)</option>
                  <option value="100% 100%">Esticar</option>
                  <option value="auto">Original</option>
                </select>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}>
                  <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,cursor:'pointer'}}>
                    <input type="checkbox" checked={!!config.cabecalho?.imagemOverlay} style={{accentColor:'var(--accent)'}}
                      onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,imagemOverlay:e.target.checked}})}/> Overlay escuro
                  </label>
                  {config.cabecalho?.imagemOverlay && (
                    <input type="range" min={0} max={0.8} step={0.05} value={config.cabecalho?.imagemOpacidade??0.35}
                      onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,imagemOpacidade:Number(e.target.value)}})}
                      style={{flex:1,accentColor:'var(--accent)'}}/>
                  )}
                </div>
              </>)}
              <label style={{...lbl,marginTop:6}}>Título</label>
              <input style={inp} value={config.cabecalho?.titulo||''} placeholder="Nome do documento ou empresa…"
                onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,titulo:e.target.value}})}/>
              <label style={{...lbl,marginTop:6}}>Subtítulo</label>
              <input style={inp} value={config.cabecalho?.subtitulo||''} placeholder="Ex: Relatório mensal · Jan 2026"
                onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,subtitulo:e.target.value}})}/>
              <label style={{...lbl,marginTop:6}}>Letra do logo (1–2 chars)</label>
              <input style={inp} maxLength={2} value={config.cabecalho?.logoLetra||''} placeholder="Ex: B"
                onChange={e=>onConfigChange({...config,cabecalho:{...config.cabecalho,logoLetra:e.target.value}})}/>
            </>)}
          </div>

          {/* Rodapé */}
          <div>
            <label style={{...lbl,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              Rodapé
              <input type="checkbox" checked={!!config.rodape?.ativo} style={{accentColor:'var(--accent)'}}
                onChange={e=>onConfigChange({...config,rodape:{...config.rodape,ativo:e.target.checked}})}/>
            </label>
            {config.rodape?.ativo && (<>
              <label style={{...lbl,marginTop:4}}>Texto</label>
              <input style={inp} value={config.rodape?.texto||''} placeholder="Ex: Confidencial"
                onChange={e=>onConfigChange({...config,rodape:{...config.rodape,texto:e.target.value}})}/>
              <label style={{...lbl,marginTop:6}}>Fundo</label>
              <div style={{display:'flex',gap:3,marginBottom:6}}>
                {[['cor','Cor'],['imagem','Imagem']].map(([t,l])=>(
                  <button key={t} onClick={()=>onConfigChange({...config,rodape:{...config.rodape,tipoFundo:t}})}
                    style={{flex:1,padding:'4px 0',fontSize:10,border:`1.5px solid ${(config.rodape?.tipoFundo||'cor')===t?'var(--accent)':'var(--border)'}`,borderRadius:5,background:(config.rodape?.tipoFundo||'cor')===t?'var(--accent)11':'none',cursor:'pointer',fontFamily:'var(--font)',color:(config.rodape?.tipoFundo||'cor')===t?'var(--accent)':'var(--text-muted)'}}>
                    {l}
                  </button>
                ))}
              </div>
              {(config.rodape?.tipoFundo||'cor')==='cor' && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  <div>
                    <label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:2}}>Fundo</label>
                    <input type="color" value={config.rodape?.corFundo||'#f4f4f5'}
                      onChange={e=>onConfigChange({...config,rodape:{...config.rodape,corFundo:e.target.value}})}
                      style={{width:'100%',height:28,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:2}}>Texto</label>
                    <input type="color" value={config.rodape?.corTexto||'#a1a1aa'}
                      onChange={e=>onConfigChange({...config,rodape:{...config.rodape,corTexto:e.target.value}})}
                      style={{width:'100%',height:28,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/>
                  </div>
                </div>
              )}
              {config.rodape?.tipoFundo==='imagem' && (<>
                <label style={{...lbl}}>URL da imagem</label>
                <input style={inp} placeholder="https://…" value={config.rodape?.imagemUrl||''}
                  onChange={e=>onConfigChange({...config,rodape:{...config.rodape,imagemUrl:e.target.value}})}/>
                <label style={{...lbl,marginTop:6}}>Ou envie um arquivo</label>
                <input type="file" accept="image/*" style={{fontSize:11,color:'var(--text-muted)',width:'100%'}}
                  onChange={e=>{
                    const f=e.target.files?.[0]; if(!f) return
                    const r=new FileReader(); r.onload=ev=>onConfigChange({...config,rodape:{...config.rodape,imagemUrl:ev.target.result}}); r.readAsDataURL(f)
                  }}/>
                <label style={{...lbl,marginTop:6}}>Ajuste</label>
                <select style={inp} value={config.rodape?.imagemAjuste||'cover'}
                  onChange={e=>onConfigChange({...config,rodape:{...config.rodape,imagemAjuste:e.target.value}})}>
                  <option value="cover">Cobrir (cover)</option>
                  <option value="contain">Conter (contain)</option>
                  <option value="100% 100%">Esticar</option>
                  <option value="auto">Original</option>
                </select>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}>
                  <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,cursor:'pointer'}}>
                    <input type="checkbox" checked={!!config.rodape?.imagemOverlay} style={{accentColor:'var(--accent)'}}
                      onChange={e=>onConfigChange({...config,rodape:{...config.rodape,imagemOverlay:e.target.checked}})}/> Overlay escuro
                  </label>
                  {config.rodape?.imagemOverlay && (
                    <input type="range" min={0} max={0.8} step={0.05} value={config.rodape?.imagemOpacidade??0.25}
                      onChange={e=>onConfigChange({...config,rodape:{...config.rodape,imagemOpacidade:Number(e.target.value)}})}
                      style={{flex:1,accentColor:'var(--accent)'}}/>
                  )}
                </div>
                <div style={{marginTop:6}}>
                  <label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:2}}>Cor do texto</label>
                  <input type="color" value={config.rodape?.corTexto||'#ffffff'}
                    onChange={e=>onConfigChange({...config,rodape:{...config.rodape,corTexto:e.target.value}})}
                    style={{width:'100%',height:28,border:'1px solid var(--border)',borderRadius:5,cursor:'pointer',padding:1}}/>
                </div>
              </>)}
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-soft)',cursor:'pointer',marginTop:6}}>
                <input type="checkbox" checked={!!config.rodape?.paginacao} style={{accentColor:'var(--accent)'}}
                  onChange={e=>onConfigChange({...config,rodape:{...config.rodape,paginacao:e.target.checked}})}/>
                Mostrar paginação
              </label>
            </>)}
          </div>

          {/* Impressão */}
          <div>
            <label style={lbl}>Impressão</label>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div>
                <label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:3}}>Orientação</label>
                <div style={{display:'flex',gap:4}}>
                  {[['retrato','Retrato'],['paisagem','Paisagem']].map(([v,l])=>(
                    <button key={v} onClick={()=>onConfigChange({...config,impressao:{...config.impressao,orientacao:v}})}
                      style={{flex:1,padding:'5px 0',fontSize:10,border:`1.5px solid ${(config.impressao?.orientacao||'retrato')===v?'var(--accent)':'var(--border)'}`,borderRadius:5,cursor:'pointer',fontFamily:'var(--font)',background:(config.impressao?.orientacao||'retrato')===v?'var(--accent)11':'none',color:(config.impressao?.orientacao||'retrato')===v?'var(--accent)':'var(--text-muted)'}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-soft)',cursor:'pointer'}}>
                <input type="checkbox" checked={config.impressao?.cabecalho!==false} style={{accentColor:'var(--accent)'}}
                  onChange={e=>onConfigChange({...config,impressao:{...config.impressao,cabecalho:e.target.checked}})}/>
                Imprimir cabeçalho
              </label>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-soft)',cursor:'pointer'}}>
                <input type="checkbox" checked={config.impressao?.rodape!==false} style={{accentColor:'var(--accent)'}}
                  onChange={e=>onConfigChange({...config,impressao:{...config.impressao,rodape:e.target.checked}})}/>
                Imprimir rodapé
              </label>
              <div>
                <label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:3}}>Escala (%)</label>
                <input type="number" min={50} max={150} step={5} style={{...inp,width:'80px'}}
                  value={config.impressao?.escala||100}
                  onChange={e=>onConfigChange({...config,impressao:{...config.impressao,escala:Number(e.target.value)}})}/>
              </div>
              <div>
                <label style={{fontSize:9,color:'var(--text-muted)',display:'block',marginBottom:3}}>Nota de rodapé (opcional)</label>
                <input style={inp} placeholder="Ex: Confidencial — uso interno" value={config.impressao?.nota||''}
                  onChange={e=>onConfigChange({...config,impressao:{...config.impressao,nota:e.target.value}})}/>
              </div>
            </div>
          </div>

          {/* Marca d'água */}
          <div>
            <label style={{...lbl,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              Marca d'água
              <input type="checkbox" checked={!!config.marcaDagua?.ativo} style={{accentColor:'var(--accent)'}}
                onChange={e=>onConfigChange({...config,marcaDagua:{...config.marcaDagua,ativo:e.target.checked}})}/>
            </label>
            {config.marcaDagua?.ativo && (<>
              <label style={{...lbl,marginTop:6}}>Texto</label>
              <input style={inp} value={config.marcaDagua?.texto||'RASCUNHO'}
                onChange={e=>onConfigChange({...config,marcaDagua:{...config.marcaDagua,texto:e.target.value}})}/>
              <label style={{...lbl,marginTop:6}}>Opacidade</label>
              <input type="range" min={0.02} max={0.2} step={0.01} value={config.marcaDagua?.opacidade||0.06}
                onChange={e=>onConfigChange({...config,marcaDagua:{...config.marcaDagua,opacidade:Number(e.target.value)}})}
                style={{width:'100%'}}/>
            </>)}
          </div>

        </>)}
      </div>
    </div>
  )
}

// ── Painel de acesso ──────────────────────────────────────────────────────────
function AcessoModal({ relatorio, onSave, onClose }) {
  const [acesso, setAcesso] = useState(relatorio.acesso || 'privado')
  const [papeis, setPapeis] = useState(relatorio.papeis_permitidos || [])

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div style={{background:'var(--surface)',borderRadius:14,padding:28,width:400,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:16}}>Controle de acesso</div>

        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {[
            {v:'privado', icon:<Lock size={14}/>, label:'Privado', desc:'Apenas você pode visualizar'},
            {v:'equipe',  icon:<Users size={14}/>, label:'Por perfil', desc:'Papeis selecionados abaixo'},
            {v:'todos',   icon:<Globe size={14}/>, label:'Todo o tenant', desc:'Qualquer usuário logado'},
          ].map(op=>(
            <button key={op.v} onClick={()=>setAcesso(op.v)}
              style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',border:`1.5px solid ${acesso===op.v?'var(--accent)':'var(--border)'}`,borderRadius:9,background:acesso===op.v?'var(--accent)08':'var(--surface)',cursor:'pointer',textAlign:'left',fontFamily:'var(--font)'}}>
              <div style={{color:acesso===op.v?'var(--accent)':'var(--text-muted)'}}>{op.icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{op.label}</div>
                <div style={{fontSize:11,color:'var(--text-muted)'}}>{op.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {acesso==='equipe' && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Papeis com acesso</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {PAPEIS.map(p=>{
                const sel = papeis.includes(p)
                return (
                  <label key={p} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text-soft)',cursor:'pointer',padding:'4px 0'}}>
                    <input type="checkbox" checked={sel} style={{accentColor:'var(--accent)'}}
                      onChange={()=>setPapeis(sel?papeis.filter(x=>x!==p):[...papeis,p])}/>
                    {p}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'8px 16px',border:'1px solid var(--border)',borderRadius:7,background:'none',color:'var(--text-soft)',fontSize:13,cursor:'pointer',fontFamily:'var(--font)'}}>Cancelar</button>
          <button onClick={()=>onSave({acesso,papeis_permitidos:papeis})}
            style={{padding:'8px 20px',border:'none',borderRadius:7,background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)'}}>
            Salvar acesso
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Canvas Page ───────────────────────────────────────────────────────────────
function CanvasPage({ config, elementos, selecionadoId, onSelect, onDragStart, readOnly }) {
  const mg = config.margens || CONFIG_PADRAO.margens
  const cab = config.cabecalho || CONFIG_PADRAO.cabecalho
  const rod = config.rodape    || CONFIG_PADRAO.rodape
  const mda = config.marcaDagua|| CONFIG_PADRAO.marcaDagua

  const headerH = cab.ativo ? 60 : 0
  const footerH = rod.ativo ? 32 : 0
  const usableTop  = mg.top + headerH
  const usableLeft = mg.left

  return (
    <div style={{
      width:PAGE_W, height:PAGE_H, background:'#fff', position:'relative', flexShrink:0,
      boxShadow:'0 4px 32px rgba(0,0,0,0.18)', overflow:'hidden',
    }}>
      {/* Marca d'água */}
      {mda.ativo && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',zIndex:2}}>
          <span style={{fontSize:72,fontWeight:900,color:'rgba(0,0,0,'+mda.opacidade+')',transform:'rotate(-35deg)',letterSpacing:8,userSelect:'none'}}>
            {mda.texto||'RASCUNHO'}
          </span>
        </div>
      )}

      {/* Cabeçalho */}
      {cab.ativo && (
        <div style={{position:'absolute',top:0,left:0,right:0,height:headerH,background:cab.corFundo||'#1E3A5F',display:'flex',alignItems:'center',padding:'0 '+mg.left+'px',gap:14,zIndex:1}}>
          <div style={{width:32,height:32,background:'rgba(255,255,255,0.9)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{fontSize:12,fontWeight:800,color:cab.corFundo||'#1E3A5F'}}>B</span>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#fff',lineHeight:1.2}}>{cab.titulo||'Boostly'}</div>
            {cab.subtitulo && <div style={{fontSize:10,color:'rgba(255,255,255,0.65)'}}>{cab.subtitulo}</div>}
          </div>
        </div>
      )}

      {/* Margem guide lines */}
      <div style={{position:'absolute',top:mg.top+headerH,left:mg.left,right:mg.right,bottom:mg.bottom+footerH,border:'1px dashed rgba(37,99,235,0.12)',pointerEvents:'none',zIndex:1}}/>

      {/* Elementos */}
      {elementos.map(el => {
        const isSel = el.id === selecionadoId
        return (
          <div key={el.id}
            style={{
              position:'absolute',
              left: usableLeft + el.x,
              top:  usableTop  + el.y,
              width:  el.w, height: el.h,
              border: `1.5px solid ${isSel?'#2563EB':'transparent'}`,
              boxShadow: isSel ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
              cursor: readOnly ? 'default' : 'move',
              overflow:'hidden', boxSizing:'border-box', zIndex:3,
              background: el.tipo==='texto'||el.tipo==='kpi'?'transparent':'transparent',
            }}
            onClick={e=>{ e.stopPropagation(); !readOnly && onSelect(el.id) }}
            onMouseDown={e=>{ e.preventDefault(); !readOnly && onDragStart(e, el) }}
          >
            <RenderEl el={el} source={null} sources={[]}/>
            {isSel && !readOnly && (
              <div style={{position:'absolute',bottom:-5,right:-5,width:10,height:10,background:'#2563EB',border:'2px solid #fff',borderRadius:2,cursor:'se-resize',zIndex:4}}
                onMouseDown={e=>{ e.preventDefault(); e.stopPropagation(); onDragStart(e, el, 'resize') }}/>
            )}
          </div>
        )
      })}

      {/* Rodapé */}
      {rod.ativo && (
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:footerH,background:'#f4f4f5',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 '+mg.left+'px',zIndex:1}}>
          <span style={{fontSize:9,color:'#a1a1aa'}}>{rod.texto||''}</span>
          {rod.paginacao && <span style={{fontSize:9,color:'#a1a1aa'}}>Pág. 1</span>}
        </div>
      )}
    </div>
  )
}

// ── Painel de Filtros lateral ─────────────────────────────────────────────────
function FiltersPanel({ sources, filteredSources, usedSourceIds, filtros, onSet, onClearSource, onClearAll, totalAtivos, parametros, onToggleParametro }) {
  const [collapsed, setCollapsed] = useState({})

  const inp  = { width:'100%', padding:'5px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:11, fontFamily:'var(--font)', outline:'none', boxSizing:'border-box' }
  const lbl  = { fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:3 }
  const sec  = { fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }

  const usedSources = usedSourceIds
    .map(id => sources.find(s => s.id === id))
    .filter(Boolean)

  return (
    <div style={{ width:260, flexShrink:0, borderLeft:'1px solid var(--border)', background:'var(--surface)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>Filtros</div>
          {totalAtivos > 0 && (
            <div style={{ fontSize:10, color:'var(--accent)', marginTop:1 }}>{totalAtivos} filtro{totalAtivos!==1?'s':''} ativo{totalAtivos!==1?'s':''}</div>
          )}
        </div>
        {totalAtivos > 0 && (
          <button onClick={onClearAll}
            style={{ fontSize:10, fontWeight:600, color:'#DC2626', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontFamily:'var(--font)' }}>
            Limpar tudo
          </button>
        )}
      </div>

      {/* Sem fontes em uso */}
      {usedSources.length === 0 && (
        <div style={{ padding:20, fontSize:11, color:'var(--text-muted)', textAlign:'center', lineHeight:1.6 }}>
          Adicione elementos com fonte de dados ao relatório para habilitar filtros.
        </div>
      )}

      {/* Grupos por entidade */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {usedSources.map(src => {
          const sf        = filtros[src.id] || {}
          const isOpen    = !collapsed[src.id]
          const ativos    = Object.values(sf).filter(v => v !== '').length
          const fSrc      = filteredSources.find(s => s.id === src.id)
          const totalFilt = fSrc?.registros.length ?? src.registros.length

          return (
            <div key={src.id} style={{ borderBottom:'1px solid var(--border2)' }}>
              {/* Group header */}
              <button
                onClick={() => setCollapsed(p => ({ ...p, [src.id]: !p[src.id] }))}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textAlign:'left' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:13 }}>{src.icon}</span>
                  <span style={sec}>{src.label}</span>
                  {ativos > 0 && (
                    <span style={{ fontSize:9, fontWeight:700, background:'var(--accent)', color:'#fff', borderRadius:99, padding:'1px 5px' }}>{ativos}</span>
                  )}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>{totalFilt}/{src.registros.length}</span>
                  {isOpen ? <ChevronUp size={12} color="var(--text-muted)"/> : <ChevronDown size={12} color="var(--text-muted)"/>}
                </div>
              </button>

              {isOpen && (
                <div style={{ padding:'0 14px 12px', display:'flex', flexDirection:'column', gap:10 }}>
                  {/* Limpar este grupo */}
                  {ativos > 0 && (
                    <button onClick={() => onClearSource(src.id)}
                      style={{ fontSize:10, color:'#DC2626', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0, fontFamily:'var(--font)' }}>
                      ✕ Limpar filtros de {src.label}
                    </button>
                  )}

                  {src.fields.map(field => {
                    // Valores únicos para campos de texto
                    const uniqueVals = field.type === 'text'
                      ? [...new Set(src.registros.map(r => r[field.key]).filter(v => v && v !== '—'))].sort()
                      : []

                    const isParam = !!(parametros?.[src.id]?.[field.key]?.enabled)
                    const PinIcon = isParam ? Pin : PinOff
                    const fieldLabel = (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={lbl}>{field.label}</span>
                        <button onClick={() => onToggleParametro?.(src.id, field.key, isParam ? null : { label: field.label, type: field.type, sourceLabel: src.label })}
                          title={isParam ? 'Remover parâmetro de impressão' : 'Marcar como parâmetro de impressão'}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 2px', color: isParam ? 'var(--accent)' : 'var(--text-muted)', display:'flex', alignItems:'center' }}>
                          <PinIcon size={11}/>
                        </button>
                      </div>
                    )

                    if (field.type === 'date') {
                      return (
                        <div key={field.key}>
                          {fieldLabel}
                          <div style={{ display:'flex', gap:4 }}>
                            <input type="date" value={sf[`${field.key}_from`]||''} placeholder="De"
                              onChange={e => onSet(src.id, `${field.key}_from`, e.target.value)}
                              style={{ ...inp, flex:1 }}/>
                            <input type="date" value={sf[`${field.key}_to`]||''} placeholder="Até"
                              onChange={e => onSet(src.id, `${field.key}_to`, e.target.value)}
                              style={{ ...inp, flex:1 }}/>
                          </div>
                        </div>
                      )
                    }

                    if (field.type === 'number') {
                      return (
                        <div key={field.key}>
                          {fieldLabel}
                          <div style={{ display:'flex', gap:4 }}>
                            <input type="number" value={sf[`${field.key}_min`]||''} placeholder="Mín"
                              onChange={e => onSet(src.id, `${field.key}_min`, e.target.value)}
                              style={{ ...inp, flex:1 }}/>
                            <input type="number" value={sf[`${field.key}_max`]||''} placeholder="Máx"
                              onChange={e => onSet(src.id, `${field.key}_max`, e.target.value)}
                              style={{ ...inp, flex:1 }}/>
                          </div>
                        </div>
                      )
                    }

                    // Texto: select se poucos valores únicos, input se muitos
                    if (uniqueVals.length > 0 && uniqueVals.length <= 40) {
                      return (
                        <div key={field.key}>
                          {fieldLabel}
                          <select value={sf[field.key]||''} onChange={e => onSet(src.id, field.key, e.target.value)}
                            style={{ ...inp, cursor:'pointer' }}>
                            <option value="">Todos</option>
                            {uniqueVals.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      )
                    }

                    return (
                      <div key={field.key}>
                        {fieldLabel}
                        <input value={sf[field.key]||''} placeholder={`Buscar por ${field.label.toLowerCase()}…`}
                          onChange={e => onSet(src.id, field.key, e.target.value)}
                          style={inp}/>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── CanvasEditor principal ────────────────────────────────────────────────────
export default function CanvasEditor({
  relatorio,       // { id, titulo, tipo, config, elementos, acesso, papeis_permitidos, owner_id }
  onSave,          // async (rel) => { ok, relatorio }
  onBack,          // () => void
  readOnly = false,
  mode = 'relatorio',
  projetoData = null, // { nome, empresa, investimento } — preenche cabeçalho em modo proposta
  initialFiltros = null, // pre-set filters (used for print flow)
  autoPrint = false,     // auto-trigger window.print() after render
}) {
  const { profile } = useProfile()
  const { sources, loading: loadingSources } = useDocumentDataSources()

  const [titulo,      setTitulo]      = useState(relatorio?.titulo || 'Sem título')
  const [elementos,   setElementos]   = useState(relatorio?.elementos || [])
  const [config,      setConfig]      = useState({ ...CONFIG_PADRAO, ...(relatorio?.config || {}) })
  const [acessoData,  setAcessoData]  = useState({ acesso: relatorio?.acesso||'privado', papeis_permitidos: relatorio?.papeis_permitidos||[] })
  const [selecionadoId, setSelecionadoId] = useState(null)
  const [panelVisible,  setPanelVisible]  = useState(true)
  const [saved,       setSaved]       = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [showAcesso,  setShowAcesso]  = useState(false)
  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [zoom,        setZoom]        = useState(0.75)
  const [subPaleta,   setSubPaleta]   = useState(null)
  const [fullScreen,  setFullScreen]  = useState(false)
  const [showFiltros, setShowFiltros] = useState(false)
  // filtros: { [sourceId]: { [fieldKey|fieldKey_from|fieldKey_to|fieldKey_min|fieldKey_max]: string } }
  const [filtros, setFiltros] = useState(initialFiltros || {})

  // filtrosParametro: { [sourceId]: { [fieldKey]: { enabled, label, type, sourceLabel } } }
  // persisted in config so that "save" captures which filters are print params
  const [filtrosParametro, setFiltrosParametro] = useState(relatorio?.config?.filtrosParametro || {})

  const dragging = useRef(null)
  const canvasRef = useRef()

  // auto-print when used in print mode from browse
  useEffect(() => {
    if (autoPrint && !loadingSources) {
      const t = setTimeout(() => { window.print(); if (onBack) onBack() }, 1200)
      return () => clearTimeout(t)
    }
  }, [autoPrint, loadingSources]) // eslint-disable-line

  const selecionado = elementos.find(e => e.id === selecionadoId) || null
  const elSource = selecionado ? sources.find(s => s.id === (selecionado.dados?.sourceId)) : null

  // Fontes com filtros aplicados — genérico para qualquer entidade
  const filteredSources = useMemo(() => {
    if (!Object.keys(filtros).length) return sources
    return sources.map(src => {
      const sf = filtros[src.id]
      if (!sf || !Object.values(sf).some(v => v !== '')) return src
      const regs = src.registros.filter(r => {
        for (const field of src.fields) {
          if (field.type === 'date') {
            const from = sf[`${field.key}_from`]
            const to   = sf[`${field.key}_to`]
            if (from && (r[field.key]||'') < from) return false
            if (to   && (r[field.key]||'') > to)   return false
          } else if (field.type === 'number') {
            const min = sf[`${field.key}_min`]
            const max = sf[`${field.key}_max`]
            if (min !== '' && min !== undefined && Number(r[field.key]||0) < Number(min)) return false
            if (max !== '' && max !== undefined && Number(r[field.key]||0) > Number(max)) return false
          } else {
            const val = sf[field.key]
            if (val && r[field.key] !== val) return false
          }
        }
        return true
      })
      return { ...src, registros: regs }
    })
  }, [sources, filtros])

  // Fontes usadas no relatório atual (para o painel de filtros)
  const usedSourceIds = useMemo(() =>
    [...new Set(elementos.map(e => e.dados?.sourceId).filter(Boolean))],
    [elementos]
  )

  function setSourceFiltro(sourceId, key, value) {
    setFiltros(prev => ({
      ...prev,
      [sourceId]: { ...(prev[sourceId]||{}), [key]: value }
    }))
  }

  function clearSourceFiltro(sourceId) {
    setFiltros(prev => { const n = {...prev}; delete n[sourceId]; return n })
  }

  const totalFiltrosAtivos = useMemo(() =>
    Object.values(filtros).reduce((sum, sf) =>
      sum + Object.values(sf||{}).filter(v => v !== '').length, 0),
    [filtros]
  )

  // Drag to move / resize
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const { id, mode: dm, startX, startY, origX, origY, origW, origH } = dragging.current
      const dx = (e.clientX - startX) / zoom
      const dy = (e.clientY - startY) / zoom
      setElementos(prev => prev.map(el => {
        if (el.id !== id) return el
        if (dm === 'resize') return { ...el, w: Math.max(60, origW + dx), h: Math.max(30, origH + dy) }
        return { ...el, x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) }
      }))
    }
    const onUp = () => { dragging.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [zoom])

  const handleDragStart = useCallback((e, el, dm = 'move') => {
    if (readOnly) return
    setSelecionadoId(el.id)
    setPanelVisible(true)
    dragging.current = { id: el.id, mode: dm, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h }
  }, [readOnly])

  const addEl = useCallback((tipo, presetDados = null, presetH = null) => {
    const mg = config.margens || CONFIG_PADRAO.margens
    const ps = pageSize(config)
    const usableW = ps.w - mg.left - mg.right
    const y = elementos.length ? Math.max(...elementos.map(e=>e.y+e.h)) + 8 : 0
    const defaults = {
      texto:   { w: usableW, h: 60,  dados: { conteudo:'', tamanhoFonte:14, alinhamento:'left', cor:'#18181b' } },
      kpi:     { w: Math.round(usableW/3), h: 100, dados: { titulo:'KPI', metrica:'COUNT', cor:'#2563EB' } },
      grafico: { w: usableW, h: 200, dados: { tipoGrafico:'bar', metrica:'COUNT', titulo:'Gráfico', cor:'#2563EB' } },
      tabela:          { w: usableW, h: 200, dados: { limite:10, campos:[] } },
      tabela_dinamica: { w: usableW, h: 260, dados: { titulo:'Resumo', campoAgrupador:'', colunas:[{id:'c1',tipo:'count',label:'Qtd'}], ordenar:'valor_desc', limite:20 } },
      imagem:  { w: usableW, h: 200, dados: { url:'', fit:'cover', raio:0 } },
      divisor:     { w: usableW, h: 16,  dados: { cor:'#e4e4e7', espessura:1, estilo:'solid' } },
      forma:       { w: 160, h: 80, dados: { tipoForma:'retangulo', cor:'#2563EB', corFundo:'#EFF6FF', raio:8 } },
      variavel:     { w: usableW, h: 60,  dados: { conteudo:'{{produto}}', tamanhoFonte:14, alinhamento:'left', cor:'#18181b' } },
      escopo:       { w: usableW, h: 280, dados: { titulo:'Escopo do Projeto', cor:'#1E3A5F' } },
      investimento: { w: usableW, h: 200, dados: { titulo:'Quadro de Investimento', cor:'#1E3A5F' } },
      quebra_pagina:{ w: usableW, h: 24,  dados: {} },
    }
    const base = defaults[tipo] || { w:300, h:100, dados:{} }
    const novo = {
      id: `el_${Date.now()}`, tipo, x: 0, y,
      w: tipo==='kpi' ? Math.round(usableW/3) : base.w,
      h: presetH ?? base.h,
      dados: presetDados ? { ...base.dados, ...presetDados } : base.dados,
    }
    setElementos(prev => [...prev, novo])
    setSelecionadoId(novo.id)
    setSubPaleta(null)
  }, [elementos, config])

  const updateEl = useCallback((el) => setElementos(prev => prev.map(e => e.id===el.id?el:e)), [])
  const deleteEl = useCallback((id) => { setElementos(prev => prev.filter(e=>e.id!==id)); setSelecionadoId(null) }, [])

  // Atalhos de teclado: Delete/Backspace para excluir, setas para mover
  useEffect(() => {
    const onKey = (e) => {
      // Não disparar se foco está em input/textarea/[contenteditable]
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      if (!selecionadoId) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteEl(selecionadoId)
      } else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0
        const dy = e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0
        setElementos(prev => prev.map(el => el.id===selecionadoId ? {...el, x:Math.max(0,el.x+dx), y:Math.max(0,el.y+dy)} : el))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecionadoId, deleteEl])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const updated = { ...relatorio, titulo, elementos, config, ...acessoData }
    const result = await onSave(updated)
    setSaving(false)
    if (result?.ok !== false) { setSaved(true); setTimeout(()=>setSaved(false), 2500) }
  }, [relatorio, titulo, elementos, config, acessoData, onSave])

  const handlePrint = useCallback(() => {
    const w = window.open('', '_blank')
    const mg = config.margens || CONFIG_PADRAO.margens
    const cab = config.cabecalho || CONFIG_PADRAO.cabecalho
    const rod = config.rodape    || CONFIG_PADRAO.rodape
    const mda = config.marcaDagua|| CONFIG_PADRAO.marcaDagua
    const headerH = cab.ativo ? 60 : 0
    const footerH = rod.ativo ? 32 : 0
    const usableTop  = mg.top  + headerH
    const usableLeft = mg.left

    const elsHtml = elementos.map(el => {
      const d = el.dados || {}
      let inner = ''
      if (el.tipo === 'texto') inner = `<div style="font-size:${d.tamanhoFonte||14}px;font-weight:${d.negrito?700:400};font-style:${d.italico?'italic':'normal'};color:${d.cor||'#18181b'};text-align:${d.alinhamento||'left'};white-space:pre-wrap;word-break:break-word;">${d.conteudo||''}</div>`
      else if (el.tipo === 'divisor') inner = `<div style="width:100%;height:${d.espessura||1}px;background:${d.cor||'#e4e4e7'};"></div>`
      else if (el.tipo === 'forma') inner = `<div style="width:100%;height:100%;background:${d.corFundo||'#EFF6FF'};border:${d.bordaEspessura||1}px solid ${d.cor||'#2563EB'};border-radius:${d.tipoForma==='circulo'?'50%':(d.raio||6)+'px'};display:flex;align-items:center;justify-content:center;font-size:${d.tamanhoFonte||13}px;font-weight:${d.negrito?700:400};color:${d.cor||'#2563EB'};">${d.conteudo||''}</div>`
      else inner = `<div style="background:#f4f4f5;display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;color:#71717a;">${el.tipo}</div>`
      return `<div style="position:absolute;left:${usableLeft+el.x}px;top:${usableTop+el.y}px;width:${el.w}px;height:${el.h}px;overflow:hidden;">${inner}</div>`
    }).join('')

    w.document.write(`<!DOCTYPE html><html><head><title>${titulo}</title><style>@page{size:A4;margin:0}body{margin:0;padding:0;width:794px}@media print{body{width:794px}}</style></head><body style="position:relative;width:794px;min-height:1123px;background:#fff;">
      ${cab.ativo?`<div style="position:absolute;top:0;left:0;right:0;height:${headerH}px;background:${cab.corFundo||'#1E3A5F'};display:flex;align-items:center;padding:0 ${mg.left}px;gap:14px;"><div style="color:#fff;font-size:13px;font-weight:700;">${cab.titulo||'Boostly'}</div></div>`:''}
      ${mda.ativo?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;"><span style="font-size:72px;font-weight:900;color:rgba(0,0,0,${mda.opacidade||0.06});transform:rotate(-35deg);letter-spacing:8px;">${mda.texto||'RASCUNHO'}</span></div>`:''}
      ${elsHtml}
      ${rod.ativo?`<div style="position:absolute;bottom:0;left:0;right:0;height:${footerH}px;background:#f4f4f5;display:flex;align-items:center;justify-content:space-between;padding:0 ${mg.left}px;"><span style="font-size:9px;color:#a1a1aa;">${rod.texto||''}</span>${rod.paginacao?`<span style="font-size:9px;color:#a1a1aa;">Pág. 1</span>`:''}</div>`:''}
    </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }, [titulo, elementos, config])

  const handleExportWord = useCallback(() => {
    const pipeline = filteredSources.find(s => s.id === 'pipeline')
    const regs = pipeline?.registros || []

    // KPI summary rows
    const total    = regs.length
    const valorSum = regs.reduce((s,r) => s + (r.valor||0), 0)
    const ticket   = total ? (valorSum / total) : 0
    const fmt = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    // Group helpers
    const group = (field) => {
      const map = {}
      regs.forEach(r => { const k = r[field] || '—'; map[k] = (map[k]||0) + 1 })
      return Object.entries(map).sort((a,b) => b[1]-a[1])
    }

    const tableRows = regs.slice(0,200).map(r =>
      `<tr><td>${r.semana||'—'}</td><td>${r.origem||'—'}</td><td>${r.campanha||'—'}</td><td>${r.responsavel||'—'}</td><td>${r.etapa_nome||'—'}</td><td>${r.situacao||'—'}</td><td style="text-align:right">${fmt(r.valor||0)}</td></tr>`
    ).join('')

    const origemRows = group('origem').map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')
    const campRows   = group('campanha').map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')
    const respRows   = group('responsavel').map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')

    const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${titulo}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 2cm; }
  h1   { font-size: 18pt; color: #1e3a5f; border-bottom: 2px solid #2563eb; padding-bottom: 6pt; }
  h2   { font-size: 13pt; color: #374151; margin-top: 18pt; }
  table{ border-collapse: collapse; width: 100%; margin-top: 8pt; font-size: 10pt; }
  th   { background: #1e3a5f; color: #fff; padding: 6pt 8pt; text-align: left; }
  td   { border: 1px solid #d1d5db; padding: 5pt 8pt; }
  tr:nth-child(even) td { background: #f9fafb; }
  .kpi-grid { display: flex; gap: 16pt; margin: 12pt 0; }
  .kpi      { flex: 1; border: 1px solid #e5e7eb; border-radius: 6pt; padding: 10pt; text-align: center; }
  .kpi-val  { font-size: 22pt; font-weight: bold; color: #2563eb; }
  .kpi-lbl  { font-size: 9pt; color: #6b7280; }
</style>
</head><body>
<h1>${titulo}</h1>
<p style="color:#6b7280;font-size:9pt">Gerado em ${new Date().toLocaleString('pt-BR')}${filtros.dateFrom||filtros.dateTo ? ` · Período: ${filtros.dateFrom||'início'} até ${filtros.dateTo||'hoje'}` : ''}</p>

<h2>📊 Visão Geral</h2>
<table>
  <tr><th>Métrica</th><th>Valor</th></tr>
  <tr><td>Total de oportunidades</td><td>${total}</td></tr>
  <tr><td>Valor total em aberto</td><td>${fmt(valorSum)}</td></tr>
  <tr><td>Ticket médio</td><td>${fmt(ticket)}</td></tr>
</table>

<h2>🎯 Distribuição por Origem</h2>
<table>
  <tr><th>Origem</th><th>Qtd.</th></tr>${origemRows}
</table>

<h2>📣 Distribuição por Campanha</h2>
<table>
  <tr><th>Campanha</th><th>Qtd.</th></tr>${campRows}
</table>

<h2>👤 Performance por Responsável</h2>
<table>
  <tr><th>Responsável</th><th>Qtd.</th></tr>${respRows}
</table>

<h2>📋 Detalhamento das Oportunidades</h2>
<table>
  <tr><th>Semana</th><th>Origem</th><th>Campanha</th><th>Responsável</th><th>Etapa</th><th>Situação</th><th>Valor</th></tr>
  ${tableRows}
</table>
</body></html>`

    const blob = new Blob([html], { type: 'application/msword' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${titulo.replace(/\s+/g,'-')}.doc`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [titulo, filteredSources, filtros])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',height:fullScreen?'100vh':'100%',overflow:'hidden',background:'var(--surface2)',fontFamily:'var(--font)',...(fullScreen?{position:'fixed',inset:0,zIndex:500}:{position:'relative'})}}>

      {/* Painel esquerdo — paleta */}
      {!readOnly && (
        <div style={{position:'relative',width:60,flexShrink:0,background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 0',gap:4,zIndex:10}}>
          {PALETA.map(p=>{
            const isOpen = subPaleta === p.tipo
            return (
              <button key={p.tipo} onClick={()=>setSubPaleta(isOpen ? null : p.tipo)} title={p.label}
                style={{width:44,height:44,borderRadius:9,border:`1px solid ${isOpen?'var(--accent)':'var(--border)'}`,background:isOpen?'var(--accent)12':'var(--surface2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,fontFamily:'var(--font)',transition:'border-color .15s,background .15s'}}
                onMouseEnter={e=>{if(!isOpen){e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.background='var(--accent)08'}}}
                onMouseLeave={e=>{if(!isOpen){e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--surface2)'}}}>
                <span style={{fontSize:15,lineHeight:1,color:isOpen?'var(--accent)':'var(--text-soft)'}}>{p.icon}</span>
                <span style={{fontSize:8,color:isOpen?'var(--accent)':'var(--text-muted)',fontWeight:500}}>{p.label}</span>
              </button>
            )
          })}
          {/* Proposta-only items */}
          {mode==='proposta' && (
            <>
              <div style={{width:36,height:1,background:'var(--border)',margin:'4px 0'}}/>
              {[
                { tipo:'variavel',     icon:'{}',  label:'Var.' },
                { tipo:'quebra_pagina',icon:'↵',   label:'Págs.' },
                { tipo:'escopo',       icon:'📋',  label:'WBS'  },
                { tipo:'investimento', icon:'💰',  label:'R$'   },
              ].map(p=>{
                const isOpen = subPaleta===p.tipo
                return (
                  <button key={p.tipo} title={p.label}
                    onClick={()=>{ if(p.tipo==='variavel'||p.tipo==='quebra_pagina'){addEl(p.tipo)}else{setSubPaleta(isOpen?null:p.tipo)} }}
                    style={{width:44,height:44,borderRadius:9,border:`1px solid ${isOpen?'var(--accent)':'var(--border)'}`,background:isOpen?'var(--accent)12':'var(--surface2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,fontFamily:'var(--font)',transition:'border-color .15s'}}
                    onMouseEnter={e=>{if(!isOpen){e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.background='var(--accent)08'}}}
                    onMouseLeave={e=>{if(!isOpen){e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--surface2)'}}}>
                    <span style={{fontSize:13,lineHeight:1,color:isOpen?'var(--accent)':'var(--text-soft)'}}>{p.icon}</span>
                    <span style={{fontSize:7,color:isOpen?'var(--accent)':'var(--text-muted)',fontWeight:500}}>{p.label}</span>
                  </button>
                )
              })}
              {/* Flyout para escopo/investimento */}
              {(subPaleta==='escopo'||subPaleta==='investimento') && (
                <div style={{position:'absolute',left:64,top:0,width:180,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',padding:8,zIndex:20}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:6,borderBottom:'1px solid var(--border)',marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                      {subPaleta==='escopo'?'WBS / Escopo':'Quadro de Investimento'}
                    </span>
                    <button onClick={()=>setSubPaleta(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:0}}><X size={12}/></button>
                  </div>
                  <button onClick={()=>addEl(subPaleta)}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',border:'none',background:'none',cursor:'pointer',borderRadius:7,textAlign:'left',fontFamily:'var(--font)',width:'100%',fontSize:12,color:'var(--text-soft)'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <span>{subPaleta==='escopo'?'📋':'💰'}</span>
                    {subPaleta==='escopo'?'Tabela de escopo da proposta':'Tabela de investimento'}
                  </button>
                </div>
              )}
            </>
          )}

          <div style={{flex:1}}/>

          {/* Submenu flyout */}
          {subPaleta && PALETA_SUBS[subPaleta] && (
            <div style={{position:'absolute',left:64,top:0,width:160,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',padding:6,zIndex:20,display:'flex',flexDirection:'column',gap:2}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 8px 6px',borderBottom:'1px solid var(--border)',marginBottom:2}}>
                <span style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                  {PALETA.find(p=>p.tipo===subPaleta)?.label}
                </span>
                <button onClick={()=>setSubPaleta(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:0,display:'flex'}}>
                  <X size={12}/>
                </button>
              </div>
              {PALETA_SUBS[subPaleta].map((sub,i)=>(
                <button key={i} onClick={()=>addEl(subPaleta, sub.dados, sub.h)}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',border:'none',background:'none',cursor:'pointer',borderRadius:7,textAlign:'left',fontFamily:'var(--font)',width:'100%'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--surface2)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='none'}}>
                  <span style={{width:22,height:22,borderRadius:5,background:'var(--surface2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'var(--text-soft)',flexShrink:0}}>
                    {sub.icon}
                  </span>
                  <span style={{fontSize:12,color:'var(--text-soft)',fontWeight:500}}>{sub.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Canvas central */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Toolbar */}
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',background:'var(--surface)',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          <button onClick={onBack}
            style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',border:'1px solid var(--border)',borderRadius:6,background:'none',color:'var(--text-soft)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)',flexShrink:0}}>
            <ChevronLeft size={13}/> Voltar
          </button>

          {editandoTitulo ? (
            <input autoFocus value={titulo} onChange={e=>setTitulo(e.target.value)}
              onBlur={()=>setEditandoTitulo(false)} onKeyDown={e=>e.key==='Enter'&&setEditandoTitulo(false)}
              style={{fontSize:14,fontWeight:700,color:'var(--text)',background:'none',border:'none',outline:'none',borderBottom:'2px solid var(--accent)',fontFamily:'var(--font)',minWidth:180}}/>
          ) : (
            <span onClick={()=>!readOnly&&setEditandoTitulo(true)}
              style={{fontSize:14,fontWeight:700,color:'var(--text)',cursor:readOnly?'default':'text',padding:'2px 4px',borderRadius:4,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}
              title={readOnly?'':' Clique para renomear'}>
              {titulo}
            </span>
          )}

          {/* Zoom */}
          <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:6,padding:'3px 8px',flexShrink:0}}>
            <button onClick={()=>setZoom(z=>Math.max(0.4,z-0.1))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:14,padding:'0 2px',lineHeight:1}}>−</button>
            <span style={{fontSize:11,color:'var(--text-soft)',minWidth:32,textAlign:'center'}}>{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(z=>Math.min(1.5,z+0.1))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:14,padding:'0 2px',lineHeight:1}}>+</button>
          </div>

          {!readOnly && (<>
            <button onClick={()=>setShowAcesso(true)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',border:'1px solid var(--border)',borderRadius:6,background:'none',color:'var(--text-soft)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)',flexShrink:0}}>
              <Lock size={12}/> Acesso
            </button>
            <button onClick={handlePrint}
              style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',border:'1px solid var(--border)',borderRadius:6,background:'none',color:'var(--text-soft)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)',flexShrink:0}}>
              <Printer size={12}/> PDF
            </button>
            <button onClick={handleExportWord}
              style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',border:'1px solid var(--border)',borderRadius:6,background:'none',color:'var(--text-soft)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)',flexShrink:0}}>
              <FileText size={12}/> Word
            </button>
            <button onClick={()=>setShowFiltros(f=>!f)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',border:`1px solid ${showFiltros?'var(--accent)':'var(--border)'}`,borderRadius:6,background:showFiltros?'color-mix(in srgb, var(--accent) 8%, transparent)':'none',color:showFiltros?'var(--accent)':'var(--text-soft)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)',flexShrink:0}}>
              <Filter size={12}/> Filtros{totalFiltrosAtivos > 0 ? ` (${totalFiltrosAtivos})` : ''}
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{display:'flex',alignItems:'center',gap:5,padding:'6px 16px',border:'none',borderRadius:7,background:saved?'#10B981':'var(--accent)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',transition:'background .3s',flexShrink:0}}>
              <Save size={12}/> {saving?'Salvando…':saved?'Salvo!':'Salvar'}
            </button>
          </>)}
          <button onClick={()=>setFullScreen(f=>!f)} title={fullScreen?'Sair da tela cheia':'Tela cheia'}
            style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'5px',border:'1px solid var(--border)',borderRadius:6,background:'none',color:'var(--text-muted)',cursor:'pointer',flexShrink:0}}>
            {fullScreen ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
          </button>
        </div>

        {/* Canvas com scroll */}
        <div ref={canvasRef} style={{flex:1,overflowY:'auto',overflowX:'auto',background:'#e8e8e8',display:'flex',justifyContent:'center',padding:'24px'}}
          onClick={()=>setSelecionadoId(null)}>
          {(() => {
            const ps        = pageSize(config)
            const mg        = config.margens   || CONFIG_PADRAO.margens
            const cab       = config.cabecalho || CONFIG_PADRAO.cabecalho
            const rod       = config.rodape    || CONFIG_PADRAO.rodape
            const headerH   = cab.ativo ? 60 : 0
            const footerH   = rod.ativo ? 32 : 0
            const usableTop  = (mg.top||76) + headerH
            const usableLeft = mg.left||76
            const usableH    = ps.h - usableTop - (mg.bottom||76) - footerH

            // Compute page segments using quebra_pagina elements as hard breaks
            const breaks = elementos
              .filter(e => e.tipo === 'quebra_pagina')
              .map(e => e.y)
              .sort((a,b) => a-b)

            // Build continuous segments: [(segStart, segEnd), ...]
            // Within each segment, auto-split into pages if content exceeds usableH
            const segBoundaries = [0, ...breaks, Infinity]
            const pages = [] // { segStartY, pageStartY, pageEndY }
            for (let s = 0; s < segBoundaries.length - 1; s++) {
              const segStart = segBoundaries[s]
              const segEnd   = segBoundaries[s + 1]
              // find elements in this segment (excluding the break itself at start)
              const segEls = elementos.filter(e =>
                e.tipo !== 'quebra_pagina' && e.y >= segStart && (segEnd === Infinity || e.y < segEnd)
              )
              // also include the break marker at segStart (if s > 0)
              const maxElY = segEls.length ? Math.max(...segEls.map(e => e.y + e.h)) : segStart
              // How many auto-pages this segment needs
              const segHeight = Math.max(0, maxElY - segStart)
              const nAutoPages = Math.max(1, Math.ceil(segHeight / usableH))
              for (let p = 0; p < nAutoPages; p++) {
                pages.push({
                  segStartY: segStart,
                  pageStartY: segStart + p * usableH,
                  pageEndY:   segStart + (p + 1) * usableH,
                  pageNum: pages.length + 1,
                  isFirstInSeg: p === 0,
                })
              }
            }
            if (!pages.length) pages.push({ segStartY:0, pageStartY:0, pageEndY:usableH, pageNum:1, isFirstInSeg:true })

            const totalH = pages.length * ps.h + (pages.length - 1) * 24

            return (
              <div style={{transform:`scale(${zoom})`,transformOrigin:'top center',marginBottom:`${(zoom-1)*totalH}px`,display:'flex',flexDirection:'column',gap:24,alignItems:'center'}} onClick={e=>e.stopPropagation()}>
                {pages.map(({ pageStartY, pageEndY, pageNum, isFirstInSeg }, pi) => {

                  // Elements belonging to this page (by Y in continuous space)
                  const pageEls = elementos.filter(el => {
                    if (el.tipo === 'quebra_pagina') return el.y >= pageStartY && el.y < pageEndY
                    return el.y >= pageStartY && el.y < pageEndY
                  })

                  return (
                    <div key={pi} style={{width:ps.w, height:ps.h, background:pageBg(config), position:'relative', flexShrink:0, boxShadow:'0 4px 32px rgba(0,0,0,0.18)', overflow:'hidden'}}>

                      {/* Page number label (outside, above) */}
                      {!readOnly && pi > 0 && (
                        <div style={{position:'absolute',top:-20,left:0,right:0,textAlign:'center',fontSize:9,color:'#94A3B8',pointerEvents:'none'}}>
                          Página {pageNum}
                        </div>
                      )}

                      {/* Marca d'água */}
                      {config.marcaDagua?.ativo && (
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',zIndex:2}}>
                          <span style={{fontSize:72,fontWeight:900,color:`rgba(0,0,0,${config.marcaDagua?.opacidade||0.06})`,transform:'rotate(-35deg)',letterSpacing:8,userSelect:'none'}}>
                            {config.marcaDagua?.texto||'RASCUNHO'}
                          </span>
                        </div>
                      )}

                      {/* Cabeçalho */}
                      {cab.ativo && (
                        <div style={{
                          position:'absolute',top:0,left:0,right:0,height:60,zIndex:1,
                          background: cabBg(cab),
                          backgroundImage: cab.tipoFundo==='imagem' && cab.imagemUrl ? `url(${cab.imagemUrl})` : undefined,
                          backgroundSize: cab.imagemAjuste||'cover',
                          backgroundPosition:'center',
                          backgroundRepeat:'no-repeat',
                          display:'flex',alignItems:'center',padding:`0 ${usableLeft}px`,gap:14,
                        }}>
                          {cab.tipoFundo==='imagem' && cab.imagemUrl && cab.imagemOverlay && (
                            <div style={{position:'absolute',inset:0,background:`rgba(0,0,0,${cab.imagemOpacidade??0.35})`,zIndex:0}}/>
                          )}
                          <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',gap:14,width:'100%'}}>
                            {cab.logoLetra && (
                              <div style={{width:32,height:32,background:'rgba(255,255,255,0.9)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <span style={{fontSize:12,fontWeight:800,color:cab.corFundo||'#1E3A5F'}}>{cab.logoLetra}</span>
                              </div>
                            )}
                            <div>
                              <div style={{fontSize:13,fontWeight:700,color:'#fff',lineHeight:1.2}}>{cab.titulo||titulo}</div>
                              {cab.subtitulo && <div style={{fontSize:10,color:'rgba(255,255,255,0.65)'}}>{cab.subtitulo}</div>}
                            </div>
                            {projetoData && pi === 0 && (
                              <div style={{marginLeft:'auto',textAlign:'right'}}>
                                <div style={{fontSize:10,color:'rgba(255,255,255,0.7)'}}>Proposta para</div>
                                <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{projetoData.empresa||projetoData.nome}</div>
                              </div>
                            )}
                            {projetoData && pi > 0 && (
                              <div style={{marginLeft:'auto',textAlign:'right'}}>
                                <div style={{fontSize:9,color:'rgba(255,255,255,0.6)'}}>Página {pageNum}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Guide de margens */}
                      <div style={{position:'absolute',top:usableTop,left:usableLeft,right:mg.right||76,bottom:(mg.bottom||76)+footerH,border:'1px dashed rgba(37,99,235,0.13)',pointerEvents:'none',zIndex:1}}/>

                      {/* Elementos desta página */}
                      {pageEls.map(el => {
                        const isSel  = el.id === selecionadoId
                        const src    = filteredSources.find(s => s.id === (el.dados?.sourceId))
                        const localY = el.y - pageStartY
                        return (
                          <div key={el.id}
                            style={{position:'absolute',left:usableLeft+el.x,top:usableTop+localY,width:el.w,height:el.h,
                              border:`1.5px solid ${isSel?'#2563EB':'transparent'}`,
                              boxShadow:isSel?'0 0 0 3px rgba(37,99,235,0.15)':'none',
                              cursor:readOnly?'default':'move',overflow:'hidden',boxSizing:'border-box',zIndex:3}}
                            onClick={e=>{e.stopPropagation();if(!readOnly){setSelecionadoId(el.id);setPanelVisible(true)}}}
                            onMouseDown={e=>{e.preventDefault();!readOnly&&handleDragStart(e,el)}}>
                            <RenderEl el={{...el, _projetoData: projetoData}} source={src} sources={sources}/>
                            {isSel && !readOnly && (
                              <div style={{position:'absolute',bottom:-5,right:-5,width:10,height:10,background:'#2563EB',border:'2px solid #fff',borderRadius:2,cursor:'se-resize',zIndex:4}}
                                onMouseDown={e=>{e.preventDefault();e.stopPropagation();handleDragStart(e,el,'resize')}}/>
                            )}
                          </div>
                        )
                      })}

                      {/* Rodapé */}
                      {rod.ativo && (
                        <div style={{
                          position:'absolute',bottom:0,left:0,right:0,height:32,zIndex:1,
                          background: rod.tipoFundo==='imagem' && rod.imagemUrl ? 'none' : (rod.corFundo||'#f4f4f5'),
                          backgroundImage: rod.tipoFundo==='imagem' && rod.imagemUrl ? `url(${rod.imagemUrl})` : undefined,
                          backgroundSize: rod.imagemAjuste||'cover',
                          backgroundPosition:'center',
                          backgroundRepeat:'no-repeat',
                          display:'flex',alignItems:'center',justifyContent:'space-between',padding:`0 ${usableLeft}px`,
                        }}>
                          {rod.tipoFundo==='imagem' && rod.imagemUrl && rod.imagemOverlay && (
                            <div style={{position:'absolute',inset:0,background:`rgba(0,0,0,${rod.imagemOpacidade??0.25})`,zIndex:0}}/>
                          )}
                          <span style={{position:'relative',zIndex:1,fontSize:9,color:rod.corTexto||'#a1a1aa'}}>{rod.texto||''}</span>
                          {rod.paginacao && <span style={{position:'relative',zIndex:1,fontSize:9,color:rod.corTexto||'#a1a1aa'}}>Pág. {pageNum}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Painel direito — filtros ou propriedades */}
      {showFiltros ? (
        <FiltersPanel
          sources={sources}
          filteredSources={filteredSources}
          usedSourceIds={usedSourceIds}
          filtros={filtros}
          onSet={setSourceFiltro}
          onClearSource={clearSourceFiltro}
          onClearAll={() => setFiltros({})}
          totalAtivos={totalFiltrosAtivos}
          parametros={filtrosParametro}
          onToggleParametro={(srcId, key, meta) => {
            setFiltrosParametro(prev => {
              const next = { ...prev, [srcId]: { ...(prev[srcId] || {}) } }
              if (meta) next[srcId][key] = { enabled: true, ...meta }
              else delete next[srcId][key]
              const fp = { ...next }
              setConfig(c => ({ ...c, filtrosParametro: fp }))
              return fp
            })
          }}
        />
      ) : !readOnly && (
        <div style={{ display:'flex', flexShrink:0 }}>
          {/* Toggle sempre visível — abre/fecha PropPanel */}
          <button onClick={() => setPanelVisible(v => !v)} title={panelVisible ? 'Recolher painel' : 'Expandir painel'}
            style={{ width:20, borderLeft:'1px solid var(--border)', background:'var(--surface2)', border:'none', borderRight: panelVisible ? 'none' : undefined, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexShrink:0 }}>
            {panelVisible ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>}
          </button>

          {panelVisible && (
            <PropPanel
              el={selecionado}
              sources={sources}
              onChange={updateEl}
              onDelete={()=>selecionado&&deleteEl(selecionado.id)}
              config={config}
              onConfigChange={setConfig}
              mode={mode}
              projetoData={projetoData}
            />
          )}
        </div>
      )}

      {/* Modal de acesso */}
      {showAcesso && (
        <AcessoModal
          relatorio={{...relatorio, ...acessoData}}
          onSave={(data)=>{ setAcessoData(data); setShowAcesso(false) }}
          onClose={()=>setShowAcesso(false)}
        />
      )}
    </div>
  )
}
