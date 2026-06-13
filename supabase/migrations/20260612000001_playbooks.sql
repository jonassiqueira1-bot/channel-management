-- ─── Playbooks ───────────────────────────────────────────────────────────────

-- ─── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE playbook_article_type AS ENUM (
  'etapa_funil', 'estudo_mercado'
);

CREATE TYPE playbook_funnel_stage AS ENUM (
  'prospeccao', 'qualificacao', 'diagnostico', 'proposta', 'fechamento'
);

CREATE TYPE playbook_attachment_type AS ENUM (
  'pdf', 'pptx', 'xls', 'video', 'link', 'doc', 'outro'
);

-- ─── playbook_articles ────────────────────────────────────────────────────────
-- Armazena artigos de capacitação: roteiros por etapa do funil e estudos de mercado.
-- content: texto em Markdown
CREATE TABLE playbook_articles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text        NOT NULL,
  type        playbook_article_type NOT NULL,
  stage       playbook_funnel_stage,             -- apenas para type='etapa_funil'
  title       text        NOT NULL,
  content     text        NOT NULL DEFAULT '',
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_by  uuid        REFERENCES auth.users(id),
  updated_by  uuid        REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_playbook_articles_tenant ON playbook_articles(tenant_id);
CREATE INDEX idx_playbook_articles_type   ON playbook_articles(tenant_id, type);
CREATE INDEX idx_playbook_articles_stage  ON playbook_articles(tenant_id, stage);

ALTER TABLE playbook_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_articles" ON playbook_articles
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ─── playbook_attachments ─────────────────────────────────────────────────────
-- Materiais de apoio: arquivos, links, apresentações, vídeos.
CREATE TABLE playbook_attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text        NOT NULL,
  title       text        NOT NULL,
  description text,
  type        playbook_attachment_type NOT NULL DEFAULT 'link',
  url         text        NOT NULL,
  file_size   text,                          -- "2.4 MB", "—", etc.
  tags        text[]      NOT NULL DEFAULT '{}',
  sort_order  integer     NOT NULL DEFAULT 0,
  created_by  uuid        REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_playbook_attachments_tenant ON playbook_attachments(tenant_id);

ALTER TABLE playbook_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_attachments" ON playbook_attachments
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ─── playbook_success_cases ───────────────────────────────────────────────────
-- Casos de sucesso / clientes de referência para uso comercial.
CREATE TABLE playbook_success_cases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text        NOT NULL,
  company_name    text        NOT NULL,
  logo_initials   text,
  logo_color      text        NOT NULL DEFAULT '#6366F1',
  product         text        NOT NULL,
  segment         text        NOT NULL,      -- SaaS, Indústria, Saúde, Varejo, etc.
  region          text        NOT NULL,      -- Sul, Sudeste, Norte, etc.
  summary         text,                      -- parágrafo de resultado em 1-2 linhas
  results         jsonb       NOT NULL DEFAULT '[]',  -- [{ label, value }]
  challenge       text,
  solution        text,
  testimonial     text,
  contact_name    text,
  contact_role    text,
  closed_at       date,
  is_public       boolean     NOT NULL DEFAULT false,  -- disponível para franquias
  created_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_playbook_cases_tenant  ON playbook_success_cases(tenant_id);
CREATE INDEX idx_playbook_cases_segment ON playbook_success_cases(tenant_id, segment);
CREATE INDEX idx_playbook_cases_region  ON playbook_success_cases(tenant_id, region);

ALTER TABLE playbook_success_cases ENABLE ROW LEVEL SECURITY;

-- ISV vê todos; franquias só veem is_public = true
CREATE POLICY "isv_all_cases" ON playbook_success_cases
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "isv_manage_cases" ON playbook_success_cases
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));
