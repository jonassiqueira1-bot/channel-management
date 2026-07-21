// src/components/BrowseLayout.js
// ─────────────────────────────────────────────────────────────────────────────
// Layout genérico de listagem — padrão visual para todas as telas de listagem
// do Boostly (Pipeline, Projetos, Empresas, Vendedores, etc).
//
// Arquitetura (todas as partes vivem neste arquivo, mas são unidades
// independentes — cada uma pode ser extraída para arquivo próprio no futuro
// sem tocar na API pública do BrowseLayout):
//
//   BrowseLayout               orquestra estado (seleção, ordenação, paginação,
//                              colunas, filtros) e monta as partes abaixo
//   ├── MetricsHeader          barra de indicadores recolhível (prop `kpis`)
//   ├── BrowseToolbar          busca · colunas · filtros · visualização · ações
//   │     └── ToolbarButton    botão ghost/ícone padronizado da toolbar
//   ├── ActiveFiltersBar       chips dos filtros ativos, visíveis sem abrir o painel
//   │     └── FilterChip
//   ├── BulkActionBar          barra de ações em lote (some quando não há seleção)
//   ├── DataTable (list view)  cabeçalho sticky + linhas com estados hover/seleção/foco
//   ├── CardGrid (card view)   grade de cards (view alternativa já suportada)
//   ├── FilterPanel            painel lateral com todos os filtros disponíveis
//   ├── BulkEditPanel          painel lateral de edição em lote
//   ├── EmptyState
//   └── Pagination
//
// `view` já é um enum extensível ('list' | 'card' hoje) — Kanban/Calendário
// entrariam como novos valores de `view` + um novo bloco de render condicional,
// sem alterar toolbar, filtros, seleção ou paginação.
//
// Componentes exportados para reuso fora do BrowseLayout (badges/avatares
// usados nas colunas das telas que consomem este layout):
//   TableBadge    badge padronizado (status/prioridade/relacionamento)
//   AvatarGroup   avatar (ou iniciais) de 1+ participantes, com overflow "+N"
//
// Props:
//   columns      {key, label, sortable?, width?, render?}[]   definição das colunas
//   data         object[]                                      linhas da tabela
//   keyField     string                                        campo de id único (default: 'id')
//   kpis         ReactNode                                     slot de KPIs recolhível
//   kpisLabel    string                                        label do painel KPI
//   onNew        () => void                                    botão "+ Novo Registro"
//   newLabel     string                                        label do botão primário
//   filters      {key, label, options:{value,label}[]}[]       definição de filtros
//   activeFilters {key: value[]}                              filtros ativos (controlado)
//   onFilterChange ({key: value[]}) => void
//   search       string                                        busca controlada
//   onSearchChange (v: string) => void
//   bulkActions  {label, icon?, variant?, onClick:(ids)=>void}[]
//   renderCard   (row) => ReactNode                           view em card (opcional)
//   storageKey   string                                        chave localStorage
//   emptyState   ReactNode
//   density      'compact' | 'comfortable'                    densidade da tabela (default: 'comfortable')
//   isRowDisabled (row) => boolean                             opcional — linha desabilitada (visual + sem clique)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo, memo, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { usePermissions } from '../hooks/usePermissions'
import {
  Search, LayoutList, LayoutGrid,
  ChevronDown, ChevronUp, MoreHorizontal,
  ChevronsUpDown, ArrowUp, ArrowDown, Check,
  Columns, GripVertical, PencilLine, X, Filter, Plus,
  Download,
} from 'lucide-react'

// ── Export helpers ────────────────────────────────────────────────────────────
function getCellText(col, row) {
  // Usa exportValue se a coluna definir, senão valor bruto
  if (typeof col.exportValue === 'function') return String(col.exportValue(row) ?? '')
  const v = row[col.key]
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return ''          // ReactNode — ignorar
  return String(v)
}

function buildRows(cols, rows) {
  const header = cols.map(c => c.label)
  const body   = rows.map(row => cols.map(col => getCellText(col, row)))
  return [header, ...body]
}

