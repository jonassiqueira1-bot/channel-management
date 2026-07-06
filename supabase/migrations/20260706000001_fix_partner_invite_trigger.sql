-- Corrige trigger de convite parceiro:
-- 1. confirmed_at é coluna gerada — trigger deve observar email_confirmed_at
-- 2. Atualiza pending_invites para 'aceito' quando o convite é confirmado

CREATE OR REPLACE FUNCTION public.handle_partner_invite()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contact_id uuid;
BEGIN
  _contact_id := (NEW.raw_user_meta_data->>'contact_id')::uuid;
  IF _contact_id IS NOT NULL THEN
    UPDATE public.profiles
    SET contact_id = _contact_id,
        role       = 'parceiro',
        branch_id  = NULL
    WHERE id = NEW.id;
  END IF;

  -- Marca convite como aceito em pending_invites
  UPDATE public.pending_invites
  SET status = 'aceito'
  WHERE email = NEW.email AND status = 'pendente';

  RETURN NEW;
END;
$$;

-- Recria trigger usando email_confirmed_at (coluna real, não gerada)
DROP TRIGGER IF EXISTS on_partner_invite_confirm ON auth.users;
CREATE TRIGGER on_partner_invite_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_partner_invite();
