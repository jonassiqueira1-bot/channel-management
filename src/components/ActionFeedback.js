import { useState, useEffect } from 'react'

/**
 * ActionFeedback — painel lateral de progresso para ações com efeitos colaterais.
 *
 * Props:
 *   title      string          — título do painel
 *   subtitle   string?         — subtítulo opcional
 *   steps      [{id, label, sublabel?, icon?, skip?}]
 *              skip=true → aparece riscado/ignorado (ação desabilitada pelo usuário)
 *   onClose    () => void
 *   stepDelay  number (ms, default 650) — tempo entre cada step
 *   autoClose  number (ms, 0 = não fecha auto, default 3500) — tempo após concluir
 */
export default function ActionFeedback({
  title,
  subtitle,
  steps = [],
  onClose,
  stepDelay = 650,
  autoClose = 3500,
}) {
  // 'running' | 'done' | 'skip' por id
  const [states, setStates] = useState({})
  const [finished, setFinished] = useState(false)
  const [visible, setVisible] = useState(false)

  // mount animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  // anima steps sequencialmente
  useEffect(() => {
    const active = steps.filter(s => !s.skip)
    const skipped = steps.filter(s => s.skip)

    // marca skipped imediatamente
    setStates(prev => {
      const next = { ...prev }
      skipped.forEach(s => { next[s.id] = 'skip' })
      return next
    })

    let i = 0
    function next() {
      if (i >= active.length) {
        setFinished(true)
        if (autoClose > 0) {
          setTimeout(() => {
            setVisible(false)
            setTimeout(onClose, 300)
          }, autoClose)
        }
        return
      }
      const step = active[i]
      setStates(prev => ({ ...prev, [step.id]: 'running' }))
      setTimeout(() => {
        setStates(prev => ({ ...prev, [step.id]: 'done' }))
        i++
        setTimeout(next, 120)
      }, stepDelay)
    }

    const start = setTimeout(next, 200)
    return () => clearTimeout(start)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const panel = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: 340,
    zIndex: 2100,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    boxShadow: '0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)',
    overflow: 'hidden',
    transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
    opacity: visible ? 1 : 0,
    transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease',
    fontFamily: 'var(--font)',
  }

  const allDone = steps.filter(s => !s.skip).every(s => states[s.id] === 'done')

  return (
    <div style={panel}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* indicador de progresso */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: finished ? '#D1FAE5' : 'var(--accent-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.4s',
          }}>
            {finished
              ? <span style={{ fontSize: 16 }}>✓</span>
              : <Spinner />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
        </div>
        {finished && (
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 16, padding: '0 2px',
            lineHeight: 1, flexShrink: 0, marginTop: 2,
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            ✕
          </button>
        )}
      </div>

      {/* Steps */}
      <div style={{ padding: '10px 0 4px' }}>
        {steps.map((step, idx) => {
          const st = states[step.id] || 'waiting'
          return (
            <div key={step.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '8px 16px',
              opacity: st === 'waiting' ? 0.35 : 1,
              transition: 'opacity 0.3s',
            }}>
              {/* connector line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <StepIcon status={st} icon={step.icon} />
                {idx < steps.length - 1 && (
                  <div style={{
                    width: 1.5, flex: 1, minHeight: 12,
                    background: st === 'done' ? '#10B981' : 'var(--border)',
                    marginTop: 4, transition: 'background 0.4s',
                  }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: idx < steps.length - 1 ? 8 : 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600,
                  color: st === 'skip' ? 'var(--text-muted)' : st === 'done' ? 'var(--text)' : 'var(--text-soft)',
                  textDecoration: st === 'skip' ? 'line-through' : 'none',
                  transition: 'color 0.3s',
                }}>
                  {step.label}
                </div>
                {step.sublabel && st !== 'waiting' && (
                  <div style={{
                    fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                    fontFamily: step.mono ? 'var(--mono)' : 'var(--font)',
                  }}>
                    {step.sublabel}
                  </div>
                )}
              </div>
              {/* status tag */}
              {st === 'running' && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
                  background: 'var(--accent-glow)', borderRadius: 20, padding: '2px 8px',
                  fontFamily: 'var(--mono)',
                }}>em curso</span>
              )}
              {st === 'skip' && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0,
                  background: 'var(--surface2)', borderRadius: 20, padding: '2px 8px',
                  fontFamily: 'var(--mono)',
                }}>ignorado</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {finished && (
        <div style={{
          padding: '10px 16px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {allDone ? 'Tudo concluído com sucesso.' : 'Concluído.'}
          </span>
          <button onClick={handleClose} style={{
            padding: '6px 14px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font)',
          }}>
            Fechar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Ícone animado por status ─────────────────────────────────────────────────
function StepIcon({ status, icon }) {
  if (status === 'done') {
    return (
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: '#D1FAE5', color: '#059669',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, flexShrink: 0,
        transition: 'background 0.3s',
      }}>✓</div>
    )
  }
  if (status === 'running') {
    return (
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'var(--accent-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Spinner size={11} />
      </div>
    )
  }
  if (status === 'skip') {
    return (
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'var(--surface2)', border: '1.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, color: 'var(--text-muted)', flexShrink: 0,
      }}>—</div>
    )
  }
  // waiting
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      border: '1.5px solid var(--border)', background: 'var(--surface2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: icon ? 10 : 8, color: 'var(--text-muted)', flexShrink: 0,
    }}>
      {icon || '·'}
    </div>
  )
}

// ─── Spinner CSS puro ─────────────────────────────────────────────────────────
const spinnerStyle = `
@keyframes af-spin { to { transform: rotate(360deg); } }
.af-spinner {
  border-radius: 50%;
  border-style: solid;
  border-color: var(--accent) var(--accent) transparent transparent;
  animation: af-spin 0.7s linear infinite;
}
`
if (typeof document !== 'undefined' && !document.getElementById('af-spinner-style')) {
  const el = document.createElement('style')
  el.id = 'af-spinner-style'
  el.textContent = spinnerStyle
  document.head.appendChild(el)
}

function Spinner({ size = 14 }) {
  return (
    <div className="af-spinner" style={{
      width: size, height: size,
      borderWidth: Math.max(1.5, size * 0.12),
    }} />
  )
}
