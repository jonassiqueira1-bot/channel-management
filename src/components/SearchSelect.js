import { useState, useEffect, useRef, useMemo } from 'react'

/**
 * SearchSelect — campo de pesquisa para dados pré-cadastrados.
 *
 * Props:
 *   options      [{id, label, sublabel?, avatar?, color?}]
 *   value        id selecionado (string|number|null)
 *   onChange     (id, label) => void
 *   placeholder  string (padrão: "Pesquisar…")
 *   allowClear   bool (padrão: true)
 *   maxResults   int  (padrão: 8)
 *   noResults    string (padrão: "Nenhum resultado")
 *   style        objeto de estilo extra no container
 *   inputStyle   objeto de estilo extra no input
 */
export default function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Pesquisar…',
  allowClear = true,
  maxResults = 8,
  noResults = 'Nenhum resultado',
  style,
  inputStyle,
}) {
  const selected = options.find(o => String(o.id) === String(value))
  const [query, setQuery] = useState(selected?.label || '')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  // sincroniza label externo (ex: quando o form reseta)
  useEffect(() => { setQuery(selected?.label || '') }, [selected?.label])

  // fecha ao clicar fora
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return options
      .filter(o => !q || o.label.toLowerCase().includes(q) || (o.sublabel || '').toLowerCase().includes(q))
      .slice(0, maxResults)
  }, [query, options, maxResults])

  function handleFocus() {
    setQuery('')
    setOpen(true)
  }

  function handleBlur() {
    // restore displayed label if user clicked away without selecting
    if (!open) setQuery(selected?.label || '')
  }

  function handleInput(e) {
    setQuery(e.target.value)
    setOpen(true)
    if (!e.target.value) onChange(null, '')
  }

  function handleSelect(opt) {
    onChange(opt.id, opt.label)
    setQuery(opt.label)
    setOpen(false)
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange(null, '')
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          placeholder={open ? 'Pesquisar…' : (placeholder)}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            width: '100%',
            height: 36,
            padding: '0 32px 0 10px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface2)',
            color: 'var(--text)',
            fontSize: 13,
            fontFamily: 'var(--font)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
            ...inputStyle,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
          onMouseLeave={e => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'var(--border)' }}
        />
        {/* ícone de limpar */}
        {allowClear && value && !open ? (
          <button
            type="button"
            onMouseDown={handleClear}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 12, padding: '2px 3px', lineHeight: 1,
              borderRadius: 3,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ✕
          </button>
        ) : (
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontSize: 10, pointerEvents: 'none', lineHeight: 1,
          }}>▾</span>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, zIndex: 500,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '14px 12px', fontSize: 13, color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              {noResults}
            </div>
          ) : (
            filtered.map(opt => (
              <button
                key={opt.id}
                type="button"
                onMouseDown={() => handleSelect(opt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 12px', border: 'none',
                  background: String(opt.id) === String(value) ? 'var(--surface2)' : 'transparent',
                  borderLeft: `3px solid ${String(opt.id) === String(value) ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (String(opt.id) !== String(value)) e.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={e => { if (String(opt.id) !== String(value)) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Avatar ou cor */}
                {(opt.avatar || opt.color) && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: opt.color ? `${opt.color}20` : '#EDE9FE',
                    color: opt.color || 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, fontFamily: 'var(--mono)',
                  }}>
                    {opt.avatar || opt.label.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {opt.label}
                  </div>
                  {opt.sublabel && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {opt.sublabel}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
