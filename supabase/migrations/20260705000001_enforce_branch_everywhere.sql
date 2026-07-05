-- ═══════════════════════════════════════════════════════════════════════════
-- Regra arquitetural: TODOS os dados têm origem numa Filial.
-- 1. Trigger auto-preenche branch_id = my_branch_id() em qualquer INSERT sem filial
-- 2. RLS atualizada para usar can_see_branch_record em todas as tabelas operacionais
-- 3. audit_logs recebe branch_id
-- 4. pipeline_stages, questionnaire_templates, playbooks recebem branch_id
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Trigger function: auto-set branch_id no INSERT ────────────────────────
CREATE OR REPLACE FUNCTION public.set_branch_id_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.branch_id IS NULL THEN
    NEW.branch_id := public.my_branch_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Helper macro para aplicar o trigger a uma tabela
-- (executado inline para cada tabela)

-- ── 2. Tabelas que já têm branch_id — aplicar trigger ───────────────────────
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'companies','contacts','opportunities','products','projects','contracts',
    'payments','actions','sellers','goals','customer_health',
    'habilitacoes','tipos_acao','campanhas','parceiros',
    'perfis_acesso','equipes','indicadores','metas_kpi','documents'
  ]) LOOP
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS trg_set_branch_id ON public.%I;
      CREATE TRIGGER trg_set_branch_id
        BEFORE INSERT ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();
    $f$, t, t);
  END LOOP;
END $$;

-- ── 3. Adicionar branch_id às tabelas que ainda não têm ─────────────────────

-- audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch ON public.audit_logs (branch_id);
DROP TRIGGER IF EXISTS trg_set_branch_id ON public.audit_logs;
CREATE TRIGGER trg_set_branch_id
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();

-- pipeline_stages (funis de venda por filial)
ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_branch ON public.pipeline_stages (branch_id);
DROP TRIGGER IF EXISTS trg_set_branch_id ON public.pipeline_stages;
CREATE TRIGGER trg_set_branch_id
  BEFORE INSERT ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();

-- tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_branch ON public.tasks (branch_id);
DROP TRIGGER IF EXISTS trg_set_branch_id ON public.tasks;
CREATE TRIGGER trg_set_branch_id
  BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();

-- playbooks
ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_playbooks_branch ON public.playbooks (branch_id);
DROP TRIGGER IF EXISTS trg_set_branch_id ON public.playbooks;
CREATE TRIGGER trg_set_branch_id
  BEFORE INSERT ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();

-- questionnaire_templates
ALTER TABLE public.questionnaire_templates
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_branch ON public.questionnaire_templates (branch_id);
DROP TRIGGER IF EXISTS trg_set_branch_id ON public.questionnaire_templates;
CREATE TRIGGER trg_set_branch_id
  BEFORE INSERT ON public.questionnaire_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();

-- commission_rules
ALTER TABLE public.commission_rules
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_commission_rules_branch ON public.commission_rules (branch_id);
DROP TRIGGER IF EXISTS trg_set_branch_id ON public.commission_rules;
CREATE TRIGGER trg_set_branch_id
  BEFORE INSERT ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();

-- ── 4. Backfill: registros sem branch_id recebem a branch Matriz do tenant ──
DO $$ DECLARE t text; mid uuid; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'companies','contacts','opportunities','products','projects','contracts',
    'payments','actions','sellers','goals','customer_health',
    'habilitacoes','tipos_acao','campanhas','parceiros',
    'perfis_acesso','equipes','indicadores','metas_kpi','documents',
    'pipeline_stages','tasks','playbooks','questionnaire_templates','commission_rules'
  ]) LOOP
    -- Para cada tenant, usa a branch Matriz (ordem alfabética como fallback)
    EXECUTE format($f$
      UPDATE public.%I t
      SET branch_id = (
        SELECT id FROM public.tenant_branches
        WHERE tenant_id = t.tenant_id
        ORDER BY (name ILIKE '%%matriz%%') DESC, created_at ASC
        LIMIT 1
      )
      WHERE branch_id IS NULL
    $f$, t);
  END LOOP;
