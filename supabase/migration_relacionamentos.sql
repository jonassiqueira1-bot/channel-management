-- ============================================================
-- Migration: Relacionamentos do Escopo ISV
-- Execute no SQL Editor do Supabase após schema.sql e schema_additions.sql
--
-- O que este arquivo adiciona:
--   1. opportunities  → seller_id (FK real)
--   2. opportunity_products (junction M:N com products)
--   3. contracts      → opportunity_id (FK real + migração de custom_fields)
--   4. projects       → opportunity_id (FK real + migração de custom_fields)
--   5. commission_rule_products (junction regra ↔ produto)
--   6. commission_rule_sellers  (junction regra ↔ vendedor/perfil)
--   7. goals          → product_id (FK real + migração de custom_fields)
--   8. questionnaire_submissions → opportunity_id (FK real)
--   9. cs_records     (Sucesso do Cliente — tabela nova)
--  10. closing_reports (Fechamento Mensal — tabela nova)
-- ============================================================


-- ============================================================
-- 1. opportunities → seller_id
-- ============================================================
-- O Pipeline já tem owner_id (perfil interno) mas faltava o
-- vendedor do canal responsável pela oportunidade.

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS opportunities_seller_id_idx ON public.opportunities(seller_id);

COMMENT ON COLUMN public.opportunities.seller_id IS
  'Vendedor do canal (parceiro) responsável pela oportunidade.';


-- ============================================================
-- 2. opportunity_products — junction M:N
-- ============================================================
-- Uma oportunidade pode envolver múltiplos produtos com
-- quantidades e descontos individuais.

CREATE TABLE IF NOT EXISTS public.opportunity_products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantidade     integer NOT NULL DEFAULT 1,
  valor_unitario numeric(14,2),
  desconto_pct   numeric(5,2) DEFAULT 0,
  observacoes    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, product_id)
);

CREATE INDEX IF NOT EXISTS opp_products_opportunity_idx ON public.opportunity_products(opportunity_id);
CREATE INDEX IF NOT EXISTS opp_products_product_idx     ON public.opportunity_products(product_id);
CREATE INDEX IF NOT EXISTS opp_products_tenant_idx      ON public.opportunity_products(tenant_id);

ALTER TABLE public.opportunity_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opp_products: select" ON public.opportunity_products
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "opp_products: insert" ON public.opportunity_products
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "opp_products: update" ON public.opportunity_products
  FOR UPDATE USING (tenant_id = public.my_tenant_id());

CREATE POLICY "opp_products: delete" ON public.opportunity_products
  FOR DELETE USING (tenant_id = public.my_tenant_id());

COMMENT ON TABLE public.opportunity_products IS
  'Produtos vinculados a uma oportunidade de venda (Pipeline).';


-- ============================================================
-- 3. contracts → opportunity_id
-- ============================================================
-- Permite rastrear de qual oportunidade (fechada como ganha)
-- o contrato se originou. Fundamental para auditoria.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contracts_opportunity_id_idx ON public.contracts(opportunity_id);

-- Migra dados que já estavam salvos em custom_fields
UPDATE public.contracts
SET    opportunity_id = (custom_fields->>'opportunity_id')::uuid
WHERE  custom_fields->>'opportunity_id' IS NOT NULL
  AND  opportunity_id IS NULL;

COMMENT ON COLUMN public.contracts.opportunity_id IS
  'Oportunidade de origem (fechada como ganha) que gerou este contrato.';


-- ============================================================
-- 4. projects → opportunity_id
-- ============================================================
-- Promove opportunity_id de JSONB custom_fields para FK real,
-- garantindo integridade referencial e join eficiente.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_opportunity_id_idx ON public.projects(opportunity_id);

-- Migra dados que já estavam salvos em custom_fields
UPDATE public.projects
SET    opportunity_id = (custom_fields->>'opportunity_id')::uuid
WHERE  custom_fields->>'opportunity_id' IS NOT NULL
  AND  opportunity_id IS NULL;

COMMENT ON COLUMN public.projects.opportunity_id IS
  'Oportunidade que originou este projeto (produto tipo serviço).';


-- ============================================================
-- 5. commission_rule_products — junction regra ↔ produto
-- ============================================================
-- Uma regra de comissão pode se aplicar a múltiplos produtos
-- ou categorias de produtos.

