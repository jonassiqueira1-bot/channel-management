import { ChevronDown, ChevronUp } from 'lucide-react'

/**
 * PageHeader — cabeçalho padronizado para páginas do sistema.
 *
 * Props:
 *   title        string        título principal (obrigatório)
 *   breadcrumb   string[]      ex: ['Comercial', 'Pipeline'] (opcional)
 *   actions      ReactNode     botões do lado direito (ex: "+ Novo")
 *   showKpis     bool          estado atual do toggle de indicadores
 *   onToggleKpis () => void    callback do toggle (omitir = sem toggle)
 *   kpisLabel    string        texto do tooltip/badge (default: "indicadores")
 *   style        object        estilo extra no root
 */
export default function PageHeader({
  title,
  breadcrumb,
  actions,
  showKpis,
  onToggleKpis,
  kpisLabel = 'indicadores',
  style,
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      ...style,
    }}>
      {/* Esquerda: breadcrumb + título + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div>
          {breadcrumb?.length > 0 && (
            <div style={{
              fontSize: 11, color: 'var(--text-muted)', marginBottom: 2,
              display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {breadcrumb.map((crumb, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <span style={{ opacity: 0.4 }}>›</span>}
                  {crumb}
                </span>
              ))}
            </div>
          )}
          <h1 style={{
            margin: 0, fontSize: 15, fontWeight: 600,
            color: 'var(--text-muted)', letterSpacing: '-0.2px',
          }}>
            {title}
          </h1>
        </div>

        {onToggleKpis && (
          <button
            onClick={onToggleKpis}
            title={showKpis ? `Ocultar ${kpisLabel}` : `Mostrar ${kpisLabel}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
              marginTop: breadcrumb?.length ? 14 : 0,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            {showKpis ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {/* Direita: actions */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
