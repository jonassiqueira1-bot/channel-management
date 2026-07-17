-- INCIDENTE CRÍTICO: a migration 20260713000008_status_real_rls.sql recriou
-- my_tenant_id() sem SECURITY DEFINER (diferente de my_role()/my_branch_id()/
-- etc, que têm). Sem isso, a função roda como SECURITY INVOKER — a consulta
-- interna dela em profiles fica sujeita à própria RLS de profiles, que chama
-- my_tenant_id() de novo pra avaliar a policy, que consulta profiles de novo...
-- recursão infinita até estourar a pilha ("stack depth limit exceeded",
-- Postgres 54001). Resultado em produção: QUALQUER select em profiles via
-- PostgREST retornava 500, derrubando login de todo mundo (visto como "meu
-- usuário sumiu" / "não consigo logar, sem erro nenhum na tela").
CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND status = 'ativo' LIMIT 1;
$$;

NOTIFY pgrst, 'reload schema';
