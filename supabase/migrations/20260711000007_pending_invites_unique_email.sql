-- Garante que não pode existir dois convites para o mesmo email no mesmo tenant
ALTER TABLE public.pending_invites
  DROP CONSTRAINT IF EXISTS pending_invites_tenant_email_unique;

ALTER TABLE public.pending_invites
  ADD CONSTRAINT pending_invites_tenant_email_unique UNIQUE (tenant_id, email);
