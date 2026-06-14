import { useState } from 'react'

export default function PageHeader({
  title,
  breadcrumb = [],     // ['Comercial', 'Pipeline']
  actions   = null,    // elementos React (botões)
  tabs      = [],      // ['Todas', 'Ativas', 'Inativas']
  activeTab = null,
  onTabChange = () => {},
  style: extra = {},
}) {
  return (
    <div style={{ ...s.wrap, ...extra }}>
      <div style={s.top}>
        <div>
          {breadcrumb.length > 0 && (
            <p style={s.breadcrumb}>
              {breadcrumb.map((crumb, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ margin: '0 5px', opacity: 0.5 }}>/</span>}
                  <span style={i === breadcrumb.length - 1 ? { color: 'var(--text-sec)' } : {}}>{crumb}</span>
                </span>
              ))}
            </p>
          )}
          <h1 style={s.title}>{title}</h1>
        </div>
        {actions && <div style={s.actions}>{actions}</div>}
      </div>

      {tabs.length > 0 && (
        <div style={s.tabBar}>
          {tabs.map(tab => (
            <Tab key={tab} label={tab} active={activeTab === tab} onClick={() => onTabChange(tab)} />
          ))}
        </div>
      )}
    </div>
  )
}

function Tab({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font)', fontSize: 'var(--text-base)', fontWeight: active ? 500 : 400,
        color: active ? 'var(--text)' : hovered ? 'var(--text-sec)' : 'var(--text-muted)',
        padding: '0 4px 10px', marginRight: 20,
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'color var(--transition), border-color var(--transition)',
      }}
    >
      {label}
    </button>
  )
}

const s = {
  wrap: {
    paddingBottom: 'var(--space-5)',
    marginBottom: 'var(--space-5)',
    borderBottom: '1px solid var(--border)',
  },
  top: {
    display: 'flex', alignItems: 'flex-end',
    justifyContent: 'space-between', gap: 'var(--space-4)',
  },
  breadcrumb: {
    fontSize: 'var(--text-sm)', color: 'var(--text-muted)',
    marginBottom: 4, margin: 0,
  },
  title: {
    fontSize: 'var(--text-xl)', fontWeight: 700,
    color: 'var(--text)', letterSpacing: '-0.4px', margin: 0,
  },
  actions: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0,
  },
  tabBar: {
    display: 'flex', alignItems: 'center',
    marginTop: 'var(--space-4)', marginBottom: '-21px',
  },
}
