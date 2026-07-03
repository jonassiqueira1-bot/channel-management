-- Adiciona branch_id às tabelas que ainda não possuem a coluna,
-- mantendo o padrão de filtragem por filial em todo o sistema.

-- alert_rules
ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alert_rules_branch ON public.alert_rules (branch_id);

-- alerts
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_branch ON public.alerts (branch_id);

-- project_tasks
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_tasks_branch ON public.project_tasks (branch_id);

-- partner_maturity_params
ALTER TABLE public.partner_maturity_params
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_maturity_params_branch ON public.partner_maturity_params (branch_id);

-- partner_maturity_scores
ALTER TABLE public.partner_maturity_scores
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_maturity_scores_branch ON public.partner_maturity_scores (branch_id);

-- partner_habilitacoes
ALTER TABLE public.partner_habilitacoes
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_habilitacoes_branch ON public.partner_habilitacoes (branch_id);
