// src/components/ui/PipelineLayout.js
// ─────────────────────────────────────────────────────────────────────────────
// Layout de listagem especializado para Pipeline.
// Extende BrowseLayout com:
//   • Modo Kanban (colunas = etapas do funil, drag-and-drop de cards)
//   • Seletor de funil ativo
//   • Filtro de vendedores (multiselect)
//   • Ordenação rápida por campo
//
// Props:
//   columns        {key, label, sortable?, width?, render?}[]
//   data           object[]
//   keyField       string                          (default: 'id')
//   stageField     string                          (default: 'stage')   ← campo que mapeia à etapa
//   valueField     string                          (default: 'value')   ← valor monetário do card
//   sellerField    string                          (default: 'seller')  ← vendedor do card
//
//   funnels        {id, label}[]                  lista de funis disponíveis
//   activeFunnel   string                          id do funil ativo (controlado)
//   onFunnelChange (id) => void
//
//   stages         {id, label, color?}[]           etapas do funil (ordem das colunas Kanban)
//   onStageChange  (rowId, newStageId) => void      callback ao mover card
//
//   sellers        {id, label}[]                  lista de vendedores para o filtro
//   selectedSellers string[]                       ids selecionados (controlado)
//   onSellersChange (ids) => void
//
//   sort           {key: string, dir: 'asc'|'desc'}
//   onSortChange   ({key, dir}) => void
//   sortOptions    {key, label}[]
//
//   search         string
//   onSearchChange (v) => void
//
//   onNew          () => void
//   newLabel       string                          (default: '+ Nova Oportunidade')
//
//   bulkActions    {label, icon?, variant?, onClick:(ids)=>void}[]
//   renderCard     (row, selected) => ReactNode    card customizado (Card e Kanban)
//   kpis           ReactNode
//   kpisLabel      string
//   emptyState     ReactNode
//   storageKey     string
//   canManage      bool                            false → desabilita drag-and-drop e troca de funil
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, Plus, ChevronDown, MoreHorizontal,
  LayoutList, LayoutGrid, Kanban,
  ChevronsUpDown, ArrowUp, ArrowDown, Check,
  SlidersHorizontal, Users, Flag, X,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Paleta Zinc (isolada do tema geral, igual ao SettingsLayout)
// ─────────────────────────────────────────────────────────────────────────────
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
  danger:   '#DC2626',
}

const PAGE_SIZES = [20, 50, 100]
const STORAGE_NS = 'pipeline_layout_'

