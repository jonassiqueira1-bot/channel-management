import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParceiros } from '../hooks/useParceiros'
import { useActions } from '../hooks/useActions'
import { usePartnerMaturity, usePartnerScores } from '../hooks/usePartnerMaturity'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField } from '../components/ui/SlideOver'
import Button from '../components/Button'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 75) return '#10B981'
  if (pct >= 40) return '#F59E0B'
  return '#EF4444'
}

function scoreBg(pct) {
  if (pct >= 75) return '#D1FAE5'
  if (pct >= 40) return '#FEF3C7'
  return '#FEE2E2'
}

function scoreLabel(pct) {
  if (pct >= 75) return 'Maduro'
  if (pct >= 40) return 'Em desenvolvimento'
  return 'Iniciante'
}

function ScoreBar({ pct }) {
  const color = scoreColor(pct)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color }}>
          {pct}%
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20,
          background: scoreBg(pct), color,
        }}>
          {scoreLabel(pct)}
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 4, transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

function initials(nome) {
  return (nome || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function AvatarCell({ nome, sub }) {
  const ACCENT = 'var(--accent)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: `${ACCENT}18`, border: `1.5px solid ${ACCENT}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, color: ACCENT, fontFamily: 'var(--mono)', flexShrink: 0,
      }}>
        {initials(nome)}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{nome}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ─── SlideOver de detalhes do parceiro ────────────────────────────────────────
function ParceirSlideOver({ open, parceiro, scoreData, params, history, acoes, onClose }) {
  const acoesParceiro = useMemo(
    () => (acoes || []).filter(a => a.empresa_id === parceiro?.id).slice(0, 5),
    [acoes, parceiro?.id]
  )

  if (!parceiro) return null

  const score_pct = scoreData?.score_pct ?? null
  const detalhes  = scoreData?.detalhes  ?? {}

  function fmtDate(d) {
    if (!d) return '—'
    const [y, m, dia] = d.slice(0, 10).split('-')
    return `${dia}/${m}/${y}`
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={parceiro.nome}
      subtitle={parceiro.segmento || parceiro.tipo || ''}
      width={520}
    >
      {/* KPIs topo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Estado', value: parceiro.estado || parceiro.uf || '—' },
          { label: 'Status', value: parceiro.situacao || parceiro.status || '—' },
          { label: 'Maturidade', value: score_pct !== null ? `${score_pct}%` : '—' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--surface-alt)', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.label === 'Maturidade' && score_pct !== null ? scoreColor(score_pct) : 'var(--text)', fontFamily: 'var(--mono)' }}>
              {k.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Score por parâmetro */}
      {params.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
            Score de Maturidade
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {params.filter(p => p.ativo).map(p => {
              const d = detalhes[p.id] || {}
              const ok = d.atingido
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8,
                  background: ok ? '#D1FAE511' : '#FEE2E211',
                  border: `1px solid ${ok ? '#10B98133' : '#EF444433'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{ok ? '✓' : '✗'}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.nome}</div>
                      {p.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.descricao}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {d.valor !== undefined && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                        {d.valor} reg.
                      </span>
                    )}
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                      color: ok ? '#10B981' : '#9CA3AF',
                    }}>
                      {ok ? `+${p.peso}` : `0/${p.peso}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Histórico simplificado */}
          {history.length > 1 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Evolução recente
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40 }}>
                {history.slice(-10).map((h, i) => {
                  const pct = h.score_pct
                  return (
                    <div key={i} title={`${fmtDate(h.calculado_em)}: ${pct}%`} style={{
                      flex: 1, height: `${Math.max(10, pct)}%`,
                      background: scoreColor(pct), borderRadius: 3,
                      transition: 'height 0.3s',
                    }} />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ações recentes */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
          Últimas Ações
        </div>
        {acoesParceiro.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
            Nenhuma ação registrada para este parceiro.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {acoesParceiro.map(a => (
              <div key={a.id} style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--surface-alt)', border: '1px solid var(--border2)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{a.titulo}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {fmtDate(a.data_inicio)} · {a.tipo}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SlideOver>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Parceiros() {
  const { parceiros, loading: loadingP } = useParceiros()
  const { acoes }                        = useActions()
  const { params, loading: loadingParams } = usePartnerMaturity()
  const { scores, calculating, calculate, getHistory } = usePartnerScores(parceiros, params)

  const [selected, setSelected] = useState(null)
  const [slideOpen, setSlideOpen] = useState(false)
  const [history, setHistory]   = useState([])

  async function openParceiro(p) {
    setSelected(p)
    setSlideOpen(true)
    const h = await getHistory(p.id)
    setHistory(h)
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const scoreList = parceiros.map(p => scores[p.id]?.score_pct ?? null).filter(s => s !== null)
  const mediaScore = scoreList.length
    ? Math.round(scoreList.reduce((a, b) => a + b, 0) / scoreList.length)
    : null
  const baixasMaturidade = scoreList.filter(s => s < 50).length
  const total = parceiros.length

  const kpis = (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      {[
        { label: 'Total de Parceiros', value: total, color: 'var(--accent)' },
        { label: 'Maturidade Média',   value: mediaScore !== null ? `${mediaScore}%` : '—', color: mediaScore !== null ? scoreColor(mediaScore) : 'var(--text-muted)' },
        { label: 'Score < 50%',        value: baixasMaturidade, color: baixasMaturidade > 0 ? '#EF4444' : '#10B981' },
      ].map(k => (
        <div key={k.label} style={{
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 10, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 4,
          boxShadow: 'var(--shadow)', borderTop: `3px solid ${k.color}`,
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{k.value}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        loading={calculating}
        onClick={calculate}
        style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}
      >
        {calculating ? 'Calculando…' : '↻ Calcular scores'}
      </Button>
    </div>
  )

  // ── Enriquecer parceiros com score ────────────────────────────────────────
  const parceirosComScore = useMemo(() => parceiros.map(p => ({
    ...p,
    score_pct: scores[p.id]?.score_pct ?? null,
    score_calculado: scores[p.id]?.calculado_em ?? null,
  })).sort((a, b) => {
    if (a.score_pct === null && b.score_pct === null) return 0
    if (a.score_pct === null) return 1
    if (b.score_pct === null) return -1
    return a.score_pct - b.score_pct  // menos maduros primeiro
  }), [parceiros, scores])

  // ── columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'nome',
      label: 'Parceiro',
      render: (val, row) => <AvatarCell nome={val} sub={row.segmento || row.tipo || ''} />,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (val, row) => (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-soft)' }}>
          {val || row.uf || '—'}
        </span>
      ),
    },
    {
      key: 'situacao',
      label: 'Status',
      render: (val, row) => {
        const s = val || row.status || 'ativo'
        const color = s === 'ativo' ? '#10B981' : '#9CA3AF'
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 9px', borderRadius: 20,
            background: s === 'ativo' ? '#D1FAE5' : '#F3F4F6',
            color: s === 'ativo' ? '#065F46' : '#374151',
            fontSize: 11, fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        )
      },
    },
    {
      key: 'score_pct',
      label: 'Maturidade',
      render: (val) => val !== null ? <ScoreBar pct={val} /> : (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Não calculado</span>
      ),
    },
  ]

  // ── filters ───────────────────────────────────────────────────────────────
  const estados = [...new Set(parceiros.map(p => p.estado || p.uf).filter(Boolean))].sort()

  const filters = [
    {
      key: 'situacao',
      label: 'Status',
      options: [
        { value: 'ativo',    label: 'Ativo'    },
        { value: 'inativo',  label: 'Inativo'  },
        { value: 'suspenso', label: 'Suspenso' },
      ],
    },
    {
      key: 'estado',
      label: 'Estado',
      options: estados.map(e => ({ value: e, label: e })),
    },
    {
      key: 'score_range',
      label: 'Maturidade',
      options: [
        { value: 'critico',     label: '< 40% (Iniciante)'          },
        { value: 'medio',       label: '40–74% (Em desenvolvimento)' },
        { value: 'maduro',      label: '≥ 75% (Maduro)'             },
        { value: 'sem_score',   label: 'Não calculado'              },
      ],
    },
  ]

  function applyExtraFilter(row, activeFilters) {
    const sr = activeFilters?.score_range
    if (!sr) return true
    const s = row.score_pct
    if (sr === 'sem_score') return s === null
    if (sr === 'critico')   return s !== null && s < 40
    if (sr === 'medio')     return s !== null && s >= 40 && s < 75
    if (sr === 'maduro')    return s !== null && s >= 75
    return true
  }

  return (
    <>
      <BrowseLayout
        title="Parceiros"
        subtitle="Visão de maturidade e distribuição da rede de parceiros"
        loading={loadingP || loadingParams}
        items={parceirosComScore}
        columns={columns}
        filters={filters}
        searchKeys={['nome', 'estado', 'uf', 'segmento', 'tipo']}
        customFilterFn={applyExtraFilter}
        headerExtra={kpis}
        onRowClick={openParceiro}
        emptyMessage="Nenhum parceiro encontrado. Cadastre parceiros em Configurações → Parceiros."
        primaryAction={null}
      />

      <ParceirSlideOver
        open={slideOpen}
        parceiro={selected}
        scoreData={selected ? scores[selected.id] : null}
        params={params}
        history={history}
        acoes={acoes}
        onClose={() => { setSlideOpen(false); setSelected(null) }}
      />
    </>
  )
}
