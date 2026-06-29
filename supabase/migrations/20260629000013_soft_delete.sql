-- ─── Soft-delete global ────────────────────────────────────────────────────────
-- Adiciona deleted_at em todas as tabelas de dados do sistema.
-- Uma RESTRICTIVE POLICY garante que registros excluídos são invisíveis
-- em qualquer SELECT, sem precisar alterar as policies existentes.
-- O frontend passa a fazer UPDATE SET deleted_at = now() em vez de DELETE.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'oportunidades','oportunidade_membros',
    'contracts','commission_payments','commission_approvals','commission_rules','commission_personas',
    'companies','contacts','products','sellers','parceiros','campanhas','habilitacoes',
    'projects','project_tasks','tasks','time_logs','fechamentos_horas',
    'goals','metas_kpi','indicadores','customer_health',
    'playbooks','questionnaire_templates','questionnaire_submissions',
    'alert_rules','alerts','actions','acoes','tipos_acao',
    'equipes','integracoes','compartilhamento_regras','perfis_acesso',
    'tenant_branches','payments','form_layouts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Coluna deleted_at
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL',
      t
    );
    -- Índice para filtros rápidos
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_deleted_at ON public.%I (deleted_at) WHERE deleted_at IS NOT NULL',
      t, t
    );
    -- Restrictive policy: invisível para selects quando deleted_at preenchido
    EXECUTE format(
      'DROP POLICY IF EXISTS "soft_delete_filter" ON public.%I',
      t
    );
    EXECUTE format(
      'CREATE POLICY "soft_delete_filter" ON public.%I AS RESTRICTIVE FOR SELECT USING (deleted_at IS NULL)',
      t
    );
  END LOOP;
END $$;

-- Grants service_role para poder fazer UPDATE deleted_at nas tabelas que faltavam
GRANT UPDATE ON public.oportunidades       TO service_role;
GRANT UPDATE ON public.contracts           TO service_role;
GRANT UPDATE ON public.companies           TO service_role;
GRANT UPDATE ON public.contacts            TO service_role;
GRANT UPDATE ON public.projects            TO service_role;
GRANT UPDATE ON public.tasks               TO service_role;
GRANT UPDATE ON public.commission_payments TO service_role;
GRANT UPDATE ON public.goals               TO service_role;
