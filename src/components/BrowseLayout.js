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
import {
  Search, SlidersHorizontal, LayoutList, LayoutGrid,
  ChevronDown, ChevronUp, MoreHorizontal, Plus,
  ChevronsUpDown, ArrowUp, ArrowDown, Check,
  Columns, GripVertical,
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
    padding: '8px 20px', cursor: 'pointer', userSelect: 'none',
    background: 'none', border: 'none', width: '100%', fontFamily: 'var(--font)',
  },
  kpiToggleLabel: {
    fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
  },
  kpiContent: { padding: '0 20px 16px' },

  // Action bar
  actionBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap',
  },
  actionLeft:   { display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 180 },
  actionCenter: { display: 'flex', alignItems: 'center', gap: 6 },
  actionRight:  { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },

  // search
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'var(--surface2)', border: '1px solid var(--border)',
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
    border: '1px solid var(--border)', background: 'var(--surface)',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'var(--text-soft)',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  ghostBtnActive: { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-lite)' },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'var(--surface)',
    cursor: 'pointer', color: 'var(--text-soft)',
  },

  // primary btn
  primaryBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)',
    border: 'none', background: 'var(--accent)', color: '#fff',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },

  // bulk bar
  bulkBar: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  bulkCount: { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--accent)', marginRight: 4 },
  bulkBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 30, padding: '0 12px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'var(--surface)',
    fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'var(--text-soft)',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  bulkBtnDanger: { borderColor: 'var(--red)', color: 'var(--red)' },

  // Dropdown
  dropdownWrap: { position: 'relative' },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', zIndex: 50,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
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
  thead: { position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface2)', borderBottom: '1px solid var(--border)' },
  th: {
    padding: '9px 12px', textAlign: 'left', fontWeight: 700,
    fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none',
  },
  thSortable: { cursor: 'pointer' },
  thInner: { display: 'flex', alignItems: 'center', gap: 4 },
  thCheck: { width: 40, paddingLeft: 16 },
  tr: { borderBottom: '1px solid var(--border2)', transition: 'background 0.1s' },
  trSelected: { background: 'var(--accent-lite)' },
  td: { padding: '10px 12px', color: 'var(--text)', verticalAlign: 'middle' },
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

// ── Utilitário: fechar dropdown ao clicar fora ────────────────────────────────
function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, onClose])
}

// ── Dropdown controlado — só um abre por vez via openId ───────────────────────
function Dropdown({ id, openId, setOpenId, trigger, children, align = 'left', minWidth }) {
  const open = openId === id
  const ref  = useRef(null)
  useClickOutside(ref, useCallback(() => { if (open) setOpenId(null) }, [open, setOpenId]))
  return (
    <div ref={ref} style={s.dropdownWrap}>
      <div onClick={() => setOpenId(open ? null : id)}>{trigger}</div>
      {open && (
        <div
          style={{
            ...s.dropdown,
            [align === 'right' ? 'right' : 'left']: 0,
            ...(minWidth ? { minWidth } : {}),
          }}
        >
          {children}
        </div>
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
            <span style={s.kpiToggleLabel}>{kpisLabel}</span>
            {kpisOpen
              ? <ChevronUp   size={13} color="var(--text-muted)" />
              : <ChevronDown size={13} color="var(--text-muted)" />}
          </button>
          {kpisOpen && <div style={s.kpiContent}>{kpis}</div>}
        </div>
      )}

      {/* ── Action Bar ──────────────────────────────────────────────────── */}
      <div style={s.actionBar}>

        {/* Busca */}
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

        {/* Bulk bar ou controles normais */}
        {someSelected ? (
          <div style={s.bulkBar}>
            <span style={s.bulkCount}>{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>
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
              style={{ ...s.bulkBtn, color: 'var(--text-muted)' }}
              onClick={() => setSelected(new Set())}
            >
              Cancelar
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
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = '' }}
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
