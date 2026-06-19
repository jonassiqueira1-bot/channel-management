/**
 * MetricasStrip — painel de métricas para o slot `kpis` do BrowseLayout.
 *
 * Props:
 *   modulo   string   — chave do módulo ('pipeline', 'projetos', etc.)
 *   usuarioId string  — id do usuário logado (para filtrar métricas pessoais)
 */
import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { METRICAS_KEY, LEITURAS_KEY, INTERVALOS } from '../pages/settings/Metricas'

function calcStatus(metrica, valorAtual) {
  if (valorAtual === null || valorAtual === undefined) return 'sem_dados'
  const pct = valorAtual / metrica.valor_alvo
  if (metrica.tendencia === 'subir') {
    if (pct >= 1)    return 'atingida'
    if (pct >= 0.75) return 'atencao'
    return 'abaixo'
  } else {
    if (pct <= 1)    return 'atingida'
    if (pct <= 1.25) return 'atencao'
    return 'abaixo'
  }
}

const STATUS_CFG = {
  atingida:  { cor: '#10B981', bg: '#D1FAE5', label: 'Atingida' },
  atencao:   { cor: '#F59E0B', bg: '#FEF3C7', label: 'Atenção'  },
  abaixo:    { cor: '#EF4444', bg: '#FEE2E2', label: 'Abaixo'   },
  sem_dados: { cor: '#9CA3AF', bg: '#F3F4F6', label: 'Sem dados' },
}

function LogModal({ metrica, onSave, onClose }) {
  const [valor, setValor] = useState('')
  const [nota, setNota]   = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, width: 380,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
          Registrar leitura
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          {metrica.nome} · Meta: {metrica.unidade} {Number(metrica.valor_alvo).toLocaleString('pt-BR')}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
            color: 'var(--text-muted)', marginBottom: 6 }}>
            Valor atual ({metrica.unidade})
          </div>
          <input className="fpe-field" type="number" value={valor} onChange={e => setValor(e.target.value)}
            placeholder={`Ex: ${Math.round(metrica.valor_alvo * 0.8)}`}
            style={{ width: '100%', boxSizing: 'border-box' }} autoFocus />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
            color: 'var(--text-muted)', marginBottom: 6 }}>
            Observação (opcional)
          </div>
          <input className="fpe-field" value={nota} onChange={e => setNota(e.target.value)}
            placeholder="Ex: semana de feriado, ajuste sazonalidade…"
            style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
            Cancelar
          </button>
          <button type="button" disabled={!valor}
            onClick={() => onSave({ metrica_id: metrica.id, valor: Number(valor), nota, data: new Date().toISOString() })}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
              background: valor ? 'var(--accent)' : 'var(--border)', color: '#fff',
              cursor: valor ? 'pointer' : 'default', fontSize: 13, fontWeight: 700 }}>
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MetricasStrip({ modulo, usuarioId }) {
  const [metricas]          = useLocalState(METRICAS_KEY, [])
  const [leituras, setLeituras] = useLocalState(LEITURAS_KEY, [])
  const [logModal, setLogModal] = useState(null)

  const metricasModulo = useMemo(() => {
    return metricas.filter(m =>
      m.status === 'ativo' &&
      (m.modulos || []).includes(modulo) &&
      (m.usuario_ids?.length === 0 || !m.usuario_ids || m.usuario_ids.includes(usuarioId))
    )
  }, [metricas, modulo, usuarioId])

  function ultimaLeitura(metricaId) {
    const lista = leituras.filter(l => l.metrica_id === metricaId)
    if (!lista.length) return null
    return lista.sort((a, b) => new Date(b.data) - new Date(a.data))[0]
  }

  function registrarLeitura(leitura) {
    setLeituras(prev => [...prev, { ...leitura, id: Date.now() }])
    setLogModal(null)
  }

  if (!metricasModulo.length) return null

  return (
    <>
      {logModal && (
        <LogModal metrica={logModal} onSave={registrarLeitura} onClose={() => setLogModal(null)} />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {metricasModulo.map(m => {
          const ultima  = ultimaLeitura(m.id)
          const atual   = ultima ? ultima.valor : null
          const status  = calcStatus(m, atual)
          const cfg     = STATUS_CFG[status]
          const pct     = atual !== null
            ? Math.min(Math.round((m.tendencia === 'subir' ? atual / m.valor_alvo : m.valor_alvo / atual) * 100), 100)
            : 0
          const intervaloLabel = INTERVALOS.find(i => i.value === m.intervalo)?.label || m.intervalo

          return (
            <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px', minWidth: 200, maxWidth: 260, flex: '1 1 200px',
              borderLeft: `4px solid ${m.cor || cfg.cor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1, marginRight: 8 }}>{m.nome}</span>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 8px',
                  background: cfg.bg, color: cfg.cor, whiteSpace: 'nowrap' }}>{cfg.label}</span>
              </div>

              {/* Barra de progresso */}
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: cfg.cor, borderRadius: 3, transition: 'width 0.4s' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                    {atual !== null ? `${m.unidade} ${Number(atual).toLocaleString('pt-BR')}` : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                    / {m.unidade} {Number(m.valor_alvo).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {m.periodo}× {intervaloLabel}
                  </span>
                  <button type="button" onClick={() => setLogModal(m)}
                    title="Registrar leitura"
                    style={{ background: 'var(--accent-lite)', border: 'none', borderRadius: 6,
                      color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: '2px 8px',
                      fontWeight: 700, lineHeight: 1 }}>
                    +
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
