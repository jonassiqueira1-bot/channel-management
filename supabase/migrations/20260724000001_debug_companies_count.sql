-- TEMPORÁRIO — verifica se os ~11 mil registros de companies importados
-- ontem em produção ainda existem de verdade na tabela (bypassando RLS via
-- SECURITY DEFINER), e quebra por deleted_at / branch_id pra achar onde
-- estão os que não aparecem no browse (usuário só vê 7350 de 11 mil+).
CREATE OR REPLACE FUNCTION public.debug_companies_count()
RETURNS TABLE (categoria text, qtd bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'total_tenant (bypass RLS)'::text, COUNT(*)
  FROM public.companies WHERE tenant_id = public.my_tenant_id()
  UNION ALL
  SELECT 'total_nao_deletado', COUNT(*)
  FROM public.companies WHERE tenant_id = public.my_tenant_id() AND deleted_at IS NULL
  UNION ALL
  SELECT 'total_deletado', COUNT(*)
  FROM public.companies WHERE tenant_id = public.my_tenant_id() AND deleted_at IS NOT NULL
  UNION ALL
  SELECT 'branch_igual_a_minha', COUNT(*)
  FROM public.companies WHERE tenant_id = public.my_tenant_id() AND deleted_at IS NULL AND branch_id = public.my_branch_id()
  UNION ALL
  SELECT 'branch_diferente_da_minha', COUNT(*)
  FROM public.companies WHERE tenant_id = public.my_tenant_id() AND deleted_at IS NULL AND branch_id IS DISTINCT FROM public.my_branch_id()
  UNION ALL
  SELECT 'visivel_via_can_see_branch_record', COUNT(*)
  FROM public.companies
  WHERE tenant_id = public.my_tenant_id() AND deleted_at IS NULL
    AND public.can_see_branch_record(branch_id, id, 'companies', (SELECT public.my_branch_id()), (SELECT public.my_branch_ids()))
$$;

GRANT EXECUTE ON FUNCTION public.debug_companies_count TO authenticated;
