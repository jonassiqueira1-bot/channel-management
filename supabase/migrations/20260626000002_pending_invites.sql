-- Tabela de convites pendentes (não depende de auth.users)
CREATE TABLE IF NOT EXISTS public.pending_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  email       text NOT NULL,
  papel       text NOT NULL DEFAULT 'vendedor',
  tipo_usuario text NOT NULL DEFAULT 'externo',
  status      text NOT NULL DEFAULT 'pendente',
  criado_em   timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant isolado" ON public.pending_invites
  USING (tenant_id = public.my_tenant_id());
