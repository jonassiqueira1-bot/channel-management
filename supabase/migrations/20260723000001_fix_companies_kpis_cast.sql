-- Corrige o 500 real visto em produção/dev na tela de Empresas — a função
-- companies_kpis (20260722000001) tinha DOIS bugs de tipo que a derrubavam
-- em toda chamada (nunca funcionou desde que foi criada):
--   1) `owner_id = p_resp` — owner_id é uuid, p_resp é text; sem cast
--      implícito entre uuid e text, Postgres recusa com 42883 "operator
--      does not exist: uuid = text" nem chega a rodar a query.
--   2) `(custom_fields->>'mrr')::numeric` sem guarda — qualquer linha com
--      esse campo vazio/não-numérico (dado legado) quebra o cast.
-- Como LANGUAGE sql não valida tipos no CREATE (só na primeira execução),
-- o bug 1 passou despercebido até aparecer em produção.
CREATE OR REPLACE FUNCTION public.companies_kpis(
  p_search  text DEFAULT NULL,
  p_status  text DEFAULT NULL,
  p_tipo    text DEFAULT NULL,
  p_seg     text DEFAULT NULL,
  p_porte   text DEFAULT NULL,
  p_receita text DEFAULT NULL,
  p_uf      text DEFAULT NULL,
  p_origem  text DEFAULT NULL,
  p_resp    text DEFAULT NULL,
  p_unidade text DEFAULT NULL
)
RETURNS TABLE (total_ativo bigint, total_negociacao bigint, mrr_total numeric)
LANGUAGE sql STABLE AS $$
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
  WHERE
    (p_unidade IS NULL OR p_unidade = '' OR p_unidade = 'independente')
    AND (p_search IS NULL OR p_search = '' OR (
      razao_social      ILIKE '%' || p_search || '%'
      OR nome_fantasia  ILIKE '%' || p_search || '%'
      OR cnpj           ILIKE '%' || p_search || '%'
      OR address->>'cidade' ILIKE '%' || p_search || '%'
    ))
    AND (p_status  IS NULL OR p_status  = '' OR status               = p_status)
    AND (p_tipo    IS NULL OR p_tipo    = '' OR tipo                 = p_tipo)
    AND (p_seg     IS NULL OR p_seg     = '' OR segment              = p_seg)
    AND (p_porte   IS NULL OR p_porte   = '' OR porte                = p_porte)
    AND (p_receita IS NULL OR p_receita = '' OR receita_faixa        = p_receita)
    AND (p_uf      IS NULL OR p_uf      = '' OR address->>'uf'       = p_uf)
    AND (p_origem  IS NULL OR p_origem  = '' OR custom_fields->>'origem' = p_origem)
    AND (p_resp    IS NULL OR p_resp    = '' OR owner_id::text       = p_resp)
$$;

GRANT EXECUTE ON FUNCTION public.companies_kpis TO authenticated;
