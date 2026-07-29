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
    // Só conta como realizado o que já foi executado (mesma regra de Ações
    // → Custos) — despesa soma, receita subtrai do total gasto contra o centro.
    const totais = {}
    ;(lancamentos || []).forEach(l => {
      if (!l.executado) return
      const key = `${l.centro_custo_id}|${l.competencia?.slice(0, 7)}`
      const sinal = l.tipo === 'receita' ? -1 : 1
      totais[key] = (totais[key] || 0) + sinal * l.valor_realizado
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
        <SlideOver open title={`${detalhe.centro.nome} — ${fmtCompetencia(detalhe.competencia)}`} onClose={() => setDetalhe(null)} defaultWidth={720}>
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

            <FormSection title="Lançamentos manuais" description="Mesmo fluxo de Ações → Custos: classifique, informe previsto/realizado e solicite aprovação antes de executar.">
              <FormField label="" span={2}>
                <LancamentosSection
                  lancamentos={lancamentosDoDetalhe}
                  onSave={l => saveLancamento({ ...l, centro_custo_id: detalhe.centroId, competencia: detalhe.competencia + '-01' })}
                  onRemove={removeLancamento}
                  profile={profile}
                />
              </FormField>
            </FormSection>
          </FormGrid>
        </SlideOver>
      )}
    </>
  )
}

