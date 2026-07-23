-- Amplia a checagem: inclui alerts/dashboard_alerts (usadas pelo Dashboard,
-- não fazem parte do lote de 27 tabelas que mexi) e confere GRANT de SELECT
-- pro role authenticated em cada tabela (um GRANT faltando dá 403 mesmo com
-- RLS correta).
CREATE OR REPLACE FUNCTION public.debug_emergency_check()
RETURNS TABLE (item text, ok boolean, detalhe text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tabelas text[] := ARRAY[
    'acoes','alert_rules','audit_logs','campanhas','commission_rules','companies',
    'contacts','contracts','customer_health','documents','equipes','form_layouts',
    'goals','habilitacoes','indicadores','metas_kpi','oportunidades','parceiros',
    'partner_maturity_params','payments','perfis_acesso','pipeline_stages','playbooks',
    'products','projects','questionnaire_templates','relatorios','sellers','tasks',
    'tipos_acao','actions','alerts','dashboard_alerts'
  ];
  t text;
  v_cnt int;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    SELECT COUNT(*) INTO v_cnt FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT';
    RETURN QUERY SELECT 'policy_select:' || t, v_cnt > 0, v_cnt::text || ' policy(ies)';

    RETURN QUERY SELECT 'grant_select_authenticated:' || t,
      has_table_privilege('authenticated', 'public.' || t, 'SELECT'),
      'grant ok?';
  END LOOP;

  BEGIN
    PERFORM public.my_tenant_id();
    RETURN QUERY SELECT 'my_tenant_id()', true, 'ok';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'my_tenant_id()', false, SQLERRM;
  END;

  BEGIN
    PERFORM public.can_see_branch_record(NULL::uuid, NULL::uuid, 'companies', NULL::uuid, NULL::uuid[]);
    RETURN QUERY SELECT 'can_see_branch_record()', true, 'ok';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'can_see_branch_record()', false, SQLERRM;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_emergency_check TO authenticated;
