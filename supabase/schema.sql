-- ============================================================
-- Channel Management — Schema Supabase Completo
-- Versão: 1.0 | Multitenancy com filiais e compartilhamento
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HELPERS: funções auxiliares para RLS
-- ============================================================

-- Retorna o tenant_id do usuário logado (lê da tabela profiles)
CREATE OR REPLACE FUNCTION auth.my_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Retorna o branch_id do usuário logado (pode ser NULL)
CREATE OR REPLACE FUNCTION auth.my_branch_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Retorna o papel do usuário logado
CREATE OR REPLACE FUNCTION auth.my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Verifica se o usuário tem acesso a um registro de outra filial
CREATE OR REPLACE FUNCTION public.has_branch_access(record_id uuid, record_table text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.branch_record_shares brs
    WHERE brs.record_id     = has_branch_access.record_id
      AND brs.record_table  = has_branch_access.record_table
      AND brs.tenant_id     = auth.my_tenant_id()
      AND (
        brs.shared_to_branch_id = auth.my_branch_id()
        OR brs.shared_to_branch_id IS NULL  -- compartilhado com todas as filiais
      )
      AND (
        brs.shared_to_role IS NULL
        OR brs.shared_to_role = auth.my_role()
      )
      AND (brs.expires_at IS NULL OR brs.expires_at > now())
  )
$$;

-- ============================================================
-- 1. TENANTS — contas ISV
-- ============================================================
CREATE TABLE public.tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,           -- ex: "ngi", "acme"
  plan          text NOT NULL DEFAULT 'trial',  -- trial | starter | pro | enterprise
  status        text NOT NULL DEFAULT 'active', -- active | suspended | cancelled
  logo_url      text,
  primary_color text DEFAULT '#6366f1',
  domain        text,                           -- domínio customizado futuro
  settings      jsonb NOT NULL DEFAULT '{}',    -- configurações globais do tenant
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. TENANT_BRANCHES — filiais (opcional por tenant)
-- ============================================================
CREATE TABLE public.tenant_branches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  code        text,                    -- código curto, ex: "SP-01"
  region      text,
  address     text,
  status      text NOT NULL DEFAULT 'active',
  settings    jsonb NOT NULL DEFAULT '{}',  -- segregação configurada pelo admin
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tenant_branches(tenant_id);

-- ============================================================
-- 3. TENANT_ROLES — perfis customizáveis por tenant
-- ============================================================
CREATE TABLE public.tenant_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,                    -- ex: "Gerente Regional"
  base_role   text NOT NULL,                   -- admin_isv | vendedor | canal
  permissions jsonb NOT NULL DEFAULT '{}',     -- permissões granulares
  is_system   boolean NOT NULL DEFAULT false,  -- true = roles base (não deletáveis)
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tenant_roles(tenant_id);

-- Seed das 3 roles base (inseridas via trigger ao criar tenant)
-- admin_isv: acesso total
-- vendedor:  acesso à própria filial
-- canal:     acesso apenas ao que foi compartilhado

-- ============================================================
-- 4. PROFILES — usuários dos tenants
-- ============================================================
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  role        text NOT NULL DEFAULT 'vendedor',    -- role base
  role_id     uuid REFERENCES public.tenant_roles(id) ON DELETE SET NULL,  -- role customizada
  nome        text NOT NULL,
  email       text NOT NULL,
  phone       text,
  cargo       text,
  avatar_url  text,
  status      text NOT NULL DEFAULT 'active',      -- active | inactive | pending
  settings    jsonb NOT NULL DEFAULT '{}',
  last_seen   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.profiles(tenant_id);
CREATE INDEX ON public.profiles(branch_id);

-- ============================================================
-- 5. COMPANIES — empresas/clientes
-- ============================================================
CREATE TABLE public.companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  razao_social    text NOT NULL,
  nome_fantasia   text,
  cnpj            text,
  email           text,
  phone           text,
  website         text,
  segment         text,
  status          text NOT NULL DEFAULT 'ativo',
  owner_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  address         jsonb DEFAULT '{}',
  custom_fields   jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.companies(tenant_id);
CREATE INDEX ON public.companies(branch_id);
CREATE INDEX ON public.companies(owner_id);

-- ============================================================
-- 6. CONTACTS — contatos das empresas
-- ============================================================
CREATE TABLE public.contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id    uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  nome          text NOT NULL,
  email         text,
  phone         text,
  cargo         text,
  status        text NOT NULL DEFAULT 'ativo',
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.contacts(tenant_id);
CREATE INDEX ON public.contacts(branch_id);
CREATE INDEX ON public.contacts(company_id);

