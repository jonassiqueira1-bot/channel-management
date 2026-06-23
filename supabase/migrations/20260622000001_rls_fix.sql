-- ─────────────────────────────────────────────────────────────────────────────
-- RLS FIX — corrige políticas quebradas, duplicadas e permissões excessivas
-- Auditoria: 2026-06-22
-- ─────────────────────────────────────────────────────────────────────────────

-- ===========================================================================
-- 1. CRÍTICO: commission_rules e commission_payments
--    Políticas antigas usavam tenant_id = auth.uid() (sempre falso).
--    Remove as 8 políticas quebradas (as corretas já existem nas migrations
--    posteriores: "rules: view/manage" e "com_payments: select/manage").
-- ===========================================================================

DROP POLICY IF EXISTS rls_commission_rules_select   ON commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_insert   ON commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_update   ON commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_delete   ON commission_rules;

DROP POLICY IF EXISTS rls_commission_payments_select ON commission_payments;
DROP POLICY IF EXISTS rls_commission_payments_insert ON commission_payments;
DROP POLICY IF EXISTS rls_commission_payments_update ON commission_payments;
DROP POLICY IF EXISTS rls_commission_payments_delete ON commission_payments;

-- Garantir que as políticas corretas existem (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'commission_rules' AND policyname = 'rules: view'
  ) THEN
    CREATE POLICY "rules: view"   ON public.commission_rules
      FOR SELECT USING (tenant_id = public.my_tenant_id());
    CREATE POLICY "rules: manage" ON public.commission_rules
      FOR ALL USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'commission_payments' AND policyname = 'com_payments: select'
  ) THEN
    CREATE POLICY "com_payments: select" ON public.commission_payments
      FOR SELECT USING (tenant_id = public.my_tenant_id());
    CREATE POLICY "com_payments: manage" ON public.commission_payments
      FOR ALL USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');
  END IF;
END $$;

-- ===========================================================================
-- 2. CRÍTICO: partner_health (tabela legada — substituída por customer_health)
--    Remove a tabela antiga se estiver vazia; caso contrário mantém isolada.
--    O frontend usa apenas customer_health.
-- ===========================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'partner_health' AND schemaname = 'public') THEN
    -- Remove apenas se não houver dados
    IF (SELECT COUNT(*) FROM partner_health) = 0 THEN
      DROP TABLE partner_health CASCADE;
      RAISE NOTICE 'partner_health removida (estava vazia)';
    ELSE
      -- Tabela tem dados: isolar com RLS restritivo e logar aviso
      ALTER TABLE partner_health ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS cs_admin_isv_full        ON partner_health;
      DROP POLICY IF EXISTS cs_gestor_read_write     ON partner_health;
      DROP POLICY IF EXISTS cs_franquia_own_company  ON partner_health;
      -- Bloquear acesso via app (service role ainda acessa para migração manual)
      RAISE WARNING 'partner_health tem dados — migrar para customer_health manualmente antes de dropar';
    END IF;
  END IF;
END $$;

-- ===========================================================================
-- 3. ALTO: Remover políticas duplicadas de gerações antigas
--    contacts, projects, payments, questionnaire_*, playbooks, goals, companies
-- ===========================================================================

-- contacts
DROP POLICY IF EXISTS contacts_isv_all         ON contacts;
DROP POLICY IF EXISTS contacts_franquia_read    ON contacts;
DROP POLICY IF EXISTS contacts_franquia_insert  ON contacts;

-- projects
DROP POLICY IF EXISTS projects_isv_all         ON projects;
DROP POLICY IF EXISTS projects_franquia_read   ON projects;

-- payments
DROP POLICY IF EXISTS payments_isv_all         ON payments;
DROP POLICY IF EXISTS payments_franquia_read   ON payments;

-- questionnaire_templates (3 gerações)
DROP POLICY IF EXISTS templates_isv_full       ON questionnaire_templates;
DROP POLICY IF EXISTS qt_isv_all               ON questionnaire_templates;
DROP POLICY IF EXISTS qt_franquia_read         ON questionnaire_templates;

-- questionnaire_submissions
DROP POLICY IF EXISTS submissions_isv_full     ON questionnaire_submissions;

-- playbooks (policy de geração antiga com nome diferente)
DROP POLICY IF EXISTS tenant_isolation_playbooks ON playbooks;

-- goals (duplicata — mesma semântica, nomes diferentes)
DROP POLICY IF EXISTS "goals: select" ON public.goals;
DROP POLICY IF EXISTS "goals: manage" ON public.goals;
-- Garante que as policies corretas existem (v2)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'goals: view'
  ) THEN
    CREATE POLICY "goals: view"   ON public.goals
      FOR SELECT USING (tenant_id = public.my_tenant_id());
    CREATE POLICY "goals: manage" ON public.goals
      FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');
  END IF;
END $$;

-- companies (política antiga antes do padrão can_see_branch_record)
DROP POLICY IF EXISTS rls_companies_isv_all    ON companies;
DROP POLICY IF EXISTS rls_companies_franchise  ON companies;
DROP POLICY IF EXISTS rls_companies_insert     ON companies;

-- ===========================================================================
-- 4. ALTO: Storage bucket "documents" — tornar privado
-- ===========================================================================

UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- Remove políticas de storage eventualmente existentes antes de recriar
DROP POLICY IF EXISTS "documents storage: select" ON storage.objects;
DROP POLICY IF EXISTS "documents storage: insert" ON storage.objects;
DROP POLICY IF EXISTS "documents storage: delete" ON storage.objects;

-- Apenas usuários autenticados acessam arquivos do bucket documents
CREATE POLICY "documents storage: select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "documents storage: insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "documents storage: delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- ===========================================================================
-- 5. MÉDIO: integracoes — restringir manage a admin_isv
-- ===========================================================================

DROP POLICY IF EXISTS "integracoes: manage" ON public.integracoes;
CREATE POLICY "integracoes: manage" ON public.integracoes
  FOR ALL USING (
    tenant_id = public.my_tenant_id()
    AND public.my_role() = 'admin_isv'
  );

-- ===========================================================================
-- 6. MÉDIO: questionnaire_submissions — update restrito ao respondente ou admin
-- ===========================================================================

DROP POLICY IF EXISTS "qsub: update" ON public.questionnaire_submissions;
CREATE POLICY "qsub: update" ON public.questionnaire_submissions
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (
      public.my_role() = 'admin_isv'
      OR created_by = auth.uid()
    )
  );

-- ===========================================================================
-- 7. MÉDIO: rd_leads_queue — remover manage (escrita só via service role)
-- ===========================================================================

DROP POLICY IF EXISTS "rd_leads_queue: manage" ON public.rd_leads_queue;
-- SELECT permanece para admins monitorarem a fila:
DROP POLICY IF EXISTS "rd_leads_queue: view" ON public.rd_leads_queue;
CREATE POLICY "rd_leads_queue: view" ON public.rd_leads_queue
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.my_role() = 'admin_isv'
  );

-- ===========================================================================
-- 8. MÉDIO: oportunidade_membros — manage restrito a admin_isv
-- ===========================================================================

DROP POLICY IF EXISTS "oportunidade_membros: manage" ON public.oportunidade_membros;
CREATE POLICY "oportunidade_membros: manage" ON public.oportunidade_membros
  FOR ALL USING (
    tenant_id = public.my_tenant_id()
    AND public.my_role() = 'admin_isv'
  );

-- ===========================================================================
-- Verificação final: lista todas as políticas ativas pós-fix
-- (rode manualmente para conferir)
-- ===========================================================================
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