// ─────────────────────────────────────────────────────────────────────────────
// Estilos base
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'var(--bg, #F8FAFC)', overflow: 'hidden',
  },
  kpiBar: { borderBottom: `1px solid ${Z[200]}`, background: Z.white, flexShrink: 0 },
  kpiToggle: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 20px', cursor: 'pointer', userSelect: 'none',
    background: 'none', border: 'none', width: '100%', fontFamily: 'var(--font)',
  },
  kpiContent: { padding: '0 20px 16px' },
  actionBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderBottom: `1px solid ${Z[200]}`,
    background: Z.white, flexShrink: 0, flexWrap: 'wrap',
  },
  ghostBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 32, padding: '0 10px', borderRadius: 6,
    border: `1px solid ${Z[200]}`, background: Z.white,
    fontFamily: 'var(--font)', fontSize: 13, color: Z[500],
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  ghostBtnActive: {
    borderColor: Z.blue, color: Z.blue, background: Z.blueLite,
  },
  primaryBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: 32, padding: '0 14px', borderRadius: 6,
    border: 'none', background: Z.blue, color: '#fff',
    fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 6,
    border: `1px solid ${Z[200]}`, background: Z.white,
    cursor: 'pointer', color: Z[500],
  },
  viewToggle: {
    display: 'flex', border: `1px solid ${Z[200]}`, borderRadius: 6, overflow: 'hidden',
  },
  viewBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, background: Z.white, border: 'none',
    cursor: 'pointer', color: Z[400],
  },
  viewBtnActive: { background: Z.blue, color: '#fff' },
  dropdownWrap: { position: 'relative' },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', zIndex: 50,
    background: Z.white, border: `1px solid ${Z[200]}`,
    borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 32px -4px rgba(0,0,0,0.12)',
    padding: '6px 0', minWidth: 200,
  },
  dropdownLabel: {
    padding: '6px 14px 4px',
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: Z[300],
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '8px 14px', cursor: 'pointer',
    fontFamily: 'var(--font)', fontSize: 13, color: Z[700],
    background: 'transparent', border: 'none', width: '100%', textAlign: 'left',
    lineHeight: '1.4',
  },
  dropdownDivider: { height: 1, background: Z[100], margin: '4px 0' },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: Z[50], border: `1px solid ${Z[200]}`,
    borderRadius: 6, padding: '0 10px',
    height: 32, minWidth: 200, maxWidth: 300,
  },
  searchInput: {
    border: 'none', outline: 'none', background: 'transparent',
    fontFamily: 'var(--font)', fontSize: 13,
    color: Z[900], flex: 1, minWidth: 0, lineHeight: 'normal',
  },
  // Table
  tableWrap: { flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font)', fontSize: 13 },
  th: {
    padding: '9px 12px', textAlign: 'left', fontWeight: 700,
    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: Z[400], whiteSpace: 'nowrap', userSelect: 'none',
    background: Z[50], position: 'sticky', top: 0,
  },
  td: { padding: '10px 12px', color: Z[900], verticalAlign: 'middle', borderBottom: `1px solid ${Z[200]}` },
  checkbox: { width: 15, height: 15, accentColor: Z.blue, cursor: 'pointer' },
  // Footer
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 20px', borderTop: `1px solid ${Z[200]}`,
    background: Z.white, flexShrink: 0,
  },
  pageBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 28, height: 28, borderRadius: 4,
    border: `1px solid ${Z[200]}`, background: Z.white,
    fontFamily: 'var(--font)', fontSize: 12,
    color: Z[500], cursor: 'pointer',
  },
  pageBtnActive: { background: Z.blue, color: '#fff', borderColor: Z.blue, fontWeight: 700 },
  // Kanban
  kanbanWrap: {
    flex: 1, overflowX: 'auto', overflowY: 'hidden',
    display: 'flex', gap: 12, padding: '16px 20px',
    minHeight: 0,
  },
  kanbanCol: {
    flexShrink: 0, width: 260,
    display: 'flex', flexDirection: 'column', gap: 8,
    background: Z[100], borderRadius: 8, padding: '10px 8px',
  },
  kanbanColHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '2px 4px 8px',
  },
  kanbanCard: {
    background: Z.white, border: `1px solid ${Z[200]}`,
    borderRadius: 6, padding: '10px 12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    cursor: 'grab', userSelect: 'none',
    transition: 'box-shadow 0.15s, opacity 0.15s',
  },
  kanbanCardDragging: {
    opacity: 0.45, boxShadow: 'none',
  },
  kanbanCardOver: {
    boxShadow: `0 0 0 2px ${Z.blue}`,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// useClickOutside
// ─────────────────────────────────────────────────────────────────────────────
function useClickOutside(ref, onClose) {
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, onClose])
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown controlado — só um abre por vez
// ─────────────────────────────────────────────────────────────────────────────
function Dropdown({ id, openId, setOpenId, trigger, children, align = 'left', minWidth }) {
  const open = openId === id
  const ref  = useRef(null)
  useClickOutside(ref, useCallback(() => { if (open) setOpenId(null) }, [open, setOpenId]))
  return (
    <div ref={ref} style={s.dropdownWrap}>
      <div onClick={() => setOpenId(open ? null : id)}>{trigger}</div>
      {open && (
        <div style={{
          ...s.dropdown,
          [align === 'right' ? 'right' : 'left']: 0,
          ...(minWidth ? { minWidth } : {}),
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Seletor de Funil
// ─────────────────────────────────────────────────────────────────────────────
function FunnelSelector({ funnels, activeFunnel, onFunnelChange, openId, setOpenId, canManage }) {
  const active = funnels.find(f => f.id === activeFunnel) ?? funnels[0]
  return (
    <Dropdown
      id="funnel"
      openId={openId}
      setOpenId={setOpenId}
      minWidth={220}
      trigger={
        <button
          type="button"
          disabled={!canManage}
          title={canManage ? undefined : 'Sem permissão para trocar funil'}
          style={{
            ...s.ghostBtn,
            ...(active ? s.ghostBtnActive : {}),
            ...(canManage ? {} : { cursor: 'not-allowed', opacity: 0.55 }),
          }}
        >
          <Flag size={13} />
          {active?.label ?? 'Funil'}
          <ChevronDown size={12} />
        </button>
      }
    >
      <div style={s.dropdownLabel}>Funis disponíveis</div>
      {funnels.map(f => (
        <button
          key={f.id}
          type="button"
          style={{
            ...s.dropdownItem,
            fontWeight: f.id === activeFunnel ? 600 : 400,
            color: f.id === activeFunnel ? Z[900] : Z[700],
          }}
          onClick={() => { if (canManage) onFunnelChange?.(f.id) }}
          onMouseEnter={e => e.currentTarget.style.background = Z[50]}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {f.id === activeFunnel
            ? <Check size={12} style={{ color: Z.blue, flexShrink: 0 }} />
            : <span style={{ width: 12, flexShrink: 0 }} />}
          {f.label}
        </button>
      ))}
    </Dropdown>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtro de Vendedores (multiselect)
// ─────────────────────────────────────────────────────────────────────────────
function SellerFilter({ sellers, selected, onChange, openId, setOpenId }) {
  const active = selected.length > 0
  return (
    <Dropdown
      id="sellers"
      openId={openId}
      setOpenId={setOpenId}
      minWidth={210}
      trigger={
        <button type="button" style={{ ...s.ghostBtn, ...(active ? s.ghostBtnActive : {}) }}>
          <Users size={13} />
          Vendedores
          {active && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: Z.blue, color: '#fff',
              borderRadius: 10, padding: '0 5px', minWidth: 16, textAlign: 'center',
            }}>
              {selected.length}
            </span>
          )}
          <ChevronDown size={12} />
        </button>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 12px 3px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: Z[400] }}>
          Vendedores
        </span>
        {active && (
          <button
            type="button"
            onClick={() => onChange([])}
            style={{ background: 'none', border: 'none', fontSize: 11, color: Z[400], cursor: 'pointer', padding: '1px 3px' }}
          >
            Limpar
          </button>
        )}
      </div>
      {sellers.map(s_ => {
        const checked = selected.includes(s_.id)
        return (
          <button
            key={s_.id}
            type="button"
            onClick={() => {
              const next = checked ? selected.filter(id => id !== s_.id) : [...selected, s_.id]
              onChange(next)
            }}
            style={{ ...s.dropdownItem, fontWeight: checked ? 500 : 400 }}
            onMouseEnter={e => e.currentTarget.style.background = Z[50]}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: 15, height: 15, borderRadius: 3,
              border: `1.5px solid ${Z[300]}`,
              background: checked ? Z.blue : Z.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {checked && <Check size={10} color="#fff" />}
            </div>
            {s_.label}
          </button>
        )
      })}
    </Dropdown>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown de Ordenação
// ─────────────────────────────────────────────────────────────────────────────
function SortButton({ options, sort, onChange, openId, setOpenId }) {
  const current = options.find(o => o.key === sort?.key)
  const active  = !!current
  return (
    <Dropdown
      id="sort"
      openId={openId}
      setOpenId={setOpenId}
      minWidth={200}
      trigger={
        <button type="button" style={{ ...s.ghostBtn, ...(active ? s.ghostBtnActive : {}) }}>
          <ChevronsUpDown size={13} />
          {active ? current.label : 'Ordenar'}
          {active && (sort.dir === 'asc'
            ? <ArrowUp size={11} style={{ color: Z.blue }} />
            : <ArrowDown size={11} style={{ color: Z.blue }} />)}
          <ChevronDown size={12} />
        </button>
      }
    >
      <div style={s.dropdownLabel}>Ordenar por</div>
      {options.map(o => {
        const isActive = sort?.key === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange({
              key: o.key,
              dir: isActive && sort.dir === 'asc' ? 'desc' : 'asc',
            })}
            style={{
              ...s.dropdownItem,
              background: isActive ? Z[50] : 'transparent',
              fontWeight: isActive ? 500 : 400,
              justifyContent: 'space-between',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = Z[50] }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            {o.label}
            {isActive && (sort.dir === 'asc'
              ? <ArrowUp size={12} color={Z.blue} />
              : <ArrowDown size={12} color={Z.blue} />)}
          </button>
        )
      })}
      {active && (
        <>
          <div style={s.dropdownDivider} />
          <button
            type="button"
            style={{ ...s.dropdownItem, color: Z[400] }}
            onClick={() => onChange(null)}
            onMouseEnter={e => e.currentTarget.style.background = Z[50]}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={12} /> Limpar ordenação
          </button>
        </>
      )}
    </Dropdown>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Card padrão do Kanban
// ─────────────────────────────────────────────────────────────────────────────
function DefaultKanbanCard({ row, valueField, sellerField }) {
  const value  = row[valueField]
  const seller = row[sellerField]
  const keys   = Object.keys(row).filter(k => k !== 'id' && k !== valueField && k !== sellerField)

  const fmt = (v) => {
    if (v == null) return '—'
    if (typeof v === 'number') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    return String(v)
  }

  return (
    <>
      <div style={{
        fontSize: 13, fontWeight: 600, color: Z[900],
        marginBottom: 6, lineHeight: 1.3,
      }}>
        {row[keys[0]] ?? row.id}
      </div>
      {keys.slice(1, 3).map(k => (
        <div key={k} style={{ fontSize: 12, color: Z[500], marginBottom: 2 }}>
          {fmt(row[k])}
        </div>
      ))}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 8,
      }}>
        {value != null && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: Z.blue,
          }}>
            {typeof value === 'number'
              ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : value}
          </span>
        )}
        {seller && (
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: Z[500], background: Z[100],
            borderRadius: 4, padding: '2px 6px',
          }}>
            {seller}
          </span>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coluna Kanban
// ─────────────────────────────────────────────────────────────────────────────
function KanbanColumn({ stage, cards, canManage, onDrop, renderCard, keyField, valueField, sellerField }) {
  const [dragOver, setDragOver] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [overCardId, setOverCardId] = useState(null)

  const stageColor = stage.color ?? Z.blue

  function handleDragStart(e, id) {
    if (!canManage) { e.preventDefault(); return }
    setDraggingId(id)
    e.dataTransfer.setData('cardId', id)
    e.dataTransfer.setData('fromStage', stage.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggingId(null)
    setOverCardId(null)
  }

  function handleDragOver(e) {
    if (!canManage) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    setDraggingId(null)
    setOverCardId(null)
    const cardId   = e.dataTransfer.getData('cardId')
    const fromStage = e.dataTransfer.getData('fromStage')
    if (cardId && fromStage !== stage.id) {
      onDrop?.(cardId, stage.id)
    }
  }

  return (
    <div
      style={{
        ...s.kanbanCol,
        outline: dragOver ? `2px dashed ${stageColor}` : 'none',
        outlineOffset: -2,
      }}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header da coluna */}
      <div style={s.kanbanColHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: stageColor, display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{
            fontSize: 12, fontWeight: 600, color: Z[700],
            fontFamily: 'var(--font)',
          }}>
            {stage.label}
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500, color: Z[400],
          background: Z[200], borderRadius: 10, padding: '1px 7px',
        }}>
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {cards.map(row => {
          const id       = row[keyField]
          const isDragging = draggingId === id
          const isOver   = overCardId === id
          return (
            <div
              key={id}
              draggable={canManage}
              onDragStart={e => handleDragStart(e, id)}
              onDragEnd={handleDragEnd}
              onDragEnter={() => setOverCardId(id)}
              onDragLeave={() => setOverCardId(null)}
              style={{
                ...s.kanbanCard,
                ...(isDragging ? s.kanbanCardDragging : {}),
                ...(isOver && !isDragging ? s.kanbanCardOver : {}),
                cursor: canManage ? 'grab' : 'not-allowed',
              }}
            >
              {renderCard
                ? renderCard(row, false)
                : <DefaultKanbanCard row={row} valueField={valueField} sellerField={sellerField} />}
            </div>
          )
        })}
        {cards.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '20px 8px',
            fontSize: 12, color: Z[300],
            fontFamily: 'var(--font)',
          }}>
            Sem registros
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineLayout — componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function PipelineLayout({
  columns       = [],
  data          = [],
  keyField      = 'id',
  stageField    = 'stage',
  valueField    = 'value',
  sellerField   = 'seller',

  funnels       = [],
  activeFunnel,
  onFunnelChange,

  stages        = [],
  onStageChange,

  sellers       = [],
  selectedSellers = [],
  onSellersChange,

  sort,
  onSortChange,
  sortOptions,

  search        = '',
  onSearchChange,

  onNew,
  newLabel      = '+ Nova Oportunidade',

  bulkActions   = [],
  renderCard,
  kpis,
  kpisLabel     = 'Indicadores',
  emptyState,
  storageKey    = 'default',
  canManage     = true,
}) {
  const storagePrefix = STORAGE_NS + storageKey

  const [kpisOpen, setKpisOpen]   = useState(true)
  const [view,     setView]       = useState('list')
  const [selected, setSelected]   = useState(new Set())
  const [page,     setPage]       = useState(1)
  const [pageSize, setPageSize]   = useState(() => {
    try { return Number(localStorage.getItem(storagePrefix + '_ps')) || 20 } catch { return 20 }
  })
  const [openId, setOpenId] = useState(null)
  const [localSearch, setLocalSearch] = useState(search)

  // propagate local search
  useEffect(() => { onSearchChange?.(localSearch) }, [localSearch]) // eslint-disable-line
  useEffect(() => { if (search !== localSearch) setLocalSearch(search) }, [search]) // eslint-disable-line

  // sort local fallback
  const [localSort, setLocalSort] = useState(sort ?? null)
  const effectiveSort   = sort   !== undefined ? sort   : localSort
  const effectiveSortCb = onSortChange ?? setLocalSort

  // search ref for Ctrl+K
  const searchRef = useRef(null)
  useEffect(() => {
    function h(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // default sort options
  const resolvedSortOptions = sortOptions ?? [
    { key: 'created_at', label: 'Data de criação' },
    { key: 'value',      label: 'Valor' },
    { key: 'name',       label: 'Nome' },
    ...columns.filter(c => c.sortable !== false).map(c => ({ key: c.key, label: c.label })),
  ]

  // apply sort + filter
  const filtered = data.filter(row => {
    if (selectedSellers.length > 0 && !selectedSellers.includes(row[sellerField])) return false
    if (localSearch) {
      const q = localSearch.toLowerCase()
      return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (!effectiveSort) return 0
    const av = a[effectiveSort.key] ?? '', bv = b[effectiveSort.key] ?? ''
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return effectiveSort.dir === 'asc' ? cmp : -cmp
  })

  // pagination (list / card)
  const total     = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage  = Math.min(page, pageCount)
  const start     = (safePage - 1) * pageSize
  const end       = Math.min(start + pageSize, total)
  const pageRows  = sorted.slice(start, end)

  // selection
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

  const changePageSize = useCallback((n) => {
    setPageSize(n)
    setPage(1)
    setOpenId(null)
    try { localStorage.setItem(storagePrefix + '_ps', String(n)) } catch {}
  }, [storagePrefix])

  // Kanban: agrupar por etapa
  const stageMap = {}
  stages.forEach(st => { stageMap[st.id] = [] })
  sorted.forEach(row => {
    const stId = row[stageField]
    if (stageMap[stId]) stageMap[stId].push(row)
    else {
      stageMap['__unknown'] = stageMap['__unknown'] ?? []
      stageMap['__unknown'].push(row)
    }
  })

  function handleKanbanDrop(cardId, newStageId) {
    if (!canManage) return
    onStageChange?.(cardId, newStageId)
  }

  // active filter count
  const filterCount = selectedSellers.length

  // visible pages
  function visiblePages() {
    const pages = []
    for (let i = 1; i <= pageCount; i++) {
      if (i === 1 || i === pageCount || (i >= safePage - 1 && i <= safePage + 1)) pages.push(i)
      else if (pages[pages.length - 1] !== '…') pages.push('…')
    }
    return pages
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>

      {/* KPI Header */}
      {kpis && (
        <div style={s.kpiBar}>
          <button type="button" style={s.kpiToggle} onClick={() => setKpisOpen(o => !o)}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: Z[400] }}>
              {kpisLabel}
            </span>
            <ChevronDown size={13} color={Z[400]} style={{ transform: kpisOpen ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
          </button>
          {kpisOpen && <div style={s.kpiContent}>{kpis}</div>}
        </div>
      )}

      {/* Action Bar */}
      <div style={s.actionBar}>

        {/* Seletor de Funil */}
        {funnels.length > 0 && (
          <FunnelSelector
            funnels={funnels}
            activeFunnel={activeFunnel}
            onFunnelChange={onFunnelChange}
            openId={openId}
            setOpenId={setOpenId}
            canManage={canManage}
          />
        )}

        {funnels.length > 0 && (
          <div style={{ width: 1, height: 20, background: Z[200], flexShrink: 0 }} />
        )}

        {/* Busca */}
        <div style={s.searchWrap}>
          <Search size={13} color={Z[400]} style={{ flexShrink: 0 }} />
          <input
            ref={searchRef}
            style={s.searchInput}
            placeholder="Buscar…"
            value={localSearch}
            onChange={e => { setLocalSearch(e.target.value); setPage(1) }}
          />
          {localSearch && (
            <X size={13} color={Z[400]} style={{ cursor: 'pointer' }} onClick={() => setLocalSearch('')} />
          )}
        </div>

        {someSelected ? (
          /* Bulk bar */
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: Z.blue }}>
              {selected.size} selecionado{selected.size > 1 ? 's' : ''}
            </span>
            {bulkActions.map((a, i) => (
              <button
                key={i}
                type="button"
                style={{ ...s.ghostBtn, ...(a.variant === 'danger' ? { color: Z.danger, borderColor: Z.danger } : {}) }}
                onClick={() => { a.onClick([...selected]); setSelected(new Set()) }}
              >
                {a.icon} {a.label}
              </button>
            ))}
            <button type="button" style={{ ...s.ghostBtn, color: Z[400] }} onClick={() => setSelected(new Set())}>
              Cancelar
            </button>
          </div>
        ) : (
          <>
            {/* Ordenação */}
            <SortButton
              options={resolvedSortOptions}
              sort={effectiveSort}
              onChange={effectiveSortCb}
              openId={openId}
              setOpenId={setOpenId}
            />

            {/* Vendedores */}
            {sellers.length > 0 && (
              <SellerFilter
                sellers={sellers}
                selected={selectedSellers}
                onChange={onSellersChange ?? (() => {})}
                openId={openId}
                setOpenId={setOpenId}
              />
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* View toggle */}
            <div style={s.viewToggle}>
              <button
                type="button"
                title="Listagem"
                style={{ ...s.viewBtn, ...(view === 'list' ? s.viewBtnActive : {}) }}
                onClick={() => setView('list')}
              >
                <LayoutList size={13} />
              </button>
              {renderCard && (
                <button
                  type="button"
                  title="Cards"
                  style={{ ...s.viewBtn, ...(view === 'card' ? s.viewBtnActive : {}) }}
                  onClick={() => setView('card')}
                >
                  <LayoutGrid size={13} />
                </button>
              )}
              {stages.length > 0 && (
                <button
                  type="button"
                  title="Kanban"
                  style={{ ...s.viewBtn, ...(view === 'kanban' ? s.viewBtnActive : {}) }}
                  onClick={() => setView('kanban')}
                >
                  <Kanban size={13} />
                </button>
              )}
            </div>

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
              <button type="button" style={s.dropdownItem} onMouseEnter={e => e.currentTarget.style.background = Z[50]} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Exportar CSV</button>
              <button type="button" style={s.dropdownItem} onMouseEnter={e => e.currentTarget.style.background = Z[50]} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Exportar Excel</button>
              <div style={s.dropdownDivider} />
              <button type="button" style={s.dropdownItem} onMouseEnter={e => e.currentTarget.style.background = Z[50]} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Importar dados</button>
            </Dropdown>

            {/* Botão primário */}
            {onNew && (
              <button type="button" style={s.primaryBtn} onClick={onNew}>
                <Plus size={13} />
                {newLabel}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────────────── */}

      {/* Kanban */}
      {view === 'kanban' ? (
        <div style={s.kanbanWrap}>
          {stages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              cards={stageMap[stage.id] ?? []}
              canManage={canManage}
              onDrop={handleKanbanDrop}
              renderCard={renderCard}
              keyField={keyField}
              valueField={valueField}
              sellerField={sellerField}
            />
          ))}
        </div>

      /* Cards */
      ) : view === 'card' && renderCard ? (
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12, alignContent: 'start',
        }}>
          {total === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: Z[300], fontSize: 13 }}>
              {emptyState ?? 'Nenhum registro encontrado.'}
            </div>
          ) : pageRows.map(row => (
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

      /* Lista (table) */
      ) : total === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: Z[300], fontSize: 13 }}>
          {emptyState ?? (<><Search size={32} style={{ opacity: 0.3 }} /><span>Nenhum registro encontrado.</span></>)}
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${Z[200]}` }}>
                <th style={{ ...s.th, width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAll} style={s.checkbox} />
                </th>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{ ...s.th, cursor: col.sortable !== false ? 'pointer' : 'default', width: col.width }}
                    onClick={col.sortable !== false
                      ? () => effectiveSortCb({ key: col.key, dir: effectiveSort?.key === col.key && effectiveSort?.dir === 'asc' ? 'desc' : 'asc' })
                      : undefined}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {col.sortable !== false && (
                        effectiveSort?.key === col.key
                          ? effectiveSort.dir === 'asc'
                            ? <ArrowUp size={10} color={Z.blue} />
                            : <ArrowDown size={10} color={Z.blue} />
                          : <ChevronsUpDown size={10} color={Z[300]} />
                      )}
                    </span>
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
                    style={{ borderBottom: `1px solid ${Z[200]}`, background: sel ? Z.blueLite : undefined }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = Z[50] }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = '' }}
                  >
                    <td style={{ ...s.td, width: 40, paddingLeft: 16 }}>
                      <input type="checkbox" checked={sel} onChange={() => toggleRow(id)} style={s.checkbox} />
                    </td>
                    {columns.map(col => (
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

      {/* Footer (list + card views) */}
      {view !== 'kanban' && total > 0 && (
        <div style={s.footer}>
          <span style={{ fontSize: 11, color: Z[400] }}>
            Exibindo {start + 1}–{end} de {total} registro{total !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Dropdown
              id="pagesize"
              openId={openId}
              setOpenId={setOpenId}
              align="right"
              trigger={
                <button type="button" style={{ ...s.ghostBtn, height: 28, padding: '0 8px', fontSize: 12 }}>
                  {pageSize} / pág <ChevronDown size={12} />
                </button>
              }
            >
              <div style={s.dropdownLabel}>Linhas por página</div>
              {PAGE_SIZES.map(n => (
                <button
                  key={n}
                  type="button"
                  style={{ ...s.dropdownItem, fontWeight: n === pageSize ? 700 : 400 }}
                  onClick={() => changePageSize(n)}
                  onMouseEnter={e => e.currentTarget.style.background = Z[50]}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {n === pageSize ? <Check size={12} color={Z.blue} /> : <span style={{ width: 12 }} />}
                  {n} linhas
                </button>
              ))}
            </Dropdown>

            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button
                type="button"
                style={{ ...s.pageBtn, ...(safePage === 1 ? { opacity: 0.35, cursor: 'not-allowed' } : {}) }}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >‹</button>
              {visiblePages().map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} style={{ ...s.pageBtn, border: 'none', cursor: 'default' }}>…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    style={{ ...s.pageBtn, ...(p === safePage ? s.pageBtnActive : {}) }}
                    onClick={() => setPage(p)}
                  >{p}</button>
                )
              )}
              <button
                type="button"
                style={{ ...s.pageBtn, ...(safePage === pageCount ? { opacity: 0.35, cursor: 'not-allowed' } : {}) }}
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={safePage === pageCount}
              >›</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban footer: totais por coluna */}
      {view === 'kanban' && (
        <div style={{ ...s.footer, justifyContent: 'flex-start', gap: 20 }}>
          {stages.map(st => (
            <span key={st.id} style={{ fontSize: 11, color: Z[400] }}>
              <span style={{ fontWeight: 600, color: Z[700] }}>{stageMap[st.id]?.length ?? 0}</span>
              &nbsp;{st.label}
            </span>
          ))}
          {!canManage && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: Z[400], fontStyle: 'italic' }}>
              Modo somente leitura — drag-and-drop desabilitado
            </span>
          )}
        </div>
      )}
    </div>
  )
}
