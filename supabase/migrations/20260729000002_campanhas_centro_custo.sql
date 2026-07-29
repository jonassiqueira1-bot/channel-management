-- Campanhas usa colunas diretas (não custom_fields) — precisa da coluna real
-- pra vincular ao Centro de Custo (governança financeira/gerencial).
ALTER TABLE public.campanhas
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campanhas_centro_custo ON public.campanhas (centro_custo_id);
