// src/components/ui/SlideOver.js
// ─────────────────────────────────────────────────────────────────────────────
// Painel lateral de edição/criação.
// Diferença do Drawer: foco em formulários, sem modo "visualização".
//
// Props:
//   open            bool
//   onClose         () => void
//   onSave          () => void          — chamado pelo botão Salvar
//   title           string
//   subtitle        string              — ex: "Novo registro" | "Editando Empresa"
//   initialSize     'compact'|'default'|'fullscreen'  (default: 'default')
//   saving          bool                — mostra spinner no botão Salvar
//   saveLabel       string              — default: 'Salvar'
//   cancelLabel     string              — default: 'Cancelar'
//   columns         1 | 2 | 'auto'     — grade interna do formulário (default: 'auto')
//   children        ReactNode           — campos do formulário
//   extra           ReactNode           — slot opcional abaixo do form (ex: histórico)
//   tabs            [{key, label, badge?}]  — se fornecido, renderiza tab bar
//   activeTab       string              — tab ativa (controlado)
//   onTabChange     (key) => void
//   headerExtra     ReactNode           — renderizado abaixo do subtitle no header
//   headerActions   ReactNode           — renderizado antes dos botões expand/close
//   defaultWidth    number              — sobrescreve a largura do tamanho 'default' (padrão: 680)
//   rightPanel      ReactNode           — painel fixo à direita (2ª coluna)
//   rightPanelOpen  bool                — visibilidade do rightPanel
//
// Tamanhos (ciclam com o botão expand no header):
//   compact     → 480 px
//   default     → 680 px (ou defaultWidth)
//   fullscreen  → 100 vw (tela cheia)
//
// Regras visuais dos campos dentro do SlideOver:
//   — container usa branco puro (#FFFFFF)
//   — inputs usam bg cinza-claro (#F8FAFC) + borda visível (#CBD5E1) + foco azul BoostLy
//   — use a prop `columns` ou o utilitário <FormGrid cols={2}> para 2 colunas
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { X, Maximize2, Minimize2 }          from 'lucide-react'
import Button                               from '../Button'

// ── tamanhos ──────────────────────────────────────────────────────────────────
const BASE_SIZES  = { compact: 480, default: 680, fullscreen: '100%' }
const SIZE_ORDER  = ['compact', 'default', 'fullscreen']

// ── tokens internos ───────────────────────────────────────────────────────────
const SO_BG         = '#FFFFFF'
const SO_INPUT_BG   = '#F8FAFC'
const SO_BORDER     = '#CBD5E1'
const SO_FOCUS_RING = '0 0 0 3px rgba(37,99,235,0.15)'
const SO_FOCUS_BC   = '#2563EB'

