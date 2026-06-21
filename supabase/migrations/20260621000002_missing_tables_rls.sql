-- Tabelas que existem no banco mas não tinham definição documentada nem RLS.
-- Este arquivo adiciona RLS e políticas para expô-las via PostgREST.

-- ─── integracoes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integracoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider       text NOT NULL,
  credentials    jsonb NOT NULL DEFAULT '{}',
  config         jsonb NOT NULL DEFAULT '{}',
  status         text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive','error')),
  last_sync_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integracoes_tenant ON public.integracoes(tenant_id);

ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integracoes: view"   ON public.integracoes;
DROP POLICY IF EXISTS "integracoes: manage" ON public.integracoes;
CREATE POLICY "integracoes: view"   ON public.integracoes FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "integracoes: manage" ON public.integracoes FOR ALL    USING (tenant_id = public.my_tenant_id());

-- ─── oportunidade_membros ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.oportunidade_membros (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id      uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  opportunity_id uuid NOT NULL,
  user_id        uuid NOT NULL,
  papel          text NOT NULL DEFAULT 'vendedor',
  tipo_membro    text NOT NULL DEFAULT 'interno',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opp_membros_tenant      ON public.oportunidade_membros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opp_membros_opportunity ON public.oportunidade_membros(opportunity_id);

ALTER TABLE public.oportunidade_membros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oportunidade_membros: view"   ON public.oportunidade_membros;
DROP POLICY IF EXISTS "oportunidade_membros: manage" ON public.oportunidade_membros;
CREATE POLICY "oportunidade_membros: view"   ON public.oportunidade_membros FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "oportunidade_membros: manage" ON public.oportunidade_membros FOR ALL    USING (tenant_id = public.my_tenant_id());

-- ─── rd_leads_queue ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rd_leads_queue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  payload     jsonb NOT NULL DEFAULT '{}',
  processed   boolean NOT NULL DEFAULT false,
  opp_id      uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rd_leads_queue_tenant    ON public.rd_leads_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rd_leads_queue_processed ON public.rd_leads_queue(processed);

ALTER TABLE public.rd_leads_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rd_leads_queue: view"   ON public.rd_leads_queue;
DROP POLICY IF EXISTS "rd_leads_queue: manage" ON public.rd_leads_queue;
CREATE POLICY "rd_leads_queue: view"   ON public.rd_leads_queue FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "rd_leads_queue: manage" ON public.rd_leads_queue FOR ALL    USING (tenant_id = public.my_tenant_id());
