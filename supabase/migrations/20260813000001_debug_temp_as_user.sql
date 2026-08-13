CREATE OR REPLACE FUNCTION public.exec_debug_as_user()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  out jsonb;
  v_prof_id uuid := 'cdbce16d-90b8-4a39-96d2-5b036df7baf7';
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_prof_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'oportunidades_visiveis', (SELECT jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo)) FROM oportunidades),
    'actions_visiveis', (SELECT jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo)) FROM actions)
  ) INTO out;

  PERFORM set_config('role', 'service_role', true);
  RETURN out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.exec_debug_as_user() TO service_role;
