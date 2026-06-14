import { useState } from 'react'

export default function Input({
  label,
  hint,
  error,
  icon,             // ícone à esquerda (elemento React)
  as = 'input',     // 'input' | 'select' | 'textarea'
  style: extra = {},
  wrapStyle = {},
  ...props
}) {
  const [focused, setFocused] = useState(false)
  const Tag = as

  const fieldStyle = {
    ...s.field,
    ...(icon ? { paddingLeft: 34 } : {}),
    ...(focused ? s.fieldFocus : {}),
    ...(error  ? s.fieldError  : {}),
    ...(as === 'textarea' ? s.textarea : {}),
    ...extra,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...wrapStyle }}>
      {label && <label style={s.label}>{label}</label>}

      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={s.iconWrap}>{icon}</span>
        )}
        <Tag
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={fieldStyle}
          {...props}
        />
      </div>

      {hint  && !error && <span style={s.hint}>{hint}</span>}
      {error && <span style={s.error}>{error}</span>}
    </div>
  )
}

const s = {
  label: {
    fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)',
  },
  field: {
    height: 36, width: '100%', padding: '0 12px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
    background: 'var(--surface)', fontFamily: 'var(--font)',
    fontSize: 'var(--text-base)', color: 'var(--text)',
    outline: 'none', transition: 'border-color var(--transition), box-shadow var(--transition)',
    appearance: 'none',
  },
  fieldFocus: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px var(--accent-glow)',
  },
  fieldError: {
    borderColor: 'var(--danger)',
    boxShadow: '0 0 0 3px rgba(239,68,68,0.10)',
  },
  textarea: {
    height: 'auto', padding: '8px 12px', resize: 'vertical', lineHeight: 1.6,
  },
  iconWrap: {
    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none',
  },
  hint: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)' },
  error: { fontSize: 'var(--text-xs)', color: 'var(--danger)' },
}
