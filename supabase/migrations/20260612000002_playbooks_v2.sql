-- ─── Playbooks v2 — Cadastro individual por produto/solução ──────────────────
-- Substitui a estrutura global de artigos/attachments/cases por registros
-- vinculados a um Playbook específico (ex: "Playbook Canal NG Pro").

-- ─── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE pb_funnel_stage AS ENUM (
    'prospeccao', 'qualificacao', 'diagnostico', 'proposta', 'fechamento'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pb_resource_type AS ENUM (
    'pdf', 'pptx', 'xls', 'video', 'link', 'doc', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── playbooks ────────────────────────────────────────────────────────────────
-- Registro mestre de cada Playbook de produto/solução.
CREATE TABLE IF NOT EXISTS playbooks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    text        NOT NULL,
  title        text        NOT NULL,
  segment      text        NOT NULL DEFAULT '',
  description  text,
  is_active    boolean     NOT NULL DEFAULT true,
  created_by   uuid        REFERENCES auth.users(id),
  updated_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbooks_tenant ON playbooks(tenant_id);
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_playbooks" ON playbooks
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ─── playbook_funnel_steps ────────────────────────────────────────────────────
-- Sugestões de atividades por etapa do funil para um Playbook específico.
-- content: Markdown com script, dicas, critérios, etc.
CREATE TABLE IF NOT EXISTS playbook_funnel_steps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id  uuid        NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  tenant_id    text        NOT NULL,
  stage        pb_funnel_stage NOT NULL,
  title        text        NOT NULL,
  content      text        NOT NULL DEFAULT '',
  sort_order   integer     NOT NULL DEFAULT 0,
  created_by   uuid        REFERENCES auth.users(id),
  updated_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pb_steps_playbook ON playbook_funnel_steps(playbook_id);
CREATE INDEX IF NOT EXISTS idx_pb_steps_tenant   ON playbook_funnel_steps(tenant_id);
ALTER TABLE playbook_funnel_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_pb_steps" ON playbook_funnel_steps
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ─── playbook_references ──────────────────────────────────────────────────────
-- Clientes de referência / casos de sucesso associados a um Playbook.
CREATE TABLE IF NOT EXISTS playbook_references (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id   uuid        NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  tenant_id     text        NOT NULL,
  company_name  text        NOT NULL,
  logo_initials text,
  logo_color    text        NOT NULL DEFAULT '#6366F1',
  region        text        NOT NULL DEFAULT '',
  summary       text,
  results       jsonb       NOT NULL DEFAULT '[]',  -- [{ label, value }]
  is_public     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pb_refs_playbook ON playbook_references(playbook_id);
CREATE INDEX IF NOT EXISTS idx_pb_refs_tenant   ON playbook_references(tenant_id);
ALTER TABLE playbook_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_pb_refs" ON playbook_references
  USING (tenant_id = current_setting('app.tenant_id', true));

-- ─── playbook_resources ───────────────────────────────────────────────────────
-- Materiais de apoio vinculados a um Playbook: PPTs, vídeos, estudos, links.
CREATE TABLE IF NOT EXISTS playbook_resources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id  uuid        NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  tenant_id    text        NOT NULL,
  title        text        NOT NULL,
  description  text,
  type         pb_resource_type NOT NULL DEFAULT 'link',
  url          text        NOT NULL DEFAULT '#',
  file_size    text,
  tags         text[]      NOT NULL DEFAULT '{}',
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pb_resources_playbook ON playbook_resources(playbook_id);
CREATE INDEX IF NOT EXISTS idx_pb_resources_tenant   ON playbook_resources(tenant_id);
ALTER TABLE playbook_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_pb_resources" ON playbook_resources
  USING (tenant_id = current_setting('app.tenant_id', true));
