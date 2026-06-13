-- ─── Migration: breakdown de valor na tabela oportunidades ───────────────────
-- Adiciona colunas de segmentação de receita e desconto.
-- valor_total passa a armazenar o valor LÍQUIDO calculado pelo trigger.
--
-- Rollback: DROP TRIGGER, DROP FUNCTION, DROP COLUMNS (listados no final)

-- 1. Novas colunas de composição do valor
ALTER TABLE oportunidades
  ADD COLUMN IF NOT EXISTS valor_cdu      numeric(14,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_sms      numeric(14,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_servico  numeric(14,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_desconto numeric(14,2) NOT NULL DEFAULT 0.00;

-- 2. Garante que valor_total existe (alguns tenants podem usar "amount")
ALTER TABLE oportunidades
  ADD COLUMN IF NOT EXISTS valor_total numeric(14,2) NOT NULL DEFAULT 0.00;

-- 3. Restrição: desconto não pode superar o bruto
ALTER TABLE oportunidades
  DROP CONSTRAINT IF EXISTS chk_desconto_max;
ALTER TABLE oportunidades
  ADD CONSTRAINT chk_desconto_max CHECK (
    valor_desconto <= (valor_cdu + valor_sms + valor_servico)
  );

-- 4. Trigger que mantém valor_total = bruto - desconto automaticamente
CREATE OR REPLACE FUNCTION fn_calc_valor_total_oportunidade()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.valor_total := GREATEST(0,
    (NEW.valor_cdu + NEW.valor_sms + NEW.valor_servico) - NEW.valor_desconto
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_valor_total ON oportunidades;
CREATE TRIGGER trg_calc_valor_total
  BEFORE INSERT OR UPDATE ON oportunidades
  FOR EACH ROW EXECUTE FUNCTION fn_calc_valor_total_oportunidade();

-- 5. Backfill: para linhas existentes que ainda não têm breakdown,
--    considera o valor legado (campo "valor" / "amount") como valor_servico
UPDATE oportunidades
SET valor_servico = COALESCE(NULLIF(valor_total, 0), 0)
WHERE valor_cdu = 0 AND valor_sms = 0 AND valor_servico = 0;

-- Recalcula valor_total após backfill
UPDATE oportunidades SET valor_total =
  GREATEST(0, valor_cdu + valor_sms + valor_servico - valor_desconto);

-- ─── RLS — as políticas existentes não precisam mudar ─────────────────────────
-- O tenant_id / organization_id já protege o acesso às linhas.
-- As novas colunas herdam as políticas de linha existentes automaticamente.

-- ─── Rollback (não executar em produção — apenas referência) ──────────────────
-- DROP TRIGGER IF EXISTS trg_calc_valor_total ON oportunidades;
-- DROP FUNCTION IF EXISTS fn_calc_valor_total_oportunidade();
-- ALTER TABLE oportunidades
--   DROP CONSTRAINT IF EXISTS chk_desconto_max,
--   DROP COLUMN IF EXISTS valor_cdu,
--   DROP COLUMN IF EXISTS valor_sms,
--   DROP COLUMN IF EXISTS valor_servico,
--   DROP COLUMN IF EXISTS valor_desconto;
