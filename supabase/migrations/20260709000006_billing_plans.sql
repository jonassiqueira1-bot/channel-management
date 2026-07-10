-- Tabela de faixas de cobrança
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  min_users  int  NOT NULL,
  max_users  int,                    -- NULL = sem limite (Enterprise)
  value      numeric(10,2) NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.billing_plans (name, min_users, max_users, value) VALUES
  ('Starter',    1,  5,   397.00),
  ('Growth',     6,  15,  697.00),
  ('Business',   16, 30,  1097.00),
  ('Enterprise', 31, NULL,1697.00);

-- Vincula tenant ao plano atual
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS billing_plan_id uuid REFERENCES public.billing_plans(id),
  ADD COLUMN IF NOT EXISTS billing_cycle_day int NOT NULL DEFAULT 1; -- dia do mês para cobrar

-- Função: retorna o plano correto baseado na qtd de usuários ativos
CREATE OR REPLACE FUNCTION public.get_billing_plan(p_user_count int)
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.billing_plans
  WHERE active = true
    AND min_users <= p_user_count
    AND (max_users IS NULL OR max_users >= p_user_count)
  LIMIT 1;
$$;

-- Função: conta usuários ativos de um tenant
CREATE OR REPLACE FUNCTION public.count_active_users(p_tenant_id uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
    AND status = 'active';
$$;

GRANT SELECT ON public.billing_plans TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_plan(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_active_users(uuid) TO service_role;
