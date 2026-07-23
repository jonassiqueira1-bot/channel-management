-- TEMPORÁRIO — lista as policies atualmente em vigor que usam
-- can_see_branch_record/can_edit_branch_record, direto do catálogo do
-- Postgres (mais confiável que rastrear qual migration "venceu" por cima
-- de qual nas ~10 que mexeram nisso).
CREATE OR REPLACE FUNCTION public.debug_list_branch_policies()
RETURNS TABLE (tablename text, policyname text, cmd text, qual text, with_check text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT schemaname || '.' || tablename, policyname, cmd, qual::text, with_check::text
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual::text ILIKE '%can_see_branch_record%' OR qual::text ILIKE '%can_edit_branch_record%'
         OR with_check::text ILIKE '%can_see_branch_record%' OR with_check::text ILIKE '%can_edit_branch_record%')
  ORDER BY tablename, cmd
$$;

GRANT EXECUTE ON FUNCTION public.debug_list_branch_policies TO authenticated;
