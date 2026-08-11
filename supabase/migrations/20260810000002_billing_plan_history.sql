-- Histórico de evolução de plano contratado por tenant — hoje só existe o
-- plano ATUAL (tenants.billing_plan_id), sem nenhum rastro de quando/por que
-- mudou (ex: subiu de Starter pra Growth ao passar de 5 pra 6 usuários).

CREATE TABLE IF NOT EXISTS public.billing_plan_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id        uuid REFERENCES public.billing_plans(id),
  plan_name      text NOT NULL,        -- snapshot do nome — sobrevive mesmo se o plano for renomeado/removido depois
  value          numeric(10,2) NOT NULL,
  user_count_at  int,                  -- qtd de usuários ativos no momento da troca, quando aplicável
  motivo         text NOT NULL DEFAULT 'automatico', -- 'automatico' (cruzou faixa de usuários) | 'manual' (ajuste administrativo)
  changed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_plan_history_tenant ON public.billing_plan_history (tenant_id, changed_at DESC);

ALTER TABLE public.billing_plan_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_view_own_plan_history" ON public.billing_plan_history;
CREATE POLICY "tenant_view_own_plan_history" ON public.billing_plan_history
  FOR SELECT USING (tenant_id = public.my_tenant_id());

GRANT SELECT ON public.billing_plan_history TO authenticated;
GRANT SELECT, INSERT ON public.billing_plan_history TO service_role;

-- Registra uma linha sempre que tenants.billing_plan_id mudar de fato.
CREATE OR REPLACE FUNCTION public.log_billing_plan_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan public.billing_plans%ROWTYPE;
BEGIN
  IF NEW.billing_plan_id IS NOT DISTINCT FROM OLD.billing_plan_id THEN
    RETURN NEW;
  END IF;
  IF NEW.billing_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_plan FROM public.billing_plans WHERE id = NEW.billing_plan_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.billing_plan_history (tenant_id, plan_id, plan_name, value, user_count_at, motivo)
  VALUES (NEW.id, v_plan.id, v_plan.name, v_plan.value, public.count_active_users(NEW.id), 'automatico');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_billing_plan_change ON public.tenants;
CREATE TRIGGER trg_log_billing_plan_change
  AFTER UPDATE OF billing_plan_id ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.log_billing_plan_change();

-- Backfill: registra o plano atual de cada tenant já vinculado a um plano,
-- pra timeline não começar vazia pra quem já tem billing_plan_id preenchido.
INSERT INTO public.billing_plan_history (tenant_id, plan_id, plan_name, value, user_count_at, motivo, changed_at)
SELECT t.id, bp.id, bp.name, bp.value, public.count_active_users(t.id), 'automatico', now()
FROM public.tenants t
JOIN public.billing_plans bp ON bp.id = t.billing_plan_id
WHERE t.billing_plan_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.billing_plan_history h WHERE h.tenant_id = t.id);

NOTIFY pgrst, 'reload schema';
