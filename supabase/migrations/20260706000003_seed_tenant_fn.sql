-- Função RPC chamada pelo signup para popular dados iniciais de um novo tenant
CREATE OR REPLACE FUNCTION public.seed_tenant(
  p_tenant_id  uuid,
  p_branch_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- ── 1. Perfis de acesso padrão ──────────────────────────────────────────
  INSERT INTO public.tenant_roles (tenant_id, name, base_role, is_system, permissions)
  VALUES
    (p_tenant_id, 'Administrador',  'admin_isv',   true, '{"all": true}'::jsonb),
    (p_tenant_id, 'Vendedor',       'vendedor',    true, '{}'::jsonb),
    (p_tenant_id, 'Financeiro',     'financeiro',  true, '{}'::jsonb),
    (p_tenant_id, 'Customer Success','cs',         true, '{}'::jsonb),
    (p_tenant_id, 'Projetos',       'projetos',    true, '{}'::jsonb)
  ON CONFLICT DO NOTHING;

  -- ── 2. Etapas do pipeline padrão ────────────────────────────────────────
  INSERT INTO public.pipeline_stages (tenant_id, name, order_idx, color, is_won, is_lost)
  VALUES
    (p_tenant_id, 'Prospecção',   1, '#6366f1', false, false),
    (p_tenant_id, 'Qualificação', 2, '#3b82f6', false, false),
    (p_tenant_id, 'Proposta',     3, '#f59e0b', false, false),
    (p_tenant_id, 'Negociação',   4, '#f97316', false, false),
    (p_tenant_id, 'Fechado',      5, '#10b981', true,  false),
    (p_tenant_id, 'Perdido',      6, '#ef4444', false, true)
  ON CONFLICT DO NOTHING;

  -- ── 3. Tipos de ação padrão ─────────────────────────────────────────────
  INSERT INTO public.tipos_acao (tenant_id, label, slug, icon, color, bg, text_color)
  VALUES
    (p_tenant_id, 'Ligação',   'ligacao',  'phone',         '#3b82f6', '#eff6ff', '#1d4ed8'),
    (p_tenant_id, 'E-mail',    'email',    'mail',          '#8b5cf6', '#f5f3ff', '#6d28d9'),
    (p_tenant_id, 'Reunião',   'reuniao',  'users',         '#10b981', '#f0fdf4', '#065f46'),
    (p_tenant_id, 'Visita',    'visita',   'map-pin',       '#f59e0b', '#fffbeb', '#92400e'),
    (p_tenant_id, 'WhatsApp',  'whatsapp', 'message-circle','#22c55e', '#f0fdf4', '#166534'),
    (p_tenant_id, 'Proposta',  'proposta', 'file-text',     '#6366f1', '#eef2ff', '#3730a3')
  ON CONFLICT (tenant_id, slug) DO NOTHING;

END;
$$;

-- Permissão para usuários autenticados chamarem via RPC
GRANT EXECUTE ON FUNCTION public.seed_tenant(uuid, uuid) TO authenticated;
