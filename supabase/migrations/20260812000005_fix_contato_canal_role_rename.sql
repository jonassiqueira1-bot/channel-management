-- 20260713000007 renomeou profiles.role 'parceiro' → 'contato_canal', mas
-- deixou pra trás duas coisas que ainda checavam o valor morto: as policies
-- restritivas de Pipeline (parceiro só vê as próprias oportunidades) e o
-- trigger que desativa o acesso do parceiro quando o seller é excluído.
-- Nenhum dos dois nunca mais disparou desde julho — Contato Canal via TODAS
-- as oportunidades do tenant, e excluir um Contato Canal não revogava acesso.

-- ─── Pipeline: restringe Contato Canal às próprias oportunidades ────────────
DO $$
DECLARE
  _check text :=
    'NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''contato_canal'')' ||
    ' OR (' ||
    '  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''contato_canal'' AND contact_id IS NOT NULL)' ||
    '  AND responsavel = (SELECT nome FROM public.sellers WHERE id = my_contact_id() LIMIT 1)' ||
    ')';
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='oportunidades' AND table_type='BASE TABLE') THEN
    DROP POLICY IF EXISTS "parceiro_restrict_select_opps" ON public.oportunidades;
    DROP POLICY IF EXISTS "parceiro_restrict_update_opps" ON public.oportunidades;
    DROP POLICY IF EXISTS "parceiro_insert_opps"           ON public.oportunidades;
    EXECUTE format('CREATE POLICY "parceiro_restrict_select_opps" ON public.oportunidades AS RESTRICTIVE FOR SELECT USING (%s)', _check);
    EXECUTE format('CREATE POLICY "parceiro_restrict_update_opps" ON public.oportunidades AS RESTRICTIVE FOR UPDATE USING (%s)', _check);
    CREATE POLICY "parceiro_insert_opps" ON public.oportunidades FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'contato_canal' AND contact_id IS NOT NULL));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='opportunities' AND table_type='BASE TABLE') THEN
    DROP POLICY IF EXISTS "parceiro_restrict_select_opps" ON public.opportunities;
    DROP POLICY IF EXISTS "parceiro_restrict_update_opps" ON public.opportunities;
    DROP POLICY IF EXISTS "parceiro_insert_opps"           ON public.opportunities;
    EXECUTE format('CREATE POLICY "parceiro_restrict_select_opps" ON public.opportunities AS RESTRICTIVE FOR SELECT USING (%s)', _check);
    EXECUTE format('CREATE POLICY "parceiro_restrict_update_opps" ON public.opportunities AS RESTRICTIVE FOR UPDATE USING (%s)', _check);
    CREATE POLICY "parceiro_insert_opps" ON public.opportunities FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'contato_canal' AND contact_id IS NOT NULL));
  END IF;
END $$;

-- ─── Trigger: desativa o profile quando o seller vinculado é excluído ────────
CREATE OR REPLACE FUNCTION public.handle_seller_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) OR
     (TG_OP = 'DELETE') THEN
    UPDATE public.profiles
    SET status = 'inativo'
    WHERE contact_id = OLD.id AND role = 'contato_canal';
  END IF;
  RETURN OLD;
END;
$$;

NOTIFY pgrst, 'reload schema';
