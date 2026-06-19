import { useMemo } from 'react'
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
  atingida:  { cor: '#10B981', bg: '#D1FAE5', label: 'Atingida' },
  atencao:   { cor: '#F59E0B', bg: '#FEF3C7', label: 'Atenção'  },
  abaixo:    { cor: '#EF4444', bg: '#FEE2E2', label: 'Abaixo'   },
  sem_dados: { cor: '#9CA3AF', bg: '#F3F4F6', label: 'Sem dados' },
}

const PERIODO_LABEL = {
  mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
}

function MetaCard({ meta, indicador, funis, filhos }) {
  let valorAtual
  if (filhos && filhos.length > 0) {
    valorAtual = filhos.reduce((s, f) => {
      const v = calcValorIndicador(indicador, funis)
      return s + (v !== null ? v : 0)
    }, 0)
  } else {
    valorAtual = calcValorIndicador(indicador, funis)
  }

  const status = calcStatus(meta, indicador, valorAtual)
  const cfg = STATUS_CFG[status]
  const alvo = Number(meta.valor_alvo)
  const pct = valorAtual !== null && alvo > 0
    ? Math.min(Math.round(
        (indicador?.tendencia === 'descer' ? alvo / valorAtual : valorAtual / alvo) * 100
      ), 100)
    : 0

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 16px', minWidth: 200, maxWidth: 260, flex: '1 1 200px',
      borderLeft: `4px solid ${cfg.cor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1, marginRight: 8 }}>{meta.nome}</span>
        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 8px',
          background: cfg.bg, color: cfg.cor, whiteSpace: 'nowrap' }}>{cfg.label}</span>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cfg.cor, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
            {valorAtual !== null ? `${indicador?.unidade || ''} ${Number(valorAtual).toLocaleString('pt-BR')}`.trim() : '—'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
            / {indicador?.unidade || ''} {alvo.toLocaleString('pt-BR')}
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {PERIODO_LABEL[meta.periodo] || meta.periodo}
        </span>
      </div>
    </div>
  )
}

export default function MetricasStrip({ modulo, usuarioId }) {
  const [indicadores] = useLocalState(INDICADORES_KEY, [])
  const [metas] = useLocalState(METAS_KEY, [])
  const { funis } = useFunnels()

  const hoje = new Date().toISOString().slice(0, 10)

  const metasAtivas = useMemo(() => {
    return metas.filter(m => {
      if (m.status !== 'ativo') return false
      const ind = indicadores.find(i => i.id === m.indicador_id)
      if (!ind || ind.modulo !== modulo) return false
      if (m.data_inicio && hoje < m.data_inicio) return false
      if (m.data_fim && hoje > m.data_fim) return false
      return true
    })
  }, [metas, indicadores, modulo, hoje])

  const metasPai = useMemo(
    () => metasAtivas.filter(m => !m.meta_pai_id),
    [metasAtivas]
  )

  const filhosPor = useMemo(() => {
    const map = {}
    metasAtivas.forEach(m => {
      if (m.meta_pai_id) {
        if (!map[m.meta_pai_id]) map[m.meta_pai_id] = []
        map[m.meta_pai_id].push(m)
      }
    })
    return map
  }, [metasAtivas])

  if (!metasPai.length && !metasAtivas.filter(m => !m.meta_pai_id).length) return null
  if (!metasAtivas.length) return null

  const metasRaiz = metasAtivas.filter(m => !m.meta_pai_id)
  if (!metasRaiz.length) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {metasRaiz.map(meta => {
        const ind = indicadores.find(i => i.id === meta.indicador_id)
        const filhos = filhosPor[meta.id] || []
        return (
          <MetaCard key={meta.id} meta={meta} indicador={ind} funis={funis} filhos={filhos} />
        )
      })}
    </div>
  )
}
