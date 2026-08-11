-- count_active_users comparava profiles.status com 'active' (inglês), mas o
-- sistema inteiro usa 'ativo' (português) — a contagem sempre voltava 0,
-- fazendo a tela de Assinatura mostrar "0 usuários ativos" mesmo com
-- usuários reais, e o plano de billing nunca subir de faixa.
CREATE OR REPLACE FUNCTION public.count_active_users(p_tenant_id uuid)
RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND p_tenant_id IS DISTINCT FROM public.my_tenant_id() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  RETURN (SELECT COUNT(*)::int FROM public.profiles WHERE tenant_id = p_tenant_id AND status = 'ativo');
END;
$$;

NOTIFY pgrst, 'reload schema';
