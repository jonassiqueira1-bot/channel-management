// src/components/ui/SettingsLayout.js
// ─────────────────────────────────────────────────────────────────────────────
// Layout de CRUD compacto para telas de Configurações (submenus).
// Sem KPIs, sem cards, sem bulk-select. Foco em operação de registros.
//
// Props:
//   columns      {key, label, priority?, width?, render?, align?}[]
//                  priority: 1=sempre visível | 2=oculta <540px | 3=oculta <720px
//   data         object[]
//   keyField     string                       (default: 'id')
//   onNew        () => void
//   newLabel     string                       (default: '+ Novo')
//   rowActions   {label, icon?, danger?, onClick:(row)=>void}[]
//   loading      bool
//   emptyLabel   string
//   sortOptions  {key, label}[]               (default: usa os próprios labels das colunas)
//   sort         {key: string, dir: 'asc'|'desc'}
//   onSortChange ({key, dir}) => void
//   search       string                       (controlado)
//   onSearchChange (v:string) => void         (chamado com debounce de 250 ms)
//   onExportCsv  () => void
//   onExportExcel () => void
//   onImport     () => void
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, ChevronsUpDown, ArrowUp, ArrowDown,
         MoreHorizontal, ChevronDown, Loader2,
         Download, Upload, FileSpreadsheet } from 'lucide-react'

// Props adicionais vs. versão anterior:
//   title        string              — título da seção (ex: "Usuários")
//   description  string              — subtítulo / descrição curta
//   icon         ReactNode           — ícone lucide (ex: <Users size={16} />)
//
// ── Paleta zinc (sem variáveis CSS para não misturar com o tema geral) ────────
const Z = {
  white:   '#FFFFFF',
  50:      '#FAFAFA',
  100:     '#F4F4F5',
  200:     '#E4E4E7',
  300:     '#D4D4D8',
  400:     '#A1A1AA',
  500:     '#71717A',
  700:     '#3F3F46',
  900:     '#18181B',
  blue:    '#1E3A5F',
  blueHov: '#2E5090',
  danger:  '#DC2626',
  dangerBg:'#FEF2F2',
}

