-- ============================================================
-- Schema Additions — Tarefas, Metas, Comissões, Documentos,
--                    Playbooks, Questionários
-- Execute APÓS o schema.sql principal
-- ============================================================

-- ── TASKS ────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id      uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id     uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  contract_id    uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  owner_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  titulo         text NOT NULL,
  descricao      text,
  tipo           text,
  status         text NOT NULL DEFAULT 'pendente',
  prioridade     text DEFAULT 'media',
  prazo          date,
  responsavel    text,
  concluida_em   timestamptz,
  entidade_tipo  text,
  entidade_id    text,
  entidade_nome  text,
  custom_fields  jsonb DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tasks(tenant_id);
CREATE INDEX ON public.tasks(branch_id);
CREATE INDEX ON public.tasks(company_id);
CREATE INDEX ON public.tasks(owner_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── GOALS ────────────────────────────────────────────────────
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
CREATE INDEX ON public.goals(branch_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── COMMISSION PERSONAS ───────────────────────────────────────
CREATE TABLE public.commission_personas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug       text NOT NULL,
  label      text NOT NULL,
  descricao  text,
  cor        text DEFAULT '#6366F1',
  ordem      int DEFAULT 0,
  ativo      boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);
CREATE INDEX ON public.commission_personas(tenant_id);

-- ── COMMISSION RULES ──────────────────────────────────────────
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
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── COMMISSION PAYMENTS ───────────────────────────────────────
CREATE TABLE public.commission_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id         uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  rule_id           uuid REFERENCES public.commission_rules(id) ON DELETE SET NULL,
  company_id        uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contract_id       uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  beneficiario_id   text,
  beneficiario_nome text,
  persona_slug      text,
  periodo_mes       int,
  periodo_ano       int,
  valor_bruto       numeric(14,2),
  valor_comissao    numeric(14,2),
  status            text NOT NULL DEFAULT 'pendente',
  data_pagamento    date,
  observacoes       text,
  custom_fields     jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.commission_payments(tenant_id, periodo_ano, periodo_mes);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── DOCUMENTS ─────────────────────────────────────────────────
CREATE TABLE public.documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  categoria     text,
  status        text NOT NULL DEFAULT 'rascunho',
  version       int DEFAULT 1,
  content       text,
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.documents(tenant_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.document_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  evento      text NOT NULL,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_nome   text,
  nota        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.document_logs(tenant_id, document_id);

-- ── PLAYBOOKS ─────────────────────────────────────────────────
CREATE TABLE public.playbooks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  titulo        text NOT NULL,
  descricao     text,
  status        text NOT NULL DEFAULT 'rascunho',
  steps         jsonb DEFAULT '[]',
  refs          jsonb DEFAULT '[]',
  resources     jsonb DEFAULT '[]',
  custom_fields jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.playbooks(tenant_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── QUESTIONNAIRE TEMPLATES ───────────────────────────────────
CREATE TABLE public.questionnaire_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id        uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  owner_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title            text NOT NULL,
  description      text,
  type             text,
  status           text NOT NULL DEFAULT 'rascunho',
  estrutura_secoes jsonb DEFAULT '{}',
  custom_fields    jsonb DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.questionnaire_templates(tenant_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.questionnaire_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── QUESTIONNAIRE SUBMISSIONS ─────────────────────────────────
CREATE TABLE public.questionnaire_submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id      uuid REFERENCES public.questionnaire_templates(id) ON DELETE SET NULL,
  company_id       uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id       uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  respondente_nome text,
  status           text NOT NULL DEFAULT 'rascunho',
  respostas        jsonb DEFAULT '{}',
  enviado_em       timestamptz,
  custom_fields    jsonb DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.questionnaire_submissions(tenant_id, template_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.questionnaire_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — novas tabelas
-- ============================================================

ALTER TABLE public.tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_personas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_submissions ENABLE ROW LEVEL SECURITY;

-- tasks
CREATE POLICY "tasks: select" ON public.tasks FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "tasks: insert" ON public.tasks FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "tasks: update" ON public.tasks FOR UPDATE USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR owner_id = auth.uid() OR branch_id = public.my_branch_id()));
CREATE POLICY "tasks: delete" ON public.tasks FOR DELETE USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR owner_id = auth.uid()));

-- goals
CREATE POLICY "goals: select" ON public.goals FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "goals: manage" ON public.goals FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- commission_personas
CREATE POLICY "personas: view"   ON public.commission_personas FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "personas: manage" ON public.commission_personas FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- commission_rules
CREATE POLICY "rules: view"   ON public.commission_rules FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "rules: manage" ON public.commission_rules FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- commission_payments
CREATE POLICY "com_payments: select" ON public.commission_payments FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "com_payments: manage" ON public.commission_payments FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- documents
CREATE POLICY "docs: select" ON public.documents FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "docs: insert" ON public.documents FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "docs: update" ON public.documents FOR UPDATE USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR owner_id = auth.uid()));
CREATE POLICY "docs: delete" ON public.documents FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- document_logs
CREATE POLICY "doc_logs: view"   ON public.document_logs FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "doc_logs: insert" ON public.document_logs FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

-- playbooks
CREATE POLICY "playbooks: select" ON public.playbooks FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "playbooks: insert" ON public.playbooks FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "playbooks: update" ON public.playbooks FOR UPDATE USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR owner_id = auth.uid()));
CREATE POLICY "playbooks: delete" ON public.playbooks FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- questionnaire_templates
CREATE POLICY "qtpl: select" ON public.questionnaire_templates FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "qtpl: insert" ON public.questionnaire_templates FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "qtpl: update" ON public.questionnaire_templates FOR UPDATE USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR owner_id = auth.uid()));
CREATE POLICY "qtpl: delete" ON public.questionnaire_templates FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- questionnaire_submissions
CREATE POLICY "qsub: select" ON public.questionnaire_submissions FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "qsub: insert" ON public.questionnaire_submissions FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "qsub: update" ON public.questionnaire_submissions FOR UPDATE USING (tenant_id = public.my_tenant_id());
CREATE POLICY "qsub: delete" ON public.questionnaire_submissions FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');
