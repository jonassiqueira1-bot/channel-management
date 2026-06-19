import { useMemo, useState } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useFunnels } from '../hooks/useFunnels'
import { INDICADORES_KEY, calcValorIndicador } from '../pages/settings/Indicadores'
import { METAS_KEY } from '../pages/settings/Metas'

function calcStatus(meta, indicador, valorAtual) {
  if (valorAtual === null || valorAtual === undefined) return 'sem_dados'
  const pct = valorAtual / Number(meta.valor_alvo)
  if (indicador?.tendencia === 'descer') {
    if (pct <= 1)    return 'atingida'
    if (pct <= 1.25) return 'atencao'
    return 'abaixo'
  } else {
    if (pct >= 1)    return 'atingida'
    if (pct >= 0.75) return 'atencao'
    return 'abaixo'
  }
}

const STATUS_CFG = {
  atingida:  { cor: '#10B981', bg: '#D1FAE5', dot: '●' },
  atencao:   { cor: '#F59E0B', bg: '#FEF3C7', dot: '●' },
  abaixo:    { cor: '#EF4444', bg: '#FEE2E2', dot: '●' },
  sem_dados: { cor: '#9CA3AF', bg: '#F3F4F6', dot: '○' },
}

function fmtVal(v, unidade) {
  if (v === null || v === undefined) return '—'
  return `${unidade || ''} ${Number(v).toLocaleString('pt-BR')}`.trim()
}

function MetaChip({ meta, indicador, funis }) {
  const [open, setOpen] = useState(false)
  const valorAtual = calcValorIndicador(indicador, funis)
  const status = calcStatus(meta, indicador, valorAtual)
  const cfg = STATUS_CFG[status]
  const alvo = Number(meta.valor_alvo)
  const pct = valorAtual !== null && alvo > 0
    ? Math.min(Math.round(
        (indicador?.tendencia === 'descer' ? alvo / valorAtual : valorAtual / alvo) * 100
      ), 100)
    : 0
  const gap = valorAtual !== null ? Math.abs(alvo - Number(valorAtual)) : null

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: open ? cfg.bg : 'var(--surface)',
          border: `1px solid ${open ? cfg.cor : 'var(--border)'}`,
          borderRadius: 20, padding: '4px 10px 4px 8px',
          cursor: 'pointer', transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 11, color: cfg.cor }}>{cfg.dot}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{meta.nome}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: cfg.cor, fontWeight: 700 }}>
          {pct}%
        </span>
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px', minWidth: 220,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            borderTop: `3px solid ${cfg.cor}`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 10 }}>{meta.nome}</div>

            {/* barra de progresso */}
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: cfg.cor, borderRadius: 3, transition: 'width 0.4s' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Atual</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                  {fmtVal(valorAtual, indicador?.unidade)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Meta</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                  {fmtVal(alvo, indicador?.unidade)}
                </div>
              </div>
              {gap !== null && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    {pct >= 100 ? 'Superado em' : 'Faltam'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: cfg.cor, fontFamily: 'var(--mono)' }}>
                    {fmtVal(gap, indicador?.unidade)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function MetricasStrip({ modulo }) {
  const [indicadores] = useLocalState(INDICADORES_KEY, [])
  const [metas] = useLocalState(METAS_KEY, [])
  const { funis } = useFunnels()

  const hoje = new Date().toISOString().slice(0, 10)

  const metasRaiz = useMemo(() => {
    return metas.filter(m => {
      if (m.status !== 'ativo') return false
      if (m.meta_pai_id) return false
      const ind = indicadores.find(i => String(i.id) === String(m.indicador_id))
      if (!ind || ind.modulo !== modulo) return false
      if (m.data_inicio && hoje < m.data_inicio) return false
      if (m.data_fim && hoje > m.data_fim) return false
      return true
    })
  }, [metas, indicadores, modulo, hoje])

  if (!metasRaiz.length) return null

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6,
      padding: '8px 20px 4px',
    }}>
      {metasRaiz.map(meta => {
        const ind = indicadores.find(i => String(i.id) === String(meta.indicador_id))
        return <MetaChip key={meta.id} meta={meta} indicador={ind} funis={funis} />
      })}
    </div>
  )
}
