/**
 * Novo construtor de Relatórios — substitui gradualmente o editor de canvas
 * (CanvasEditor) por um assistente guiado em 4 fases, ancorado no motor de
 * relacionamentos entre entidades (ver proposta de arquitetura).
 *
 * Fases implementadas até aqui:
 *   1. Fonte       — escolher entidade principal + relacionamentos a incluir
 *   2. Colunas      — escolher quais campos (da entidade principal e das
 *                      relacionadas) entram no relatório, e em que ordem
 * Fases 3-4 (filtros/agrupamento/ordenação e a grade de resultado ao vivo)
 * ainda não existem — aparecem como "em construção".
 *
 * Vive lado a lado com Relatorios.js (não substitui nada ainda) — acessível
 * por um item de menu na tela atual, pra comparação lado a lado.
 */
import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronUp, ChevronDown, X, Search } from 'lucide-react'
import { ENTIDADES, relacionadasDe, relacaoEntre } from '../data/reportEntities'
import { useDocumentDataSources } from '../hooks/useDocumentDataSources'

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

function valorDoCampo(linha, campo) {
  return linha[campo.entidadeId] ? linha[campo.entidadeId][campo.key] : undefined
}

function passaNoFiltro(linha, filtro, campos) {
  const campo = campos.find(c => c.id === filtro.campoId)
  if (!campo) return true
  if (filtro.valor === '' || filtro.valor == null) return true
  const bruto = valorDoCampo(linha, campo)
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
    const v = formatarValor(valorDoCampo(l, c))
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

export default function RelatoriosBuilder() {
  const navigate = useNavigate()
  const { sources } = useDocumentDataSources()

  const [fase, setFase]           = useState(0)
  const [fonteStep, setFonteStep] = useState(0) // dentro da fase "Fonte": 0=entidade, 1=relacionamentos
  const [entidadeId, setEntidadeId] = useState(null)
  const [joins, setJoins]         = useState([])   // ids de entidades relacionadas incluídas
  const [campos, setCampos]       = useState([])   // [{ id, entidadeId, key, label, type }]
  const [buscaCampo, setBuscaCampo] = useState('')
  const [filtros, setFiltros]     = useState([])   // [{ id, campoId, operador, valor }]
  const [conector, setConector]   = useState('E')   // 'E' | 'OU' — entre todas as regras de filtro
  const [agrupamento, setAgrupamento] = useState([]) // [campoId] em ordem

  const entidade      = ENTIDADES.find(e => e.id === entidadeId) || null
  const relacionadas   = useMemo(() => entidadeId ? relacionadasDe(entidadeId) : [], [entidadeId])
  const entidadesAtivas = useMemo(() => entidadeId ? [entidadeId, ...joins] : [], [entidadeId, joins])

  // Remove da seleção de campos qualquer entidade que deixou de estar ativa
  // (ex.: usuário voltou na fase Fonte e desmarcou um relacionamento).
  useEffect(() => {
    setCampos(prev => prev.filter(c => entidadesAtivas.includes(c.entidadeId)))
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
        <div>
          <div style={s.eyebrow}>Construtor de relatórios · novo</div>
          <h1 style={s.title}>{entidade ? entidade.label : 'Novo relatório'}</h1>
        </div>
        <button style={s.btnGhost} onClick={() => navigate('/relatorios')}>Voltar aos relatórios</button>
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
          onVoltar={() => setFase(2)}
        />
      )}
    </div>
  )
}

// ─── Fase "Colunas & Cálculo" — escolha de campos ────────────────────────────
function ColunasFase({ entidadesAtivas, sources, campos, busca, onBusca, onToggleCampo, onMoverCampo, onRemoverCampo, onVoltar, onContinuar }) {
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
    <div style={{ ...s.body, maxWidth: 'none', display: 'flex', gap: 20, minHeight: 0 }}>
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
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g?.icon} {g?.label}</div>
                </div>
                <button onClick={() => onRemoverCampo(c.id)} style={s.removeBtn}><X size={13} /></button>
              </div>
            )
          })}
        </div>
      </div>

      <div style={s.colunasFooter}>
        <button style={s.btnGhost} onClick={onVoltar}><ArrowLeft size={14} /> Voltar</button>
        <button style={s.btnPrimary} disabled={campos.length === 0} onClick={onContinuar}>Continuar <ArrowRight size={14} /></button>
      </div>
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
function ResultadoFase({ sources, entidadeId, joins, campos, filtros, conector, agrupamento, onVoltar }) {
  const linhas = useMemo(() => {
    if (!entidadeId || sources.length === 0) return []
    const combinadas = montarLinhas(sources, entidadeId, joins)
    if (filtros.length === 0) return combinadas
    return combinadas.filter(l => {
      const resultados = filtros.map(f => passaNoFiltro(l, f, campos))
      return conector === 'E' ? resultados.every(Boolean) : resultados.some(Boolean)
    })
  }, [sources, entidadeId, joins, filtros, conector, campos])

  const linhasOrdenadas = useMemo(() => {
    if (agrupamento.length === 0) return linhas
    const camposAgrup = agrupamento.map(id => campos.find(c => c.id === id)).filter(Boolean)
    return [...linhas].sort((a, b) => {
      for (const c of camposAgrup) {
        const va = formatarValor(valorDoCampo(a, c))
        const vb = formatarValor(valorDoCampo(b, c))
        if (va !== vb) return va < vb ? -1 : 1
      }
      return 0
    })
  }, [linhas, agrupamento, campos])

  const camposAgrupObjs = agrupamento.map(id => campos.find(c => c.id === id)).filter(Boolean)

  function chaveGrupo(linha) {
    return camposAgrupObjs.map(c => formatarValor(valorDoCampo(linha, c))).join(' · ')
  }

  let chaveAnterior = null

  return (
    <div style={{ ...s.body, maxWidth: 'none' }}>
      <div style={s.resultToolbar}>
        <div style={s.resultCount}>
          <strong>{linhasOrdenadas.length}</strong> registro{linhasOrdenadas.length !== 1 ? 's' : ''}
          {agrupamento.length > 0 && <> · agrupado por {camposAgrupObjs.map(c => c.label).join(' → ')}</>}
        </div>
        <button style={s.btnPrimary} onClick={() => exportarCSV(campos, linhasOrdenadas)} disabled={linhasOrdenadas.length === 0}>
          Exportar CSV
        </button>
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
        {campos.map(c => <td key={c.id} style={s.td}>{formatarValor(valorDoCampo(linha, c))}</td>)}
      </tr>
    </>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 0' },
  eyebrow: { fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' },
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
  resultToolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  resultCount: { fontSize: 13, color: 'var(--text-soft)' },
  tableWrap: { border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto', maxHeight: 'calc(100vh - 320px)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', position: 'sticky', top: 0 },
  td: { padding: '9px 12px', color: 'var(--text)', borderBottom: '1px solid var(--border2)', fontVariantNumeric: 'tabular-nums' },
  tdEmpty: { padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' },
  groupHeaderCell: { padding: '8px 12px', fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-glow)', borderBottom: '1px solid var(--border2)' },
}
