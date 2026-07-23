-- TEMPORÁRIO — verificação de emergência pós-deploy: lista quais tabelas do
-- padrão de RLS afetado (can_see_branch_record) NÃO têm mais policy de
-- SELECT (o que causaria "deny all" silencioso), e confere se as funções
-- essenciais ainda existem/compilam.
CREATE OR REPLACE FUNCTION public.debug_emergency_check()
RETURNS TABLE (item text, ok boolean, detalhe text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  tabelas text[] := ARRAY[
    'acoes','alert_rules','audit_logs','campanhas','commission_rules','companies',
    'contacts','contracts','customer_health','documents','equipes','form_layouts',
    'goals','habilitacoes','indicadores','metas_kpi','oportunidades','parceiros',
    'partner_maturity_params','payments','perfis_acesso','pipeline_stages','playbooks',
    'products','projects','questionnaire_templates','relatorios','sellers','tasks',
    'tipos_acao','actions'
  ];
  t text;
  v_cnt int;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    SELECT COUNT(*) INTO v_cnt FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT';
    RETURN QUERY SELECT 'policy_select:' || t, v_cnt > 0, v_cnt::text || ' policy(ies)';
  END LOOP;

  BEGIN
    PERFORM public.my_tenant_id();
    RETURN QUERY SELECT 'my_tenant_id()', true, 'ok (sem sessão, deve retornar null)';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'my_tenant_id()', false, SQLERRM;
  END;

  BEGIN
    PERFORM public.my_branch_id();
    RETURN QUERY SELECT 'my_branch_id()', true, 'ok';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'my_branch_id()', false, SQLERRM;
  END;

  BEGIN
    PERFORM public.my_branch_ids();
    RETURN QUERY SELECT 'my_branch_ids()', true, 'ok';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'my_branch_ids()', false, SQLERRM;
  END;

  BEGIN
    PERFORM public.can_see_branch_record(NULL::uuid, NULL::uuid, 'companies', NULL::uuid, NULL::uuid[]);
    RETURN QUERY SELECT 'can_see_branch_record()', true, 'ok';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'can_see_branch_record()', false, SQLERRM;
  END;
END;
$$;
