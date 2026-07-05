-- ═══════════════════════════════════════════════════════════════════════════
-- PRÉ-REQUISITO: Adicionar branch_id às tabelas que foram criadas sem ela
-- Deve ser rodado ANTES das migrations 20260705000001 a 20260705000004
-- Usa IF NOT EXISTS para ser idempotente (seguro rodar mais de uma vez)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tipos_acao
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

ALTER TABLE public.perfis_acesso
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

ALTER TABLE public.indicadores
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

ALTER TABLE public.metas_kpi
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tipos_acao_branch   ON public.tipos_acao   (branch_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_branch    ON public.parceiros    (branch_id);
CREATE INDEX IF NOT EXISTS idx_perfis_acesso_branch ON public.perfis_acesso (branch_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_branch  ON public.indicadores  (branch_id);
CREATE INDEX IF NOT EXISTS idx_metas_kpi_branch    ON public.metas_kpi    (branch_id);
