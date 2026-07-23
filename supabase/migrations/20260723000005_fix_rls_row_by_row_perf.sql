-- Corrige a causa raiz da lentidão generalizada em telas com muitos
-- registros (Empresas, Parceiros, etc): can_see_branch_record() — usada na
-- policy de SELECT de ~15 tabelas — chama public.my_branch_id() e
-- public.my_branch_ids() "soltos" dentro do corpo da função. Mesmo sendo
-- STABLE, isso faz o Postgres reavaliar essas funções (que fazem SELECT em
-- profiles/tenant_branches) UMA VEZ PARA CADA LINHA da tabela sendo
-- verificada, em vez de uma vez só por consulta — confirmado via EXPLAIN
-- real (companies, ~11 mil linhas do tenant, timeout de 8s mesmo com o
-- índice correto sendo usado).
--
-- Fix: envolver as chamadas em `(SELECT ...)`. Isso faz o Postgres tratar
-- como uma subquery não-correlacionada (InitPlan) — computada uma vez só e
-- reaproveitada em todas as linhas. É o mesmo padrão que a própria Supabase
-- recomenda oficialmente para `auth.uid()` dentro de policies de RLS.
-- can_see_branch_record é LANGUAGE sql (não plpgsql), então o Postgres pode
-- inlinear seu corpo na query que chama — depois de inlineado, o
-- `(SELECT ...)` vira uma subquery de verdade no plano final, elegível pra
-- esse cache. Não muda nenhum resultado, só a forma de calcular.
CREATE OR REPLACE FUNCTION public.can_see_branch_record(rec_branch_id uuid, rec_id uuid, rec_table text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH ctx AS (SELECT public.my_branch_id() AS mb, public.my_branch_ids() AS mbs)
  SELECT
    rec_branch_id IS NULL
    OR rec_branch_id = ctx.mb
    OR rec_branch_id = ANY(ctx.mbs)
    OR public.branch_sharing_allows(rec_branch_id, rec_table, false)
  FROM ctx
$$;

CREATE OR REPLACE FUNCTION public.can_edit_branch_record(rec_branch_id uuid, rec_table text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.branch_sharing_allows(rec_branch_id, rec_table, true)
$$;
