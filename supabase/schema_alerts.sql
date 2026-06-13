-- ── DASHBOARD ALERTS ─────────────────────────────────────────────────────────
CREATE TABLE public.dashboard_alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id    uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id   uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  severity     text NOT NULL DEFAULT 'info',  -- 'critical' | 'warning' | 'info'
  title        text NOT NULL,
  description  text,
  action_label text,
  action_url   text,
  is_resolved  boolean NOT NULL DEFAULT false,
  resolved_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.dashboard_alerts(tenant_id, is_resolved);

ALTER TABLE public.dashboard_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts: select" ON public.dashboard_alerts FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "alerts: insert" ON public.dashboard_alerts FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');
CREATE POLICY "alerts: update" ON public.dashboard_alerts FOR UPDATE USING (tenant_id = public.my_tenant_id());
CREATE POLICY "alerts: delete" ON public.dashboard_alerts FOR DELETE USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');
