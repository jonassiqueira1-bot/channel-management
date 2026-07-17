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
//   — container usa --so-bg (zinc-50 equivalente = #F8FAFC)
//   — inputs usam bg branco + borda visível (#CBD5E1) + foco azul
//   — use a prop `columns` ou o utilitário <FormGrid cols={2}> para 2 colunas
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { X, Maximize2, Minimize2, Trash2 }  from 'lucide-react'
import Button                               from '../Button'

// ── tamanhos ──────────────────────────────────────────────────────────────────
const BASE_SIZES  = { compact: 480, default: 680, fullscreen: 'calc(100% - 56px)' }
const SIZE_ORDER  = ['compact', 'default', 'fullscreen']

// ── tokens internos ───────────────────────────────────────────────────────────
const SO_BG         = '#FFFFFF'       // painel branco
const SO_INPUT_BG   = '#FFFFFF'       // campos brancos, definidos só pela borda (discreta)
const SO_BORDER     = '#E2E6EC'       // borda sutil — sem o efeito "caixa" tradicional
const SO_FOCUS_RING = '0 0 0 4px rgba(37,99,235,0.12)'
const SO_FOCUS_BC   = '#2563EB'      // blue-600

// ── SlideOver ─────────────────────────────────────────────────────────────────
export default function SlideOver({
  open,
  onClose,
  onSave,
  onDelete,
  deleteLabel    = 'Excluir',
  deleteConfirm  = 'Excluir este registro? Esta ação não pode ser desfeita.',
  title          = 'Editar',
  subtitle,
  initialSize    = 'default',
  saving         = false,
  saveLabel      = 'Salvar',
  cancelLabel    = 'Cancelar',
  columns        = 'auto',
  children,
  extra,
  tabs,
  activeTab,
  onTabChange,
  headerExtra,
  headerActions,
  defaultWidth,
  rightPanel,
  rightPanelOpen = false,
  showFooter     = true,
  footerLeft,
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

  // Esconde o widget do Crisp enquanto o SlideOver está aberto — ver regra
  // `body[style*="overflow: hidden"] #crisp-chatbox` em src/index.css.
  // (Reposicionar via `bottom` não funcionava: o botão do Crisp é renderizado
  // dentro de um iframe próprio que não segue o offset do container pai.)

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
            background: 'rgba(15,23,42,0.44)',
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

          /* ─── Tab bar: esconde scrollbar em webkit/iOS ───────────── */
          .so-tabbar::-webkit-scrollbar { display: none }
          .so-tabbar { -webkit-overflow-scrolling: touch }

          /* ─── Tabs menores em mobile ─────────────────────────────── */
          @media (max-width: 480px) {
            .so-tab-btn { padding: 10px 8px 9px !important; font-size: 11.5px !important; }
          }

          /* ─── Inputs dentro do SlideOver ─────────────────────────── */
          .so-field {
            width: 100%;
            height: 40px;
            padding: 0 14px;
            border: 1px solid ${SO_BORDER};
            border-radius: 10px;
            background: ${SO_INPUT_BG};
            font-family: var(--font);
            font-size: var(--text-base, 13px);
            color: var(--text);
            outline: none;
            line-height: normal;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
            box-sizing: border-box;
            appearance: none;
          }
          .so-field::placeholder { color: #B4B9C2; }
          .so-field:hover:not(:focus):not(:disabled) {
            border-color: #D3D8E0;
          }
          .so-field:focus {
            border-color: ${SO_FOCUS_BC};
            box-shadow: ${SO_FOCUS_RING};
          }
          .so-field:disabled {
            background: #FAFBFC;
            color: var(--text-muted);
            cursor: not-allowed;
          }
          textarea.so-field {
            height: auto;
            min-height: 96px;
            padding: 12px 14px;
            resize: vertical;
            line-height: 1.6;
          }
          select.so-field {
            padding-right: 32px;
            cursor: pointer;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%239A9590' d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 13px;
          }
          .so-label {
            font-size: 10.5px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 7px;
            display: block;
          }
          .so-hint  { font-size: 11.5px; color: var(--text-muted); margin-top: 6px; line-height: 1.5; }
          .so-error { font-size: 11.5px; color: var(--red, #DC2626); margin-top: 6px; line-height: 1.5; }
          .so-field-wrap { display: flex; flex-direction: column; }

          /* ─── Ação destrutiva discreta (link, não botão) ─────────── */
          .so-delete-link {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 10px; border: none; background: none; border-radius: 8px;
            color: #B42318; font-size: 12.5px; font-weight: 500;
            font-family: var(--font); cursor: pointer;
            transition: background 0.12s ease, color 0.12s ease;
          }
          .so-delete-link:hover { background: rgba(180,35,24,0.08); color: #941B0F; }
        `}</style>

        {/* ── Header sticky ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '22px 24px', flexShrink: 0,
          borderBottom: hasTabs ? 'none' : '1px solid var(--border2)',
          borderTop: '2px solid var(--accent)',
          background: SO_BG,
          position: 'sticky', top: 0, zIndex: 1,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text)', lineHeight: 1.3 }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-soft)', fontWeight: 500 }}>
                {subtitle}
              </p>
            )}
            {headerExtra && (
              <div style={{ marginTop: 10 }}>
                {headerExtra}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 16 }}>
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
                width: 32, height: 32, borderRadius: 9,
                border: '1px solid var(--border2)', background: 'var(--surface)',
                cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
                transition: 'background 0.12s ease, border-color 0.12s ease',
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
                width: 32, height: 32, borderRadius: 9,
                border: '1px solid var(--border2)', background: 'var(--surface)',
                cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
                transition: 'background 0.12s ease, border-color 0.12s ease',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Tab bar (optional) ────────────────────────────────────── */}
        {hasTabs && (
          <div className="so-tabbar" style={{
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
                  className="so-tab-btn"
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
            {/* espaçador: garante padding-right visível em flex overflow */}
            <div style={{ flexShrink: 0, width: 16 }} />
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
            padding: hasTabs ? '0' : '28px 24px',
            display: 'flex', flexDirection: 'column', gap: hasTabs ? 0 : 32,
          }}>
            {hasTabs ? (
              // With tabs: render children directly (each tab manages its own layout)
              <>
                {children}
                {extra && (
                  <div style={{ borderTop: '1px solid var(--border2)', padding: 24 }}>
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
                  gap: '24px 24px',
                  alignItems: 'start',
                  paddingBottom: 8,
                }}>
                  {children}
                </div>
                {extra && (
                  <div style={{ borderTop: '1px solid var(--border2)', paddingTop: 24 }}>
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

        {/* ── Footer sticky — always visible when showFooter=true ── */}
        {showFooter && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, padding: '16px 24px', flexShrink: 0,
            borderTop: '1px solid var(--border2)',
            background: SO_BG,
            position: 'sticky', bottom: 0, zIndex: 1,
          }}>
            {/* Left slot: Excluir (link discreto) ou footerLeft customizado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {onDelete && (
                <button
                  type="button"
                  className="so-delete-link"
                  onClick={() => { if (window.confirm(deleteConfirm)) onDelete() }}
                >
                  <Trash2 size={13} />
                  {deleteLabel}
                </button>
              )}
              {footerLeft}
            </div>
            {/* Right slot: Cancelar + Salvar (ação principal) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Button variant="secondary" onClick={onClose}>
                {cancelLabel}
              </Button>
              {onSave && (
                <Button variant="primary" onClick={onSave} loading={saving}>
                  {saveLabel}
                </Button>
              )}
            </div>
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
export function FormGrid({ cols = 2, gap = '20px 24px', children, style: extra = {} }) {
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
export function FormSection({ label, description, children }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {label && (
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: 'var(--accent)',
          }}>
            {label}
          </div>
          {description && (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
              {description}
            </div>
          )}
        </div>
      )}
      {children && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px 24px',
        }}>
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
