-- commission_payments, commission_rules e commission_approvals tinham policies
-- "ALL ... USING (tenant_id = my_tenant_id())" sem checagem de papel, coexistindo
-- com policies mais restritas (admin_isv / dono do registro). Como policies
-- permissivas são combinadas com OR, as antigas anulavam as restrições das
-- novas: qualquer membro do tenant conseguia inserir/editar/apagar (soft)
-- pagamentos, regras e aprovações de comissão de qualquer pessoa via API
-- direta, mesmo sem nenhuma tela expor essa ação.

DROP POLICY IF EXISTS "commission_payments_tenant" ON public.commission_payments;
DROP POLICY IF EXISTS "commission_rules_tenant" ON public.commission_rules;

-- commission_approvals não tinha nenhuma policy de escrita restrita — a única
-- era essa aberta. Substitui por admin_isv apenas, igual ao padrão já usado em
-- commission_payments ("com_payments: manage") e commission_rules
-- ("commission_rules: manage").
DROP POLICY IF EXISTS "commission_approvals: manage" ON public.commission_approvals;
CREATE POLICY "commission_approvals: manage" ON public.commission_approvals
  FOR ALL
  USING (tenant_id = my_tenant_id() AND my_role() = 'admin_isv')
  WITH CHECK (tenant_id = my_tenant_id() AND my_role() = 'admin_isv');
