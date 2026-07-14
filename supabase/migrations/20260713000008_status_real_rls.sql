-- Torna o Status do usuário (profiles.status) real: hoje só 'inativo' bloqueava
-- alguma coisa, e só no cliente (useProfile.js fazia signOut()) — via API direta
-- um usuário inativo/pendente tinha acesso total, porque nenhuma RLS checava status.
--
-- Estratégia: my_tenant_id() é o alicerce de quase toda política RLS do sistema
-- ("tenant_id = my_tenant_id()"). Fazendo ela retornar NULL pra quem não estiver
-- 'ativo', qualquer comparação de tenant_id vira falsa automaticamente — bloqueia
-- tudo de uma vez, sem precisar mexer política por política.

-- Normaliza valores estranhos (ex: 'active' em inglês, sobra de seed antigo)
-- pra não travar ninguém sem querer ao apertar a checagem abaixo.
UPDATE public.profiles
SET status = 'ativo'
WHERE status NOT IN ('ativo', 'inativo', 'pendente');

CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND status = 'ativo' LIMIT 1;
$$;

-- Função auxiliar de status, mesmo padrão de my_role()/my_branch_id() — útil pra
-- qualquer checagem futura que precise do valor em vez de só um booleano.
CREATE OR REPLACE FUNCTION public.my_status()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- RPC estreita pra concluir o onboarding: só transiciona pendente -> ativo,
-- nunca reativa alguém marcado como inativo por um admin (evita usar a policy
-- de self-update pra isso, que é ampla demais pra essa finalidade específica).
CREATE OR REPLACE FUNCTION public.completar_onboarding()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET status = 'ativo', updated_at = now()
  WHERE id = auth.uid() AND status = 'pendente';
END;
$$;

GRANT EXECUTE ON FUNCTION public.completar_onboarding() TO authenticated;
