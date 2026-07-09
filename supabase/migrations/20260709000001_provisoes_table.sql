-- Migration: tabela provisoes
-- Mesma estrutura que payments — para lançamentos previstos antes da fatura real
-- Auto-contida: sem FK para outros schemas ainda não criados no ambiente dev

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pendente','pago','vencido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.provisoes (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL,
  branch_id         uuid,
  company_id        uuid,

  amount_cdu        numeric(12,2) NOT NULL DEFAULT 0,
  amount_sms        numeric(12,2) NOT NULL DEFAULT 0,
  amount_services   numeric(12,2) NOT NULL DEFAULT 0,
  amount_discount   numeric(12,2) NOT NULL DEFAULT 0,

  amount_total_net  numeric(12,2) GENERATED ALWAYS AS
    (amount_cdu + amount_sms + amount_services - amount_discount) STORED,

  reference_month       date,
  due_date              date,
  data_fechamento       date,
  inconsistencia_status text NOT NULL DEFAULT 'sem_inconsistencia',

  status            payment_status NOT NULL DEFAULT 'pendente',
  processed         boolean        NOT NULL DEFAULT false,
  inconsistencia    boolean                 DEFAULT false,
  notes             text,
  descricao         text,
  custom_fields     jsonb         DEFAULT '{}',

  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provisoes_tenant_month_idx ON public.provisoes (tenant_id, reference_month DESC);
CREATE INDEX IF NOT EXISTS provisoes_company_idx      ON public.provisoes (company_id);
CREATE INDEX IF NOT EXISTS provisoes_due_date_idx     ON public.provisoes (tenant_id, due_date DESC);

DROP TRIGGER IF EXISTS trg_provisoes_updated_at ON public.provisoes;
CREATE TRIGGER trg_provisoes_updated_at
  BEFORE UPDATE ON public.provisoes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE public.provisoes ENABLE ROW LEVEL SECURITY;

-- Policy permissiva para dev; em produção substituir pela policy com perfis
DROP POLICY IF EXISTS provisoes_all ON public.provisoes;
CREATE POLICY provisoes_all ON public.provisoes
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.provisoes TO anon, authenticated, service_role;
