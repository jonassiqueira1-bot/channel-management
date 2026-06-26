// src/components/ui/FullPageEdit.js
// ─────────────────────────────────────────────────────────────────────────────
// Tela de edição full-page para CRUDs complexos.
// Substitui o padrão de modal centralizado em configurações e cadastros longos.
//
// Props:
//   breadcrumb    {label: string, onClick?: () => void}[]
//                   ex: [{label:'Configurações'},{label:'Usuários',onClick:goBack},{label:'Jonas'}]
//   title         string          — nome da entidade sendo editada
//   subtitle      string          — ex: 'Editando usuário' | 'Novo cadastro'
//   badge         ReactNode       — slot opcional ao lado do título (ex: <Badge status="Ativo" />)
//
//   onSave        () => void
//   onCancel      () => void
//   onDelete      () => void      — se omitido, botão Excluir não aparece
//   saving        bool
//   deleting      bool
//   saveLabel     string          (default: 'Salvar alterações')
//   cancelLabel   string          (default: 'Cancelar')
//   deleteLabel   string          (default: 'Excluir')
//
//   columns       1 | 2 | 'auto' — colunas do grid principal (default: 2)
//   children      ReactNode       — campos do formulário (use <FPESection> internamente)
//   aside         ReactNode       — painel lateral direito (perfil, stats, avatar, etc.)
//   loading       bool            — skeleton state
//
// Componentes auxiliares exportados:
//   FPESection    — agrupa campos com título de seção horizontal
//   FPEField      — campo com label, hint e erro (reutiliza classes .so-field)
//   FPEGrid       — sub-grid N colunas dentro de uma seção
//   FPESeparator  — linha divisória leve entre seções
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { ChevronRight, Trash2, Loader2 } from 'lucide-react'

// ── paleta zinc isolada ───────────────────────────────────────────────────────
const Z = {
  white:    '#FFFFFF',
  50:       '#FAFAFA',
  100:      '#F4F4F5',
  200:      '#E4E4E7',
  300:      '#D4D4D8',
  400:      '#A1A1AA',
  500:      '#71717A',
  700:      '#3F3F46',
  900:      '#18181B',
  blue:     '#1E3A5F',
  blueHov:  '#2E5090',
  blueLite: 'rgba(30,58,95,0.07)',
  blueFocus:'rgba(59,130,246,0.18)',
  blueBc:   '#3B82F6',
  danger:   '#DC2626',
  dangerBg: '#FEF2F2',
  dangerHov:'#B91C1C',
}

// ── CSS de campos (idêntico ao SlideOver para consistência de UX) ─────────────
const FIELD_STYLES = `
  .fpe-field {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid ${Z[300]};
    border-radius: 6px;
    background: ${Z.white};
    font-family: var(--font, 'Inter', sans-serif);
    font-size: 13px;
    color: ${Z[900]};
    outline: none;
    line-height: normal;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
    appearance: none;
  }
  .fpe-field:focus {
    border-color: ${Z.blueBc};
    box-shadow: 0 0 0 3px ${Z.blueFocus};
  }
  .fpe-field:disabled {
    background: ${Z[100]};
    color: ${Z[400]};
    cursor: not-allowed;
    border-color: ${Z[200]};
  }
  textarea.fpe-field {
    height: auto;
    min-height: 88px;
    padding: 8px 10px;
    resize: vertical;
    line-height: 1.55;
  }
  select.fpe-field {
    padding-right: 28px;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23A1A1AA' d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 14px;
  }
  .fpe-label {
    font-size: 12px;
    font-weight: 500;
    color: ${Z[500]};
    margin-bottom: 5px;
    display: block;
    font-family: var(--font, 'Inter', sans-serif);
    letter-spacing: 0.01em;
  }
  .fpe-hint  { font-size: 11px; color: ${Z[400]}; margin-top: 4px; line-height: 1.4; }
  .fpe-error { font-size: 11px; color: ${Z.danger}; margin-top: 4px; }
  .fpe-wrap  { display: flex; flex-direction: column; }
`

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
const SKELETON_CSS = `
  @keyframes fpe-shimmer {
    0%   { background-position: -600px 0 }
    100% { background-position:  600px 0 }
  }
  .fpe-skel {
    border-radius: 5px;
    background: linear-gradient(90deg, ${Z[100]} 25%, ${Z[200]} 50%, ${Z[100]} 75%);
    background-size: 600px 100%;
    animation: fpe-shimmer 1.4s infinite;
  }
`