// ── Breakpoints de container para ocultar colunas por prioridade ───────────────
const PRIORITY_BREAK = { 2: 540, 3: 720 }

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Dropdown de ações da linha ────────────────────────────────────────────────
function RowMenu({ actions, row }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  if (!actions?.length) return null

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 4,
          border: 'none', background: 'transparent',
          cursor: 'pointer', color: Z[400],
          opacity: open ? 1 : undefined,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = Z[100]; e.currentTarget.style.color = Z[700] }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = Z[400] } }}
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 3px)', right: 0, zIndex: 100,
          background: Z.white, border: `1px solid ${Z[200]}`,
          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          padding: '3px 0', minWidth: 150,
        }}>
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { a.onClick(row); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 12px',
                border: 'none', background: 'transparent',
                fontFamily: 'var(--font)', fontSize: 13,
                color: a.danger ? Z.danger : Z[700],
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = a.danger ? Z.dangerBg : Z[50]}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {a.icon && <span style={{ flexShrink: 0 }}>{a.icon}</span>}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dropdown global (importar / exportar) ─────────────────────────────────────
function GlobalMenu({ onExportCsv, onExportExcel, onImport }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const items = [
    { label: 'Exportar CSV',   icon: <Download size={13} />,         onClick: onExportCsv },
    { label: 'Exportar Excel', icon: <FileSpreadsheet size={13} />,  onClick: onExportExcel },
    null, // divider
    { label: 'Importar dados', icon: <Upload size={13} />,           onClick: onImport },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Mais ações"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 6,
          border: `1px solid ${Z[200]}`, background: Z.white,
          cursor: 'pointer', color: Z[500],
        }}
        onMouseEnter={e => { e.currentTarget.style.background = Z[100] }}
        onMouseLeave={e => { e.currentTarget.style.background = Z.white }}
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
          background: Z.white, border: `1px solid ${Z[200]}`,
          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          padding: '3px 0', minWidth: 170,
        }}>
          <div style={{
            padding: '4px 12px 3px',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: Z[400],
          }}>
            Ações globais
          </div>
          {items.map((item, i) =>
            item === null ? (
              <div key={`d-${i}`} style={{ height: 1, background: Z[200], margin: '3px 0' }} />
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={() => { item.onClick?.(); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 12px',
                  border: 'none', background: 'transparent',
                  fontFamily: 'var(--font)', fontSize: 13,
                  color: Z[700], cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = Z[50]}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: Z[400], flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── Dropdown de ordenação ─────────────────────────────────────────────────────
function SortDropdown({ options, sort, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const current = options.find(o => o.key === sort?.key)

  function select(key) {
    if (sort?.key === key) {
      onChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' })
    } else {
      onChange({ key, dir: 'asc' })
    }
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px',
          border: `1px solid ${Z[200]}`, borderRadius: 6,
          background: Z.white, fontFamily: 'var(--font)',
          fontSize: 12, color: Z[700], cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <ChevronsUpDown size={13} color={Z[400]} />
        {current ? (
          <>
            {current.label}
            {sort?.dir === 'asc'
              ? <ArrowUp size={11} color={Z.blue} />
              : <ArrowDown size={11} color={Z.blue} />}
          </>
        ) : 'Ordenar'}
        <ChevronDown size={12} color={Z[400]} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          background: Z.white, border: `1px solid ${Z[200]}`,
          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          padding: '3px 0', minWidth: 180,
        }}>
          {options.map(o => {
            const active = sort?.key === o.key
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => select(o.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '7px 12px',
                  border: 'none', background: active ? Z[50] : 'transparent',
                  fontFamily: 'var(--font)', fontSize: 13,
                  color: active ? Z[900] : Z[700],
                  cursor: 'pointer', textAlign: 'left', fontWeight: active ? 500 : 400,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = Z[50] }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {o.label}
                {active && (sort.dir === 'asc'
                  ? <ArrowUp size={12} color={Z.blue} />
                  : <ArrowDown size={12} color={Z.blue} />)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SettingsLayout — componente principal
// ══════════════════════════════════════════════════════════════════════════════
export default function SettingsLayout({
  // ── identidade da seção ──────────────────────────────────────────────────
  title,
  description,
  icon,
  // ── dados ────────────────────────────────────────────────────────────────
  columns      = [],
  data         = [],
  keyField     = 'id',
  onNew,
  newLabel     = '+ Novo',
  rowActions   = [],
  loading      = false,
  emptyLabel   = 'Nenhum registro encontrado.',
  sortOptions,
  sort,
  onSortChange,
  search        = '',
  onSearchChange,
  onExportCsv,
  onExportExcel,
  onImport,
}) {
  // ── busca interna com debounce ─────────────────────────────────────────────
  const [localSearch, setLocalSearch] = useState(search)
  const debounced = useDebounce(localSearch, 250)

  useEffect(() => { onSearchChange?.(debounced) }, [debounced]) // eslint-disable-line

  // sincroniza prop externa
  useEffect(() => { if (search !== localSearch) setLocalSearch(search) }, [search]) // eslint-disable-line

  // ── container width via ResizeObserver → oculta colunas por prioridade ─────
  const wrapRef    = useRef(null)
  const [cw, setCw] = useState(9999)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setCw(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const visibleCols = columns.filter(c => {
    const p = c.priority ?? 1
    return cw >= (PRIORITY_BREAK[p] ?? 0)
  })

  // ── sortOptions default (derivado das colunas) ─────────────────────────────
  const resolvedSortOptions = sortOptions ??
    columns.filter(c => c.priority !== 3).map(c => ({ key: c.key, label: c.label }))

  // ── sort local (se não controlado) ────────────────────────────────────────
  const [localSort, setLocalSort] = useState(sort ?? null)
  const effectiveSort   = sort ?? localSort
  const effectiveChange = onSortChange ?? setLocalSort

  // ── dados ordenados ────────────────────────────────────────────────────────
  const sorted = [...data].sort((a, b) => {
    if (!effectiveSort) return 0
    const av = a[effectiveSort.key] ?? '', bv = b[effectiveSort.key] ?? ''
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return effectiveSort.dir === 'asc' ? cmp : -cmp
  })

  const hasActions = rowActions.length > 0

  return (
    <div
      ref={wrapRef}
      style={{
        display: 'flex', flexDirection: 'column',
        background: Z.white,
        border: `1px solid ${Z[200]}`,
        borderRadius: 8,
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* ── Cabeçalho da seção ───────────────────────────────────────────── */}
      {(title || icon) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 14px 12px',
          borderBottom: `1px solid ${Z[200]}`,
          flexShrink: 0,
        }}>
          {icon && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 6,
              background: Z[100], color: Z[700], flexShrink: 0,
            }}>
              {icon}
            </div>
          )}
          <div>
            {title && (
              <div style={{
                fontSize: 14, fontWeight: 600, color: Z[900],
                fontFamily: 'var(--font)', lineHeight: 1.3,
              }}>
                {title}
              </div>
            )}
            {description && (
              <div style={{
                fontSize: 12, color: Z[500],
                fontFamily: 'var(--font)', marginTop: 1,
              }}>
                {description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Barra de ações ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: `1px solid ${Z[200]}`,
        background: Z[50],
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Search com debounce */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: Z.white, border: `1px solid ${Z[200]}`,
          borderRadius: 6, padding: '0 9px',
          height: 32, flex: 1, minWidth: 160, maxWidth: 280,
        }}>
          <Search size={13} color={Z[400]} style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={localSearch}
            placeholder="Pesquisar…"
            onChange={e => setLocalSearch(e.target.value)}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'var(--font)', fontSize: 12, color: Z[900],
              flex: 1, minWidth: 0, lineHeight: 'normal',
            }}
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: Z[400], fontSize: 12, padding: '1px 2px',
                lineHeight: 1, borderRadius: 3,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Ordenação */}
        {resolvedSortOptions.length > 0 && (
          <SortDropdown
            options={resolvedSortOptions}
            sort={effectiveSort}
            onChange={effectiveChange}
          />
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Menu ••• — importar / exportar */}
        <GlobalMenu
          onExportCsv={onExportCsv}
          onExportExcel={onExportExcel}
          onImport={onImport}
        />

        {/* Botão primário */}
        {onNew && (
          <button
            type="button"
            onClick={onNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 32, padding: '0 12px',
              border: 'none', borderRadius: 6,
              background: Z.blue, color: '#fff',
              fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.background = Z.blueHov}
            onMouseLeave={e => e.currentTarget.style.background = Z.blue}
          >
            <Plus size={13} />
            {newLabel}
          </button>
        )}
      </div>

      {/* ── Data grid ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
        {loading ? (
          <SkeletonRows cols={visibleCols.length + (hasActions ? 1 : 0)} />
        ) : sorted.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 160, color: Z[400],
            fontFamily: 'var(--font)', fontSize: 13,
          }}>
            {emptyLabel}
          </div>
        ) : (
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontFamily: 'var(--font)', fontSize: 13,
            tableLayout: 'auto',
          }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: Z[50], borderBottom: `1px solid ${Z[200]}` }}>
                {visibleCols.map(col => (
                  <th
                    key={col.key}
                    onClick={col.sortable !== false
                      ? () => effectiveChange({
                          key: col.key,
                          dir: effectiveSort?.key === col.key && effectiveSort?.dir === 'asc' ? 'desc' : 'asc',
                        })
                      : undefined}
                    style={{
                      padding: '8px 12px',
                      textAlign: col.align === 'right' ? 'right' : 'left',
                      fontWeight: 500, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: Z[500], whiteSpace: 'nowrap',
                      cursor: col.sortable !== false ? 'pointer' : 'default',
                      userSelect: 'none',
                      width: col.width,
                    }}
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
                {hasActions && <th style={{ width: 40 }} />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, ri) => (
                <tr
                  key={row[keyField] ?? ri}
                  style={{ borderBottom: `1px solid ${Z[200]}` }}
                  onMouseEnter={e => e.currentTarget.style.background = Z[50]}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {visibleCols.map(col => (
                    <td
                      key={col.key}
                      style={{
                        padding: '9px 12px',
                        color: col.muted ? Z[500] : Z[900],
                        textAlign: col.align === 'right' ? 'right' : 'left',
                        verticalAlign: 'middle',
                        whiteSpace: col.nowrap ? 'nowrap' : undefined,
                        maxWidth: col.maxWidth,
                        overflow: col.maxWidth ? 'hidden' : undefined,
                        textOverflow: col.maxWidth ? 'ellipsis' : undefined,
                      }}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {hasActions && (
                    <td style={{ padding: '6px 8px 6px 4px', textAlign: 'right', verticalAlign: 'middle' }}>
                      <RowMenu actions={rowActions} row={row} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Rodapé com contagem ───────────────────────────────────────────── */}
      <div style={{
        padding: '6px 14px',
        borderTop: `1px solid ${Z[200]}`,
        background: Z[50], flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: Z[400], fontFamily: 'var(--font)' }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
              Carregando…
            </span>
          ) : (
            `${sorted.length} registro${sorted.length !== 1 ? 's' : ''}`
          )}
        </span>
        {/* slot para paginação futura */}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function SkeletonRows({ cols }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {[70, 55, 80, 45, 65].map((w, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${Z[200]}` }}>
            {Array.from({ length: cols }).map((_, ci) => (
              <td key={ci} style={{ padding: '10px 12px' }}>
                <div style={{
                  height: 12, width: ci === 0 ? `${w}%` : ci === cols - 1 ? 28 : '60%',
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${Z[100]} 25%, ${Z[200]} 50%, ${Z[100]} 75%)`,
                  backgroundSize: '400px 100%',
                  animation: 'shimmer 1.4s infinite',
                }} />
              </td>
            ))}
          </tr>
        ))}
        <style>{`@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }`}</style>
      </tbody>
    </table>
  )
}
