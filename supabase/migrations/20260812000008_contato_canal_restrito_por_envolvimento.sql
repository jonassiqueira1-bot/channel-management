-- "Envolvido" = está na lista de membros (oportunidade_membros / acao_membros),
-- não só o campo único de texto `responsavel`. Corrige Pipeline (que só
-- checava o texto) e implementa a mesma restrição em Ações, que nunca teve
-- nenhuma (RLS era tenant-wide pra qualquer papel).

-- ─── Pipeline: responsável (texto) OU membro (oportunidade_membros) ─────────
-- oportunidade_membros.opportunity_id vs oportunidade_id: nome da coluna
-- varia por ambiente (drift entre dev/produção — mesmo cuidado já visto no
-- código React em useOppMembros.js) — detecta em runtime.
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
      -- cast pra text dos dois lados: id de oportunidades já foi visto como
      -- uuid num ambiente e text em outro (drift de schema), e a FK em
      -- oportunidade_membros é sempre uuid — compara como texto pra nunca
      -- dar "operator does not exist" não importa a combinação.
      '    OR id::text IN (SELECT ' || quote_ident(_fk_col) || '::text FROM public.oportunidade_membros WHERE user_id::text = my_contact_id()::text)'
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

-- ─── Ações: só quem está em acao_membros (nunca teve restrição nenhuma) ─────
DROP POLICY IF EXISTS "contato_canal_restrict_select" ON public.actions;
CREATE POLICY "contato_canal_restrict_select" ON public.actions
  AS RESTRICTIVE FOR SELECT
  USING (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'contato_canal')
    OR id::text IN (SELECT acao_id::text FROM public.acao_membros WHERE user_id::text = public.my_contact_id()::text AND deleted_at IS NULL)
  );

NOTIFY pgrst, 'reload schema';
