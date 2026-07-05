-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Quebrar recursão infinita nas RLS policies de profiles
--
-- Problema: policies de profiles chamavam my_tenant_id() / my_role() que liam
-- profiles novamente → stack depth exceeded (54001).
--
-- Solução:
-- 1. Criar funções bypass SECURITY DEFINER que leem profiles como postgres
--    (sem RLS), quebrando o ciclo de recursão.
-- 2. Recriar policies de profiles usando essas bypass functions.
-- 3. Recriar policies de relatorios com subquery inline (my_tenant_id()
--    retornava NULL no contexto WITH CHECK do PostgREST).
-- 4. Criar RPC soft_delete_relatorio para contornar limitação do PostgREST
--    com soft-delete em tabela com deleted_at IS NULL na SELECT policy.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Funções bypass SECURITY DEFINER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public._my_tenant_id_bypass()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public._my_role_bypass()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$;

-- ── 2. Recriar policies de profiles sem recursão ────────────────────────────
DROP POLICY IF EXISTS "profiles: admin all"    ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin manage" ON public.profiles;
DROP POLICY IF EXISTS "profiles: self"         ON public.profiles;
DROP POLICY IF EXISTS "profiles: self update"  ON public.profiles;

-- Usuário sempre vê seu próprio row (sem chamar nenhuma função)
CREATE POLICY "profiles: self" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Admin vê todos os profiles do seu tenant
CREATE POLICY "profiles: admin view" ON public.profiles
  FOR SELECT USING (
    tenant_id = _my_tenant_id_bypass()
    AND _my_role_bypass() = 'admin_isv'
  );

-- Usuário atualiza apenas seu próprio row
CREATE POLICY "profiles: self update" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin gerencia todos os profiles do seu tenant
CREATE POLICY "profiles: admin manage" ON public.profiles
  FOR ALL USING (
    tenant_id = _my_tenant_id_bypass()
    AND _my_role_bypass() = 'admin_isv'
  );

-- ── 3. Recriar policies de relatorios com subquery inline ───────────────────
-- my_tenant_id() retorna NULL no contexto WITH CHECK do PostgREST quando
-- combinado com soft-delete (deleted_at). Solução: subquery direta em profiles.

DROP POLICY IF EXISTS "relatorios_select" ON public.relatorios;
DROP POLICY IF EXISTS "relatorios_insert" ON public.relatorios;
DROP POLICY IF EXISTS "relatorios_update" ON public.relatorios;
DROP POLICY IF EXISTS "relatorios_delete" ON public.relatorios;

CREATE POLICY "relatorios_select" ON public.relatorios
  FOR SELECT USING (
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1) = tenant_id
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

CREATE POLICY "relatorios_insert" ON public.relatorios
  FOR INSERT WITH CHECK (
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1) = tenant_id
  );

CREATE POLICY "relatorios_update" ON public.relatorios
  FOR UPDATE
  USING (
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1) = tenant_id
    AND (owner_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin_isv')
  )
  WITH CHECK (true);

CREATE POLICY "relatorios_delete" ON public.relatorios
  FOR DELETE USING (
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1) = tenant_id
    AND (owner_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin_isv')
  );

-- ── 4. RPC para soft-delete de relatórios ───────────────────────────────────
-- Necessário porque PostgREST + WITH CHECK falha ao tentar retornar o row
-- após soft-delete (deleted_at IS NULL exclui o row da SELECT policy).

CREATE OR REPLACE FUNCTION public.soft_delete_relatorio(relatorio_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM relatorios r
    JOIN profiles p ON p.id = auth.uid()
    WHERE r.id = relatorio_id
      AND r.tenant_id = p.tenant_id
      AND (r.owner_id = auth.uid() OR p.role = 'admin_isv')
      AND r.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE relatorios SET deleted_at = now() WHERE id = relatorio_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_relatorio TO authenticated;

NOTIFY pgrst, 'reload schema';
