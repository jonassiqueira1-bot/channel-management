/**
 * MetricasPanel — painel de inteligência discreto para telas operacionais.
 * Aparece fixo no canto inferior-direito da tela de edição.
 *
 * Props:
 *   modulo      string   — chave do módulo
 *   usuarioId   string   — id do usuário/vendedor do registro em edição
 *   valorImpacto number  — valor monetário/numérico do registro (ex: valor da oportunidade)
 *   unidade     string   — unidade desse valor (ex: 'R$')
 */
import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useFunnels } from '../hooks/useFunnels'
import { INDICADORES_KEY, calcValorIndicador } from '../pages/settings/Indicadores'
import { METAS_KEY } from '../pages/settings/Metas'

function calcStatus(valorAlvo, tendencia, valorAtual) {
  if (valorAtual === null || valorAtual === undefined) return 'sem_dados'
  const pct = valorAtual / Number(valorAlvo)
  if (tendencia === 'descer') {
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
  atingida:  { cor: '#10B981', emoji: '✓', label: 'Atingida' },
  atencao:   { cor: '#F59E0B', emoji: '!', label: 'Atenção'  },
  abaixo:    { cor: '#EF4444', emoji: '↓', label: 'Abaixo'   },
  sem_dados: { cor: '#9CA3AF', emoji: '?', label: 'Sem dados' },
}

export default function MetricasPanel({ modulo, usuarioId, valorImpacto, unidade = '' }) {
  const [indicadores] = useLocalState(INDICADORES_KEY, [])
  const [metas] = useLocalState(METAS_KEY, [])
  const { funis } = useFunnels()
  const [aberto, setAberto] = useState(false)

  const hoje = new Date().toISOString().slice(0, 10)

  const metasRel = useMemo(() => {
    return metas.filter(m => {
      if (m.status !== 'ativo') return false
      const ind = indicadores.find(i => i.id === m.indicador_id)
      if (!ind || ind.modulo !== modulo) return false
      if (m.data_inicio && hoje < m.data_inicio) return false
      if (m.data_fim && hoje > m.data_fim) return false
      return true
    })
  }, [metas, indicadores, modulo, hoje])

  if (!metasRel.length) return null

  function getValorAtual(meta) {
    const ind = indicadores.find(i => i.id === meta.indicador_id)
    return ind ? calcValorIndicador(ind, funis) : null
  }

  const statusCounts = metasRel.reduce((acc, m) => {
    const ind = indicadores.find(i => i.id === m.indicador_id)
    const val = getValorAtual(m)
    const s = calcStatus(m.valor_alvo, ind?.tendencia, val)
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const corGeral = statusCounts.abaixo ? '#EF4444'
    : statusCounts.atencao ? '#F59E0B'
    : statusCounts.atingida ? '#10B981'
    : '#9CA3AF'

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, fontFamily: 'var(--font)' }}>
      {aberto && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', padding: 16, width: 300, marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
            color: 'var(--text-muted)', marginBottom: 12 }}>
            Métricas impactadas
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {metasRel.map(m => {
              const ind = indicadores.find(i => i.id === m.indicador_id)
              const atual = getValorAtual(m)
              const status = calcStatus(m.valor_alvo, ind?.tendencia, atual)
              const cfg = STATUS_CFG[status]

              const impactoPct = (valorImpacto && m.valor_alvo)
                ? Math.round((valorImpacto / Number(m.valor_alvo)) * 100)
                : null

              const pctAtual = atual !== null && Number(m.valor_alvo) > 0
                ? Math.min(Math.round(
                    (ind?.tendencia === 'descer'
                      ? Number(m.valor_alvo) / atual
                      : atual / Number(m.valor_alvo)) * 100
                  ), 100)
                : 0

              return (
                <div key={m.id} style={{ padding: '10px 12px', borderRadius: 10,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${cfg.cor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{m.nome}</span>
                    <span style={{ fontSize: 11, color: cfg.cor, fontWeight: 700 }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pctAtual}%`, background: cfg.cor, borderRadius: 2 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                      {atual !== null ? `${ind?.unidade || ''} ${Number(atual).toLocaleString('pt-BR')}`.trim() : '—'}
                      {' / '}
                      {ind?.unidade || ''} {Number(m.valor_alvo).toLocaleString('pt-BR')}
                    </span>
                    {impactoPct !== null && (
                      <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-lite)',
                        borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                        +{impactoPct}% desta meta
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {valorImpacto && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Este registro representa {unidade} {Number(valorImpacto).toLocaleString('pt-BR')} de impacto potencial
            </div>
          )}
        </div>
      )}

      {/* Pill */}
      <button type="button" onClick={() => setAberto(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          borderRadius: 24, border: `1.5px solid ${corGeral}`,
          background: 'var(--surface)', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          cursor: 'pointer', color: corGeral, fontSize: 12, fontWeight: 700,
          transition: 'all 0.15s' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: corGeral, flexShrink: 0 }} />
        {metasRel.length} meta{metasRel.length > 1 ? 's' : ''}
        {statusCounts.abaixo ? ` · ${statusCounts.abaixo} abaixo` : ''}
        {!statusCounts.abaixo && statusCounts.atencao ? ` · ${statusCounts.atencao} atenção` : ''}
        <span style={{ fontSize: 11, opacity: 0.7 }}>{aberto ? '▼' : '▲'}</span>
      </button>
    </div>
  )
}
