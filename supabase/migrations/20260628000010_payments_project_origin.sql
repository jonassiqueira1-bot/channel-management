-- ─── Migration: payments — project_id + origin_type ──────────────────────────
-- Adiciona rastreabilidade de origem em pagamentos:
--   project_id  → FK para projects (pagamentos oriundos de fechamento de horas)
--   origin_type → 'contrato' | 'projeto' | 'manual'

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_type text CHECK (origin_type IN ('contrato','projeto','manual'));

CREATE INDEX IF NOT EXISTS payments_project_idx ON payments (project_id);

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- ALTER TABLE payments DROP COLUMN IF EXISTS project_id;
-- ALTER TABLE payments DROP COLUMN IF EXISTS origin_type;
