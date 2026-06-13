-- ─── Migration: Fases MIT por Projeto + Apontamento de Horas (Timesheet) ─────

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Adiciona current_phase_index em projects (idempotente)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS current_phase_index smallint NOT NULL DEFAULT 1
    CHECK (current_phase_index BETWEEN 1 AND 6);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Tabela project_phases — as 6 fases MIT por projeto
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_phases (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id           uuid        NOT NULL,

  phase_name          varchar(64) NOT NULL,             -- "Iniciação", "Modelagem", …
  phase_order         smallint    NOT NULL CHECK (phase_order BETWEEN 1 AND 6),

  start_date_planned  date,
  end_date_planned    date,
  hours_estimated     numeric(8,2) NOT NULL DEFAULT 0,
  is_completed        boolean      NOT NULL DEFAULT false,
  completed_at        timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (project_id, phase_order)
);

CREATE INDEX IF NOT EXISTS project_phases_project_idx ON project_phases (project_id, phase_order);

ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY phases_isv_all ON project_phases FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais'))
);

CREATE POLICY phases_franquia_read ON project_phases FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND project_id IN (
    SELECT id FROM projects
    WHERE franchise_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
  )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Tabela project_time_logs — Timesheet
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_time_logs (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id        uuid          REFERENCES project_phases(id) ON DELETE SET NULL,
  tenant_id       uuid          NOT NULL,
  user_id         uuid          REFERENCES auth.users(id) ON DELETE SET NULL,

  hours_executed  numeric(5,2)  NOT NULL CHECK (hours_executed > 0),
  description     text          NOT NULL,
  logged_at       date          NOT NULL DEFAULT CURRENT_DATE,

  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_logs_project_idx ON project_time_logs (project_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS time_logs_phase_idx   ON project_time_logs (phase_id);

ALTER TABLE project_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY timelogs_isv_all ON project_time_logs FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais'))
);

CREATE POLICY timelogs_franquia_read ON project_time_logs FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND project_id IN (
    SELECT id FROM projects
    WHERE franchise_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
  )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. View: progresso por fase (horas executadas vs estimadas)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_project_phase_progress AS
SELECT
  pp.id                                    AS phase_id,
  pp.project_id,
  pp.tenant_id,
  pp.phase_name,
  pp.phase_order,
  pp.hours_estimated,
  pp.is_completed,
  pp.start_date_planned,
  pp.end_date_planned,
  COALESCE(SUM(tl.hours_executed), 0)      AS hours_executed,
  CASE
    WHEN pp.hours_estimated > 0
    THEN ROUND((COALESCE(SUM(tl.hours_executed), 0) / pp.hours_estimated) * 100, 1)
    ELSE 0
  END                                      AS pct_done
FROM project_phases pp
LEFT JOIN project_time_logs tl ON tl.phase_id = pp.id
GROUP BY pp.id;

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP VIEW  IF EXISTS vw_project_phase_progress;
-- DROP TABLE IF EXISTS project_time_logs CASCADE;
-- DROP TABLE IF EXISTS project_phases    CASCADE;
-- ALTER TABLE projects DROP COLUMN IF EXISTS current_phase_index;
