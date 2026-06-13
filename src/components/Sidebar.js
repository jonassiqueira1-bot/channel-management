import { useState, useRef } from 'react'
import { NavLink, useNavigate, useMatch } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, TrendingUp, Zap, CheckSquare, Target,
  Building2, UserCircle, FileText, CreditCard, FolderKanban,
  ClipboardList, FileStack, BookOpen, DollarSign, Settings,
  Pencil, Check, X, GripVertical,
} from 'lucide-react'

// ─── Configuração inicial dos grupos e itens ──────────────────────────────────
const INITIAL_GROUPS = [
  {
    id: 'visao',
    label: 'Visão Geral',
    items: [
      { path: '/dashboard',    label: 'Dashboard',   Icon: LayoutDashboard },
    ],
  },
  {
    id: 'canal',
    label: 'Canal',
    items: [
      { path: '/vendedores',   label: 'Contatos Canais',  Icon: Users },
    ],
  },
  {
    id: 'comercial',
    label: 'Comercial',
    items: [
      { path: '/pipeline',     label: 'Pipeline',    Icon: TrendingUp },
      { path: '/acoes',        label: 'Ações',       Icon: Zap },
      { path: '/tarefas',      label: 'Tarefas',     Icon: CheckSquare },
      { path: '/metas',        label: 'Metas',       Icon: Target },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    items: [
      { path: '/empresas',     label: 'Empresas',    Icon: Building2 },
      { path: '/contatos',     label: 'Contatos',    Icon: UserCircle },
      { path: '/contratos',    label: 'Contratos',   Icon: FileText },
      { path: '/pagamentos',   label: 'Pagamentos',  Icon: CreditCard },
    ],
  },
  {
    id: 'operacao',
    label: 'Operação',
    items: [
      { path: '/projetos',      label: 'Projetos',      Icon: FolderKanban },
      { path: '/questionarios', label: 'Questionários', Icon: ClipboardList },
      { path: '/documentos',    label: 'Documentos',    Icon: FileStack },
      { path: '/playbooks',     label: 'Playbooks',     Icon: BookOpen },
      { path: '/comissoes',     label: 'Comissões',     Icon: DollarSign },
    ],
  },
]

const ACCENT     = '#6366F1'
const ICON_SIZE  = 15

export default function Sidebar({ collapsed, onToggle, isMobile, onClose }) {
  const [groups, setGroups]           = useState(INITIAL_GROUPS)
  const [openGroups, setOpenGroups]   = useState({ visao: true, canal: true, comercial: true, clientes: true, operacao: true })

  // ── Edição inline de rótulo de grupo ──────────────────────────────────────
  const [editingGroup, setEditingGroup] = useState(null)   // id do grupo
  const [editValue,    setEditValue]    = useState('')
  const [hoveredGroup, setHoveredGroup] = useState(null)
  const editInputRef = useRef(null)

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  // dragSrc  = { gIdx, iIdx }
  // dragOver = { gIdx, iIdx } | { gIdx, iIdx: null } (sobre o header do grupo)
  const [dragSrc,  setDragSrc]  = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const { signOut } = useAuth()
  const navigate    = useNavigate()
  const inSettings  = !!useMatch('/settings/*')

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleGroup(id) {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // ── Edição de grupo ───────────────────────────────────────────────────────
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

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  function onDragStart(e, gIdx, iIdx) {
    setDragSrc({ gIdx, iIdx })
    e.dataTransfer.effectAllowed = 'move'
    // ghost image transparente para não poluir
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-999px;opacity:0'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function onDragOver(e, gIdx, iIdx = null) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver({ gIdx, iIdx })
  }

  function onDrop(e, gDst, iDst) {
    e.preventDefault()
    if (!dragSrc) return
    const { gIdx: gSrc, iIdx: iSrc } = dragSrc

    // Se origem === destino e mesma posição, não faz nada
    if (gSrc === gDst && (iSrc === iDst || iDst === null)) { cleanup(); return }

    setGroups(prev => {
      const next  = prev.map(g => ({ ...g, items: [...g.items] }))
      const [item] = next[gSrc].items.splice(iSrc, 1)

      if (iDst === null) {
        // Soltar sobre o header: adiciona ao final do grupo
        next[gDst].items.push(item)
      } else {
        // Ajusta índice de destino se removemos do mesmo grupo acima do alvo
        const adjustedDst = gSrc === gDst && iSrc < iDst ? iDst - 1 : iDst
        next[gDst].items.splice(adjustedDst, 0, item)
      }

      // Garante grupo de destino aberto
      setOpenGroups(o => ({ ...o, [prev[gDst].id]: true }))
      return next
    })
    cleanup()
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
          const isEditing  = editingGroup === group.id
          const isHovered  = hoveredGroup === group.id
          const isOpen     = !!openGroups[group.id]
          const isDragOverHeader = dragOver?.gIdx === gIdx && dragOver?.iIdx === null

          return (
            <div key={group.id} style={s.group}>

              {/* ── Cabeçalho do grupo ── */}
              {!collapsed && (
                <div
                  style={{
                    ...s.groupHeader,
                    background: isDragOverHeader ? 'rgba(99,102,241,0.12)' : 'transparent',
                    borderRadius: isDragOverHeader ? 6 : 0,
                    margin: isDragOverHeader ? '0 8px' : 0,
                  }}
                  onMouseEnter={() => setHoveredGroup(group.id)}
                  onMouseLeave={() => setHoveredGroup(null)}
                  onDragOver={e => onDragOver(e, gIdx, null)}
                  onDrop={e => onDrop(e, gIdx, null)}
                >
                  {isEditing ? (
                    /* Modo edição do rótulo */
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
                    /* Modo exibição */
                    <button
                      style={{ ...s.groupBtn, flex: 1 }}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <span style={s.groupLabel}>{group.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isHovered && !dragSrc && (
                          <span
                            role="button"
                            title="Renomear grupo"
                            onClick={e => startEdit(group, e)}
                            style={s.pencilBtn}
                          >
                            <Pencil size={9} strokeWidth={2} />
                          </span>
                        )}
                        <span style={{
                          ...s.chevron,
                          transform: isOpen ? 'rotate(90deg)' : 'none',
                          opacity: isHovered ? 0.7 : 0.4,
                        }}>›</span>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* ── Itens do grupo ── */}
              {(collapsed || isOpen) && group.items.map((item, iIdx) => {
                const { Icon } = item
                const isBeingDragged = dragSrc?.gIdx === gIdx && dragSrc?.iIdx === iIdx
                const isDragOverItem = dragOver?.gIdx === gIdx && dragOver?.iIdx === iIdx

                return (
                  <div
                    key={item.path}
                    draggable={!collapsed}
                    onDragStart={e => onDragStart(e, gIdx, iIdx)}
                    onDragOver={e => onDragOver(e, gIdx, iIdx)}
                    onDrop={e => onDrop(e, gIdx, iIdx)}
                    onDragEnd={cleanup}
                    style={{
                      position: 'relative',
                      opacity: isBeingDragged ? 0.35 : 1,
                      // Linha indicadora acima do item alvo
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
                      {/* Grip handle — só aparece no hover e não collapsed */}
                      {!collapsed && (
                        <span style={s.grip}>
                          <GripVertical size={11} strokeWidth={1.5} />
                        </span>
                      )}

                      {Icon && (
                        <Icon
                          size={ICON_SIZE}
                          strokeWidth={1.75}
                          style={{ flexShrink: 0, color: 'currentColor' }}
                        />
                      )}

                      {!collapsed && (
                        <span style={{ letterSpacing: '-0.01em', flex: 1 }}>{item.label}</span>
                      )}
                    </NavLink>
                  </div>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* ── Bottom: Configurações + Recolher + Sair ── */}
      <div style={s.bottom}>
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
          <Settings
            size={ICON_SIZE}
            strokeWidth={1.75}
            style={{ flexShrink: 0, color: 'currentColor' }}
          />
          {!collapsed && <span style={{ letterSpacing: '-0.01em' }}>Configurações</span>}
        </NavLink>

        {!isMobile && (
          <button style={s.bottomBtn} onClick={onToggle} title={collapsed ? 'Expandir' : 'Recolher'}>
            <span style={{
              display: 'inline-block',
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              fontFamily: 'var(--mono)',
              fontSize: 13,
            }}>‹‹</span>
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
    position: 'fixed',
    top: 52,
    left: 0,
    bottom: 0,
    width: '78vw',
    maxWidth: 280,
    zIndex: 300,
    boxShadow: '4px 0 32px rgba(0,0,0,0.4)',
    overflowY: 'auto',
  },

  /* Brand */
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    minHeight: 56,
    flexShrink: 0,
  },
  logoMark: {
    width: 32,
    height: 32,
    background: `${ACCENT}22`,
    border: `1px solid ${ACCENT}55`,
    borderRadius: 9,
    color: ACCENT,
    fontWeight: 800,
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--mono)',
    flexShrink: 0,
    letterSpacing: '-0.5px',
  },
  brandName: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '-0.3px',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    padding: '4px 6px',
    lineHeight: 1,
    marginLeft: 'auto',
    borderRadius: 5,
    display: 'flex',
    alignItems: 'center',
  },

  /* Nav */
  nav: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px 0 4px',
  },
  group: {
    marginBottom: 2,
  },

  /* Cabeçalho de grupo */
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 8px 2px',
    marginTop: 10,
    minHeight: 26,
  },
  groupBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    padding: '2px 8px',
    width: '100%',
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: '#8896aa',    // ← muito mais nítido que #475569
    whiteSpace: 'nowrap',
  },
  chevron: {
    fontSize: 13,
    color: '#8896aa',
    transition: 'transform 0.2s',
    lineHeight: 1,
  },
  pencilBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6366F1',
    cursor: 'pointer',
    padding: '1px 2px',
    borderRadius: 3,
    opacity: 0.85,
  },

  /* Edição inline */
  editInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${ACCENT}66`,
    borderRadius: 4,
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    padding: '2px 6px',
    fontFamily: 'var(--font)',
    outline: 'none',
    width: 0,   // flex faz o tamanho
  },
  editAction: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: 3,
  },

  /* Nav item */
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 7,
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 500,
    borderLeft: '3px solid transparent',
    transition: 'background 0.12s, color 0.12s, border-left-color 0.12s',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    padding: '8px 4px',
    borderLeft: '3px solid transparent',
    borderRadius: 7,
  },
  navItemActive: {
    color: '#ffffff',
    backgroundColor: '#1e293b',
    borderLeft: `3px solid ${ACCENT}`,
  },

  /* Grip handle */
  grip: {
    color: 'rgba(255,255,255,0.18)',
    cursor: 'grab',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    marginLeft: -2,
  },

  /* Bottom */
  bottom: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '6px 0 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  bottomBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 16px',
    background: 'none',
    border: 'none',
    color: '#64748b',       // slate-500 — mais legível que antes
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    borderRadius: 0,
    transition: 'color 0.15s',
  },
  signOutBtn: {
    color: '#64748b',
  },
}
