-- ─── Migration: Módulo de Questionários ──────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Enums
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE questionnaire_type   AS ENUM ('pre_venda', 'apoio_comercial', 'diagnostico', 'onboarding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE questionnaire_status AS ENUM ('rascunho', 'enviado', 'em_revisao', 'aprovado', 'reprovado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. questionnaire_templates — modelos configuráveis por ISV
-- ──────────────────────────────────────────────────────────────────────────────
-- Estrutura JSONB esperada em `questions`:
-- {
--   "steps": [
--     {
--       "title": "Identificação",
--       "questions": [
--         { "id": "q1", "type": "text|textarea|select|radio|checkbox|number|date",
--           "label": "...", "required": true, "options": ["A","B"] }
--       ]
--     }
--   ]
-- }
CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid         NOT NULL,
  title        varchar(200) NOT NULL,
  description  text,
  type         questionnaire_type NOT NULL DEFAULT 'pre_venda',
  questions    jsonb        NOT NULL DEFAULT '{"steps":[]}',
  is_active    boolean      NOT NULL DEFAULT true,
  created_by   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qt_tenant_idx ON questionnaire_templates (tenant_id, is_active);

ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY qt_isv_all ON questionnaire_templates FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais'))
);

CREATE POLICY qt_franquia_read ON questionnaire_templates FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND is_active = true
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. questionnaire_answers — respostas por empresa/oportunidade
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questionnaire_answers (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid         NOT NULL,
  template_id     uuid         NOT NULL REFERENCES questionnaire_templates(id) ON DELETE CASCADE,

  -- vínculos opcionais
  company_id      uuid         REFERENCES companies(id)      ON DELETE SET NULL,
  opportunity_id  uuid         REFERENCES oportunidades(id)  ON DELETE SET NULL,

  status          questionnaire_status NOT NULL DEFAULT 'rascunho',
  answers         jsonb        NOT NULL DEFAULT '{}',   -- { "q1": "valor", "q2": ["A","B"] }
  step_atual      smallint     NOT NULL DEFAULT 0,      -- último passo salvo

  answered_by     uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by     uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes    text,
  submitted_at    timestamptz,
  reviewed_at     timestamptz,

  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qa_tenant_idx    ON questionnaire_answers (tenant_id, status);
CREATE INDEX IF NOT EXISTS qa_template_idx  ON questionnaire_answers (template_id);
CREATE INDEX IF NOT EXISTS qa_company_idx   ON questionnaire_answers (company_id);
CREATE INDEX IF NOT EXISTS qa_opp_idx       ON questionnaire_answers (opportunity_id);

ALTER TABLE questionnaire_answers ENABLE ROW LEVEL SECURITY;

-- ISV vê tudo do seu tenant
CREATE POLICY qa_isv_all ON questionnaire_answers FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais'))
);

-- Franquia vê apenas suas próprias respostas
CREATE POLICY qa_franquia_own ON questionnaire_answers FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
  AND company_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
);

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS questionnaire_answers   CASCADE;
-- DROP TABLE IF EXISTS questionnaire_templates CASCADE;
-- DROP TYPE  IF EXISTS questionnaire_status;
-- DROP TYPE  IF EXISTS questionnaire_type;
