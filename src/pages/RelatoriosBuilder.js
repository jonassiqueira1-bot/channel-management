/**
 * Construtor de Relatórios — reformulação completa (v2).
 *
 * Conceito: NÃO é um editor de canvas/páginas. É um construtor de consultas
 * e visualizações, inspirado em Notion Database / Airtable / ClickUp /
 * Linear. O usuário nunca desenha um relatório — ele monta uma pergunta de
 * negócio: escolhe a origem dos dados, navega pelos relacionamentos sem SQL,
 * escolhe campos/filtros/agrupamentos, e depois adiciona blocos prontos
 * (KPI, Tabela, Gráfico, Texto, Divisor, Imagem) que se organizam em
 * sequência — sem posicionamento livre, sem arrastar.
 *
 * Estrutura:
 *   - A "fonte" (entidade + relacionamentos + campos + filtros +
 *     agrupamento) é única por relatório — configurada no painel lateral
 *     "Dados". É o equivalente a uma database do Notion.
 *   - Os "blocos" são visualizações dessa mesma fonte — cada um escolhe
 *     quais campos/métricas usar e como exibir. Ordem editável (↑/↓), nunca
 *     posição livre.
 *
 * Persistência: mesma tabela `relatorios` (config.builder), mesmo padrão de
 * versionamento usado desde a v1 — reports salvos antes desta reformulação
 * são migrados na hidratação (sintetiza um bloco de tabela com os campos
 * antigos + um bloco de KPI por KPI antigo).
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, ChevronRight, X, Search, Save, Plus,
  Database, Filter, Layers, Settings2, Trash2, Copy, GripVertical,
  BarChart2, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Table2, Type, Minus, Image as ImageIcon, TrendingUp, FileDown,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { ENTIDADES, relacionadasDe, relacaoEntre } from '../data/reportEntities'
import { useDocumentDataSources } from '../hooks/useDocumentDataSources'
import { useRelatorios } from '../hooks/useRelatorios'

const PAPEIS = [
  { value: 'admin_isv',  label: 'Administrador'    },
  { value: 'vendedor',   label: 'Vendedor'         },
  { value: 'cs',         label: 'Customer Success' },
  { value: 'financeiro', label: 'Financeiro'       },
  { value: 'projetos',   label: 'Projetos'         },
]

const OPERADORES_POR_TIPO = {
  text:   [{ id: '=', l: 'é' }, { id: '!=', l: 'não é' }, { id: 'contem', l: 'contém' }],
  number: [{ id: '=', l: '=' }, { id: '!=', l: '≠' }, { id: '>', l: '>' }, { id: '<', l: '<' }, { id: '>=', l: '≥' }, { id: '<=', l: '≤' }],
  date:   [{ id: '=', l: 'em' }, { id: '<', l: 'antes de' }, { id: '>', l: 'depois de' }],
}
function operadoresDe(tipo) { return OPERADORES_POR_TIPO[tipo] || OPERADORES_POR_TIPO.text }

const AGREGACOES = [
  { id: 'contagem', l: 'Contagem' },
  { id: 'soma',     l: 'Soma' },
  { id: 'media',    l: 'Média' },
  { id: 'min',      l: 'Mínimo' },
  { id: 'max',      l: 'Máximo' },
]

const CHART_COLORS = ['#2563EB', '#059669', '#C2410C', '#86198F', '#0369A1', '#B45309', '#BE123C', '#4D7C0F']

const BLOCO_TIPOS = [
  { tipo: 'kpi',     label: 'KPI',      desc: 'Um número em destaque',        Icon: TrendingUp },
  { tipo: 'tabela',  label: 'Tabela',   desc: 'Linhas e colunas',             Icon: Table2 },
  { tipo: 'grafico', label: 'Gráfico',  desc: 'Barra, linha, pizza ou funil', Icon: BarChart2 },
  { tipo: 'texto',   label: 'Texto',    desc: 'Título ou parágrafo',          Icon: Type },
  { tipo: 'divisor', label: 'Divisor',  desc: 'Separa seções',                Icon: Minus },
  { tipo: 'imagem',  label: 'Imagem',   desc: 'Logo, banner, etc',            Icon: ImageIcon },
]

function uid(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

// ─── Motor de junção — combina as fontes reais via as FKs de reportEntities.js ─
// Cada linha do resultado é um mapa { [entidadeId]: registro | null }. Junções
// muitos-para-um/um-para-um viram lookup direto (1 linha vira 1 linha);
// um-para-muitos expande a linha (1 linha vira N linhas), igual um JOIN de SQL.
function montarLinhas(sources, entidadeId, joins) {
  const baseSource = sources.find(s => s.id === entidadeId)
  let linhas = (baseSource?.registros || []).map(r => ({ [entidadeId]: r }))

  for (const joinId of joins) {
    const r = relacaoEntre(entidadeId, joinId)
    if (!r) continue
    const campoLado = r.fkEm === 'de' ? r.de : r.para
    const relatedSource = sources.find(s => s.id === joinId)
    const relatedRows = relatedSource?.registros || []

    if (campoLado === entidadeId) {
      const indice = new Map(relatedRows.map(rr => [String(rr.id), rr]))
      linhas = linhas.map(l => ({ ...l, [joinId]: indice.get(String(l[entidadeId]?.[r.campo])) || null }))
    } else {
      const grupos = new Map()
      relatedRows.forEach(rr => {
        const chave = String(rr[r.campo])
        if (!grupos.has(chave)) grupos.set(chave, [])
        grupos.get(chave).push(rr)
      })
      linhas = linhas.flatMap(l => {
        const matches = grupos.get(String(l[entidadeId]?.id)) || [null]
        return matches.map(m => ({ ...l, [joinId]: m }))
      })
    }
  }
  return linhas
}

function valorDoCampo(linha, campo, todosCampos) {
  if (!campo) return undefined
  if (campo.calculado) {
    const va = resolverOperando(linha, campo.formula.a, todosCampos)
    const vb = resolverOperando(linha, campo.formula.b, todosCampos)
    if (va === null || vb === null || Number.isNaN(va) || Number.isNaN(vb)) return null
    switch (campo.formula.op) {
      case '+': return va + vb
      case '-': return va - vb
      case '*': return va * vb
      case '/': return vb === 0 ? null : va / vb
      default: return null
    }
  }
  return linha[campo.entidadeId] ? linha[campo.entidadeId][campo.key] : undefined
}

function resolverOperando(linha, operando, todosCampos) {
  if (!operando) return null
  if (operando.tipo === 'valor') {
    const n = Number(operando.valor)
    return Number.isNaN(n) ? null : n
  }
  const campo = (todosCampos || []).find(c => c.id === operando.campoId)
  if (!campo) return null
  const v = Number(valorDoCampo(linha, campo, todosCampos))
  return Number.isNaN(v) ? null : v
}

function passaNoFiltro(linha, filtro, campos) {
  const campo = campos.find(c => c.id === filtro.campoId)
  if (!campo) return true
  if (filtro.valor === '' || filtro.valor == null) return true
  const bruto = valorDoCampo(linha, campo, campos)
  if (campo.type === 'number') {
    const v = Number(bruto)
    const alvo = Number(filtro.valor)
    if (Number.isNaN(v)) return false
    switch (filtro.operador) {
      case '=': return v === alvo
      case '!=': return v !== alvo
      case '>': return v > alvo
      case '<': return v < alvo
      case '>=': return v >= alvo
      case '<=': return v <= alvo
      default: return true
    }
  }
  if (campo.type === 'date') {
    const v = bruto ? new Date(bruto).getTime() : NaN
    const alvo = new Date(filtro.valor).getTime()
    if (Number.isNaN(v)) return false
    switch (filtro.operador) {
      case '=': return new Date(bruto).toDateString() === new Date(filtro.valor).toDateString()
      case '<': return v < alvo
      case '>': return v > alvo
      default: return true
    }
  }
  const texto = (bruto ?? '').toString().toLowerCase()
  const alvo = filtro.valor.toLowerCase()
  switch (filtro.operador) {
    case '=': return texto === alvo
    case '!=': return texto !== alvo
    case 'contem': return texto.includes(alvo)
    default: return true
  }
}

function formatarValor(v) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  return String(v)
}

function formatarNumero(v) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function exportarCSV(campos, linhas, titulo) {
  const header = campos.map(c => `"${c.label.replace(/"/g, '""')}"`).join(';')
  const rows = linhas.map(l => campos.map(c => {
    const v = formatarValor(valorDoCampo(l, c, campos))
    return `"${v.replace(/"/g, '""')}"`
  }).join(';'))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(titulo || 'relatorio').toLowerCase().replace(/\s+/g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportarExcel(campos, linhas, titulo) {
  const XLSX = await import('xlsx')
  const header = campos.map(c => c.label)
  const rows = linhas.map(l => campos.map(c => formatarValor(valorDoCampo(l, c, campos))))
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
  XLSX.writeFile(wb, `${(titulo || 'relatorio').toLowerCase().replace(/\s+/g, '_')}.xlsx`)
}

// Agrega linhas por um campo categórico — usado por blocos de gráfico e por
// agrupamento de tabela. `campoMetrica` null = conta linhas (contagem).
function agregarPorGrupo(linhas, campoGrupo, campoMetrica, agregacao, campos) {
  const grupos = new Map()
  for (const l of linhas) {
    const chave = formatarValor(valorDoCampo(l, campoGrupo, campos))
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave).push(l)
  }
  const linhasAgrupadas = [...grupos.entries()].map(([chave, ls]) => {
    if (agregacao === 'contagem' || !campoMetrica) return { chave, valor: ls.length }
    const valores = ls.map(l => Number(valorDoCampo(l, campoMetrica, campos))).filter(v => !Number.isNaN(v))
    if (valores.length === 0) return { chave, valor: 0 }
    switch (agregacao) {
      case 'soma':  return { chave, valor: valores.reduce((a, b) => a + b, 0) }
      case 'media': return { chave, valor: valores.reduce((a, b) => a + b, 0) / valores.length }
      case 'min':   return { chave, valor: Math.min(...valores) }
      case 'max':   return { chave, valor: Math.max(...valores) }
      default:      return { chave, valor: 0 }
    }
  })
  return linhasAgrupadas.sort((a, b) => b.valor - a.valor)
}

function calcularKpi(linhas, campos, config) {
  const campo = config.campoId ? campos.find(c => c.id === config.campoId) : null
  if (config.agregacao === 'contagem' || !campo) return linhas.length
  const valores = linhas.map(l => Number(valorDoCampo(l, campo, campos))).filter(v => !Number.isNaN(v))
  if (valores.length === 0) return null
  switch (config.agregacao) {
    case 'soma':  return valores.reduce((a, b) => a + b, 0)
    case 'media': return valores.reduce((a, b) => a + b, 0) / valores.length
    case 'min':   return Math.min(...valores)
    case 'max':   return Math.max(...valores)
    default:      return null
  }
}

// Migra relatórios salvos antes da reformulação (sem `blocks`) — sintetiza
// um bloco de tabela com as colunas antigas + um bloco de KPI por KPI antigo.
function migrarParaBlocos(b) {
  if (Array.isArray(b.blocks)) return b.blocks
  const blocks = []
  if (Array.isArray(b.kpis)) {
    for (const k of b.kpis) {
      blocks.push({ id: uid('blk'), tipo: 'kpi', config: { campoId: k.campoId || null, agregacao: k.agregacao || 'contagem', label: k.label || 'KPI', cor: CHART_COLORS[0] } })
    }
  }
  if (Array.isArray(b.campos) && b.campos.length > 0) {
    blocks.push({ id: uid('blk'), tipo: 'tabela', config: { colunas: b.campos.map(c => c.id), ordenacao: b.ordenacao || null } })
  }
  return blocks
}

// Agrupa blocos de KPI ADJACENTES numa mesma linha (faixa de indicadores),
// sem posicionamento livre — é puramente sobre a ordem da sequência, não
// coordenadas. Qualquer outro tipo de bloco quebra o agrupamento.
// Blocos ADJACENTES do mesmo tipo (kpi ou gráfico) se agrupam numa linha —
// puramente pela ordem da sequência, sem posicionamento livre. Um kpi do
// lado de um gráfico não agrupa (tipos diferentes); qualquer outro bloco no
// meio quebra o agrupamento.
const TIPOS_AGRUPAVEIS = new Set(['kpi', 'grafico'])
function agruparParaRender(blocks) {
  const grupos = []
  let atual = null
  blocks.forEach((blk, idx) => {
    if (TIPOS_AGRUPAVEIS.has(blk.tipo) && atual?.tipo === blk.tipo) atual.itens.push({ blk, idx })
    else { atual = { tipo: blk.tipo, itens: [{ blk, idx }] }; grupos.push(atual) }
  })
  return grupos
}

// Linha de resumo mostrada quando um bloco está colapsado — útil pra vários
// blocos de tabela na mesma tela sem ocupar a tela inteira de rolagem.
function resumoBloco(blk, linhas) {
  const meta = BLOCO_TIPOS.find(b => b.tipo === blk.tipo)
  if (blk.tipo === 'tabela') return `${meta.label} · ${(blk.config.colunas || []).length} coluna${(blk.config.colunas || []).length !== 1 ? 's' : ''} · ${linhas.length} registro${linhas.length !== 1 ? 's' : ''}`
  if (blk.tipo === 'kpi') return `${meta.label} · ${blk.config.label || ''}`
  if (blk.tipo === 'grafico') return `${meta.label} · ${blk.config.tipo || ''}`
  return meta.label
}

export default function RelatoriosBuilder() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { sources } = useDocumentDataSources()
  const { relatorios, save } = useRelatorios('relatorio')

  // ── Fonte (a "database" do relatório) ────────────────────────────────────
  const [entidadeId, setEntidadeId] = useState(null)
  const [joins, setJoins]           = useState([])
  const [campos, setCampos]         = useState([])
  const [filtros, setFiltros]       = useState([])
  const [conector, setConector]     = useState('E')
  const [agrupamento, setAgrupamento] = useState([])

  // ── Blocos (as visualizações) ────────────────────────────────────────────
  const [blocks, setBlocks] = useState([])

  // ── Painel lateral: null | 'dados' | { blockId } ─────────────────────────
  const [painel, setPainel] = useState('dados')
  // null = fechado; 'end' = adicionar no fim; número = inserir nesse índice
  // (usado pelo "+" que aparece ao passar o mouse entre dois blocos).
  const [pickerAberto, setPickerAberto] = useState(null)

  // ── Persistência ──────────────────────────────────────────────────────────
  const [titulo, setTitulo]           = useState('Novo relatório')
  const [acesso, setAcesso]           = useState('privado')
  const [papeisPermitidos, setPapeisPermitidos] = useState([])
  const [relatorioId, setRelatorioId] = useState(null)
  const [salvando, setSalvando]       = useState(false)
  const hidratado = useRef(false)

  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || hidratado.current || relatorios.length === 0) return
    const rel = relatorios.find(r => r.id === id)
    const b = rel?.config?.builder
    if (!b) return
    hidratado.current = true
    setRelatorioId(rel.id)
    setTitulo(rel.titulo || 'Novo relatório')
    setAcesso(rel.acesso || 'privado')
    setPapeisPermitidos(rel.papeis_permitidos || [])
    setEntidadeId(b.entidadeId || null)
    setJoins(b.joins || [])
    setCampos(b.campos || [])
    setFiltros(b.filtros || [])
    setConector(b.conector || 'E')
    setAgrupamento(b.agrupamento || [])
    setBlocks(migrarParaBlocos(b))
    setPainel(null)
  }, [searchParams, relatorios])

  const entidade = ENTIDADES.find(e => e.id === entidadeId) || null
  const entidadesAtivas = useMemo(() => entidadeId ? [entidadeId, ...joins] : [], [entidadeId, joins])
  const relacionadas = useMemo(() => entidadeId ? relacionadasDe(entidadeId) : [], [entidadeId])

  // Remove da seleção qualquer campo cuja entidade deixou de estar ativa.
  useEffect(() => {
    setCampos(prev => prev.filter(c => c.calculado || entidadesAtivas.includes(c.entidadeId)))
  }, [entidadesAtivas])

  useEffect(() => {
    const camposIds = new Set(campos.map(c => c.id))
    setFiltros(prev => prev.filter(f => camposIds.has(f.campoId)))
    setAgrupamento(prev => prev.filter(id => camposIds.has(id)))
    setBlocks(prev => prev.map(blk => limparBlocoOrfao(blk, camposIds)))
  }, [campos]) // eslint-disable-line react-hooks/exhaustive-deps

  function limparBlocoOrfao(blk, camposIds) {
    if (blk.tipo === 'kpi' && blk.config.campoId && !camposIds.has(blk.config.campoId)) {
      return { ...blk, config: { ...blk.config, campoId: null, agregacao: 'contagem' } }
    }
    if (blk.tipo === 'tabela') {
      return { ...blk, config: { ...blk.config, colunas: (blk.config.colunas || []).filter(id => camposIds.has(id)) } }
    }
    if (blk.tipo === 'grafico') {
      const cfg = { ...blk.config }
      if (cfg.eixoXId && !camposIds.has(cfg.eixoXId)) cfg.eixoXId = null
      if (cfg.campoMetricaId && !camposIds.has(cfg.campoMetricaId)) cfg.campoMetricaId = null
      return { ...blk, config: cfg }
    }
    return blk
  }

  // ── Linhas ao vivo (motor de junção + filtros) ───────────────────────────
  const linhas = useMemo(() => {
    if (!entidadeId || sources.length === 0) return []
    const combinadas = montarLinhas(sources, entidadeId, joins)
    if (filtros.length === 0) return combinadas
    return combinadas.filter(l => {
      const resultados = filtros.map(f => passaNoFiltro(l, f, campos))
      return conector === 'E' ? resultados.every(Boolean) : resultados.some(Boolean)
    })
  }, [sources, entidadeId, joins, filtros, conector, campos])

  // ── Ações de fonte ────────────────────────────────────────────────────────
  // Trocar a entidade principal reseta relacionamentos/campos/blocos (a base
  // do relatório inteiro muda) — não é a mesma coisa que JOIN (isso é feito
  // em "Relacionamentos", que só aparece depois de escolher a entidade
  // principal). Clicar na que já está selecionada não faz nada; clicar numa
  // diferente pede confirmação, já que apaga o que foi montado até aqui.
  function escolherEntidade(id) {
    if (id === entidadeId) return
    if (entidadeId && (campos.length > 0 || blocks.length > 0)) {
      const ok = window.confirm('Trocar a entidade principal apaga os relacionamentos, campos e blocos já configurados neste relatório. Continuar?')
      if (!ok) return
    }
    setEntidadeId(id); setJoins([]); setCampos([]); setBlocks([])
  }
  function toggleJoin(id) {
    setJoins(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleCampo(entId, field) {
    const campoId = `${entId}.${field.key}`
    const jaSelecionado = campos.some(c => c.id === campoId)
    setCampos(prev => jaSelecionado
      ? prev.filter(c => c.id !== campoId)
      : [...prev, { id: campoId, entidadeId: entId, key: field.key, label: field.label, type: field.type }])
    // Marcar um campo aqui precisa refletir na hora nos blocos de tabela —
    // senão o usuário marca o campo e não vê nada mudar na visualização,
    // já que a lista de colunas de cada bloco de tabela é separada do pool
    // de campos do relatório.
    if (!jaSelecionado) {
      setBlocks(prev => prev.map(b => b.tipo === 'tabela'
        ? { ...b, config: { ...b.config, colunas: [...(b.config.colunas || []), campoId] } }
        : b))
    }
  }
  function addCalculado({ label, a, op, b }) {
    const novoId = uid('calc')
    setCampos(prev => [...prev, { id: novoId, entidadeId: null, key: null, label: label || 'Campo calculado', type: 'number', calculado: true, formula: { a, op, b } }])
    setBlocks(prev => prev.map(b => b.tipo === 'tabela'
      ? { ...b, config: { ...b.config, colunas: [...(b.config.colunas || []), novoId] } }
      : b))
  }
  function removerCampo(id) {
    setCampos(prev => prev.filter(c => c.id !== id))
  }
  function moverCampo(idx, dir) {
    setCampos(prev => {
      const i = idx + dir
      if (i < 0 || i >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[i]] = [next[i], next[idx]]
      return next
    })
  }
  function addFiltro() {
    if (campos.length === 0) return
    setFiltros(prev => [...prev, { id: uid('f'), campoId: campos[0].id, operador: operadoresDe(campos[0].type)[0].id, valor: '' }])
  }
  function updateFiltro(id, patch) { setFiltros(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f)) }
  function removeFiltro(id) { setFiltros(prev => prev.filter(f => f.id !== id)) }
  function toggleAgrupamento(campoId) {
    setAgrupamento(prev => prev.includes(campoId) ? prev.filter(x => x !== campoId) : [...prev, campoId])
  }

  // ── Ações de blocos ───────────────────────────────────────────────────────
  function addBlock(tipo) {
    const defaults = {
      kpi:     { campoId: null, agregacao: 'contagem', label: 'Total de registros', cor: CHART_COLORS[0] },
      tabela:  { colunas: campos.slice(0, 6).map(c => c.id), ordenacao: null },
      grafico: { tipo: 'bar', eixoXId: agrupamento[0] || null, campoMetricaId: null, agregacao: 'contagem', cor: CHART_COLORS[0] },
      texto:   { conteudo: 'Escreva aqui…', tamanho: 'normal' },
      divisor: {},
      imagem:  { url: '' },
    }
    const novo = { id: uid('blk'), tipo, config: defaults[tipo] }
    setBlocks(prev => {
      if (typeof pickerAberto !== 'number') return [...prev, novo]
      const next = [...prev]
      next.splice(pickerAberto, 0, novo)
      return next
    })
    setPainel({ blockId: novo.id })
    setPickerAberto(null)
  }
  function updateBlockConfig(id, patch) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, config: { ...b.config, ...patch } } : b))
  }
  function toggleColapsarBlock(id) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, colapsado: !b.colapsado } : b))
  }
  function moverBlock(idx, dir) {
    setBlocks(prev => {
      const i = idx + dir
      if (i < 0 || i >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[i]] = [next[i], next[idx]]
      return next
    })
  }
  function duplicarBlock(id) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx === -1) return prev
      const clone = { ...prev[idx], id: uid('blk'), config: { ...prev[idx].config } }
      const next = [...prev]
      next.splice(idx + 1, 0, clone)
      return next
    })
  }
  function removerBlock(id) {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setPainel(p => (p && p.blockId === id) ? null : p)
  }

  async function handleSalvar() {
    if (!entidadeId) return
    setSalvando(true)
    try {
      const config = { builder: { versao: 2, entidadeId, joins, campos, filtros, conector, agrupamento, blocks } }
      const result = await save({ id: relatorioId, titulo, tipo: 'relatorio', acesso, papeis_permitidos: acesso === 'equipe' ? papeisPermitidos : [], status: 'rascunho', config, elementos: [] })
      if (result?.ok && result.relatorio) {
        setRelatorioId(result.relatorio.id)
        setSearchParams({ id: result.relatorio.id }, { replace: true })
      }
    } finally {
      setSalvando(false)
    }
  }

  const blockSelecionado = painel && painel.blockId ? blocks.find(b => b.id === painel.blockId) : null

  return (
    <div style={s.page}>
      {/* ── Cabeçalho ── */}
      <div style={s.header}>
        <button style={s.btnGhost} onClick={() => navigate('/relatorios')}><ArrowLeft size={14} /> Relatórios</button>
        <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Novo relatório" style={s.titleInput} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select style={s.acessoSelect} value={acesso} onChange={e => setAcesso(e.target.value)} title="Quem pode ver">
            <option value="privado">🔒 Privado</option>
            <option value="equipe">👥 Equipe</option>
            <option value="todos">🌐 Público</option>
          </select>
          <button style={{ ...s.btnGhost, ...(painel === 'dados' ? s.btnGhostAtivo : {}) }} onClick={() => setPainel(p => p === 'dados' ? null : 'dados')}>
            <Database size={14} /> Dados
          </button>
          <button style={s.btnPrimary} disabled={!entidadeId || salvando} onClick={handleSalvar}>
            <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      {acesso === 'equipe' && (
        <div style={s.papeisRow}>
          <span style={s.papeisLabel}>Papéis com acesso:</span>
          {PAPEIS.map(p => {
            const sel = papeisPermitidos.includes(p.value)
            return (
              <button key={p.value} onClick={() => setPapeisPermitidos(prev => sel ? prev.filter(x => x !== p.value) : [...prev, p.value])}
                style={{ ...s.papelChip, ...(sel ? s.papelChipSel : {}) }}>
                {sel && <Check size={10} strokeWidth={3} />} {p.label}
              </button>
            )
          })}
        </div>
      )}

      <div style={s.body}>
        {/* ── Centro: só a visualização ── */}
        <div style={s.centro}>
          {!entidadeId ? (
            <EscolherFonte onEscolher={escolherEntidade} />
          ) : blocks.length === 0 ? (
            <EmptyBlocks onAdd={() => setPickerAberto('end')} />
          ) : (
            <div style={s.blocosLista}>
              {agruparParaRender(blocks).map((grupo, gi) => {
                const emLinha = grupo.itens.length > 1
                return (
                  <div key={gi}>
                    <InsertBetween onAdd={() => setPickerAberto(grupo.itens[0].idx)} />
                    <div style={emLinha ? s.kpiRowWrap : undefined}>
                      {grupo.itens.map(({ blk, idx }) => (
                        <BlockWrapper key={blk.id} idx={idx} total={blocks.length}
                          emLinha={emLinha} emLinhaGrafico={emLinha && grupo.tipo === 'grafico'}
                          colapsado={blk.colapsado} onToggleColapsar={() => toggleColapsarBlock(blk.id)}
                          selecionado={painel?.blockId === blk.id}
                          onSelect={() => setPainel({ blockId: blk.id })}
                          onMoveUp={() => moverBlock(idx, -1)}
                          onMoveDown={() => moverBlock(idx, 1)}
                          onDuplicate={() => duplicarBlock(blk.id)}
                          onRemove={() => removerBlock(blk.id)}>
                          {blk.colapsado
                            ? <div style={s.blockColapsadoResumo}>{resumoBloco(blk, linhas)}</div>
                            : <BlockView blk={blk} linhas={linhas} campos={campos} agrupamento={agrupamento} titulo={titulo} />}
                        </BlockWrapper>
                      ))}
                    </div>
                  </div>
                )
              })}
              <button style={s.addBlockInline} onClick={() => setPickerAberto('end')}>
                <Plus size={14} /> Adicionar bloco
              </button>
            </div>
          )}

          {pickerAberto !== null && <BlockPicker onPick={addBlock} onClose={() => setPickerAberto(null)} />}
        </div>

        {/* ── Painel lateral ── */}
        {painel === 'dados' && (
          <DataPanel
            sources={sources} entidade={entidade} entidadeId={entidadeId} joins={joins}
            relacionadas={relacionadas} campos={campos} filtros={filtros} conector={conector}
            agrupamento={agrupamento} entidadesAtivas={entidadesAtivas}
            onEscolherEntidade={escolherEntidade} onToggleJoin={toggleJoin} onToggleCampo={toggleCampo}
            onAddCalculado={addCalculado} onRemoverCampo={removerCampo} onMoverCampo={moverCampo}
            onAddFiltro={addFiltro} onUpdateFiltro={updateFiltro} onRemoveFiltro={removeFiltro} onConector={setConector}
            onToggleAgrupamento={toggleAgrupamento}
            onClose={() => setPainel(null)}
          />
        )}
        {blockSelecionado && (
          <BlockConfigPanel blk={blockSelecionado} campos={campos} agrupamento={agrupamento}
            onChange={patch => updateBlockConfig(blockSelecionado.id, patch)}
            onClose={() => setPainel(null)} />
        )}
      </div>
    </div>
  )
}

