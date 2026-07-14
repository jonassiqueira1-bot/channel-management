-- ═══════════════════════════════════════════════════════════════════════════
-- Compartilhamento entre Filiais — fecha as duas lacunas encontradas na
-- auditoria da tela src/pages/settings/BranchSharing.js:
--
--   1) "Leitura e escrita" (can_edit) era só decorativo — nenhuma policy de
--      UPDATE consultava branch_table_visibility. Agora existe
--      can_edit_branch_record(), usada em novas policies PERMISSIVE de UPDATE
--      (adicionais às já existentes — RLS combina PERMISSIVE com OR, então
--      isso só amplia acesso, nunca restringe o que já funcionava).
--
--   2) "Quem tem acesso" (acesso: todos/perfis/usuarios, gravado em
--      branch_table_visibility.meta) nunca era lido em lugar nenhum — a regra
--      valia pra qualquer usuário da filial-alvo, mesmo com "Perfis" ou
--      "Usuários específicos" selecionado. Agora can_see_branch_record() (e a
--      nova can_edit_branch_record()) checam esse meta de verdade.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.branch_sharing_allows(rec_branch_id uuid, rec_table text, want_edit boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_meta jsonb;
  v_can_edit boolean;
  v_uid uuid := auth.uid();
BEGIN
  SELECT btv.meta, btv.can_edit INTO v_meta, v_can_edit
  FROM public.branch_table_visibility btv
  WHERE btv.tenant_id = public.my_tenant_id()
    AND btv.source_branch_id = rec_branch_id
    AND btv.target_branch_id = public.my_branch_id()
    AND btv.entity_table = rec_table
    AND btv.can_view = true
  LIMIT 1;

  IF v_meta IS NULL THEN RETURN false; END IF;
  IF want_edit AND NOT COALESCE(v_can_edit, false) THEN RETURN false; END IF;

  CASE COALESCE(v_meta->>'acesso', 'todos')
    WHEN 'perfis' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.profiles pr, jsonb_array_elements_text(pr.perfis_acesso_ids) meu_perfil
        WHERE pr.id = v_uid
          AND meu_perfil IN (SELECT jsonb_array_elements_text(COALESCE(v_meta->'perfil_ids', '[]'::jsonb)))
      );
    WHEN 'usuarios' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_meta->'usuario_ids', '[]'::jsonb)) u
        WHERE u = v_uid::text
      );
    ELSE
      RETURN true; -- 'todos'
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_see_branch_record(rec_branch_id uuid, rec_id uuid, rec_table text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    rec_branch_id IS NULL
    OR rec_branch_id = public.my_branch_id()
    OR rec_branch_id = ANY(public.my_branch_ids())
    OR public.branch_sharing_allows(rec_branch_id, rec_table, false)
$$;

CREATE OR REPLACE FUNCTION public.can_edit_branch_record(rec_branch_id uuid, rec_table text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.branch_sharing_allows(rec_branch_id, rec_table, true)
$$;

-- Policies PERMISSIVE adicionais de UPDATE — uma por tabela compartilhável
-- (mesma lista de MODULO_TABELAS do hook), só criadas se a tabela realmente
-- tiver as colunas tenant_id + branch_id.
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'oportunidades','tasks','playbooks','sellers','actions','parceiros',
    'companies','contacts','projects','customer_health','contracts',
    'payments','commission_rules','questionnaire_templates','documents',
    'goals','relatorios','partner_maturity_params','perfis_acesso',
    'equipes','habilitacoes','products','form_layouts','tipos_acao',
    'campanhas','indicadores','metas_kpi','alert_rules'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='branch_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='tenant_id'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "%s_branch_share_edit" ON public.%I', t, t);
      EXECUTE format(
        'CREATE POLICY "%s_branch_share_edit" ON public.%I FOR UPDATE ' ||
        'USING (tenant_id = public.my_tenant_id() AND public.can_edit_branch_record(branch_id, %L)) ' ||
        'WITH CHECK (tenant_id = public.my_tenant_id() AND public.can_edit_branch_record(branch_id, %L))',
        t, t, t, t
      );
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
