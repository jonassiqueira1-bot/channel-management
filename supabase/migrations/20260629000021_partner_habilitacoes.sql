-- Vínculo entre parceiros e habilitações (many-to-many)
CREATE TABLE IF NOT EXISTS public.partner_habilitacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parceiro_id    uuid NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  habilitacao_id text NOT NULL,  -- id da habilitação (pode ser uuid ou legacy id)
  created_at     timestamptz DEFAULT now(),
  UNIQUE (parceiro_id, habilitacao_id)
);

ALTER TABLE public.partner_habilitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_own" ON public.partner_habilitacoes
  USING (tenant_id = my_tenant_id());
GRANT SELECT, INSERT, DELETE ON public.partner_habilitacoes TO authenticated;
GRANT SELECT ON public.partner_habilitacoes TO service_role;
