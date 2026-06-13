-- ─── Migration: módulo de Contatos (Pessoas) ──────────────────────────────────
-- Cria a tabela contacts, adiciona FK em oportunidades e garante
-- todos os índices necessários para joins rápidos.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Tabela contacts
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  company_id  uuid REFERENCES empresas(id) ON DELETE SET NULL,

  name        text NOT NULL CHECK (char_length(trim(name)) > 0),
  email       text,
  phone       text,
  job_title   text,
  notes       text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Unicidade de e-mail dentro de cada tenant (e-mail pode ser null)
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_tenant_uidx
  ON contacts (tenant_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Índices para performance em joins futuros
-- ──────────────────────────────────────────────────────────────────────────────
-- Filtro por tenant (base de toda query multi-tenant)
CREATE INDEX IF NOT EXISTS contacts_tenant_idx       ON contacts (tenant_id);
-- Busca de todos os contatos de uma empresa
CREATE INDEX IF NOT EXISTS contacts_company_idx      ON contacts (company_id);
-- Ordenação / busca por nome
CREATE INDEX IF NOT EXISTS contacts_name_idx         ON contacts (tenant_id, lower(name));

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Trigger: mantém updated_at sincronizado automaticamente
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON contacts;
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. FK primary_contact_id em oportunidades
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE oportunidades
  ADD COLUMN IF NOT EXISTS primary_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;

-- Índice para join oportunidades → contacts
CREATE INDEX IF NOT EXISTS oportunidades_contact_idx
  ON oportunidades (primary_contact_id)
  WHERE primary_contact_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- admin_isv / gestor_canais: acesso completo ao tenant
CREATE POLICY contacts_isv_all ON contacts
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais')
    )
  );

-- admin_franquia: lê e cria contatos da própria empresa
CREATE POLICY contacts_franquia_read ON contacts
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    AND (
      company_id IN (
        SELECT empresa_id FROM perfis WHERE id = auth.uid()
      )
      OR company_id IS NULL
    )
  );

CREATE POLICY contacts_franquia_insert ON contacts
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    AND company_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Índices adicionais para queries analíticas futuras
--    (Campanhas × Contatos × Empresas × Oportunidades)
-- ──────────────────────────────────────────────────────────────────────────────
-- Busca full-text em nome + email (pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS contacts_name_trgm_idx
  ON contacts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_email_trgm_idx
  ON contacts USING gin (email gin_trgm_ops)
  WHERE email IS NOT NULL;

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- ALTER TABLE oportunidades DROP COLUMN IF EXISTS primary_contact_id;
-- DROP TABLE IF EXISTS contacts CASCADE;
