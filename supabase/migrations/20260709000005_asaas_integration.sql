-- Asaas integration: link tenants to Asaas customers and track charges

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_next_due_date date,
  ADD COLUMN IF NOT EXISTS asaas_value numeric(10,2);

CREATE TABLE IF NOT EXISTS public.asaas_cobrancas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asaas_id          text NOT NULL UNIQUE,          -- id retornado pela API do Asaas
  tipo              text NOT NULL,                  -- PIX, BOLETO, CREDIT_CARD
  valor             numeric(10,2) NOT NULL,
  vencimento        date NOT NULL,
  status            text NOT NULL DEFAULT 'PENDING', -- PENDING, RECEIVED, OVERDUE, CANCELLED
  payment_date      date,
  invoice_url       text,
  bank_slip_url     text,
  pix_qr_code_image text,
  pix_copy_paste    text,
  raw_payload       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asaas_cobrancas_tenant ON public.asaas_cobrancas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_asaas_cobrancas_status ON public.asaas_cobrancas (status);
CREATE INDEX IF NOT EXISTS idx_asaas_cobrancas_asaas_id ON public.asaas_cobrancas (asaas_id);

-- RLS: só service_role acessa (operação administrativa de Jonas)
ALTER TABLE public.asaas_cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.asaas_cobrancas
  USING (auth.role() = 'service_role');

GRANT SELECT, INSERT, UPDATE ON public.asaas_cobrancas TO service_role;