-- ============================================================
-- 7. PIPELINE_STAGES — etapas do funil (por tenant)
-- ============================================================
CREATE TABLE public.pipeline_stages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  order_idx  int NOT NULL DEFAULT 0,
  color      text DEFAULT '#6366f1',
  is_won     boolean DEFAULT false,
  is_lost    boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pipeline_stages(tenant_id);

-- ============================================================
-- 8. OPPORTUNITIES — oportunidades (pipeline)
-- ============================================================
CREATE TABLE public.opportunities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id           uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id          uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id          uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  stage_id            uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  owner_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  titulo              text NOT NULL,
  valor               numeric(14,2),
  situacao            text NOT NULL DEFAULT 'em_andamento',
  origem              text,
  prazo               date,
  descricao           text,
  motivo_perda        text,
  custom_fields       jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.opportunities(tenant_id);
CREATE INDEX ON public.opportunities(branch_id);
CREATE INDEX ON public.opportunities(company_id);
CREATE INDEX ON public.opportunities(stage_id);
CREATE INDEX ON public.opportunities(owner_id);

-- ============================================================
-- 9. PRODUCTS — produtos/serviços
-- ============================================================
CREATE TABLE public.products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  nome          text NOT NULL,
  descricao     text,
  tipo          text,
  preco         numeric(14,2),
  unidade       text,
  status        text NOT NULL DEFAULT 'ativo',
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.products(tenant_id);

-- ============================================================
-- 10. PROJECTS — projetos
-- ============================================================
CREATE TABLE public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id    uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome          text NOT NULL,
  status        text NOT NULL DEFAULT 'em_andamento',
  data_inicio   date,
  data_fim      date,
  descricao     text,
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.projects(tenant_id);
CREATE INDEX ON public.projects(branch_id);
CREATE INDEX ON public.projects(company_id);

-- ============================================================
-- 11. CONTRACTS — contratos
-- ============================================================
CREATE TABLE public.contracts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id    uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  numero        text,
  tipo          text,
  status        text NOT NULL DEFAULT 'ativo',
  valor         numeric(14,2),
  data_inicio   date,
  data_fim      date,
  objeto        text,
  observacoes   text,
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.contracts(tenant_id);
CREATE INDEX ON public.contracts(branch_id);
CREATE INDEX ON public.contracts(company_id);

-- ============================================================
-- 12. PAYMENTS — pagamentos
-- ============================================================
CREATE TABLE public.payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id        uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id       uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contract_id      uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  referencia       text,
  tipo             text,
  status           text NOT NULL DEFAULT 'pendente',
  valor            numeric(14,2),
  vencimento       date,
  data_pagamento   date,
  descricao        text,
  observacoes      text,
  custom_fields    jsonb DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payments(tenant_id);
CREATE INDEX ON public.payments(branch_id);
CREATE INDEX ON public.payments(company_id);
CREATE INDEX ON public.payments(contract_id);

-- ============================================================
-- 13. ACTIONS — ações / tarefas
-- ============================================================
CREATE TABLE public.actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  opportunity_id  uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  owner_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  titulo          text NOT NULL,
  tipo            text,
  status          text NOT NULL DEFAULT 'pendente',
  prioridade      text DEFAULT 'media',
  data_prevista   date,
  data_conclusao  date,
  descricao       text,
  custom_fields   jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.actions(tenant_id);
CREATE INDEX ON public.actions(branch_id);
CREATE INDEX ON public.actions(company_id);
CREATE INDEX ON public.actions(opportunity_id);
CREATE INDEX ON public.actions(owner_id);

-- ============================================================
-- 14. SELLERS — vendedores / canais
-- ============================================================
CREATE TABLE public.sellers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  profile_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome          text NOT NULL,
  email         text,
  telefone      text,
  cargo         text,
  status        text NOT NULL DEFAULT 'ativo',
  regiao        text,
  equipe        text,
  data_admissao date,
  meta_mensal   numeric(14,2),
  comissao_perc numeric(5,2),
  observacoes   text,
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.sellers(tenant_id);
CREATE INDEX ON public.sellers(branch_id);

