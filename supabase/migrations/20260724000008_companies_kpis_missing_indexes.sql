-- companies_kpis (e o filtro paginado de Empresas.js) fazem WHERE por
-- status/tipo/segment/porte/receita_faixa/owner_id, mas só existia índice
-- pra tenant_id/branch_id/razao_social (20260722000001) — com a base de
-- dev passando de ~12 mil linhas (import de teste), cada uma dessas
-- colunas sem índice força um Seq Scan completo sob RLS, e a combinação
-- disso com o CASE/regex de mrr_total é o que está estourando o
-- statement_timeout (aparece no navegador como 500 na RPC, ~8s por
-- chamada). Índices compostos com tenant_id, já que toda query aqui é
-- tenant-scoped via RLS de qualquer forma.
--
-- Nota: `idx_companies_type` (20260612000007) indexa uma coluna chamada
-- `type`, diferente de `tipo` (usada por companies_kpis/useCompaniesPaged)
-- — não cobre o filtro real, por isso `tipo` está na lista abaixo mesmo
-- parecendo redundante à primeira vista.
CREATE INDEX IF NOT EXISTS idx_companies_tenant_status  ON public.companies (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_tipo    ON public.companies (tenant_id, tipo);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_segment ON public.companies (tenant_id, segment);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_porte   ON public.companies (tenant_id, porte);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_receita ON public.companies (tenant_id, receita_faixa);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_owner   ON public.companies (tenant_id, owner_id);
