-- Adiciona colunas que useCommissions.ruleToRow envia mas a tabela não tinha
ALTER TABLE public.commission_rules
  ADD COLUMN IF NOT EXISTS branch_id    uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS recorrencia  text,
  ADD COLUMN IF NOT EXISTS config       jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}';

-- Corrige RLS: usa my_tenant_id() em vez de auth.uid()
DROP POLICY IF EXISTS rls_commission_rules_select ON public.commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_insert ON public.commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_update ON public.commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_delete ON public.commission_rules;

CREATE POLICY rls_commission_rules_select ON public.commission_rules
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY rls_commission_rules_insert ON public.commission_rules
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY rls_commission_rules_update ON public.commission_rules
  FOR UPDATE USING (tenant_id = public.my_tenant_id());
CREATE POLICY rls_commission_rules_delete ON public.commission_rules
  FOR DELETE USING (tenant_id = public.my_tenant_id());
