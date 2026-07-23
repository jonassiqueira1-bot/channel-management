-- Resolve a divergência de schema dev/prod encontrada durante a investigação
-- de performance (ver 20260723000011 em diante): a tabela `acoes` existe em
-- dev mas nunca existiu em produção. Era a versão original (base migration
-- 00000000000000_oportunidades_base.sql) do que virou `actions`
-- (20260627000012_create_actions.sql) — o código já usa exclusivamente
-- `actions` (nenhum `.from('acoes')` em src/), e a tabela está vazia em dev
-- (0 linhas, confirmado via table-stats). Produção nunca teve esse resíduo;
-- aqui só alinha dev com o estado correto.
DROP TABLE IF EXISTS public.acoes CASCADE;