function downloadFile(content, filename, mimeType) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mimeType }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportCsv(cols, rows, filename) {
  const matrix = buildRows(cols, rows)
  const csv = matrix.map(row =>
    row.map(cell => {
      const s = cell.replace(/"/g, '""')
      return /[",\n\r]/.test(s) ? `"${s}"` : s
    }).join(',')
  ).join('\r\n')
  // BOM UTF-8 garante que Excel abre com acentos corretos
  downloadFile('﻿' + csv, filename + '.csv', 'text/csv;charset=utf-8')
}

function exportExcel(cols, rows, filename) {
  const matrix = buildRows(cols, rows)
  const escape = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"/></head><body>
<table border="1">
  <thead><tr>${matrix[0].map(h => `<th><b>${escape(h)}</b></th>`).join('')}</tr></thead>
  <tbody>${matrix.slice(1).map(row =>
    `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`
  ).join('')}</tbody>
</table></body></html>`
  downloadFile(html, filename + '.xls', 'application/vnd.ms-excel;charset=utf-8')
}

// ── BulkDropdown ──────────────────────────────────────────────────────────────
function BulkDropdown({ label, options, selected, setSelected }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(o=>!o)}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
          background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)',
          borderRadius:7, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
          fontFamily:'var(--font)' }}>
        {label}
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, minWidth:140,
          background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:300, overflow:'hidden' }}>
          {options.map((opt, i) => (
            <button key={i} type="button" onClick={() => { opt.onClick([...selected]); setSelected(new Set()); setOpen(false) }}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 14px',
                border:'none', background:'none', fontSize:13, color:'var(--text)',
                cursor:'pointer', fontFamily:'var(--font)' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── constantes ────────────────────────────────────────────────────────────────
const PAGE_SIZES = [20, 50, 100]
const STORAGE_NS = 'browse_layout_'

// Densidade da tabela — hoje só 'comfortable' é usado por padrão (mantém o
// espaçamento atual, zero mudança pra quem não passar a prop), mas a estrutura
// já suporta 'compact' para telas com muitas colunas/linhas.
const DENSITY = {
  compact:     { cellPadding: '6px 12px',  fontSize: 'var(--text-sm)' },
  comfortable: { cellPadding: '10px 12px', fontSize: 'var(--text-sm)' },
}

// ── estilos base ──────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
    background: 'var(--bg)', overflow: 'hidden',
  },

  // KPI header
  kpiBar: { borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
  kpiToggle: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 20px', cursor: 'pointer', userSelect: 'none',
    background: 'none', border: 'none', width: '100%', fontFamily: 'var(--font)',
  },
  kpiToggleLabel: {
    fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  kpiContent: { padding: '0 20px 16px' },

  // Action bar
  actionBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border)',
    background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap',
  },
  actionLeft:   { display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 180 },
  actionCenter: { display: 'flex', alignItems: 'center', gap: 6 },
  actionRight:  { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },

  // search
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: '#fff', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '0 10px',
    height: 32, minWidth: 200, maxWidth: 300, transition: 'border-color 0.15s',
  },
  searchInput: {
    border: 'none', outline: 'none', background: 'transparent',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)',
    color: 'var(--text)', flex: 1, minWidth: 0,
  },
  searchKbd: {
    fontSize: 10, color: 'var(--text-muted)',
    background: 'var(--surface3)', borderRadius: 3,
    padding: '1px 5px', border: '1px solid var(--border)',
    fontFamily: 'var(--mono)', flexShrink: 0,
  },

  // ghost btn
  ghostBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 32, padding: '0 10px', borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'var(--text-soft)',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  ghostBtnActive: { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-lite)' },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    cursor: 'pointer', color: 'var(--text-soft)',
  },

  // primary btn
  primaryBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)',
    border: 'none', background: 'var(--accent)', color: '#fff',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
    boxShadow: '0 1px 4px rgba(37,99,235,0.30)',
  },

  // bulk bar
  bulkBar: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  bulkCount: {
    fontSize: 'var(--text-sm)', fontWeight: 700, color: '#fff',
    background: 'rgba(255,255,255,0.25)', padding: '2px 10px',
    borderRadius: 'var(--radius-md)', marginRight: 4,
  },
  bulkBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 30, padding: '0 12px', borderRadius: 'var(--radius-md)',
    border: '1.5px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.15)',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: '#fff',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  bulkBtnDanger: { background: 'rgba(239,68,68,0.25)', borderColor: 'rgba(239,68,68,0.5)', color: '#fff' },

  // Dropdown
  dropdownWrap: { position: 'relative' },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', zIndex: 50,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
    padding: '4px 0', minWidth: 180,
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 12px', cursor: 'pointer',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'var(--text)',
  },
  dropdownDivider: { height: 1, background: 'var(--border)', margin: '4px 0' },
  dropdownLabel: {
    padding: '5px 12px 3px',
    fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--text-muted)',
  },
  checkMark: { color: 'var(--accent)', flexShrink: 0 },

  // View toggle
  viewToggle: { display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  viewBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, background: 'var(--surface)', border: 'none',
    cursor: 'pointer', color: 'var(--text-muted)',
  },
  viewBtnActive: { background: 'var(--accent)', color: '#fff' },

  // Table
  tableWrap: { flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font)', fontSize: 'var(--text-sm)' },
  thead: { position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface2)', borderBottom: '1px solid var(--border)', transition: 'box-shadow 0.15s ease' },
  theadScrolled: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  th: {
    padding: '9px 12px', textAlign: 'left', fontWeight: 700,
    fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none',
  },
  thSortable: { cursor: 'pointer' },
  thInner: { display: 'flex', alignItems: 'center', gap: 4 },
  thCheck: { width: 40, paddingLeft: 16 },
  tdCheck: { width: 40, paddingLeft: 16 },
  td: { color: 'var(--text)', verticalAlign: 'middle' },
  checkbox: { width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 },

  // Card grid
  cardGrid: {
    flex: 1, overflowY: 'auto', padding: '16px 20px',
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12, alignContent: 'start',
  },

  // Empty state
  emptyState: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 40, color: 'var(--text-muted)',
  },

  // Footer
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    // paddingRight reserva espaço pro botão flutuante do Crisp (canto
    // inferior direito) — sem isso a paginação fica embaixo dele, já que o
    // Crisp roda num iframe próprio e não respeita z-index/offset do layout.
    padding: '8px 88px 8px 20px', gap: 12,
    borderTop: '1px solid var(--border)',
    background: 'var(--surface)', flexShrink: 0,
  },
  footerCount: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--mono)' },
  footerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  footerPages: { display: 'flex', alignItems: 'center', gap: 4 },
  pageBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 28, height: 28, borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--surface)',
    fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)',
    color: 'var(--text-soft)', cursor: 'pointer',
  },
  pageBtnActive: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', fontWeight: 700 },
  pageBtnDisabled: { opacity: 0.35, cursor: 'not-allowed' },

  // Columns dropdown drag item
  colDragItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', cursor: 'default',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'var(--text)',
    userSelect: 'none',
  },
  gripHandle: { color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 },
}

// ── Estados de linha (hover/seleção/foco/desabilitado) via CSS ────────────────
// Injetado uma única vez no <head> (mesmo padrão usado em SlideOver.js) —
// evita mutação imperativa de estilo em onMouseEnter/onMouseLeave por linha.
const ROW_STYLE_ID = 'browse-layout-row-styles'
function injectRowStyles() {
  if (typeof document === 'undefined' || document.getElementById(ROW_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = ROW_STYLE_ID
  el.textContent = `
    .bl-tr { border-bottom: 1px solid var(--border2); transition: background 0.12s ease, box-shadow 0.12s ease; }
    .bl-tr--clickable { cursor: pointer; }
    .bl-tr--clickable:hover:not(.bl-tr--selected):not(.bl-tr--disabled) {
      background: var(--surface2); box-shadow: inset 3px 0 0 var(--accent);
    }
    .bl-tr--selected { background: var(--accent-lite); box-shadow: inset 3px 0 0 var(--accent); }
    .bl-tr--disabled { opacity: 0.5; cursor: not-allowed; }
    .bl-tr:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    .bl-card--clickable:hover:not(.bl-card--selected) {
      border-color: var(--accent) !important; box-shadow: 0 4px 16px rgba(37,99,235,0.12);
    }
  `
  document.head.appendChild(el)
}

// ── FilterChip — usado pela ActiveFiltersBar ──────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 26, padding: '0 6px 0 10px', borderRadius: 'var(--radius-md)',
      background: 'var(--accent-lite, #EEF2FF)', border: '1px solid var(--accent-mid, rgba(37,99,235,0.18))',
      fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%', border: 'none',
          background: 'transparent', color: 'var(--accent)', cursor: 'pointer', padding: 0,
        }}
      >
        <X size={11} />
      </button>
    </span>
  )
}

// ── ActiveFiltersBar — chips dos filtros ativos, visíveis sem abrir o painel ──
function ActiveFiltersBar({ filters, activeFilters, onFilterChange, onOpenPanel }) {
  const chips = []
  filters.forEach(f => {
    const vals = activeFilters[f.key] || []
    vals.forEach(v => {
      const opt = f.options.find(o => o.value === v)
      chips.push({ filterKey: f.key, value: v, label: `${f.label}: ${opt?.label ?? v}` })
    })
  })
  if (chips.length === 0) return null

  function removeChip(filterKey, value) {
    const next = (activeFilters[filterKey] || []).filter(v => v !== value)
    onFilterChange?.({ ...activeFilters, [filterKey]: next })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
      padding: '8px 20px', borderBottom: '1px solid var(--border)',
      background: 'var(--surface)', flexShrink: 0,
    }}>
      {chips.map(c => (
        <FilterChip key={`${c.filterKey}:${c.value}`} label={c.label} onRemove={() => removeChip(c.filterKey, c.value)} />
      ))}
      <button
        type="button"
        onClick={onOpenPanel}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          height: 26, padding: '0 10px', borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-med, var(--border))', background: 'none',
          color: 'var(--text-muted)', fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
        }}
      >
        <Plus size={12} /> Adicionar filtro
      </button>
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => onFilterChange?.({})}
          style={{
            marginLeft: 4, fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
            textDecoration: 'underline',
          }}
        >
          Limpar todos
        </button>
      )}
    </div>
  )
}

// ── TableBadge — badge padronizado (status/prioridade/relacionamento) ────────
// Export reutilizável para as colunas das telas que consomem o BrowseLayout —
// unifica a linguagem visual (mesmo radius/tipografia usados no resto do app).
const BADGE_TONES = {
  neutral: { bg: 'var(--surface3)',    color: 'var(--text-soft)' },
  success: { bg: '#D1FAE5',            color: '#065F46' },
  warning: { bg: '#FEF3C7',            color: '#92400E' },
  danger:  { bg: '#FEE2E2',            color: '#991B1B' },
  info:    { bg: '#DBEAFE',            color: '#1E40AF' },
  accent:  { bg: 'var(--accent-lite)', color: 'var(--accent)' },
}
export function TableBadge({ label, tone = 'neutral', dot = false }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 'var(--radius-md, 6px)',
      background: t.bg, color: t.color,
      fontSize: 'var(--text-xs)', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0 }} />}
      {label}
    </span>
  )
}

// ── AvatarGroup — participantes (avatar ou iniciais), com overflow "+N" ──────
function initialsOf(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
export function AvatarGroup({ people = [], max = 3, size = 24 }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  const circle = (content, key, title) => (
    <div key={key} title={title} style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent-glow, var(--accent-lite))', color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, fontFamily: 'var(--mono)',
      border: '2px solid var(--surface)', marginLeft: key === 0 ? 0 : -8,
      flexShrink: 0, overflow: 'hidden',
    }}>
      {content}
    </div>
  )
  if (people.length === 0) return <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>—</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((p, i) => circle(
        p.avatarUrl ? <img src={p.avatarUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(p.name),
        i, p.name
      ))}
      {extra > 0 && circle(`+${extra}`, 'extra', `${extra} mais`)}
    </div>
  )
}

// ── Pagination — rodapé de navegação de páginas ───────────────────────────────
function Pagination({ safePage, pageCount, onPageChange }) {
  function visiblePages() {
    const pages = []
    const delta = 1
    for (let i = 1; i <= pageCount; i++) {
      if (i === 1 || i === pageCount || (i >= safePage - delta && i <= safePage + delta)) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '…') {
        pages.push('…')
      }
    }
    return pages
  }
  return (
    <div style={s.footerPages}>
      <button
        type="button"
        style={{ ...s.pageBtn, ...(safePage === 1 ? s.pageBtnDisabled : {}) }}
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
        disabled={safePage === 1}
      >
        ‹
      </button>
      {visiblePages().map((p, i) =>
        p === '…' ? (
          <span key={`e-${i}`} style={{ ...s.pageBtn, border: 'none', cursor: 'default' }}>…</span>
        ) : (
          <button
            key={p}
            type="button"
            style={{ ...s.pageBtn, ...(p === safePage ? s.pageBtnActive : {}) }}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        style={{ ...s.pageBtn, ...(safePage === pageCount ? s.pageBtnDisabled : {}) }}
        onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
        disabled={safePage === pageCount}
      >
        ›
      </button>
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────────────────────
function EmptyState({ children }) {
  return (
    <div style={s.emptyState}>
      {children ?? (
        <>
          <Search size={32} style={{ opacity: 0.25 }} />
          <span style={{ fontSize: 'var(--text-sm)' }}>Nenhum registro encontrado.</span>
        </>
      )}
    </div>
  )
}

// ── TableRow — memoizada: só re-renderiza quando a linha/seleção/hover mudam ─
const TableRow = memo(function TableRow({ row, id, columns, selected, disabled, onRowClick, onToggle, cellPadding, fontSize }) {
  return (
    <tr
      className={`bl-tr ${onRowClick ? 'bl-tr--clickable' : ''} ${selected ? 'bl-tr--selected' : ''} ${disabled ? 'bl-tr--disabled' : ''}`}
      tabIndex={onRowClick && !disabled ? 0 : undefined}
      onClick={onRowClick && !disabled ? () => onRowClick(row) : undefined}
      onKeyDown={onRowClick && !disabled ? (e) => { if (e.key === 'Enter') onRowClick(row) } : undefined}
      onContextMenu={onRowClick && !disabled ? (e) => { e.preventDefault(); onRowClick(row) } : undefined}
    >
      <td style={{ ...s.td, ...s.tdCheck, padding: cellPadding }} onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={e => { e.stopPropagation(); onToggle(id) }}
          style={s.checkbox}
        />
      </td>
      {columns.map(col => (
        <td key={col.key} style={{ ...s.td, padding: cellPadding, fontSize }}>
          {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
        </td>
      ))}
    </tr>
  )
})

// ── Utilitário: fechar dropdown ao clicar fora ────────────────────────────────
function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, onClose])
}

// ── Dropdown controlado com portal (evita clipping por overflow:hidden) ───────
function Dropdown({ id, openId, setOpenId, trigger, children, align = 'left', minWidth }) {
  const open       = openId === id
  const triggerRef = useRef(null)
  const menuRef    = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  // Calcula posição ao abrir — abre para cima se não há espaço abaixo
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const r         = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    const openUp    = spaceBelow < 220 && spaceAbove > spaceBelow
    setPos({
      left:   r.left,
      right:  window.innerWidth - r.right,
      width:  r.width,
      // abre para cima: bottom fixado; para baixo: top fixado
      ...(openUp
        ? { bottom: window.innerHeight - r.top + 4, top: 'auto' }
        : { top: r.bottom + 4, bottom: 'auto' }),
    })
  }, [open])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current    && !menuRef.current.contains(e.target)
      ) setOpenId(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, setOpenId])

  const menuStyle = {
    ...s.dropdown,
    position: 'fixed',
    top:    pos.top,
    bottom: pos.bottom,
    ...(align === 'right'
      ? { right: pos.right }
      : { left: pos.left }),
    ...(minWidth ? { minWidth } : {}),
    maxHeight: 320,
    overflowY: 'auto',
    zIndex: 9999,
  }

  return (
    <div ref={triggerRef} style={s.dropdownWrap}>
      <div onClick={() => setOpenId(open ? null : id)}>{trigger}</div>
      {open && createPortal(
        <div ref={menuRef} style={menuStyle}>{children}</div>,
        document.body
      )}
    </div>
  )
}

// ── Ícone de sort ─────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={11} style={{ opacity: 0.35 }} />
  return sortDir === 'asc'
    ? <ArrowUp   size={11} style={{ color: 'var(--accent)' }} />
    : <ArrowDown size={11} style={{ color: 'var(--accent)' }} />
}

// ══════════════════════════════════════════════════════════════════════════════
// BrowseLayout — componente principal
// ══════════════════════════════════════════════════════════════════════════════
export default function BrowseLayout({
  columns          = [],
  data             = [],
  keyField         = 'id',
  kpis,
  kpisLabel        = 'Indicadores',
  onNew,
  newLabel         = '+ Novo Registro',
  filters          = [],
  activeFilters    = {},
  onFilterChange,
  extraFilters,
  search           = '',
  onSearchChange,
  bulkActions      = [],
  bulkEditFields,
  onBulkEdit,
  bulkEditCloseRef,   // ref preenchida com closeBulkEdit — permite fechar o painel externamente
  renderCard,
  storageKey       = 'default',
  exportFilename,           // nome base do arquivo exportado; default = storageKey
  emptyState,
  onImport,
  onExportCsv,              // override: callback personalizado (opcional)
  onExportExcel,            // override: callback personalizado (opcional)
  extraMenuItems,           // [{label, onClick, dividerBefore?}] — itens extras no menu de três pontos
  secondaryActions,
  onRowClick,
  modulo,                   // id do módulo (Perfis de Acesso) — controla exibição de importar/exportar
  density          = 'comfortable',
  isRowDisabled,
  groupBy,                  // opcional: (row) => string — agrupa a tabela por essa chave
  renderGroupHeader,        // ({ groupKey, rows, expanded, onToggleExpand, allSelected, someSelected, onToggleGroupSelection }) => ReactNode
  groupsControlRef,         // ref preenchida com { collapseAll, expandAll } — mesmo padrão de bulkEditCloseRef

  // ── Paginação server-side (opcional) ──────────────────────────────────────
  // Por padrão, BrowseLayout pagina em memória sobre `data` (assume que é a
  // lista completa já filtrada/ordenada). Quando `totalCount` é informado,
  // assume o modo servidor: `data` já é só a página atual (ex: vinda de um
  // .range() do Supabase), e page/pageSize passam a ser controlados de fora.
  totalCount,
  page:          pageProp,
  onPageChange:  onPageChangeProp,
  pageSize:      pageSizeProp,
  onPageSizeChange: onPageSizeChangeProp,
}) {
  const isServerPaged = totalCount !== undefined
  const { can } = usePermissions()
  const podeExportar = !modulo || can(modulo, 'exportar')
  const podeImportar  = !modulo || can(modulo, 'importar')
  const podeCriarEditar = !modulo || can(modulo, 'criar_editar')
  const storagePrefix = STORAGE_NS + storageKey
  const dens = DENSITY[density] || DENSITY.comfortable

  useEffect(() => { injectRowStyles() }, [])

  // ── breakpoint ────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // ── estado local ─────────────────────────────────────────────────────────
  const [kpisOpen,   setKpisOpen]   = useState(() => {
    try { const v = localStorage.getItem(storagePrefix + '_kpis'); return v === null ? true : v === 'true' } catch { return true }
  })
  const [view,       setView]       = useState(() => {
    try { return localStorage.getItem(storagePrefix + '_view') || 'list' } catch { return 'list' }
  })
  const [sortKey,    setSortKey]    = useState(() => {
    try { return localStorage.getItem(storagePrefix + '_sk') || null } catch { return null }
  })
  const [sortDir,    setSortDir]    = useState(() => {
    try { return localStorage.getItem(storagePrefix + '_sd') || 'asc' } catch { return 'asc' }
  })
  const [selected,   setSelected]   = useState(new Set())
  const [pageInternal,     setPageInternal]     = useState(1)
  const [pageSizeInternal, setPageSizeInternal] = useState(() => {
    try { return Number(localStorage.getItem(storagePrefix + '_ps')) || 20 } catch { return 20 }
  })
  // No modo servidor, page/pageSize vêm de fora (o caller já refaz a query
  // ao mudar); fora dele, mantém o state local de sempre.
  const page       = isServerPaged ? pageProp       : pageInternal
  const pageSize   = isServerPaged ? pageSizeProp   : pageSizeInternal
  const setPage    = isServerPaged ? onPageChangeProp     : setPageInternal
  const setPageSize = isServerPaged ? onPageSizeChangeProp : setPageSizeInternal

  // Controla qual dropdown está aberto (apenas um por vez)
  const [openId, setOpenId] = useState(null)

  // Visibilidade e ordem de colunas
  const [colOrder, setColOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(storagePrefix + '_co')
      if (saved) {
        const parsed = JSON.parse(saved)
        // merge: keep saved order, append any new columns, drop removed ones
        const allKeys = new Set(columns.map(c => c.key))
        const merged  = parsed.filter(k => allKeys.has(k))
        columns.forEach(c => { if (!merged.includes(c.key)) merged.push(c.key) })
        return merged
      }
    } catch {}
    return columns.map(c => c.key)
  })
  const [hiddenCols, setHiddenCols] = useState(() => {
    try {
      const saved = localStorage.getItem(storagePrefix + '_hc')
      if (saved) return new Set(JSON.parse(saved))
    } catch {}
    return new Set()
  })

  // Persiste colOrder e hiddenCols
  useEffect(() => {
    try { localStorage.setItem(storagePrefix + '_co', JSON.stringify(colOrder)) } catch {}
  }, [storagePrefix, colOrder])
  useEffect(() => {
    try { localStorage.setItem(storagePrefix + '_hc', JSON.stringify([...hiddenCols])) } catch {}
  }, [storagePrefix, hiddenCols])

  // Sincroniza colOrder quando a prop columns mudar
  useEffect(() => {
    setColOrder(prev => {
      const existing = new Set(prev)
      const newKeys  = columns.map(c => c.key)
      const merged   = [...prev.filter(k => newKeys.includes(k))]
      newKeys.forEach(k => { if (!existing.has(k)) merged.push(k) })
      return merged
    })
  }, [columns]) // eslint-disable-line react-hooks/exhaustive-deps

  // Colunas na ordem atual (com visibilidade)
  const orderedColumns = colOrder
    .map(key => columns.find(c => c.key === key))
    .filter(Boolean)
  const visibleColumns = orderedColumns.filter(c => !hiddenCols.has(c.key))

  const searchRef = useRef(null)

  // ── sombra discreta no cabeçalho sticky ao rolar a tabela ────────────────
  const tableWrapRef = useRef(null)
  const [theadScrolled, setTheadScrolled] = useState(false)
  const handleTableScroll = useCallback((e) => {
    setTheadScrolled(e.currentTarget.scrollTop > 0)
  }, [])

  // ── Ctrl+K → foca busca ──────────────────────────────────────────────────
  useEffect(() => {
    function handle(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  // ── persiste pageSize ────────────────────────────────────────────────────
  const changePageSize = useCallback((n) => {
    setPageSize(n)
    setPage(1)
    setOpenId(null)
    if (!isServerPaged) { try { localStorage.setItem(storagePrefix + '_ps', String(n)) } catch {} }
  }, [storagePrefix, isServerPaged, setPageSize, setPage])

  // ── persiste kpisOpen, view, sortKey, sortDir ───────────────────────────
  useEffect(() => { try { localStorage.setItem(storagePrefix + '_kpis', String(kpisOpen)) } catch {} }, [storagePrefix, kpisOpen])
  useEffect(() => { try { localStorage.setItem(storagePrefix + '_view', view) } catch {} }, [storagePrefix, view])
  useEffect(() => { try { if (sortKey) localStorage.setItem(storagePrefix + '_sk', sortKey) } catch {} }, [storagePrefix, sortKey])
  useEffect(() => { try { localStorage.setItem(storagePrefix + '_sd', sortDir) } catch {} }, [storagePrefix, sortDir])

  // ── sort ─────────────────────────────────────────────────────────────────
  const handleSort = useCallback((key) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key }
      setSortDir('asc'); return key
    })
    setPage(1)
  }, [setPage])

  // ── dados ordenados e paginados (memoizado — evita re-ordenar em todo render) ──
  const sorted = useMemo(() => [...data].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  }), [data, sortKey, sortDir])

  const hasGrouping = typeof groupBy === 'function'

  const total     = isServerPaged ? totalCount : sorted.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage  = Math.min(page, pageCount)
  const start     = (safePage - 1) * pageSize
  const end       = Math.min(start + pageSize, total)
  // Modo servidor: `data` já chega só com a página atual (ex: um .range() do
  // Supabase) — fatiar de novo por índice absoluto quebraria a partir da
  // página 2. Com agrupamento, paginar em memória quebraria grupos ao meio —
  // mostra tudo, sem paginação.
  const pageRows  = useMemo(() => (isServerPaged || hasGrouping) ? sorted : sorted.slice(start, end), [sorted, start, end, hasGrouping, isServerPaged])

  // ── agrupamento (opcional) ────────────────────────────────────────────────
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try { const v = localStorage.getItem(storagePrefix + '_collapsed'); return v ? new Set(JSON.parse(v)) : new Set() } catch { return new Set() }
  })
  useEffect(() => {
    if (!hasGrouping) return
    try { localStorage.setItem(storagePrefix + '_collapsed', JSON.stringify([...collapsedGroups])) } catch {}
  }, [storagePrefix, collapsedGroups, hasGrouping])

  const groups = useMemo(() => {
    if (!hasGrouping) return []
    const map = new Map()
    pageRows.forEach(row => {
      const key = groupBy(row)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(row)
    })
    return [...map.entries()].map(([key, rows]) => ({ key, rows }))
  }, [hasGrouping, pageRows, groupBy])

  function toggleGroupCollapsed(key) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  if (groupsControlRef) {
    groupsControlRef.current = {
      collapseAll: () => setCollapsedGroups(new Set(groups.map(g => g.key))),
      expandAll:   () => setCollapsedGroups(new Set()),
    }
  }
  function toggleGroupSelection(rows) {
    const ids = rows.map(r => r[keyField])
    const allSel = ids.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => allSel ? next.delete(id) : next.add(id))
      return next
    })
  }

  // ── seleção ──────────────────────────────────────────────────────────────
  const allPageSelected = pageRows.length > 0 && pageRows.every(r => selected.has(r[keyField]))
  const someSelected    = selected.size > 0

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allPageSelected) pageRows.forEach(r => next.delete(r[keyField]))
      else pageRows.forEach(r => next.add(r[keyField]))
      return next
    })
  }

  const toggleRow = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── contagem de filtros ativos ────────────────────────────────────────────
  const activeFilterCount = Object.values(activeFilters).flat().filter(Boolean).length

  // ── filter panel ─────────────────────────────────────────────────────────
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  // Grupos de filtro com muitas opções vêm recolhidos por padrão (senão um
  // filtro de 20 opções obriga rolar bastante até chegar no próximo filtro),
  // com busca interna pra navegação rápida quando expandido.
  const FILTRO_LIMIAR_COLAPSAR = 8
  const [gruposFiltroAbertos, setGruposFiltroAbertos] = useState({})
  const [buscaFiltro, setBuscaFiltro] = useState({})

  // ── bulk edit ────────────────────────────────────────────────────────────
  const [bulkEditOpen,   setBulkEditOpen]   = useState(false)
  const [bulkEdits,      setBulkEdits]      = useState({})   // { key: value }
  const [bulkActive,     setBulkActive]     = useState({})   // { key: bool } — toggle por campo

  function openBulkEdit() {
    setBulkEdits({})
    setBulkActive({})
    setBulkEditOpen(true)
  }

  function applyBulkEdit() {
    const changes = {}
    Object.entries(bulkActive).forEach(([k, on]) => {
      if (on) changes[k] = bulkEdits[k] ?? ''
    })
    if (Object.keys(changes).length === 0) return
    // onBulkEdit pode retornar false para interceptar (ex: mostrar popup de confirmação)
    const result = onBulkEdit?.([...selected], changes)
    if (result === false) return   // interceptado — não fecha o painel
    setBulkEditOpen(false)
    setSelected(new Set())
  }

  // permite fechar o painel externamente (ex: após confirmação assíncrona)
  function closeBulkEdit() {
    setBulkEditOpen(false)
    setSelected(new Set())
  }
  if (bulkEditCloseRef) bulkEditCloseRef.current = closeBulkEdit

  // ── drag-and-drop de reordenação de colunas ───────────────────────────────
  const dragKey = useRef(null)

  function onColDragStart(key) { dragKey.current = key }

  function onColDragOver(e, key) {
    e.preventDefault()
    if (!dragKey.current || dragKey.current === key) return
    setColOrder(prev => {
      const next = [...prev]
      const from = next.indexOf(dragKey.current)
      const to   = next.indexOf(key)
      if (from < 0 || to < 0) return prev
      next.splice(from, 1)
      next.splice(to, 0, dragKey.current)
      return next
    })
  }

  function onColDragEnd() { dragKey.current = null }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>

      {/* ── KPI Header ──────────────────────────────────────────────────── */}
      {kpis && (
        <div style={s.kpiBar}>
          <button type="button" style={s.kpiToggle} onClick={() => setKpisOpen(o => !o)}>
            <span style={s.kpiToggleLabel}>
              <span style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--accent)', flexShrink: 0 }} />
              {kpisLabel}
            </span>
            {kpisOpen
              ? <ChevronUp   size={13} color="var(--text-muted)" />
              : <ChevronDown size={13} color="var(--text-muted)" />}
          </button>
          {kpisOpen && <div style={s.kpiContent}>{typeof kpis === 'function' ? kpis(sorted) : kpis}</div>}
        </div>
      )}

      {/* ── Action Bar ──────────────────────────────────────────────────── */}
      <div style={{
        ...s.actionBar,
        ...(isMobile ? { padding: '8px 12px', gap: 6 } : {}),
        ...(someSelected ? { background: 'var(--accent)', borderBottomColor: 'var(--accent)' } : {}),
      }}>

        {/* Busca — some quando há seleção */}
        {!someSelected && (
          <div style={s.actionLeft}>
            <div style={s.searchWrap}>
              <Search size={13} color="var(--text-muted)" />
              <input
                ref={searchRef}
                style={s.searchInput}
                placeholder="Buscar…"
                value={search}
                onChange={e => { onSearchChange?.(e.target.value); setPage(1) }}
              />
            </div>
          </div>
        )}

        {/* Bulk bar ou controles normais */}
        {someSelected ? (
          <div style={s.bulkBar}>
            <span style={s.bulkCount}>{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>

            {/* Editar em lote — só aparece se bulkEditFields foi fornecido */}
            {bulkEditFields?.length > 0 && onBulkEdit && (
              <button type="button" style={s.bulkBtn} onClick={openBulkEdit}>
                <PencilLine size={13} />
                Editar em lote
              </button>
            )}

            {bulkActions.map((a, i) => (
              a.type === 'dropdown' ? (
                <BulkDropdown key={i} label={a.label} options={a.options} selected={selected} setSelected={setSelected} />
              ) : (
                <button
                  key={i}
                  type="button"
                  style={{ ...s.bulkBtn, ...(a.variant === 'danger' ? s.bulkBtnDanger : {}) }}
                  onClick={() => { a.onClick([...selected]); setSelected(new Set()) }}
                >
                  {a.icon && a.icon}
                  {a.label}
                </button>
              )
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {secondaryActions}
              <button
                type="button"
                style={s.bulkBtn}
                onClick={() => { setSelected(new Set()); setBulkEditOpen(false) }}
              >
                Cancelar seleção
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Centro: Colunas */}
            <div style={s.actionCenter}>

              {/* Colunas */}
              <Dropdown
                id="columns"
                openId={openId}
                setOpenId={setOpenId}
                minWidth={200}
                trigger={
                  <button type="button" style={s.ghostBtn}>
                    <Columns size={13} />
                    Colunas
                    <ChevronDown size={12} />
                  </button>
                }
              >
                <div style={s.dropdownLabel}>Exibir / reordenar</div>
                {orderedColumns.map(col => {
                  const visible = !hiddenCols.has(col.key)
                  return (
                    <div
                      key={col.key}
                      draggable
                      onDragStart={() => onColDragStart(col.key)}
                      onDragOver={e => onColDragOver(e, col.key)}
                      onDragEnd={onColDragEnd}
                      style={s.colDragItem}
                      onClick={e => {
                        e.stopPropagation()
                        setHiddenCols(prev => {
                          const next = new Set(prev)
                          next.has(col.key) ? next.delete(col.key) : next.add(col.key)
                          return next
                        })
                      }}
                    >
                      <GripVertical size={13} style={s.gripHandle} />
                      <div style={{
                        width: 15, height: 15, borderRadius: 3,
                        border: '1.5px solid var(--border)',
                        background: visible ? 'var(--accent)' : 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {visible && <Check size={10} color="#fff" />}
                      </div>
                      {col.label}
                    </div>
                  )
                })}
              </Dropdown>
            </div>

            {/* Direita */}
            <div style={s.actionRight}>
              {/* Slot de ações secundárias (ex: toggle kanban) */}
              {secondaryActions}

              {/* Botão Filtros — abre painel lateral direito */}
              {filters.length > 0 && (
                <button
                  type="button"
                  style={{
                    ...s.ghostBtn,
                    ...(activeFilterCount > 0 ? s.ghostBtnActive : {}),
                  }}
                  onClick={() => setFilterPanelOpen(o => !o)}
                >
                  <Filter size={13} />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: 'var(--accent)', color: '#fff',
                      borderRadius: 'var(--radius-sm)', padding: '0 5px', marginLeft: 2,
                    }}>
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}

              {/* View toggle */}
              {renderCard && (
                <div style={s.viewToggle}>
                  <button
                    type="button"
                    title="Listagem"
                    style={{ ...s.viewBtn, ...(view === 'list' ? s.viewBtnActive : {}) }}
                    onClick={() => setView('list')}
                  >
                    <LayoutList size={13} />
                  </button>
                  <button
                    type="button"
                    title="Cards"
                    style={{ ...s.viewBtn, ...(view === 'card' ? s.viewBtnActive : {}) }}
                    onClick={() => setView('card')}
                  >
                    <LayoutGrid size={13} />
                  </button>
                </div>
              )}

              {/* Menu ••• */}
              <Dropdown
                id="more"
                openId={openId}
                setOpenId={setOpenId}
                align="right"
                trigger={
                  <button type="button" style={s.iconBtn} title="Mais ações">
                    <MoreHorizontal size={15} />
                  </button>
                }
              >
                {podeExportar && <>
                  <div style={s.dropdownLabel}>Exportar</div>
                  <div style={s.dropdownItem} onClick={() => {
                    setOpenId(null)
                    if (onExportCsv) { onExportCsv(); return }
                    exportCsv(visibleColumns, sorted, exportFilename || storageKey)
                  }}>
                    <Download size={13} style={{ color: 'var(--text-muted)' }} />
                    Exportar CSV
                  </div>
                  <div style={s.dropdownItem} onClick={() => {
                    setOpenId(null)
                    if (onExportExcel) { onExportExcel(); return }
                    exportExcel(visibleColumns, sorted, exportFilename || storageKey)
                  }}>
                    <Download size={13} style={{ color: 'var(--text-muted)' }} />
                    Exportar Excel (.xls)
                  </div>
                </>}
                {onImport && podeImportar && <><div style={s.dropdownDivider} /><div style={s.dropdownItem} onClick={onImport}>Importar dados</div></>}
                {(extraMenuItems||[]).map((item, i) => (
                  <span key={i}>
                    {item.dividerBefore && <div style={s.dropdownDivider} />}
                    <div style={s.dropdownItem} onClick={() => { setOpenId(null); item.onClick() }}>{item.label}</div>
                  </span>
                ))}
              </Dropdown>

              {/* Botão primário */}
              {onNew && podeCriarEditar && (
                <button type="button" style={s.primaryBtn} onClick={onNew}>
                  {newLabel}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Chips de filtros ativos ──────────────────────────────────────── */}
      {filters.length > 0 && (
        <ActiveFiltersBar
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={v => { onFilterChange?.(v); setPage(1) }}
          onOpenPanel={() => setFilterPanelOpen(true)}
        />
      )}

      {/* ── Conteúdo: tabela ou cards ────────────────────────────────────── */}
      {total === 0 ? (
        <EmptyState>{emptyState}</EmptyState>
      ) : view === 'card' && renderCard ? (
        <div style={{ ...s.cardGrid, ...(isMobile ? { gridTemplateColumns: '1fr', padding: '12px' } : {}) }}>
          {pageRows.map(row => {
            const sel = selected.has(row[keyField])
            const disabled = isRowDisabled?.(row)
            return (
              <div
                key={row[keyField]}
                className={`${onRowClick ? 'bl-card--clickable' : ''} ${sel ? 'bl-card--selected' : ''}`}
                style={{
                  position: 'relative', cursor: disabled ? 'not-allowed' : (onRowClick ? 'pointer' : 'default'),
                  opacity: disabled ? 0.5 : 1,
                  border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg, 10px)',
                  background: sel ? 'var(--accent-lite, #EEF2FF)' : 'var(--surface)',
                  transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                  overflow: 'hidden',
                }}
                onClick={onRowClick && !disabled ? () => onRowClick(row) : undefined}
                onContextMenu={onRowClick && !disabled ? (e) => { e.preventDefault(); onRowClick(row) } : undefined}
              >
                <input
                  type="checkbox"
                  checked={sel}
                  disabled={disabled}
                  onChange={e => { e.stopPropagation(); toggleRow(row[keyField]) }}
                  onClick={e => e.stopPropagation()}
                  style={{ ...s.checkbox, position: 'absolute', top: 10, right: 10, zIndex: 1 }}
                />
                {renderCard(row, sel)}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={s.tableWrap} ref={tableWrapRef} onScroll={handleTableScroll}>
          <table style={s.table}>
            <thead style={{ ...s.thead, ...(theadScrolled ? s.theadScrolled : {}) }}>
              <tr>
                <th style={{ ...s.th, ...s.thCheck }}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    style={s.checkbox}
                    title="Selecionar página"
                  />
                </th>
                {visibleColumns.map(col => (
                  <th
                    key={col.key}
                    style={{
                      ...s.th,
                      ...(col.sortable !== false ? s.thSortable : {}),
                      width: col.width,
                    }}
                    onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                  >
                    <div style={s.thInner}>
                      {col.label}
                      {col.sortable !== false && (
                        <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasGrouping ? groups.map(({ key, rows }) => {
                const collapsed  = collapsedGroups.has(key)
                const ids        = rows.map(r => r[keyField])
                const allSel     = ids.length > 0 && ids.every(id => selected.has(id))
                const someSel    = ids.some(id => selected.has(id))
                return (
                  <Fragment key={key}>
                    <tr>
                      <td colSpan={visibleColumns.length + 1} style={{ padding: 0 }}>
                        {renderGroupHeader
                          ? renderGroupHeader({
                              groupKey: key, rows, expanded: !collapsed,
                              onToggleExpand: () => toggleGroupCollapsed(key),
                              allSelected: allSel, someSelected: someSel,
                              onToggleGroupSelection: () => toggleGroupSelection(rows),
                            })
                          : (
                            <div
                              onClick={() => toggleGroupCollapsed(key)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}
                            >
                              <ChevronDown size={13} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }} />
                              {key} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({rows.length})</span>
                            </div>
                          )}
                      </td>
                    </tr>
                    {!collapsed && rows.map(row => (
                      <TableRow
                        key={row[keyField]}
                        row={row}
                        id={row[keyField]}
                        columns={visibleColumns}
                        selected={selected.has(row[keyField])}
                        disabled={isRowDisabled?.(row)}
                        onRowClick={onRowClick}
                        onToggle={toggleRow}
                        cellPadding={dens.cellPadding}
                        fontSize={dens.fontSize}
                      />
                    ))}
                  </Fragment>
                )
              }) : pageRows.map(row => (
                <TableRow
                  key={row[keyField]}
                  row={row}
                  id={row[keyField]}
                  columns={visibleColumns}
                  selected={selected.has(row[keyField])}
                  disabled={isRowDisabled?.(row)}
                  onRowClick={onRowClick}
                  onToggle={toggleRow}
                  cellPadding={dens.cellPadding}
                  fontSize={dens.fontSize}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Painel de Filtros (lateral direito) ─────────────────────────── */}
      {filterPanelOpen && filters.length > 0 && createPortal(
        <>
          <div
            onClick={() => setFilterPanelOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.18)' }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 340, zIndex: 81,
            background: 'var(--surface)', borderLeft: '1px solid var(--border)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.10)',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'var(--font)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              borderTop: '3px solid var(--accent)', flexShrink: 0,
            }}>
              <Filter size={15} color="var(--accent)" />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                Filtros
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { onFilterChange?.({}); setPage(1) }}
                  style={{
                    fontSize: 11, color: 'var(--accent)', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                    textDecoration: 'underline', padding: 0,
                  }}
                >
                  Limpar todos
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterPanelOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Filtros */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {extraFilters && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {extraFilters}
                </div>
              )}
              {filters.map(f => {
                const vals = activeFilters[f.key] || []
                const muitasOpcoes = f.options.length > FILTRO_LIMIAR_COLAPSAR
                // Recolhido por padrão só se tiver muita opção e nenhuma selecionada
                // ainda (se já tem filtro ativo nesse grupo, mantém aberto pra ver o quê).
                const abertoExplicito = gruposFiltroAbertos[f.key]
                const aberto = abertoExplicito !== undefined ? abertoExplicito : (!muitasOpcoes || vals.length > 0)
                const busca = buscaFiltro[f.key] || ''
                const opcoesFiltradas = busca
                  ? f.options.filter(o => o.label.toLowerCase().includes(busca.toLowerCase()))
                  : f.options
                return (
                  <div key={f.key}>
                    <div
                      onClick={() => muitasOpcoes && setGruposFiltroAbertos(p => ({ ...p, [f.key]: !aberto }))}
                      style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: muitasOpcoes ? 'pointer' : 'default',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {muitasOpcoes && (
                          <span style={{ fontSize: 9, transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
                        )}
                        {f.label}
                        {vals.length > 0 && (
                          <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 700 }}>({vals.length})</span>
                        )}
                      </span>
                      {vals.length > 0 && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onFilterChange?.({ ...activeFilters, [f.key]: [] }); setPage(1) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, fontSize: 11 }}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                    {aberto && (
                      <>
                        {muitasOpcoes && (
                          <input
                            value={busca}
                            onChange={e => setBuscaFiltro(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={`Buscar em ${f.label.toLowerCase()}…`}
                            style={{
                              width: '100%', boxSizing: 'border-box', marginBottom: 6,
                              padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                              background: 'var(--surface2)', color: 'var(--text)', fontSize: 12,
                              fontFamily: 'var(--font)',
                            }}
                          />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: muitasOpcoes ? 260 : 'none', overflowY: muitasOpcoes ? 'auto' : 'visible' }}>
                          {opcoesFiltradas.length === 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 10px' }}>Sem resultados</div>
                          )}
                          {opcoesFiltradas.map(opt => {
                            const checked = vals.includes(opt.value)
                            return (
                              <label
                                key={opt.value}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 9,
                                  padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
                                  background: checked ? 'var(--accent-lite, #EEF2FF)' : 'transparent',
                                  transition: 'background 0.1s',
                                }}
                              >
                                <div
                                  style={{
                                    width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                                    border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                                    background: checked ? 'var(--accent)' : 'var(--surface)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                  onClick={e => {
                                    e.preventDefault()
                                    const next = checked ? vals.filter(v => v !== opt.value) : [...vals, opt.value]
                                    onFilterChange?.({ ...activeFilters, [f.key]: next })
                                    setPage(1)
                                  }}
                                >
                                  {checked && <Check size={10} color="#fff" />}
                                </div>
                                <span style={{ fontSize: 13, color: checked ? 'var(--accent)' : 'var(--text)', fontWeight: checked ? 600 : 400 }}>
                                  {opt.label}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {activeFilterCount > 0 ? `${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} ativo${activeFilterCount > 1 ? 's' : ''}` : 'Nenhum filtro ativo'}
              </span>
              <button
                type="button"
                onClick={() => setFilterPanelOpen(false)}
                style={{
                  padding: '6px 16px', borderRadius: 7, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Painel Bulk Edit ────────────────────────────────────────────── */}
      {bulkEditOpen && bulkEditFields?.length > 0 && (
        <>
          {/* overlay semitransparente */}
          <div
            onClick={() => setBulkEditOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 80,
              background: 'rgba(0,0,0,0.25)',
            }}
          />
          {/* painel lateral direito */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 360, zIndex: 81,
            background: 'var(--surface)', borderLeft: '1px solid var(--border)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'var(--font)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <PencilLine size={16} color="var(--accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  Editar em lote
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                  {selected.size} registro{selected.size > 1 ? 's' : ''} selecionado{selected.size > 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={() => setBulkEditOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Instrução */}
            <div style={{
              margin: '12px 20px 0',
              padding: '10px 12px',
              background: 'var(--accent-lite, #EEF2FF)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--accent)',
              lineHeight: 1.5,
              flexShrink: 0,
            }}>
              Ative os campos que deseja alterar. Apenas os campos ativados serão aplicados aos registros selecionados.
            </div>

            {/* Campos */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bulkEditFields.map(field => {
                const isOn = !!bulkActive[field.key]
                return (
                  <div key={field.key} style={{
                    border: `1.5px solid ${isOn ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    background: isOn ? 'var(--accent-lite, #EEF2FF)' : 'var(--surface2)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}>
                    {/* Toggle + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isOn ? 10 : 0 }}>
                      {/* switch */}
                      <div
                        onClick={() => setBulkActive(p => ({ ...p, [field.key]: !p[field.key] }))}
                        style={{
                          width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                          background: isOn ? 'var(--accent)' : 'var(--border)',
                          position: 'relative', cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 3,
                          left: isOn ? 18 : 3,
                          width: 14, height: 14, borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: isOn ? 'var(--accent)' : 'var(--text-soft)',
                      }}>
                        {field.label}
                      </span>
                    </div>

                    {/* Input — só aparece quando ativado */}
                    {isOn && (() => {
                      const inputStyle = {
                        width: '100%', padding: '7px 10px',
                        border: '1px solid var(--border)', borderRadius: 7,
                        background: 'var(--surface)', color: 'var(--text)',
                        fontSize: 13, outline: 'none', fontFamily: 'var(--font)',
                        boxSizing: 'border-box',
                      }
                      if (field.type === 'select') {
                        return (
                          <select
                            style={inputStyle}
                            value={bulkEdits[field.key] ?? ''}
                            onChange={e => setBulkEdits(p => ({ ...p, [field.key]: e.target.value }))}
                          >
                            <option value="">— selecionar —</option>
                            {(field.options || []).map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        )
                      }
                      if (field.type === 'textarea') {
                        return (
                          <textarea
                            style={{ ...inputStyle, resize: 'vertical', minHeight: 72, lineHeight: 1.5 }}
                            value={bulkEdits[field.key] ?? ''}
                            onChange={e => setBulkEdits(p => ({ ...p, [field.key]: e.target.value }))}
                            placeholder={`Novo valor para ${field.label}…`}
                          />
                        )
                      }
                      return (
                        <input
                          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                          style={inputStyle}
                          value={bulkEdits[field.key] ?? ''}
                          onChange={e => setBulkEdits(p => ({ ...p, [field.key]: e.target.value }))}
                          placeholder={`Novo valor para ${field.label}…`}
                        />
                      )
                    })()}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 8, flexShrink: 0,
            }}>
              {/* Preview dos campos ativos */}
              {(() => {
                const ativos = Object.entries(bulkActive).filter(([,v]) => v).length
                return ativos > 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, alignSelf: 'center' }}>
                    {ativos} campo{ativos > 1 ? 's' : ''} será{ativos > 1 ? 'ão' : ''} alterado{ativos > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, alignSelf: 'center' }}>
                    Nenhum campo ativado
                  </span>
                )
              })()}
              <button
                onClick={() => setBulkEditOpen(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'none', color: 'var(--text-soft)', fontSize: 13,
                  cursor: 'pointer', fontFamily: 'var(--font)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={applyBulkEdit}
                disabled={!Object.values(bulkActive).some(Boolean)}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: Object.values(bulkActive).some(Boolean) ? 'var(--accent)' : 'var(--border)',
                  color: Object.values(bulkActive).some(Boolean) ? '#fff' : 'var(--text-muted)',
                  fontSize: 13, fontWeight: 600, cursor: Object.values(bulkActive).some(Boolean) ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font)', transition: 'background 0.15s',
                }}
              >
                Aplicar alterações
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {total > 0 && (
        <div style={s.footer}>
          <span style={s.footerCount}>
            {hasGrouping
              ? `${total} registro${total !== 1 ? 's' : ''} em ${groups.length} grupo${groups.length !== 1 ? 's' : ''}`
              : `Exibindo ${start + 1}–${end} de ${total} registro${total !== 1 ? 's' : ''}`}
          </span>

          {!hasGrouping && (
            <div style={s.footerRight}>
              {/* Linhas por página — movido para o rodapé */}
              <Dropdown
                id="pagesize"
                openId={openId}
                setOpenId={setOpenId}
                align="right"
                trigger={
                  <button type="button" style={{ ...s.ghostBtn, height: 28, padding: '0 8px' }}>
                    {pageSize} / pág <ChevronDown size={12} />
                  </button>
                }
              >
                <div style={s.dropdownLabel}>Linhas por página</div>
                {PAGE_SIZES.map(n => (
                  <div
                    key={n}
                    style={{ ...s.dropdownItem, fontWeight: n === pageSize ? 700 : 400 }}
                    onClick={() => changePageSize(n)}
                  >
                    {n === pageSize
                      ? <Check size={12} style={s.checkMark} />
                      : <span style={{ width: 12 }} />}
                    {n} linhas
                  </div>
                ))}
              </Dropdown>

              {/* Paginação */}
              <Pagination safePage={safePage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
