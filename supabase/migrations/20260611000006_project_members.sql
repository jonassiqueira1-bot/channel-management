-- ─── Migration: Equipe do Projeto ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id   uuid        NOT NULL,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  name        varchar(128) NOT NULL,
  role        varchar(64)  NOT NULL DEFAULT 'Consultor',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_members_project_idx ON project_members (project_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY members_isv_all ON project_members FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais'))
);

CREATE POLICY members_franquia_read ON project_members FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND project_id IN (
    SELECT id FROM projects
    WHERE franchise_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
  )
);

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS project_members CASCADE;
