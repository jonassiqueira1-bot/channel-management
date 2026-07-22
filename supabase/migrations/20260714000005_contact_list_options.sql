-- Cargo e Departamento em Contatos eram texto livre (<input>), enquanto
-- Senioridade e Poder de Decisão já eram <select> com vocabulário fechado —
-- inconsistência que impedia qualquer comparação real contra o ICP de
-- Contato do Playbook (ex.: "Analista PCM" vs "Analista de PCM" nunca batem).
-- Tabela genérica por tenant+tipo, reaproveitável pra outras listas fechadas
-- editáveis pelo usuário (mesmo padrão de product_categories).
CREATE TABLE IF NOT EXISTS public.contact_list_options (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo        text        NOT NULL, -- 'cargo' | 'departamento'
  nome        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  UNIQUE (tenant_id, tipo, nome)
);
CREATE INDEX IF NOT EXISTS idx_contact_list_options_tenant ON public.contact_list_options (tenant_id, tipo);

ALTER TABLE public.contact_list_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_list_options: view"   ON public.contact_list_options;
DROP POLICY IF EXISTS "contact_list_options: manage" ON public.contact_list_options;
DROP POLICY IF EXISTS "soft_delete_filter"            ON public.contact_list_options;
DROP POLICY IF EXISTS no_hard_delete                  ON public.contact_list_options;
CREATE POLICY "contact_list_options: view" ON public.contact_list_options
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "contact_list_options: manage" ON public.contact_list_options
  FOR ALL USING (tenant_id = public.my_tenant_id())
  WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "soft_delete_filter" ON public.contact_list_options
  AS RESTRICTIVE FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY no_hard_delete ON public.contact_list_options
  AS RESTRICTIVE FOR DELETE USING (false);

-- ── contact_list_options entra na allowlist do soft_delete_record genérico
CREATE OR REPLACE FUNCTION public.soft_delete_record(p_table text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'companies','contacts','opportunities','products','projects',
    'contracts','payments','actions','sellers','goals','customer_health',
    'habilitacoes','tipos_acao','campanhas','parceiros','perfis_acesso',
    'equipes','documents','tasks','playbooks','questionnaire_templates',
    'questionnaire_submissions','commission_rules','commission_payments',
    'commission_personas','oportunidade_membros','relatorios',
    'alert_rules','pipeline_stages','provisoes','tabela_precos','profiles',
    'partner_maturity_params','product_categories','contact_list_options'
  ];
  v_tenant_id uuid;
  v_role text;
  v_oportunidade_id uuid;
BEGIN
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'tabela não permitida: %', p_table USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id, role INTO v_tenant_id, v_role FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_table = 'goals' AND v_role <> 'admin_isv' THEN
    IF EXISTS (SELECT 1 FROM goals WHERE id = p_id AND tenant_id = v_tenant_id AND valor_atual > 0) THEN
      RAISE EXCEPTION 'meta já possui realização registrada — apenas administradores podem excluir' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_table = 'contracts' THEN
    SELECT oportunidade_id INTO v_oportunidade_id FROM contracts WHERE id = p_id AND tenant_id = v_tenant_id;
    IF EXISTS (
      SELECT 1 FROM payments p WHERE p.tenant_id = v_tenant_id AND p.deleted_at IS NULL
        AND p.oportunidade_id = v_oportunidade_id
      UNION ALL
      SELECT 1 FROM provisoes pr JOIN contracts c ON c.id = p_id
        WHERE pr.tenant_id = v_tenant_id AND pr.company_id = c.company_id
    ) THEN
      RAISE EXCEPTION 'contrato possui provisões ou pagamentos registrados — exclusão bloqueada' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_table = 'projects' AND v_role <> 'admin_isv' THEN
    SELECT oportunidade_id INTO v_oportunidade_id FROM projects WHERE id = p_id AND tenant_id = v_tenant_id;
    IF v_oportunidade_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM commission_rules cr WHERE cr.tenant_id = v_tenant_id AND cr.deleted_at IS NULL
        AND cr.oportunidade_id = v_oportunidade_id
    ) THEN
      RAISE EXCEPTION 'projeto já gerou comissão — apenas administradores podem excluir' USING ERRCODE = '42501';
    END IF;
  END IF;

  EXECUTE format(
    'UPDATE %I SET deleted_at = now() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    p_table
  ) USING p_id, v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_record TO authenticated;

NOTIFY pgrst, 'reload schema';
