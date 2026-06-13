import { useState, useRef } from 'react'
import { NavLink, useNavigate, useMatch } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLocalState } from '../hooks/useLocalState'
import {
  LayoutDashboard, Users, TrendingUp, Zap, CheckSquare, Target,
  Building2, UserCircle, FileText, CreditCard, FolderKanban,
  ClipboardList, FileStack, BookOpen, DollarSign, Settings, ShieldAlert,
  Pencil, Check, X, GripVertical, Plus, Trash2, RotateCcw,
} from 'lucide-react'

// Mapa de ícones para serializar/deserializar do localStorage
const ICON_MAP = {
  LayoutDashboard, Users, TrendingUp, Zap, CheckSquare, Target,
  Building2, UserCircle, FileText, CreditCard, FolderKanban,
  ClipboardList, FileStack, BookOpen, DollarSign,
}

// ─── Estrutura inicial dos grupos ────────────────────────────────────────────
const INITIAL_GROUPS = [
  {
    id: 'visao',
    label: 'Visão Geral',
    items: [
      { path: '/dashboard', label: 'Dashboard', iconKey: 'LayoutDashboard' },
      { path: '/metas',     label: 'Metas',     iconKey: 'Target' },
    ],
  },
  {
    id: 'comercial',
    label: 'Comercial',
    items: [
      { path: '/pipeline', label: 'Pipeline',  iconKey: 'TrendingUp' },
      { path: '/tarefas',  label: 'Tarefas',   iconKey: 'CheckSquare' },
      { path: '/playbooks',label: 'Playbooks', iconKey: 'BookOpen' },
    ],
  },
  {
    id: 'canais',
    label: 'Canais',
    items: [
      { path: '/vendedores', label: 'Vendedores', iconKey: 'Users' },
      { path: '/acoes',      label: 'Ações',      iconKey: 'Zap' },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    items: [
      { path: '/empresas',  label: 'Empresas',  iconKey: 'Building2' },
      { path: '/contatos',  label: 'Contatos',  iconKey: 'UserCircle' },
    ],
  },
  {
    id: 'projetos',
    label: 'Projetos',
    items: [
      { path: '/projetos', label: 'Projetos', iconKey: 'FolderKanban' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    items: [
      { path: '/contratos',  label: 'Contratos',  iconKey: 'FileText' },
      { path: '/pagamentos', label: 'Pagamentos', iconKey: 'CreditCard' },
      { path: '/comissoes',  label: 'Comissões',  iconKey: 'DollarSign' },
    ],
  },
  {
    id: 'recursos',
    label: 'Recursos',
    items: [
      { path: '/questionarios', label: 'Questionários', iconKey: 'ClipboardList' },
      { path: '/documentos',    label: 'Documentos',    iconKey: 'FileStack' },
    ],
  },
]

const ACCENT    = '#6366F1'
const ICON_SIZE = 15

let _gid = 0
function newGroupId() { return `grp_${Date.now()}_${++_gid}` }

export default function Sidebar({ collapsed, onToggle, isMobile, onClose }) {
  const [groups, setGroups]         = useLocalState('sidebar:groups_v3', INITIAL_GROUPS)
  const [openGroups, setOpenGroups] = useLocalState('sidebar:open_v3', {})

  // Edição de rótulo de grupo
  const [editingGroup, setEditingGroup] = useState(null)
  const [editValue,    setEditValue]    = useState('')
  const [hoveredGroup, setHoveredGroup] = useState(null)
  const editInputRef = useRef(null)

  // Drag state: { type: 'item'|'group', gIdx, iIdx? }
  const [dragSrc,  setDragSrc]  = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [menuEditMode, setMenuEditMode] = useState(false)

  const { signOut } = useAuth()
  const navigate    = useNavigate()
  const inSettings  = !!useMatch('/settings/*')

  function isOpen(groupId) {
    return openGroups[groupId] !== false  // aberto por padrão
  }

  function toggleGroup(id) {
    setOpenGroups(prev => ({ ...prev, [id]: !isOpen(id) }))
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // ── Edição de rótulo ─────────────────────────────────────────────────────
  function startEdit(group, e) {
    e.stopPropagation()
    setEditingGroup(group.id)
    setEditValue(group.label)
    setTimeout(() => editInputRef.current?.focus(), 30)
  }

  function commitEdit(groupId) {
    if (editValue.trim()) {
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, label: editValue.trim() } : g))
    }
    setEditingGroup(null)
  }

  function cancelEdit() { setEditingGroup(null) }

  // ── Criar grupo ──────────────────────────────────────────────────────────
  function createGroup() {
    const id = newGroupId()
    const novo = { id, label: 'Novo grupo', items: [] }
    setGroups(prev => [...prev, novo])
    setOpenGroups(prev => ({ ...prev, [id]: true }))
    // Entra em modo edição imediatamente
    setEditingGroup(id)
    setEditValue('Novo grupo')
    setTimeout(() => editInputRef.current?.focus(), 60)
  }

  // ── Excluir grupo ────────────────────────────────────────────────────────
  function deleteGroup(gIdx, e) {
    e.stopPropagation()
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      const [removed] = next.splice(gIdx, 1)
      // Move itens do grupo removido para o grupo anterior (ou o seguinte se for o primeiro)
      if (removed.items.length > 0 && next.length > 0) {
        const targetIdx = Math.max(0, gIdx - 1)
        next[targetIdx].items.push(...removed.items)
      }
      return next
    })
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  function onItemDragStart(e, gIdx, iIdx) {
    setDragSrc({ type: 'item', gIdx, iIdx })
    e.dataTransfer.effectAllowed = 'move'
    setGhost(e)
  }

  function onGroupDragStart(e, gIdx) {
    e.stopPropagation()
    setDragSrc({ type: 'group', gIdx })
    e.dataTransfer.effectAllowed = 'move'
    setGhost(e)
  }

  function setGhost(e) {
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-999px;opacity:0'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function onDragOverItem(e, gIdx, iIdx) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver({ zone: 'item', gIdx, iIdx })
  }

  function onDragOverGroupHeader(e, gIdx) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver({ zone: 'group', gIdx })
  }

  function onDropOnItem(e, gDst, iDst) {
    e.preventDefault()
    if (!dragSrc) return
    if (dragSrc.type === 'item') moveItem(dragSrc.gIdx, dragSrc.iIdx, gDst, iDst)
    cleanup()
  }

  function onDropOnGroupHeader(e, gDst) {
    e.preventDefault()
    if (!dragSrc) return
    if (dragSrc.type === 'item') {
      // Solta item no final do grupo
      moveItem(dragSrc.gIdx, dragSrc.iIdx, gDst, null)
    } else if (dragSrc.type === 'group') {
      // Reordena grupos
      const gSrc = dragSrc.gIdx
      if (gSrc === gDst) { cleanup(); return }
      setGroups(prev => {
        const next = [...prev]
        const [grp] = next.splice(gSrc, 1)
        const insertAt = gSrc < gDst ? gDst - 1 : gDst
        next.splice(insertAt, 0, grp)
        return next
      })
    }
    cleanup()
  }

  function moveItem(gSrc, iSrc, gDst, iDst) {
    if (gSrc === gDst && (iSrc === iDst || iDst === null)) return
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      const [item] = next[gSrc].items.splice(iSrc, 1)
      if (iDst === null) {
        next[gDst].items.push(item)
      } else {
        const adj = gSrc === gDst && iSrc < iDst ? iDst - 1 : iDst
        next[gDst].items.splice(adj, 0, item)
      }
      setOpenGroups(o => ({ ...o, [prev[gDst].id]: true }))
      return next
    })
  }

  function cleanup() { setDragSrc(null); setDragOver(null) }

  const width = isMobile
    ? Math.min(280, Math.round(window.innerWidth * 0.78))
    : collapsed ? 56 : 220

  return (
    <aside style={{ ...s.sidebar, width, ...(isMobile ? s.drawerMobile : {}) }}>

      {/* ── Brand ── */}
      <div style={s.brand}>
        <div style={s.logoMark}>CN</div>
        {!collapsed && <span style={s.brandName}>Canais NG</span>}
        {isMobile && (
          <button style={s.closeBtn} onClick={onClose} aria-label="Fechar menu">
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={s.nav}>
        {groups.map((group, gIdx) => {
          const isEditing     = editingGroup === group.id
          const isHovered     = hoveredGroup === group.id
          const open          = isOpen(group.id)
          const isDragOverHdr = dragOver?.zone === 'group' && dragOver?.gIdx === gIdx
          const isGroupDragging = dragSrc?.type === 'group' && dragSrc?.gIdx === gIdx

          return (
            <div
              key={group.id}
              style={{ ...s.group, opacity: isGroupDragging ? 0.35 : 1 }}
            >
              {/* ── Cabeçalho do grupo ── */}
              {!collapsed && (
                <div
                  style={{
                    ...s.groupHeader,
                    background: isDragOverHdr ? 'rgba(99,102,241,0.12)' : 'transparent',
                    borderRadius: isDragOverHdr ? 6 : 0,
                    margin: isDragOverHdr ? '0 8px' : 0,
                  }}
                  onMouseEnter={() => setHoveredGroup(group.id)}
                  onMouseLeave={() => setHoveredGroup(null)}
                  onDragOver={e => onDragOverGroupHeader(e, gIdx)}
                  onDrop={e => onDropOnGroupHeader(e, gIdx)}
                >
                  {/* Grip do grupo — arrasta o grupo inteiro */}
                  {isHovered && !isEditing && (
                    <span
                      draggable
                      onDragStart={e => onGroupDragStart(e, gIdx)}
                      onDragEnd={cleanup}
                      style={s.groupGrip}
                      title="Arrastar grupo"
                    >
                      <GripVertical size={11} strokeWidth={1.5} />
                    </span>
                  )}

                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                      <input
                        ref={editInputRef}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter')  commitEdit(group.id)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        style={s.editInput}
                        onClick={e => e.stopPropagation()}
                      />
                      <button style={s.editAction} onClick={() => commitEdit(group.id)} title="Confirmar">
                        <Check size={10} strokeWidth={2.5} />
                      </button>
                      <button style={s.editAction} onClick={cancelEdit} title="Cancelar">
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button style={{ ...s.groupBtn, flex: 1 }} onClick={() => toggleGroup(group.id)}>
                      <span style={s.groupLabel}>{group.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isHovered && !dragSrc && (
                          <>
                            <span role="button" title="Renomear" onClick={e => startEdit(group, e)} style={s.pencilBtn}>
                              <Pencil size={9} strokeWidth={2} />
                            </span>
                            <span role="button" title="Excluir grupo" onClick={e => deleteGroup(gIdx, e)} style={{ ...s.pencilBtn, color: '#f87171' }}>
                              <Trash2 size={9} strokeWidth={2} />
                            </span>
                          </>
                        )}
                        <span style={{ ...s.chevron, transform: open ? 'rotate(90deg)' : 'none', opacity: isHovered ? 0.7 : 0.4 }}>›</span>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* ── Itens do grupo ── */}
              {(collapsed || open) && group.items.map((item, iIdx) => {
                const Icon          = ICON_MAP[item.iconKey]
                const isBeingDragged = dragSrc?.type === 'item' && dragSrc?.gIdx === gIdx && dragSrc?.iIdx === iIdx
                const isDragOverItem = dragOver?.zone === 'item' && dragOver?.gIdx === gIdx && dragOver?.iIdx === iIdx

                return (
                  <div
                    key={item.path}
                    draggable={!collapsed}
                    onDragStart={e => onItemDragStart(e, gIdx, iIdx)}
                    onDragOver={e => onDragOverItem(e, gIdx, iIdx)}
                    onDrop={e => onDropOnItem(e, gIdx, iIdx)}
                    onDragEnd={cleanup}
                    style={{
                      position: 'relative',
                      opacity: isBeingDragged ? 0.35 : 1,
                      ...(isDragOverItem && !isBeingDragged ? {
                        paddingTop: 2,
                        borderTop: `2px solid ${ACCENT}`,
                        marginTop: -2,
                      } : {}),
                    }}
                  >
                    <NavLink
                      to={item.path}
                      end
                      title={collapsed ? item.label : undefined}
                      onClick={isMobile ? onClose : undefined}
                      onMouseDown={e => e.preventDefault()}
                      style={({ isActive }) => ({
                        ...s.navItem,
                        ...(collapsed ? s.navItemCollapsed : {}),
                        ...(isActive  ? s.navItemActive   : {}),
                        margin: collapsed ? '1px 6px' : '1px 8px',
                      })}
                    >
                      {!collapsed && (
                        <span style={s.grip}>
                          <GripVertical size={11} strokeWidth={1.5} />
                        </span>
                      )}
                      {Icon && <Icon size={ICON_SIZE} strokeWidth={1.75} style={{ flexShrink: 0, color: 'currentColor' }} />}
                      {!collapsed && <span style={{ letterSpacing: '-0.01em', flex: 1 }}>{item.label}</span>}
                    </NavLink>
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* ── Botão de modo edição do menu ── */}
        {!collapsed && (
          <div style={{ margin: '8px 16px 4px' }}>
            {!menuEditMode ? (
              <button
                onClick={() => setMenuEditMode(true)}
                style={{ ...s.addGroupBtn, margin: 0, width: '100%', opacity: 0.5 }}
                title="Personalizar organização do menu"
              >
                <Pencil size={11} strokeWidth={2} />
                <span>Personalizar menu</span>
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Editar menu</span>
                  <button onClick={() => setMenuEditMode(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }} title="Fechar">
                    <X size={12} strokeWidth={2} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={createGroup} style={{ ...s.addGroupBtn, margin: 0, flex: 1 }} title="Novo grupo">
                    <Plus size={11} strokeWidth={2} />
                    <span>Novo grupo</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Restaurar a organização padrão do menu? As alterações serão perdidas.')) {
                        setGroups(INITIAL_GROUPS)
                        setOpenGroups({})
                        setMenuEditMode(false)
                      }
                    }}
                    style={{ ...s.addGroupBtn, margin: 0, flex: 'none', padding: '5px 8px' }}
                    title="Restaurar organização padrão"
                  >
                    <RotateCcw size={11} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ── Bottom: Configurações + Recolher + Sair ── */}
      <div style={s.bottom}>
        <NavLink
          to="/super-admin"
          title={collapsed ? 'Super Admin' : undefined}
          onClick={isMobile ? onClose : undefined}
          onMouseDown={e => e.preventDefault()}
          style={({ isActive }) => ({
            ...s.navItem,
            ...(collapsed ? { ...s.navItemCollapsed, justifyContent: 'center' } : {}),
            ...(isActive ? s.navItemActive : {}),
            margin: collapsed ? '1px 6px' : '1px 8px',
          })}
        >
          <ShieldAlert size={ICON_SIZE} strokeWidth={1.75} style={{ flexShrink: 0, color: 'currentColor' }} />
          {!collapsed && <span style={{ letterSpacing: '-0.01em' }}>Super Admin</span>}
        </NavLink>

        <NavLink
          to="/settings"
          title={collapsed ? 'Configurações' : undefined}
          onClick={isMobile ? onClose : undefined}
          onMouseDown={e => e.preventDefault()}
          style={{
            ...s.navItem,
            ...(collapsed ? { ...s.navItemCollapsed, justifyContent: 'center' } : {}),
            ...(inSettings ? s.navItemActive : {}),
            margin: collapsed ? '1px 6px' : '1px 8px',
          }}
        >
          <Settings size={ICON_SIZE} strokeWidth={1.75} style={{ flexShrink: 0, color: 'currentColor' }} />
          {!collapsed && <span style={{ letterSpacing: '-0.01em' }}>Configurações</span>}
        </NavLink>

        {!isMobile && (
          <button style={s.bottomBtn} onClick={onToggle} title={collapsed ? 'Expandir' : 'Recolher'}>
            <span style={{ display:'inline-block', transform: collapsed ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', fontFamily:'var(--mono)', fontSize:13 }}>‹‹</span>
            {!collapsed && <span style={{ fontSize: 12 }}>Recolher</span>}
          </button>
        )}

        <button style={{ ...s.bottomBtn, ...s.signOutBtn }} onClick={handleSignOut}>
          <span style={{ fontSize: 14 }}>⎋</span>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  sidebar: {
    height: '100%',
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    transition: 'width 0.22s ease',
    overflow: 'hidden',
    borderRight: '1px solid rgba(255,255,255,0.05)',
  },
  drawerMobile: {
    position: 'fixed', top: 52, left: 0, bottom: 0,
    width: '78vw', maxWidth: 280, zIndex: 300,
    boxShadow: '4px 0 32px rgba(0,0,0,0.4)', overflowY: 'auto',
  },

  brand: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    minHeight: 56, flexShrink: 0,
  },
  logoMark: {
    width: 32, height: 32, background: `${ACCENT}22`, border: `1px solid ${ACCENT}55`,
    borderRadius: 9, color: ACCENT, fontWeight: 800, fontSize: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--mono)', flexShrink: 0, letterSpacing: '-0.5px',
  },
  brandName: {
    color: '#f1f5f9', fontSize: 14, fontWeight: 700,
    letterSpacing: '-0.3px', whiteSpace: 'nowrap', flex: 1,
  },
  closeBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer', padding: '4px 6px', lineHeight: 1,
    marginLeft: 'auto', borderRadius: 5, display: 'flex', alignItems: 'center',
  },

  nav: { flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0 4px' },
  group: { marginBottom: 2 },

  groupHeader: {
    display: 'flex', alignItems: 'center',
    padding: '6px 8px 2px', marginTop: 10, minHeight: 26,
  },
  groupGrip: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: 'rgba(255,255,255,0.25)', cursor: 'grab', padding: '1px 3px',
    marginRight: 2, flexShrink: 0,
  },
  groupBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font)', padding: '2px 8px', width: '100%',
  },
  groupLabel: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.09em', color: '#8896aa', whiteSpace: 'nowrap',
  },
  chevron: { fontSize: 13, color: '#8896aa', transition: 'transform 0.2s', lineHeight: 1 },
  pencilBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: '#6366F1', cursor: 'pointer', padding: '1px 2px', borderRadius: 3, opacity: 0.85,
  },

  editInput: {
    flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${ACCENT}66`,
    borderRadius: 4, color: '#e2e8f0', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.09em', padding: '2px 6px',
    fontFamily: 'var(--font)', outline: 'none', width: 0,
  },
  editAction: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
    padding: '2px', borderRadius: 3,
  },

  navItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
    borderRadius: 7, color: '#cbd5e1', fontSize: 13, fontWeight: 500,
    borderLeft: '3px solid transparent',
    transition: 'background 0.12s, color 0.12s, border-left-color 0.12s',
    whiteSpace: 'nowrap', textDecoration: 'none', cursor: 'pointer',
    userSelect: 'none', outline: 'none',
  },
  navItemCollapsed: {
    justifyContent: 'center', padding: '8px 4px',
    borderLeft: '3px solid transparent', borderRadius: 7,
  },
  navItemActive: {
    color: '#ffffff', backgroundColor: '#1e293b', borderLeft: `3px solid ${ACCENT}`,
  },

  grip: {
    color: 'rgba(255,255,255,0.18)', cursor: 'grab', flexShrink: 0,
    display: 'flex', alignItems: 'center', marginLeft: -2,
  },

  addGroupBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    margin: '8px 16px 4px', padding: '5px 8px',
    background: 'none', border: '1px dashed rgba(255,255,255,0.12)',
    borderRadius: 6, color: 'rgba(255,255,255,0.3)', fontSize: 11,
    cursor: 'pointer', fontFamily: 'var(--font)', width: 'calc(100% - 32px)',
    transition: 'border-color 0.15s, color 0.15s',
  },

  bottom: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '6px 0 8px', display: 'flex', flexDirection: 'column', gap: 2,
  },
  bottomBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '8px 16px', background: 'none', border: 'none',
    color: '#64748b', fontSize: 12, cursor: 'pointer',
    fontFamily: 'var(--font)', borderRadius: 0, transition: 'color 0.15s',
  },
  signOutBtn: { color: '#64748b' },
}
