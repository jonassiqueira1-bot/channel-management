-- A UI de Equipes sempre teve um campo "status" (ativa/inativa/pausada), mas a tabela
-- nunca teve essa coluna — a tela rodava inteiramente em localStorage. Adicionando aqui
-- para permitir migrar Equipes.js para persistir no banco de verdade.
ALTER TABLE public.equipes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';
