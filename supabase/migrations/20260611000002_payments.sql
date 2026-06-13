-- ─── Migration: Faturamento Coletivo e Recorrência ────────────────────────────
-- Tabela payments (faturamento mensal de contratos)
-- + RLS idêntico ao padrão oportunidades/empresas

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Tipo enum de status
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pendente','pago','vencido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Tabela principal
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid         NOT NULL,

  -- Relacionamentos
  contract_id       uuid         REFERENCES contracts(id)  ON DELETE SET NULL,
  company_id        uuid         REFERENCES empresas(id)   ON DELETE SET NULL,

  -- Composição de valores (espelha as colunas de oportunidades)
  amount_cdu        numeric(12,2) NOT NULL DEFAULT 0,   -- Cessão de Direito de Uso / MRR
  amount_sms        numeric(12,2) NOT NULL DEFAULT 0,   -- Mensageria / consumo variável
  amount_services   numeric(12,2) NOT NULL DEFAULT 0,   -- Serviços one-off ou recorrentes
  amount_discount   numeric(12,2) NOT NULL DEFAULT 0,   -- Desconto aplicado

  -- Coluna calculada — valor líquido auditável
  amount_total_net  numeric(12,2) GENERATED ALWAYS AS
    (amount_cdu + amount_sms + amount_services - amount_discount) STORED,

  -- Datas de competência e vencimento
  reference_month   date         NOT NULL,  -- primeiro dia do mês de referência: 2026-06-01
  due_date          date,

  -- Controle de geração
  status            payment_status NOT NULL DEFAULT 'pendente',
  processed         boolean        NOT NULL DEFAULT false,  -- fatura já emitida?

  notes             text,

  -- Auditoria
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Índices de alta performance
-- ──────────────────────────────────────────────────────────────────────────────
-- Consulta principal: tenant + competência (filtragem de tela)
CREATE INDEX IF NOT EXISTS payments_tenant_month_idx
  ON payments (tenant_id, reference_month DESC);

-- FK joins
CREATE INDEX IF NOT EXISTS payments_company_idx    ON payments (company_id);
CREATE INDEX IF NOT EXISTS payments_contract_idx   ON payments (contract_id);

-- Dashboard: contagem de pendentes/processados
CREATE INDEX IF NOT EXISTS payments_status_processed_idx
  ON payments (tenant_id, status, processed);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Trigger updated_at (reutiliza função existente)
-- ──────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ISV / Gestor de canais: bypass total por tenant
CREATE POLICY payments_isv_all ON payments
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais')
    )
  );

-- Admin de franquia: lê apenas faturas da própria empresa
CREATE POLICY payments_franquia_read ON payments
  FOR SELECT USING (
    tenant_id  = (SELECT tenant_id  FROM perfis WHERE id = auth.uid())
    AND company_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
  );

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TYPE  IF EXISTS payment_status;
