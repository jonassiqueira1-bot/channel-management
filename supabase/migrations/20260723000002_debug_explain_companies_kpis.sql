-- TEMPORÁRIO — só para diagnosticar o timeout (57014) que persiste em
-- companies_kpis mesmo depois do fix de tipo (20260723000001). Roda
-- EXPLAIN ANALYZE da mesma agregação, com RLS ativo (SECURITY INVOKER,
-- roda com o papel de quem chama) — mostra exatamente se o custo real
-- está no Seq Scan, na função can_see_branch_record por linha, ou outra
-- coisa. Será removida assim que o diagnóstico terminar.
CREATE OR REPLACE FUNCTION public.debug_explain_companies_kpis()
RETURNS SETOF text LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY EXECUTE $q$
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT
      COUNT(*) FILTER (WHERE status = 'ativo')      AS total_ativo,
      COUNT(*) FILTER (WHERE status = 'negociacao') AS total_negociacao,
      COALESCE(SUM(
        CASE WHEN (custom_fields->>'mrr') ~ '^-?[0-9]+(\.[0-9]+)?$'
             THEN (custom_fields->>'mrr')::numeric
             ELSE 0
        END
      ) FILTER (WHERE status = 'ativo'), 0) AS mrr_total
    FROM public.companies
  $q$;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_explain_companies_kpis TO authenticated;
