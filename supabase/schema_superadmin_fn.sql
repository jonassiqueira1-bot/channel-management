-- Função para criar tenant (apenas NGI pode chamar, bypassa RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.provision_new_tenant(
  p_name text,
  p_slug text,
  p_plan text DEFAULT 'trial'
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Apenas o tenant NGI (ISV principal) pode provisionar novos tenants
  IF public.my_tenant_id() IS DISTINCT FROM 'a0000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE EXCEPTION 'Não autorizado: apenas o super admin NGI pode criar tenants';
  END IF;

  INSERT INTO public.tenants (name, slug, plan, status)
  VALUES (p_name, lower(regexp_replace(p_slug, '\s+', '-', 'g')), p_plan, 'active')
  RETURNING id INTO new_id;

  INSERT INTO public.super_admin_log (action, tenant_id, actor_id, details)
  VALUES ('tenant_created', new_id, auth.uid(), jsonb_build_object('plan', p_plan, 'slug', p_slug));

  RETURN jsonb_build_object('id', new_id, 'name', p_name, 'slug', p_slug, 'plan', p_plan);
END;
$$;
