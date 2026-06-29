-- ─── commission_payments — alinhamento schema + controle de parcelas ──────────
-- Problemas corrigidos:
--   1. Colunas que o hook envia mas não existiam (company_id, contract_id,
--      branch_id, persona_slug, periodo_mes/ano, valor_bruto, custom_fields)
--   2. Colunas NOT NULL incompatíveis (persona, receita_tipo, percentual,
--      data_vencimento) → tornam-se opcionais / ganham DEFAULT
--   3. valor_comissao era GENERATED ALWAYS → recriado como coluna gravável
--   4. Novas colunas: parcela_numero, total_parcelas
--   5. Trigger: auto-incrementa parcela_numero para regras com prazo_meses

-- ── 1. Tornar colunas obrigatórias incompatíveis opcionais ────────────────────
ALTER TABLE public.commission_payments
  ALTER COLUMN beneficiario_nome DROP NOT NULL,
  ALTER COLUMN persona           DROP NOT NULL,
  ALTER COLUMN receita_tipo      DROP NOT NULL,
  ALTER COLUMN percentual        SET DEFAULT 0,
  ALTER COLUMN valor_base        SET DEFAULT 0,
  ALTER COLUMN data_vencimento   DROP NOT NULL;

-- ── 2. Substituir valor_comissao GENERATED por coluna gravável ────────────────
-- Precisa dropar e recriar pois GENERATED ALWAYS não aceita SET DEFAULT
ALTER TABLE public.commission_payments
  DROP   COLUMN IF EXISTS valor_comissao;
ALTER TABLE public.commission_payments
  ADD    COLUMN IF NOT EXISTS valor_comissao numeric(12,2) NOT NULL DEFAULT 0;

-- ── 3. Adicionar colunas que o hook usa mas não existiam ──────────────────────
ALTER TABLE public.commission_payments
  ADD COLUMN IF NOT EXISTS branch_id      uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id     uuid        REFERENCES public.empresas(id)         ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_id    uuid        REFERENCES public.contracts(id)         ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS persona_slug   text,
  ADD COLUMN IF NOT EXISTS periodo_mes    integer     CHECK (periodo_mes BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS periodo_ano    integer     CHECK (periodo_ano >= 2020),
  ADD COLUMN IF NOT EXISTS valor_bruto    numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_fields  jsonb       NOT NULL DEFAULT '{}';

-- ── 4. Controle de parcelas ───────────────────────────────────────────────────
ALTER TABLE public.commission_payments
  ADD COLUMN IF NOT EXISTS parcela_numero  integer NOT NULL DEFAULT 1 CHECK (parcela_numero > 0),
  ADD COLUMN IF NOT EXISTS total_parcelas  integer          CHECK (total_parcelas IS NULL OR total_parcelas > 0);

COMMENT ON COLUMN public.commission_payments.parcela_numero IS
  'Número sequencial desta parcela para o par rule_id+beneficiario_id. Calculado automaticamente via trigger.';
COMMENT ON COLUMN public.commission_payments.total_parcelas IS
  'Total de parcelas previstas (copiado de commission_rules.prazo_meses). NULL = recorrência indefinida.';

-- ── 5. Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_commission_payments_rule_benef
  ON public.commission_payments (rule_id, beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_parcela
  ON public.commission_payments (rule_id, beneficiario_id, parcela_numero);

-- ── 6. Trigger: auto-incrementa parcela_numero no INSERT ─────────────────────
CREATE OR REPLACE FUNCTION fn_commission_payment_parcela()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count       integer;
  v_prazo_meses integer;
BEGIN
  -- Conta quantas parcelas já existem para este par rule_id + beneficiario_id
  SELECT COUNT(*) INTO v_count
    FROM public.commission_payments
   WHERE rule_id         = NEW.rule_id
     AND beneficiario_id = NEW.beneficiario_id
     AND id              <> NEW.id;        -- exclui o próprio registro (já inserido)

  NEW.parcela_numero := v_count + 1;

  -- Copia total_parcelas da regra (prazo_meses), se a regra tiver prazo definido
  IF NEW.rule_id IS NOT NULL AND NEW.total_parcelas IS NULL THEN
    SELECT prazo_meses INTO v_prazo_meses
      FROM public.commission_rules
     WHERE id = NEW.rule_id;
    NEW.total_parcelas := v_prazo_meses;  -- pode ser NULL (recorrência indefinida)
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commission_payment_parcela ON public.commission_payments;
CREATE TRIGGER trg_commission_payment_parcela
  BEFORE INSERT ON public.commission_payments
  FOR EACH ROW EXECUTE FUNCTION fn_commission_payment_parcela();

-- ── 7. RLS — garante políticas corretas (idempotente) ────────────────────────
DO $$ BEGIN
  -- Remove políticas legadas (usavam auth.uid() em vez de my_tenant_id())
  DROP POLICY IF EXISTS rls_commission_payments_select ON public.commission_payments;
  DROP POLICY IF EXISTS rls_commission_payments_insert ON public.commission_payments;
  DROP POLICY IF EXISTS rls_commission_payments_update ON public.commission_payments;
  DROP POLICY IF EXISTS rls_commission_payments_delete ON public.commission_payments;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename = 'commission_payments' AND policyname = 'com_payments: select'
  ) THEN
    CREATE POLICY "com_payments: select" ON public.commission_payments
      FOR SELECT USING (tenant_id = public.my_tenant_id());
    CREATE POLICY "com_payments: manage" ON public.commission_payments
      FOR ALL    USING (tenant_id = public.my_tenant_id());
  END IF;
END $$;

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TRIGGER IF EXISTS trg_commission_payment_parcela ON public.commission_payments;
-- DROP FUNCTION IF EXISTS fn_commission_payment_parcela();
-- ALTER TABLE public.commission_payments DROP COLUMN IF EXISTS parcela_numero, DROP COLUMN IF EXISTS total_parcelas;
-- ALTER TABLE public.commission_payments DROP COLUMN IF EXISTS branch_id, company_id, contract_id, persona_slug, periodo_mes, periodo_ano, valor_bruto, custom_fields;
