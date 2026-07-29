-- Custo de headcount (governança financeira): profiles já tinha custo_hora
-- (usado em Projetos → Financeiro); falta o vínculo com Centro de Custo pra
-- esse custo entrar na apuração do Orçamento (planejado x realizado).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_centro_custo ON public.profiles (centro_custo_id);

-- Assinatura anterior tinha 1 parâmetro a menos — Postgres trataria como
-- overload separado em vez de substituir; remove explicitamente antes.
DROP FUNCTION IF EXISTS public.update_profile(uuid, text, text, text, text, text, text, numeric, numeric, int, jsonb, text, text, jsonb, uuid, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.update_profile(
  p_id                  uuid,
  p_role                text,
  p_nome                text,
  p_status              text,
  p_cargo               text        DEFAULT NULL,
  p_senioridade         text        DEFAULT NULL,
  p_tipo_recurso        text        DEFAULT NULL,
  p_billing_rate        numeric     DEFAULT NULL,
  p_custo_hora          numeric     DEFAULT NULL,
  p_horas_semana        int         DEFAULT 40,
  p_habilidades         jsonb       DEFAULT '[]',
  p_linkedin_url        text        DEFAULT NULL,
  p_whatsapp            text        DEFAULT NULL,
  p_branch_ids          jsonb       DEFAULT '[]',
  p_branch_id           uuid        DEFAULT NULL,
  p_perfis_acesso_ids   jsonb       DEFAULT '[]',
  p_regras_comissao_ids jsonb       DEFAULT '[]',
  p_centro_custo_id     uuid        DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_tenant uuid;
  v_target_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_caller_tenant FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  SELECT tenant_id INTO v_target_tenant FROM public.profiles WHERE id = p_id LIMIT 1;

  IF v_caller_tenant IS NULL OR v_caller_tenant <> v_target_tenant THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  UPDATE public.profiles SET
    role                 = p_role,
    nome                 = p_nome,
    status               = p_status,
    cargo                = p_cargo,
    senioridade          = p_senioridade,
    tipo_recurso         = p_tipo_recurso,
    billing_rate         = p_billing_rate,
    custo_hora           = p_custo_hora,
    horas_semana         = COALESCE(p_horas_semana, 40),
    habilidades          = COALESCE(p_habilidades, '[]'),
    linkedin_url         = p_linkedin_url,
    whatsapp             = p_whatsapp,
    branch_ids           = COALESCE(p_branch_ids, '[]'),
    branch_id            = p_branch_id,
    perfis_acesso_ids    = COALESCE(p_perfis_acesso_ids, '[]'),
    regras_comissao_ids  = COALESCE(p_regras_comissao_ids, '[]'),
    centro_custo_id      = p_centro_custo_id,
    updated_at           = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_profile(uuid, text, text, text, text, text, text, numeric, numeric, int, jsonb, text, text, jsonb, uuid, jsonb, jsonb, uuid) TO authenticated;
