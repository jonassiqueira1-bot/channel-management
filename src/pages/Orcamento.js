import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useProfile } from '../hooks/useProfile'
import { useCentrosCusto } from '../hooks/useCentrosCusto'
import { useOrcamentos } from '../hooks/useOrcamentos'
import { useCampanhas } from '../hooks/useCampanhas'
import { useActions } from '../hooks/useActions'
import { useProjects } from '../hooks/useProjects'

const ACCENT = 'var(--accent)'

function fmtMoeda(v) {
  if (!v && v !== 0) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Soma os itens de custo executados (valor_realizado) de uma lista de
// registros (Campanhas ou Ações — mesmo formato de custos[]), cuja data de
// referência caia no mês da competência selecionada.
function somaCustosExecutados(registros, dataField, competenciaYm) {
  const totais = {}
  registros.forEach(r => {
    if (!r.centro_custo_id) return
    const ref = (r[dataField] || '').slice(0, 7)
    if (ref !== competenciaYm) return
    const total = (r.custos || []).reduce((s, c) => s + (c.executado ? (Number(c.valor_realizado) || 0) : 0), 0)
    totais[r.centro_custo_id] = (totais[r.centro_custo_id] || 0) + total
  })
  return totais
}

// Governança financeira/gerencial — Planejado x Realizado por Centro de
// Custo. Restrito a admin_isv (ver App.js/Sidebar). Realizado é calculado em
// tempo real a partir de Campanhas e Ações (que já têm custos[] com
// previsto/realizado/aprovação por item) filtrados pelo mês de competência.
// Projetos entra como informativo à parte — o custo ali é acumulado desde o
// início do projeto, não é naturalmente mensal, então não é somado ao total.
export default function Orcamento() {
  const { profile } = useProfile()
  const { centros } = useCentrosCusto()
  const { orcamentos, save } = useOrcamentos()
  const { campanhas } = useCampanhas()
  const { acoes } = useActions()
  const { projetos } = useProjects()

  const [competencia, setCompetencia] = useLocalState('orcamento:competencia', new Date().toISOString().slice(0, 7))
  const [editando, setEditando] = useState(null) // { centro_custo_id, valor }

  const competenciaData = competencia + '-01'

  const realizadoCampanhas = useMemo(() => somaCustosExecutados(campanhas || [], 'start_date', competencia), [campanhas, competencia])
  const realizadoAcoes     = useMemo(() => somaCustosExecutados(acoes || [], 'data_inicio', competencia), [acoes, competencia])

  const custoProjetosPorCentro = useMemo(() => {
    const totais = {}
    ;(projetos || []).forEach(p => {
      if (!p.centro_custo_id) return
      totais[p.centro_custo_id] = (totais[p.centro_custo_id] || 0) + (Number(p.fin_custo_realizado) || 0)
    })
    return totais
  }, [projetos])

  const linhas = useMemo(() => {
    return centros.filter(c => c.status === 'ativo').map(c => {
      const orc = orcamentos.find(o => o.centro_custo_id === c.id && o.competencia === competenciaData)
      const planejado = orc?.valor_planejado || 0
      const realizado = (realizadoCampanhas[c.id] || 0) + (realizadoAcoes[c.id] || 0)
      const desvio = planejado > 0 ? ((realizado - planejado) / planejado) * 100 : null
      return { centro: c, planejado, realizado, desvio, orcId: orc?.id }
    })
  }, [centros, orcamentos, competenciaData, realizadoCampanhas, realizadoAcoes])

  const totalPlanejado = linhas.reduce((s, l) => s + l.planejado, 0)
  const totalRealizado = linhas.reduce((s, l) => s + l.realizado, 0)

  async function salvarPlanejado() {
    if (!editando) return
    await save({ id: editando.orcId, centro_custo_id: editando.centro_custo_id, competencia: competenciaData, valor_planejado: editando.valor })
    setEditando(null)
  }

  // Restrito a admin_isv — governança financeira, mesmo critério de acesso
  // do restante do módulo (ver App.js/Sidebar).
  if (profile && profile.papel !== 'admin_isv' && profile.role !== 'admin_isv') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 8, color: 'var(--text-muted)' }}>
        <span style={{ fontSize: 28, opacity: 0.3 }}>🔒</span>
        <span>Acesso restrito a administradores.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Orçamento</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Planejado x realizado por Centro de Custo — governança financeira e fiscal.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Competência</label>
        <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--mono)' }} />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total planejado', value: fmtMoeda(totalPlanejado), color: ACCENT },
          { label: 'Total realizado', value: fmtMoeda(totalRealizado), color: totalRealizado > totalPlanejado && totalPlanejado > 0 ? '#EF4444' : '#10B981' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)',
            borderTop: `2px solid ${k.color}`, borderRadius: 10, padding: '14px 20px',
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 160 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily: 'var(--mono)' }}>{k.value}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</span>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              {['Centro de Custo', 'Planejado', 'Realizado', 'Desvio', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhum Centro de Custo ativo — cadastre em Configurações → Centros de Custo.
              </td></tr>
            )}
            {linhas.map(l => {
              const emEdicao = editando?.centro_custo_id === l.centro.id
              return (
                <tr key={l.centro.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{l.centro.nome}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'var(--mono)' }}>
                    {emEdicao ? (
                      <input type="number" min="0" step="0.01" autoFocus value={editando.valor}
                        onChange={e => setEditando(ed => ({ ...ed, valor: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && salvarPlanejado()}
                        style={{ width: 120, padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--mono)' }} />
                    ) : fmtMoeda(l.planejado)}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtMoeda(l.realizado)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700,
                    color: l.desvio == null ? 'var(--text-muted)' : l.desvio > 0 ? '#EF4444' : '#10B981' }}>
                    {l.desvio == null ? '—' : `${l.desvio > 0 ? '+' : ''}${l.desvio.toFixed(1)}%`}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {emEdicao ? (
                      <button onClick={salvarPlanejado} style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: ACCENT, border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>Salvar</button>
                    ) : (
                      <button onClick={() => setEditando({ centro_custo_id: l.centro.id, orcId: l.orcId, valor: l.planejado || '' })}
                        style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>Editar planejado</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {Object.keys(custoProjetosPorCentro).length > 0 && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Custo de Projetos (acumulado, informativo)</div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px' }}>
            Custo de projetos é acumulado desde o início de cada projeto (horas × custo/hora) — não entra no total mensal acima automaticamente.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(custoProjetosPorCentro).map(([centroId, valor]) => {
              const centro = centros.find(c => c.id === centroId)
              return (
                <div key={centroId} style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                  <strong style={{ color: 'var(--text)' }}>{centro?.nome || centroId}</strong>: {fmtMoeda(valor)}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
