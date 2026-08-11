-- TEMPORÁRIA — só pra inspecionar o corpo de signup_create_tenant (nunca
-- versionada em git). Removida na migration seguinte assim que eu ler.
CREATE OR REPLACE FUNCTION public.__debug_fn_source(p_name text)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = p_name LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.__debug_fn_source(text) TO service_role;
