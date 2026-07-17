-- BUG: convite sumia da lista de pendentes segundos depois de ser enviado.
-- Causa raiz: o trigger on_partner_invite_confirm disparava em
-- "email_confirmed_at transiciona de NULL pra não-NULL" em auth.users,
-- assumindo que isso só acontecia quando o convidado de fato clicava o link
-- e definia senha. Só que admin.auth.admin.generateLink({type:'invite'})
-- (usado em supabase/functions/invite-user) já marca email_confirmed_at no
-- MOMENTO da geração do link — antes de qualquer clique do convidado. Ou
-- seja, todo convite virava "aceito" instantaneamente, e a tela de Usuários
-- (que filtra status !== 'aceito') fazia ele sumir da lista de pendentes.
--
-- Fix: marca como aceito só quando o convidado de fato completa o
-- onboarding (define senha), via completar_onboarding() — mesmo ponto que já
-- vira profiles.status de 'pendente' pra 'ativo'. O trigger em auth.users
-- baseado em email_confirmed_at é removido (sinal não confiável pra invite).

DROP TRIGGER IF EXISTS on_partner_invite_confirm ON auth.users;

CREATE OR REPLACE FUNCTION public.completar_onboarding()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email text;
BEGIN
  UPDATE public.profiles
  SET status = 'ativo', updated_at = now()
  WHERE id = auth.uid() AND status = 'pendente';

  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  IF v_email IS NOT NULL THEN
    UPDATE public.pending_invites
    SET status = 'aceito'
    WHERE email = v_email AND status = 'pendente';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.completar_onboarding() TO authenticated;

-- Reverte falsos positivos: convites marcados "aceito" pelo trigger antigo
-- que nunca tiveram, de fato, um profile ativo correspondente.
UPDATE public.pending_invites pi
SET status = 'pendente'
WHERE pi.status = 'aceito'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.email = pi.email AND p.status = 'ativo'
  );

NOTIFY pgrst, 'reload schema';
