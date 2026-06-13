-- ─── Companies — cadastro unificado de empresas ──────────────────────────────
-- Hierarquia: ISV (tenant root) → FRANCHISE → CUSTOMER
-- parent_id = NULL  →  empresa raiz (ISV principal do tenant)

-- ─── 1. Tabela ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identificação
  name           text        NOT NULL,                    -- Nome Fantasia
  corporate_name text,                                    -- Razão Social
  cnpj           text,                                    -- CNPJ formatado (sem unique global — único por tenant)
  email          text,
  phone          text,
  website        text,

  -- Hierarquia
  type           text        NOT NULL DEFAULT 'CUSTOMER'
                   CHECK (type IN ('ISV', 'FRANCHISE', 'CUSTOMER')),
  parent_id      uuid        REFERENCES companies(id) ON DELETE CASCADE,

  -- Endereço
  cep            text,
  address        text,
  city           text,
  state          text,
  country        text        NOT NULL DEFAULT 'BR',

  -- Marca / white-label (relevante para ISV)
  logo_url       text,
  primary_color  text,
  accent_color   text,

  -- Operacional
  status         text        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive','suspended')),
  notes          text,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- CNPJ único por tenant (quando preenchido)
  UNIQUE NULLS NOT DISTINCT (tenant_id, cnpj)
);

COMMENT ON TABLE  companies IS 'Cadastro unificado: ISV (raiz do tenant) → FRANCHISE → CUSTOMER.';
COMMENT ON COLUMN companies.tenant_id  IS 'Dono do tenant; auth.uid() no momento do INSERT.';
COMMENT ON COLUMN companies.type       IS 'ISV = empresa proprietária da plataforma; FRANCHISE = canal/franquia; CUSTOMER = cliente final.';
COMMENT ON COLUMN companies.parent_id  IS 'NULL = raiz (ISV). FRANCHISE → aponta para ISV. CUSTOMER → aponta para FRANCHISE ou ISV.';

CREATE INDEX IF NOT EXISTS idx_companies_tenant   ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_type     ON companies(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_companies_parent   ON companies(parent_id);

-- ─── 2. updated_at trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_companies_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_companies_updated_at();

-- ─── 3. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_companies_isv_all    ON companies;
DROP POLICY IF EXISTS rls_companies_franchise  ON companies;
DROP POLICY IF EXISTS rls_companies_customer   ON companies;
DROP POLICY IF EXISTS rls_companies_insert     ON companies;

-- ISV: vê e edita toda a hierarquia do seu tenant
CREATE POLICY rls_companies_isv_all ON companies
  FOR ALL
  USING (
    tenant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM companies isv
      WHERE isv.tenant_id = auth.uid()
        AND isv.type = 'ISV'
        AND isv.id IS NOT NULL
    )
  )
  WITH CHECK (tenant_id = auth.uid());

-- FRANCHISE: vê apenas a si mesma e seus clientes diretos
-- (para uso futuro quando franquias tiverem login próprio)
CREATE POLICY rls_companies_franchise ON companies
  FOR SELECT
  USING (
    -- A própria franquia
    id IN (
      SELECT c.id FROM companies c
      JOIN companies me ON me.id = c.id
      WHERE me.tenant_id = auth.uid() AND me.type = 'FRANCHISE'
    )
    OR
    -- Clientes cujo parent_id = franquia do usuário logado
    parent_id IN (
      SELECT c.id FROM companies c
      WHERE c.tenant_id = auth.uid() AND c.type = 'FRANCHISE'
    )
  );

-- INSERT: qualquer usuário autenticado pode criar empresas no seu tenant
CREATE POLICY rls_companies_insert ON companies
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

-- ─── 4. Seed — Organização Principal (ISV) ───────────────────────────────────
-- Insere a ISV raiz do tenant atual apenas se ainda não existir.
-- Em produção: substituir auth.uid() pelo UUID real do tenant.
-- Execute este bloco como função SECURITY DEFINER ou via Supabase Dashboard.
--
-- INSERT INTO companies (tenant_id, name, corporate_name, type, parent_id, status)
-- SELECT
--   auth.uid(),
--   'Minha Empresa ISV',      -- substitua pelo nome fantasia real
--   'Minha Empresa ISV Ltda', -- substitua pela razão social real
--   'ISV',
--   NULL,
--   'active'
-- WHERE NOT EXISTS (
--   SELECT 1 FROM companies
--   WHERE tenant_id = auth.uid() AND type = 'ISV'
-- );
--
-- Seed de desenvolvimento (uuid fixo de dev):
INSERT INTO companies (
  id, tenant_id, name, corporate_name, cnpj, email, phone, website,
  type, parent_id, status, city, state,
  primary_color, accent_color
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',  -- ISV root (dev)
  'a0000000-0000-0000-0000-000000000001',  -- tenant_id = próprio id (dev bypass)
  'NG Informática',
  'NG Informática Tecnologia da Informação Ltda',
  '00.000.000/0001-00',
  'contato@ngi.com.br',
  '(11) 4000-0000',
  'https://ngi.com.br',
  'ISV',
  NULL,
  'active',
  'São Paulo',
  'SP',
  '#6366F1',
  '#10B981'
)
ON CONFLICT (id) DO NOTHING;

-- Franquias de exemplo (ligadas ao ISV root)
INSERT INTO companies (id, tenant_id, name, corporate_name, cnpj, type, parent_id, status, city, state)
VALUES
  ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Nexus Tech',  'Grupo Nexus Tecnologia Ltda',      '12.345.678/0001-90', 'FRANCHISE', 'a0000000-0000-0000-0000-000000000001', 'active',  'São Paulo',       'SP'),
  ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Alpha Dist.', 'Distribuidora Alpha Comércio S/A',  '98.765.432/0001-11', 'FRANCHISE', 'a0000000-0000-0000-0000-000000000001', 'active',  'Curitiba',        'PR'),
  ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'FinCorp',     'FinCorp Serviços Financeiros S/A',  '33.444.555/0001-66', 'FRANCHISE', 'a0000000-0000-0000-0000-000000000001', 'active',  'São Paulo',       'SP')
ON CONFLICT (id) DO NOTHING;

-- Clientes exemplo (ligados às franquias)
INSERT INTO companies (id, tenant_id, name, corporate_name, cnpj, type, parent_id, status, city, state)
VALUES
  ('a0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Solaris',    'Solaris Energia Renovável Ltda',  '45.678.901/0001-55', 'CUSTOMER', 'a0000000-0000-0000-0000-000000000002', 'active',    'Belo Horizonte', 'MG'),
  ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Milenium',   'Construtora Milenium S/A',         '11.222.333/0001-44', 'CUSTOMER', 'a0000000-0000-0000-0000-000000000003', 'active',    'Rio de Janeiro', 'RJ'),
  ('a0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'AgriSmart',  'AgriSmart Soluções Agro Ltda',     '77.888.999/0001-22', 'CUSTOMER', 'a0000000-0000-0000-0000-000000000002', 'inactive',  'Ribeirão Preto', 'SP'),
  ('a0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'MedGroup',   'MedGroup Saúde Corporativa Ltda',  '22.333.444/0001-77', 'CUSTOMER', 'a0000000-0000-0000-0000-000000000004', 'active',    'Porto Alegre',   'RS'),
  ('a0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Logix',      'Logix Transportes e Logística Ltda','55.666.777/0001-88', 'CUSTOMER', 'a0000000-0000-0000-0000-000000000002', 'active',    'Campinas',       'SP')
ON CONFLICT (id) DO NOTHING;
