-- Migration: adiciona colunas que faltam na tabela payments
-- (a tabela foi criada antes da migration 20260611000002 com colunas diferentes)
-- IF NOT EXISTS garante idempotência: seguro rodar mesmo que já existam

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS branch_id       uuid,
  ADD COLUMN IF NOT EXISTS reference_month date,
  ADD COLUMN IF NOT EXISTS due_date        date,
  ADD COLUMN IF NOT EXISTS notes           text,
  ADD COLUMN IF NOT EXISTS processed       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_cdu      numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_sms      numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_services numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_discount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_fields   jsonb DEFAULT '{}';

-- Backfill: copia vencimento→due_date e data_pagamento→reference_month
-- caso a tabela já tenha essas colunas legadas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='payments' AND column_name='vencimento') THEN
    UPDATE public.payments SET due_date = vencimento::date WHERE due_date IS NULL AND vencimento IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='payments' AND column_name='data_pagamento') THEN
    UPDATE public.payments SET reference_month = data_pagamento::date WHERE reference_month IS NULL AND data_pagamento IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='payments' AND column_name='descricao') THEN
    UPDATE public.payments SET notes = descricao WHERE notes IS NULL AND descricao IS NOT NULL;
  END IF;
END $$;

-- Índice para filtros por período
CREATE INDEX IF NOT EXISTS payments_ref_month_idx ON public.payments (tenant_id, reference_month DESC);
CREATE INDEX IF NOT EXISTS payments_due_date_idx  ON public.payments (tenant_id, due_date DESC);
