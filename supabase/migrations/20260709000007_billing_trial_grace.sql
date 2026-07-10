-- Trial, dados de cobrança e carência

ALTER TABLE public.tenants
  -- Dados de cobrança (coletados no signup)
  ADD COLUMN IF NOT EXISTS billing_name      text,
  ADD COLUMN IF NOT EXISTS billing_cpf_cnpj  text,
  ADD COLUMN IF NOT EXISTS billing_email     text,
  ADD COLUMN IF NOT EXISTS billing_phone     text,

  -- Trial
  ADD COLUMN IF NOT EXISTS trial_ends_at     timestamptz,
  ADD COLUMN IF NOT EXISTS trial_charge_sent boolean NOT NULL DEFAULT false,

  -- Carência após vencimento
  ADD COLUMN IF NOT EXISTS grace_period_days int NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS overdue_since     timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at      timestamptz;

-- Tenants novos começam em 'trial' com 14 dias
-- (status já era 'active' por padrão; mantemos compatibilidade —
--  novos tenants devem ter status='trial' e trial_ends_at definido no signup)

-- Função disparada pelo CRON diário para gerenciar ciclo de vida
CREATE OR REPLACE FUNCTION public.run_billing_lifecycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{"trial_charged":[],"overdue_warned":[],"suspended":[]}'::jsonb;
  v_tenant record;
BEGIN

  -- 1. Tenants com trial vencido que ainda não receberam a 1ª cobrança
  FOR v_tenant IN
    SELECT id, name
    FROM public.tenants
    WHERE status = 'trial'
      AND trial_ends_at <= now()
      AND trial_charge_sent = false
      AND billing_cpf_cnpj IS NOT NULL
  LOOP
    -- Marca para cobrança (a Edge Function asaas-monthly-billing processa)
    UPDATE public.tenants
    SET trial_charge_sent = true,
        status = 'pending_payment',
        updated_at = now()
    WHERE id = v_tenant.id;

    v_result := jsonb_set(v_result, '{trial_charged}',
      v_result->'trial_charged' || to_jsonb(v_tenant.id::text));
  END LOOP;

  -- 2. Tenants overdue há mais de grace_period_days → suspend
  FOR v_tenant IN
    SELECT id
    FROM public.tenants
    WHERE status = 'overdue'
      AND overdue_since IS NOT NULL
      AND overdue_since + (grace_period_days || ' days')::interval <= now()
  LOOP
    UPDATE public.tenants
    SET status = 'suspended',
        suspended_at = now(),
        updated_at = now()
    WHERE id = v_tenant.id;

    v_result := jsonb_set(v_result, '{suspended}',
      v_result->'suspended' || to_jsonb(v_tenant.id::text));
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_billing_lifecycle() TO service_role;
