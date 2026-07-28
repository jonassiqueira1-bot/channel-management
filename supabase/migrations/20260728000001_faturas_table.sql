-- ═══════════════════════════════════════════════════════════════════════════
-- Faturas — Fase 1: modelo de dados + geração automática a partir dos itens
-- do contrato (avulso vs recorrente), separado de `payments` (que passa a
-- representar o recebimento contra uma fatura, não a cobrança em si) —
-- mesmo padrão usado por Salesforce Billing (Order Product → Billing
-- Schedule → Invoice) e HubSpot (Line Item → Subscription → Invoice).
--
-- `origem_cobranca` mora na fatura (não em payments): 'parceiro' quando um
-- parceiro revende e repassa, 'cliente_direto' quando o cliente final paga
-- a ISV diretamente. Pagamento herda essa info da fatura que ele quita.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE fatura_status AS ENUM ('gerada','enviada','paga','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fatura_cadencia AS ENUM ('avulsa','recorrente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fatura_origem AS ENUM ('parceiro','cliente_direto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.faturas (
  id               uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid            NOT NULL,
  branch_id        uuid,
  company_id       uuid            REFERENCES public.companies(id) ON DELETE SET NULL,
  contract_id      uuid            REFERENCES public.contracts(id) ON DELETE SET NULL,

  numero           text            NOT NULL,
  cadencia         fatura_cadencia NOT NULL DEFAULT 'avulsa',
  origem_cobranca  fatura_origem   NOT NULL DEFAULT 'parceiro',
  status           fatura_status   NOT NULL DEFAULT 'gerada',

  competencia      date,           -- mês/ano de referência da cobrança
  due_date         date,
  amount_total     numeric(12,2)   NOT NULL DEFAULT 0,

  -- itens (produtos), contract_numero/company_nome (cache pra evitar join
  -- pesado nas listagens), payment_id da quitação, notas — mesmo padrão de
  -- custom_fields já usado em contracts/payments/provisoes.
  custom_fields    jsonb           NOT NULL DEFAULT '{}',

  created_at       timestamptz     NOT NULL DEFAULT now(),
  updated_at       timestamptz     NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_faturas_tenant       ON public.faturas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_faturas_branch       ON public.faturas (branch_id);
CREATE INDEX IF NOT EXISTS idx_faturas_company      ON public.faturas (company_id);
CREATE INDEX IF NOT EXISTS idx_faturas_contract     ON public.faturas (contract_id);
CREATE INDEX IF NOT EXISTS idx_faturas_due_date     ON public.faturas (tenant_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_faturas_competencia  ON public.faturas (tenant_id, competencia DESC);

DROP TRIGGER IF EXISTS trg_faturas_updated_at ON public.faturas;
CREATE TRIGGER trg_faturas_updated_at
  BEFORE UPDATE ON public.faturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faturas: select" ON public.faturas;
DROP POLICY IF EXISTS "faturas: insert" ON public.faturas;
DROP POLICY IF EXISTS "faturas: update" ON public.faturas;
DROP POLICY IF EXISTS "faturas: delete" ON public.faturas;

-- Mesmo padrão já otimizado (InitPlan) usado por contracts/payments —
-- ver migration 20260723000007.
CREATE POLICY "faturas: select" ON public.faturas
  FOR SELECT USING (
    tenant_id = (SELECT public.my_tenant_id())
    AND public.can_see_branch_record(branch_id, id, 'faturas', (SELECT public.my_branch_id()), (SELECT public.my_branch_ids()))
    AND deleted_at IS NULL
  );

CREATE POLICY "faturas: insert" ON public.faturas
  FOR INSERT WITH CHECK (tenant_id = (SELECT public.my_tenant_id()));

CREATE POLICY "faturas: update" ON public.faturas
  FOR UPDATE USING (
    tenant_id = (SELECT public.my_tenant_id())
    AND (public.my_role() = 'admin_isv' OR branch_id = (SELECT public.my_branch_id()))
  );

-- Nenhuma linha cadastral pode ser excluída fisicamente (mesma regra das
-- outras tabelas — ver 20260713000010_delete_hardening.sql).
CREATE POLICY "faturas: delete" ON public.faturas AS RESTRICTIVE FOR DELETE USING (false);

GRANT SELECT, INSERT, UPDATE ON public.faturas TO authenticated;
GRANT ALL ON public.faturas TO service_role;

-- Inclui 'faturas' na allowlist do soft-delete genérico (mesmo mecanismo de
-- contracts/payments/provisoes — ver 20260713000010_delete_hardening.sql).
CREATE OR REPLACE FUNCTION public.soft_delete_record(p_table text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'companies','contacts','opportunities','products','projects',
    'contracts','payments','actions','sellers','goals','customer_health',
    'habilitacoes','tipos_acao','campanhas','parceiros','perfis_acesso',
    'equipes','documents','tasks','playbooks','questionnaire_templates',
    'questionnaire_submissions','commission_rules','commission_payments',
    'commission_personas','oportunidade_membros','relatorios',
    'alert_rules','pipeline_stages','provisoes','tabela_precos','profiles',
    'partner_maturity_params','faturas'
  ];
  v_tenant_id uuid;
  v_role text;
  v_oportunidade_id uuid;
BEGIN
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'tabela não permitida: %', p_table USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id, role INTO v_tenant_id, v_role FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_table = 'goals' AND v_role <> 'admin_isv' THEN
    IF EXISTS (SELECT 1 FROM goals WHERE id = p_id AND tenant_id = v_tenant_id AND valor_atual > 0) THEN
      RAISE EXCEPTION 'meta já possui realização registrada — apenas administradores podem excluir' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_table = 'contracts' THEN
    SELECT oportunidade_id INTO v_oportunidade_id FROM contracts WHERE id = p_id AND tenant_id = v_tenant_id;
    IF EXISTS (
      SELECT 1 FROM payments p WHERE p.tenant_id = v_tenant_id AND p.deleted_at IS NULL
        AND p.oportunidade_id = v_oportunidade_id
      UNION ALL
      SELECT 1 FROM provisoes pr JOIN contracts c ON c.id = p_id
        WHERE pr.tenant_id = v_tenant_id AND pr.company_id = c.company_id
      UNION ALL
      SELECT 1 FROM faturas f WHERE f.tenant_id = v_tenant_id AND f.deleted_at IS NULL AND f.contract_id = p_id
    ) THEN
      RAISE EXCEPTION 'contrato possui provisões, faturas ou pagamentos registrados — exclusão bloqueada' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_table = 'projects' AND v_role <> 'admin_isv' THEN
    SELECT oportunidade_id INTO v_oportunidade_id FROM projects WHERE id = p_id AND tenant_id = v_tenant_id;
    IF v_oportunidade_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM commission_rules cr WHERE cr.tenant_id = v_tenant_id AND cr.deleted_at IS NULL
        AND cr.oportunidade_id = v_oportunidade_id
    ) THEN
      RAISE EXCEPTION 'projeto já gerou comissão — apenas administradores podem excluir' USING ERRCODE = '42501';
    END IF;
  END IF;

  EXECUTE format(
    'UPDATE %I SET deleted_at = now() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    p_table
  ) USING p_id, v_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_records(p_table text, p_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'companies','contacts','opportunities','products','projects',
    'contracts','payments','actions','sellers','goals','customer_health',
    'habilitacoes','tipos_acao','campanhas','parceiros','perfis_acesso',
    'equipes','documents','tasks','playbooks','questionnaire_templates',
    'questionnaire_submissions','commission_rules','commission_payments',
    'commission_personas','oportunidade_membros','relatorios',
    'alert_rules','pipeline_stages','provisoes','tabela_precos','profiles',
    'partner_maturity_params','faturas'
  ];
  v_tenant_id uuid;
  v_id uuid;
BEGIN
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'tabela não permitida: %', p_table USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_table IN ('goals', 'contracts', 'projects') THEN
    FOREACH v_id IN ARRAY p_ids LOOP
      PERFORM public.soft_delete_record(p_table, v_id);
    END LOOP;
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE %I SET deleted_at = now() WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL',
    p_table
  ) USING p_ids, v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_record  TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_records TO authenticated;