CREATE TABLE IF NOT EXISTS public.commission_rule_products (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id    uuid NOT NULL REFERENCES public.commission_rules(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  categoria  text,  -- alternativa a product_id: aplica à categoria inteira
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rule_product_xor CHECK (
    (product_id IS NOT NULL) <> (categoria IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS crp_rule_idx    ON public.commission_rule_products(rule_id);
CREATE INDEX IF NOT EXISTS crp_product_idx ON public.commission_rule_products(product_id);
CREATE INDEX IF NOT EXISTS crp_tenant_idx  ON public.commission_rule_products(tenant_id);

ALTER TABLE public.commission_rule_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crp: view"   ON public.commission_rule_products
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "crp: manage" ON public.commission_rule_products
  FOR ALL USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

COMMENT ON TABLE public.commission_rule_products IS
  'Produtos ou categorias de produtos cobertos por uma regra de comissão.';


-- ============================================================
-- 6. commission_rule_sellers — junction regra ↔ vendedor/perfil
-- ============================================================
-- Uma regra de comissão pode ser aplicada a vendedores
-- específicos ou a perfis (roles).

CREATE TABLE IF NOT EXISTS public.commission_rule_sellers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id    uuid NOT NULL REFERENCES public.commission_rules(id) ON DELETE CASCADE,
  seller_id  uuid REFERENCES public.sellers(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_slug  text,  -- alternativa: aplica a todos de um role
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crs_rule_idx    ON public.commission_rule_sellers(rule_id);
CREATE INDEX IF NOT EXISTS crs_seller_idx  ON public.commission_rule_sellers(seller_id);
CREATE INDEX IF NOT EXISTS crs_tenant_idx  ON public.commission_rule_sellers(tenant_id);

ALTER TABLE public.commission_rule_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crs: view"   ON public.commission_rule_sellers
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "crs: manage" ON public.commission_rule_sellers
  FOR ALL USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

COMMENT ON TABLE public.commission_rule_sellers IS
  'Vendedores ou perfis cobertos por uma regra de comissão.';


-- ============================================================
-- 7. goals → product_id
-- ============================================================
-- Promove product_id de JSONB para FK real na tabela goals.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS goals_product_id_idx ON public.goals(product_id);

-- Migra dados de custom_fields
UPDATE public.goals
SET    product_id = (custom_fields->>'product_id')::uuid
WHERE  custom_fields->>'product_id' IS NOT NULL
  AND  product_id IS NULL;

COMMENT ON COLUMN public.goals.product_id IS
  'Produto ao qual esta meta se aplica (quando tipo_alvo = produto).';


-- ============================================================
-- 8. questionnaire_submissions → opportunity_id
-- ============================================================
-- Permite vincular uma submissão de questionário a uma
-- oportunidade (validação em tempo de venda).

ALTER TABLE public.questionnaire_submissions
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS qsub_opportunity_idx ON public.questionnaire_submissions(opportunity_id);

COMMENT ON COLUMN public.questionnaire_submissions.opportunity_id IS
  'Oportunidade de venda em que este questionário foi aplicado.';


-- ============================================================
-- 9. cs_records — Sucesso do Cliente
-- ============================================================
-- Tabela nova: registros de acompanhamento de clientes
-- (Check-ins, LAER stages, renovações).
-- Gerada automaticamente ao fechar oportunidade como ganha
-- e ao encerrar um projeto.

CREATE TABLE IF NOT EXISTS public.cs_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id         uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  opportunity_id    uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  project_id        uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  contract_id       uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  csm_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  laer_stage        text NOT NULL DEFAULT 'land',  -- land | adopt | expand | renew
  touch_model       text DEFAULT 'high_touch',      -- high_touch | low_touch | tech_touch
  health_score      integer CHECK (health_score BETWEEN 0 AND 100),
  data_renovacao    date,
  ultimo_checkin_em timestamptz,
  status            text NOT NULL DEFAULT 'ativo',  -- ativo | encerrado | churn
  notas             text,
  custom_fields     jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cs_records_tenant_idx      ON public.cs_records(tenant_id);
CREATE INDEX IF NOT EXISTS cs_records_company_idx     ON public.cs_records(company_id);
CREATE INDEX IF NOT EXISTS cs_records_opportunity_idx ON public.cs_records(opportunity_id);
CREATE INDEX IF NOT EXISTS cs_records_project_idx     ON public.cs_records(project_id);
CREATE INDEX IF NOT EXISTS cs_records_branch_idx      ON public.cs_records(branch_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cs_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cs_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs: select" ON public.cs_records
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "cs: insert" ON public.cs_records
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "cs: update" ON public.cs_records
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR csm_id = auth.uid())
  );

CREATE POLICY "cs: delete" ON public.cs_records
  FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

COMMENT ON TABLE public.cs_records IS
  'Registros de Sucesso do Cliente. Criados automaticamente ao fechar
   uma oportunidade como ganha ou ao encerrar um projeto.';


-- ============================================================
-- 10. closing_reports — Fechamento Mensal de Projetos
-- ============================================================
-- Consolida apontamentos de horas por período e gera
-- o repasse de comissões (commission_payments) como Pendente.

CREATE TABLE IF NOT EXISTS public.closing_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id             uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  project_id            uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  periodo_mes           integer NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_ano           integer NOT NULL,
  horas_apontadas       numeric(8,2) NOT NULL DEFAULT 0,
  horas_aprovadas       numeric(8,2),
  valor_hora            numeric(14,2),
  valor_total           numeric(14,2),
  status                text NOT NULL DEFAULT 'rascunho',
  -- rascunho | aguardando_aprovacao | aprovado | repasse_gerado
  aprovado_por          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  aprovado_em           timestamptz,
  commission_payment_id uuid REFERENCES public.commission_payments(id) ON DELETE SET NULL,
  observacoes           text,
  custom_fields         jsonb DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, periodo_mes, periodo_ano)
);

CREATE INDEX IF NOT EXISTS closing_reports_tenant_idx  ON public.closing_reports(tenant_id);
CREATE INDEX IF NOT EXISTS closing_reports_project_idx ON public.closing_reports(project_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.closing_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.closing_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closing: select" ON public.closing_reports
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "closing: manage" ON public.closing_reports
  FOR ALL USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

COMMENT ON TABLE public.closing_reports IS
  'Fechamento mensal de apontamentos de horas por projeto.
   Ao aprovar, gera automaticamente um commission_payment com status Pendente.';


-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
-- Resumo do que foi adicionado:
--
--   COLUNAS NOVAS
--   opportunities.seller_id           uuid → sellers
--   contracts.opportunity_id          uuid → opportunities
--   projects.opportunity_id           uuid → opportunities  (+ migração de custom_fields)
--   goals.product_id                  uuid → products       (+ migração de custom_fields)
--   questionnaire_submissions.opportunity_id uuid → opportunities
--
--   TABELAS NOVAS
--   opportunity_products       M:N  oportunidade ↔ produto
--   commission_rule_products   M:N  regra ↔ produto/categoria
--   commission_rule_sellers    M:N  regra ↔ vendedor/perfil
--   cs_records                       Sucesso do Cliente
--   closing_reports                  Fechamento Mensal de Projetos
-- ============================================================
