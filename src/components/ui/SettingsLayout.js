// src/components/ui/SettingsLayout.js
// ─────────────────────────────────────────────────────────────────────────────
// Layout de CRUD compacto para telas de Configurações (submenus).
//
// Props:
//   columns        {key, label, priority?, width?, render?, align?}[]
//   data           object[]
//   keyField       string                         (default: 'id')
//   onNew          () => void
//   newLabel       string                         (default: '+ Novo')
//   rowActions     {label, icon?, danger?, onClick:(row)=>void}[]
//   loading        bool
//   emptyLabel     string
//   sortOptions    {key, label}[]
//   sort           {key: string, dir: 'asc'|'desc'}
//   onSortChange   ({key, dir}) => void
//   search         string
//   onSearchChange (v:string) => void
//   onExportCsv    () => void
//   onExportExcel  () => void
//   onImport       () => void
//   bulkEditFields [{key, label, type:'text'|'select'|'number'|'date', options?:[{value,label}]}]
//   onBulkEdit     (ids:string[], changes:object) => void
//   bulkActions    [{label, icon?, danger?, onClick:(ids:string[])=>void}]
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, ChevronsUpDown, ArrowUp, ArrowDown,
         MoreHorizontal, ChevronDown, Loader2,
         Download, Upload, FileSpreadsheet, Edit2, X, Check } from 'lucide-react'

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

