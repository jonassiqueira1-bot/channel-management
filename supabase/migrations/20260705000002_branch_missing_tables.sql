-- ═══════════════════════════════════════════════════════════════════════════
-- Adiciona branch_id às tabelas que ficaram sem isolamento de filial:
-- alert_rules, partner_maturity_params, form_layouts
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. alert_rules ───────────────────────────────────────────────────────────
ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

UPDATE public.alert_rules ar
SET branch_id = (
  SELECT id FROM public.tenant_branches
  WHERE tenant_id = ar.tenant_id
  ORDER BY (name ILIKE '%matriz%') DESC, created_at ASC
  LIMIT 1
)
WHERE branch_id IS NULL;

DROP TRIGGER IF EXISTS trg_branch_alert_rules ON public.alert_rules;
CREATE TRIGGER trg_branch_alert_rules
  BEFORE INSERT ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alert_rules: view"   ON public.alert_rules;
DROP POLICY IF EXISTS "alert_rules: manage" ON public.alert_rules;
CREATE POLICY "alert_rules: view"   ON public.alert_rules FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'alert_rules'));
CREATE POLICY "alert_rules: manage" ON public.alert_rules FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- ── 2. partner_maturity_params ───────────────────────────────────────────────
ALTER TABLE public.partner_maturity_params
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

UPDATE public.partner_maturity_params pm
SET branch_id = (
  SELECT id FROM public.tenant_branches
  WHERE tenant_id = pm.tenant_id
  ORDER BY (name ILIKE '%matriz%') DESC, created_at ASC
  LIMIT 1
)
WHERE branch_id IS NULL;

DROP TRIGGER IF EXISTS trg_branch_partner_maturity ON public.partner_maturity_params;
CREATE TRIGGER trg_branch_partner_maturity
  BEFORE INSERT ON public.partner_maturity_params
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();

ALTER TABLE public.partner_maturity_params ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maturity: view"   ON public.partner_maturity_params;
DROP POLICY IF EXISTS "maturity: manage" ON public.partner_maturity_params;
CREATE POLICY "maturity: view"   ON public.partner_maturity_params FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'partner_maturity_params'));
CREATE POLICY "maturity: manage" ON public.partner_maturity_params FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- ── 3. form_layouts (Funis de venda) ─────────────────────────────────────────
ALTER TABLE public.form_layouts
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

UPDATE public.form_layouts fl
SET branch_id = (
  SELECT id FROM public.tenant_branches
  WHERE tenant_id = fl.tenant_id
  ORDER BY (name ILIKE '%matriz%') DESC, created_at ASC
  LIMIT 1
)
WHERE branch_id IS NULL;

DROP TRIGGER IF EXISTS trg_branch_form_layouts ON public.form_layouts;
CREATE TRIGGER trg_branch_form_layouts
  BEFORE INSERT ON public.form_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_id_on_insert();

ALTER TABLE public.form_layouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "form_layouts: view"   ON public.form_layouts;
DROP POLICY IF EXISTS "form_layouts: manage" ON public.form_layouts;
CREATE POLICY "form_layouts: view"   ON public.form_layouts FOR SELECT USING (tenant_id = public.my_tenant_id() AND public.can_see_branch_record(branch_id, id, 'form_layouts'));
CREATE POLICY "form_layouts: manage" ON public.form_layouts FOR ALL    USING (tenant_id = public.my_tenant_id() AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id()));

-- ── 4. Garantir branch_id em tipos_acao / campanhas (caso não existam) ───────
ALTER TABLE public.tipos_acao
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

ALTER TABLE public.campanhas
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

UPDATE public.tipos_acao ta
SET branch_id = (
  SELECT id FROM public.tenant_branches
  WHERE tenant_id = ta.tenant_id
  ORDER BY (name ILIKE '%matriz%') DESC, created_at ASC
  LIMIT 1
)
WHERE branch_id IS NULL;

UPDATE public.campanhas ca
SET branch_id = (
  SELECT id FROM public.tenant_branches
  WHERE tenant_id = ca.tenant_id
  ORDER BY (name ILIKE '%matriz%') DESC, created_at ASC
  LIMIT 1
)
WHERE branch_id IS NULL;
