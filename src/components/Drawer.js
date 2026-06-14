// src/components/Drawer.js
// ─────────────────────────────────────────────────────────────────────────────
// Drawer lateral expansível com 3 tamanhos: compacto (480px) → padrão (720px)
// → tela cheia. Botões de expandir, editar e fechar no canto superior direito.
//
// Uso básico:
//   <Drawer
//     open={open}
//     onClose={() => setOpen(false)}
//     title="Empresa ABC Ltda"
//     subtitle="CNPJ 12.345.678/0001-99"
//     initials="AB"
//     onEdit={() => setEditing(true)}
//     footer={
//       <>
//         <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
//         <Button onClick={salvar}>Salvar</Button>
//       </>
//     }
//   >
//     <DrawerSection icon={<Phone size={13} />} label="Contato">
//       <DrawerField label="E-mail" value={empresa.email} />
//       <DrawerField label="Telefone" value={empresa.telefone} />
//     </DrawerSection>
//   </Drawer>
//
// Modo edição inline (campo vira input ao editar):
//   <DrawerField
//     label="E-mail"
//     value={empresa.email}
//     editing={editing}
//     onChange={e => setEmpresa({ ...empresa, email: e.target.value })}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { X, Maximize2, Minimize2, Pencil } from 'lucide-react'

// ── Tamanhos do drawer ────────────────────────────────────────────────────────
const SIZES = {
  compact:  480,
  default:  720,
  fullscreen: '100%',
}
const SIZE_ORDER = ['compact', 'default', 'fullscreen']

// ── Drawer principal ──────────────────────────────────────────────────────────
export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  initials,           // 2 letras para o avatar — ex: "AB"
  onEdit,             // callback ao clicar no botão Editar (opcional)
  footer,             // elementos React para o rodapé (botões)
  initialSize = 'default',
  bodyStyle = {},     // overrides para o estilo do body (ex: { padding: 0 })
  children,
}) {
  const [sizeIdx, setSizeIdx] = useState(SIZE_ORDER.indexOf(initialSize))
  const isFullscreen = SIZE_ORDER[sizeIdx] === 'fullscreen'

  // Fecha com Escape
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Reset do tamanho ao fechar
  useEffect(() => {
    if (!open) setSizeIdx(SIZE_ORDER.indexOf(initialSize))
  }, [open, initialSize])

  const cycleSize = useCallback(() => {
    setSizeIdx(i => (i + 1) % SIZE_ORDER.length)
  }, [])

  if (!open) return null

  const width = SIZES[SIZE_ORDER[sizeIdx]]

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={s.overlay}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          ...s.drawer,
          width,
          ...(isFullscreen ? s.drawerFullscreen : {}),
        }}
      >
        {/* ── Header ── */}
        <header style={s.header}>
          <div style={s.headerLeft}>
            {initials && (
              <div style={s.avatar} aria-hidden="true">
                {initials.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p style={s.title}>{title}</p>
              {subtitle && <p style={s.subtitle}>{subtitle}</p>}
            </div>
          </div>

          <div style={s.headerActions}>
            {/* Expandir / recolher */}
            <IconBtn
              onClick={cycleSize}
              title={isFullscreen ? 'Recolher' : 'Expandir'}
              accent
            >
              {isFullscreen
                ? <Minimize2 size={13} strokeWidth={2} />
                : <Maximize2 size={13} strokeWidth={2} />
              }
            </IconBtn>

            {/* Editar (opcional) */}
            {onEdit && (
              <IconBtn onClick={onEdit} title="Editar">
                <Pencil size={13} strokeWidth={2} />
              </IconBtn>
            )}

            {/* Fechar */}
            <IconBtn onClick={onClose} title="Fechar">
              <X size={13} strokeWidth={2} />
            </IconBtn>
          </div>
        </header>

        {/* ── Corpo ── */}
        <div style={{ ...s.body, ...bodyStyle }}>
          {children}
        </div>

        {/* ── Footer (opcional) ── */}
        {footer && (
          <footer style={s.footer}>
            {footer}
          </footer>
        )}
      </aside>
    </>
  )
}

// ── DrawerSection — agrupa campos numa seção com card ─────────────────────────
export function DrawerSection({ icon, label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={s.section}>
      <button style={s.sectionHeader} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon && (
            <span style={{ color: 'var(--text-muted)', display: 'flex' }} aria-hidden="true">
              {icon}
            </span>
          )}
          <span style={s.sectionLabel}>{label}</span>
        </div>
        <span style={{
          fontSize: 12, color: 'var(--text-muted)',
          transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform var(--transition)',
          display: 'inline-block',
        }}>›</span>
      </button>

      {open && <div>{children}</div>}
    </div>
  )
}