-- ============================================================
-- 15. BRANCH_RECORD_SHARES — compartilhamento granular por registro
-- ============================================================
-- Permite que um admin compartilhe um registro específico de uma filial
-- com outra filial, ou com todas (shared_to_branch_id IS NULL).
-- Granularidade: pode restringir por role também.
CREATE TABLE public.branch_record_shares (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  record_id            uuid NOT NULL,       -- id do registro compartilhado
  record_table         text NOT NULL,       -- 'companies' | 'opportunities' | etc.
  shared_from_branch   uuid NOT NULL REFERENCES public.tenant_branches(id) ON DELETE CASCADE,
  shared_to_branch_id  uuid REFERENCES public.tenant_branches(id) ON DELETE CASCADE,
  -- NULL = compartilhado com TODAS as filiais do tenant
  shared_to_role       text,               -- NULL = todos os roles
  permission           text NOT NULL DEFAULT 'view',  -- view | edit
  shared_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at           timestamptz,        -- NULL = sem expiração
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.branch_record_shares(tenant_id, record_table, record_id);
CREATE INDEX ON public.branch_record_shares(shared_to_branch_id);

-- ============================================================
-- 16. BRANCH_TABLE_VISIBILITY — visibilidade padrão por entidade
-- ============================================================
-- Admin configura: "na tela de Empresas, filial SP vê os dados de RJ"
-- Isso cria visibilidade em massa, sem ter que compartilhar registro a registro.
-- A visibilidade granular (branch_record_shares) sobrepõe esta config.
CREATE TABLE public.branch_table_visibility (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_branch_id     uuid NOT NULL REFERENCES public.tenant_branches(id) ON DELETE CASCADE,
  target_branch_id     uuid NOT NULL REFERENCES public.tenant_branches(id) ON DELETE CASCADE,
  entity_table         text NOT NULL,      -- 'companies' | 'opportunities' | etc.
  can_view             boolean NOT NULL DEFAULT true,
  can_edit             boolean NOT NULL DEFAULT false,
  created_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, source_branch_id, target_branch_id, entity_table)
);
CREATE INDEX ON public.branch_table_visibility(tenant_id);

-- ============================================================
-- 17. FORM_LAYOUTS — configuração de campos por tenant/entidade
-- ============================================================
CREATE TABLE public.form_layouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity      text NOT NULL,   -- 'companies' | 'opportunities' | etc.
  fields      jsonb NOT NULL DEFAULT '[]',
  layout      jsonb NOT NULL DEFAULT '[]',
  updated_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, entity)
);
CREATE INDEX ON public.form_layouts(tenant_id);

-- ============================================================
-- 18. SIDEBAR_CONFIG — organização do menu por tenant/usuário
-- ============================================================
CREATE TABLE public.sidebar_config (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- NULL profile_id = padrão do tenant (todos os usuários herdam)
  groups     jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, profile_id)
);
CREATE INDEX ON public.sidebar_config(tenant_id);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants','profiles','companies','contacts','opportunities',
    'products','projects','contracts','payments','actions','sellers','form_layouts'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- TRIGGER: provisionar roles base ao criar tenant
-- ============================================================
CREATE OR REPLACE FUNCTION public.provision_tenant_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.tenant_roles (tenant_id, name, base_role, is_system, permissions) VALUES
    (NEW.id, 'Admin ISV',  'admin_isv', true, '{"all": true}'),
    (NEW.id, 'Vendedor',   'vendedor',  true, '{"own_branch": true}'),
    (NEW.id, 'Canal',      'canal',     true, '{"shared_only": true}');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.provision_tenant_roles();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_record_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_table_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_layouts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sidebar_config       ENABLE ROW LEVEL SECURITY;

-- ── tenants ──────────────────────────────────────────────────
-- Usuário vê apenas o próprio tenant
CREATE POLICY "tenant: own"
  ON public.tenants FOR SELECT
  USING (id = auth.my_tenant_id());

