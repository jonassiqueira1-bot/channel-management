ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at                 timestamptz; -- trial_expired_at + 90 days

-- Lifecycle: após cancel_at → muda status para cancelled
CREATE OR REPLACE FUNCTION public.run_billing_lifecycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{"trial_expired":[],"data_deleted":[],"suspended":[],"cancelled":[]}'::jsonb;
  v_tenant record;
BEGIN

  -- 1. Trial vencido sem assinatura → perde acesso imediatamente
  FOR v_tenant IN
    SELECT id
    FROM public.tenants
    WHERE status IN ('trial', 'pending_payment')
      AND trial_ends_at <= now()
      AND trial_charge_sent = false
      AND billing_cpf_cnpj IS NOT NULL
  LOOP
    UPDATE public.tenants
    SET status = 'trial_expired',
        trial_expired_at = now(),
        delete_scheduled_at = now() + interval '90 days',
        updated_at = now()
    WHERE id = v_tenant.id;
    v_result := jsonb_set(v_result, '{trial_expired}',
      v_result->'trial_expired' || to_jsonb(v_tenant.id::text));
  END LOOP;

  -- 2. Dados de trial_expired há mais de 90 dias → excluir
  FOR v_tenant IN
    SELECT id FROM public.tenants
    WHERE status = 'trial_expired'
      AND delete_scheduled_at IS NOT NULL
      AND delete_scheduled_at <= now()
  LOOP
    DELETE FROM public.tenants WHERE id = v_tenant.id;
    v_result := jsonb_set(v_result, '{data_deleted}',
      v_result->'data_deleted' || to_jsonb(v_tenant.id::text));
  END LOOP;

  -- 3. Overdue além da carência → suspend
  FOR v_tenant IN
    SELECT id FROM public.tenants
    WHERE status = 'overdue'
      AND overdue_since IS NOT NULL
      AND overdue_since + (grace_period_days || ' days')::interval <= now()
  LOOP
    UPDATE public.tenants
    SET status = 'suspended', suspended_at = now(), updated_at = now()
    WHERE id = v_tenant.id;
    v_result := jsonb_set(v_result, '{suspended}',
      v_result->'suspended' || to_jsonb(v_tenant.id::text));
  END LOOP;

  -- 4. Cancelamento: após cancel_at → encerra acesso
  FOR v_tenant IN
    SELECT id FROM public.tenants
    WHERE cancellation_requested_at IS NOT NULL
      AND cancel_at IS NOT NULL
      AND cancel_at <= now()
      AND status NOT IN ('cancelled', 'trial_expired')
  LOOP
    UPDATE public.tenants
    SET status = 'cancelled', updated_at = now()
    WHERE id = v_tenant.id;
    v_result := jsonb_set(v_result, '{cancelled}',
      v_result->'cancelled' || to_jsonb(v_tenant.id::text));
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_billing_lifecycle() TO service_role;
