-- ============================================================
-- TABELA BASE: oportunidades
-- Criada antes das migrations que fazem ALTER TABLE oportunidades.
-- Esta tabela é a versão original (em português) usada pelo app.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.oportunidades (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id      uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id      uuid        REFERENCES public.contacts(id) ON DELETE SET NULL,
  stage_id        uuid        REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  owner_id        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  titulo          text        NOT NULL,
  valor           numeric(14,2) DEFAULT 0,
  valor_total     numeric(14,2) NOT NULL DEFAULT 0,
  situacao        text        NOT NULL DEFAULT 'em_andamento',
  origem          text,
  prazo           date,
  responsavel     text,
  descricao       text,
  motivo_perda    text,
  fonte           text,
  rd_lead_id      text,
  playbook_id     uuid,
  custom_fields   jsonb       DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oportunidades_tenant  ON public.oportunidades (tenant_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_branch  ON public.oportunidades (branch_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_company ON public.oportunidades (company_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_stage   ON public.oportunidades (stage_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_owner   ON public.oportunidades (owner_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oportunidades: select" ON public.oportunidades
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "oportunidades: insert" ON public.oportunidades
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "oportunidades: update" ON public.oportunidades
  FOR UPDATE USING (tenant_id = public.my_tenant_id());
CREATE POLICY "oportunidades: delete" ON public.oportunidades
  FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- Tabela de ações/logs de oportunidade (usada pelas migrations de comissões)
CREATE TABLE IF NOT EXISTS public.acoes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  oportunidade_id uuid        REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  company_id      uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo            text,
  titulo          text        NOT NULL,
  descricao       text,
  data            date,
  duracao_min     int         DEFAULT 0,
  status          text        DEFAULT 'pendente',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acoes_tenant       ON public.acoes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_acoes_oportunidade ON public.acoes (oportunidade_id);

ALTER TABLE public.acoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acoes: view"   ON public.acoes FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "acoes: manage" ON public.acoes FOR ALL    USING (tenant_id = public.my_tenant_id());

-- Perfis legado (migrations antigas referenciam "perfis" não "profiles")
CREATE TABLE IF NOT EXISTS public.perfis (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'vendedor',
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_perfis_tenant ON public.perfis (tenant_id);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis: view"   ON public.perfis FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "perfis: manage" ON public.perfis FOR ALL    USING (tenant_id = public.my_tenant_id());
