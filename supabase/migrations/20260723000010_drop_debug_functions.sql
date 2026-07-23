-- Remove as funções de diagnóstico temporárias criadas durante a
-- investigação do timeout de RLS (ver 20260723000002 a 000006 e 000009) —
-- serviram só pra obter EXPLAIN ANALYZE real e a distribuição de branch_id
-- direto do banco; não são parte da aplicação.
DROP FUNCTION IF EXISTS public.debug_explain_companies_kpis();
DROP FUNCTION IF EXISTS public.debug_branch_distribution();
DROP FUNCTION IF EXISTS public.debug_list_branch_policies();
