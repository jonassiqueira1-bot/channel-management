-- BUG CRÍTICO: profiles.status tinha DEFAULT 'active' (inglês), mas toda a
-- regra de acesso (my_tenant_id(), completar_onboarding(), dropdown de Status
-- em Configurações > Usuários) usa o vocabulário em português 'ativo'.
-- Qualquer perfil criado sem status explícito (ex: um caminho de criação que
-- não passa pelo invite-user, que seta 'pendente' explicitamente) nascia com
-- 'active' — e como my_tenant_id() exige status = 'ativo' pra retornar o
-- tenant_id, TODA policy de RLS que depende dela (tenant_branches, etc.)
-- retornava vazio pra esse usuário. Sintoma: usuário logado normalmente, mas
-- sem nenhuma filial selecionável ("preso sem filial").
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'ativo';

UPDATE public.profiles SET status = 'ativo' WHERE status = 'active';

NOTIFY pgrst, 'reload schema';
