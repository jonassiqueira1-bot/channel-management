-- TEMPORÁRIO — checa a distribuição real de branch_id nas empresas do
-- tenant atual, e compara com a filial ativa do usuário chamador. SECURITY
-- DEFINER só pra contornar RLS na leitura (é só contagem agregada, não
-- expõe linha nenhuma) — confirma se o problema é dado de teste com
-- branch_id divergente ou algo estrutural na função de RLS.
CREATE OR REPLACE FUNCTION public.debug_branch_distribution()
RETURNS TABLE (minha_filial uuid, branch_id uuid, qtd bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.my_branch_id(), c.branch_id, COUNT(*)
  FROM public.companies c
  WHERE c.tenant_id = public.my_tenant_id()
  GROUP BY c.branch_id
  ORDER BY COUNT(*) DESC
$$;

GRANT EXECUTE ON FUNCTION public.debug_branch_distribution TO authenticated;
