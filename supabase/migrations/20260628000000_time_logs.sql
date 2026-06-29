-- time_logs: apontamentos de horas por projeto/fase
CREATE TABLE IF NOT EXISTS public.time_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  project_id      uuid        REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id        text,       -- id local da fase (pode ser string)
  user_id         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name       text,       -- nome legível (denormalizado para exibição)
  hours_executed  numeric     NOT NULL DEFAULT 0,
  description     text,
  logged_at       date        NOT NULL DEFAULT CURRENT_DATE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_logs_tenant        ON public.time_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_project       ON public.time_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_logged_at     ON public.time_logs (logged_at);
CREATE INDEX IF NOT EXISTS idx_time_logs_tenant_period ON public.time_logs (tenant_id, logged_at);

ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_logs: view"   ON public.time_logs;
DROP POLICY IF EXISTS "time_logs: manage" ON public.time_logs;

CREATE POLICY "time_logs: view" ON public.time_logs
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "time_logs: manage" ON public.time_logs
  FOR ALL USING (
    tenant_id = public.my_tenant_id() AND
    (user_id = auth.uid() OR public.my_role() = 'admin_isv')
  );
