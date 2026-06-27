// src/components/BrowseLayout.js
// ─────────────────────────────────────────────────────────────────────────────
// Layout genérico de listagem para Pipeline, Projetos e demais entidades.
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
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, SlidersHorizontal, LayoutList, LayoutGrid,
  ChevronDown, ChevronUp, MoreHorizontal, Plus,
  ChevronsUpDown, ArrowUp, ArrowDown, Check,
  Columns, GripVertical, PencilLine, X,
} from 'lucide-react'

// ── constantes ────────────────────────────────────────────────────────────────
const PAGE_SIZES = [20, 50, 100]
const STORAGE_NS = 'browse_layout_'

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
    padding: '9px 20px', cursor: 'pointer', userSelect: 'none',
    background: 'none', border: 'none', width: '100%', fontFamily: 'var(--font)',
  },
  kpiToggleLabel: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
  },
  kpiAccentBar: {
    width: 3, height: 12, borderRadius: 2, background: 'var(--accent)', flexShrink: 0,
  },
  kpiContent: { padding: '0 20px 16px' },

  // Action bar
  actionBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap',
    transition: 'background 0.18s',
  },
  actionBarBulk: {
    background: 'var(--accent)',
    borderBottomColor: 'var(--accent2)',
  },
  actionLeft:   { display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 180 },
  actionCenter: { display: 'flex', alignItems: 'center', gap: 6 },
  actionRight:  { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },

  // search
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: '#fff', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '0 10px',
    height: 34, minWidth: 220, maxWidth: 320, transition: 'border-color 0.15s, box-shadow 0.15s',
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
    height: 34, padding: '0 12px', borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'var(--text-soft)',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  ghostBtnActive: { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-lite)' },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    cursor: 'pointer', color: 'var(--text-soft)',
  },

  // primary btn
  primaryBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    height: 34, padding: '0 16px', borderRadius: 'var(--radius-md)',
    border: 'none', background: 'var(--accent)', color: '#fff',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
    boxShadow: '0 1px 4px rgba(37,99,235,0.30)',
  },

  // bulk bar — white-on-blue when action bar turns accent
  bulkBar: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  bulkCount: {
    fontSize: 'var(--text-sm)', fontWeight: 700, color: '#fff',
    background: 'rgba(255,255,255,0.18)', borderRadius: 'var(--radius-pill)',
    padding: '2px 10px', marginRight: 4,
  },
  bulkBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 30, padding: '0 12px', borderRadius: 'var(--radius-md)',
    border: '1.5px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: '#fff',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  bulkBtnDanger: {
    border: '1.5px solid rgba(252,165,165,0.5)', background: 'rgba(220,38,38,0.20)',
    color: '#FCA5A5',
  },
  bulkCancelBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 30, padding: '0 12px', borderRadius: 'var(--radius-md)',
    border: 'none', background: 'rgba(255,255,255,0.15)',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 'auto',
  },

  // Dropdown
  dropdownWrap: { position: 'relative' },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', zIndex: 50,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
    padding: '6px 0', minWidth: 180,
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 14px', cursor: 'pointer',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'var(--text)',
  },
  dropdownDivider: { height: 1, background: 'var(--border2)', margin: '4px 0' },
  dropdownLabel: {
    padding: '6px 14px 4px',
    fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--text-muted)',
  },
  checkMark: { color: 'var(--accent)', flexShrink: 0 },

  // View toggle
  viewToggle: { display: 'flex', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  viewBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, background: 'var(--surface)', border: 'none',
    cursor: 'pointer', color: 'var(--text-muted)',
  },
  viewBtnActive: { background: 'var(--accent)', color: '#fff' },

  // Table
  tableWrap: { flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font)', fontSize: 'var(--text-sm)' },
  thead: { position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface2)', borderBottom: '2px solid var(--border)' },
  th: {
    padding: '10px 12px', textAlign: 'left', fontWeight: 700,
    fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none',
  },
  thSortable: { cursor: 'pointer' },
  thInner: { display: 'flex', alignItems: 'center', gap: 4 },
  thCheck: { width: 40, paddingLeft: 16 },
  tr: { borderBottom: '1px solid var(--border2)', transition: 'background 0.1s, box-shadow 0.1s' },
  trSelected: { background: 'var(--accent-lite)', boxShadow: 'inset 3px 0 0 var(--accent)' },
  td: { padding: '11px 12px', color: 'var(--text)', verticalAlign: 'middle' },
  tdCheck: { width: 40, paddingLeft: 16 },
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
    padding: '8px 20px', gap: 12,
    borderTop: '1px solid var(--border)',
    background: 'var(--surface)', flexShrink: 0,
  },
  footerCount: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--mono)' },
  footerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  footerPages: { display: 'flex', alignItems: 'center', gap: 4 },
  pageBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 30, height: 30, borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)',
    color: 'var(--text-soft)', cursor: 'pointer',
  },
  pageBtnActive: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', fontWeight: 700 },
  pageBtnDisabled: { opacity: 0.35, cursor: 'not-allowed' },

  // Columns dropdown drag item
  colDragItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 14px', cursor: 'default',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'var(--text)',
    userSelect: 'none',
  },
  gripHandle: { color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 },
}

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
  search           = '',
  onSearchChange,
  bulkActions      = [],
  bulkEditFields,   // [{ key, label, type:'text'|'select'|'date'|'number'|'textarea', options?:[{value,label}] }]
  onBulkEdit,       // (ids: string[], changes: Record<string,any>) => void
  renderCard,
  storageKey       = 'default',
  emptyState,
  onImport,
  onExportCsv,
  onExportExcel,
  secondaryActions,
  onRowClick,
}) {
  const storagePrefix = STORAGE_NS + storageKey

  // ── estado local ─────────────────────────────────────────────────────────
  const [kpisOpen,   setKpisOpen]   = useState(true)
  const [view,       setView]       = useState('list')
  const [sortKey,    setSortKey]    = useState(null)
  const [sortDir,    setSortDir]    = useState('asc')
  const [selected,   setSelected]   = useState(new Set())
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(() => {
    try { return Number(localStorage.getItem(storagePrefix + '_ps')) || 20 } catch { return 20 }
  })

  // Controla qual dropdown está aberto (apenas um por vez)
  const [openId, setOpenId] = useState(null)

  // Visibilidade e ordem de colunas
  const [colOrder,   setColOrder]   = useState(() => columns.map(c => c.key))
  const [hiddenCols, setHiddenCols] = useState(new Set())

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
    try { localStorage.setItem(storagePrefix + '_ps', String(n)) } catch {}
  }, [storagePrefix])

  // ── sort ─────────────────────────────────────────────────────────────────
  const handleSort = useCallback((key) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key }
      setSortDir('asc'); return key
    })
    setPage(1)
  }, [])

  // ── dados ordenados e paginados ──────────────────────────────────────────
  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const total     = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage  = Math.min(page, pageCount)
  const start     = (safePage - 1) * pageSize
  const end       = Math.min(start + pageSize, total)
  const pageRows  = sorted.slice(start, end)

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

  // ── páginas visíveis ─────────────────────────────────────────────────────
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
    onBulkEdit?.([...selected], changes)
    setBulkEditOpen(false)
    setSelected(new Set())
  }

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
              <div style={s.kpiAccentBar} />
              {kpisLabel}
            </span>
            {kpisOpen
              ? <ChevronUp   size={13} color="var(--text-muted)" />
              : <ChevronDown size={13} color="var(--text-muted)" />}
          </button>
          {kpisOpen && <div style={s.kpiContent}>{kpis}</div>}
        </div>
      )}

      {/* ── Action Bar ──────────────────────────────────────────────────── */}
      <div style={{ ...s.actionBar, ...(someSelected ? s.actionBarBulk : {}) }}>

        {/* Busca — oculta quando bulk selecionado */}
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

        {/* Bulk bar — fundo azul quando items selecionados */}
        {someSelected ? (
          <div style={s.bulkBar}>
            <span style={s.bulkCount}>{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>

            {/* Editar em lote */}
            {bulkEditFields?.length > 0 && onBulkEdit && (
              <button type="button" style={s.bulkBtn} onClick={openBulkEdit}>
                <PencilLine size={13} />
                Editar em lote
              </button>
            )}

            {bulkActions.map((a, i) => (
              <button
                key={i}
                type="button"
                style={{ ...s.bulkBtn, ...(a.variant === 'danger' ? s.bulkBtnDanger : {}) }}
                onClick={() => { a.onClick([...selected]); setSelected(new Set()) }}
              >
                {a.icon && a.icon}
                {a.label}
              </button>
            ))}
            <button
              type="button"
              style={s.bulkCancelBtn}
              onClick={() => { setSelected(new Set()); setBulkEditOpen(false) }}
            >
              <X size={13} /> Cancelar seleção
            </button>
          </div>
        ) : (
          <>
            {/* Centro: Filtros + Colunas */}
            <div style={s.actionCenter}>

              {/* Filtros */}
              {filters.length > 0 && (
                <Dropdown
                  id="filters"
                  openId={openId}
                  setOpenId={setOpenId}
                  trigger={
                    <button type="button" style={{
                      ...s.ghostBtn,
                      ...(activeFilterCount > 0 ? s.ghostBtnActive : {}),
                    }}>
                      <SlidersHorizontal size={13} />
                      Filtros
                      {activeFilterCount > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: 'var(--accent)', color: '#fff',
                          borderRadius: 10, padding: '0 5px',
                        }}>
                          {activeFilterCount}
                        </span>
                      )}
                      <ChevronDown size={12} />
                    </button>
                  }
                >
                  {filters.map((f, fi) => (
                    <div key={f.key}>
                      {fi > 0 && <div style={s.dropdownDivider} />}
                      <div style={s.dropdownLabel}>{f.label}</div>
                      {f.options.map(opt => {
                        const vals    = activeFilters[f.key] || []
                        const checked = vals.includes(opt.value)
                        return (
                          <div
                            key={opt.value}
                            style={s.dropdownItem}
                            onClick={e => {
                              e.stopPropagation()
                              const next = checked
                                ? vals.filter(v => v !== opt.value)
                                : [...vals, opt.value]
                              onFilterChange?.({ ...activeFilters, [f.key]: next })
                              setPage(1)
                            }}
                          >
                            <div style={{
                              width: 15, height: 15, borderRadius: 3,
                              border: '1.5px solid var(--border)',
                              background: checked ? 'var(--accent)' : 'var(--surface)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {checked && <Check size={10} color="#fff" />}
                            </div>
                            {opt.label}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </Dropdown>
              )}

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
                <div style={s.dropdownLabel}>Ações globais</div>
                <div style={s.dropdownItem} onClick={onExportCsv}>Exportar CSV</div>
                <div style={s.dropdownItem} onClick={onExportExcel}>Exportar Excel</div>
                <div style={s.dropdownDivider} />
                <div style={s.dropdownItem} onClick={onImport}>Importar dados</div>
              </Dropdown>

              {/* Botão primário */}
              {onNew && (
                <button type="button" style={s.primaryBtn} onClick={onNew}>
                  <Plus size={13} />
                  {newLabel}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Conteúdo: tabela ou cards ────────────────────────────────────── */}
      {total === 0 ? (
        <div style={s.emptyState}>
          {emptyState ?? (
            <>
              <Search size={32} style={{ opacity: 0.25 }} />
              <span style={{ fontSize: 'var(--text-sm)' }}>Nenhum registro encontrado.</span>
            </>
          )}
        </div>
      ) : view === 'card' && renderCard ? (
        <div style={s.cardGrid}>
          {pageRows.map(row => (
            <div key={row[keyField]} style={{ position: 'relative' }}>
              <input
                type="checkbox"
                checked={selected.has(row[keyField])}
                onChange={() => toggleRow(row[keyField])}
                style={{ ...s.checkbox, position: 'absolute', top: 10, right: 10, zIndex: 1 }}
              />
              {renderCard(row, selected.has(row[keyField]))}
            </div>
          ))}
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead style={s.thead}>
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
              {pageRows.map(row => {
                const id  = row[keyField]
                const sel = selected.has(id)
                return (
                  <tr
                    key={id}
                    style={{ ...s.tr, ...(sel ? s.trSelected : {}), ...(onRowClick ? { cursor: 'pointer' } : {}) }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onMouseEnter={e => { if (!sel) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.boxShadow = 'inset 3px 0 0 var(--accent)' } }}
                    onMouseLeave={e => { if (!sel) { e.currentTarget.style.background = ''; e.currentTarget.style.boxShadow = '' } }}
                  >
                    <td style={{ ...s.td, ...s.tdCheck }}>
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleRow(id)}
                        style={s.checkbox}
                      />
                    </td>
                    {visibleColumns.map(col => (
                      <td key={col.key} style={s.td}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
            Exibindo {start + 1}–{end} de {total} registro{total !== 1 ? 's' : ''}
          </span>

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
            <div style={s.footerPages}>
              <button
                type="button"
                style={{ ...s.pageBtn, ...(safePage === 1 ? s.pageBtnDisabled : {}) }}
                onClick={() => setPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                style={{ ...s.pageBtn, ...(safePage === pageCount ? s.pageBtnDisabled : {}) }}
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={safePage === pageCount}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
