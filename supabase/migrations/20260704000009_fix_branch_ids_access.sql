-- ─── Fix: branch_ids (plural) não estava sendo respeitado na RLS ─────────────
-- O campo branch_ids no perfil representa as unidades que o usuário pode ver.
-- A função can_see_branch_record só verificava branch_id (singular).

-- 1. Helper: retorna uuid[] com as branches autorizadas do usuário atual
CREATE OR REPLACE FUNCTION public.my_branch_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(branch_ids, '[]'::jsonb)
    )::uuid
    FROM public.profiles
    WHERE id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.my_branch_ids() TO authenticated;

-- 2. Redefine can_see_branch_record incluindo branch_ids no check
CREATE OR REPLACE FUNCTION public.can_see_branch_record(rec_branch_id uuid, rec_id uuid, rec_table text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    -- Admin ISV vê tudo
    public.my_role() = 'admin_isv'
    -- Registro sem filial: visível para todos do tenant
    OR rec_branch_id IS NULL
    -- Filial primária do usuário
    OR rec_branch_id = public.my_branch_id()
    -- Qualquer filial na lista branch_ids do usuário
    OR rec_branch_id = ANY(public.my_branch_ids())
    -- Visibilidade explícita configurada entre filiais
    OR EXISTS (
      SELECT 1 FROM public.branch_table_visibility btv
      WHERE btv.tenant_id        = public.my_tenant_id()
        AND btv.source_branch_id = rec_branch_id
        AND btv.target_branch_id = public.my_branch_id()
        AND btv.entity_table     = rec_table
        AND btv.can_view         = true
    )
    -- Compartilhamento explícito de registro
    OR public.has_branch_access(rec_id, rec_table)
$$;
