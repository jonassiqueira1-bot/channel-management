-- Fix: commission_approvals manage policy só permitia admin_isv.
-- Relaxa para qualquer usuário autenticado do tenant (financeiro, admin_isv, etc.)
-- A restrição de tenant_id já garante isolamento entre tenants.

DROP POLICY IF EXISTS "commission_approvals: manage" ON public.commission_approvals;

CREATE POLICY "commission_approvals: manage" ON public.commission_approvals
  FOR ALL
  USING (tenant_id = public.my_tenant_id())
  WITH CHECK (tenant_id = public.my_tenant_id());

-- Fix: limpa registros com periodo inválido ("undefined-*") em commission_payments
-- Deriva um periodo válido de periodo_mes + periodo_ano quando disponível
UPDATE public.commission_payments
SET periodo = periodo_ano::text || '-' || LPAD(periodo_mes::text, 2, '0')
WHERE periodo LIKE 'undefined%'
  AND periodo_mes IS NOT NULL
  AND periodo_ano IS NOT NULL;

-- Remove os que não tem como derivar (sem mes/ano)
UPDATE public.commission_payments
SET periodo = TO_CHAR(NOW(), 'YYYY-MM')
WHERE periodo LIKE 'undefined%';
