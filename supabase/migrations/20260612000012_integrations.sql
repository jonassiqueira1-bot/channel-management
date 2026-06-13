-- ─── Integrações: configurações e logs de eventos ────────────────────────────

CREATE TABLE IF NOT EXISTS integration_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_name text NOT NULL,          -- ex: 'rd_station', 'hubspot', 'webhook'
  credentials   jsonb NOT NULL DEFAULT '{}',
  status        text NOT NULL DEFAULT 'inactive'
                CHECK (status IN ('active', 'inactive', 'error')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_integration_settings_company ON integration_settings(company_id);

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_integration_settings_company" ON integration_settings;
CREATE POLICY "rls_integration_settings_company" ON integration_settings
  FOR ALL
  USING (
    company_id IN (
      SELECT p.empresa_id FROM perfis p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.empresa_id FROM perfis p WHERE p.id = auth.uid()
    )
  );

-- ─── Logs de eventos por integração ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integration_settings(id) ON DELETE CASCADE,
  event_type     text NOT NULL,         -- ex: 'webhook_received', 'sync_error', 'lead_created'
  payload        jsonb DEFAULT '{}',
  status         text NOT NULL DEFAULT 'success'
                 CHECK (status IN ('success', 'error', 'warning')),
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_company        ON integration_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration    ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at     ON integration_logs(created_at DESC);

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_integration_logs_company" ON integration_logs;
CREATE POLICY "rls_integration_logs_company" ON integration_logs
  FOR ALL
  USING (
    company_id IN (
      SELECT p.empresa_id FROM perfis p WHERE p.id = auth.uid()
    )
  );

-- ─── Trigger updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_integration_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_integration_settings_updated_at ON integration_settings;
CREATE TRIGGER trg_integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW EXECUTE FUNCTION set_integration_settings_updated_at();
