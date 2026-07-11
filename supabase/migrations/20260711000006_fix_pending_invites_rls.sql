-- FIX: RLS de pending_invites usava subquery direta em profiles
-- que pode falhar quando authenticated não tem GRANT SELECT em profiles.
-- Solução: usar _my_tenant_id_bypass() (SECURITY DEFINER) igual ao padrão do projeto.

DROP POLICY IF EXISTS "tenant isolado"               ON public.pending_invites;
DROP POLICY IF EXISTS "tenant members can manage invites" ON public.pending_invites;

CREATE POLICY "pending_invites: tenant" ON public.pending_invites
  FOR ALL
  USING  (tenant_id = public._my_tenant_id_bypass())
  WITH CHECK (tenant_id = public._my_tenant_id_bypass());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_invites TO service_role;

NOTIFY pgrst, 'reload schema';
