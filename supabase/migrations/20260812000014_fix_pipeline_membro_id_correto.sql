-- Bug meu na migration 20260812000008: comparei oportunidade_membros.user_id
-- com my_contact_id() (que devolve sellers.id) — mas oportunidade_membros
-- usa profiles.id, não sellers.id (decisão documentada em Pipeline.js:
-- "Canal: ... precisa ser profiles.id (FK real), não sellers.id" — diferente
-- de acao_membros, que usa sellers.id de propósito). A comparação certa é
-- contra auth.uid() diretamente (o próprio profile logado).
DO $$
DECLARE
  _fk_col text;
  _check text;
BEGIN
  SELECT column_name INTO _fk_col FROM information_schema.columns
    WHERE table_schema='public' AND table_name='oportunidade_membros' AND column_name IN ('opportunity_id','oportunidade_id')
    LIMIT 1;

  _check :=
    'NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''contato_canal'')' ||
    ' OR (' ||
    '  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''contato_canal'' AND contact_id IS NOT NULL)' ||
    '  AND (' ||
    '    responsavel::text = (SELECT nome FROM public.sellers WHERE id = my_contact_id() LIMIT 1)::text' ||
    CASE WHEN _fk_col IS NOT NULL THEN
      '    OR id::text IN (SELECT ' || quote_ident(_fk_col) || '::text FROM public.oportunidade_membros WHERE user_id::text = auth.uid()::text)'
    ELSE '' END ||
    '  )' ||
    ')';

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

NOTIFY pgrst, 'reload schema';
