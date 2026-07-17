// Widget flutuante, montado uma única vez em AppLayout (mesmo padrão de
// AlertsInbox) — mostra o progresso de importações em andamento independente
// da tela atual. O job vive em useImportJobs.js (store fora do React), então
// navegar para outra rota (ou fechar o modal que iniciou a importação) não
// interrompe nem esconde o progresso: ele só some quando o job termina e o
// usuário fecha o card, ou automaticamente alguns segundos após concluir.
import { useEffect, useRef } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { useImportJobs, dismissImportJob } from '../hooks/useImportJobs'

export default function ImportProgressWidget() {
  const jobs = useImportJobs()
  const autoDismissed = useRef(new Set())

  // Auto-remove jobs concluídos com sucesso após alguns segundos (mantém a
  // tela limpa), mas erros ficam até o usuário fechar manualmente.
  useEffect(() => {
    jobs.forEach(j => {
      if (j.status === 'done' && !autoDismissed.current.has(j.id)) {
        autoDismissed.current.add(j.id)
        setTimeout(() => dismissImportJob(j.id), 6000)
      }
    })
  }, [jobs])

  if (jobs.length === 0) return null

  return (
    <div style={s.wrap}>
      {jobs.map(j => {
        const pct = j.total > 0 ? Math.min(100, Math.round((j.current / j.total) * 100)) : 0
        return (
          <div key={j.id} style={s.card}>
            <div style={s.header}>
              <div style={s.headerLeft}>
                {j.status === 'running' && <span style={s.spinner} />}
                {j.status === 'done' && <Check size={13} color="#10B981" />}
                {j.status === 'error' && <AlertCircle size={13} color="#DC2626" />}
                <span style={s.title}>{j.label}</span>
              </div>
              <button type="button" onClick={() => dismissImportJob(j.id)} style={s.closeBtn} aria-label="Fechar">
                <X size={12} />
              </button>
            </div>
            <div style={s.track}>
              <div style={{ ...s.fill, width: `${pct}%`, background: j.status === 'error' ? '#DC2626' : j.status === 'done' ? '#10B981' : 'var(--accent)' }} />
            </div>
            <div style={s.footer}>
              <span style={s.subLabel}>{j.subLabel || (j.status === 'done' ? 'Concluído' : 'Processando…')}</span>
              <span style={s.count}>{j.current}/{j.total}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const s = {
  wrap: {
    position: 'fixed', bottom: 16, right: 16, zIndex: 9998,
    display: 'flex', flexDirection: 'column', gap: 8,
    width: 300, maxWidth: 'calc(100vw - 32px)',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '10px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 },
  title: { fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 },
  track: { height: 5, background: 'var(--border2)', borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, transition: 'width 0.2s ease' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  subLabel: { fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 },
  count: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', flexShrink: 0 },
  spinner: {
    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
    border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
    animation: 'importSpin 0.7s linear infinite',
  },
}

// injeta keyframes uma vez
if (typeof document !== 'undefined' && !document.getElementById('import-progress-keyframes')) {
  const style = document.createElement('style')
  style.id = 'import-progress-keyframes'
  style.textContent = '@keyframes importSpin { to { transform: rotate(360deg) } }'
  document.head.appendChild(style)
}
