-- ─── Rotinas ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.routines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id        uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  usuario_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  descricao        text,
  contexto         text NOT NULL, -- pipeline | parceiros | projetos | ...
  validade         date,
  compartilhamento text NOT NULL DEFAULT 'privado', -- privado | equipe | filiais
  parametros       jsonb NOT NULL DEFAULT '{}',
  acoes            jsonb NOT NULL DEFAULT '[]',
  schedule         text, -- cron expression ou null
  ativo            boolean NOT NULL DEFAULT true,
  ultima_execucao  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_executions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  routine_id          uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  executado_por       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  modo                text NOT NULL DEFAULT 'manual', -- manual | agendado
  status              text NOT NULL DEFAULT 'sucesso', -- sucesso | parcial | erro
  snapshot_antes      jsonb NOT NULL DEFAULT '[]',
  snapshot_depois     jsonb NOT NULL DEFAULT '[]',
  resumo              jsonb NOT NULL DEFAULT '{}',
  revertido           boolean NOT NULL DEFAULT false,
  revertido_em        timestamptz,
  revertido_por       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_routines_tenant    ON public.routines (tenant_id);
CREATE INDEX IF NOT EXISTS idx_routines_usuario   ON public.routines (usuario_id);
CREATE INDEX IF NOT EXISTS idx_routine_exec_rid   ON public.routine_executions (routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_exec_tenant ON public.routine_executions (tenant_id);

-- RLS
ALTER TABLE public.routines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_executions ENABLE ROW LEVEL SECURITY;

-- Idempotência — mesma tabela pode já ter sido criada com essas policies
-- numa tentativa anterior (histórico de migrations divergente entre ambientes).
DROP POLICY IF EXISTS "routines: select" ON public.routines;
DROP POLICY IF EXISTS "routines: insert" ON public.routines;
DROP POLICY IF EXISTS "routines: update" ON public.routines;
DROP POLICY IF EXISTS "routines: delete" ON public.routines;
DROP POLICY IF EXISTS "routine_executions: select" ON public.routine_executions;
DROP POLICY IF EXISTS "routine_executions: insert" ON public.routine_executions;
DROP POLICY IF EXISTS "routine_executions: update" ON public.routine_executions;

-- routines: visível para o criador + compartilhadas com equipe/filiais do mesmo tenant
CREATE POLICY "routines: select" ON public.routines FOR SELECT
  USING (
    tenant_id = public._my_tenant_id_bypass()
    AND (
      usuario_id = auth.uid()
      OR compartilhamento = 'equipe'
      OR (compartilhamento = 'filiais' AND (branch_id IS NULL OR branch_id = (
        SELECT branch_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
      )))
    )
  );

CREATE POLICY "routines: insert" ON public.routines FOR INSERT
  WITH CHECK (tenant_id = public._my_tenant_id_bypass() AND usuario_id = auth.uid());

CREATE POLICY "routines: update" ON public.routines FOR UPDATE
  USING (tenant_id = public._my_tenant_id_bypass() AND (usuario_id = auth.uid() OR compartilhamento IN ('equipe','filiais')))
  WITH CHECK (tenant_id = public._my_tenant_id_bypass());

CREATE POLICY "routines: delete" ON public.routines FOR DELETE
  USING (tenant_id = public._my_tenant_id_bypass() AND usuario_id = auth.uid());

-- routine_executions: visível para todos do tenant
CREATE POLICY "routine_executions: select" ON public.routine_executions FOR SELECT
  USING (tenant_id = public._my_tenant_id_bypass());

CREATE POLICY "routine_executions: insert" ON public.routine_executions FOR INSERT
  WITH CHECK (tenant_id = public._my_tenant_id_bypass());

CREATE POLICY "routine_executions: update" ON public.routine_executions FOR UPDATE
  USING (tenant_id = public._my_tenant_id_bypass())
  WITH CHECK (tenant_id = public._my_tenant_id_bypass());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines           TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_executions TO service_role;

NOTIFY pgrst, 'reload schema';
