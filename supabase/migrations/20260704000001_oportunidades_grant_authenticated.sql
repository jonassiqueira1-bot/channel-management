-- Corrige 403 Forbidden ao fazer UPDATE/INSERT/DELETE em oportunidades e acoes
-- A tabela foi criada antes do padrão de GRANT explícito ser adotado

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acoes         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis        TO authenticated;

NOTIFY pgrst, 'reload schema';
