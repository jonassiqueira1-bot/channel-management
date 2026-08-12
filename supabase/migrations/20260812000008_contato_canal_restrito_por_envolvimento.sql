-- "Envolvido" = está na lista de membros (oportunidade_membros / acao_membros),
-- não só o campo único de texto `responsavel`. Corrige Pipeline (que só
-- checava o texto) e implementa a mesma restrição em Ações, que nunca teve
-- nenhuma (RLS era tenant-wide pra qualquer papel).

-- ─── Pipeline: responsável (texto) OU membro (oportunidade_membros) ─────────
DO $$
DECLARE
  _check text :=
    'NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''contato_canal'')' ||
    ' OR (' ||
    '  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''contato_canal'' AND contact_id IS NOT NULL)' ||
    '  AND (' ||
    '    responsavel = (SELECT nome FROM public.sellers WHERE id = my_contact_id() LIMIT 1)' ||
    '    OR id IN (SELECT oportunidade_id FROM public.oportunidade_membros WHERE user_id = my_contact_id())' ||
    '  )' ||
    ')';
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='oportunidades' AND table_type='BASE TABLE') THEN
    DROP POLICY IF EXISTS "parceiro_restrict_select_opps" ON public.oportunidades;
    DROP POLICY IF EXISTS "parceiro_restrict_update_opps" ON public.oportunidades;
    EXECUTE format('CREATE POLICY "parceiro_restrict_select_opps" ON public.oportunidades AS RESTRICTIVE FOR SELECT USING (%s)', _check);
    EXECUTE format('CREATE POLICY "parceiro_restrict_update_opps" ON public.oportunidades AS RESTRICTIVE FOR UPDATE USING (%s)', _check);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='opportunities' AND table_type='BASE TABLE') THEN
    DROP POLICY IF EXISTS "parceiro_restrict_select_opps" ON public.opportunities;
    DROP POLICY IF EXISTS "parceiro_restrict_update_opps" ON public.opportunities;
    EXECUTE format('CREATE POLICY "parceiro_restrict_select_opps" ON public.opportunities AS RESTRICTIVE FOR SELECT USING (%s)', _check);
    EXECUTE format('CREATE POLICY "parceiro_restrict_update_opps" ON public.opportunities AS RESTRICTIVE FOR UPDATE USING (%s)', _check);
  END IF;
END $$;

-- ─── Ações: só quem está em acao_membros (nunca teve restrição nenhuma) ─────
DROP POLICY IF EXISTS "contato_canal_restrict_select" ON public.actions;
CREATE POLICY "contato_canal_restrict_select" ON public.actions
  AS RESTRICTIVE FOR SELECT
  USING (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'contato_canal')
    OR id IN (SELECT acao_id FROM public.acao_membros WHERE user_id = public.my_contact_id() AND deleted_at IS NULL)
  );

NOTIFY pgrst, 'reload schema';
