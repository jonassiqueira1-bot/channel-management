-- TEMPORÁRIO — versão sem ANALYZE (só planeja, não executa) já que o
-- EXPLAIN ANALYZE anterior também estourou os 8s. Isso mostra o PLANO
-- (Seq Scan vs Index Scan, e se a RLS aparece como Filter) sem rodar a
-- query de verdade — deve retornar quase instantâneo.
CREATE OR REPLACE FUNCTION public.debug_explain_companies_kpis()
RETURNS SETOF text LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY EXECUTE $q$
    EXPLAIN (FORMAT TEXT)
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
