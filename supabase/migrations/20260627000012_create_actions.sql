CREATE TABLE IF NOT EXISTS public.actions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id      uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id     uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  titulo         text        NOT NULL,
  tipo           text        NOT NULL DEFAULT 'outros',
  status         text        NOT NULL DEFAULT 'agendado',
  prioridade     text        NOT NULL DEFAULT 'media',
  data_prevista  timestamptz,
  data_conclusao timestamptz,
  descricao      text,
  custom_fields  jsonb       NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actions_tenant   ON public.actions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_actions_company  ON public.actions (company_id);
CREATE INDEX IF NOT EXISTS idx_actions_owner    ON public.actions (owner_id);

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actions: select" ON public.actions
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "actions: insert" ON public.actions
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "actions: update" ON public.actions
  FOR UPDATE USING (tenant_id = public.my_tenant_id());

CREATE POLICY "actions: delete" ON public.actions
  FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.actions'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.actions
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