END $$;

-- audit_logs: backfill separado (sem tenant_id em todos, usa usuario_id)
UPDATE public.audit_logs l
SET branch_id = (
  SELECT p.branch_id FROM public.profiles p WHERE p.id = l.usuario_id LIMIT 1
)
WHERE l.branch_id IS NULL AND l.usuario_id IS NOT NULL;

-- ── 5. RLS: atualizar todas as tabelas operacionais ──────────────────────────

-- products
DROP POLICY IF EXISTS "products: view"   ON public.products;
DROP POLICY IF EXISTS "products: manage" ON public.products;
CREATE POLICY "products: view"   ON public.products FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'products'));
CREATE POLICY "products: manage" ON public.products FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- pipeline_stages
DROP POLICY IF EXISTS "stages: view"   ON public.pipeline_stages;
DROP POLICY IF EXISTS "stages: manage" ON public.pipeline_stages;
CREATE POLICY "stages: view"   ON public.pipeline_stages FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'pipeline_stages'));
CREATE POLICY "stages: manage" ON public.pipeline_stages FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- goals
DROP POLICY IF EXISTS "goals: view"   ON public.goals;
DROP POLICY IF EXISTS "goals: manage" ON public.goals;
CREATE POLICY "goals: view"   ON public.goals FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'goals'));
CREATE POLICY "goals: manage" ON public.goals FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- customer_health
DROP POLICY IF EXISTS "customer_health: view"   ON public.customer_health;
DROP POLICY IF EXISTS "customer_health: manage" ON public.customer_health;
CREATE POLICY "customer_health: view"   ON public.customer_health FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'customer_health'));
CREATE POLICY "customer_health: manage" ON public.customer_health FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- habilitacoes
DROP POLICY IF EXISTS "habilitacoes: view"   ON public.habilitacoes;
DROP POLICY IF EXISTS "habilitacoes: manage" ON public.habilitacoes;
CREATE POLICY "habilitacoes: view"   ON public.habilitacoes FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'habilitacoes'));
CREATE POLICY "habilitacoes: manage" ON public.habilitacoes FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- tipos_acao
DROP POLICY IF EXISTS "tipos_acao: view"   ON public.tipos_acao;
DROP POLICY IF EXISTS "tipos_acao: manage" ON public.tipos_acao;
CREATE POLICY "tipos_acao: view"   ON public.tipos_acao FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'tipos_acao'));
CREATE POLICY "tipos_acao: manage" ON public.tipos_acao FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- campanhas
DROP POLICY IF EXISTS "campanhas: view"   ON public.campanhas;
DROP POLICY IF EXISTS "campanhas: manage" ON public.campanhas;
CREATE POLICY "campanhas: view"   ON public.campanhas FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'campanhas'));
CREATE POLICY "campanhas: manage" ON public.campanhas FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- parceiros
DROP POLICY IF EXISTS "parceiros: view"   ON public.parceiros;
DROP POLICY IF EXISTS "parceiros: manage" ON public.parceiros;
CREATE POLICY "parceiros: view"   ON public.parceiros FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'parceiros'));
CREATE POLICY "parceiros: manage" ON public.parceiros FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- perfis_acesso
DROP POLICY IF EXISTS "perfis_acesso: view"   ON public.perfis_acesso;
DROP POLICY IF EXISTS "perfis_acesso: manage" ON public.perfis_acesso;
CREATE POLICY "perfis_acesso: view"   ON public.perfis_acesso FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'perfis_acesso'));
CREATE POLICY "perfis_acesso: manage" ON public.perfis_acesso FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- equipes
DROP POLICY IF EXISTS "equipes: view"   ON public.equipes;
DROP POLICY IF EXISTS "equipes: manage" ON public.equipes;
CREATE POLICY "equipes: view"   ON public.equipes FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'equipes'));
CREATE POLICY "equipes: manage" ON public.equipes FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- indicadores
DROP POLICY IF EXISTS "indicadores: view"   ON public.indicadores;
DROP POLICY IF EXISTS "indicadores: manage" ON public.indicadores;
CREATE POLICY "indicadores: view"   ON public.indicadores FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'indicadores'));
CREATE POLICY "indicadores: manage" ON public.indicadores FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- metas_kpi
DROP POLICY IF EXISTS "metas_kpi: view"   ON public.metas_kpi;
DROP POLICY IF EXISTS "metas_kpi: manage" ON public.metas_kpi;
CREATE POLICY "metas_kpi: view"   ON public.metas_kpi FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'metas_kpi'));
CREATE POLICY "metas_kpi: manage" ON public.metas_kpi FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- tasks (enable RLS se ainda não estiver)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks: view"   ON public.tasks;
DROP POLICY IF EXISTS "tasks: manage" ON public.tasks;
CREATE POLICY "tasks: view"   ON public.tasks FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'tasks'));
CREATE POLICY "tasks: manage" ON public.tasks FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id() OR assigned_to = auth.uid() OR created_by = auth.uid()));

