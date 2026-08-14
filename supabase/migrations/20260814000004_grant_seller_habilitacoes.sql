-- seller_habilitacoes foi criada sem GRANT de privilégios de tabela — RLS
-- sozinha não libera nada, precisa do GRANT base primeiro. Sem isso, todo
-- INSERT/SELECT falhava com "permission denied for table seller_habilitacoes"
-- mesmo com a policy correta.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_habilitacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_habilitacoes TO service_role;
