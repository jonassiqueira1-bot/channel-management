// src/components/ui/theme.js
// ─────────────────────────────────────────────────────────────────────────────
// Espelho JS das variáveis CSS de index.css.
// Use em inline-styles para garantir consistência sem repetir strings literais.
// As variáveis continuam sendo a fonte de verdade; este arquivo apenas centraliza
// os valores padrão para uso programático (ex: lógica de cor dinâmica).
// ─────────────────────────────────────────────────────────────────────────────

export const color = {
  // Fundos
  bg:       '#F8FAFC',
  surface:  '#FFFFFF',
  surface2: '#F1F5F9',
  surface3: '#E2E8F0',

  // Texto
  text:      '#1A1916',
  textSoft:  '#5A5650',
  textMuted: '#9A9590',

  // Accent (vivid blue)
  accent:     '#2563EB',
  accent2:    '#1D4ED8',
  accentLite: 'rgba(37,99,235,0.07)',
  accentGlow: 'rgba(37,99,235,0.08)',
  accentMid:  'rgba(37,99,235,0.18)',

  // Semântica
  success:   '#059669', successBg: '#F0FDF4',
  warning:   '#D97706', warningBg: '#FFFBEB',
  danger:    '#DC2626', dangerBg:  '#FEF2F2',
  info:      '#2563EB', infoBg:    '#EFF6FF',

  // Bordas
  border:    'rgba(0,0,0,0.12)',
  border2:   'rgba(0,0,0,0.07)',
  borderMed: 'rgba(0,0,0,0.18)',
}

export const space = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
}

export const radius = {
  sm:   6,
  md:   10,
  lg:   16,
  xl:   24,
  pill: 9999,
}

export const font = {
  sans: "'Plus Jakarta Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
}

export const textSize = {
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   16,
  xl:   20,
  '2xl': 24,
}

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 16px rgba(0,0,0,0.10)',
  lg: '0 8px 32px rgba(0,0,0,0.14)',
}

// Atalho: retorna var(--token) para uso em inline-style
export const v = (token) => `var(--${token})`
