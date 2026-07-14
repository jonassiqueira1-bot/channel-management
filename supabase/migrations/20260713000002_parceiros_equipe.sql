-- Relaciona Parceiros a Equipes (cadastro do sistema)
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS equipe_id uuid REFERENCES public.equipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parceiros_equipe ON public.parceiros(equipe_id);
