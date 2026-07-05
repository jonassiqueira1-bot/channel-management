-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Fix RLS da tabela parceiros (sem can_see_branch_record)
-- 2. Remove soft_delete_filter aberto (sem tenant/branch check)
-- 3. Backfill branch_id para registros orphãos (branch_id IS NULL)
-- 4. Corrige profiles de usuários não-admin sem branch_id definido
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. parceiros: RLS com isolamento por filial ───────────────────────────────
DROP POLICY IF EXISTS "soft_delete_filter"  ON public.parceiros;
DROP POLICY IF EXISTS "parceiros: view"     ON public.parceiros;
DROP POLICY IF EXISTS "parceiros: manage"   ON public.parceiros;
DROP POLICY IF EXISTS "parceiros: select"   ON public.parceiros;
DROP POLICY IF EXISTS "parceiros: insert"   ON public.parceiros;
DROP POLICY IF EXISTS "parceiros: update"   ON public.parceiros;
DROP POLICY IF EXISTS "parceiros: delete"   ON public.parceiros;

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parceiros: select" ON public.parceiros
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'parceiros')
    AND deleted_at IS NULL
  );

CREATE POLICY "parceiros: insert" ON public.parceiros
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "parceiros: update" ON public.parceiros
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id())
  );

CREATE POLICY "parceiros: delete" ON public.parceiros
  FOR DELETE USING (
    tenant_id = public.my_tenant_id()
    AND public.my_role() = 'admin_isv'
  );

-- ── 2. Backfill branch_id: atribui Matriz para registros sem branch_id ────────
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN VALUES
    ('parceiros'), ('companies'), ('contacts'), ('sellers'), ('actions'),
    ('projects'), ('customer_health'), ('contracts'), ('payments'),
    ('commission_rules'), ('commission_payments'), ('questionnaire_templates'),
    ('questionnaire_submissions'), ('documents'), ('tasks'), ('playbooks'),
    ('goals'), ('habilitacoes'), ('tipos_acao'), ('campanhas'),
    ('indicadores'), ('metas_kpi'), ('perfis_acesso'), ('equipes'),
    ('products'), ('form_layouts'), ('partner_maturity_params'), ('alert_rules'),
    ('relatorios'), ('pipeline_stages')
  LOOP
    BEGIN
      EXECUTE format($sql$
        UPDATE public.%I SET branch_id = (
          SELECT id FROM public.tenant_branches tb
          WHERE tb.tenant_id = %I.tenant_id
          ORDER BY (tb.name ILIKE '%%matriz%%') DESC, tb.created_at ASC
          LIMIT 1
        )
        WHERE branch_id IS NULL
      $sql$, t, t);
    EXCEPTION WHEN undefined_column OR undefined_table THEN
      -- tabela não tem branch_id ou não existe, pular
    END;
  END LOOP;
END $$;

-- ── 3. Corrige profiles de usuários não-admin sem branch_id ──────────────────
-- Atribui a primeira filial não-Matriz do tenant (ou Matriz se só existir ela)
UPDATE public.profiles
SET branch_id = (
  SELECT tb.id FROM public.tenant_branches tb
  WHERE tb.tenant_id = profiles.tenant_id
  ORDER BY (tb.name ILIKE '%matriz%') ASC, tb.created_at ASC
  LIMIT 1
)
WHERE branch_id IS NULL
  AND role != 'admin_isv';

NOTIFY pgrst, 'reload schema';
