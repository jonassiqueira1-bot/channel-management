import { useState, useEffect, useRef, useMemo } from 'react'

// ─── Shell ─────────────────────────────────────────────────────────────────────
// Props: open, onClose, title, breadcrumb, actions (node), children
// Internally manages expanded state
export default function NotionDrawer({ open, onClose, title, breadcrumb, actions, children }) {
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    if (open) { setMounted(true) }
    else { const t = setTimeout(() => { setMounted(false); setExpanded(false) }, 260); return () => clearTimeout(t) }
  }, [open])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  const panelW = expanded ? '100%' : '78%'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, display:'flex', justifyContent:'flex-end', pointerEvents: open ? 'all' : 'none' }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.42)',
          backdropFilter:'blur(2px)', opacity: open ? 1 : 0,
          transition:'opacity 0.26s ease', cursor:'default' }}
      />

      {/* Panel */}
      <div style={{
        position:'relative', zIndex:1, display:'flex', flexDirection:'column',
        width: panelW, height:'100%',
        background:'var(--surface)',
        borderLeft: expanded ? 'none' : '1px solid var(--border)',
        boxShadow: expanded ? 'none' : '-12px 0 48px rgba(0,0,0,0.18)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1), width 0.22s ease',
        willChange: 'transform',
      }}>
        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px',
          borderBottom:'1px solid var(--border2)', flexShrink:0, background:'var(--surface2)',
          minHeight:48 }}>
          {/* Breadcrumb + title */}
          <div style={{ flex:1, minWidth:0 }}>
            {breadcrumb && (
              <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--text-muted)',
                textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:1 }}>
                {breadcrumb}
              </div>
            )}
            {title && (
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {title}
              </div>
            )}
          </div>

          {/* Slot for extra actions */}
          {actions}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Recolher' : 'Expandir tela cheia'}
            style={topBtn}>
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </button>

          {/* Close */}
          <button onClick={onClose} title="Fechar" style={topBtn}>
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── 2-col layout ─────────────────────────────────────────────────────────────
export function DrawerBody({ left, right }) {
  return (
    <>
      <div style={{ flex:'0 0 65%', overflowY:'auto', borderRight:'1px solid var(--border2)',
        display:'flex', flexDirection:'column' }}>
        {left}
      </div>
      <div style={{ flex:'0 0 35%', overflowY:'auto', background:'var(--surface)',
        display:'flex', flexDirection:'column' }}>
        {right}
      </div>
    </>
  )
}

// ─── Inline field primitives ───────────────────────────────────────────────────
export function MetaSection({ label }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
      letterSpacing:'0.08em', fontFamily:'var(--mono)', padding:'20px 20px 6px',
      borderTop:'1px solid var(--border2)', marginTop:4 }}>
      {label}
    </div>
  )
}

export function MetaRow({ label, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'5px 20px',
      minHeight:34 }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600,
        width:110, flexShrink:0, paddingTop:3, lineHeight:1.4 }}>
        {label}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        {children}
      </div>
    </div>
  )
}

// InlineText — single line
export function InlineText({ value, onChange, placeholder = '—', mono = false, size = 13 }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value || '')
  const ref = useRef(null)

  useEffect(() => { setDraft(value || '') }, [value])
  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])

  function commit() { setEditing(false); if (draft !== value) onChange(draft) }

  if (editing) return (
    <input ref={ref}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') { setDraft(value||''); setEditing(false) } }}
      style={{ width:'100%', boxSizing:'border-box', padding:'2px 6px', border:'none',
        borderBottom:'1.5px solid var(--accent)', outline:'none',
        background:'transparent', fontSize:size, color:'var(--text)',
        fontFamily: mono ? 'var(--mono)' : 'var(--font)', borderRadius:3 }}
    />
  )

  return (
    <div
      onClick={() => setEditing(true)}
      style={{ fontSize:size, color: value ? 'var(--text)' : 'var(--text-muted)',
        fontFamily: mono ? 'var(--mono)' : 'var(--font)',
        padding:'2px 6px', borderRadius:4, cursor:'text', minHeight:22, lineHeight:'1.5',
        borderBottom:'1.5px solid transparent',
        transition:'border-color 0.12s, background 0.1s' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor='var(--border)'; e.currentTarget.style.background='var(--surface2)' }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor='transparent'; e.currentTarget.style.background='transparent' }}
    >
      {value || <span style={{ color:'var(--border2)' }}>{placeholder}</span>}
    </div>
  )
}

