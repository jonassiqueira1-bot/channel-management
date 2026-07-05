-- Cria branch_table_visibility (existia no schema mas não no banco)
CREATE TABLE IF NOT EXISTS public.branch_table_visibility (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id)          ON DELETE CASCADE,
  source_branch_id uuid        NOT NULL REFERENCES public.tenant_branches(id)  ON DELETE CASCADE,
  target_branch_id uuid        NOT NULL REFERENCES public.tenant_branches(id)  ON DELETE CASCADE,
  entity_table     text        NOT NULL,
  can_view         boolean     NOT NULL DEFAULT true,
  can_edit         boolean     NOT NULL DEFAULT false,
  created_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- regra_id agrupa todas as linhas de uma mesma regra UI
  regra_id         uuid,
  -- meta guarda descrição, acesso, permissão, perfil_ids, usuario_ids
  meta             jsonb       NOT NULL DEFAULT '{}',
  UNIQUE(tenant_id, source_branch_id, target_branch_id, entity_table)
);

CREATE INDEX IF NOT EXISTS idx_btv_tenant  ON public.branch_table_visibility (tenant_id);
CREATE INDEX IF NOT EXISTS idx_btv_regra   ON public.branch_table_visibility (regra_id);
CREATE INDEX IF NOT EXISTS idx_btv_source  ON public.branch_table_visibility (source_branch_id);
CREATE INDEX IF NOT EXISTS idx_btv_target  ON public.branch_table_visibility (target_branch_id);

ALTER TABLE public.branch_table_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "btv: view"   ON public.branch_table_visibility;
DROP POLICY IF EXISTS "btv: manage" ON public.branch_table_visibility;
CREATE POLICY "btv: view"   ON public.branch_table_visibility FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "btv: manage" ON public.branch_table_visibility FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_table_visibility TO authenticated;

-- Restaura can_see_branch_record com check de branch_table_visibility
CREATE OR REPLACE FUNCTION public.can_see_branch_record(rec_branch_id uuid, rec_id uuid, rec_table text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    public.my_role() = 'admin_isv'
    OR rec_branch_id IS NULL
    OR rec_branch_id = public.my_branch_id()
    OR rec_branch_id = ANY(public.my_branch_ids())
    OR EXISTS (
      SELECT 1 FROM public.branch_table_visibility btv
      WHERE btv.tenant_id        = public.my_tenant_id()
        AND btv.source_branch_id = rec_branch_id
        AND btv.target_branch_id = public.my_branch_id()
        AND btv.entity_table     = rec_table
        AND btv.can_view         = true
    )
$$;
