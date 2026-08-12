-- Mesma causa raiz sistemática (profiles/perfis_acesso/sellers): nenhuma das
-- duas tabelas de "membros" tinha GRANT pra service_role.
GRANT SELECT ON public.oportunidade_membros TO service_role;
GRANT SELECT ON public.acao_membros TO service_role;

NOTIFY pgrst, 'reload schema';