// ── SlideOver ─────────────────────────────────────────────────────────────────
export default function SlideOver({
  open,
  onClose,
  onSave,
  title        = 'Editar',
  subtitle,
  initialSize  = 'default',
  saving       = false,
  saveLabel    = 'Salvar',
  cancelLabel  = 'Cancelar',
  columns      = 'auto',
  children,
  extra,
  // new props
  tabs,
  activeTab,
  onTabChange,
  headerExtra,
  headerActions,
  defaultWidth,
  rightPanel,
  rightPanelOpen = false,
  showFooter     = true,
}) {
  const [sizeIdx, setSizeIdx] = useState(() => SIZE_ORDER.indexOf(initialSize))
  const isFullscreen = SIZE_ORDER[sizeIdx] === 'fullscreen'

  const cycleSize = useCallback(() => {
    setSizeIdx(i => (i + 1) % SIZE_ORDER.length)
  }, [])

  const SIZES = defaultWidth
    ? { ...BASE_SIZES, default: defaultWidth }
    : BASE_SIZES

  const currentWidth = SIZES[SIZE_ORDER[sizeIdx]]

  // fecha com Escape
  useEffect(() => {
    if (!open) return
    function handle(e) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])

  // bloqueia scroll do body enquanto aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const hasTabs = tabs && tabs.length > 0

  const gridCols =
    columns === 'auto'  ? 'repeat(auto-fit, minmax(200px, 1fr))' :
    columns === 2       ? '1fr 1fr' :
    '1fr'

  return (
    <>
      {/* Overlay — tela cheia não tem overlay escuro */}
      {!isFullscreen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.25)',
            animation: 'soFadeIn 0.18s ease',
          }}
        />
      )}

      {/* Painel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed', inset: '0 0 0 auto', zIndex: 201,
          width: currentWidth, maxWidth: '100vw',
          display: 'flex', flexDirection: 'column',
          background: SO_BG,
          boxShadow: isFullscreen ? 'none' : '-8px 0 40px rgba(0,0,0,0.12)',
          borderLeft: isFullscreen ? '1px solid var(--border)' : 'none',
          transition: 'width 0.22s cubic-bezier(0.32,0.72,0,1)',
          animation: 'soSlideIn 0.22s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <style>{`
          @keyframes soFadeIn   { from { opacity: 0 } to { opacity: 1 } }
          @keyframes soSlideIn  { from { transform: translateX(100%) } to { transform: translateX(0) } }

          /* ─── Inputs dentro do SlideOver ─────────────────────────── */
          .so-field {
            width: 100%;
            height: 36px;
            padding: 0 10px;
            border: 1px solid ${SO_BORDER};
            border-radius: var(--radius-md, 6px);
            background: ${SO_INPUT_BG};
            font-family: var(--font);
            font-size: var(--text-base, 13px);
            color: var(--text);
            outline: none;
            line-height: normal;
            transition: border-color 0.15s, box-shadow 0.15s;
            box-sizing: border-box;
            appearance: none;
          }
          .so-field:focus {
            border-color: ${SO_FOCUS_BC};
            box-shadow: ${SO_FOCUS_RING};
          }
          .so-field:disabled {
            background: #F1F5F9;
            color: var(--text-muted);
            cursor: not-allowed;
          }
          textarea.so-field {
            height: auto;
            min-height: 80px;
            padding: 8px 10px;
            resize: vertical;
            line-height: 1.55;
          }
          select.so-field {
            padding-right: 28px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%239A9590' d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            background-size: 14px;
          }
          .so-label {
            font-size: var(--text-sm, 12px);
            font-weight: 500;
            color: var(--text);
            margin-bottom: 5px;
            display: block;
          }
          .so-hint  { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
          .so-error { font-size: 11px; color: var(--red, #DC2626); margin-top: 4px; }
          .so-field-wrap { display: flex; flex-direction: column; }
        `}</style>

        {/* ── Header sticky ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '14px 20px', flexShrink: 0,
          borderBottom: hasTabs ? 'none' : '1px solid var(--border)',
          background: SO_BG,
          position: 'sticky', top: 0, zIndex: 1,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text)' }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            )}
            {headerExtra && (
              <div style={{ marginTop: 6 }}>
                {headerExtra}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
            {/* Custom header actions (e.g. log toggle button) */}
            {headerActions}
            {/* Expand / Minimize */}
            <button
              type="button"
              onClick={cycleSize}
              aria-label={isFullscreen ? 'Reduzir' : 'Expandir'}
              title={isFullscreen ? 'Reduzir' : 'Expandir'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--surface)',
                cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
              }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--surface)',
                cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Tab bar (optional) ────────────────────────────────────── */}
        {hasTabs && (
          <div style={{
            display: 'flex', flexShrink: 0,
            padding: '0 16px', overflowX: 'auto', overflowY: 'hidden',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
            background: 'var(--surface2)',
            borderBottom: '1px solid var(--border)',
            borderTop: '1px solid var(--border)',
            gap: 2,
          }}>
            {tabs.map(t => {
              const isActive = activeTab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onTabChange?.(t.key)}
                  style={{
                    padding: '11px 11px 10px',
                    background: 'none', border: 'none',
                    borderBottom: `2.5px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                    color: isActive ? 'var(--accent)' : 'var(--text-soft)',
                    fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                    letterSpacing: isActive ? '-0.1px' : '0',
                    cursor: 'pointer', fontFamily: 'var(--font)', marginBottom: -1,
                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                    transition: 'color 0.12s',
                  }}
                >
                  {t.label}
                  {t.badge != null && t.badge !== '' && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                      fontFamily: 'var(--mono)',
                      background: isActive ? 'var(--accent)' : 'var(--surface3)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                      minWidth: 18, textAlign: 'center',
                    }}>
                      {t.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Body ──────────────────────────────────────────────────── */}
        <div style={{
          flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0,
        }}>
          {/* Main scrollable content */}
          <div style={{
            flex: 1, minHeight: 0, minWidth: 0,
            overflowY: hasTabs ? 'hidden' : 'auto',
            overflowX: 'hidden',
            padding: hasTabs ? '0' : '20px',
            display: 'flex', flexDirection: 'column', gap: hasTabs ? 0 : 20,
          }}>
            {hasTabs ? (
              // With tabs: render children directly (each tab manages its own layout)
              <>
                {children}
                {extra && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: 20 }}>
                    {extra}
                  </div>
                )}
              </>
            ) : (
              // Without tabs: keep original grid wrapper behavior
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: '16px 20px',
                  alignItems: 'start',
                }}>
                  {children}
                </div>
                {extra && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                    {extra}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right panel (optional, fixed width) */}
          {rightPanel && (
            <div style={{
              width: rightPanelOpen ? 280 : 0,
              flexShrink: 0,
              overflow: 'hidden',
              transition: 'width 0.28s ease',
              borderLeft: rightPanelOpen ? '1px solid var(--border)' : 'none',
              background: SO_BG,
              display: 'flex',
              flexDirection: 'column',
            }}>
              {rightPanel}
            </div>
          )}
        </div>

        {/* ── Footer sticky — only rendered when no tabs ─────────── */}
        {!hasTabs && showFooter && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 8, padding: '12px 20px', flexShrink: 0,
            borderTop: '1px solid var(--border)',
            background: SO_BG,
            position: 'sticky', bottom: 0, zIndex: 1,
          }}>
            <Button variant="secondary" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button variant="primary" onClick={onSave} loading={saving}>
              {saveLabel}
            </Button>
          </div>
        )}
      </aside>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários de composição — usados dentro de SlideOver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FormGrid — agrupa campos em N colunas dentro do SlideOver.
 * <FormGrid cols={2}> ... </FormGrid>
 * Útil para forçar 2 colunas em uma seção específica dentro de um SlideOver de 1 coluna.
 */
