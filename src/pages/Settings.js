import { useState } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { NavLink, Outlet, Navigate, useMatch, useResolvedPath, useNavigate } from 'react-router-dom'
import {
  Building2, UserCircle, Store, Users, ShieldCheck,
  ToggleRight, Package, Activity, Megaphone, Layout, Plug, Terminal, Share2, Filter, BarChart2, UsersRound, DollarSign, TrendingUp, Bell,
} from 'lucide-react'

const SECTIONS = [
  {
    label: 'Geral',
    items: [
      { path: '/settings/empresa',   label: 'Empresa / ISV',      Icon: Building2   },
      { path: '/settings/conta',     label: 'Minha Conta',        Icon: UserCircle  },
      { path: '/settings/franquias', label: 'Parceiros',          Icon: Store       },
    ],
  },
  {
    label: 'Segurança',
    items: [
      { path: '/settings/usuarios', label: 'Usuários',          Icon: Users        },
      { path: '/settings/perfis',   label: 'Perfis de Acesso',  Icon: ShieldCheck  },
      { path: '/settings/equipes',  label: 'Equipes',           Icon: UsersRound   },
    ],
  },
  {
    label: 'Regras do Canal',
    items: [
      { path: '/settings/habilitacoes', label: 'Habilitações',            Icon: ToggleRight },
      { path: '/settings/produtos',     label: 'Produtos',                Icon: Package     },
      { path: '/settings/funis',        label: 'Funis de Vendas',         Icon: Filter      },
      { path: '/settings/tipos-acoes',  label: 'Tipos de Ações',          Icon: Activity    },
      { path: '/settings/campanhas',    label: 'Campanhas de Incentivo',  Icon: Megaphone   },
      { path: '/settings/indicadores',  label: 'Indicadores',             Icon: TrendingUp  },
      { path: '/settings/metas',        label: 'Metas e KPIs',            Icon: BarChart2   },
    ],
  },
  {
    label: 'Multi-filial',
    items: [
      { path: '/settings/compartilhamento', label: 'Compartilhamento', Icon: Share2 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { path: '/settings/forms',       label: 'Config. de Campos', Icon: Layout   },
      { path: '/settings/alertas',     label: 'Alertas',     Icon: Bell     },
      { path: '/settings/integracoes', label: 'Integrações', Icon: Plug     },
      { path: '/settings/logs',        label: 'Logs',        Icon: Terminal },
    ],
  },
]

function NavItem({ item }) {
  const resolved = useResolvedPath(item.path)
  const match = useMatch({ path: resolved.pathname, end: true })
  const isActive = !!match
  return (
    <NavLink
      to={item.path}
      style={{
        ...s.item,
        ...(isActive ? s.itemActive : {}),
        outline: 'none',
      }}
    >
      <item.Icon size={14} strokeWidth={1.75} style={{ flexShrink: 0, color: isActive ? ACCENT : 'var(--text-muted)', transition: 'color 0.12s' }} />
      {item.label}
    </NavLink>
  )
}

function NavItemCollapsed({ item }) {
  const resolved = useResolvedPath(item.path)
  const match = useMatch({ path: resolved.pathname, end: true })
  const isActive = !!match
  return (
    <NavLink
      to={item.path}
      title={item.label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '9px 0', textDecoration: 'none', outline: 'none',
        background: isActive ? `${ACCENT}12` : 'none',
        borderLeft: `2px solid ${isActive ? ACCENT : 'transparent'}`,
        transition: 'background 0.12s',
      }}
    >
      <item.Icon size={14} strokeWidth={1.75} color={isActive ? ACCENT : 'var(--text-muted)'} />
    </NavLink>
  )
}

function SettingsOverview() {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '32px 40px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Configurações</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 32px' }}>Gerencie as configurações da plataforma, usuários, regras e integrações.</p>
      {SECTIONS.map(sec => (
        <div key={sec.label} style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
            {sec.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {sec.items.map(item => (
              <button key={item.path} onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.Icon size={16} strokeWidth={1.75} color='var(--accent)' />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Settings() {
  const atRoot = useMatch('/settings')
  const [collapsed, setCollapsed] = useLocalState('settings:collapsed', false)

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, background: 'var(--surface)' }}>

      {/* ── Left nav ── */}
      <aside style={{
        ...s.aside,
        width: collapsed ? 44 : 250,
        minWidth: collapsed ? 44 : 250,
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}>
        {/* Header com botão de recolher */}
        <div style={{ ...s.asideHeader, display:'flex', alignItems:'center', justifyContent:'space-between', paddingRight: 8 }}>
          {!collapsed && <span style={s.asideTitle}>Configurações</span>}
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 14, lineHeight: 1,
              marginLeft: collapsed ? 'auto' : 0,
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            {collapsed ? '›› ' : '‹‹'}
          </button>
        </div>

        {/* Nav items — ocultos quando recolhido */}
        {!collapsed && (
          <nav style={s.nav}>
            {SECTIONS.map(sec => (
              <div key={sec.label} style={s.section}>
                <div style={s.sectionLabel}>{sec.label}</div>
                {sec.items.map(item => (
                  <NavItem key={item.path} item={item} />
                ))}
              </div>
            ))}
          </nav>
        )}

        {/* Modo recolhido: só ícones */}
        {collapsed && (
          <nav style={{ padding: '8px 0' }}>
            {SECTIONS.flatMap(sec => sec.items).map(item => (
              <NavItemCollapsed key={item.path} item={item} />
            ))}
          </nav>
        )}
      </aside>

      {/* ── Right content ── */}
      <div style={s.content}>
        {atRoot ? <SettingsOverview /> : <Outlet />}
      </div>
    </div>
  )
}

/* ── Placeholder page used by every sub-route ── */
export function SettingsPage({ title, description }) {
  return (
    <div style={pg.wrap}>
      <div style={pg.header}>
        <h2 style={pg.title}>{title}</h2>
        {description && <p style={pg.desc}>{description}</p>}
      </div>
      <div style={pg.body}>
        <div style={pg.empty}>
          <span style={pg.emptyIcon}>⚙</span>
          <span style={pg.emptyText}>Esta seção está em construção.</span>
        </div>
      </div>
    </div>
  )
}

const ACCENT = 'var(--accent)'

const s = {
  aside: {
    width: 250,
    flexShrink: 0,
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--surface2)',
    overflowY: 'auto',
  },
  asideHeader: {
    padding: '20px 20px 12px',
    borderBottom: '1px solid var(--border)',
  },
  asideTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.2px',
  },
  nav: {
    padding: '8px 0 16px',
    flex: 1,
  },
  section: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: 'var(--text-muted)',
    padding: '12px 16px 4px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 16px',
    fontSize: 12.5,
    fontWeight: 500,
    color: 'var(--text-soft)',
    textDecoration: 'none',
    borderLeft: '2px solid transparent',
    transition: 'background 0.12s, color 0.12s',
    cursor: 'pointer',
  },
  itemActive: {
    color: ACCENT,
    background: `${ACCENT}12`,
    borderLeft: `2px solid ${ACCENT}`,
    fontWeight: 600,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    minWidth: 0,
  },
}

const pg = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    padding: '28px 32px 20px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  desc: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 4,
    margin: '4px 0 0',
  },
  body: {
    flex: 1,
    padding: '32px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 200,
    background: 'var(--surface2)',
    borderRadius: 12,
    border: '1px dashed var(--border2)',
  },
  emptyIcon: {
    fontSize: 28,
    opacity: 0.2,
  },
  emptyText: {
    fontSize: 13,
    color: 'var(--text-muted)',
  },
}
