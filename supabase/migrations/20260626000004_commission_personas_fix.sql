-- Adiciona usuario_id e corrige RLS de commission_personas
ALTER TABLE public.commission_personas
  ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS rls_personas_all ON public.commission_personas;

ALTER TABLE public.commission_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_personas_select ON public.commission_personas
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY rls_personas_insert ON public.commission_personas
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY rls_personas_update ON public.commission_personas
  FOR UPDATE USING (tenant_id = public.my_tenant_id());
CREATE POLICY rls_personas_delete ON public.commission_personas
  FOR DELETE USING (tenant_id = public.my_tenant_id());
