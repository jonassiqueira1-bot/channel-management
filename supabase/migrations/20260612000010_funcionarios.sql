-- ─── Funcionários (vendedores multi-tenant) ───────────────────────────────────
-- Mapeia funcionários a auth.users e ao cadastro unificado de empresas.
-- Roles padronizados: isv_admin | franchise_manager | seller | pre_sales | project_manager

CREATE TABLE IF NOT EXISTS funcionarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES companies(id),   -- ISV root
  company_id    uuid NOT NULL REFERENCES companies(id),   -- empresa do funcionário (FRANCHISE ou ISV)
  user_id       uuid REFERENCES auth.users(id),           -- NULL = ainda não tem login
  nome          text NOT NULL,
  email         text,
  telefone      text,
  cpf           text,
  role          text NOT NULL CHECK (role IN (
                  'isv_admin',
                  'franchise_manager',
                  'seller',
                  'pre_sales',
                  'project_manager'
                )),
  regiao        text,
  status        text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','afastado')),
  meta_mensal   numeric(14,2),
  observacoes   text,
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funcionarios_tenant    ON funcionarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_company   ON funcionarios(company_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_user      ON funcionarios(user_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_role      ON funcionarios(role);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_funcionarios_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_funcionarios_updated_at ON funcionarios;
CREATE TRIGGER trg_funcionarios_updated_at
  BEFORE UPDATE ON funcionarios
  FOR EACH ROW EXECUTE FUNCTION set_funcionarios_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

-- ISV admin: vê e gerencia todos os funcionários do tenant
DROP POLICY IF EXISTS "rls_func_isv_all" ON funcionarios;
CREATE POLICY "rls_func_isv_all" ON funcionarios
  FOR ALL
  USING (
    tenant_id = (
      SELECT c.id FROM companies c
      WHERE c.id = auth.uid()     -- tenant root == ISV company id
        AND c.type = 'ISV'
    )
    OR tenant_id IN (
      SELECT p.tenant_id FROM perfis p
      WHERE p.id = auth.uid() AND p.papel = 'admin_isv'
    )
  );

-- Franchise manager: vê apenas funcionários da própria empresa
DROP POLICY IF EXISTS "rls_func_franchise_select" ON funcionarios;
CREATE POLICY "rls_func_franchise_select" ON funcionarios
  FOR SELECT
  USING (
    company_id IN (
      SELECT p.empresa_id FROM perfis p WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "rls_func_franchise_manage" ON funcionarios;
CREATE POLICY "rls_func_franchise_manage" ON funcionarios
  FOR ALL
  USING (
    company_id IN (
      SELECT p.empresa_id FROM perfis p
      WHERE p.id = auth.uid() AND p.papel = 'franchise_manager'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.empresa_id FROM perfis p
      WHERE p.id = auth.uid() AND p.papel = 'franchise_manager'
    )
  );

-- Cada funcionário pode ver o próprio registro
DROP POLICY IF EXISTS "rls_func_self_select" ON funcionarios;
CREATE POLICY "rls_func_self_select" ON funcionarios
  FOR SELECT
  USING (user_id = auth.uid());
