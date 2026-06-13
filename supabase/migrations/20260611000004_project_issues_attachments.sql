-- ─── Migration: Pendências e Anexos de Projetos ───────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Enums
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE issue_criticality AS ENUM ('baixa', 'media', 'alta', 'critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE issue_status AS ENUM ('aberta', 'resolvida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Tabela project_issues (Pendências / Bloqueios)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_issues (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id     uuid          NOT NULL,
  description   text          NOT NULL,
  criticality   issue_criticality NOT NULL DEFAULT 'media',
  status        issue_status  NOT NULL DEFAULT 'aberta',
  created_by    uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by   uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX IF NOT EXISTS project_issues_project_idx
  ON project_issues (project_id, status);

CREATE INDEX IF NOT EXISTS project_issues_tenant_critica_idx
  ON project_issues (tenant_id, criticality, status);

ALTER TABLE project_issues ENABLE ROW LEVEL SECURITY;

-- ISV: acesso total
CREATE POLICY issues_isv_all ON project_issues
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais'))
  );

-- Franquia: lê apenas issues de projetos do seu franchise_id
CREATE POLICY issues_franquia_read ON project_issues
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    AND project_id IN (
      SELECT id FROM projects
      WHERE franchise_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Tabela project_attachments (Documentos)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_attachments (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id     uuid          NOT NULL,
  name          varchar(255)  NOT NULL,
  file_url      text          NOT NULL,
  file_size     bigint,
  mime_type     varchar(128),
  uploaded_by   uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_attachments_project_idx
  ON project_attachments (project_id);

ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY attachments_isv_all ON project_attachments
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais'))
  );

CREATE POLICY attachments_franquia_read ON project_attachments
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    AND project_id IN (
      SELECT id FROM projects
      WHERE franchise_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Garante coluna opportunity_id em projects (idempotente)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES oportunidades(id) ON DELETE SET NULL;

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS project_attachments CASCADE;
-- DROP TABLE IF EXISTS project_issues CASCADE;
-- DROP TYPE  IF EXISTS issue_criticality;
-- DROP TYPE  IF EXISTS issue_status;
