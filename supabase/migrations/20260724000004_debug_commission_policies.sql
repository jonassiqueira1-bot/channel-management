CREATE OR REPLACE FUNCTION public.debug_list_table_policies(p_table text)
RETURNS TABLE (policyname text, cmd text, qual text, with_check text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT policyname, cmd, qual::text, with_check::text
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = p_table
  ORDER BY cmd, policyname
$$;

GRANT EXECUTE ON FUNCTION public.debug_list_table_policies TO anon, authenticated;
