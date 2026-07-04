-- Tabela de documentos (repositório simplificado)
CREATE TABLE IF NOT EXISTS documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES tenant_branches(id) ON DELETE SET NULL,
  owner_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  categoria     text NOT NULL DEFAULT 'outro',
  status        text NOT NULL DEFAULT 'ativo',
  prazo_validade date,
  data_revisao  date,
  perfis_acesso text[] DEFAULT '{}',
  link_externo  text,
  file_url      text,
  file_name     text,
  file_size     bigint,
  file_path     text,
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_tenant_all" ON documents
  FOR ALL USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_documents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION touch_documents_updated_at();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated, anon, service_role;

-- Notifica PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
