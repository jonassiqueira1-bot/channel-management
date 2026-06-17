// src/components/ui/SearchField.js
// Campo de busca para filtrar listas — com atalho Ctrl+K / ⌘K.
//
// Props:
//   value         string
//   onChange      (v: string) => void
//   placeholder   string
//   width         number | string (default: 260)
//   shortcut      bool (default: true) — exibe badge ⌘K e registra listener global

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchField({
  value       = '',
  onChange,
  placeholder = 'Buscar…',
  width       = 260,
  shortcut    = true,
  style: extra = {},
}) {
  const [focused, setFocused] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!shortcut) return
    function handle(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [shortcut])

  return (
    <div style={{ position: 'relative', width, ...extra }}>
      <Search
        size={13}
        style={{
          position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      />

      <input
        ref={ref}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', height: 32, lineHeight: 'normal',
          padding: value ? '0 32px 0 30px' : '0 52px 0 30px',
          border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: focused ? '0 0 0 3px var(--accent-glow)' : 'none',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface2)',
          fontFamily: 'var(--font)', fontSize: 'var(--text-sm)',
          color: 'var(--text)', outline: 'none',
          transition: 'border-color var(--transition), box-shadow var(--transition)',
        }}
      />

      {/* Badge ⌘K ou botão limpar */}
      {value ? (
        <button
          type="button"
          onClick={() => { onChange?.(''); ref.current?.focus() }}
          style={{
            position: 'absolute', right: 8, top: '50%',
            transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            padding: 2, borderRadius: 3,
          }}
        >
          <X size={12} />
        </button>
      ) : shortcut ? (
        <kbd style={{
          position: 'absolute', right: 8, top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 10, color: 'var(--text-muted)',
          background: 'var(--surface3)', borderRadius: 3,
          padding: '1px 5px', border: '1px solid var(--border)',
          fontFamily: 'var(--mono)', pointerEvents: 'none',
        }}>
          ⌘K
        </kbd>
      ) : null}
    </div>
  )
}
