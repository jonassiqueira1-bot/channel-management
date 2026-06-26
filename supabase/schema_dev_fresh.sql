-- ============================================================
-- BOOSTLY — Schema completo para instalação nova (dev/staging)
-- Execute este arquivo apenas em bancos NOVOS/VAZIOS.
-- Gerado em 2026-06-26 — representa o estado atual de produção.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── FUNÇÕES AUXILIARES ───────────────────────────────────────────────────────
-- Stubs criados antes das tabelas para que as policies possam referenciar as
-- funções. Serão substituídos com CREATE OR REPLACE após profiles existir.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid; $$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text; $$;

CREATE OR REPLACE FUNCTION public.my_branch_id()
RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid; $$;

-- ─── TENANTS ─────────────────────────────────────────────────────────────────

CREATE TABLE public.tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  plan          text NOT NULL DEFAULT 'trial',
  status        text NOT NULL DEFAULT 'active',
  logo_url      text,
  primary_color text DEFAULT '#6366f1',
  domain        text,
  settings      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant: own" ON public.tenants FOR SELECT USING (id = public.my_tenant_id());
CREATE POLICY "tenant: admin update" ON public.tenants FOR UPDATE USING (id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── BRANCHES ────────────────────────────────────────────────────────────────

CREATE TABLE public.tenant_branches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  code       text,
  region     text,
  address    text,
  status     text NOT NULL DEFAULT 'active',
  settings   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tenant_branches(tenant_id);
ALTER TABLE public.tenant_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches: view"   ON public.tenant_branches FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "branches: manage" ON public.tenant_branches FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── PROFILES ────────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id            uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id            uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  role                 text NOT NULL DEFAULT 'vendedor',
  nome                 text NOT NULL,
  email                text NOT NULL,
  phone                text,
  cargo                text,
  avatar_url           text,
  status               text NOT NULL DEFAULT 'active',
  settings             jsonb NOT NULL DEFAULT '{}',
  last_seen            timestamptz,
  -- campos extras
  perfis_acesso_ids    jsonb DEFAULT '[]',
  regras_comissao_ids  jsonb DEFAULT '[]',
  senioridade          text,
  tipo_recurso         text,
  billing_rate         numeric,
  custo_hora           numeric,
  horas_semana         int DEFAULT 40,
  habilidades          jsonb DEFAULT '[]',
  linkedin_url         text,
  whatsapp             text,
  branch_ids           jsonb DEFAULT '[]',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.profiles(tenant_id);
CREATE INDEX ON public.profiles(branch_id);

-- ─── FUNÇÕES QUE DEPENDEM DE profiles ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_branch_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: admin all"    ON public.profiles FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');
CREATE POLICY "profiles: self"         ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: admin manage" ON public.profiles FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');
CREATE POLICY "profiles: self update"  ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ─── COMPANIES ───────────────────────────────────────────────────────────────

CREATE TABLE public.companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  razao_social  text NOT NULL,
  nome_fantasia text,
  cnpj          text,
  email         text,
  phone         text,
  website       text,
  segment       text,
  tipo          text,
  status        text NOT NULL DEFAULT 'ativo',
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  address       jsonb DEFAULT '{}',
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.companies(tenant_id);
CREATE INDEX ON public.companies(branch_id);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies: select" ON public.companies FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "companies: insert" ON public.companies FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "companies: update" ON public.companies FOR UPDATE USING (tenant_id = public.my_tenant_id());
CREATE POLICY "companies: delete" ON public.companies FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── CONTACTS ────────────────────────────────────────────────────────────────

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
  notes         text,
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.contacts(tenant_id);
CREATE INDEX ON public.contacts(branch_id);
CREATE INDEX ON public.contacts(company_id);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts: select" ON public.contacts FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "contacts: insert" ON public.contacts FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "contacts: update" ON public.contacts FOR UPDATE USING (tenant_id = public.my_tenant_id());
CREATE POLICY "contacts: delete" ON public.contacts FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── PIPELINE ────────────────────────────────────────────────────────────────

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
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stages: view"   ON public.pipeline_stages FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "stages: manage" ON public.pipeline_stages FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── OPORTUNIDADES ───────────────────────────────────────────────────────────

CREATE TABLE public.oportunidades (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id           uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id          uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id          uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  primary_contact_id  uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  stage_id            uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  owner_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  playbook_id         uuid,
  titulo              text NOT NULL,
  valor               numeric(14,2) DEFAULT 0,
  valor_cdu           numeric(14,2) NOT NULL DEFAULT 0,
  valor_sms           numeric(14,2) NOT NULL DEFAULT 0,
  valor_servico       numeric(14,2) NOT NULL DEFAULT 0,
  valor_desconto      numeric(14,2) NOT NULL DEFAULT 0,
  valor_total         numeric(14,2) NOT NULL DEFAULT 0,
  situacao            text NOT NULL DEFAULT 'em_andamento',
  origem              text,
  fonte               text,
  rd_lead_id          text,
  prazo               date,
  responsavel         text,
  descricao           text,
  motivo_perda        text,
  custom_fields       jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_desconto_max CHECK (valor_desconto <= (valor_cdu + valor_sms + valor_servico))
);
CREATE INDEX ON public.oportunidades(tenant_id);
CREATE INDEX ON public.oportunidades(branch_id);
CREATE INDEX ON public.oportunidades(company_id);
CREATE INDEX ON public.oportunidades(stage_id);
CREATE INDEX ON public.oportunidades(owner_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.oportunidades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oportunidades: select" ON public.oportunidades FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "oportunidades: insert" ON public.oportunidades FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "oportunidades: update" ON public.oportunidades FOR UPDATE USING (tenant_id = public.my_tenant_id());
CREATE POLICY "oportunidades: delete" ON public.oportunidades FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────

CREATE TABLE public.products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  descricao     text,
  preco         numeric(14,2) DEFAULT 0,
  status        text NOT NULL DEFAULT 'ativo',
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.products(tenant_id);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products: view"   ON public.products FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "products: manage" ON public.products FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────

CREATE TABLE public.payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  descricao       text NOT NULL,
  valor           numeric(14,2) NOT NULL DEFAULT 0,
  vencimento      date,
  status          text NOT NULL DEFAULT 'pendente',
  pago_em         date,
  metodo          text,
  observacoes     text,
  custom_fields   jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payments(tenant_id);
CREATE INDEX ON public.payments(oportunidade_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments: select" ON public.payments FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "payments: manage" ON public.payments FOR ALL    USING (tenant_id = public.my_tenant_id());

-- ─── PROJECTS ────────────────────────────────────────────────────────────────

CREATE TABLE public.projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome            text NOT NULL,
  descricao       text,
  status          text NOT NULL DEFAULT 'ativo',
  data_inicio     date,
  data_fim        date,
  custom_fields   jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.projects(tenant_id);
CREATE INDEX ON public.projects(oportunidade_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects: select" ON public.projects FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "projects: manage" ON public.projects FOR ALL    USING (tenant_id = public.my_tenant_id());

-- ─── TASKS ───────────────────────────────────────────────────────────────────

CREATE TABLE public.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  owner_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  titulo          text NOT NULL,
  descricao       text,
  tipo            text,
  status          text NOT NULL DEFAULT 'pendente',
  prioridade      text DEFAULT 'media',
  prazo           date,
  concluida_em    timestamptz,
  custom_fields   jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tasks(tenant_id);
CREATE INDEX ON public.tasks(owner_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks: select" ON public.tasks FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "tasks: manage" ON public.tasks FOR ALL    USING (tenant_id = public.my_tenant_id());

-- ─── ACOES ───────────────────────────────────────────────────────────────────

CREATE TABLE public.acoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo            text,
  titulo          text NOT NULL,
  descricao       text,
  data            date,
  duracao_min     int DEFAULT 0,
  status          text DEFAULT 'pendente',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.acoes(tenant_id);
CREATE INDEX ON public.acoes(oportunidade_id);
ALTER TABLE public.acoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acoes: view"   ON public.acoes FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "acoes: manage" ON public.acoes FOR ALL    USING (tenant_id = public.my_tenant_id());

-- ─── GOALS ───────────────────────────────────────────────────────────────────

CREATE TABLE public.goals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id           uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  tipo_alvo           text NOT NULL,
  alvo_id             text,
  alvo_nome           text,
  alvo_contexto       text,
  tipo_meta           text NOT NULL DEFAULT 'valor',
  subtipo_operacional text,
  valor_sufixo        text,
  periodo_mes         int NOT NULL,
  periodo_ano         int NOT NULL,
  valor_planejado     numeric(14,2),
  valor_atual         numeric(14,2) DEFAULT 0,
  status              text NOT NULL DEFAULT 'ativa',
  custom_fields       jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.goals(tenant_id, periodo_ano, periodo_mes);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals: view"   ON public.goals FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "goals: manage" ON public.goals FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── COMMISSION RULES ────────────────────────────────────────────────────────

CREATE TABLE public.commission_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  nome          text NOT NULL,
  tipo_calculo  text NOT NULL,
  recorrencia   text,
  status        text NOT NULL DEFAULT 'ativa',
  vigencia_ini  date,
  vigencia_fim  date,
  config        jsonb NOT NULL DEFAULT '{}',
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.commission_rules(tenant_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules: view"   ON public.commission_rules FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "rules: manage" ON public.commission_rules FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── COMMISSION PAYMENTS ─────────────────────────────────────────────────────

CREATE TABLE public.commission_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  rule_id         uuid REFERENCES public.commission_rules(id) ON DELETE SET NULL,
  oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  beneficiario    text NOT NULL,
  periodo         text NOT NULL,
  valor           numeric(14,2) NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pendente',
  pago_em         date,
  obs             text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.commission_payments(tenant_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.commission_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "com_payments: select" ON public.commission_payments FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "com_payments: manage" ON public.commission_payments FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── PLAYBOOKS ────────────────────────────────────────────────────────────────

CREATE TABLE public.playbooks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  descricao     text,
  status        text NOT NULL DEFAULT 'ativo',
  etapas        jsonb DEFAULT '[]',
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.playbooks(tenant_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.playbooks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "playbooks: view"   ON public.playbooks FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "playbooks: manage" ON public.playbooks FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── QUESTIONNAIRE ───────────────────────────────────────────────────────────

CREATE TABLE public.questionnaire_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  descricao     text,
  status        text NOT NULL DEFAULT 'ativo',
  fields        jsonb DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.questionnaire_templates(tenant_id);
ALTER TABLE public.questionnaire_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qt: view"   ON public.questionnaire_templates FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "qt: manage" ON public.questionnaire_templates FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.questionnaire_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id   uuid REFERENCES public.questionnaire_templates(id) ON DELETE SET NULL,
  company_id    uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  respostas     jsonb DEFAULT '{}',
  status        text DEFAULT 'rascunho',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.questionnaire_submissions(tenant_id);
ALTER TABLE public.questionnaire_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qsub: view"   ON public.questionnaire_submissions FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "qsub: manage" ON public.questionnaire_submissions FOR ALL    USING (tenant_id = public.my_tenant_id());
CREATE POLICY "qsub: update" ON public.questionnaire_submissions FOR UPDATE USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR created_by = auth.uid()));

-- ─── CONTRATOS ───────────────────────────────────────────────────────────────

CREATE TABLE public.contracts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  company_id      uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  numero          text,
  titulo          text NOT NULL,
  status          text NOT NULL DEFAULT 'ativo',
  data_inicio     date,
  data_fim        date,
  valor           numeric(14,2) DEFAULT 0,
  descricao       text,
  custom_fields   jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.contracts(tenant_id);
CREATE INDEX ON public.contracts(oportunidade_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts: select" ON public.contracts FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "contracts: manage" ON public.contracts FOR ALL    USING (tenant_id = public.my_tenant_id());

-- ─── INTEGRACOES ─────────────────────────────────────────────────────────────

CREATE TABLE public.integracoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider     text NOT NULL,
  credentials  jsonb NOT NULL DEFAULT '{}',
  config       jsonb NOT NULL DEFAULT '{}',
  status       text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive','error')),
  last_sync_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);
CREATE INDEX ON public.integracoes(tenant_id);
ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integracoes: view"   ON public.integracoes FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "integracoes: manage" ON public.integracoes FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── RD LEADS QUEUE ──────────────────────────────────────────────────────────

CREATE TABLE public.rd_leads_queue (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  payload    jsonb NOT NULL DEFAULT '{}',
  processed  boolean NOT NULL DEFAULT false,
  opp_id     uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.rd_leads_queue(tenant_id);
CREATE INDEX ON public.rd_leads_queue(processed);
ALTER TABLE public.rd_leads_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rd_leads_queue: view" ON public.rd_leads_queue FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── OPORTUNIDADE MEMBROS ─────────────────────────────────────────────────────

CREATE TABLE public.oportunidade_membros (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  oportunidade_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  papel           text NOT NULL DEFAULT 'vendedor',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.oportunidade_membros(tenant_id);
CREATE INDEX ON public.oportunidade_membros(oportunidade_id);
ALTER TABLE public.oportunidade_membros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oportunidade_membros: view"   ON public.oportunidade_membros FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "oportunidade_membros: manage" ON public.oportunidade_membros FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── MÓDULOS DE CONFIGURAÇÕES (do missing_modules_final) ─────────────────────

CREATE TABLE public.audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  timestamp    timestamptz NOT NULL DEFAULT now(),
  usuario_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  usuario_nome text,
  acao         text        NOT NULL,
  entidade     text        NOT NULL,
  entidade_id  text,
  descricao    text,
  antes        jsonb,
  depois       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.audit_logs(tenant_id);
CREATE INDEX ON public.audit_logs(entidade);
CREATE INDEX ON public.audit_logs(timestamp DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs: view"   ON public.audit_logs FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "audit_logs: insert" ON public.audit_logs FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE TABLE public.customer_health (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id      uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name    text,
  company_city    text,
  company_uf      text,
  csm             text,
  laer_stage      text,
  touch_model     text,
  health_score    int         DEFAULT 0,
  renewal_date    date,
  notes           text,
  action_plans    jsonb       DEFAULT '[]',
  checkins        jsonb       DEFAULT '[]',
  attachments     jsonb       DEFAULT '[]',
  contract_id     uuid        REFERENCES public.contracts(id) ON DELETE SET NULL,
  contract_numero text,
  criado_em       date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.customer_health(tenant_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customer_health FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.customer_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_health: view"   ON public.customer_health FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "customer_health: manage" ON public.customer_health FOR ALL    USING (tenant_id = public.my_tenant_id());

CREATE TABLE public.fechamentos_horas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id    uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  periodo      text        NOT NULL,
  user_id      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name    text        NOT NULL,
  status       text        NOT NULL DEFAULT 'aberto',
  log_ids      jsonb       DEFAULT '[]',
  horas_total  numeric     DEFAULT 0,
  enviado_em   date,
  aprovado_em  date,
  rejeitado_em date,
  obs          text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, periodo, user_name)
);
CREATE INDEX ON public.fechamentos_horas(tenant_id, periodo);
ALTER TABLE public.fechamentos_horas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fechamentos_horas: view"   ON public.fechamentos_horas FOR SELECT USING (tenant_id = public.my_tenant_id() AND (user_id = auth.uid() OR public.my_role() = 'admin_isv'));
CREATE POLICY "fechamentos_horas: manage" ON public.fechamentos_horas FOR ALL    USING (tenant_id = public.my_tenant_id() AND (user_id = auth.uid() OR public.my_role() = 'admin_isv'));

CREATE TABLE public.commission_approvals (
  id                uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid      NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id         uuid      REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  periodo           text      NOT NULL,
  beneficiario_nome text      NOT NULL,
  status            text      NOT NULL DEFAULT 'aberto',
  total_valor       numeric   DEFAULT 0,
  payment_ids       jsonb     DEFAULT '[]',
  enviado_em        date,
  aprovado_em       date,
  rejeitado_em      date,
  obs               text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, periodo, beneficiario_nome)
);
CREATE INDEX ON public.commission_approvals(tenant_id, periodo);
ALTER TABLE public.commission_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_approvals: view"   ON public.commission_approvals FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "commission_approvals: manage" ON public.commission_approvals FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.habilitacoes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id  uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  nome       text        NOT NULL,
  situacao   text        NOT NULL DEFAULT 'ativo',
  produto_id uuid        REFERENCES public.products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.habilitacoes(tenant_id);
ALTER TABLE public.habilitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habilitacoes: view"   ON public.habilitacoes FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "habilitacoes: manage" ON public.habilitacoes FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.tipos_acao (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label      text        NOT NULL,
  slug       text,
  icon       text,
  color      text,
  bg         text,
  text_color text,
  criado_em  date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX ON public.tipos_acao(tenant_id);
ALTER TABLE public.tipos_acao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tipos_acao: view"   ON public.tipos_acao FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "tipos_acao: manage" ON public.tipos_acao FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.campanhas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  nome          text        NOT NULL,
  tipo          text,
  status        text        DEFAULT 'rascunho',
  inicio        date,
  fim           date,
  objetivo      text,
  meta          numeric     DEFAULT 0,
  descricao     text,
  produtos      jsonb       DEFAULT '[]',
  participantes jsonb       DEFAULT '[]',
  pontua_metas  boolean     DEFAULT false,
  extra         jsonb       DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.campanhas(tenant_id);
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campanhas: view"   ON public.campanhas FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "campanhas: manage" ON public.campanhas FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.parceiros (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome          text        NOT NULL,
  classificacao text        DEFAULT 'franquia',
  tipo_parceiro text,
  franquia_id   uuid        REFERENCES public.parceiros(id) ON DELETE SET NULL,
  codigo        text,
  cnpj          text,
  email         text,
  telefone      text,
  responsavel   text,
  cidade        text,
  uf            text,
  status        text        DEFAULT 'ativo',
  extra         jsonb       DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.parceiros(tenant_id);
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parceiros: view"   ON public.parceiros FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "parceiros: manage" ON public.parceiros FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.perfis_acesso (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug        text,
  nome        text        NOT NULL,
  nativo      boolean     DEFAULT false,
  cor         text,
  icon        text,
  descricao   text,
  franquia_ids jsonb      DEFAULT '[]',
  permissions jsonb       DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX ON public.perfis_acesso(tenant_id);
ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis_acesso: view"   ON public.perfis_acesso FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "perfis_acesso: manage" ON public.perfis_acesso FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.equipes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id  uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  nome       text        NOT NULL,
  descricao  text,
  lider_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  membro_ids jsonb       DEFAULT '[]',
  cor        text        DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.equipes(tenant_id);
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipes: view"   ON public.equipes FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "equipes: manage" ON public.equipes FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.indicadores (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  descricao  text,
  unidade    text,
  formula    text,
  categoria  text,
  status     text        DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.indicadores(tenant_id);
ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "indicadores: view"   ON public.indicadores FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "indicadores: manage" ON public.indicadores FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.metas_kpi (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  indicador_id uuid        REFERENCES public.indicadores(id) ON DELETE SET NULL,
  nome         text        NOT NULL,
  alvo         numeric,
  periodo_mes  int,
  periodo_ano  int,
  alvo_tipo    text,
  alvo_id      text,
  status       text        DEFAULT 'ativa',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.metas_kpi(tenant_id);
ALTER TABLE public.metas_kpi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metas_kpi: view"   ON public.metas_kpi FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "metas_kpi: manage" ON public.metas_kpi FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

CREATE TABLE public.compartilhamento_regras (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  descricao   text,
  filial_ids  jsonb       NOT NULL DEFAULT '[]',
  modulos     jsonb       NOT NULL DEFAULT '[]',
  permissao   text        NOT NULL DEFAULT 'leitura' CHECK (permissao IN ('leitura','leitura_escrita')),
  acesso      text        NOT NULL DEFAULT 'todos' CHECK (acesso IN ('todos','perfis','usuarios')),
  perfil_ids  jsonb       DEFAULT '[]',
  usuario_ids jsonb       DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.compartilhamento_regras(tenant_id);
ALTER TABLE public.compartilhamento_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compartilhamento: view"   ON public.compartilhamento_regras FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "compartilhamento: manage" ON public.compartilhamento_regras FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── STORAGE ──────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "documents storage: select" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "documents storage: insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "documents storage: delete" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "avatars storage: select"   ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars storage: insert"   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