function Skeleton({ w = '100%', h = 14, style: extra = {} }) {
  return <div className="fpe-skel" style={{ width: w, height: h, ...extra }} />
}

// ─────────────────────────────────────────────────────────────────────────────
// FullPageEdit — componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function FullPageEdit({
  breadcrumb    = [],
  title         = 'Editar',
  subtitle,
  badge,

  onSave,
  onCancel,
  onDelete,
  saving        = false,
  deleting      = false,
  saveLabel     = 'Salvar alterações',
  cancelLabel   = 'Cancelar',
  deleteLabel   = 'Excluir',

  columns       = 2,
  children,
  aside,
  loading       = false,
  contentMaxWidth = 1120,
}) {
  // Escape → cancelar
  useEffect(() => {
    function h(e) { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  const gridCols =
    columns === 'auto' ? 'repeat(auto-fit, minmax(220px, 1fr))' :
    columns === 2      ? '1fr 1fr' :
    '1fr'

  const hasAside = !!aside

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: Z[50],
      fontFamily: 'var(--font, "Inter", sans-serif)',
    }}>
      <style>{FIELD_STYLES + SKELETON_CSS}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        background: Z.white,
        borderBottom: `1px solid ${Z[200]}`,
        padding: '14px 32px',
      }}>

        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <nav aria-label="Localização" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            marginBottom: 10,
          }}>
            {breadcrumb.map((crumb, i) => {
              const isLast = i === breadcrumb.length - 1
              return (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <ChevronRight size={13} color={Z[300]} />}
                  {isLast ? (
                    <span style={{
                      fontSize: 12, color: Z[700], fontWeight: 500,
                    }}>
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={crumb.onClick}
                      style={{
                        fontSize: 12, color: Z[400], fontWeight: 400,
                        background: 'none', border: 'none', cursor: crumb.onClick ? 'pointer' : 'default',
                        padding: 0, fontFamily: 'inherit',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={e => { if (crumb.onClick) e.currentTarget.style.color = Z[700] }}
                      onMouseLeave={e => e.currentTarget.style.color = Z[400]}
                    >
                      {crumb.label}
                    </button>
                  )}
                </span>
              )
            })}
          </nav>
        )}

        {/* Título + ações top-right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{
                  margin: 0, fontSize: 18, fontWeight: 600,
                  color: Z[900], letterSpacing: '-0.2px', lineHeight: 1.3,
                }}>
                  {loading ? <Skeleton w={180} h={18} /> : title}
                </h1>
                {badge && !loading && badge}
              </div>
              {subtitle && !loading && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: Z[400] }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Ações — top right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting || saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 34, padding: '0 12px', borderRadius: 6,
                  border: `1px solid ${Z[200]}`, background: Z.white,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                  color: Z.danger, cursor: 'pointer',
                  opacity: deleting || saving ? 0.55 : 1,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = Z.dangerBg; e.currentTarget.style.borderColor = Z.danger }}
                onMouseLeave={e => { e.currentTarget.style.background = Z.white; e.currentTarget.style.borderColor = Z[200] }}
              >
                {deleting
                  ? <Loader2 size={13} style={{ animation: 'fpe-spin .8s linear infinite' }} />
                  : <Trash2 size={13} />}
                {deleteLabel}
              </button>
            )}

            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              style={{
                height: 34, padding: '0 14px', borderRadius: 6,
                border: `1px solid ${Z[200]}`, background: Z.white,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                color: Z[700], cursor: 'pointer',
                opacity: saving ? 0.55 : 1,
              }}
              onMouseEnter={e => e.currentTarget.style.background = Z[50]}
              onMouseLeave={e => e.currentTarget.style.background = Z.white}
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving || deleting}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                height: 34, padding: '0 18px', borderRadius: 6,
                border: 'none', background: Z.blue, color: Z.white,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                opacity: saving || deleting ? 0.65 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!saving && !deleting) e.currentTarget.style.background = Z.blueHov }}
              onMouseLeave={e => e.currentTarget.style.background = Z.blue}
            >
              {saving && <Loader2 size={13} style={{ animation: 'fpe-spin .8s linear infinite' }} />}
              {saveLabel}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body scrollável ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '28px 32px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasAside ? '1fr 300px' : '1fr',
          gap: 24,
          alignItems: 'start',
          width: '100%',
          maxWidth: contentMaxWidth === Infinity ? 'none' : contentMaxWidth,
        }}>

          {/* Formulário principal */}
          <div style={{
            background: Z.white,
            border: `1px solid ${Z[200]}`,
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {loading ? (
              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {[1,2,3].map(s => (
                  <div key={s}>
                    <Skeleton w={100} h={11} style={{ marginBottom: 16 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                      {[1,2,3,4].map(f => (
                        <div key={f}>
                          <Skeleton w={80} h={10} style={{ marginBottom: 7 }} />
                          <Skeleton w="100%" h={36} style={{ borderRadius: 6 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '24px 28px',
                display: 'flex', flexDirection: 'column', gap: 0,
              }}>
                {/* Conteúdo — children podem ser <FPESection> ou campos diretos */}
                {children ? children : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    gap: '14px 20px',
                    alignItems: 'start',
                  }}>
                    {/* fallback vazio */}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Painel lateral (avatar, stats, histórico, etc.) */}
          {hasAside && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              {aside}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes fpe-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FPESection — agrupa campos com título de seção
// ─────────────────────────────────────────────────────────────────────────────
export function FPESection({
  title,
  label,
  description,
  columns = 2,
  children,
  style: extra = {},
  noBorder = false,
}) {
  const heading = title || label
  const gridCols =
    columns === 'auto' ? 'repeat(auto-fit, minmax(200px, 1fr))' :
    `repeat(${columns}, 1fr)`

  return (
    <div style={{
      paddingTop: 20, paddingBottom: 24,
      borderTop: noBorder ? 'none' : `1px solid ${Z[100]}`,
      ...extra,
    }}>
      {(heading || description) && (
        <div style={{ marginBottom: 16 }}>
          {heading && (
            <p style={{
              margin: 0, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.07em',
              color: Z[400],
            }}>
              {heading}
            </p>
          )}
          {description && (
            <p style={{
              margin: '3px 0 0', fontSize: 12, color: Z[400],
              lineHeight: 1.5,
            }}>
              {description}
            </p>
          )}
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: '14px 20px',
        alignItems: 'start',
      }}>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FPEField — campo com label, hint e erro
// ─────────────────────────────────────────────────────────────────────────────
export function FPEField({
  label,
  required = false,
  hint,
  error,
  span = 1,
  children,
  // shorthand para <input> / <select> / <textarea>
  as,
  ...inputProps
}) {
  const Tag = as

  return (
    <div className="fpe-wrap" style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}>
      {label && (
        <label className="fpe-label">
          {label}
          {required && <span style={{ color: Z.danger, marginLeft: 3 }}>*</span>}
        </label>
      )}
      {as ? (
        <Tag className="fpe-field" {...inputProps} />
      ) : (
        children
      )}
      {!error && hint && <span className="fpe-hint">{hint}</span>}
      {error         && <span className="fpe-error">{error}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FPEGrid — sub-grade N colunas dentro de uma seção
// ─────────────────────────────────────────────────────────────────────────────
export function FPEGrid({ cols = 2, gap = '14px 20px', span, children, style: extra = {} }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap,
      alignItems: 'start',
      gridColumn: span ? `span ${span}` : '1 / -1',
      ...extra,
    }}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FPESeparator — linha divisória leve
// ─────────────────────────────────────────────────────────────────────────────
export function FPESeparator({ style: extra = {} }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      height: 1,
      background: Z[100],
      margin: '6px 0',
      ...extra,
    }} />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AsideCard — card para o painel lateral
// ─────────────────────────────────────────────────────────────────────────────
export function AsideCard({ title, children, style: extra = {} }) {
  return (
    <div style={{
      background: Z.white,
      border: `1px solid ${Z[200]}`,
      borderRadius: 8,
      overflow: 'hidden',
      ...extra,
    }}>
      {title && (
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${Z[100]}`,
          fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.07em',
          color: Z[400],
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        {children}
      </div>
    </div>
  )
}
