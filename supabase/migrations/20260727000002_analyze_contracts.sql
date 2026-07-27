-- Depois de criar os índices em 20260727000001 sobre uma tabela que já
-- tinha ~11 mil linhas (import de teste) sem nenhuma estatística prévia,
-- o planner pode continuar escolhendo Seq Scan até rodar um ANALYZE —
-- autovacuum eventualmente faria isso sozinho, mas não imediatamente.
ANALYZE public.contracts;
