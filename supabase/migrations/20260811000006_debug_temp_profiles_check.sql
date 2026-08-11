-- TEMPORÁRIA — inspeciona profiles pra achar por que count_active_users
-- diverge do que a tela de Usuários mostra. Removida logo depois.
CREATE OR REPLACE FUNCTION public.__debug_profiles_check()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_agg(to_jsonb(p))
  FROM public.profiles p
  WHERE email IN ('jonassiqueira1@gmail.com', 'jonas.siqueira@ngi.com.br');
$$;
GRANT EXECUTE ON FUNCTION public.__debug_profiles_check() TO service_role;
