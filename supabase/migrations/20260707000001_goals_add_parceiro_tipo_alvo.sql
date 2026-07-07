-- Adiciona 'parceiro' ao CHECK constraint de tipo_alvo em goals
ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_tipo_alvo_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_tipo_alvo_check
  CHECK (tipo_alvo IN ('vendedor','unidade','parceiro','categoria','produto','equipe'));