const APROVACAO_CFG = {
  aguardando: { label: 'Aguardando aprovação', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  aprovado:   { label: 'Aprovado',             color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  rejeitado:  { label: 'Rejeitado',            color: '#EF4444', bg: '#FEE2E2', text: '#991B1B' },
}
const TIPO_CFG = {
  despesa: { label: 'Despesa', color: '#EF4444' },
  receita: { label: 'Receita', color: '#10B981' },
}

// Mesmo padrão de Ações → aba Custos: classificação (despesa/receita) →
// previsto/realizado → solicitar aprovação → admin/financeiro aprova ou
// rejeita → só então dá pra marcar como executado (o que conta no realizado).
function LancamentosSection({ lancamentos, onSave, onRemove, profile }) {
  const [novo, setNovo] = useState(null)
  const [abertoId, setAbertoId] = useState(null)
  const [obsInput, setObsInput] = useState({})

  const isAdmin = profile?.papel === 'admin_isv' || profile?.role === 'admin_isv'
  const podeAprovar = isAdmin || profile?.papel === 'financeiro'
  const nomeUsuario = profile?.full_name || profile?.email || 'Usuário'

  const totalPrev = lancamentos.reduce((s, l) => s + (Number(l.valor_previsto) || 0), 0)
  const totalExec = lancamentos.reduce((s, l) => s + (l.executado ? (Number(l.valor_realizado) || 0) : 0), 0)

  function solicitarAprovacao(l) {
    const entrada = { id: crypto.randomUUID(), status: 'aguardando', obs: '', por: nomeUsuario, em: new Date().toISOString() }
    onSave({ ...l, aprovacoes: [entrada] })
  }
  function aprovar(l, status) {
    const entrada = { id: crypto.randomUUID(), status, obs: obsInput[l.id] || '', por: nomeUsuario, em: new Date().toISOString() }
    onSave({ ...l, aprovacoes: [...(l.aprovacoes || []), entrada] })
    setObsInput(o => ({ ...o, [l.id]: '' }))
  }
  function marcarExecutado(l, executado) {
    onSave({ ...l, executado })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lancamentos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['Total previsto', fmtMoeda(totalPrev), false], ['Total executado', fmtMoeda(totalExec), totalExec > totalPrev]].map(([lbl, val, red]) => (
            <div key={lbl} style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 7, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lbl}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: red ? '#EF4444' : 'var(--text)', marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {lancamentos.map((l, idx) => {
        const ultima = (l.aprovacoes || []).slice(-1)[0]
        const cfgAp = ultima ? (APROVACAO_CFG[ultima.status] || APROVACAO_CFG.aguardando) : null
        const aprovado = ultima?.status === 'aprovado'
        const isOpen = abertoId === l.id
        return (
          <div key={l.id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface2)', cursor: 'pointer' }}
              onClick={() => setAbertoId(isOpen ? null : l.id)}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>#{idx + 1}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: TIPO_CFG[l.tipo]?.color, flexShrink: 0 }}>{TIPO_CFG[l.tipo]?.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.descricao || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem descrição</span>}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtMoeda(l.valor_previsto)}</span>
              {cfgAp && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 20, background: cfgAp.bg, color: cfgAp.text, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfgAp.color }} />{cfgAp.label}
                </span>
              )}
              {aprovado && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 20,
                  background: l.executado ? '#EDE9FE' : 'var(--surface)', color: l.executado ? '#5B21B6' : 'var(--text-muted)',
                  fontSize: 10, fontWeight: 700, border: '1px solid var(--border)', flexShrink: 0 }}>
                  {l.executado ? '✔ Executado' : '— Não executado'}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
              <button onClick={e => { e.stopPropagation(); if (window.confirm('Remover lançamento?')) onRemove(l.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            {isOpen && (
              <>
                <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
                  <div>
                    <label style={lblS}>Classificação</label>
                    <select className="so-field" value={l.tipo} onChange={e => onSave({ ...l, tipo: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }}>
                      {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lblS}>Descrição / Justificativa</label>
                    <input className="so-field" value={l.descricao} onChange={e => onSave({ ...l, descricao: e.target.value })} placeholder="Finalidade do lançamento…" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ padding: '0 10px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lblS}>Previsto (R$)</label>
                    <input className="so-field" type="number" min="0" step="0.01" value={l.valor_previsto} onChange={e => onSave({ ...l, valor_previsto: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={lblS}>Realizado (R$)</label>
                    <input className="so-field" type="number" min="0" step="0.01" value={l.valor_realizado} onChange={e => onSave({ ...l, valor_realizado: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={lblS}>Data</label>
                    <input className="so-field" type="date" value={l.data_lancamento} onChange={e => onSave({ ...l, data_lancamento: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {aprovado && (
                  <div style={{ padding: '0 10px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id={`exec-${l.id}`} checked={!!l.executado} onChange={e => marcarExecutado(l, e.target.checked)} style={{ cursor: 'pointer' }} />
                    <label htmlFor={`exec-${l.id}`} style={{ fontSize: 12, fontWeight: 600, color: l.executado ? '#5B21B6' : 'var(--text)', cursor: 'pointer' }}>
                      {l.executado ? 'Lançamento executado' : 'Marcar como executado'}
                    </label>
                  </div>
                )}

                {(l.aprovacoes || []).length > 0 && (
                  <div style={{ margin: '0 10px 6px', background: 'var(--surface2)', borderRadius: 6, padding: '6px 8px' }}>
                    {(l.aprovacoes || []).map(ap => {
                      const ac = APROVACAO_CFG[ap.status] || APROVACAO_CFG.aguardando
                      return (
                        <div key={ap.id} style={{ display: 'flex', gap: 6, fontSize: 10, marginBottom: 2, color: 'var(--text-muted)' }}>
                          <span style={{ color: ac.color, fontWeight: 700 }}>{ap.status === 'aprovado' ? '✓' : ap.status === 'rejeitado' ? '✗' : '⏳'}</span>
                          <span><b style={{ color: 'var(--text)' }}>{ac.label}</b> · {ap.por} · {new Date(ap.em).toLocaleString('pt-BR')}{ap.obs ? ` — ${ap.obs}` : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {(l.aprovacoes || []).length === 0 ? (
                  <div style={{ padding: '0 10px 8px' }}>
                    <button onClick={() => solicitarAprovacao(l)}
                      style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      Solicitar aprovação
                    </button>
                  </div>
                ) : podeAprovar && !aprovado ? (
                  <div style={{ display: 'flex', gap: 6, padding: '0 10px 8px', alignItems: 'center' }}>
                    <input className="so-field" value={obsInput[l.id] || ''} onChange={e => setObsInput(o => ({ ...o, [l.id]: e.target.value }))}
                      placeholder="Observação (opcional)…" style={{ flex: 1, fontSize: 11 }} />
                    <button onClick={() => aprovar(l, 'aprovado')}
                      style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#10B981', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                      ✓ Aprovar
                    </button>
                    <button onClick={() => aprovar(l, 'rejeitado')}
                      style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                      ✗ Rejeitar
                    </button>
                  </div>
                ) : !podeAprovar && !aprovado ? (
                  <div style={{ padding: '4px 10px 8px', fontSize: 11, color: 'var(--text-muted)' }}>Aguardando aprovação do administrador ou financeiro.</div>
                ) : null}
              </>
            )}
          </div>
        )
      })}

      {novo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px', border: '1px dashed var(--border)', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 6 }}>
            <select className="so-field" value={novo.tipo} onChange={e => setNovo(f => ({ ...f, tipo: e.target.value }))}>
              {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input placeholder="Descrição / justificativa" value={novo.descricao} onChange={e => setNovo(f => ({ ...f, descricao: e.target.value }))}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" min="0" step="0.01" placeholder="Previsto" value={novo.valor_previsto} onChange={e => setNovo(f => ({ ...f, valor_previsto: e.target.value }))}
              style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)' }} />
            <input type="date" value={novo.data_lancamento} onChange={e => setNovo(f => ({ ...f, data_lancamento: e.target.value }))}
              style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => setNovo(null)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => {
              if (!novo.descricao || !novo.valor_previsto) return
              onSave({ ...novo, valor_realizado: 0, executado: false, aprovacoes: [] })
              setNovo(null)
            }} style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: ACCENT, border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>Adicionar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setNovo({ tipo: 'despesa', descricao: '', valor_previsto: '', data_lancamento: new Date().toISOString().slice(0, 10) })}
          style={{ padding: '6px 0', borderRadius: 7, border: '1px dashed var(--border)', background: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          + Adicionar item de custo
        </button>
      )}
    </div>
  )
}

const lblS = { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 3 }
