-- sellers: consultores e vendedores do ISV (ex-funcionarios, renomeado para sellers)
CREATE TABLE IF NOT EXISTS public.sellers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id)          ON DELETE CASCADE,
  branch_id       uuid        REFERENCES public.tenant_branches(id)           ON DELETE SET NULL,
  nome            text        NOT NULL,
  email           text,
  telefone        text,
  cargo           text,
  status          text        NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo','inativo','afastado')),
  regiao          text,
  equipe          text,
  meta_mensal     numeric(14,2),
  comissao_perc   numeric(5,2),
  observacoes     text,
  custom_fields   jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sellers_tenant ON public.sellers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON public.sellers (tenant_id, status);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers: view"   ON public.sellers;
DROP POLICY IF EXISTS "sellers: manage" ON public.sellers;

CREATE POLICY "sellers: view" ON public.sellers
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "sellers: manage" ON public.sellers
  FOR ALL USING (tenant_id = public.my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO authenticated;

-- GRANTs para tabelas que existem mas estão bloqueadas para authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_logs         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamentos_horas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks     TO authenticated;

-- GRANTs para tabelas criadas nas migrations anteriores
-- Usa DO $$ para ignorar silenciosamente tabelas que ainda não existem
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'projects','project_phases','project_members',
    'project_issues','project_attachments','project_time_logs',
    'commission_rules','commission_payments','commission_personas'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    END IF;
  END LOOP;
END $$;