CREATE POLICY "tenant: admin update"
  ON public.tenants FOR UPDATE
  USING (id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── tenant_branches ───────────────────────────────────────────
CREATE POLICY "branches: own tenant"
  ON public.tenant_branches FOR SELECT
  USING (tenant_id = auth.my_tenant_id());

CREATE POLICY "branches: admin manage"
  ON public.tenant_branches FOR ALL
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── tenant_roles ──────────────────────────────────────────────
CREATE POLICY "roles: own tenant"
  ON public.tenant_roles FOR SELECT
  USING (tenant_id = auth.my_tenant_id());

CREATE POLICY "roles: admin manage"
  ON public.tenant_roles FOR ALL
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── profiles ──────────────────────────────────────────────────
-- Usuário vê seu próprio perfil sempre
-- Admin ISV vê todos do tenant
-- Vendedor vê quem está na mesma filial
CREATE POLICY "profiles: own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: admin sees all"
  ON public.profiles FOR SELECT
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

CREATE POLICY "profiles: same branch"
  ON public.profiles FOR SELECT
  USING (
    tenant_id = auth.my_tenant_id()
    AND branch_id = auth.my_branch_id()
    AND auth.my_role() IN ('vendedor', 'canal')
  );

CREATE POLICY "profiles: self update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles: admin manage"
  ON public.profiles FOR ALL
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── Macro para entidades com branch_id ───────────────────────
-- Padrão de acesso para companies, contacts, opportunities, etc.:
--   admin_isv → vê tudo do tenant
--   vendedor  → vê própria filial + o que foi compartilhado (por registro ou por tabela)
--   canal     → vê apenas o que foi compartilhado

-- Função que encapsula a lógica de visibilidade cross-branch
CREATE OR REPLACE FUNCTION public.can_see_branch_record(
  rec_branch_id  uuid,
  rec_id         uuid,
  rec_table      text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    -- Admin vê tudo do tenant
    auth.my_role() = 'admin_isv'
    OR
    -- Própria filial (ou registro sem filial = todo tenant)
    (rec_branch_id IS NULL OR rec_branch_id = auth.my_branch_id())
    OR
    -- Visibilidade em massa configurada pelo admin
    EXISTS (
      SELECT 1 FROM public.branch_table_visibility btv
      WHERE btv.tenant_id         = auth.my_tenant_id()
        AND btv.source_branch_id  = rec_branch_id
        AND btv.target_branch_id  = auth.my_branch_id()
        AND btv.entity_table      = rec_table
        AND btv.can_view          = true
    )
    OR
    -- Compartilhamento granular por registro
    public.has_branch_access(rec_id, rec_table)
$$;

-- ── companies ─────────────────────────────────────────────────
CREATE POLICY "companies: select"
  ON public.companies FOR SELECT
  USING (
    tenant_id = auth.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'companies')
  );

CREATE POLICY "companies: insert"
  ON public.companies FOR INSERT
  WITH CHECK (
    tenant_id = auth.my_tenant_id()
    AND (branch_id IS NULL OR branch_id = auth.my_branch_id() OR auth.my_role() = 'admin_isv')
  );

CREATE POLICY "companies: update"
  ON public.companies FOR UPDATE
  USING (
    tenant_id = auth.my_tenant_id()
    AND (
      auth.my_role() = 'admin_isv'
      OR branch_id = auth.my_branch_id()
      OR EXISTS (
        SELECT 1 FROM public.branch_record_shares brs
        WHERE brs.record_id = id AND brs.record_table = 'companies'
          AND brs.shared_to_branch_id = auth.my_branch_id()
          AND brs.permission = 'edit'
      )
    )
  );

CREATE POLICY "companies: delete"
  ON public.companies FOR DELETE
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── contacts ──────────────────────────────────────────────────
CREATE POLICY "contacts: select"
  ON public.contacts FOR SELECT
  USING (
    tenant_id = auth.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'contacts')
  );

CREATE POLICY "contacts: insert"
  ON public.contacts FOR INSERT
  WITH CHECK (tenant_id = auth.my_tenant_id());

CREATE POLICY "contacts: update"
  ON public.contacts FOR UPDATE
  USING (tenant_id = auth.my_tenant_id() AND (auth.my_role() = 'admin_isv' OR branch_id = auth.my_branch_id()));

CREATE POLICY "contacts: delete"
  ON public.contacts FOR DELETE
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── pipeline_stages ───────────────────────────────────────────
CREATE POLICY "stages: own tenant"
  ON public.pipeline_stages FOR SELECT
  USING (tenant_id = auth.my_tenant_id());

CREATE POLICY "stages: admin manage"
  ON public.pipeline_stages FOR ALL
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── opportunities ─────────────────────────────────────────────
CREATE POLICY "opps: select"
  ON public.opportunities FOR SELECT
  USING (
    tenant_id = auth.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'opportunities')
  );

CREATE POLICY "opps: insert"
  ON public.opportunities FOR INSERT
  WITH CHECK (tenant_id = auth.my_tenant_id());

CREATE POLICY "opps: update"
  ON public.opportunities FOR UPDATE
  USING (tenant_id = auth.my_tenant_id() AND (auth.my_role() = 'admin_isv' OR branch_id = auth.my_branch_id()));

CREATE POLICY "opps: delete"
  ON public.opportunities FOR DELETE
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── products ──────────────────────────────────────────────────
CREATE POLICY "products: select"
  ON public.products FOR SELECT USING (tenant_id = auth.my_tenant_id());

CREATE POLICY "products: admin manage"
  ON public.products FOR ALL
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── projects ──────────────────────────────────────────────────
CREATE POLICY "projects: select"
  ON public.projects FOR SELECT
  USING (tenant_id = auth.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'projects'));

CREATE POLICY "projects: insert"
  ON public.projects FOR INSERT WITH CHECK (tenant_id = auth.my_tenant_id());