const PRIORITY_BREAK = { 2: 540, 3: 720 }

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
    <div ref={ref} style={{ position:'relative', display:'inline-flex' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:4, border:'none', background:'transparent', cursor:'pointer', color:Z[400] }}
        onMouseEnter={e => { e.currentTarget.style.background = Z[100]; e.currentTarget.style.color = Z[700] }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = Z[400] } }}
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 3px)', right:0, zIndex:100, background:Z.white, border:`1px solid ${Z[200]}`, borderRadius:6, boxShadow:'0 4px 16px rgba(0,0,0,0.08)', padding:'3px 0', minWidth:150 }}>
          {actions.map((a, i) => (
            <button key={i} type="button" onClick={() => { a.onClick(row); setOpen(false) }}
              style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 12px', border:'none', background:'transparent', fontFamily:'var(--font)', fontSize:13, color: a.danger ? Z.danger : Z[700], cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => e.currentTarget.style.background = a.danger ? Z.dangerBg : Z[50]}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {a.icon && <span style={{ flexShrink:0 }}>{a.icon}</span>}
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
    onExportCsv   && { label:'Exportar CSV',   icon:<Download size={13} />,        onClick: onExportCsv   },
    onExportExcel && { label:'Exportar Excel', icon:<FileSpreadsheet size={13} />, onClick: onExportExcel },
    onImport      && null,
    onImport      && { label:'Importar dados', icon:<Upload size={13} />,          onClick: onImport },
  ].filter(Boolean)
  if (!items.length) return null
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} title="Mais ações"
        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:6, border:`1px solid ${Z[200]}`, background:Z.white, cursor:'pointer', color:Z[500] }}
        onMouseEnter={e => e.currentTarget.style.background = Z[100]}
        onMouseLeave={e => e.currentTarget.style.background = Z.white}
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:50, background:Z.white, border:`1px solid ${Z[200]}`, borderRadius:6, boxShadow:'0 4px 16px rgba(0,0,0,0.08)', padding:'3px 0', minWidth:170 }}>
          <div style={{ padding:'4px 12px 3px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:Z[400] }}>Ações globais</div>
          {items.map((item, i) =>
            item === null ? (
              <div key={`d-${i}`} style={{ height:1, background:Z[200], margin:'3px 0' }} />
            ) : (
              <button key={item.label} type="button" onClick={() => { item.onClick?.(); setOpen(false) }}
                style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 12px', border:'none', background:'transparent', fontFamily:'var(--font)', fontSize:13, color:Z[700], cursor:'pointer', textAlign:'left' }}
                onMouseEnter={e => e.currentTarget.style.background = Z[50]}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color:Z[400], flexShrink:0 }}>{item.icon}</span>
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
    onChange({ key, dir: sort?.key === key && sort?.dir === 'asc' ? 'desc' : 'asc' })
    setOpen(false)
  }
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:6, height:32, padding:'0 10px', border:`1px solid ${Z[200]}`, borderRadius:6, background:Z.white, fontFamily:'var(--font)', fontSize:12, color:Z[700], cursor:'pointer', whiteSpace:'nowrap' }}
      >
        <ChevronsUpDown size={13} color={Z[400]} />
        {current ? (<>{current.label}{sort?.dir==='asc' ? <ArrowUp size={11} color={Z.blue} /> : <ArrowDown size={11} color={Z.blue} />}</>) : 'Ordenar'}
        <ChevronDown size={12} color={Z[400]} />
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:50, background:Z.white, border:`1px solid ${Z[200]}`, borderRadius:6, boxShadow:'0 4px 16px rgba(0,0,0,0.08)', padding:'3px 0', minWidth:180 }}>
          {options.map(o => {
            const active = sort?.key === o.key
            return (
              <button key={o.key} type="button" onClick={() => select(o.key)}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'7px 12px', border:'none', background: active ? Z[50] : 'transparent', fontFamily:'var(--font)', fontSize:13, color: active ? Z[900] : Z[700], cursor:'pointer', textAlign:'left', fontWeight: active ? 500 : 400 }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = Z[50] }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {o.label}
                {active && (sort.dir === 'asc' ? <ArrowUp size={12} color={Z.blue} /> : <ArrowDown size={12} color={Z.blue} />)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Modal de edição em lote ───────────────────────────────────────────────────
function BulkEditModal({ fields, count, onApply, onClose }) {
  const [values, setValues] = useState({})
  const [active, setActive] = useState({})

  function toggle(key) { setActive(a => ({ ...a, [key]: !a[key] })) }

  function apply() {
    const changes = {}
    Object.entries(active).forEach(([k, on]) => { if (on) changes[k] = values[k] ?? '' })
    if (!Object.keys(changes).length) return
    onApply(changes)
    onClose()
  }

  const hasActive = Object.values(active).some(Boolean)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:Z.white, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', width:400, maxWidth:'90vw', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:`1px solid ${Z[200]}` }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:Z[900], fontFamily:'var(--font)' }}>Editar em lote</div>
            <div style={{ fontSize:11, color:Z[400], fontFamily:'var(--font)', marginTop:2 }}>{count} registro{count !== 1 ? 's' : ''} selecionado{count !== 1 ? 's' : ''}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:Z[400], display:'flex', padding:4, borderRadius:4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:11, color:Z[500], fontFamily:'var(--font)' }}>
            Marque o campo e defina o novo valor. Apenas os campos marcados serão alterados.
          </div>
          {fields.map(f => {
            const on = !!active[f.key]
            return (
              <div key={f.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', userSelect:'none', minWidth:130 }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(f.key)}
                    style={{ width:14, height:14, accentColor:Z.blue, cursor:'pointer' }} />
                  <span style={{ fontSize:12, fontWeight:600, color: on ? Z[900] : Z[500], fontFamily:'var(--font)' }}>{f.label}</span>
                </label>
                <div style={{ flex:1 }}>
                  {f.type === 'select' ? (
                    <select disabled={!on} value={values[f.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                      style={{ width:'100%', height:30, borderRadius:6, border:`1px solid ${Z[200]}`, fontFamily:'var(--font)', fontSize:12, color:Z[900], padding:'0 8px', background: on ? Z.white : Z[100], cursor: on ? 'pointer' : 'not-allowed', outline:'none' }}>
                      <option value="">— selecione —</option>
                      {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type={f.type || 'text'} disabled={!on}
                      value={values[f.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                      placeholder="Novo valor…"
                      style={{ width:'100%', height:30, boxSizing:'border-box', borderRadius:6, border:`1px solid ${Z[200]}`, fontFamily:'var(--font)', fontSize:12, color:Z[900], padding:'0 8px', background: on ? Z.white : Z[100], outline:'none' }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'12px 18px', borderTop:`1px solid ${Z[200]}`, background:Z[50] }}>
          <button type="button" onClick={onClose}
            style={{ height:32, padding:'0 14px', border:`1px solid ${Z[200]}`, borderRadius:6, background:Z.white, fontFamily:'var(--font)', fontSize:12, color:Z[700], cursor:'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={apply} disabled={!hasActive}
            style={{ height:32, padding:'0 14px', border:'none', borderRadius:6, background: hasActive ? Z.blue : Z[300], fontFamily:'var(--font)', fontSize:12, fontWeight:600, color:'#fff', cursor: hasActive ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:6 }}>
            <Check size={13} />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SettingsLayout — componente principal
// ══════════════════════════════════════════════════════════════════════════════
export default function SettingsLayout({
  title, description, icon,
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
  bulkEditFields,
  onBulkEdit,
  bulkActions   = [],
}) {
  const [localSearch, setLocalSearch] = useState(search)
  const debounced = useDebounce(localSearch, 250)
  useEffect(() => { onSearchChange?.(debounced) }, [debounced]) // eslint-disable-line
  useEffect(() => { if (search !== localSearch) setLocalSearch(search) }, [search]) // eslint-disable-line

  const wrapRef    = useRef(null)
  const [cw, setCw] = useState(9999)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const visibleCols = columns.filter(c => cw >= (PRIORITY_BREAK[c.priority ?? 1] ?? 0))

  const resolvedSortOptions = sortOptions ?? columns.filter(c => c.priority !== 3).map(c => ({ key: c.key, label: c.label }))
  const [localSort, setLocalSort] = useState(sort ?? null)
  const effectiveSort   = sort ?? localSort
  const effectiveChange = onSortChange ?? setLocalSort
  const sorted = [...data].sort((a, b) => {
    if (!effectiveSort) return 0
    const av = a[effectiveSort.key] ?? '', bv = b[effectiveSort.key] ?? ''
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return effectiveSort.dir === 'asc' ? cmp : -cmp
  })

  // seleção em lote
  const [selected, setSelected]     = useState(new Set())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const allSelected  = sorted.length > 0 && sorted.every(r => selected.has(r[keyField]))
  const someSelected = selected.size > 0
  const hasBulk      = (bulkEditFields?.length > 0 && onBulkEdit) || bulkActions.length > 0

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map(r => r[keyField])))
  }
  function toggleRow(id) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function handleBulkEdit(changes) {
    onBulkEdit?.([...selected], changes)
    setSelected(new Set())
  }

  const hasActions = rowActions.length > 0

  return (
    <div ref={wrapRef} style={{ display:'flex', flexDirection:'column', background:Z.white, border:`1px solid ${Z[200]}`, borderRadius:8, overflow:'hidden', height:'100%' }}>

      {(title || icon) && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 14px 12px', borderBottom:`1px solid ${Z[200]}`, flexShrink:0 }}>
          {icon && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:6, background:Z[100], color:Z[700], flexShrink:0 }}>
              {icon}
            </div>
          )}
          <div>
            {title && <div style={{ fontSize:14, fontWeight:600, color:Z[900], fontFamily:'var(--font)', lineHeight:1.3 }}>{title}</div>}
            {description && <div style={{ fontSize:12, color:Z[500], fontFamily:'var(--font)', marginTop:1 }}>{description}</div>}
          </div>
        </div>
      )}

      {/* Barra de ferramentas / barra bulk */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:`1px solid ${Z[200]}`, background:Z[50], flexShrink:0, flexWrap:'wrap' }}>
        {someSelected ? (
          /* ── modo bulk ── */
          <>
            <span style={{ fontSize:13, fontWeight:600, color:Z.blue, fontFamily:'var(--font)' }}>
              {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
            </span>
            <button type="button" onClick={() => setSelected(new Set())}
              style={{ fontSize:11, color:Z[500], background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' }}>
              Limpar
            </button>
            <div style={{ flex:1 }} />
            {bulkActions.map((a, i) => (
              <button key={i} type="button" onClick={() => { a.onClick([...selected]); setSelected(new Set()) }}
                style={{ display:'flex', alignItems:'center', gap:5, height:30, padding:'0 12px', border:`1px solid ${a.danger ? Z.danger : Z[200]}`, borderRadius:6, background: a.danger ? Z.dangerBg : Z.white, fontFamily:'var(--font)', fontSize:12, color: a.danger ? Z.danger : Z[700], cursor:'pointer', fontWeight:500 }}>
                {a.icon && <span style={{ flexShrink:0 }}>{a.icon}</span>}
                {a.label}
              </button>
            ))}
            {bulkEditFields?.length > 0 && onBulkEdit && (
              <button type="button" onClick={() => setBulkEditOpen(true)}
                style={{ display:'flex', alignItems:'center', gap:5, height:30, padding:'0 12px', border:`1px solid ${Z.blue}`, borderRadius:6, background:Z.white, fontFamily:'var(--font)', fontSize:12, color:Z.blue, cursor:'pointer', fontWeight:600 }}>
                <Edit2 size={12} />
                Editar em lote
              </button>
            )}
          </>
        ) : (
          /* ── modo normal ── */
          <>
            <div style={{ display:'flex', alignItems:'center', gap:7, background:Z.white, border:`1px solid ${Z[200]}`, borderRadius:6, padding:'0 9px', height:32, flex:1, minWidth:160, maxWidth:280 }}>
              <Search size={13} color={Z[400]} style={{ flexShrink:0 }} />
              <input type="text" value={localSearch} placeholder="Pesquisar…" onChange={e => setLocalSearch(e.target.value)}
                style={{ border:'none', outline:'none', background:'transparent', fontFamily:'var(--font)', fontSize:12, color:Z[900], flex:1, minWidth:0 }} />
              {localSearch && (
                <button type="button" onClick={() => setLocalSearch('')}
                  style={{ background:'none', border:'none', cursor:'pointer', color:Z[400], fontSize:12, padding:'1px 2px', lineHeight:1, borderRadius:3 }}>✕</button>
              )}
            </div>
            {resolvedSortOptions.length > 0 && (
              <SortDropdown options={resolvedSortOptions} sort={effectiveSort} onChange={effectiveChange} />
            )}
            <div style={{ flex:1 }} />
            <GlobalMenu onExportCsv={onExportCsv} onExportExcel={onExportExcel} onImport={onImport} />
            {onNew && (
              <button type="button" onClick={onNew}
                style={{ display:'flex', alignItems:'center', gap:5, height:32, padding:'0 12px', border:'none', borderRadius:6, background:Z.blue, color:'#fff', fontFamily:'var(--font)', fontSize:12, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background = Z.blueHov}
                onMouseLeave={e => e.currentTarget.style.background = Z.blue}
              >
                <Plus size={13} />
                {newLabel}
              </button>
            )}
          </>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'auto', minHeight:0 }}>
        {loading ? (
          <SkeletonRows cols={visibleCols.length + (hasBulk ? 1 : 0) + (hasActions ? 1 : 0)} />
        ) : sorted.length === 0 ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:160, color:Z[400], fontFamily:'var(--font)', fontSize:13 }}>
            {emptyLabel}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--font)', fontSize:13, tableLayout:'auto' }}>
            <thead style={{ position:'sticky', top:0, zIndex:2 }}>
              <tr style={{ background:Z[50], borderBottom:`1px solid ${Z[200]}` }}>
                {hasBulk && (
                  <th style={{ width:36, padding:'8px 8px 8px 14px', verticalAlign:'middle' }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      style={{ width:14, height:14, accentColor:Z.blue, cursor:'pointer' }} />
                  </th>
                )}
                {visibleCols.map(col => (
                  <th key={col.key}
                    onClick={col.sortable !== false ? () => effectiveChange({ key:col.key, dir: effectiveSort?.key === col.key && effectiveSort?.dir === 'asc' ? 'desc' : 'asc' }) : undefined}
                    style={{ padding:'8px 12px', textAlign: col.align === 'right' ? 'right' : 'left', fontWeight:500, fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em', color:Z[500], whiteSpace:'nowrap', cursor: col.sortable !== false ? 'pointer' : 'default', userSelect:'none', width:col.width }}
                  >
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                      {col.label}
                      {col.sortable !== false && (
                        effectiveSort?.key === col.key
                          ? effectiveSort.dir === 'asc' ? <ArrowUp size={10} color={Z.blue} /> : <ArrowDown size={10} color={Z.blue} />
                          : <ChevronsUpDown size={10} color={Z[300]} />
                      )}
                    </span>
                  </th>
                ))}
                {hasActions && <th style={{ width:40 }} />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, ri) => {
                const isSelected = selected.has(row[keyField])
                return (
                  <tr key={row[keyField] ?? ri}
                    style={{ borderBottom:`1px solid ${Z[200]}`, background: isSelected ? 'rgba(30,58,95,0.05)' : '' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = Z[50] }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(30,58,95,0.05)' : '' }}
                  >
                    {hasBulk && (
                      <td style={{ padding:'9px 8px 9px 14px', verticalAlign:'middle' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleRow(row[keyField])}
                          style={{ width:14, height:14, accentColor:Z.blue, cursor:'pointer' }} />
                      </td>
                    )}
                    {visibleCols.map(col => (
                      <td key={col.key}
                        style={{ padding:'9px 12px', color: col.muted ? Z[500] : Z[900], textAlign: col.align === 'right' ? 'right' : 'left', verticalAlign:'middle', whiteSpace: col.nowrap ? 'nowrap' : undefined, maxWidth: col.maxWidth, overflow: col.maxWidth ? 'hidden' : undefined, textOverflow: col.maxWidth ? 'ellipsis' : undefined }}
                      >
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                    {hasActions && (
                      <td style={{ padding:'6px 8px 6px 4px', textAlign:'right', verticalAlign:'middle' }}>
                        <RowMenu actions={rowActions} row={row} />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ padding:'6px 14px', borderTop:`1px solid ${Z[200]}`, background:Z[50], flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:Z[400], fontFamily:'var(--font)' }}>
          {loading ? (
            <span style={{ display:'flex', alignItems:'center', gap:5 }}>
              <Loader2 size={11} style={{ animation:'spin 0.8s linear infinite' }} />
              Carregando…
            </span>
          ) : (
            `${sorted.length} registro${sorted.length !== 1 ? 's' : ''}${someSelected ? ` · ${selected.size} selecionado${selected.size !== 1 ? 's' : ''}` : ''}`
          )}
        </span>
      </div>

      {bulkEditOpen && (
        <BulkEditModal
          fields={bulkEditFields}
          count={selected.size}
          onApply={handleBulkEdit}
          onClose={() => setBulkEditOpen(false)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function SkeletonRows({ cols }) {
  return (
    <table style={{ width:'100%', borderCollapse:'collapse' }}>
      <tbody>
        {[70, 55, 80, 45, 65].map((w, i) => (
          <tr key={i} style={{ borderBottom:`1px solid ${Z[200]}` }}>
            {Array.from({ length: cols }).map((_, ci) => (
              <td key={ci} style={{ padding:'10px 12px' }}>
                <div style={{ height:12, width: ci === 0 ? `${w}%` : ci === cols - 1 ? 28 : '60%', borderRadius:4, background:`linear-gradient(90deg, ${Z[100]} 25%, ${Z[200]} 50%, ${Z[100]} 75%)`, backgroundSize:'400px 100%', animation:'shimmer 1.4s infinite' }} />
              </td>
            ))}
          </tr>
        ))}
        <style>{`@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }`}</style>
      </tbody>
    </table>
  )
}
