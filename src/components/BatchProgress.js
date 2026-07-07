import { useState, useEffect, useRef } from 'react'

/**
 * BatchProgress — painel de progresso para operações em grande volume.
 *
 * Props:
 *   title       string              — ex: "Processando pagamentos"
 *   operations  [{id, label, total, done?, error?}]
 *               Cada operação é uma etapa grande (não linha individual).
 *               done = número de itens concluídos nessa etapa.
 *               total = total de itens da etapa.
 *   onClose     () => void
 *   autoClose   number (ms, 0 = não fecha; default 0 pois lote requer atenção)
 */
export default function BatchProgress({ title, operations = [], onClose, autoClose = 0 }) {
  const [visible, setVisible] = useState(false)
  const closedRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const allDone = operations.every(op => op.done >= op.total && op.total > 0)
  const hasErrors = operations.some(op => op.error)

  useEffect(() => {
    if (allDone && autoClose > 0 && !closedRef.current) {
      closedRef.current = true
      const t = setTimeout(() => {
        setVisible(false)
        setTimeout(onClose, 300)
      }, autoClose)
      return () => clearTimeout(t)
    }
  }, [allDone, autoClose, onClose])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const totalItens = operations.reduce((s, op) => s + (op.total || 0), 0)
  const doneItens  = operations.reduce((s, op) => s + Math.min(op.done || 0, op.total || 0), 0)
  const pctGlobal  = totalItens > 0 ? Math.round((doneItens / totalItens) * 100) : 0

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, width: 360, zIndex: 2100,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)',
      overflow: 'hidden', fontFamily: 'var(--font)',
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease',
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px 12px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: hasErrors ? '#FEF3C7' : allDone ? '#D1FAE5' : 'var(--accent-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.4s',
          }}>
            {allDone
              ? <span style={{ fontSize: 16 }}>{hasErrors ? '⚠' : '✓'}</span>
              : <Spinner />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontFamily: 'var(--mono)' }}>
              {doneItens} / {totalItens} itens · {pctGlobal}%
            </div>
          </div>
        </div>
        {(allDone) && (
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 16, padding: '0 2px', lineHeight: 1,
          }}>✕</button>
        )}
      </div>

      {/* Barra global */}
      <div style={{ height: 4, background: 'var(--border)' }}>
        <div style={{
          height: '100%', background: hasErrors ? '#F59E0B' : 'var(--accent)',
          width: `${pctGlobal}%`, transition: 'width 0.35s ease',
        }} />
      </div>

      {/* Operações */}
      <div style={{ padding: '10px 16px 6px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {operations.map(op => {
          const pct   = op.total > 0 ? Math.round((Math.min(op.done || 0, op.total) / op.total) * 100) : 0
          const done  = op.done >= op.total && op.total > 0
          const running = !done && (op.done || 0) > 0

          return (
            <div key={op.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    background: op.error ? '#FEE2E2' : done ? '#D1FAE5' : running ? 'var(--accent-glow)' : 'var(--surface2)',
                    border: `1.5px solid ${op.error ? '#EF4444' : done ? '#10B981' : running ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9,
                  }}>
                    {op.error ? '!' : done ? '✓' : running ? '' : '·'}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: done ? 600 : 500,
                    color: op.error ? '#EF4444' : done ? 'var(--text)' : running ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                    {op.label}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                  {op.error ? op.error : `${op.done || 0}/${op.total}`}
                </span>
              </div>
              {/* barra individual */}
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginLeft: 23 }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: op.error ? '#F59E0B' : done ? '#10B981' : 'var(--accent)',
                  width: `${pct}%`, transition: 'width 0.35s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {allDone && (
        <div style={{
          padding: '10px 16px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: hasErrors ? '#92400E' : 'var(--text-muted)' }}>
            {hasErrors ? 'Concluído com avisos.' : 'Tudo concluído com sucesso.'}
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

const spinnerStyle = `
@keyframes bp-spin { to { transform: rotate(360deg); } }
.bp-spinner {
  border-radius: 50%;
  border-style: solid;
  border-color: var(--accent) var(--accent) transparent transparent;
  animation: bp-spin 0.7s linear infinite;
}
`
if (typeof document !== 'undefined' && !document.getElementById('bp-spinner-style')) {
  const el = document.createElement('style')
  el.id = 'bp-spinner-style'
  el.textContent = spinnerStyle
  document.head.appendChild(el)
}

function Spinner({ size = 14 }) {
  return <div className="bp-spinner" style={{ width: size, height: size, borderWidth: Math.max(1.5, size * 0.12) }} />
}
