import { useState, useEffect, useRef, useMemo } from 'react'
import { useCompanies } from '../hooks/useCompanies'

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
  borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
  boxSizing: 'border-box',
}

const dropdownStyle = {
  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  zIndex: 200, overflow: 'hidden',
}

const optionStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '9px 12px', border: 'none',
  background: 'none', cursor: 'pointer', textAlign: 'left',
}

const avatarStyle = {
  width: 28, height: 28, borderRadius: 6,
  background: 'var(--accent-glow)', color: 'var(--accent)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', flexShrink: 0,
}

/**
 * EmpresaSearch — autocomplete que busca em useCompanies()
 *
 * Props:
 *   value      — id da empresa selecionada
 *   label      — nome exibido no input (fantasia/razao)
 *   onChange   — (id, nome) => void
 *   placeholder
 *   style      — override no container
 */
export default function EmpresaSearch({ value, label, onChange, placeholder = 'Buscar empresa…', style, companies: companiesProp }) {
  const [query, setQuery] = useState(label || '')
  const [open, setOpen]   = useState(false)
  const { companies: companiesHook } = useCompanies()
  const companies = companiesProp ?? companiesHook
  const ref               = useRef(null)

  useEffect(() => { setQuery(label || '') }, [label])

  useEffect(() => {
    function onClickOut(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    return companies
      .filter(e => {
        const nome = (e.fantasia || e.razao || '').toLowerCase()
        const cnpj = (e.cnpj || '').replace(/\D/g, '')
        return nome.includes(q) || cnpj.includes(q.replace(/\D/g, ''))
      })
      .slice(0, 8)
  }, [query, companies])

  function getNome(e) { return e.fantasia || e.razao || '' }

  function handleSelect(e) {
    onChange(e.id, getNome(e))
    setQuery(getNome(e))
    setOpen(false)
  }

  function handleClear() {
    onChange(null, '')
    setQuery('')
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          style={{ ...inputStyle, paddingRight: value ? 28 : 12 }}
          placeholder={placeholder}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange(null, '')
          }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button type="button" onClick={handleClear} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1,
          }}>✕</button>
        )}
      </div>
      {open && opts.length > 0 && (
        <div style={dropdownStyle}>
          {opts.map(e => (
            <button
              type="button"
              key={e.id}
              style={optionStyle}
              onMouseEnter={ev => ev.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={ev => ev.currentTarget.style.background = 'none'}
              onMouseDown={() => handleSelect(e)}
            >
              <span style={avatarStyle}>{getNome(e).slice(0, 2).toUpperCase()}</span>
              <span>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{getNome(e)}</div>
                {e.cnpj && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{e.cnpj}</div>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
