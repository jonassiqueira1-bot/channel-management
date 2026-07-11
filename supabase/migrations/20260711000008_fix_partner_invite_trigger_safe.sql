-- Garante que a coluna status existe em pending_invites
ALTER TABLE public.pending_invites
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

-- Reescrita da função com EXCEPTION para nunca derrubar o Auth
CREATE OR REPLACE FUNCTION public.handle_partner_invite()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contact_id uuid;
  _branch_id  uuid;
BEGIN
  BEGIN
    _contact_id := (NEW.raw_user_meta_data->>'contact_id')::uuid;

    IF _contact_id IS NOT NULL THEN
      SELECT branch_id INTO _branch_id FROM public.sellers WHERE id = _contact_id LIMIT 1;
      UPDATE public.profiles
      SET contact_id = _contact_id,
          role       = 'parceiro',
          branch_id  = _branch_id
      WHERE id = NEW.id;
    END IF;

    UPDATE public.pending_invites
    SET status = 'aceito'
    WHERE email = NEW.email AND status = 'pendente';

  EXCEPTION WHEN OTHERS THEN
    -- Loga o erro mas nunca bloqueia a confirmação do usuário
    RAISE WARNING '[handle_partner_invite] erro ignorado: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
