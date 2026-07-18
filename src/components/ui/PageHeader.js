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
 *   tabs         {id,label}[]  navegação entre funcionalidades do módulo (opcional)
 *   activeTab    string        id da tab ativa
 *   onTabChange  (id) => void
 *   style        object        estilo extra no root
 */
export default function PageHeader({
  title,
  breadcrumb,
  actions,
  showKpis,
  onToggleKpis,
  kpisLabel = 'indicadores',
  tabs,
  activeTab,
  onTabChange,
  style,
}) {
  const hasTabs = tabs?.length > 0
  const hasHeading = breadcrumb?.length > 0 || title

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
      borderBottom: hasTabs ? '1px solid var(--border)' : undefined,
      flexWrap: 'wrap',
      ...style,
    }}>
      {/* Esquerda: breadcrumb + título + toggle + tabs — tudo numa única linha */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: hasTabs ? 24 : 8 }}>
        {hasHeading && (
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
            {title && (
              <h1 style={{
                margin: 0, fontSize: 15, fontWeight: 600,
                color: 'var(--text-muted)', letterSpacing: '-0.2px',
              }}>
                {title}
              </h1>
            )}
          </div>
        )}

        {onToggleKpis && (
          <button
            onClick={onToggleKpis}
            title={showKpis ? `Ocultar ${kpisLabel}` : `Mostrar ${kpisLabel}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
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

        {/* Navegação entre funcionalidades do módulo — tabs com indicador inferior.
            Altura fixa + centralização via flex (em vez de padding vertical) garante que
            o peso da fonte (600 na aba ativa vs 500 nas demais) não desloque o texto —
            variações de métrica de negrito/regular não afetam uma caixa de altura fixa. */}
        {hasTabs && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
            {tabs.map(t => {
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange?.(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    height: 36, marginBottom: -1, padding: '0 2px',
                    background: 'none', border: 'none',
                    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                    color: active ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: active ? 600 : 500, lineHeight: 1,
                    fontFamily: 'var(--font)', cursor: 'pointer', whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-soft)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Direita: actions */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: hasTabs ? 10 : 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
