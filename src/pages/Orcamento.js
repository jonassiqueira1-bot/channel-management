import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useProfile } from '../hooks/useProfile'
import { useCentrosCusto } from '../hooks/useCentrosCusto'
import { useOrcamentos } from '../hooks/useOrcamentos'
import { useOrcamentoLancamentos } from '../hooks/useOrcamentoLancamentos'
import { useCampanhas } from '../hooks/useCampanhas'
import { useActions } from '../hooks/useActions'
import { useProjects } from '../hooks/useProjects'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import Badge from '../components/Badge'

const ACCENT = 'var(--accent)'

function fmtMoeda(v) {
  if (!v && v !== 0) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtCompetencia(ym) {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][Number(m) - 1]}/${y}`
}
function ymDe(dateStr) { return (dateStr || '').slice(0, 7) }

// Soma os itens de custo executados (valor_realizado) de Campanhas/Ações,
// agrupado por centro_custo_id + mês (a partir do campo de data do registro).
function agruparCustosExecutados(registros, dataField) {
  const totais = {} // `${centro}|${ym}` -> valor
  registros.forEach(r => {
    if (!r.centro_custo_id) return
    const ym = ymDe(r[dataField])
    if (!ym) return
    const total = (r.custos || []).reduce((s, c) => s + (c.executado ? (Number(c.valor_realizado) || 0) : 0), 0)
    if (!total) return
    const key = `${r.centro_custo_id}|${ym}`
    totais[key] = (totais[key] || 0) + total
  })
  return totais
}

export default function Orcamento() {
  const { profile } = useProfile()
  const { centros } = useCentrosCusto()
  const { orcamentos, save: savePlanejado } = useOrcamentos()
  const { lancamentos, save: saveLancamento, remove: removeLancamento } = useOrcamentoLancamentos()
  const { campanhas } = useCampanhas()
  const { acoes } = useActions()
  const { projetos } = useProjects()

  const [search, setSearch] = useLocalState('orcamento:search', '')
  const [filtroCentro, setFiltroCentro] = useLocalState('orcamento:filtroCentro', '')
  const [filtroStatus, setFiltroStatus] = useLocalState('orcamento:filtroStatus', '')
  const [periodoDe, setPeriodoDe] = useLocalState('orcamento:periodoDe', '')
  const [periodoAte, setPeriodoAte] = useLocalState('orcamento:periodoAte', '')
  const [detalhe, setDetalhe] = useState(null) // { centro, competencia }
  const [novoLancForm, setNovoLancForm] = useState(null)

  const custosAuto = useMemo(() => ({
    ...agruparCustosExecutados(campanhas || [], 'start_date'),
    // merge manual — junta os dois mapas somando quando colidir
  }), [campanhas])
  const custosAcoes = useMemo(() => agruparCustosExecutados(acoes || [], 'data_inicio'), [acoes])

  const realizadoAutoPorChave = useMemo(() => {
    const totais = {}
    ;[custosAuto, custosAcoes].forEach(map => {
      Object.entries(map).forEach(([k, v]) => { totais[k] = (totais[k] || 0) + v })
    })
    return totais
  }, [custosAuto, custosAcoes])

  const realizadoManualPorChave = useMemo(() => {
    const totais = {}
    ;(lancamentos || []).forEach(l => {
      const key = `${l.centro_custo_id}|${l.competencia?.slice(0, 7)}`
      totais[key] = (totais[key] || 0) + l.valor
    })
    return totais
  }, [lancamentos])

  const custoProjetosPorCentro = useMemo(() => {
    const totais = {}
    ;(projetos || []).forEach(p => {
      if (!p.centro_custo_id) return
      totais[p.centro_custo_id] = (totais[p.centro_custo_id] || 0) + (Number(p.fin_custo_realizado) || 0)
    })
    return totais
  }, [projetos])

  // Universo de linhas: todo par (centro ativo, competência) que tenha
  // planejado, lançamento manual ou custo automático — cobre o histórico
  // real, não só o mês corrente.
  const linhas = useMemo(() => {
    const centrosAtivos = centros.filter(c => c.status === 'ativo')
    const chaves = new Map() // `${centroId}|${ym}` -> {centroId, ym}
    orcamentos.forEach(o => chaves.set(`${o.centro_custo_id}|${o.competencia.slice(0, 7)}`, { centroId: o.centro_custo_id, ym: o.competencia.slice(0, 7) }))
    lancamentos.forEach(l => chaves.set(`${l.centro_custo_id}|${l.competencia.slice(0, 7)}`, { centroId: l.centro_custo_id, ym: l.competencia.slice(0, 7) }))
    Object.keys(realizadoAutoPorChave).forEach(k => {
      const [centroId, ym] = k.split('|')
      chaves.set(k, { centroId, ym })
    })
    // Garante que o mês atual apareça pra todo centro ativo mesmo sem dado ainda
    const ymAtual = new Date().toISOString().slice(0, 7)
    centrosAtivos.forEach(c => chaves.set(`${c.id}|${ymAtual}`, { centroId: c.id, ym: ymAtual }))

    return [...chaves.values()].map(({ centroId, ym }) => {
      const centro = centros.find(c => c.id === centroId)
      if (!centro) return null
      const key = `${centroId}|${ym}`
      const orc = orcamentos.find(o => o.centro_custo_id === centroId && o.competencia.slice(0, 7) === ym)
      const planejado = orc?.valor_planejado || 0
      const realizadoAuto = realizadoAutoPorChave[key] || 0
      const realizadoManual = realizadoManualPorChave[key] || 0
      const totalRealizado = realizadoAuto + realizadoManual
      const desvio = planejado > 0 ? ((totalRealizado - planejado) / planejado) * 100 : null
      const status = planejado === 0 ? 'sem_planejado' : desvio > 0 ? 'estourado' : 'dentro'
      return {
        id: key, centroId, centro, competencia: ym, orcId: orc?.id,
        planejado, realizadoAuto, realizadoManual, totalRealizado, desvio, status,
      }
    }).filter(Boolean).sort((a, b) => b.competencia.localeCompare(a.competencia) || a.centro.nome.localeCompare(b.centro.nome))
  }, [centros, orcamentos, lancamentos, realizadoAutoPorChave, realizadoManualPorChave])

  const filtered = linhas.filter(l => {
    if (filtroCentro && l.centroId !== filtroCentro) return false
    if (filtroStatus && l.status !== filtroStatus) return false
    if (periodoDe && l.competencia < periodoDe) return false
    if (periodoAte && l.competencia > periodoAte) return false
    if (search && !l.centro.nome.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const STATUS_CFG = {
    dentro:        { label: 'Dentro do orçamento', variant: 'success' },
    estourado:     { label: 'Estourado',           variant: 'danger'  },
    sem_planejado: { label: 'Sem planejado',        variant: 'neutral' },
  }

  const kpisNode = (data) => {
    const totalPlanejado  = data.reduce((s, l) => s + l.planejado, 0)
    const totalRealizado  = data.reduce((s, l) => s + l.totalRealizado, 0)
    const estourados      = data.filter(l => l.status === 'estourado').length
    const semPlanejado    = data.filter(l => l.status === 'sem_planejado' && l.totalRealizado > 0).length
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 0' }}>
        {[
          { label: 'Total planejado', value: fmtMoeda(totalPlanejado), color: ACCENT, mono: true },
          { label: 'Total realizado', value: fmtMoeda(totalRealizado), color: totalRealizado > totalPlanejado && totalPlanejado > 0 ? '#EF4444' : '#10B981', mono: true },
          { label: 'Centros estourados', value: estourados, color: estourados > 0 ? '#EF4444' : 'var(--text-muted)' },
          { label: 'Gasto sem planejado', value: semPlanejado, color: semPlanejado > 0 ? '#D97706' : 'var(--text-muted)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)',
            borderTop: `2px solid ${k.color}`, borderRadius: 10, padding: '14px 20px',
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 130 }}>
            <span style={{ fontSize: k.mono ? 16 : 24, fontWeight: 800, color: k.color,
              fontFamily: k.mono ? 'var(--mono)' : 'var(--font)', letterSpacing: k.mono ? '-0.02em' : '-0.03em' }}>
              {k.value}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</span>
          </div>
        ))}
      </div>
    )
  }

  const columns = [
    {
      key: 'centro', label: 'Centro de Custo / Competência',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{row.centro.nome}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{fmtCompetencia(row.competencia)}</div>
        </div>
      ),
    },
    { key: 'planejado', label: 'Planejado', render: v => <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-soft)' }}>{fmtMoeda(v)}</span> },
    { key: 'realizadoAuto', label: 'Realizado (auto)', render: v => <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-soft)' }}>{v > 0 ? fmtMoeda(v) : '—'}</span> },
    { key: 'realizadoManual', label: 'Realizado (manual)', render: v => <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-soft)' }}>{v > 0 ? fmtMoeda(v) : '—'}</span> },
    { key: 'totalRealizado', label: 'Total realizado', render: v => <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{fmtMoeda(v)}</span> },
    {
      key: 'desvio', label: 'Desvio',
      render: v => v == null
        ? <span style={{ color: 'var(--border2)', fontSize: 11 }}>—</span>
        : <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: v > 0 ? '#EF4444' : '#10B981' }}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>,
    },
    { key: 'status', label: 'Status', render: v => <Badge status={v} variant={STATUS_CFG[v]?.variant}>{STATUS_CFG[v]?.label}</Badge> },
  ]

  const FILTERS_DEF = [
    { key: 'centro', label: 'Centro de Custo', options: centros.filter(c => c.status === 'ativo').map(c => ({ value: c.id, label: c.nome })) },
    { key: 'status', label: 'Status', options: Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label })) },
  ]
  const activeFilters = {
    centro: filtroCentro ? [filtroCentro] : [],
    status: filtroStatus ? [filtroStatus] : [],
  }
  function handleFilterChange(f) {
    setFiltroCentro(f.centro?.[0] || '')
    setFiltroStatus(f.status?.[0] || '')
  }

  async function salvarPlanejadoDetalhe(valor) {
    if (!detalhe) return
    await savePlanejado({ id: detalhe.orcId, centro_custo_id: detalhe.centroId, competencia: detalhe.competencia + '-01', valor_planejado: valor })
    setDetalhe(d => ({ ...d, planejado: Number(valor) || 0 }))
  }

  const lancamentosDoDetalhe = detalhe
    ? lancamentos.filter(l => l.centro_custo_id === detalhe.centroId && l.competencia.slice(0, 7) === detalhe.competencia)
    : []

  if (profile && profile.papel !== 'admin_isv' && profile.role !== 'admin_isv') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 8, color: 'var(--text-muted)' }}>
        <span style={{ fontSize: 28, opacity: 0.3 }}>🔒</span>
        <span>Acesso restrito a administradores.</span>
      </div>
    )
  }

  return (
    <>
      <BrowseLayout
        modulo="orcamento"
        data={filtered}
        columns={columns}
        keyField="id"
        storageKey="orcamento_browse"
        kpis={kpisNode}
        kpisLabel="Indicadores"
        search={search}
        onSearchChange={setSearch}
        filters={FILTERS_DEF}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        extraFilters={
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Competência
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'De', value: periodoDe, set: setPeriodoDe },
                { label: 'Até', value: periodoAte, set: setPeriodoAte },
              ].map(({ label, value, set: setVal }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                  <input type="month" value={value} onChange={e => setVal(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '7px 9px',
                      borderRadius: 7, border: '1px solid var(--border)',
                      background: 'var(--surface2)', color: 'var(--text)',
                      fontSize: 12, fontFamily: 'var(--mono)', outline: 'none' }} />
                </div>
              ))}
            </div>
          </div>
        }
        onRowClick={row => setDetalhe({ centroId: row.centroId, centro: row.centro, competencia: row.competencia, planejado: row.planejado, orcId: row.orcId })}
        emptyState={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>📊</span>
            <span>Nenhum Centro de Custo ativo</span>
            <span style={{ fontSize: 12 }}>Cadastre em Configurações → Centros de Custo</span>
          </div>
        }
      />

      {Object.keys(custoProjetosPorCentro).length > 0 && (
        <div style={{ margin: '0 24px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Custo de Projetos (acumulado, informativo)</div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>
            Acumulado desde o início de cada projeto — não é mensal, por isso fica fora do total automático acima.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(custoProjetosPorCentro).map(([centroId, valor]) => {
              const c = centros.find(x => x.id === centroId)
              return <div key={centroId} style={{ fontSize: 12, color: 'var(--text-soft)' }}><strong style={{ color: 'var(--text)' }}>{c?.nome || centroId}</strong>: {fmtMoeda(valor)}</div>
            })}
          </div>
        </div>
      )}

      {detalhe && (
        <SlideOver open title={`${detalhe.centro.nome} — ${fmtCompetencia(detalhe.competencia)}`} onClose={() => setDetalhe(null)} defaultWidth="480">
          <FormGrid>
            <FormSection title="Planejado">
              <FormField label="Valor planejado">
                <input type="number" min="0" step="0.01" defaultValue={detalhe.planejado || ''}
                  onBlur={e => salvarPlanejadoDetalhe(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 7,
                    border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--mono)' }} />
              </FormField>
            </FormSection>

            <FormSection title="Realizado automático (Campanhas/Ações)">
              <FormField label="">
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  {fmtMoeda((realizadoAutoPorChave[`${detalhe.centroId}|${detalhe.competencia}`]) || 0)}
                </div>
              </FormField>
            </FormSection>

            <FormSection title="Lançamentos manuais">
              <FormField label="">
                <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
                  {lancamentosDoDetalhe.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{l.descricao}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{l.data_lancamento}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>{fmtMoeda(l.valor)}</div>
                      <button onClick={() => removeLancamento(l.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                    </div>
                  ))}
                  {lancamentosDoDetalhe.length === 0 && (
                    <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum lançamento manual neste mês.</div>
                  )}
                  <div style={{ padding: '8px 12px', background: 'var(--surface2)' }}>
                    {novoLancForm ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input placeholder="Descrição" value={novoLancForm.descricao} onChange={e => setNovoLancForm(f => ({ ...f, descricao: e.target.value }))}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12 }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input type="number" min="0" step="0.01" placeholder="Valor" value={novoLancForm.valor} onChange={e => setNovoLancForm(f => ({ ...f, valor: e.target.value }))}
                            style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)' }} />
                          <input type="date" value={novoLancForm.data_lancamento} onChange={e => setNovoLancForm(f => ({ ...f, data_lancamento: e.target.value }))}
                            style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setNovoLancForm(null)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>Cancelar</button>
                          <button onClick={async () => {
                            if (!novoLancForm.descricao || !novoLancForm.valor) return
                            await saveLancamento({ ...novoLancForm, centro_custo_id: detalhe.centroId, competencia: detalhe.competencia + '-01' })
                            setNovoLancForm(null)
                          }} style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: ACCENT, border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>Adicionar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setNovoLancForm({ descricao: '', valor: '', data_lancamento: new Date().toISOString().slice(0, 10) })}
                        style={{ width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 6, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                        + Adicionar lançamento manual
                      </button>
                    )}
                  </div>
                </div>
              </FormField>
            </FormSection>
          </FormGrid>
        </SlideOver>
      )}
    </>
  )
}
