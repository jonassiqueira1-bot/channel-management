-- View que expõe `companies` + 2 flags booleanos calculados por EXISTS —
-- usada pelos novos filtros de Empresas ("tem contratos" / "tem
-- pagamentos"), que dependem de uma relação com outra tabela e não dá pra
-- expressar com um `.eq()` simples via PostgREST.
--
-- security_invoker=true faz a view rodar com o papel/RLS de quem consulta
-- (não do dono da view) — continua respeitando exatamente as mesmas
-- policies de "companies: select" que a tabela já tem. As subqueries de
-- EXISTS em contracts/payments também rodam sob RLS de quem chama.
CREATE OR REPLACE VIEW public.companies_with_flags
WITH (security_invoker = true) AS
SELECT
  c.*,
  EXISTS (SELECT 1 FROM public.contracts ct WHERE ct.company_id = c.id) AS has_contract,
  EXISTS (SELECT 1 FROM public.payments  pm WHERE pm.company_id = c.id) AS has_payment
FROM public.companies c;

GRANT SELECT ON public.companies_with_flags TO authenticated;

-- EXISTS acima faz um Index Scan por company_id — sem índice, vira Seq Scan
-- de contracts/payments POR LINHA de companies (n×m). Já criamos o índice
-- de contracts.company_id em 20260727000003; falta o de payments.
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments (company_id);
