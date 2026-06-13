-- ─── Gestão de Comissões ──────────────────────────────────────────────────────
-- commission_rules  : tabela de regras de percentual por persona × receita
-- commission_payments: lançamentos de repasse calculados / pagos

-- ─── Extensão uuid ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── commission_rules ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_rules (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          text        NOT NULL,
  descricao     text,
  produto_id    uuid        REFERENCES produtos(id) ON DELETE SET NULL,
  ativo         boolean     NOT NULL DEFAULT true,

  -- Persona: Interno (equipe ISV) —————————————————————————————————
  interno_cdu_pct       numeric(5,2) NOT NULL DEFAULT 0 CHECK (interno_cdu_pct       BETWEEN 0 AND 100),
  interno_sms_pct       numeric(5,2) NOT NULL DEFAULT 0 CHECK (interno_sms_pct       BETWEEN 0 AND 100),
  interno_servicos_pct  numeric(5,2) NOT NULL DEFAULT 0 CHECK (interno_servicos_pct  BETWEEN 0 AND 100),

  -- Persona: Externo (franquia / revendedor) ——————————————————————
  externo_cdu_pct       numeric(5,2) NOT NULL DEFAULT 0 CHECK (externo_cdu_pct       BETWEEN 0 AND 100),
  externo_sms_pct       numeric(5,2) NOT NULL DEFAULT 0 CHECK (externo_sms_pct       BETWEEN 0 AND 100),
  externo_servicos_pct  numeric(5,2) NOT NULL DEFAULT 0 CHECK (externo_servicos_pct  BETWEEN 0 AND 100),

  -- Persona: Finder (indicador externo) ——————————————————————————
  finder_cdu_pct        numeric(5,2) NOT NULL DEFAULT 0 CHECK (finder_cdu_pct        BETWEEN 0 AND 100),
  finder_sms_pct        numeric(5,2) NOT NULL DEFAULT 0 CHECK (finder_sms_pct        BETWEEN 0 AND 100),
  finder_servicos_pct   numeric(5,2) NOT NULL DEFAULT 0 CHECK (finder_servicos_pct   BETWEEN 0 AND 100),

  -- Persona: Parceiro (ISV parceiro / integrador) ————————————————
  parceiro_cdu_pct      numeric(5,2) NOT NULL DEFAULT 0 CHECK (parceiro_cdu_pct      BETWEEN 0 AND 100),
  parceiro_sms_pct      numeric(5,2) NOT NULL DEFAULT 0 CHECK (parceiro_sms_pct      BETWEEN 0 AND 100),
  parceiro_servicos_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (parceiro_servicos_pct BETWEEN 0 AND 100),

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  commission_rules IS 'Regras de percentual de comissão por persona e tipo de receita.';
COMMENT ON COLUMN commission_rules.tenant_id IS 'Isolamento multi-tenant; cada ISV vê apenas suas regras.';

CREATE INDEX IF NOT EXISTS idx_commission_rules_tenant ON commission_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_produto ON commission_rules(produto_id);

-- ─── commission_payments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_payments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id             uuid        REFERENCES commission_rules(id) ON DELETE SET NULL,

  -- Beneficiário ————————————————————————————————————————————————
  beneficiario_id     uuid,                       -- referência ao user (sem FK rígida, pode ser externo)
  beneficiario_nome   text        NOT NULL,
  persona             text        NOT NULL CHECK (persona IN ('interno','externo','finder','parceiro')),

  -- Origem do lançamento ————————————————————————————————————————
  oportunidade_id     uuid,
  contrato_id         uuid,
  descricao           text,

  -- Valores —————————————————————————————————————————————————————
  receita_tipo        text        NOT NULL CHECK (receita_tipo IN ('CDU','SMS','Serviços')),
  valor_base          numeric(12,2) NOT NULL DEFAULT 0,
  percentual          numeric(5,2)  NOT NULL DEFAULT 0,
  valor_comissao      numeric(12,2) GENERATED ALWAYS AS (ROUND(valor_base * percentual / 100, 2)) STORED,

  -- Ciclo de vida ————————————————————————————————————————————————
  data_competencia    date        NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento     date        NOT NULL,
  data_pagamento      date,
  status              text        NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','pago','cancelado')),

  notas               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  commission_payments IS 'Lançamentos de repasse de comissão calculados e pagos.';
COMMENT ON COLUMN commission_payments.valor_comissao IS 'Calculado automaticamente: valor_base × percentual / 100.';

CREATE INDEX IF NOT EXISTS idx_commission_payments_tenant  ON commission_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_status  ON commission_payments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_commission_payments_venc    ON commission_payments(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_commission_payments_benef   ON commission_payments(beneficiario_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_commission_rules_updated_at    ON commission_rules;
DROP TRIGGER IF EXISTS trg_commission_payments_updated_at ON commission_payments;

CREATE TRIGGER trg_commission_rules_updated_at
  BEFORE UPDATE ON commission_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_commission_payments_updated_at
  BEFORE UPDATE ON commission_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE commission_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

-- commission_rules: somente registros do tenant autenticado
DROP POLICY IF EXISTS rls_commission_rules_select ON commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_insert ON commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_update ON commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_delete ON commission_rules;

CREATE POLICY rls_commission_rules_select ON commission_rules FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY rls_commission_rules_insert ON commission_rules FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY rls_commission_rules_update ON commission_rules FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY rls_commission_rules_delete ON commission_rules FOR DELETE USING (tenant_id = auth.uid());

-- commission_payments: somente registros do tenant autenticado
DROP POLICY IF EXISTS rls_commission_payments_select ON commission_payments;
DROP POLICY IF EXISTS rls_commission_payments_insert ON commission_payments;
DROP POLICY IF EXISTS rls_commission_payments_update ON commission_payments;
DROP POLICY IF EXISTS rls_commission_payments_delete ON commission_payments;

CREATE POLICY rls_commission_payments_select ON commission_payments FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY rls_commission_payments_insert ON commission_payments FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY rls_commission_payments_update ON commission_payments FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY rls_commission_payments_delete ON commission_payments FOR DELETE USING (tenant_id = auth.uid());
