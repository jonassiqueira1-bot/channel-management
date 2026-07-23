-- service_role deveria poder acessar todas as tabelas por padrão, mas várias
-- não têm o GRANT explícito (achado colateral, mesmo padrão de `acoes` visto
-- na pendência 1). Aqui só o necessário pra limpar os relatórios padrão do
-- sistema em dev.
GRANT SELECT, UPDATE ON public.relatorios TO service_role;
