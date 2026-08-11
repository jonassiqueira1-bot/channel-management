-- TEMPORÁRIA — inspeciona o default de trial_ends_at. Removida logo depois.
CREATE OR REPLACE FUNCTION public.__debug_trial_default()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT column_default FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'trial_ends_at';
$$;
GRANT EXECUTE ON FUNCTION public.__debug_trial_default() TO service_role;
