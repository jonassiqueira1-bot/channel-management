-- ─── customer_health ──────────────────────────────────────────────────────────
-- Saúde do cliente (Customer Success). Uma linha por empresa acompanhada.

CREATE TABLE IF NOT EXISTS public.customer_health (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id)   ON DELETE CASCADE,
  branch_id     uuid                 REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id    uuid                 REFERENCES public.companies(id)  ON DELETE SET NULL,

  -- CSM responsável (perfil interno)
  csm_id        uuid                 REFERENCES public.profiles(id)   ON DELETE SET NULL,

  -- Estágio LAER e modelo de toque
  laer_stage    text        NOT NULL DEFAULT 'Land'
                CHECK (laer_stage IN ('Land', 'Adopt', 'Expand', 'Renew')),
  touch_model   text        NOT NULL DEFAULT 'Mid-Touch'
                CHECK (touch_model IN ('Tech-Touch', 'Mid-Touch', 'High-Touch')),

  -- Saúde e renovação
  health_score  smallint    NOT NULL DEFAULT 75 CHECK (health_score BETWEEN 0 AND 100),
  renewal_date  date,

  -- Conteúdo livre
  notes         text        NOT NULL DEFAULT '',
  action_plans  jsonb       NOT NULL DEFAULT '[]',
  checkins      jsonb       NOT NULL DEFAULT '[]',

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_health_tenant    ON public.customer_health(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_company   ON public.customer_health(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_csm       ON public.customer_health(csm_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_renewal   ON public.customer_health(renewal_date);

-- Garante uma linha por empresa por tenant
CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_health_company
  ON public.customer_health(tenant_id, company_id)
  WHERE company_id IS NOT NULL;

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_customer_health_updated_at ON public.customer_health;
CREATE TRIGGER trg_customer_health_updated_at
  BEFORE UPDATE ON public.customer_health
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.customer_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_health: select" ON public.customer_health;
DROP POLICY IF EXISTS "customer_health: insert" ON public.customer_health;
DROP POLICY IF EXISTS "customer_health: update" ON public.customer_health;
DROP POLICY IF EXISTS "customer_health: delete" ON public.customer_health;

CREATE POLICY "customer_health: select" ON public.customer_health
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "customer_health: insert" ON public.customer_health
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "customer_health: update" ON public.customer_health
  FOR UPDATE USING (tenant_id = public.my_tenant_id());

CREATE POLICY "customer_health: delete" ON public.customer_health
  FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');
