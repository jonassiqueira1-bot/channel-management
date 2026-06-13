-- ─── Dashboard: widgets e alertas críticos ────────────────────────────────────

-- Alertas críticos por tenant / empresa
CREATE TABLE IF NOT EXISTS critical_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES companies(id),
  company_id  uuid REFERENCES companies(id),    -- NULL = alerta para todo o tenant
  severity    text NOT NULL DEFAULT 'warning'
              CHECK (severity IN ('critical','warning','info')),
  title       text NOT NULL,
  description text,
  action_label text,
  action_url  text,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant    ON critical_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_company   ON critical_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved  ON critical_alerts(is_resolved);

ALTER TABLE critical_alerts ENABLE ROW LEVEL SECURITY;

-- ISV vê todos os alertas do tenant
DROP POLICY IF EXISTS "rls_alerts_isv" ON critical_alerts;
CREATE POLICY "rls_alerts_isv" ON critical_alerts
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM perfis p
      WHERE p.id = auth.uid() AND p.papel = 'admin_isv'
    )
  );

-- Franquia vê apenas alertas da própria empresa
DROP POLICY IF EXISTS "rls_alerts_franchise" ON critical_alerts;
CREATE POLICY "rls_alerts_franchise" ON critical_alerts
  FOR SELECT
  USING (
    company_id IN (
      SELECT p.empresa_id FROM perfis p WHERE p.id = auth.uid()
    )
    OR company_id IS NULL AND tenant_id IN (
      SELECT p.tenant_id FROM perfis p WHERE p.id = auth.uid()
    )
  );

-- Layout customizável de widgets por usuário
CREATE TABLE IF NOT EXISTS user_dashboard_widgets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  tenant_id   uuid NOT NULL REFERENCES companies(id),
  widget_id   text NOT NULL,          -- slug identificador do widget
  position    integer NOT NULL DEFAULT 0,
  col_span    integer NOT NULL DEFAULT 1 CHECK (col_span BETWEEN 1 AND 4),
  row_span    integer NOT NULL DEFAULT 1 CHECK (row_span BETWEEN 1 AND 3),
  is_visible  boolean NOT NULL DEFAULT true,
  settings    jsonb DEFAULT '{}',     -- metas inline editáveis e configs do widget
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, widget_id)
);

CREATE INDEX IF NOT EXISTS idx_widgets_user   ON user_dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_widgets_tenant ON user_dashboard_widgets(tenant_id);

ALTER TABLE user_dashboard_widgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_widgets_self" ON user_dashboard_widgets;
CREATE POLICY "rls_widgets_self" ON user_dashboard_widgets
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_widgets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_widgets_updated_at ON user_dashboard_widgets;
CREATE TRIGGER trg_widgets_updated_at
  BEFORE UPDATE ON user_dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION set_widgets_updated_at();
