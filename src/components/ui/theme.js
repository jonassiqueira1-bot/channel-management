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

  // Accent (navy)
  accent:     '#1E3A5F',
  accent2:    '#2E5090',
  accentLite: 'rgba(30,58,95,0.07)',
  accentGlow: 'rgba(30,58,95,0.08)',
  accentMid:  'rgba(30,58,95,0.18)',

  // Semântica
  success:   '#059669', successBg: '#F0FDF4',
  warning:   '#D97706', warningBg: '#FFFBEB',
  danger:    '#DC2626', dangerBg:  '#FEF2F2',
  info:      '#1E3A5F', infoBg:    '#EFF6FF',

  // Bordas
  border:    'rgba(0,0,0,0.09)',
  border2:   'rgba(0,0,0,0.05)',
  borderMed: 'rgba(0,0,0,0.14)',
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
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
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
  md: '0 4px 12px rgba(0,0,0,0.08)',
  lg: '0 4px 20px rgba(0,0,0,0.10)',
}

// Atalho: retorna var(--token) para uso em inline-style
export const v = (token) => `var(--${token})`