// ─── Escolher fonte (primeira tela, sem relatório ainda) ─────────────────────
function EscolherFonte({ onEscolher }) {
  return (
    <div style={s.escolherFonte}>
      <div style={s.escolherFonteEyebrow}>Novo relatório</div>
      <h1 style={s.escolherFonteTitulo}>De qual cadastro você quer partir?</h1>
      <p style={s.escolherFonteHint}>Você poderá trazer campos de outros cadastros relacionados depois, sem escrever consulta nenhuma.</p>
      <div style={s.grid}>
        {ENTIDADES.map(e => (
          <button key={e.id} onClick={() => onEscolher(e.id)} style={s.entityCard}>
            <span style={s.entityIcon}>{e.icon}</span>
            <span style={s.entityLabel}>{e.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Zona de inserção entre dois blocos — some quando o mouse não está por
// perto (mesmo padrão do SharePoint/Notion: só aparece no hover, não ocupa
// espaço visual o resto do tempo).
function InsertBetween({ onAdd }) {
  const [hover, setHover] = useState(false)
  return (
    <div style={s.insertZone} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {hover && (
        <div style={s.insertLine}>
          <button onClick={onAdd} style={s.insertBtn} title="Adicionar bloco aqui"><Plus size={12} /></button>
          <div style={s.insertRule} />
        </div>
      )}
    </div>
  )
}

function EmptyBlocks({ onAdd }) {
  return (
    <div style={s.emptyBlocks}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Seu relatório está vazio</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, maxWidth: 360, textAlign: 'center' }}>
        Adicione um bloco — um KPI, uma tabela, um gráfico — pra começar a responder sua pergunta de negócio.
      </div>
      <button style={s.btnPrimary} onClick={onAdd}><Plus size={14} /> Adicionar bloco</button>
    </div>
  )
}

// ─── Menu de biblioteca de blocos ─────────────────────────────────────────────
function BlockPicker({ onPick, onClose }) {
  return (
    <div style={s.pickerOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.pickerBox}>
        <div style={s.pickerHead}>
          <span>Adicionar bloco</span>
          <button style={s.iconBtn} onClick={onClose}><X size={14} /></button>
        </div>
        <div style={s.pickerGrid}>
          {BLOCO_TIPOS.map(({ tipo, label, desc, Icon }) => (
            <button key={tipo} style={s.pickerItem} onClick={() => onPick(tipo)}>
              <Icon size={18} color="var(--accent)" strokeWidth={1.75} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Invólucro de bloco — toolbar discreta ao passar o mouse ─────────────────
function BlockWrapper({ children, idx, total, emLinha, emLinhaGrafico, colapsado, onToggleColapsar, selecionado, onSelect, onMoveUp, onMoveDown, onDuplicate, onRemove }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      style={{ ...s.blockWrap, ...(emLinha ? (emLinhaGrafico ? s.blockWrapEmLinhaGrafico : s.blockWrapEmLinha) : {}), ...(selecionado ? s.blockWrapSel : {}) }}>
      {(hover || selecionado) && (
        <div style={s.blockToolbar} onClick={e => e.stopPropagation()}>
          <span style={s.blockDragHint}><GripVertical size={12} /></span>
          <button style={s.iconBtn} disabled={idx === 0} onClick={onMoveUp}><ChevronUp size={13} /></button>
          <button style={s.iconBtn} disabled={idx === total - 1} onClick={onMoveDown}><ChevronDown size={13} /></button>
          <button style={s.iconBtn} onClick={onToggleColapsar} title={colapsado ? 'Expandir' : 'Recolher'}>
            {colapsado ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          <button style={s.iconBtn} onClick={onSelect} title="Configurar"><Settings2 size={13} /></button>
          <button style={s.iconBtn} onClick={onDuplicate} title="Duplicar"><Copy size={13} /></button>
          <button style={{ ...s.iconBtn, color: 'var(--red)' }} onClick={onRemove} title="Remover"><Trash2 size={13} /></button>
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Renderização de cada tipo de bloco ──────────────────────────────────────
function BlockView({ blk, linhas, campos, agrupamento, titulo }) {
  if (blk.tipo === 'kpi') return <KpiBlockView config={blk.config} linhas={linhas} campos={campos} />
  if (blk.tipo === 'tabela') return <TabelaBlockView config={blk.config} linhas={linhas} campos={campos} agrupamento={agrupamento} titulo={titulo} />
  if (blk.tipo === 'grafico') return <GraficoBlockView config={blk.config} linhas={linhas} campos={campos} />
  if (blk.tipo === 'texto') return <TextoBlockView config={blk.config} />
  if (blk.tipo === 'divisor') return <hr style={s.divisor} />
  if (blk.tipo === 'imagem') return <ImagemBlockView config={blk.config} />
  return null
}

function KpiBlockView({ config, linhas, campos }) {
  const valor = calcularKpi(linhas, campos, config)
  return (
    <div style={s.kpiCard}>
      <div style={{ ...s.kpiValue, color: config.cor || CHART_COLORS[0] }}>{formatarNumero(valor)}</div>
      <div style={s.kpiLabel}>{config.label || 'KPI'}</div>
    </div>
  )
}

function TabelaBlockView({ config, linhas, campos, agrupamento, titulo }) {
  const colunas = (config.colunas || []).map(id => campos.find(c => c.id === id)).filter(Boolean)
  const camposAgrupObjs = agrupamento.map(id => campos.find(c => c.id === id)).filter(Boolean)

  const linhasOrdenadas = useMemo(() => {
    const campoOrd = config.ordenacao ? campos.find(c => c.id === config.ordenacao.campoId) : null
    if (camposAgrupObjs.length === 0 && !campoOrd) return linhas
    return [...linhas].sort((a, b) => {
      for (const c of camposAgrupObjs) {
        const va = formatarValor(valorDoCampo(a, c, campos))
        const vb = formatarValor(valorDoCampo(b, c, campos))
        if (va !== vb) return va < vb ? -1 : 1
      }
      if (campoOrd) {
        const va = valorDoCampo(a, campoOrd, campos)
        const vb = valorDoCampo(b, campoOrd, campos)
        let cmp
        if (campoOrd.type === 'number') cmp = (Number(va) || 0) - (Number(vb) || 0)
        else cmp = String(va ?? '').localeCompare(String(vb ?? ''))
        return config.ordenacao.dir === 'desc' ? -cmp : cmp
      }
      return 0
    })
  }, [linhas, campos, camposAgrupObjs, config.ordenacao])

  const [pagina, setPagina] = useState(1)
  const tamanhoPagina = 20
  const totalPaginas = Math.max(1, Math.ceil(linhasOrdenadas.length / tamanhoPagina))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const visiveis = camposAgrupObjs.length > 0 ? linhasOrdenadas : linhasOrdenadas.slice((paginaSegura - 1) * tamanhoPagina, paginaSegura * tamanhoPagina)

  function chaveGrupo(linha) { return camposAgrupObjs.map(c => formatarValor(valorDoCampo(linha, c, campos))).join(' · ') }
  let chaveAnterior = null

  if (colunas.length === 0) {
    return <div style={s.blockEmpty}>Escolha as colunas dessa tabela no painel ao lado.</div>
  }

  return (
    <div>
      <div style={s.tabelaToolbar}>
        <span style={s.tabelaCount}>{linhasOrdenadas.length} registro{linhasOrdenadas.length !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={s.btnGhostSm} onClick={() => exportarCSV(colunas, linhasOrdenadas, titulo)}>CSV</button>
          <button style={s.btnGhostSm} onClick={() => exportarExcel(colunas, linhasOrdenadas, titulo)}><FileDown size={12} /> Excel</button>
        </div>
      </div>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead><tr>{colunas.map(c => <th key={c.id} style={s.th}>{c.label}</th>)}</tr></thead>
          <tbody>
            {visiveis.map((linha, idx) => {
              const chave = camposAgrupObjs.length > 0 ? chaveGrupo(linha) : null
              const novoGrupo = chave !== null && chave !== chaveAnterior
              chaveAnterior = chave
              return (
                <RowComGrupo key={idx} linha={linha} campos={colunas} todosCampos={campos} novoGrupo={novoGrupo} chave={chave} />
              )
            })}
            {visiveis.length === 0 && <tr><td colSpan={colunas.length} style={s.tdEmpty}>Nenhum registro encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
      {camposAgrupObjs.length === 0 && totalPaginas > 1 && (
        <div style={s.paginacao}>
          <button style={s.btnGhostSm} disabled={paginaSegura === 1} onClick={() => setPagina(p => p - 1)}>‹ Anterior</button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Página {paginaSegura} de {totalPaginas}</span>
          <button style={s.btnGhostSm} disabled={paginaSegura === totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima ›</button>
        </div>
      )}
    </div>
  )
}

function RowComGrupo({ linha, campos, todosCampos, novoGrupo, chave }) {
  return (
    <>
      {novoGrupo && (
        <tr><td colSpan={campos.length} style={s.groupHeaderCell}>{chave || '(vazio)'}</td></tr>
      )}
      <tr>
        {campos.map(c => <td key={c.id} style={s.td}>{formatarValor(valorDoCampo(linha, c, todosCampos))}</td>)}
      </tr>
    </>
  )
}

function GraficoBlockView({ config, linhas, campos }) {
  const eixoX = campos.find(c => c.id === config.eixoXId)
  const metrica = campos.find(c => c.id === config.campoMetricaId)
  if (!eixoX) return <div style={s.blockEmpty}>Escolha o eixo de categorias (X) no painel ao lado.</div>

  const dados = agregarPorGrupo(linhas, eixoX, metrica, config.agregacao, campos).slice(0, 30)
  const cor = config.cor || CHART_COLORS[0]

  if (dados.length === 0) return <div style={s.blockEmpty}>Sem dados pra exibir com os filtros atuais.</div>

  if (config.tipo === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={dados} dataKey="valor" nameKey="chave" cx="50%" cy="50%" outerRadius={110} label={({ chave }) => chave}>
            {dados.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }
  if (config.tipo === 'line') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="chave" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="valor" stroke={cor} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  // 'bar' e 'funil' (funil = barras horizontais ordenadas, sem lib própria de funil)
  const funil = config.tipo === 'funil'
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, dados.length * (funil ? 36 : 0) + (funil ? 40 : 280))}>
      <BarChart data={dados} layout={funil ? 'vertical' : 'horizontal'} margin={{ left: funil ? 80 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        {funil ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="chave" tick={{ fontSize: 11 }} width={100} />
          </>
        ) : (
          <>
            <XAxis dataKey="chave" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
          </>
        )}
        <Tooltip />
        <Bar dataKey="valor" fill={cor} radius={[4, 4, 4, 4]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function TextoBlockView({ config }) {
  if (config.tamanho === 'titulo') return <h2 style={s.textoTitulo}>{config.conteudo}</h2>
  return <p style={s.textoParagrafo}>{config.conteudo}</p>
}

function ImagemBlockView({ config }) {
  if (!config.url) return <div style={s.blockEmpty}>Cole a URL da imagem no painel ao lado.</div>
  return <img src={config.url} alt="" style={s.imagemBlock} />
}

// ─── Painel "Dados" — fonte, relacionamentos, campos, filtros, agrupamento ──
function DataPanel({ sources, entidade, entidadeId, joins, relacionadas, campos, filtros, conector, agrupamento, entidadesAtivas, onEscolherEntidade, onToggleJoin, onToggleCampo, onAddCalculado, onRemoverCampo, onMoverCampo, onAddFiltro, onUpdateFiltro, onRemoveFiltro, onConector, onToggleAgrupamento, onClose }) {
  const [secao, setSecao] = useState('fonte')
  const [busca, setBusca] = useState('')

  const grupos = entidadesAtivas
    .map(id => sources.find(s => s.id === id))
    .filter(Boolean)
    .map(src => ({ ...src, fields: (src.fields || []).filter(f => !busca || f.label.toLowerCase().includes(busca.toLowerCase())) }))
  const selecionadosSet = new Set(campos.map(c => c.id))

  function campoDe(id) { return campos.find(c => c.id === id) }

  return (
    <div style={s.painel}>
      <div style={s.painelHead}>
        <span style={s.painelTitulo}><Database size={14} /> Dados do relatório</span>
        <button style={s.iconBtn} onClick={onClose}><X size={14} /></button>
      </div>

      <div style={s.painelTabs}>
        {[
          { id: 'fonte', label: 'Fonte', Icon: Database },
          { id: 'campos', label: 'Campos', Icon: Layers },
          { id: 'filtros', label: 'Filtros', Icon: Filter },
        ].map(({ id, label, Icon }) => (
          <button key={id} style={{ ...s.painelTab, ...(secao === id ? s.painelTabAtivo : {}) }} onClick={() => setSecao(id)}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      <div style={s.painelBody}>
        {secao === 'fonte' && (
          <>
            <div style={s.painelSubtitulo}>Entidade principal</div>
            <div style={s.grid2}>
              {ENTIDADES.map(e => (
                <button key={e.id} onClick={() => onEscolherEntidade(e.id)}
                  style={{ ...s.entityCardSm, ...(entidadeId === e.id ? s.entityCardSmSel : {}) }}>
                  <span>{e.icon}</span> {e.label}
                </button>
              ))}
            </div>

            {entidade && (
              <>
                <div style={{ ...s.painelSubtitulo, marginTop: 20 }}>Relacionamentos (JOIN)</div>
                {relacionadas.length === 0 && <div style={s.emptyRel}>Nenhum relacionamento mapeado pra essa entidade.</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {relacionadas.map(({ entidade: rel, relacao }) => {
                    const incluida = joins.includes(rel.id)
                    return (
                      <button key={rel.id} onClick={() => onToggleJoin(rel.id)} style={{ ...s.relRow, ...(incluida ? s.relRowSel : {}) }}>
                        <span style={s.relCheck}>{incluida && <Check size={12} strokeWidth={3} />}</span>
                        <span>{rel.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 12.5, flexShrink: 0, minWidth: 100 }}>{rel.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relacao.rotulo}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {secao === 'campos' && entidade && (
          <>
            <div style={s.searchWrap2}>
              <Search size={12} style={s.searchIcon2} />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar campo…" style={s.searchInput2} />
            </div>
            {grupos.map(g => (
              <div key={g.id} style={{ marginBottom: 14 }}>
                <div style={s.groupHead}><span>{g.icon}</span> {g.label}</div>
                {g.fields.map(f => {
                  const campoId = `${g.id}.${f.key}`
                  const sel = selecionadosSet.has(campoId)
                  return (
                    <button key={campoId} onClick={() => onToggleCampo(g.id, f)} style={{ ...s.fieldRow, ...(sel ? s.fieldRowSel : {}) }}>
                      <span style={s.relCheck}>{sel && <Check size={11} strokeWidth={3} />}</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{f.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}

            <div style={{ ...s.painelSubtitulo, marginTop: 8 }}>Campos calculados</div>
            <CamposCalculadosBox campos={campos} onAddCalculado={onAddCalculado} />

            {campos.length > 0 && (
              <>
                <div style={{ ...s.painelSubtitulo, marginTop: 20 }}>Selecionados ({campos.length})</div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4, marginBottom: 8 }}>Essa ordem é a que os campos entram nos blocos novos.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {campos.map((c, idx) => (
                    <div key={c.id} style={s.colConfigRow}>
                      <button style={s.iconBtnXs} disabled={idx === 0} onClick={() => onMoverCampo(idx, -1)}><ChevronUp size={11} /></button>
                      <button style={s.iconBtnXs} disabled={idx === campos.length - 1} onClick={() => onMoverCampo(idx, 1)}><ChevronDown size={11} /></button>
                      <span style={{ flex: 1, fontSize: 12.5 }}>{c.calculado && '🧮 '}{c.label}</span>
                      <button style={s.iconBtnXs} onClick={() => onRemoverCampo(c.id)}><X size={11} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {secao === 'filtros' && (
          <>
            <div style={s.painelSubtitulo}>Filtros</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {filtros.map((f, idx) => {
                const campo = campoDe(f.campoId)
                const ops = campo ? operadoresDe(campo.type) : []
                return (
                  <div key={f.id} style={s.filterRow}>
                    {idx > 0 && <button style={s.connector} onClick={() => onConector(conector === 'E' ? 'OU' : 'E')}>{conector}</button>}
                    <select style={s.filterSelect} value={f.campoId} onChange={e => {
                      const novoCampo = campoDe(e.target.value)
                      onUpdateFiltro(f.id, { campoId: e.target.value, operador: operadoresDe(novoCampo?.type)[0]?.id || '=' })
                    }}>
                      {campos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <select style={{ ...s.filterSelect, flex: '0 0 70px' }} value={f.operador} onChange={e => onUpdateFiltro(f.id, { operador: e.target.value })}>
                      {ops.map(o => <option key={o.id} value={o.id}>{o.l}</option>)}
                    </select>
                    <input style={s.filterInput} value={f.valor} onChange={e => onUpdateFiltro(f.id, { valor: e.target.value })}
                      type={campo?.type === 'number' ? 'number' : campo?.type === 'date' ? 'date' : 'text'} placeholder="valor" />
                    <button style={s.removeBtn} onClick={() => onRemoveFiltro(f.id)}><X size={13} /></button>
                  </div>
                )
              })}
            </div>
            <button style={s.addLink} onClick={onAddFiltro} disabled={campos.length === 0}>+ Adicionar filtro</button>

            <div style={{ ...s.painelSubtitulo, marginTop: 22 }}>Agrupamento</div>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8 }}>Usado por tabelas (cabeçalhos de grupo) e como sugestão de eixo em gráficos.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {campos.map(c => {
                const sel = agrupamento.includes(c.id)
                return (
                  <button key={c.id} onClick={() => onToggleAgrupamento(c.id)} style={{ ...s.campoChip, cursor: 'pointer', ...(sel ? s.campoChipSel : {}) }}>
                    {sel && <Check size={10} strokeWidth={3} />} {c.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const OPERADORES_CALCULO = [{ id: '+', l: '+' }, { id: '-', l: '−' }, { id: '*', l: '×' }, { id: '/', l: '÷' }]

function CamposCalculadosBox({ campos, onAddCalculado }) {
  const numericos = campos.filter(c => !c.calculado && c.type === 'number')
  const [aberto, setAberto] = useState(false)
  const [label, setLabel]   = useState('')
  const [aTipo, setATipo]   = useState('campo')
  const [aCampo, setACampo] = useState('')
  const [aValor, setAValor] = useState('')
  const [op, setOp]         = useState('+')
  const [bTipo, setBTipo]   = useState('campo')
  const [bCampo, setBCampo] = useState('')
  const [bValor, setBValor] = useState('')

  function resetForm() {
    setLabel(''); setATipo('campo'); setACampo(''); setAValor('')
    setOp('+'); setBTipo('campo'); setBCampo(''); setBValor('')
    setAberto(false)
  }
  function confirmar() {
    if (!label.trim()) return
    const a = aTipo === 'campo' ? { tipo: 'campo', campoId: aCampo } : { tipo: 'valor', valor: aValor }
    const b = bTipo === 'campo' ? { tipo: 'campo', campoId: bCampo } : { tipo: 'valor', valor: bValor }
    if (aTipo === 'campo' && !aCampo) return
    if (bTipo === 'campo' && !bCampo) return
    onAddCalculado({ label: label.trim(), a, op, b })
    resetForm()
  }

  return (
    <div>
      {!aberto && (
        <button style={s.addLink} onClick={() => setAberto(true)} disabled={numericos.length === 0}>+ Novo campo calculado</button>
      )}
      {aberto && numericos.length === 0 && <div style={s.emptyRel}>Selecione um campo numérico primeiro.</div>}
      {aberto && numericos.length > 0 && (
        <div style={s.calcBox}>
          <input style={s.filterInput} placeholder="Nome (ex: Margem)" value={label} onChange={e => setLabel(e.target.value)} />
          <div style={s.calcRow}>
            <select style={s.filterSelect} value={aTipo} onChange={e => setATipo(e.target.value)}>
              <option value="campo">Campo</option><option value="valor">Valor</option>
            </select>
            {aTipo === 'campo'
              ? <select style={s.filterSelect} value={aCampo} onChange={e => setACampo(e.target.value)}><option value="">Selecione…</option>{numericos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
              : <input style={s.filterInput} type="number" value={aValor} onChange={e => setAValor(e.target.value)} />}
            <select style={{ ...s.filterSelect, flex: '0 0 50px' }} value={op} onChange={e => setOp(e.target.value)}>
              {OPERADORES_CALCULO.map(o => <option key={o.id} value={o.id}>{o.l}</option>)}
            </select>
            <select style={s.filterSelect} value={bTipo} onChange={e => setBTipo(e.target.value)}>
              <option value="campo">Campo</option><option value="valor">Valor</option>
            </select>
            {bTipo === 'campo'
              ? <select style={s.filterSelect} value={bCampo} onChange={e => setBCampo(e.target.value)}><option value="">Selecione…</option>{numericos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
              : <input style={s.filterInput} type="number" value={bValor} onChange={e => setBValor(e.target.value)} />}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={s.btnGhostSm} onClick={resetForm}>Cancelar</button>
            <button style={s.btnPrimarySm} onClick={confirmar}>Adicionar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Painel de configuração do bloco selecionado ────────────────────────────
function BlockConfigPanel({ blk, campos, agrupamento, onChange, onClose }) {
  const meta = BLOCO_TIPOS.find(b => b.tipo === blk.tipo)
  return (
    <div style={s.painel}>
      <div style={s.painelHead}>
        <span style={s.painelTitulo}>{meta?.Icon && <meta.Icon size={14} />} {meta?.label}</span>
        <button style={s.iconBtn} onClick={onClose}><X size={14} /></button>
      </div>
      <div style={s.painelBody}>
        {blk.tipo === 'kpi' && <KpiConfig config={blk.config} campos={campos} onChange={onChange} />}
        {blk.tipo === 'tabela' && <TabelaConfig config={blk.config} campos={campos} onChange={onChange} />}
        {blk.tipo === 'grafico' && <GraficoConfig config={blk.config} campos={campos} agrupamento={agrupamento} onChange={onChange} />}
        {blk.tipo === 'texto' && <TextoConfig config={blk.config} onChange={onChange} />}
        {blk.tipo === 'imagem' && <ImagemConfig config={blk.config} onChange={onChange} />}
        {blk.tipo === 'divisor' && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Divisor não tem configurações.</div>}
      </div>
    </div>
  )
}

function KpiConfig({ config, campos, onChange }) {
  const numericos = campos.filter(c => c.type === 'number')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={s.lbl}>Rótulo</label>
        <input style={s.inp} value={config.label} onChange={e => onChange({ label: e.target.value })} />
      </div>
      <div>
        <label style={s.lbl}>Métrica</label>
        <select style={s.inp} value={config.agregacao} onChange={e => onChange({ agregacao: e.target.value, campoId: e.target.value === 'contagem' ? null : config.campoId })}>
          {AGREGACOES.map(a => <option key={a.id} value={a.id}>{a.l}</option>)}
        </select>
      </div>
      {config.agregacao !== 'contagem' && (
        <div>
          <label style={s.lbl}>Campo</label>
          <select style={s.inp} value={config.campoId || ''} onChange={e => onChange({ campoId: e.target.value })}>
            <option value="">Selecione…</option>
            {numericos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      )}
      <div>
        <label style={s.lbl}>Cor</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {CHART_COLORS.map(c => (
            <button key={c} onClick={() => onChange({ cor: c })}
              style={{ width: 24, height: 24, borderRadius: 6, background: c, border: config.cor === c ? '2px solid var(--text)' : '1px solid var(--border)', cursor: 'pointer' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TabelaConfig({ config, campos, onChange }) {
  const colunas = config.colunas || []
  function toggle(id) {
    onChange({ colunas: colunas.includes(id) ? colunas.filter(x => x !== id) : [...colunas, id] })
  }
  function mover(idx, dir) {
    const i = idx + dir
    if (i < 0 || i >= colunas.length) return
    const next = [...colunas]
    ;[next[idx], next[i]] = [next[i], next[idx]]
    onChange({ colunas: next })
  }
  return (
    <div>
      <label style={s.lbl}>Colunas</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {colunas.map((id, idx) => {
          const c = campos.find(x => x.id === id)
          if (!c) return null
          return (
            <div key={id} style={s.colConfigRow}>
              <button style={s.iconBtnXs} disabled={idx === 0} onClick={() => mover(idx, -1)}><ChevronUp size={11} /></button>
              <button style={s.iconBtnXs} disabled={idx === colunas.length - 1} onClick={() => mover(idx, 1)}><ChevronDown size={11} /></button>
              <span style={{ flex: 1, fontSize: 12.5 }}>{c.label}</span>
              <button style={s.iconBtnXs} onClick={() => toggle(id)}><X size={11} /></button>
            </div>
          )
        })}
      </div>
      <label style={s.lbl}>Adicionar coluna</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {campos.filter(c => !colunas.includes(c.id)).map(c => (
          <button key={c.id} style={s.groupOption} onClick={() => toggle(c.id)}>+ {c.label}</button>
        ))}
      </div>

      <label style={{ ...s.lbl, marginTop: 20 }}>Ordenar por</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <select style={s.inp} value={config.ordenacao?.campoId || ''} onChange={e => onChange({ ordenacao: e.target.value ? { campoId: e.target.value, dir: config.ordenacao?.dir || 'asc' } : null })}>
          <option value="">Nenhuma</option>
          {campos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {config.ordenacao && (
          <button style={s.iconBtn} onClick={() => onChange({ ordenacao: { ...config.ordenacao, dir: config.ordenacao.dir === 'asc' ? 'desc' : 'asc' } })}>
            {config.ordenacao.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}

function GraficoConfig({ config, campos, agrupamento, onChange }) {
  const numericos = campos.filter(c => c.type === 'number')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={s.lbl}>Tipo</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[{ v: 'bar', l: 'Barra', Icon: BarChart2 }, { v: 'line', l: 'Linha', Icon: LineChartIcon }, { v: 'pie', l: 'Pizza', Icon: PieChartIcon }, { v: 'funil', l: 'Funil', Icon: BarChart2 }].map(({ v, l, Icon }) => (
            <button key={v} onClick={() => onChange({ tipo: v })} style={{ ...s.chartTypeBtn, ...(config.tipo === v ? s.chartTypeBtnSel : {}) }}>
              <Icon size={14} /> {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={s.lbl}>Categorias (eixo X)</label>
        <select style={s.inp} value={config.eixoXId || ''} onChange={e => onChange({ eixoXId: e.target.value })}>
          <option value="">Selecione…</option>
          {campos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {agrupamento.length > 0 && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>Sugestão: {campos.find(c => c.id === agrupamento[0])?.label}</div>}
      </div>
      <div>
        <label style={s.lbl}>Métrica</label>
        <select style={s.inp} value={config.agregacao} onChange={e => onChange({ agregacao: e.target.value, campoMetricaId: e.target.value === 'contagem' ? null : config.campoMetricaId })}>
          {AGREGACOES.map(a => <option key={a.id} value={a.id}>{a.l}</option>)}
        </select>
      </div>
      {config.agregacao !== 'contagem' && (
        <div>
          <label style={s.lbl}>Campo</label>
          <select style={s.inp} value={config.campoMetricaId || ''} onChange={e => onChange({ campoMetricaId: e.target.value })}>
            <option value="">Selecione…</option>
            {numericos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      )}
      <div>
        <label style={s.lbl}>Cor</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {CHART_COLORS.map(c => (
            <button key={c} onClick={() => onChange({ cor: c })}
              style={{ width: 24, height: 24, borderRadius: 6, background: c, border: config.cor === c ? '2px solid var(--text)' : '1px solid var(--border)', cursor: 'pointer' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TextoConfig({ config, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={s.lbl}>Tamanho</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ v: 'titulo', l: 'Título' }, { v: 'normal', l: 'Parágrafo' }].map(({ v, l }) => (
            <button key={v} onClick={() => onChange({ tamanho: v })} style={{ ...s.chartTypeBtn, ...(config.tamanho === v ? s.chartTypeBtnSel : {}) }}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={s.lbl}>Conteúdo</label>
        <textarea style={{ ...s.inp, minHeight: 90, resize: 'vertical' }} value={config.conteudo} onChange={e => onChange({ conteudo: e.target.value })} />
      </div>
    </div>
  )
}

function ImagemConfig({ config, onChange }) {
  return (
    <div>
      <label style={s.lbl}>URL da imagem</label>
      <input style={s.inp} value={config.url} onChange={e => onChange({ url: e.target.value })} placeholder="https://…" />
    </div>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--surface2)' },

  header: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
  titleInput: { flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)', border: 'none', background: 'none', outline: 'none', fontFamily: 'var(--font)', padding: 0 },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-soft)', fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font)' },
  btnGhostAtivo: { color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-glow)' },
  btnGhostSm: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--border)', color: 'var(--text-soft)', fontSize: 11.5, fontWeight: 600, padding: '5px 9px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font)' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font)' },
  btnPrimarySm: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font)' },
  acessoSelect: { fontSize: 12, fontWeight: 600, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-soft)', fontFamily: 'var(--font)' },

  papeisRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, padding: '8px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 },
  papeisLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' },
  papelChip: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--font)' },
  papelChipSel: { color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-glow)' },

  body: { flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' },
  centro: { flex: 1, overflowY: 'auto', padding: '32px 40px', position: 'relative' },

  escolherFonte: { maxWidth: 640, margin: '40px auto' },
  escolherFonteEyebrow: { fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  escolherFonteTitulo: { fontSize: 22, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' },
  escolherFonteHint: { fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.6, marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 },
  entityCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '16px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' },
  entityIcon: { fontSize: 20 },
  entityLabel: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },

  emptyBlocks: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' },

  blocosLista: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 880, margin: '0 auto' },
  kpiRowWrap: { display: 'flex', flexWrap: 'wrap', gap: 14 },
  blockWrap: { position: 'relative', borderRadius: 10, border: '1.5px solid transparent', padding: 16, cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s' },
  blockWrapEmLinha: { flex: '0 0 auto' },
  blockWrapEmLinhaGrafico: { flex: '1 1 380px', minWidth: 320 },
  blockWrapSel: { borderColor: 'var(--accent)', background: 'var(--surface)' },
  blockToolbar: { position: 'absolute', top: -14, right: 8, display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 5 },
  blockDragHint: { color: 'var(--border2)', display: 'flex', padding: '0 2px' },
  blockEmpty: { padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: 8 },
  blockColapsadoResumo: { padding: '8px 2px', fontSize: 12.5, color: 'var(--text-muted)' },

  addBlockInline: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 8, border: '1.5px dashed var(--border2)', background: 'none', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  insertZone: { height: 16, margin: '-8px 0', position: 'relative', zIndex: 4 },
  insertLine: { display: 'flex', alignItems: 'center', gap: 8, height: '100%', padding: '0 2px' },
  insertBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', flexShrink: 0 },
  insertRule: { flex: 1, height: 1, background: 'var(--accent)' },

  pickerOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  pickerBox: { width: 380, background: 'var(--surface)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' },
  pickerHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)' },
  pickerGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: 8 },
  pickerItem: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' },

  kpiCard: { padding: '18px 22px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', display: 'inline-block', minWidth: 160 },
  kpiValue: { fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' },
  kpiLabel: { fontSize: 12.5, color: 'var(--text-soft)', marginTop: 4 },

  tabelaToolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  tabelaCount: { fontSize: 12, color: 'var(--text-muted)' },
  tableWrap: { border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto', maxHeight: 480 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', position: 'sticky', top: 0 },
  td: { padding: '8px 12px', borderBottom: '1px solid var(--border2)', color: 'var(--text)' },
  tdEmpty: { padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 },
  groupHeaderCell: { padding: '8px 12px', fontWeight: 700, fontSize: 11.5, color: 'var(--accent)', background: 'var(--accent-glow)' },
  paginacao: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 10 },

  divisor: { border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' },
  textoTitulo: { fontSize: 19, fontWeight: 700, color: 'var(--text)', margin: 0 },
  textoParagrafo: { fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.6, margin: 0 },
  imagemBlock: { maxWidth: '100%', borderRadius: 8 },

  painel: { width: 320, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', minHeight: 0 },
  painelHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  painelTitulo: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' },
  painelTabs: { display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  painelTab: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 0', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  painelTabAtivo: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  painelBody: { flex: 1, overflowY: 'auto', padding: 16 },
  painelSubtitulo: { fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  entityCardSm: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font)', textAlign: 'left' },
  entityCardSmSel: { borderColor: 'var(--accent)', background: 'var(--accent-glow)', color: 'var(--accent)' },

  emptyRel: { padding: '10px 0', color: 'var(--text-muted)', fontSize: 11.5, fontStyle: 'italic' },
  relRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', width: '100%' },
  relRowSel: { borderColor: 'var(--accent)', background: 'var(--accent-glow)' },
  relCheck: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: 4, border: '1.5px solid var(--border2)', color: 'var(--accent)', flexShrink: 0 },

  searchWrap2: { position: 'relative', marginBottom: 10 },
  searchIcon2: { position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  searchInput2: { width: '100%', boxSizing: 'border-box', padding: '6px 8px 6px 26px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none' },
  groupHead: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 0' },
  fieldRow: { display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '5px 6px', borderRadius: 5, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text)' },
  fieldRowSel: { background: 'var(--accent-glow)' },

  campoChip: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 7px' },
  campoChipSel: { color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-glow)' },
  chipRemove: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 },

  filterRow: { display: 'flex', alignItems: 'center', gap: 5 },
  connector: { flexShrink: 0, width: 26, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--accent)', fontSize: 9.5, fontWeight: 800, cursor: 'pointer' },
  filterSelect: { flex: 1, minWidth: 0, fontSize: 11.5, padding: '5px 5px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)' },
  filterInput: { flex: 1, minWidth: 0, fontSize: 11.5, padding: '5px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)' },
  removeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 },
  addLink: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' },

  calcBox: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)' },
  calcRow: { display: 'flex', alignItems: 'center', gap: 4 },

  lbl: { fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 },
  inp: { width: '100%', boxSizing: 'border-box', padding: '7px 9px', fontSize: 12.5, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none' },

  colConfigRow: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 6, background: 'var(--surface2)' },
  iconBtnXs: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 1 },
  groupOption: { fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-glow)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontFamily: 'var(--font)' },

  chartTypeBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-soft)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  chartTypeBtnSel: { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-glow)' },

  iconBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 5, display: 'flex', alignItems: 'center' },
}
