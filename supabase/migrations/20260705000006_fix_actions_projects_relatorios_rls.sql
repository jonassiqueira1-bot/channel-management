-- ═══════════════════════════════════════════════════════════════════════════
-- Adiciona can_see_branch_record às policies de actions, projects e relatorios
-- (tabelas que estavam sem isolamento cross-branch)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── actions ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "actions: select" ON public.actions;
DROP POLICY IF EXISTS "actions: insert" ON public.actions;
DROP POLICY IF EXISTS "actions: update" ON public.actions;
DROP POLICY IF EXISTS "actions: delete" ON public.actions;

CREATE POLICY "actions: select" ON public.actions
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'actions')
    AND deleted_at IS NULL
  );
CREATE POLICY "actions: insert" ON public.actions
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "actions: update" ON public.actions
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id())
  );
CREATE POLICY "actions: delete" ON public.actions
  FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ── projects ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS projects_isv_all       ON public.projects;
DROP POLICY IF EXISTS projects_franquia_read ON public.projects;
DROP POLICY IF EXISTS "projects: select"     ON public.projects;
DROP POLICY IF EXISTS "projects: insert"     ON public.projects;
DROP POLICY IF EXISTS "projects: update"     ON public.projects;
DROP POLICY IF EXISTS "projects: delete"     ON public.projects;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: select" ON public.projects
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.can_see_branch_record(branch_id, id, 'projects')
    AND deleted_at IS NULL
  );
CREATE POLICY "projects: insert" ON public.projects
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "projects: update" ON public.projects
  FOR UPDATE USING (
    tenant_id = public.my_tenant_id()
    AND (public.my_role() = 'admin_isv' OR branch_id = public.my_branch_id())
  );
CREATE POLICY "projects: delete" ON public.projects
  FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ── relatorios ───────────────────────────────────────────────────────────────
-- Mantém a lógica de owner/acesso da policy existente e adiciona can_see_branch_record
DROP POLICY IF EXISTS "relatorios_select" ON public.relatorios;

CREATE POLICY "relatorios_select" ON public.relatorios
  FOR SELECT USING (
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1) = tenant_id
    AND public.can_see_branch_record(branch_id, id, 'relatorios')
    AND deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin_isv'
      OR acesso = 'todos'
      OR (acesso = 'equipe' AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = ANY(papeis_permitidos)
      ))
    )
  );

NOTIFY pgrst, 'reload schema';
