/**
 * Novo construtor de Relatórios — substitui gradualmente o editor de canvas
 * (CanvasEditor) por um assistente guiado em 4 fases, ancorado no motor de
 * relacionamentos entre entidades (ver proposta de arquitetura).
 *
 * Fases implementadas até aqui:
 *   1. Fonte       — escolher entidade principal + relacionamentos a incluir
 *   2. Colunas      — escolher quais campos (da entidade principal e das
 *                      relacionadas) entram no relatório, em que ordem, e
 *                      opcionalmente criar campos calculados (campo/valor
 *                      fixo ± × ÷ campo/valor fixo, ex: Valor − Custo)
 *   3. Regras       — filtros (E/OU) + agrupamento
 *   4. Resultado    — grade ao vivo (junção real), ordenação, export CSV/Excel
 *
 * Persistência reaproveita a mesma tabela `relatorios` usada pelo editor de
 * canvas (useRelatorios) — o estado do builder inteiro vai dentro de
 * `config.builder`, o que já basta pro relatório aparecer na listagem
 * existente em Relatorios.js. `elementos` (o formato do CanvasEditor) fica
 * vazio nesses relatórios; Relatorios.js detecta `config.builder` e abre
 * esta tela em vez do CanvasEditor ao clicar na linha.
 *
 * Vive lado a lado com Relatorios.js (não substitui o editor de canvas
 * ainda) — acessível por um item de menu na tela atual, pra comparação
 * lado a lado.
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronUp, ChevronDown, X, Search, Save } from 'lucide-react'
import { ENTIDADES, relacionadasDe, relacaoEntre } from '../data/reportEntities'
import { useDocumentDataSources } from '../hooks/useDocumentDataSources'
import { useRelatorios } from '../hooks/useRelatorios'

const FASES = [
  { id: 'fonte',     label: 'Fonte' },
  { id: 'colunas',   label: 'Colunas & Cálculo' },
  { id: 'regras',    label: 'Regras' },
  { id: 'resultado', label: 'Resultado' },
]

const OPERADORES_POR_TIPO = {
  text:   [{ id: '=', l: 'é' }, { id: '!=', l: 'não é' }, { id: 'contem', l: 'contém' }],
  number: [{ id: '=', l: '=' }, { id: '!=', l: '≠' }, { id: '>', l: '>' }, { id: '<', l: '<' }, { id: '>=', l: '≥' }, { id: '<=', l: '≤' }],
  date:   [{ id: '=', l: 'em' }, { id: '<', l: 'antes de' }, { id: '>', l: 'depois de' }],
}
function operadoresDe(tipo) { return OPERADORES_POR_TIPO[tipo] || OPERADORES_POR_TIPO.text }

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
      // A entidade base tem a FK — cada linha aponta pra no máximo 1 relacionado.
      const indice = new Map(relatedRows.map(rr => [String(rr.id), rr]))
      linhas = linhas.map(l => ({ ...l, [joinId]: indice.get(String(l[entidadeId]?.[r.campo])) || null }))
    } else {
      // A entidade relacionada tem a FK — pode haver vários por linha base.
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

// `todosCampos` só é necessário pra resolver os operandos de um campo
// calculado (formula.a/formula.b podem apontar pra outro campo por id) —
// campos comuns ignoram o parâmetro.
function valorDoCampo(linha, campo, todosCampos) {
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

function exportarCSV(campos, linhas) {
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
  a.download = 'relatorio.csv'
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

// Ordena linhas primeiro pelos níveis de agrupamento, depois pela ordenação
// escolhida pelo usuário na grade final (sempre nessa prioridade — agrupar
// sem respeitar essa ordem quebraria os cabeçalhos de grupo na tabela).
function ordenarLinhas(linhas, camposAgrupObjs, ordenacao, campos) {
  const campoOrd = ordenacao ? campos.find(c => c.id === ordenacao.campoId) : null
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
      else if (campoOrd.type === 'date') cmp = (va ? new Date(va).getTime() : 0) - (vb ? new Date(vb).getTime() : 0)
      else cmp = String(va ?? '').localeCompare(String(vb ?? ''))
      return ordenacao.dir === 'desc' ? -cmp : cmp
    }
    return 0
  })
}

export default function RelatoriosBuilder() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { sources } = useDocumentDataSources()
  const { relatorios, save } = useRelatorios('relatorio')

  const [fase, setFase]           = useState(0)
  const [fonteStep, setFonteStep] = useState(0) // dentro da fase "Fonte": 0=entidade, 1=relacionamentos
  const [entidadeId, setEntidadeId] = useState(null)
  const [joins, setJoins]         = useState([])   // ids de entidades relacionadas incluídas
  const [campos, setCampos]       = useState([])   // [{ id, entidadeId, key, label, type }]
  const [buscaCampo, setBuscaCampo] = useState('')
  const [filtros, setFiltros]     = useState([])   // [{ id, campoId, operador, valor }]
  const [conector, setConector]   = useState('E')   // 'E' | 'OU' — entre todas as regras de filtro
  const [agrupamento, setAgrupamento] = useState([]) // [campoId] em ordem
  const [ordenacao, setOrdenacao] = useState(null)   // { campoId, dir: 'asc'|'desc' } | null

  // Persistência — reaproveita a tabela `relatorios` (mesma do CanvasEditor).
  const [titulo, setTitulo]       = useState('Novo relatório')
  const [relatorioId, setRelatorioId] = useState(null)
  const [salvando, setSalvando]   = useState(false)
  const hidratado = useRef(false)

  // Carrega um relatório existente (?id=...) assim que a lista chegar —
  // só uma vez, pra não sobrescrever edições do usuário a cada reload da lista.
  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || hidratado.current || relatorios.length === 0) return
    const rel = relatorios.find(r => r.id === id)
    const b = rel?.config?.builder
    if (!b) return
    hidratado.current = true
    setRelatorioId(rel.id)
    setTitulo(rel.titulo || 'Novo relatório')
    setEntidadeId(b.entidadeId || null)
    setJoins(b.joins || [])
    setCampos(b.campos || [])
    setFiltros(b.filtros || [])
    setConector(b.conector || 'E')
    setAgrupamento(b.agrupamento || [])
    setOrdenacao(b.ordenacao || null)
    setFonteStep(1)
    setFase(3)
  }, [searchParams, relatorios])

  async function handleSalvar() {
    if (!entidadeId) return
    setSalvando(true)
    try {
      const config = { builder: { versao: 1, entidadeId, joins, campos, filtros, conector, agrupamento, ordenacao } }
      const result = await save({ id: relatorioId, titulo, tipo: 'relatorio', acesso: 'privado', status: 'rascunho', config, elementos: [] })
      if (result?.ok && result.relatorio) {
        setRelatorioId(result.relatorio.id)
        setSearchParams({ id: result.relatorio.id }, { replace: true })
      }
    } finally {
      setSalvando(false)
    }
  }

  const entidade      = ENTIDADES.find(e => e.id === entidadeId) || null
  const relacionadas   = useMemo(() => entidadeId ? relacionadasDe(entidadeId) : [], [entidadeId])
  const entidadesAtivas = useMemo(() => entidadeId ? [entidadeId, ...joins] : [], [entidadeId, joins])

  // Remove da seleção de campos qualquer entidade que deixou de estar ativa
  // (ex.: usuário voltou na fase Fonte e desmarcou um relacionamento).
  // Campos calculados não têm entidadeId (não vêm de uma fonte só) — nunca
  // são removidos por essa checagem, só manualmente pelo usuário.
  useEffect(() => {
    setCampos(prev => prev.filter(c => c.calculado || entidadesAtivas.includes(c.entidadeId)))
  }, [entidadesAtivas])

  // Idem pra filtros/agrupamento quando uma coluna usada neles é removida na
  // fase 2 (voltar e desmarcar um campo não pode deixar regra órfã).
  useEffect(() => {
    const camposIds = new Set(campos.map(c => c.id))
    setFiltros(prev => prev.filter(f => camposIds.has(f.campoId)))
    setAgrupamento(prev => prev.filter(id => camposIds.has(id)))
  }, [campos])

  function addFiltro() {
    if (campos.length === 0) return
    setFiltros(prev => [...prev, { id: `f_${Date.now()}`, campoId: campos[0].id, operador: operadoresDe(campos[0].type)[0].id, valor: '' }])
  }
  function updateFiltro(id, patch) {
    setFiltros(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }
  function removeFiltro(id) {
    setFiltros(prev => prev.filter(f => f.id !== id))
  }
  function toggleAgrupamento(campoId) {
    setAgrupamento(prev => prev.includes(campoId) ? prev.filter(x => x !== campoId) : [...prev, campoId])
  }
  function moverAgrupamento(idx, dir) {
    setAgrupamento(prev => {
      const i = idx + dir
      if (i < 0 || i >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[i]] = [next[i], next[idx]]
      return next
    })
  }

  function escolherEntidade(id) {
    setEntidadeId(id)
    setJoins([])
    setCampos([])
    setFonteStep(1)
  }

  function toggleJoin(id) {
    setJoins(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleCampo(entidadeId, field) {
    const campoId = `${entidadeId}.${field.key}`
    setCampos(prev => prev.some(c => c.id === campoId)
      ? prev.filter(c => c.id !== campoId)
      : [...prev, { id: campoId, entidadeId, key: field.key, label: field.label, type: field.type }])
  }

  function addCalculado({ label, a, op, b }) {
    setCampos(prev => [...prev, {
      id: `calc_${Date.now()}`, entidadeId: null, key: null,
      label: label || 'Campo calculado', type: 'number',
      calculado: true, formula: { a, op, b },
    }])
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

  const faseHabilitada = (i) => i === 0 || (i === 1 && entidadeId) || (i >= 2 && entidadeId)

  return (
    <div style={s.page}>
      {/* ── Cabeçalho + navegação de fases ── */}
      <div style={s.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.eyebrow}>Construtor de relatórios · novo{entidade ? ` · ${entidade.label}` : ''}</div>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Novo relatório" style={s.titleInput} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button style={s.btnGhost} onClick={() => navigate('/relatorios')}>Voltar aos relatórios</button>
          <button style={s.btnPrimary} disabled={!entidadeId || salvando} onClick={handleSalvar}>
            <Save size={14} /> {salvando ? 'Salvando…' : relatorioId ? 'Salvar' : 'Salvar relatório'}
          </button>
        </div>
      </div>

      <div style={s.faseNav}>
        {FASES.map((f, i) => {
          const ativo = i === fase
          const habilitado = faseHabilitada(i)
          return (
            <button key={f.id}
              disabled={!habilitado}
              onClick={() => habilitado && setFase(i)}
              style={{ ...s.faseTab, ...(ativo ? s.faseTabAtivo : {}), ...(!habilitado ? s.faseTabDisabled : {}) }}>
              <span style={s.faseNum}>{i + 1}</span>
              {f.label}
            </button>
          )
        })}
      </div>

      {/* ── Fase 1: Fonte (entidade → relacionamentos) ── */}
      {fase === 0 && fonteStep === 0 && (
        <div style={s.body}>
          <p style={s.hint}>De qual cadastro este relatório vai partir? Você poderá trazer campos de outros cadastros relacionados na próxima etapa.</p>
          <div style={s.grid}>
            {ENTIDADES.map(e => (
              <button key={e.id} onClick={() => escolherEntidade(e.id)}
                style={{ ...s.entityCard, ...(entidadeId === e.id ? s.entityCardSel : {}) }}>
                <span style={s.entityIcon}>{e.icon}</span>
                <span style={s.entityLabel}>{e.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {fase === 0 && fonteStep === 1 && entidade && (
        <div style={s.body}>
          <p style={s.hint}>
            Marque quais cadastros relacionados a <strong>{entidade.label}</strong> você quer trazer para este relatório.
            Campos desses cadastros ficarão disponíveis na próxima etapa.
          </p>

          {relacionadas.length === 0 && (
            <div style={s.emptyRel}>Esta entidade ainda não tem relacionamentos mapeados no motor.</div>
          )}

          <div style={s.relList}>
            {relacionadas.map(({ entidade: rel, relacao }) => {
              const incluida = joins.includes(rel.id)
              return (
                <button key={rel.id} onClick={() => toggleJoin(rel.id)}
                  style={{ ...s.relRow, ...(incluida ? s.relRowSel : {}) }}>
                  <span style={s.relCheck}>{incluida && <Check size={13} strokeWidth={3} />}</span>
                  <span style={s.relIcon}>{rel.icon}</span>
                  <span style={s.relLabel}>{rel.label}</span>
                  <span style={s.relCard}>{relacao.rotulo}</span>
                </button>
              )
            })}
          </div>

          <div style={s.footerNav}>
            <button style={s.btnGhost} onClick={() => setFonteStep(0)}><ArrowLeft size={14} /> Trocar entidade</button>
            <button style={s.btnPrimary} onClick={() => setFase(1)}>Continuar <ArrowRight size={14} /></button>
          </div>
        </div>
      )}

      {/* ── Fase 2: Colunas ── */}
      {fase === 1 && entidade && (
        <ColunasFase
          entidadesAtivas={entidadesAtivas}
          sources={sources}
          campos={campos}
          busca={buscaCampo}
          onBusca={setBuscaCampo}
          onToggleCampo={toggleCampo}
          onMoverCampo={moverCampo}
          onRemoverCampo={id => setCampos(prev => prev.filter(c => c.id !== id))}
          onAddCalculado={addCalculado}
          onVoltar={() => { setFase(0); setFonteStep(1) }}
          onContinuar={() => setFase(2)}
        />
      )}

      {/* ── Fase 3: Regras (filtros + agrupamento) ── */}
      {fase === 2 && (
        <RegrasFase
          campos={campos}
          filtros={filtros}
          conector={conector}
          onConector={setConector}
          onAddFiltro={addFiltro}
          onUpdateFiltro={updateFiltro}
          onRemoveFiltro={removeFiltro}
          agrupamento={agrupamento}
          onToggleAgrupamento={toggleAgrupamento}
          onMoverAgrupamento={moverAgrupamento}
          onVoltar={() => setFase(1)}
          onContinuar={() => setFase(3)}
        />
      )}

      {/* ── Fase 4: Resultado (grade ao vivo) ── */}
      {fase === 3 && (
        <ResultadoFase
          sources={sources}
          entidadeId={entidadeId}
          joins={joins}
          campos={campos}
          filtros={filtros}
          conector={conector}
          agrupamento={agrupamento}
          ordenacao={ordenacao}
          onOrdenacao={setOrdenacao}
          titulo={titulo}
          onVoltar={() => setFase(2)}
        />
      )}
    </div>
  )
}

// ─── Fase "Colunas & Cálculo" — escolha de campos ────────────────────────────
function ColunasFase({ entidadesAtivas, sources, campos, busca, onBusca, onToggleCampo, onMoverCampo, onRemoverCampo, onAddCalculado, onVoltar, onContinuar }) {
  const grupos = entidadesAtivas
    .map(id => sources.find(s => s.id === id))
    .filter(Boolean)
    .map(src => ({
      ...src,
      fields: (src.fields || []).filter(f =>
        !busca || f.label.toLowerCase().includes(busca.toLowerCase())
      ),
    }))

  const selecionadosSet = useMemo(() => new Set(campos.map(c => c.id)), [campos])

  return (
    <div style={{ ...s.body, maxWidth: 'none' }}>
      <div style={{ display: 'flex', gap: 20, minHeight: 0 }}>
        {/* Disponíveis */}
        <div style={s.colPanel}>
          <div style={s.colPanelHead}>Campos disponíveis</div>
          <div style={s.searchWrap}>
            <Search size={13} style={s.searchIcon} />
            <input value={busca} onChange={e => onBusca(e.target.value)} placeholder="Buscar campo…" style={s.searchInput} />
          </div>
          <div style={s.colPanelBody}>
            {grupos.length === 0 && (
              <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 12.5 }}>Carregando fontes…</div>
            )}
            {grupos.map(g => (
              <div key={g.id} style={{ marginBottom: 16 }}>
                <div style={s.groupHead}><span>{g.icon}</span> {g.label}</div>
                {g.fields.length === 0 && <div style={s.groupEmpty}>Nenhum campo encontrado</div>}
                {g.fields.map(f => {
                  const campoId = `${g.id}.${f.key}`
                  const sel = selecionadosSet.has(campoId)
                  return (
                    <button key={campoId} onClick={() => onToggleCampo(g.id, f)}
                      style={{ ...s.fieldRow, ...(sel ? s.fieldRowSel : {}) }}>
                      <span style={s.relCheck}>{sel && <Check size={12} strokeWidth={3} />}</span>
                      <span style={{ flex: 1 }}>{f.label}</span>
                      <span style={s.fieldType}>{f.type}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Selecionados */}
        <div style={s.colPanel}>
          <div style={s.colPanelHead}>Colunas do relatório ({campos.length})</div>
          <div style={{ ...s.colPanelBody, paddingTop: 12 }}>
            {campos.length === 0 && (
              <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 12.5, fontStyle: 'italic' }}>
                Nenhum campo escolhido ainda — clique nos campos à esquerda.
              </div>
            )}
            {campos.map((c, idx) => {
              const g = ENTIDADES.find(e => e.id === c.entidadeId)
              return (
                <div key={c.id} style={s.selectedRow}>
                  <div style={s.reorderCol}>
                    <button disabled={idx === 0} onClick={() => onMoverCampo(idx, -1)} style={s.reorderBtn}><ChevronUp size={12} /></button>
                    <button disabled={idx === campos.length - 1} onClick={() => onMoverCampo(idx, 1)} style={s.reorderBtn}><ChevronDown size={12} /></button>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {c.calculado ? '🧮 Campo calculado' : <>{g?.icon} {g?.label}</>}
                    </div>
                  </div>
                  <button onClick={() => onRemoverCampo(c.id)} style={s.removeBtn}><X size={13} /></button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <CamposCalculadosBox campos={campos} onAddCalculado={onAddCalculado} />

      <div style={{ ...s.colunasFooter, position: 'static', marginTop: 20, borderTop: 'none', paddingTop: 0 }}>
        <button style={s.btnGhost} onClick={onVoltar}><ArrowLeft size={14} /> Voltar</button>
        <button style={s.btnPrimary} disabled={campos.length === 0} onClick={onContinuar}>Continuar <ArrowRight size={14} /></button>
      </div>
    </div>
  )
}

// ─── Campos calculados — fórmula simples entre dois operandos (campo ou valor fixo) ─
const OPERADORES_CALCULO = [{ id: '+', l: '+' }, { id: '-', l: '−' }, { id: '*', l: '×' }, { id: '/', l: '÷' }]

function CamposCalculadosBox({ campos, onAddCalculado }) {
  const numericos = campos.filter(c => !c.calculado && c.type === 'number')
  const [aberto, setAberto]   = useState(false)
  const [label, setLabel]     = useState('')
  const [aTipo, setATipo]     = useState('campo')
  const [aCampo, setACampo]   = useState('')
  const [aValor, setAValor]   = useState('')
  const [op, setOp]           = useState('+')
  const [bTipo, setBTipo]     = useState('campo')
  const [bCampo, setBCampo]   = useState('')
  const [bValor, setBValor]   = useState('')

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

  const calculados = campos.filter(c => c.calculado)

  return (
    <div style={{ marginTop: 22, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
      <div style={s.colPanelHead2}>Campos calculados</div>
      <p style={{ ...s.hint, marginBottom: 12 }}>Combine dois campos numéricos (ou valores fixos) com uma operação — ex: Valor − Custo = Margem.</p>

      {calculados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {calculados.map(c => (
            <span key={c.id} style={s.groupChip}>🧮 {c.label}</span>
          ))}
        </div>
      )}

      {!aberto && (
        <button style={s.addLink} onClick={() => setAberto(true)} disabled={numericos.length === 0}>
          + Adicionar campo calculado
        </button>
      )}
      {aberto && numericos.length === 0 && (
        <div style={s.emptyRel}>Selecione ao menos um campo numérico acima antes de criar um cálculo.</div>
      )}

      {aberto && numericos.length > 0 && (
        <div style={s.calcBox}>
          <input style={s.filterInput} placeholder="Nome do campo calculado (ex: Margem)" value={label} onChange={e => setLabel(e.target.value)} />
          <div style={s.calcRow}>
            <select style={s.filterSelect} value={aTipo} onChange={e => setATipo(e.target.value)}>
              <option value="campo">Campo</option>
              <option value="valor">Valor fixo</option>
            </select>
            {aTipo === 'campo' ? (
              <select style={s.filterSelect} value={aCampo} onChange={e => setACampo(e.target.value)}>
                <option value="">Selecione…</option>
                {numericos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            ) : (
              <input style={s.filterInput} type="number" placeholder="Valor" value={aValor} onChange={e => setAValor(e.target.value)} />
            )}

            <select style={{ ...s.filterSelect, flex: '0 0 56px' }} value={op} onChange={e => setOp(e.target.value)}>
              {OPERADORES_CALCULO.map(o => <option key={o.id} value={o.id}>{o.l}</option>)}
            </select>

            <select style={s.filterSelect} value={bTipo} onChange={e => setBTipo(e.target.value)}>
              <option value="campo">Campo</option>
              <option value="valor">Valor fixo</option>
            </select>
            {bTipo === 'campo' ? (
              <select style={s.filterSelect} value={bCampo} onChange={e => setBCampo(e.target.value)}>
                <option value="">Selecione…</option>
                {numericos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            ) : (
              <input style={s.filterInput} type="number" placeholder="Valor" value={bValor} onChange={e => setBValor(e.target.value)} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={s.btnGhost} onClick={resetForm}>Cancelar</button>
            <button style={s.btnPrimary} onClick={confirmar}>Adicionar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Fase "Regras" — filtros + agrupamento ───────────────────────────────────
function RegrasFase({ campos, filtros, conector, onConector, onAddFiltro, onUpdateFiltro, onRemoveFiltro, agrupamento, onToggleAgrupamento, onMoverAgrupamento, onVoltar, onContinuar }) {
  function campoDe(id) { return campos.find(c => c.id === id) }

  return (
    <div style={s.body}>
      {/* Filtros */}
      <h3 style={s.sectionTitle}>Filtros</h3>
      <p style={s.hint}>Restrinja quais registros entram no relatório. Todas as regras abaixo são combinadas com o mesmo conector.</p>

      {filtros.length === 0 && (
        <div style={s.emptyRel}>Nenhum filtro ainda — o relatório traz todos os registros.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {filtros.map((f, idx) => {
          const campo = campoDe(f.campoId)
          const ops = campo ? operadoresDe(campo.type) : []
          return (
            <div key={f.id} style={s.filterRow}>
              {idx > 0 && (
                <button style={s.connector} onClick={() => onConector(conector === 'E' ? 'OU' : 'E')}>{conector}</button>
              )}
              <select style={s.filterSelect} value={f.campoId} onChange={e => {
                const novoCampo = campoDe(e.target.value)
                onUpdateFiltro(f.id, { campoId: e.target.value, operador: operadoresDe(novoCampo?.type)[0]?.id || '=' })
              }}>
                {campos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select style={{ ...s.filterSelect, flex: '0 0 120px' }} value={f.operador} onChange={e => onUpdateFiltro(f.id, { operador: e.target.value })}>
                {ops.map(o => <option key={o.id} value={o.id}>{o.l}</option>)}
              </select>
              <input style={s.filterInput} value={f.valor} onChange={e => onUpdateFiltro(f.id, { valor: e.target.value })}
                type={campo?.type === 'number' ? 'number' : campo?.type === 'date' ? 'date' : 'text'}
                placeholder="valor" />
              <button style={s.removeBtn} onClick={() => onRemoveFiltro(f.id)}><X size={14} /></button>
            </div>
          )
        })}
      </div>

      <button style={s.addLink} onClick={onAddFiltro} disabled={campos.length === 0}>+ Adicionar filtro</button>

      {/* Agrupamento */}
      <h3 style={{ ...s.sectionTitle, marginTop: 32 }}>Agrupamento</h3>
      <p style={s.hint}>Marque campos pra agrupar as linhas — a ordem escolhida vira a ordem dos níveis de agrupamento na tabela final.</p>

      {agrupamento.length > 0 && (
        <div style={s.groupTrail}>
          {agrupamento.map((id, idx) => {
            const c = campoDe(id)
            if (!c) return null
            return (
              <span key={id} style={s.groupChip}>
                {idx > 0 && <span style={s.groupArrow}>→</span>}
                {c.label}
                <button style={s.chipReorder} disabled={idx === 0} onClick={() => onMoverAgrupamento(idx, -1)}><ChevronUp size={10} /></button>
                <button style={s.chipReorder} disabled={idx === agrupamento.length - 1} onClick={() => onMoverAgrupamento(idx, 1)}><ChevronDown size={10} /></button>
                <button style={s.chipRemove} onClick={() => onToggleAgrupamento(id)}><X size={11} /></button>
              </span>
            )
          })}
        </div>
      )}

      <div style={s.groupPicker}>
        {campos.filter(c => !agrupamento.includes(c.id)).map(c => (
          <button key={c.id} style={s.groupOption} onClick={() => onToggleAgrupamento(c.id)}>+ {c.label}</button>
        ))}
      </div>

      <div style={{ ...s.footerNav, marginTop: 32 }}>
        <button style={s.btnGhost} onClick={onVoltar}><ArrowLeft size={14} /> Voltar</button>
        <button style={s.btnPrimary} onClick={onContinuar}>Continuar <ArrowRight size={14} /></button>
      </div>
    </div>
  )
}

// ─── Fase "Resultado" — grade ao vivo (junção + filtros + agrupamento) ───────
function ResultadoFase({ sources, entidadeId, joins, campos, filtros, conector, agrupamento, ordenacao, onOrdenacao, titulo, onVoltar }) {
  const [exportando, setExportando] = useState(false)

  const linhas = useMemo(() => {
    if (!entidadeId || sources.length === 0) return []
    const combinadas = montarLinhas(sources, entidadeId, joins)
    if (filtros.length === 0) return combinadas
    return combinadas.filter(l => {
      const resultados = filtros.map(f => passaNoFiltro(l, f, campos))
      return conector === 'E' ? resultados.every(Boolean) : resultados.some(Boolean)
    })
  }, [sources, entidadeId, joins, filtros, conector, campos])

  const camposAgrupObjs = agrupamento.map(id => campos.find(c => c.id === id)).filter(Boolean)

  const linhasOrdenadas = useMemo(() => ordenarLinhas(linhas, camposAgrupObjs, ordenacao, campos), [linhas, camposAgrupObjs, ordenacao, campos])

  function chaveGrupo(linha) {
    return camposAgrupObjs.map(c => formatarValor(valorDoCampo(linha, c, campos))).join(' · ')
  }

  async function handleExportarExcel() {
    setExportando(true)
    try { await exportarExcel(campos, linhasOrdenadas, titulo) } finally { setExportando(false) }
  }

  let chaveAnterior = null

  return (
    <div style={{ ...s.body, maxWidth: 'none' }}>
      <div style={s.resultToolbar}>
        <div style={s.resultCount}>
          <strong>{linhasOrdenadas.length}</strong> registro{linhasOrdenadas.length !== 1 ? 's' : ''}
          {agrupamento.length > 0 && <> · agrupado por {camposAgrupObjs.map(c => c.label).join(' → ')}</>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select style={s.orderSelect} value={ordenacao?.campoId || ''} onChange={e => {
            const campoId = e.target.value
            onOrdenacao(campoId ? { campoId, dir: ordenacao?.dir || 'asc' } : null)
          }}>
            <option value="">Ordenar por…</option>
            {campos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {ordenacao && (
            <button style={s.orderDirBtn} onClick={() => onOrdenacao({ ...ordenacao, dir: ordenacao.dir === 'asc' ? 'desc' : 'asc' })}>
              {ordenacao.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
          <button style={s.btnGhost} onClick={() => exportarCSV(campos, linhasOrdenadas)} disabled={linhasOrdenadas.length === 0}>
            CSV
          </button>
          <button style={s.btnPrimary} onClick={handleExportarExcel} disabled={linhasOrdenadas.length === 0 || exportando}>
            {exportando ? 'Gerando…' : 'Excel'}
          </button>
        </div>
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {campos.map(c => <th key={c.id} style={s.th}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {linhasOrdenadas.map((linha, idx) => {
              const chave = camposAgrupObjs.length > 0 ? chaveGrupo(linha) : null
              const novoGrupo = chave !== null && chave !== chaveAnterior
              chaveAnterior = chave
              return (
                <RowComGrupo key={idx} linha={linha} campos={campos} novoGrupo={novoGrupo} chave={chave} />
              )
            })}
            {linhasOrdenadas.length === 0 && (
              <tr><td colSpan={campos.length || 1} style={s.tdEmpty}>Nenhum registro encontrado com os filtros atuais.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ ...s.footerNav, marginTop: 20 }}>
        <button style={s.btnGhost} onClick={onVoltar}><ArrowLeft size={14} /> Voltar para regras</button>
      </div>
    </div>
  )
}

function RowComGrupo({ linha, campos, novoGrupo, chave }) {
  return (
    <>
      {novoGrupo && (
        <tr>
          <td colSpan={campos.length || 1} style={s.groupHeaderCell}>{chave}</td>
        </tr>
      )}
      <tr>
        {campos.map(c => <td key={c.id} style={s.td}>{formatarValor(valorDoCampo(linha, c, campos))}</td>)}
      </tr>
    </>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 0' },
  eyebrow: { fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' },
  titleInput: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)', border: 'none', background: 'none', outline: 'none', fontFamily: 'var(--font)', padding: 0, width: '100%', maxWidth: 480 },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-soft)', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 'var(--radius-md, 8px)', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 'var(--radius-md, 8px)', cursor: 'pointer', fontFamily: 'var(--font)' },

  faseNav: { display: 'flex', gap: 4, padding: '18px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  faseTab: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  faseTabAtivo: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  faseTabDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  faseNum: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: 'var(--surface2)', color: 'inherit', fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--mono)' },

  body: { flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 760, position: 'relative' },
  hint: { fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.6, marginBottom: 22, maxWidth: 560 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 },
  entityCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '16px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', transition: 'border-color 0.12s, box-shadow 0.12s' },
  entityCardSel: { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-glow)' },
  entityIcon: { fontSize: 20 },
  entityLabel: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },

  emptyRel: { padding: '20px 0', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' },
  relList: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 },
  relRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', width: '100%' },
  relRowSel: { borderColor: 'var(--accent)', background: 'var(--accent-glow)' },
  relCheck: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--border2)', color: 'var(--accent)', flexShrink: 0 },
  relIcon: { fontSize: 15, flexShrink: 0 },
  relLabel: { fontSize: 13.5, fontWeight: 700, color: 'var(--text)', flexShrink: 0, minWidth: 140 },
  relCard: { fontSize: 12, color: 'var(--text-muted)' },

  footerNav: { display: 'flex', justifyContent: 'space-between', paddingTop: 8 },
  building: { textAlign: 'center', padding: '48px 0' },

  // Colunas
  colPanel: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', maxHeight: 'calc(100vh - 230px)' },
  colPanelHead: { padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)' },
  colPanelBody: { flex: 1, overflowY: 'auto', padding: '10px 12px' },
  searchWrap: { position: 'relative', padding: '10px 12px 0' },
  searchIcon: { position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  searchInput: { width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 30px', fontSize: 12.5, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none' },
  groupHead: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 4px' },
  groupEmpty: { fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', padding: '2px 8px 6px' },
  fieldRow: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text)' },
  fieldRowSel: { background: 'var(--accent-glow)' },
  fieldType: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' },

  selectedRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderBottom: '1px solid var(--border2)' },
  reorderCol: { display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0 },
  reorderBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' },
  removeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 },
  colunasFooter: { position: 'absolute', bottom: -8, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border)', background: 'var(--surface)' },

  // Campos calculados
  colPanelHead2: { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  calcBox: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', maxWidth: 640 },
  calcRow: { display: 'flex', alignItems: 'center', gap: 6 },

  // Regras
  sectionTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' },
  filterRow: { display: 'flex', alignItems: 'center', gap: 8 },
  connector: { flexShrink: 0, width: 34, fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 6, padding: '4px 0', cursor: 'pointer', fontFamily: 'var(--mono)' },
  filterSelect: { flex: 1, minWidth: 0, fontSize: 12.5, padding: '7px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)' },
  filterInput: { flex: 1, minWidth: 0, fontSize: 12.5, padding: '7px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)' },
  addLink: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' },

  groupTrail: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  groupChip: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 6px 5px 10px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--accent-glow)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600 },
  groupArrow: { color: 'var(--text-muted)', marginRight: 4 },
  chipReorder: { background: 'none', border: 'none', color: 'var(--text-soft)', cursor: 'pointer', padding: 1, display: 'flex' },
  chipRemove: { background: 'none', border: 'none', color: 'var(--text-soft)', cursor: 'pointer', padding: 1, display: 'flex', marginLeft: 2 },
  groupPicker: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  groupOption: { fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontFamily: 'var(--font)' },

  // Resultado
  resultToolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 },
  resultCount: { fontSize: 13, color: 'var(--text-soft)' },
  orderSelect: { fontSize: 12.5, padding: '7px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)' },
  orderDirBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text-soft)', cursor: 'pointer' },
  tableWrap: { border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto', maxHeight: 'calc(100vh - 320px)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', position: 'sticky', top: 0 },
  td: { padding: '9px 12px', color: 'var(--text)', borderBottom: '1px solid var(--border2)', fontVariantNumeric: 'tabular-nums' },
  tdEmpty: { padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' },
  groupHeaderCell: { padding: '8px 12px', fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-glow)', borderBottom: '1px solid var(--border2)' },
}
