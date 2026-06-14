import { useState } from 'react'

export default function Button({
  children,
  variant = 'primary',   // 'primary' | 'secondary' | 'ghost' | 'danger'
  size    = 'md',        // 'sm' | 'md' | 'lg'
  icon    = null,        // elemento React (ex: <Plus size={14} />)
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  style: extraStyle = {},
  ...props
}) {
  const [hovered, setHovered] = useState(false)

  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, fontFamily: 'var(--font)', fontWeight: 500, lineHeight: 1,
    borderRadius: 'var(--radius-md)', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none', outline: 'none', whiteSpace: 'nowrap',
    opacity: disabled || loading ? 0.55 : 1,
    transition: 'background var(--transition), box-shadow var(--transition)',
    ...sizes[size],
  }

  const variantStyle = hovered && !disabled && !loading
    ? variantsHover[variant]
    : variants[variant]

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...variantStyle, ...extraStyle }}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

const sizes = {
  sm: { height: 28, padding: '0 10px', fontSize: 'var(--text-sm)' },
  md: { height: 32, padding: '0 14px', fontSize: 'var(--text-base)' },
  lg: { height: 38, padding: '0 18px', fontSize: 'var(--text-md)' },
}

const variants = {
  primary:   { background: 'var(--accent)',    color: '#fff',              border: 'none' },
  secondary: { background: 'var(--surface)',   color: 'var(--text)',       border: '1px solid var(--border)' },
  ghost:     { background: 'transparent',      color: 'var(--text-sec)',   border: '1px solid transparent' },
  danger:    { background: 'var(--danger-bg)', color: 'var(--danger)',     border: '1px solid #FECACA' },
}

const variantsHover = {
  primary:   { background: 'var(--accent2)',   color: '#fff',              border: 'none' },
  secondary: { background: 'var(--surface2)',  color: 'var(--text)',       border: '1px solid var(--border-med)' },
  ghost:     { background: 'var(--surface2)',  color: 'var(--text)',       border: '1px solid transparent' },
  danger:    { background: '#FEE2E2',          color: 'var(--danger)',     border: '1px solid #FECACA' },
}
