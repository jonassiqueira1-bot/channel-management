-- Adiciona funil_id em sellers para restringir acesso do parceiro a um funil específico
-- Tipo TEXT porque os IDs de funis são gerados no frontend (Date.now + Math.random)

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS funil_id text;

CREATE INDEX IF NOT EXISTS sellers_funil_id_idx ON public.sellers(funil_id);
