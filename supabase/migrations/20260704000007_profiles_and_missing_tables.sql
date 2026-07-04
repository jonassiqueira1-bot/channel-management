-- ─── 1. Garante que my_role() retorna o valor correto ─────────────────────────
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── 2. RPC: lê todos os perfis do tenant (bypassa RLS circular) ───────────────
CREATE OR REPLACE FUNCTION public.get_tenant_profiles()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM public.profiles
  WHERE tenant_id = (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
  )
  ORDER BY nome;
$$;

-- ─── 3. RPC: atualiza perfil (admin pode editar qualquer perfil do tenant) ──────
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
  p_regras_comissao_ids jsonb       DEFAULT '[]'
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
    updated_at           = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_profiles()                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile(uuid, text, text, text, text, text, text, numeric, numeric, int, jsonb, text, text, jsonb, uuid, jsonb, jsonb) TO authenticated;

-- ─── 4. Tabela audit_logs (se não existir) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  timestamp    timestamptz NOT NULL DEFAULT now(),
  usuario_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  usuario_nome text,
  acao         text        NOT NULL,
  entidade     text        NOT NULL,
  entidade_id  text,
  descricao    text,
  antes        jsonb,
  depois       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts     ON public.audit_logs (timestamp DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs: view"   ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs: insert" ON public.audit_logs;
CREATE POLICY "audit_logs: view"   ON public.audit_logs FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "audit_logs: insert" ON public.audit_logs FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- ─── 5. Tabela pending_invites (se não existir) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_invites (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  email        text        NOT NULL,
  papel        text        NOT NULL DEFAULT 'vendedor',
  tipo_usuario text        NOT NULL DEFAULT 'externo',
  status       text        NOT NULL DEFAULT 'pendente',
  criado_em    timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant isolado" ON public.pending_invites;
CREATE POLICY "tenant isolado" ON public.pending_invites
  USING (tenant_id = public.my_tenant_id())
  WITH CHECK (tenant_id = public.my_tenant_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_invites TO authenticated;