export function FormGrid({ cols = 2, gap = '16px 20px', children, style: extra = {} }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap,
      alignItems: 'start',
      gridColumn: '1 / -1',   // ocupa toda a largura da grade pai
      ...extra,
    }}>
      {children}
    </div>
  )
}

/**
 * FormSection — título de seção dentro do formulário.
 * <FormSection label="Endereço" />
 */
export function FormSection({ label, children }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {children && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px 20px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * FormField — campo com label, hint e erro, usando a classe .so-field.
 *
 * <FormField label="Nome" required hint="Razão social" error={errors.nome}>
 *   <input className="so-field" ... />
 * </FormField>
 *
 * Ou shorthand para input simples:
 * <FormField label="Nome" as="input" value={v} onChange={...} />
 */
export function FormField({
  label,
  required = false,
  hint,
  error,
  span = 1,          // quantas colunas o campo ocupa (1 ou 2)
  children,
  // shorthand
  as,
  ...inputProps
}) {
  const Tag = as

  return (
    <div className="so-field-wrap" style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}>
      {label && (
        <label className="so-label">
          {label}
          {required && <span style={{ color: 'var(--red, #DC2626)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      {as ? (
        <Tag className="so-field" {...inputProps} />
      ) : (
        children
      )}
      {!error && hint && <span className="so-hint">{hint}</span>}
      {error && <span className="so-error">{error}</span>}
    </div>
  )
}
