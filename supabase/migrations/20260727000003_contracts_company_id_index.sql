-- useContracts.js embute `companies(nome_fantasia, razao_social)` no select
-- (PostgREST faz um JOIN em company_id) — sem índice em company_id, esse
-- JOIN também varre contracts inteira por linha de companies.
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts (company_id);
ANALYZE public.contracts;
