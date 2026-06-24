import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useProfile } from '../hooks/useProfile'
import { MOCK_TIME_LOGS } from '../data/mockProjetos'

const TIMELOGS_KEY   = 'projetos:timeLogs_v1'
const PROJETOS_KEY   = 'projetos:lista_v2'
export const FECHAMENTOS_KEY = 'projects:fechamentos_v1'

// Fechamento record:
// { id, periodo, user_name, status: 'aberto'|'enviado'|'aprovado'|'rejeitado',
//   log_ids[], horas_total, enviado_em, aprovado_em, rejeitado_em, obs }

function fmtH(h) { return `${Number(h || 0).toFixed(1)}h` }
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}
function mesLabel(periodo) {
  if (!periodo) return ''
  const [y, m] = periodo.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m, 10) - 1]}/${y}`
}

const STATUS_CFG = {
  aberto:    { label: 'Aberto',    color: 'var(--text-muted)', bg: 'var(--surface2)',   border: 'var(--border)' },
  enviado:   { label: 'Aguard. aprovação', color: '#F59E0B', bg: '#FEF3C7', border: '#FCD34D' },
  aprovado:  { label: 'Aprovado', color: '#10B981', bg: '#D1FAE5', border: '#6EE7B7' },
  rejeitado: { label: 'Rejeitado', color: '#EF4444', bg: '#FEE2E2', border: '#FCA5A5' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.aberto
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

export default function FechamentoHoras({ embedded = false }) {
  const { profile } = useProfile()
  const isGestor = !profile || profile.papel === 'admin_isv' || profile.role === 'admin_isv'

  // Período de referência
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().slice(0, 7))
  const [expandido, setExpandido] = useState({})
  const [obsModal, setObsModal] = useState(null) // { fec, obs } para rejeição

  // Dados brutos
  const [timeLogs] = useLocalState(TIMELOGS_KEY, MOCK_TIME_LOGS)
  const [projetos]  = useLocalState(PROJETOS_KEY, [])
  const [fechamentos, setFechamentos] = useLocalState(FECHAMENTOS_KEY, [])

  // Logs do período
  const logsNoPeriodo = useMemo(() =>
    timeLogs.filter(l => l.logged_at?.slice(0, 7) === periodo),
  [timeLogs, periodo])

  // Agrupa logs por analista
  const porAnalista = useMemo(() => {
    const map = {}
    logsNoPeriodo.forEach(l => {
      const k = l.user_name || 'Sem nome'
      if (!map[k]) map[k] = { user_name: k, logs: [] }
      map[k].logs.push(l)
    })
    return Object.values(map).sort((a, b) => a.user_name.localeCompare(b.user_name, 'pt-BR'))
  }, [logsNoPeriodo])

  // Fechamento do período por analista
  function getFec(user_name) {
    return fechamentos.find(f => f.periodo === periodo && f.user_name === user_name) || null
  }

  function upsertFec(user_name, patch) {
    setFechamentos(prev => {
      const idx = prev.findIndex(f => f.periodo === periodo && f.user_name === user_name)
      if (idx >= 0) {
        const n = [...prev]; n[idx] = { ...n[idx], ...patch }; return n
      }
      const grupo = porAnalista.find(g => g.user_name === user_name)
      const horas = grupo?.logs.reduce((s, l) => s + Number(l.hours_executed), 0) || 0
      return [...prev, {
        id: `fec_${periodo}_${user_name}_${Date.now()}`,
        periodo, user_name,
        status: 'aberto',
        log_ids: grupo?.logs.map(l => l.id) || [],
        horas_total: horas,
        enviado_em: null, aprovado_em: null, rejeitado_em: null, obs: null,
        ...patch,
      }]
    })
  }

  // Marcar logs como fechados no localStorage de timeLogs
  function marcarLogsAprovados(log_ids) {
    const ids = new Set(log_ids)
    const hoje = new Date().toISOString().slice(0, 10)
    const updated = timeLogs.map(l => ids.has(l.id) ? { ...l, fechado: true, fechado_em: hoje } : l)
    localStorage.setItem(TIMELOGS_KEY, JSON.stringify(updated))
  }

  function handleEnviar(user_name) {
    const grupo = porAnalista.find(g => g.user_name === user_name)
    const horas = grupo?.logs.reduce((s, l) => s + Number(l.hours_executed), 0) || 0
    upsertFec(user_name, {
      status: 'enviado',
      log_ids: grupo?.logs.map(l => l.id) || [],
      horas_total: horas,
      enviado_em: new Date().toISOString().slice(0, 10),
    })
  }

  function handleAprovar(user_name) {
    const fec = getFec(user_name)
    upsertFec(user_name, { status: 'aprovado', aprovado_em: new Date().toISOString().slice(0, 10) })
    if (fec?.log_ids?.length) marcarLogsAprovados(fec.log_ids)
  }

  function handleRejeitar(user_name, obs) {
    upsertFec(user_name, {
      status: 'rejeitado',
      rejeitado_em: new Date().toISOString().slice(0, 10),
      obs,
    })
    setObsModal(null)
  }

  function handleReabrir(user_name) {
    upsertFec(user_name, { status: 'aberto', enviado_em: null, aprovado_em: null, rejeitado_em: null, obs: null })
  }

  // KPIs do período
  const totalAnalistas = porAnalista.length
  const totalHoras = logsNoPeriodo.reduce((s, l) => s + Number(l.hours_executed), 0)
  const aprovados   = porAnalista.filter(g => getFec(g.user_name)?.status === 'aprovado').length
  const enviados    = porAnalista.filter(g => getFec(g.user_name)?.status === 'enviado').length
  const horasAprov  = porAnalista
    .filter(g => getFec(g.user_name)?.status === 'aprovado')
    .reduce((s, g) => s + g.logs.reduce((sh, l) => sh + Number(l.hours_executed), 0), 0)

  // Histórico: fechamentos aprovados de outros períodos
  const historico = useMemo(() =>
    fechamentos
      .filter(f => f.status === 'aprovado' && f.periodo !== periodo)
      .sort((a, b) => b.periodo.localeCompare(a.periodo)),
  [fechamentos, periodo])

  // ── Estilos ────────────────────────────────────────────────────────────────
  const inp = { padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', width: '100%' }
  const btnSm = (color, bg, border) => ({
    padding: '5px 12px', borderRadius: 7, border: `1px solid ${border}`,
    background: bg, color, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
  })

  return (
    <div style={{ padding: embedded ? '0' : '24px 28px', maxWidth: 860, margin: embedded ? undefined : '0 auto' }}>

      {/* Título */}
      {!embedded && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Fechamento de Horas</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Fluxo de aprovação de horas por período — Aberto → Enviado → Aprovado
          </div>
        </div>
      )}

      {/* Seletor de período */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Período</label>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ ...inp, width: 160 }} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: 2 }}>
          {mesLabel(periodo)} · {logsNoPeriodo.length} apontamento(s) · {fmtH(totalHoras)} no total
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Analistas no período', value: totalAnalistas,       color: 'var(--accent)' },
          { label: 'Aguard. aprovação',    value: enviados,             color: '#F59E0B' },
          { label: 'Aprovados',            value: aprovados,            color: '#10B981' },
          { label: 'Horas aprovadas',      value: fmtH(horasAprov),    color: '#10B981' },
        ].map(k => (
          <div key={k.label} style={{ padding: '12px 16px', background: 'var(--surface)',
            border: '1px solid var(--border2)', borderRadius: 10, borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '.05em', marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Fluxo visual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20,
        background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)',
        padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        {['Analista lança horas', 'Envia para aprovação', 'Gestor aprova', 'Horas travadas → Financeiro'].map((s, i, arr) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ padding: '4px 10px', borderRadius: 20,
              background: i < 3 ? 'var(--surface)' : '#D1FAE5',
              color: i < 3 ? 'var(--text-muted)' : '#065F46',
              fontWeight: i === 3 ? 700 : 500, border: '1px solid var(--border2)', whiteSpace: 'nowrap' }}>
              {s}
            </span>
            {i < arr.length - 1 && <span style={{ margin: '0 4px', color: 'var(--border)' }}>→</span>}
          </div>
        ))}
      </div>

      {/* Sem dados */}
      {porAnalista.length === 0 && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
          border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--surface)' }}>
          Nenhum apontamento encontrado para {mesLabel(periodo)}
        </div>
      )}

      {/* Cards por analista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {porAnalista.map(({ user_name, logs }) => {
          const fec    = getFec(user_name)
          const status = fec?.status || 'aberto'
          const cfg    = STATUS_CFG[status]
          const horas  = logs.reduce((s, l) => s + Number(l.hours_executed), 0)
          const isOpen = expandido[user_name]
          const isLocked = status === 'aprovado'

          return (
            <div key={user_name} style={{ border: `1px solid ${cfg.border}`, borderRadius: 12,
              overflow: 'hidden', background: 'var(--surface)',
              opacity: isLocked ? 0.85 : 1 }}>

              {/* Cabeçalho do analista */}
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                background: isLocked ? '#D1FAE522' : 'var(--surface2)',
                borderBottom: isOpen ? '1px solid var(--border2)' : 'none' }}>

                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: `${cfg.color}22`, border: `2px solid ${cfg.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: cfg.color }}>
                  {user_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{user_name}</span>
                    <StatusBadge status={status} />
                    {isLocked && (
                      <span style={{ fontSize: 10, color: '#065F46' }}>
                        Aprovado em {fmtDate(fec?.aprovado_em)} · horas travadas
                      </span>
                    )}
                    {status === 'rejeitado' && fec?.obs && (
                      <span style={{ fontSize: 10, color: '#991B1B' }}>Obs: {fec.obs}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {logs.length} apontamento(s) · {fmtH(horas)}
                    {fec?.enviado_em && status !== 'aberto' && ` · Enviado em ${fmtDate(fec.enviado_em)}`}
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {/* Analista: pode enviar se aberto ou rejeitado */}
                  {(status === 'aberto' || status === 'rejeitado') && (
                    <button onClick={() => handleEnviar(user_name)}
                      style={btnSm('#fff', 'var(--accent)', 'var(--accent)')}>
                      Enviar
                    </button>
                  )}

                  {/* Gestor: pode aprovar ou rejeitar se enviado */}
                  {isGestor && status === 'enviado' && (
                    <>
                      <button onClick={() => handleAprovar(user_name)}
                        style={btnSm('#065F46', '#D1FAE5', '#6EE7B7')}>
                        Aprovar
                      </button>
                      <button onClick={() => setObsModal({ user_name, obs: '' })}
                        style={btnSm('#991B1B', '#FEE2E2', '#FCA5A5')}>
                        Rejeitar
                      </button>
                    </>
                  )}

                  {/* Gestor: pode reabrir aprovados */}
                  {isGestor && status === 'aprovado' && (
                    <button onClick={() => handleReabrir(user_name)}
                      style={btnSm('var(--text-muted)', 'var(--surface2)', 'var(--border)')}>
                      Reabrir
                    </button>
                  )}

                  {/* Toggle expandir */}
                  <button onClick={() => setExpandido(e => ({ ...e, [user_name]: !e[user_name] }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>
                    {isOpen ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {/* Detalhe dos apontamentos */}
              {isOpen && (
                <div>
                  {logs.map((log, i) => {
                    const prj = projetos.find(p => p.id === log.project_id)
                    return (
                      <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 16px',
                        borderBottom: i < logs.length - 1 ? '1px solid var(--border2)' : 'none',
                        background: isLocked ? '#D1FAE508' : 'transparent' }}>
                        <div style={{ width: 72, flexShrink: 0,
                          fontSize: 11, color: 'var(--text-muted)', paddingTop: 2, whiteSpace: 'nowrap' }}>
                          {fmtDate(log.logged_at)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.description || '—'}
                          </div>
                          {prj && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2,
                              fontFamily: 'var(--mono)', background: 'var(--surface2)',
                              display: 'inline-block', padding: '1px 6px', borderRadius: 4 }}>
                              {prj.name}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: isLocked ? '#10B981' : 'var(--accent)',
                          fontFamily: 'var(--mono)', flexShrink: 0 }}>
                          {fmtH(log.hours_executed)}
                          {isLocked && <span style={{ fontSize: 10, marginLeft: 4 }}>✓</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Histórico de períodos aprovados */}
      {historico.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '.06em', marginBottom: 12 }}>Histórico aprovado</div>
          <div style={{ border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border2)' }}>
                  {['Período', 'Analista', 'Horas', 'Aprovado em'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10,
                      fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map((f, i) => (
                  <tr key={f.id} style={{ borderBottom: i < historico.length - 1 ? '1px solid var(--border2)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>
                    <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{mesLabel(f.periodo)}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--text)' }}>{f.user_name}</td>
                    <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', color: '#10B981', fontWeight: 700 }}>{fmtH(f.horas_total)}</td>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>{fmtDate(f.aprovado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de rejeição */}
      {obsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
            padding: 28, width: 420, maxWidth: '95vw' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Rejeitar fechamento</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Analista: <strong>{obsModal.user_name}</strong>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>
              Motivo da rejeição (opcional)
            </label>
            <textarea value={obsModal.obs}
              onChange={e => setObsModal(m => ({ ...m, obs: e.target.value }))}
              style={{ ...inp, height: 80, resize: 'vertical', marginBottom: 16 }}
              placeholder="Ex: faltam apontamentos do dia 15…" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setObsModal(null)}
                style={btnSm('var(--text-muted)', 'var(--surface2)', 'var(--border)')}>
                Cancelar
              </button>
              <button onClick={() => handleRejeitar(obsModal.user_name, obsModal.obs)}
                style={btnSm('#fff', '#EF4444', '#EF4444')}>
                Confirmar rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
