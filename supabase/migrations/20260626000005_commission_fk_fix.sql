-- Corrige FK de tenant_id em commission_rules e commission_personas
-- Ambas referenciam auth.users mas deveriam referenciar public.tenants

ALTER TABLE public.commission_rules
  DROP CONSTRAINT IF EXISTS commission_rules_tenant_id_fkey;
ALTER TABLE public.commission_rules
  ADD CONSTRAINT commission_rules_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.commission_personas
  DROP CONSTRAINT IF EXISTS commission_personas_tenant_id_fkey;
ALTER TABLE public.commission_personas
  ADD CONSTRAINT commission_personas_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