-- playbooks
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "playbooks: view"   ON public.playbooks;
DROP POLICY IF EXISTS "playbooks: manage" ON public.playbooks;
CREATE POLICY "playbooks: view"   ON public.playbooks FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'playbooks'));
CREATE POLICY "playbooks: manage" ON public.playbooks FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- questionnaire_templates
ALTER TABLE public.questionnaire_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "questionnaire_templates: view"   ON public.questionnaire_templates;
DROP POLICY IF EXISTS "questionnaire_templates: manage" ON public.questionnaire_templates;
CREATE POLICY "questionnaire_templates: view"   ON public.questionnaire_templates FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'questionnaire_templates'));
CREATE POLICY "questionnaire_templates: manage" ON public.questionnaire_templates FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- commission_rules
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_rules: view"   ON public.commission_rules;
DROP POLICY IF EXISTS "commission_rules: manage" ON public.commission_rules;
CREATE POLICY "commission_rules: view"   ON public.commission_rules FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'commission_rules'));
CREATE POLICY "commission_rules: manage" ON public.commission_rules FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents: view"   ON public.documents;
DROP POLICY IF EXISTS "documents: manage" ON public.documents;
CREATE POLICY "documents: view"   ON public.documents FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'documents'));
CREATE POLICY "documents: manage" ON public.documents FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- audit_logs: RLS por branch
DROP POLICY IF EXISTS "audit_logs: view"   ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs: insert" ON public.audit_logs;
CREATE POLICY "audit_logs: view"   ON public.audit_logs FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'audit_logs'));
CREATE POLICY "audit_logs: insert" ON public.audit_logs FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

-- ── 6. my_branch_id: fallback para Matriz se não houver filial no perfil ─────
CREATE OR REPLACE FUNCTION public.my_branch_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT branch_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT id FROM public.tenant_branches
     WHERE tenant_id = public.my_tenant_id()
     ORDER BY (name ILIKE '%matriz%') DESC, created_at ASC
     LIMIT 1)
  )
$$;

-- ── 7. Remover bypass admin_isv do can_see_branch_record ─────────────────────
-- Admin_isv vê os dados da filial ativa no seletor, igual a qualquer outro usuário.
-- Para ver outra filial ele troca no seletor ou configura uma regra de compartilhamento.
CREATE OR REPLACE FUNCTION public.can_see_branch_record(rec_branch_id uuid, rec_id uuid, rec_table text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    rec_branch_id IS NULL
    OR rec_branch_id = public.my_branch_id()
    OR rec_branch_id = ANY(public.my_branch_ids())
    OR EXISTS (
      SELECT 1 FROM public.branch_table_visibility btv
      WHERE btv.tenant_id        = public.my_tenant_id()
        AND btv.source_branch_id = rec_branch_id
        AND btv.target_branch_id = public.my_branch_id()
        AND btv.entity_table     = rec_table
        AND btv.can_view         = true
    )
$$;