// ── DrawerField — linha de label + valor (ou input no modo edição) ────────────
export function DrawerField({
  label,
  value,
  editing   = false,
  onChange,
  type      = 'text',
  placeholder,
  hint,
  as        = 'input',   // 'input' | 'select' | 'textarea'
  children,              // opções do select
  link      = false,     // transforma o valor em link clicável
  empty     = '—',       // texto quando value está vazio
}) {
  const [focused, setFocused] = useState(false)
  const Tag = as

  const isEmpty = value === null || value === undefined || value === ''

  return (
    <div style={s.field}>
      <span style={s.fieldLabel}>{label}</span>

      {editing ? (
        <div style={{ flex: 1 }}>
          <Tag
            type={type}
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder ?? label}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              ...s.fieldInput,
              ...(focused ? s.fieldInputFocus : {}),
              ...(as === 'textarea' ? { height: 'auto', padding: '7px 10px', resize: 'vertical' } : {}),
            }}
          >
            {children}
          </Tag>
          {hint && <p style={s.fieldHint}>{hint}</p>}
        </div>
      ) : (
        <span style={{
          ...s.fieldValue,
          ...(isEmpty ? s.fieldEmpty : {}),
          ...(link && !isEmpty ? s.fieldLink : {}),
        }}>
          {isEmpty ? empty : value}
        </span>
      )}
    </div>
  )
}

// ── IconBtn — botão de ícone do header ────────────────────────────────────────
function IconBtn({ children, onClick, title, accent = false }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.iconBtn,
        ...(accent ? s.iconBtnAccent : {}),
        ...(hovered && !accent ? s.iconBtnHover : {}),
      }}
    >
      {children}
    </button>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.25)',
    zIndex: 200,
  },
  drawer: {
    position: 'fixed', top: 0, right: 0, bottom: 0,
    background: 'var(--bg)',
    borderLeft: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    zIndex: 201,
    transition: 'width 0.22s ease',
    overflow: 'hidden',
  },
  drawerFullscreen: {
    left: 0, borderLeft: 'none',
  },

  // Header
  header: {
    height: 52, flexShrink: 0,
    padding: '0 16px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: {
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    background: 'var(--accent-lite)', border: '1px solid var(--accent-mid)',
    color: 'var(--accent)', fontSize: 10, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--mono)',
  },
  title: {
    fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text)',
    letterSpacing: '-0.2px', margin: 0,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  subtitle: {
    fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, marginTop: 1,
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },

  // Icon buttons
  iconBtn: {
    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
    border: '0.5px solid var(--border)', background: 'var(--surface)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-sec)',
    transition: 'background var(--transition)',
  },
  iconBtnHover: { background: 'var(--surface2)' },
  iconBtnAccent: {
    color: 'var(--accent)', borderColor: 'var(--accent-mid)',
    background: 'var(--accent-lite)',
  },

  // Body
  body: {
    flex: 1, overflowY: 'auto', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },

  // Section (card agrupador)
  section: {
    background: 'var(--surface)',
    border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  sectionHeader: {
    width: '100%', padding: '9px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'none', border: 'none', cursor: 'pointer',
    borderBottom: '0.5px solid var(--border)',
    fontFamily: 'var(--font)',
  },
  sectionLabel: {
    fontSize: 'var(--text-xs)', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    color: 'var(--text-sec)',
  },

  // Field (linha label + valor)
  field: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '8px 14px', borderBottom: '0.5px solid var(--surface2)',
  },
  fieldLabel: {
    fontSize: 'var(--text-sm)', color: 'var(--text-muted)',
    width: 100, flexShrink: 0, paddingTop: 1, lineHeight: 1.5,
  },
  fieldValue: {
    fontSize: 'var(--text-base)', color: 'var(--text)',
    flex: 1, lineHeight: 1.5, wordBreak: 'break-word',
  },
  fieldEmpty: { color: '#C8C6C0' },
  fieldLink: { color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' },

  // Field input (modo edição)
  fieldInput: {
    width: '100%', height: 32, padding: '0 10px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
    background: 'var(--surface)', fontFamily: 'var(--font)',
    fontSize: 'var(--text-base)', color: 'var(--text)',
    outline: 'none',
    transition: 'border-color var(--transition), box-shadow var(--transition)',
  },
  fieldInputFocus: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px rgba(79,70,229,0.12)',
  },
  fieldHint: {
    fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, margin: 0,
  },

  // Footer
  footer: {
    height: 52, flexShrink: 0,
    padding: '0 16px',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'flex-end', gap: 8,
  },
}
