-- A tabela `contracts` nunca teve nenhum índice (nem tenant_id, nem
-- branch_id, nem created_at) — diferente de `companies`, que já tinha
-- alguns antes de 20260722000001. A RLS de select filtra por tenant_id
-- (e branch_id via can_see_branch_record, já otimizado como InitPlan em
-- 20260723000007) e useContracts.js ordena por created_at; sem índice em
-- nenhuma das duas, toda consulta força Seq Scan + sort completo da
-- tabela. Com a base de dev em ~11 mil linhas (import de teste), isso
-- estourava o statement_timeout mesmo com as buscas paginadas em
-- paralelo — cada uma delas ainda precisava escanear a tabela inteira
-- antes de aplicar o range().
CREATE INDEX IF NOT EXISTS idx_contracts_tenant             ON public.contracts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_branch             ON public.contracts (branch_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_created_at  ON public.contracts (tenant_id, created_at DESC);
