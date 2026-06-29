-- project_tasks: atividades dentro de fases MIT, oriundas do escopo da proposta
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id              text        NOT NULL PRIMARY KEY,
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id      uuid        REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id        text        NOT NULL,          -- id local da fase (ph_xxx)
  proposta_item_id text,                         -- id do item original da proposta
  task_name       text        NOT NULL,
  tipo_hora       text,                          -- 'Analista' | 'Coord.' | 'Ana./Coord.'
  hr_analista     numeric     NOT NULL DEFAULT 0,
  hr_coord        numeric     NOT NULL DEFAULT 0,
  task_order      int         NOT NULL DEFAULT 0,
  is_completed    boolean     NOT NULL DEFAULT false,
  completed_at    date,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_phase   ON public.project_tasks (phase_id);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_tasks: tenant" ON public.project_tasks
  FOR ALL USING (tenant_id = public.my_tenant_id());

-- Adiciona task_id nos apontamentos de horas
ALTER TABLE public.time_logs ADD COLUMN IF NOT EXISTS task_id text;
