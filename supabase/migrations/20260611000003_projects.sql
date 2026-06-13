-- ─── Migration: Projetos de Implantação (Metodologia MIT) ─────────────────────
-- Tabela projects — gerenciamento de projetos de implantação por fase MIT
-- RLS: admin_isv/gestor_canais → CRUD completo no tenant
--      admin_franquia          → SELECT apenas dos projetos do próprio franchise_id

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Enum de fases MIT
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE project_phase AS ENUM (
    'iniciacao',
    'modelagem',
    'implantacao',
    'treinamento',
    'go_live',
    'encerramento'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('em_andamento', 'suspenso', 'concluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Tabela principal
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid          NOT NULL,

  -- Relacionamentos
  company_id              uuid          REFERENCES empresas(id)       ON DELETE SET NULL,
  franchise_id            uuid          REFERENCES franquias(id)      ON DELETE SET NULL,
  opportunity_id          uuid          REFERENCES oportunidades(id)  ON DELETE SET NULL,

  -- Identificação
  name                    varchar(255)  NOT NULL,

  -- Fase MIT
  phase                   project_phase NOT NULL DEFAULT 'iniciacao',
  status                  project_status NOT NULL DEFAULT 'em_andamento',

  -- Horas
  total_hours_estimated   numeric(8,2)  NOT NULL DEFAULT 0,
  total_hours_executed    numeric(8,2)  NOT NULL DEFAULT 0,

  -- Datas
  start_date              date,
  end_date_estimated      date,

  notes                   text,

  -- Auditoria
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Índices
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS projects_tenant_phase_idx
  ON projects (tenant_id, phase);

CREATE INDEX IF NOT EXISTS projects_tenant_status_idx
  ON projects (tenant_id, status);

CREATE INDEX IF NOT EXISTS projects_company_idx    ON projects (company_id);
CREATE INDEX IF NOT EXISTS projects_franchise_idx  ON projects (franchise_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Trigger updated_at
-- ──────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ISV / Gestor de canais: acesso total no tenant
CREATE POLICY projects_isv_all ON projects
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid() AND papel IN ('admin_isv', 'gestor_canais')
    )
  );

-- Admin de franquia: lê apenas projetos vinculados ao próprio franchise_id
CREATE POLICY projects_franquia_read ON projects
  FOR SELECT USING (
    tenant_id    = (SELECT tenant_id    FROM perfis WHERE id = auth.uid())
    AND franchise_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
  );

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS projects CASCADE;
-- DROP TYPE  IF EXISTS project_phase;
-- DROP TYPE  IF EXISTS project_status;
