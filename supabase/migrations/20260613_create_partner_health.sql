-- ─── Customer Success: partner_health ───────────────────────────────────────
-- Armazena o estado de saúde de cada parceiro por tenant.
-- Metodologia LAER (Land, Adopt, Expand, Renew) + Touch Models.

CREATE TABLE IF NOT EXISTS partner_health (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL,
  company_id    integer     REFERENCES companies(id) ON DELETE SET NULL,
  company_name  text        NOT NULL,
  company_city  text,
  company_uf    text,
  csm           text,
  laer_stage    text        NOT NULL DEFAULT 'Land'
                            CHECK (laer_stage IN ('Land','Adopt','Expand','Renew')),
  touch_model   text        NOT NULL DEFAULT 'Mid-Touch'
                            CHECK (touch_model IN ('Tech-Touch','Mid-Touch','High-Touch')),
  health_score  integer     NOT NULL DEFAULT 75
                            CHECK (health_score BETWEEN 0 AND 100),
  renewal_date  date,
  notes         text,
  action_plans  jsonb       NOT NULL DEFAULT '[]',
  checkins      jsonb       NOT NULL DEFAULT '[]',
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_partner_health_tenant    ON partner_health (tenant_id);
CREATE INDEX IF NOT EXISTS idx_partner_health_company   ON partner_health (company_id);
CREATE INDEX IF NOT EXISTS idx_partner_health_laer      ON partner_health (tenant_id, laer_stage);
CREATE INDEX IF NOT EXISTS idx_partner_health_renewal   ON partner_health (tenant_id, renewal_date);

-- ─── Trigger: atualiza atualizado_em ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_partner_health_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_health_updated ON partner_health;
CREATE TRIGGER trg_partner_health_updated
  BEFORE UPDATE ON partner_health
  FOR EACH ROW EXECUTE PROCEDURE update_partner_health_timestamp();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE partner_health ENABLE ROW LEVEL SECURITY;

-- admin_isv: acesso total dentro do próprio tenant
CREATE POLICY "cs_admin_isv_full" ON partner_health
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM perfis WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM perfis WHERE id = auth.uid() AND papel = 'admin_isv'
    )
  );

-- gestor_canais: leitura e escrita dentro do tenant
CREATE POLICY "cs_gestor_read_write" ON partner_health
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM perfis WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM perfis WHERE id = auth.uid() AND papel = 'gestor_canais'
    )
  );

-- admin_franquia: apenas o próprio company_id
CREATE POLICY "cs_franquia_own_company" ON partner_health
  FOR SELECT USING (
    company_id = (
      SELECT empresa_id FROM perfis WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM perfis WHERE id = auth.uid() AND papel = 'admin_franquia'
    )
  );
