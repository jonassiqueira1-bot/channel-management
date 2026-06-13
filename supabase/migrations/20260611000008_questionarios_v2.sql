-- ─── Questionários v2 ────────────────────────────────────────────────────────
-- Drop antigas tabelas se existirem (criadas na v1)
DROP TABLE IF EXISTS questionnaire_answers    CASCADE;
DROP TABLE IF EXISTS questionnaire_templates  CASCADE;
DROP TYPE  IF EXISTS questionnaire_type   CASCADE;
DROP TYPE  IF EXISTS questionnaire_status CASCADE;
DROP TYPE  IF EXISTS submission_status    CASCADE;

-- ─── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE questionnaire_type AS ENUM (
  'pre_venda', 'apoio_comercial', 'diagnostico', 'onboarding'
);

CREATE TYPE submission_status AS ENUM (
  'rascunho', 'enviado', 'em_revisao', 'aprovado', 'reprovado'
);

-- ─── Templates ────────────────────────────────────────────────────────────────
-- Cada template define as seções e perguntas do questionário.
-- estrutura_secoes: { secoes: [{ id, titulo, perguntas: [{ id, tipo, label, obrigatorio, opcoes }] }] }
-- tipos de pergunta aceitos: texto | numero | multipla_escolha
CREATE TABLE questionnaire_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        text        NOT NULL,
  title            text        NOT NULL,
  description      text,
  type             questionnaire_type NOT NULL DEFAULT 'pre_venda',
  estrutura_secoes jsonb       NOT NULL DEFAULT '{"secoes":[]}',
  is_active        boolean     NOT NULL DEFAULT true,
  created_by       uuid        REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── Submissions ──────────────────────────────────────────────────────────────
-- Cada submission é uma resposta isolada a um template específico.
-- valores_respostas: { [pergunta_id]: string | string[] }
CREATE TABLE questionnaire_submissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         text        NOT NULL,
  template_id       uuid        NOT NULL REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  company_id        bigint      REFERENCES companies(id),
  opportunity_id    uuid,
  status            submission_status NOT NULL DEFAULT 'rascunho',
  valores_respostas jsonb       NOT NULL DEFAULT '{}',
  answered_by       uuid        REFERENCES auth.users(id),
  reviewed_by       uuid        REFERENCES auth.users(id),
  review_notes      text,
  submitted_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qs_template  ON questionnaire_submissions (template_id);
CREATE INDEX idx_qs_tenant    ON questionnaire_submissions (tenant_id);
CREATE INDEX idx_qs_company   ON questionnaire_submissions (company_id);
CREATE INDEX idx_qt_tenant    ON questionnaire_templates   (tenant_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE questionnaire_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_submissions ENABLE ROW LEVEL SECURITY;

-- Templates: ISV vê e gerencia tudo no seu tenant; Franquia só lê
CREATE POLICY "templates_isv_full"
  ON questionnaire_templates FOR ALL
  USING  (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Submissions: ISV lê/escreve tudo; cada empresa só acessa as suas
CREATE POLICY "submissions_isv_full"
  ON questionnaire_submissions FOR ALL
  USING  (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_qt_updated_at  BEFORE UPDATE ON questionnaire_templates   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_qs_updated_at  BEFORE UPDATE ON questionnaire_submissions  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
