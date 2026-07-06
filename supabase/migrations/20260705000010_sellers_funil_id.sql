-- Adiciona funil_id em sellers para restringir acesso do parceiro a um funil específico

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS funil_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sellers_funil_id_idx ON public.sellers(funil_id);
