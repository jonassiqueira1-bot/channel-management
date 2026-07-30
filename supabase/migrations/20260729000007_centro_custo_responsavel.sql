-- Responsável (dono) do Centro de Custo — passa a ter alçada pra aprovar
-- custos vinculados àquele centro em Ações/Campanhas/Orçamento, além de
-- admin_isv e financeiro (que continuam com alçada geral).
ALTER TABLE public.centros_custo
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_centros_custo_responsavel ON public.centros_custo (responsavel_id);
