// Sem pílula — texto colorido, sem fundo/borda. A cor semântica carrega o
// significado (verde=ok, amarelo=atenção, vermelho=problema, azul=info,
// cinza=neutro); o `dot` é opcional pra reforçar "status" quando fizer
// sentido (ex: uma lista de registros), mas o badge em si nunca vira caixa.
export default function Badge({
  children,
  variant,            // 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'
  status,             // string do banco — faz o mapeamento automático
  dot = true,          // mostra bolinha colorida antes do texto
  style: extra = {},
}) {
  const resolvedVariant = variant ?? statusMap[status] ?? 'neutral'
  const { color } = tokens[resolvedVariant] ?? tokens.neutral
  const label = children ?? status

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 'var(--text-xs)', fontWeight: 600,
      color, whiteSpace: 'nowrap', lineHeight: 1.4,
      ...extra,
    }}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color, flexShrink: 0,
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

// Paleta semântica simples — mesmas 5 cores usadas no resto do sistema
// (ver redesenho de Ações): verde=concluído, amarelo=atenção,
// vermelho=problema, azul=navegação/info, cinza=secundário.
const tokens = {
  success: { color: 'var(--success, #059669)' },
  warning: { color: 'var(--warning, #B45309)' },
  danger:  { color: 'var(--danger, #DC2626)'  },
  info:    { color: 'var(--info, #2563EB)'    },
  neutral: { color: 'var(--text-muted)' },
  accent:  { color: 'var(--accent)' },
}