// InlineTextarea — multiline
export function InlineTextarea({ value, onChange, placeholder = 'Adicionar notas…', minRows = 3 }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value || '')
  const ref = useRef(null)

  useEffect(() => { setDraft(value || '') }, [value])
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      ref.current.setSelectionRange(draft.length, draft.length)
    }
  }, [editing])

  function commit() { setEditing(false); if (draft !== value) onChange(draft) }

  const rows = Math.max(minRows, (draft || '').split('\n').length)

  if (editing) return (
    <textarea ref={ref}
      value={draft}
      rows={rows}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Escape') { setDraft(value||''); setEditing(false) } }}
      style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px',
        border:'1.5px solid var(--border)', borderRadius:7, outline:'none',
        background:'var(--surface2)', fontSize:13, color:'var(--text)',
        fontFamily:'var(--font)', resize:'vertical', lineHeight:1.6 }}
    />
  )

  return (
    <div
      onClick={() => setEditing(true)}
      style={{ fontSize:13, color: value ? 'var(--text)' : 'var(--text-muted)',
        lineHeight:1.6, whiteSpace:'pre-wrap', cursor:'text',
        padding:'8px 10px', borderRadius:7, minHeight: minRows * 22,
        border:'1.5px solid transparent', transition:'border-color 0.12s, background 0.1s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--surface2)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.background='transparent' }}
    >
      {value || <span style={{ color:'var(--border2)' }}>{placeholder}</span>}
    </div>
  )
}

// InlineSelect
export function InlineSelect({ value, onChange, options, placeholder = '—' }) {
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)
  const label = options.find(o => o.value === value)?.label

  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])

  if (editing) return (
    <select ref={ref}
      value={value || ''}
      onChange={e => { onChange(e.target.value); setEditing(false) }}
      onBlur={() => setEditing(false)}
      style={{ width:'100%', padding:'3px 6px', border:'1.5px solid var(--accent)',
        borderRadius:5, background:'var(--surface)', fontSize:12, color:'var(--text)',
        fontFamily:'var(--font)', outline:'none', cursor:'pointer' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  return (
    <div
      onClick={() => setEditing(true)}
      style={{ fontSize:12, color: value ? 'var(--text)' : 'var(--text-muted)',
        padding:'3px 6px', borderRadius:4, cursor:'pointer', display:'inline-flex',
        alignItems:'center', gap:4, minHeight:22,
        borderBottom:'1.5px solid transparent', transition:'border-color 0.12s, background 0.1s' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor='var(--border)'; e.currentTarget.style.background='var(--surface2)' }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor='transparent'; e.currentTarget.style.background='transparent' }}
    >
      {label || <span style={{ color:'var(--border2)' }}>{placeholder}</span>}
      <span style={{ fontSize:9, color:'var(--text-muted)', marginLeft:2 }}>▾</span>
    </div>
  )
}

// InlineDate
export function InlineDate({ value, onChange, placeholder = 'Definir data' }) {
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)

  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])

  function fmt(d) {
    if (!d) return null
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y.slice(2)}`
  }

  if (editing) return (
    <input ref={ref} type="date"
      value={value || ''}
      onChange={e => { onChange(e.target.value); setEditing(false) }}
      onBlur={() => setEditing(false)}
      style={{ padding:'3px 6px', border:'1.5px solid var(--accent)', borderRadius:5,
        background:'var(--surface)', fontSize:12, color:'var(--text)',
        fontFamily:'var(--mono)', outline:'none' }}
    />
  )

  return (
    <div
      onClick={() => setEditing(true)}
      style={{ fontSize:12, color: value ? 'var(--text)' : 'var(--text-muted)',
        fontFamily: value ? 'var(--mono)' : 'var(--font)',
        padding:'3px 6px', borderRadius:4, cursor:'pointer', minHeight:22,
        borderBottom:'1.5px solid transparent', transition:'border-color 0.12s, background 0.1s',
        display:'inline-flex', alignItems:'center' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor='var(--border)'; e.currentTarget.style.background='var(--surface2)' }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor='transparent'; e.currentTarget.style.background='transparent' }}
    >
      {fmt(value) || <span style={{ color:'var(--border2)' }}>{placeholder}</span>}
    </div>
  )
}

// DeleteZone — confirm delete row at bottom of right panel
export function DeleteZone({ label, onDelete }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div style={{ padding:'16px 20px', borderTop:'1px solid var(--border2)', marginTop:'auto' }}>
      {!confirm ? (
        <button onClick={() => setConfirm(true)}
          style={{ fontSize:12, color:'var(--red)', background:'none', border:'none',
            cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, padding:0 }}>
          {label || 'Excluir registro'}
        </button>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>Confirmar?</span>
          <button onClick={onDelete}
            style={{ padding:'4px 12px', background:'var(--red)', color:'#fff', border:'none',
              borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
            Sim
          </button>
          <button onClick={() => setConfirm(false)}
            style={{ padding:'4px 10px', background:'var(--surface2)', color:'var(--text-soft)',
              border:'1px solid var(--border)', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>
            Não
          </button>
        </div>
      )}
    </div>
  )
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 5V2a1 1 0 011-1h3M9 1h3a1 1 0 011 1v3M13 9v3a1 1 0 01-1 1H9M5 13H2a1 1 0 01-1-1V9"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 1v3a1 1 0 01-1 1H1M9 1v3a1 1 0 001 1h3M1 9h3a1 1 0 011 1v3M9 13v-3a1 1 0 011-1h3"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

const topBtn = {
  width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
  background:'none', border:'1px solid var(--border)', borderRadius:6,
  color:'var(--text-muted)', cursor:'pointer', flexShrink:0,
  transition:'background 0.12s, color 0.12s',
}

// ─── InlineSearchSelect ────────────────────────────────────────────────────────
// Igual ao InlineSelect mas com campo de pesquisa em vez de <select> nativo.
// options: [{value, label, sublabel?, avatar?}]
export function InlineSearchSelect({ value, onChange, options, placeholder = '—' }) {
  const current = options.find(o => String(o.value) === String(value))
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef(null)

  useEffect(() => {
    if (!open) return
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return options.filter(o => !q || o.label.toLowerCase().includes(q) || (o.sublabel||'').toLowerCase().includes(q)).slice(0, 8)
  }, [query, options])

  if (open) {
    return (
      <div ref={ref} style={{ position:'relative' }}>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Pesquisar…"
          style={{ width:'100%', boxSizing:'border-box', padding:'2px 6px', border:'none',
            borderBottom:'1.5px solid var(--accent)', outline:'none',
            background:'transparent', fontSize:12, color:'var(--text)',
            fontFamily:'var(--font)', borderRadius:3 }}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        />
        {filtered.length > 0 && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, minWidth:200, zIndex:600,
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
            {filtered.map(opt => (
              <button key={opt.value} type="button"
                onMouseDown={() => { onChange(opt.value); setOpen(false); setQuery('') }}
                style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px',
                  border:'none', background: String(opt.value)===String(value) ? 'var(--surface2)' : 'transparent',
                  cursor:'pointer', textAlign:'left', fontFamily:'var(--font)',
                  borderLeft:`2px solid ${String(opt.value)===String(value) ? 'var(--accent)' : 'transparent'}` }}
                onMouseEnter={e => { if (String(opt.value)!==String(value)) e.currentTarget.style.background='var(--surface2)' }}
                onMouseLeave={e => { if (String(opt.value)!==String(value)) e.currentTarget.style.background='transparent' }}>
                {opt.avatar && (
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'#EDE9FE', color:'var(--accent)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:9, fontWeight:800, flexShrink:0, fontFamily:'var(--mono)' }}>
                    {opt.avatar}
                  </div>
                )}
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{opt.label}</div>
                  {opt.sublabel && <div style={{ fontSize:10, color:'var(--text-muted)' }}>{opt.sublabel}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => setOpen(true)}
      style={{ fontSize:12, color: value ? 'var(--text)' : 'var(--text-muted)',
        padding:'2px 6px', borderRadius:4, cursor:'pointer', display:'inline-flex',
        alignItems:'center', gap:4, minHeight:22,
        borderBottom:'1.5px solid transparent', transition:'border-color 0.12s, background 0.1s' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor='var(--border)'; e.currentTarget.style.background='var(--surface2)' }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor='transparent'; e.currentTarget.style.background='transparent' }}>
      {current?.label || <span style={{ color:'var(--border2)' }}>{placeholder}</span>}
      <span style={{ fontSize:9, color:'var(--text-muted)', marginLeft:2 }}>▾</span>
    </div>
  )
}
