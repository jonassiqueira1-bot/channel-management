-- RPC para soft-delete de oportunidades
-- SECURITY DEFINER: roda como owner (postgres), valida tenant internamente
CREATE OR REPLACE FUNCTION public.soft_delete_oportunidade(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.oportunidades
  SET deleted_at = now()
  WHERE id = p_id
    AND tenant_id = public.my_tenant_id()
    AND deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_oportunidade(uuid) TO authenticated;
