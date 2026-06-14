export default function Badge({
  children,
  variant,            // 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'
  status,             // string do banco — faz o mapeamento automático
  dot = false,        // mostra bolinha colorida antes do texto
  style: extra = {},
}) {
  const resolvedVariant = variant ?? statusMap[status] ?? 'neutral'
  const { bg, color, border, dotColor } = tokens[resolvedVariant] ?? tokens.neutral
  const label = children ?? status

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 'var(--text-xs)', fontWeight: 500,
      padding: '2px 8px', borderRadius: 999,
      background: bg, color, border,
      whiteSpace: 'nowrap', lineHeight: 1.6,
      ...extra,
    }}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: dotColor ?? color, flexShrink: 0,
        }} />
      )}
      {label}
    </span>
  )
}

const statusMap = {
  'Ativo': 'success', 'Fechado': 'success', 'Ganho': 'success',
  'Habilitado': 'success', 'Aprovado': 'success', 'Concluído': 'success',
  'Em negociação': 'warning', 'Negociação': 'warning', 'Pendente': 'warning',
  'Em análise': 'warning', 'Aguardando': 'warning', 'Proposta': 'warning',
  'Perdido': 'danger', 'Cancelado': 'danger', 'Inativo': 'danger',
  'Bloqueado': 'danger', 'Vencido': 'danger',
  'Qualificação': 'info', 'Novo': 'info', 'Em aberto': 'info',
  'Sem responsável': 'neutral', 'Não iniciado': 'neutral',
}

const tokens = {
  success: { bg: 'var(--success-bg)', color: '#065F46', border: '1px solid #A7F3D0', dotColor: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', color: '#92400E', border: '1px solid #FDE68A', dotColor: 'var(--warning)' },
  danger:  { bg: 'var(--danger-bg)',  color: '#991B1B', border: '1px solid #FECACA', dotColor: 'var(--danger)'  },
  info:    { bg: 'var(--info-bg)',    color: '#1E40AF', border: '1px solid #BFDBFE', dotColor: 'var(--info)'    },
  neutral: { bg: 'var(--surface2)',   color: 'var(--text-sec)', border: '1px solid var(--border)' },
  accent:  { bg: 'var(--accent-lite)',color: 'var(--accent)',   border: '1px solid var(--accent-mid)' },
}
