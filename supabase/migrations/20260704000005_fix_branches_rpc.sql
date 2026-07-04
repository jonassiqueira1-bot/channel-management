-- RPC para salvar filial (INSERT ou UPDATE) com SECURITY DEFINER
-- Bypassa RLS validando tenant_id internamente, igual ao soft_delete_oportunidade

CREATE OR REPLACE FUNCTION public.save_tenant_branch(
  p_tenant_id   uuid,
  p_name        text,
  p_custom_fields jsonb DEFAULT '{}'::jsonb,
  p_id          uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_caller_tenant uuid;
  v_result        uuid;
BEGIN
  SELECT tenant_id INTO v_caller_tenant
    FROM public.profiles WHERE id = auth.uid() LIMIT 1;

  IF v_caller_tenant IS NULL OR v_caller_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.tenant_branches
      SET name = p_name, custom_fields = p_custom_fields
      WHERE id = p_id AND tenant_id = p_tenant_id
      RETURNING id INTO v_result;
  ELSE
    INSERT INTO public.tenant_branches (tenant_id, name, custom_fields)
      VALUES (p_tenant_id, p_name, p_custom_fields)
      RETURNING id INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_tenant_branch(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_caller_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_caller_tenant
    FROM public.profiles WHERE id = auth.uid() LIMIT 1;

  DELETE FROM public.tenant_branches
    WHERE id = p_id AND tenant_id = v_caller_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_tenant_branch(uuid, text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tenant_branch(uuid) TO authenticated;
