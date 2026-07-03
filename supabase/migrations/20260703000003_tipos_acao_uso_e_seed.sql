-- Adiciona coluna uso (acao | tarefa | ambos) que faltava em prod
ALTER TABLE public.tipos_acao
  ADD COLUMN IF NOT EXISTS uso text NOT NULL DEFAULT 'acao'
    CHECK (uso IN ('acao', 'tarefa', 'ambos'));

-- Seed dos tipos padrão por tenant (insere apenas se o tenant ainda não tem nenhum tipo)
-- Usa um DO para cada tenant existente
DO $$
DECLARE
  t_id uuid;
BEGIN
  FOR t_id IN SELECT id FROM public.tenants LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.tipos_acao
      WHERE tenant_id = t_id AND deleted_at IS NULL
        AND slug IN ('treinamento','evento','capacitacao','outros','ligacao','email','reuniao','visita','proposta','follow_up')
    ) THEN
      INSERT INTO public.tipos_acao (tenant_id, label, slug, icon, color, bg, text_color, uso, ativo) VALUES
        (t_id, 'Treinamento', 'treinamento', '🎓', 'var(--accent)',  '#EDE9FE', '#4338CA', 'acao',   true),
        (t_id, 'Evento',      'evento',      '📅', '#3B82F6',        '#DBEAFE', '#1D4ED8', 'acao',   true),
        (t_id, 'Capacitação', 'capacitacao', '🚀', '#10B981',        '#D1FAE5', '#065F46', 'acao',   true),
        (t_id, 'Outros',      'outros',      '◎',  '#6B7280',        '#F3F4F6', '#374151', 'acao',   true),
        (t_id, 'Ligação',     'ligacao',     '📞', '#3B82F6',        '#DBEAFE', '#1D4ED8', 'tarefa', true),
        (t_id, 'E-mail',      'email',       '📧', '#10B981',        '#D1FAE5', '#065F46', 'tarefa', true),
        (t_id, 'Reunião',     'reuniao',     '🤝', '#F59E0B',        '#FEF3C7', '#B45309', 'tarefa', true),
        (t_id, 'Visita',      'visita',      '📍', '#EC4899',        '#FCE7F3', '#9D174D', 'tarefa', true),
        (t_id, 'Proposta',    'proposta',    '📋', 'var(--accent)',  '#EDE9FE', 'var(--accent)', 'tarefa', true),
        (t_id, 'Follow-up',   'follow_up',   '🔔', '#EF4444',        '#FEE2E2', '#991B1B', 'tarefa', true)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
