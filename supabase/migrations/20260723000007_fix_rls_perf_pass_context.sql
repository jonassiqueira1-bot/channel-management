-- ═══════════════════════════════════════════════════════════════════════════
-- Correção de performance real do RLS por-linha (ver diagnóstico: EXPLAIN
-- real mostrou can_see_branch_record() sendo reavaliada para cada uma das
-- ~11 mil linhas de companies, e a tentativa anterior de só envolver as
-- chamadas internas em (SELECT ...) não teve efeito nenhum porque a função
-- é SECURITY DEFINER — Postgres nunca faz inline dessas, então o (SELECT..)
-- interno não vira um InitPlan de verdade, continua sendo recalculado a
-- cada invocação da função).
--
-- Fix de verdade: can_see_branch_record passa a RECEBER a filial do usuário
-- já calculada (2 parâmetros novos, com DEFAULT NULL pra retrocompatibilidade
-- — qualquer chamador que não passe os novos parâmetros continua funcionando
-- exatamente como antes, só sem o ganho de performance). As ~26 policies de
-- SELECT que seguem o padrão genérico passam a chamar a função já passando
-- (SELECT my_branch_id()) e (SELECT my_branch_ids()) — como esses SÃO
-- subqueries de verdade no nível da POLICY (não dentro de uma função
-- SECURITY DEFINER), o Postgres consegue tratá-los como InitPlan e calcular
-- uma vez só por consulta, não uma vez por linha.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_see_branch_record(
  rec_branch_id  uuid,
  rec_id         uuid,
  rec_table      text,
  p_my_branch_id  uuid    DEFAULT NULL,
  p_my_branch_ids uuid[]  DEFAULT NULL
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    rec_branch_id IS NULL
    OR rec_branch_id = COALESCE(p_my_branch_id, (SELECT public.my_branch_id()))
    OR rec_branch_id = ANY(COALESCE(p_my_branch_ids, (SELECT public.my_branch_ids())))
    OR public.branch_sharing_allows(rec_branch_id, rec_table, false)
$$;

-- ── Atualiza as ~26 policies de SELECT que seguem o padrão genérico ──────────
-- (cada linha: tabela, nome da policy, se tem "AND deleted_at IS NULL")
DO $$
DECLARE
  r record;
  tabelas record;
BEGIN
  FOR tabelas IN
    SELECT * FROM (VALUES
      ('acoes',                    'acoes: view',                    false),
      ('alert_rules',              'alert_rules: view',               false),
      ('audit_logs',                'audit_logs: view',                false),
      ('campanhas',                'campanhas: view',                 false),
      ('commission_rules',         'commission_rules: view',          false),
      ('customer_health',          'customer_health: view',           false),
      ('documents',                'documents: view',                 false),
      ('equipes',                  'equipes: view',                   false),
      ('form_layouts',             'form_layouts: view',              false),
      ('goals',                    'goals: view',                     false),
      ('habilitacoes',             'habilitacoes: view',              false),
      ('indicadores',              'indicadores: view',               false),
      ('metas_kpi',                'metas_kpi: view',                 false),
      ('partner_maturity_params',  'maturity: view',                  false),
      ('perfis_acesso',            'perfis_acesso: view',             false),
      ('pipeline_stages',          'stages: view',                    false),
      ('playbooks',                'playbooks: view',                 false),
      ('products',                 'products: view',                  false),
      ('questionnaire_templates',  'questionnaire_templates: view',   false),
      ('tasks',                    'tasks: view',                     false),
      ('tipos_acao',               'tipos_acao: view',                false),
      ('actions',                  'actions: select',                 true),
      ('companies',                'companies: select',               true),
      ('contacts',                 'contacts: select',                true),
      ('contracts',                'contracts: select',               true),
      ('oportunidades',            'oportunidades: select',           true),
      ('parceiros',                'parceiros: select',               true),
      ('payments',                 'payments: select',                true),
      ('projects',                 'projects: select',                true),
      ('sellers',                  'sellers: select',                 true)
    ) AS t(tabela, policy_name, tem_deleted_at)
  LOOP
    -- Só mexe se a tabela e a policy realmente existirem (defensivo — evita
    -- quebrar se alguma dessas não existir num ambiente específico).
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tabelas.tabela AND policyname = tabelas.policy_name) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tabelas.policy_name, tabelas.tabela);
      IF tabelas.tem_deleted_at THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR SELECT USING (tenant_id = (SELECT public.my_tenant_id()) AND public.can_see_branch_record(branch_id, id, %L, (SELECT public.my_branch_id()), (SELECT public.my_branch_ids())) AND deleted_at IS NULL)',
          tabelas.policy_name, tabelas.tabela, tabelas.tabela
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR SELECT USING (tenant_id = (SELECT public.my_tenant_id()) AND public.can_see_branch_record(branch_id, id, %L, (SELECT public.my_branch_id()), (SELECT public.my_branch_ids())))',
          tabelas.policy_name, tabelas.tabela, tabelas.tabela
        );
      END IF;
    END IF;
  END LOOP;
END $$;
