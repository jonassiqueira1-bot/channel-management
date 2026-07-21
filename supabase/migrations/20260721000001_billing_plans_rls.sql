-- Fix: billing_plans foi criada sem RLS (alerta do Supabase Advisor —
-- rls_disabled_in_public). É uma tabela de referência global (faixas de
-- preço, sem tenant_id), lida por todos os tenants pra determinar o plano
-- atual — então a policy é só leitura para authenticated; escrita continua
-- restrita ao service_role (que sempre ignora RLS).
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_plans: view" ON public.billing_plans;
CREATE POLICY "billing_plans: view" ON public.billing_plans
  FOR SELECT USING (true);
