// src/components/ui/BackButton.js
// Botão de navegação de retorno, estilo ghost com seta.
// Uso: <BackButton onClick={() => navigate(-1)} /> ou com label customizado.

import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

export default function BackButton({
  label   = 'Voltar',
  onClick,
  to,
  style: extra = {},
}) {
  const navigate  = useNavigate()
  const [hov, setHov] = useState(false)

  function handleClick() {
    if (onClick) { onClick(); return }
    if (to)      { navigate(to); return }
    navigate(-1)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        height: 30, padding: '0 10px', borderRadius: 'var(--radius-md)',
        border: '1px solid transparent',
        background: hov ? 'var(--surface2)' : 'transparent',
        fontFamily: 'var(--font)', fontSize: 'var(--text-sm)',
        color: hov ? 'var(--text)' : 'var(--text-muted)',
        cursor: 'pointer', transition: 'all var(--transition)',
        ...extra,
      }}
    >
      <ArrowLeft size={13} />
      {label}
    </button>
  )
}
