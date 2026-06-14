export default function EmptyState({
  icon        = '📄',
  title       = 'Nenhum item encontrado',
  description = '',
  action      = null,
  loading     = false,
  style: extra = {},
}) {
  if (loading) return <SkeletonLoader />

  return (
    <div style={{ ...s.wrap, ...extra }}>
      <span style={s.icon}>{icon}</span>
      <p style={s.title}>{title}</p>
      {description && <p style={s.desc}>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div style={{ padding: '8px 0' }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0 }
          100% { background-position: 600px 0 }
        }
        .skeleton {
          background: linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%);
          background-size: 600px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: var(--radius-sm);
        }
      `}</style>
      {[80, 60, 70, 55, 65].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="skeleton" style={{ width: `${w}%`, height: 13 }} />
          <div className="skeleton" style={{ width: 60, height: 13, flexShrink: 0 }} />
          <div className="skeleton" style={{ width: 80, height: 13, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}

const s = {
  wrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', textAlign: 'center',
    padding: '48px 24px', minHeight: 240,
  },
  icon:  { fontSize: 32, marginBottom: 14, opacity: 0.35, lineHeight: 1 },
  title: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' },
  desc:  { fontSize: 'var(--text-base)', color: 'var(--text-muted)', margin: 0, maxWidth: 340, lineHeight: 1.6 },
}
