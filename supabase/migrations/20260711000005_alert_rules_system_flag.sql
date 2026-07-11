-- Adiciona suporte a alertas de sistema (seed do produto)
-- is_system: não podem ser excluídos, só inativados
-- system_key: chave única do template padrão para regeneração

ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS is_system  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_rules_system_key
  ON public.alert_rules (tenant_id, system_key)
  WHERE system_key IS NOT NULL;

-- Bloqueia DELETE de regras de sistema via RLS/política
-- (a proteção principal é na UI; aqui reforçamos na trigger)
CREATE OR REPLACE FUNCTION public.protect_system_alert_rules()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'Regras de sistema não podem ser excluídas.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_system_alert_rules ON public.alert_rules;
CREATE TRIGGER trg_protect_system_alert_rules
  BEFORE DELETE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.protect_system_alert_rules();

-- ─── Como marcar os alertas seed existentes ─────────────────────────────────
-- Execute manualmente no SQL Editor do Supabase para cada alerta seed:
--
-- UPDATE public.alert_rules
--   SET is_system = true, system_key = '<chave_unica>'
--   WHERE id = '<uuid_do_alerta>';
--
-- Sugestão de system_keys:
--   contrato_vencendo_30d | contrato_vencendo_7d
--   pagamento_vencido_7d  | pagamento_vencido_30d
--   oportunidade_parada   | score_cs_critico
--   meta_abaixo_esperado  | etc.
-- ────────────────────────────────────────────────────────────────────────────
