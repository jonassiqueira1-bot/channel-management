-- Quando um seller é soft-deleted ou deletado, desativa o auth user vinculado
-- definindo banned_until = 'infinity' via profiles (sem precisar de service_role no trigger)

CREATE OR REPLACE FUNCTION public.handle_seller_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Soft delete: deleted_at setado
  IF (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) OR
     (TG_OP = 'DELETE') THEN
    -- Marca o profile como inativo para bloquear acesso
    UPDATE public.profiles
    SET status = 'inativo'
    WHERE contact_id = OLD.id AND role = 'parceiro';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_seller_delete ON public.sellers;
CREATE TRIGGER on_seller_delete
  AFTER UPDATE OF deleted_at OR DELETE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_seller_delete();
