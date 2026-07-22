-- Corrige timeout real (57014 - statement timeout) na tela de Empresas com
-- ~11 mil registros. Duas causas combinadas:
--
-- 1) Faltava índice cobrindo tenant_id + razao_social — o ORDER BY padrão da
--    tela obrigava um sort completo de todas as linhas do tenant a cada
--    página, além do Seq Scan que a policy de RLS (RLS filtra por tenant_id)
--    já precisava fazer. branch_id também não tinha índice, e é checado em
--    can_see_branch_record() pra cada linha.
-- 2) A query de KPIs buscava TODAS as linhas filtradas (status + mrr) pro
--    navegador somar em JS — um SELECT completo sob RLS só pra agregar 3
--    números. Move a agregação pro Postgres (SUM/COUNT nativos, muito mais
--    barato que trafegar+somar milhares de linhas no cliente).
CREATE INDEX IF NOT EXISTS idx_companies_branch      ON public.companies (branch_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_razao ON public.companies (tenant_id, razao_social);

-- SECURITY INVOKER (padrão) — roda com o papel/RLS de quem chama, então
-- continua respeitando exatamente as mesmas policies de "companies: select".
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
    COUNT(*) FILTER (WHERE status = 'ativo')                                    AS total_ativo,
    COUNT(*) FILTER (WHERE status = 'negociacao')                               AS total_negociacao,
    COALESCE(SUM((custom_fields->>'mrr')::numeric) FILTER (WHERE status = 'ativo'), 0) AS mrr_total
  FROM public.companies
  WHERE
    -- "Tipo de unidade" nunca foi persistido de verdade (hierarquia_tipo não
    -- existe como coluna) — mesmo comportamento do filtro client-side antigo:
    -- qualquer valor diferente de vazio/"independente" não bate com nada.
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
    -- owner_id é uuid (FK pra profiles) — p_resp chega como text do JS.
    AND (p_resp    IS NULL OR p_resp    = '' OR owner_id::text       = p_resp)
$$;

GRANT EXECUTE ON FUNCTION public.companies_kpis TO authenticated;