CREATE POLICY "projects: update"
  ON public.projects FOR UPDATE
  USING (tenant_id = auth.my_tenant_id() AND (auth.my_role() = 'admin_isv' OR branch_id = auth.my_branch_id()));

CREATE POLICY "projects: delete"
  ON public.projects FOR DELETE
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── contracts ─────────────────────────────────────────────────
CREATE POLICY "contracts: select"
  ON public.contracts FOR SELECT
  USING (tenant_id = auth.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'contracts'));

CREATE POLICY "contracts: insert"
  ON public.contracts FOR INSERT WITH CHECK (tenant_id = auth.my_tenant_id());

CREATE POLICY "contracts: update"
  ON public.contracts FOR UPDATE
  USING (tenant_id = auth.my_tenant_id() AND (auth.my_role() = 'admin_isv' OR branch_id = auth.my_branch_id()));

CREATE POLICY "contracts: delete"
  ON public.contracts FOR DELETE
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── payments ──────────────────────────────────────────────────
CREATE POLICY "payments: select"
  ON public.payments FOR SELECT
  USING (tenant_id = auth.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'payments'));

CREATE POLICY "payments: insert"
  ON public.payments FOR INSERT WITH CHECK (tenant_id = auth.my_tenant_id());

CREATE POLICY "payments: update"
  ON public.payments FOR UPDATE
  USING (tenant_id = auth.my_tenant_id() AND (auth.my_role() = 'admin_isv' OR branch_id = auth.my_branch_id()));

CREATE POLICY "payments: delete"
  ON public.payments FOR DELETE
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── actions ───────────────────────────────────────────────────
CREATE POLICY "actions: select"
  ON public.actions FOR SELECT
  USING (tenant_id = auth.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'actions'));

CREATE POLICY "actions: insert"
  ON public.actions FOR INSERT WITH CHECK (tenant_id = auth.my_tenant_id());

CREATE POLICY "actions: update"
  ON public.actions FOR UPDATE
  USING (
    tenant_id = auth.my_tenant_id()
    AND (auth.my_role() = 'admin_isv' OR branch_id = auth.my_branch_id() OR owner_id = auth.uid())
  );

CREATE POLICY "actions: delete"
  ON public.actions FOR DELETE
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── sellers ───────────────────────────────────────────────────
CREATE POLICY "sellers: select"
  ON public.sellers FOR SELECT
  USING (tenant_id = auth.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'sellers'));

CREATE POLICY "sellers: admin manage"
  ON public.sellers FOR ALL
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── branch_record_shares ──────────────────────────────────────
CREATE POLICY "shares: view own tenant"
  ON public.branch_record_shares FOR SELECT
  USING (tenant_id = auth.my_tenant_id());

CREATE POLICY "shares: admin manage"
  ON public.branch_record_shares FOR ALL
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── branch_table_visibility ───────────────────────────────────
CREATE POLICY "btv: view own tenant"
  ON public.branch_table_visibility FOR SELECT
  USING (tenant_id = auth.my_tenant_id());

CREATE POLICY "btv: admin manage"
  ON public.branch_table_visibility FOR ALL
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── form_layouts ──────────────────────────────────────────────
CREATE POLICY "form_layouts: view"
  ON public.form_layouts FOR SELECT USING (tenant_id = auth.my_tenant_id());

CREATE POLICY "form_layouts: admin manage"
  ON public.form_layouts FOR ALL
  USING (tenant_id = auth.my_tenant_id() AND auth.my_role() = 'admin_isv');

-- ── sidebar_config ────────────────────────────────────────────
-- Usuário vê config do próprio tenant (padrão) e a própria config pessoal
CREATE POLICY "sidebar: view"
  ON public.sidebar_config FOR SELECT
  USING (
    tenant_id = auth.my_tenant_id()
    AND (profile_id IS NULL OR profile_id = auth.uid())
  );

CREATE POLICY "sidebar: self upsert"
  ON public.sidebar_config FOR ALL
  USING (
    tenant_id = auth.my_tenant_id()
    AND (profile_id = auth.uid() OR (profile_id IS NULL AND auth.my_role() = 'admin_isv'))
  );

-- ============================================================
-- SUPER ADMIN: tabela de controle de tenants (fora de RLS pública)
-- Só acessível via service_role (painel administrativo interno)
-- ============================================================
CREATE TABLE public.super_admin_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,    -- 'create_tenant' | 'suspend' | 'delete'
  tenant_id   uuid,
  actor_email text,
  details     jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- Sem RLS: acessível apenas via service_role key (backend/admin panel)
