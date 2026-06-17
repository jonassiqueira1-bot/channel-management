// src/components/ui/typography.js
// ─────────────────────────────────────────────────────────────────────────────
// Hierarquia tipográfica do Design System.
// Todos os tamanhos, pesos e cores usam as variáveis CSS de index.css como
// fonte de verdade. Este arquivo expõe os valores como objetos de inline-style
// prontos para uso em qualquer componente.
//
// Uso:
//   import { type } from '../components/ui/typography'
//   <h1 style={type.h1}>Título da página</h1>
//   <label style={type.label}>Nome completo</label>
// ─────────────────────────────────────────────────────────────────────────────

const base = {
  fontFamily: 'var(--font)',
  margin: 0,
}

export const type = {
  /** Título de página — 24px / 32px / 700 / tracking-tight */
  h1: {
    ...base,
    fontSize: 'var(--type-h1-size)',
    lineHeight: 'var(--type-h1-line)',
    fontWeight: 'var(--type-h1-weight)',
    letterSpacing: 'var(--type-h1-tracking)',
    color: 'var(--text)',
  },

  /** Título de seção — 18px / 24px / 600 */
  h2: {
    ...base,
    fontSize: 'var(--type-h2-size)',
    lineHeight: 'var(--type-h2-line)',
    fontWeight: 'var(--type-h2-weight)',
    color: 'var(--text)',
  },

  /** Corpo de texto — 14px / 20px / 400 */
  body: {
    ...base,
    fontSize: 'var(--type-body-size)',
    lineHeight: 'var(--type-body-line)',
    fontWeight: 'var(--type-body-weight)',
    color: 'var(--text)',
  },

  /** Label de campo — 12px / 16px / 500 / zinc-700 */
  label: {
    ...base,
    fontSize: 'var(--type-label-size)',
    lineHeight: 'var(--type-label-line)',
    fontWeight: 'var(--type-label-weight)',
    color: 'var(--type-label-color)',
  },

  /** Caption / metadado — 11px / 14px / 400 / muted */
  caption: {
    ...base,
    fontSize: 'var(--type-caption-size)',
    lineHeight: 'var(--type-caption-line)',
    fontWeight: 'var(--type-caption-weight)',
    color: 'var(--text-muted)',
  },
}

// Atalhos para uso em componentes que precisam sobrescrever só uma propriedade
export const fontSize = {
  h1:      'var(--type-h1-size)',
  h2:      'var(--type-h2-size)',
  body:    'var(--type-body-size)',
  label:   'var(--type-label-size)',
  caption: 'var(--type-caption-size)',
}

export const fontWeight = {
  h1:      700,
  h2:      600,
  body:    400,
  label:   500,
  caption: 400,
}

export const lineHeight = {
  h1:      'var(--type-h1-line)',
  h2:      'var(--type-h2-line)',
  body:    'var(--type-body-line)',
  label:   'var(--type-label-line)',
  caption: 'var(--type-caption-line)',
}
