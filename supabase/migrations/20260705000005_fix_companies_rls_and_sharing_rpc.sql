-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Políticas RLS para companies, contacts, opportunities, sellers
--    (foram dropadas em 20260622000001 sem recriar com can_see_branch_record)
-- 2. RPC atômica para salvar regras de compartilhamento (delete + insert)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1a. companies ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS rls_companies_isv_all    ON public.companies;
DROP POLICY IF EXISTS rls_companies_franchise  ON public.companies;
DROP POLICY IF EXISTS rls_companies_insert     ON public.companies;
DROP POLICY IF EXISTS rls_companies_customer   ON public.companies;
DROP POLICY IF EXISTS "companies: select"      ON public.companies;
DROP POLICY IF EXISTS "companies: insert"      ON public.companies;
DROP POLICY IF EXISTS "companies: update"      ON public.companies;
DROP POLICY IF EXISTS "companies: delete"      ON public.companies;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies: select" ON public.companies
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'companies')
    AND deleted_at IS NULL
  );

CREATE POLICY "companies: insert" ON public.companies
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "companies: update" ON public.companies
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id())
  );

CREATE POLICY "companies: delete" ON public.companies
  FOR DELETE USING (
    tenant_id = public.my_tenant_id()
    AND public.my_role() = 'admin_isv'
  );

-- ── 1b. contacts ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contacts: select" ON public.contacts;
DROP POLICY IF EXISTS "contacts: insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts: update" ON public.contacts;
DROP POLICY IF EXISTS "contacts: delete" ON public.contacts;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts: select" ON public.contacts
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'contacts')
    AND deleted_at IS NULL
  );

CREATE POLICY "contacts: insert" ON public.contacts
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "contacts: update" ON public.contacts
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id())
  );

CREATE POLICY "contacts: delete" ON public.contacts
  FOR DELETE USING (
    tenant_id = public.my_tenant_id()
    AND public.my_role() = 'admin_isv'
  );

-- ── 1c. opportunities ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "opportunities: select" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities: insert" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities: update" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities: delete" ON public.opportunities;
DROP POLICY IF EXISTS "rls_opportunities_isv" ON public.opportunities;
DROP POLICY IF EXISTS "rls_oportunidades"     ON public.opportunities;

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunities: select" ON public.opportunities
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'opportunities')
    AND deleted_at IS NULL
  );

CREATE POLICY "opportunities: insert" ON public.opportunities
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "opportunities: update" ON public.opportunities
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id())
  );

CREATE POLICY "opportunities: delete" ON public.opportunities
  FOR DELETE USING (
    tenant_id = public.my_tenant_id()
    AND public.my_role() = 'admin_isv'
  );

-- ── 1d. sellers ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sellers: select" ON public.sellers;
DROP POLICY IF EXISTS "sellers: insert" ON public.sellers;
DROP POLICY IF EXISTS "sellers: update" ON public.sellers;
DROP POLICY IF EXISTS "sellers: delete" ON public.sellers;

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sellers: select" ON public.sellers
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'sellers')
    AND deleted_at IS NULL
  );

CREATE POLICY "sellers: insert" ON public.sellers
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "sellers: update" ON public.sellers
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id())
  );

CREATE POLICY "sellers: delete" ON public.sellers
  FOR DELETE USING (
    tenant_id = public.my_tenant_id()
    AND public.my_role() = 'admin_isv'
  );

-- ── 1e. contracts ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contracts: select" ON public.contracts;
DROP POLICY IF EXISTS "contracts: insert" ON public.contracts;
DROP POLICY IF EXISTS "contracts: update" ON public.contracts;
DROP POLICY IF EXISTS "contracts: delete" ON public.contracts;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts: select" ON public.contracts
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'contracts')
    AND deleted_at IS NULL
  );

CREATE POLICY "contracts: insert" ON public.contracts
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "contracts: update" ON public.contracts
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id())
  );

CREATE POLICY "contracts: delete" ON public.contracts
  FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ── 1f. payments ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "payments: select" ON public.payments;
DROP POLICY IF EXISTS "payments: insert" ON public.payments;
DROP POLICY IF EXISTS "payments: update" ON public.payments;
DROP POLICY IF EXISTS "payments: delete" ON public.payments;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: select" ON public.payments
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'payments')
    AND deleted_at IS NULL
  );

CREATE POLICY "payments: insert" ON public.payments
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "payments: update" ON public.payments
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id())
  );

CREATE POLICY "payments: delete" ON public.payments
  FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ── 2. RPC atômica: salvar regra de compartilhamento ─────────────────────────
-- Recebe o regra_id e o array de linhas como JSONB.
-- SECURITY DEFINER garante atomicidade sem depender do WITH CHECK do PostgREST.
-- Valida internamente: somente admin_isv do tenant pode chamar.

CREATE OR REPLACE FUNCTION public.save_branch_sharing_rule(
  p_regra_id  uuid,
  p_rows      jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_tenant_id uuid;
  v_role      text;
  r           jsonb;
BEGIN
  SELECT tenant_id, role INTO v_tenant_id, v_role
  FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  IF v_role <> 'admin_isv' THEN
    RAISE EXCEPTION 'apenas admin_isv pode gerenciar compartilhamento' USING ERRCODE = '42501';
  END IF;

  -- Apaga todas as linhas antigas desta regra (safe: filtra pelo tenant)
  DELETE FROM branch_table_visibility
  WHERE regra_id = p_regra_id AND tenant_id = v_tenant_id;

  -- Insere as novas linhas
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO branch_table_visibility (
      tenant_id, source_branch_id, target_branch_id,
      entity_table, can_view, can_edit,
      regra_id, meta, created_by
    ) VALUES (
      v_tenant_id,
      (r->>'source_branch_id')::uuid,
      (r->>'target_branch_id')::uuid,
      r->>'entity_table',
      COALESCE((r->>'can_view')::boolean, true),
      COALESCE((r->>'can_edit')::boolean, false),
      p_regra_id,
      COALESCE(r->'meta', '{}'::jsonb),
      auth.uid()
    )
    ON CONFLICT (tenant_id, source_branch_id, target_branch_id, entity_table)
    DO UPDATE SET
      can_view  = EXCLUDED.can_view,
      can_edit  = EXCLUDED.can_edit,
      regra_id  = EXCLUDED.regra_id,
      meta      = EXCLUDED.meta;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_branch_sharing_rule TO authenticated;

NOTIFY pgrst, 'reload schema';
