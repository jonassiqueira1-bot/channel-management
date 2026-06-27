-- Adiciona colunas de vínculo genérico (entidade_tipo/id/nome) e responsavel à tabela tasks
-- Necessário para o hook useTasks() funcionar corretamente via Pipeline/Oportunidades

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS entidade_tipo  text,
  ADD COLUMN IF NOT EXISTS entidade_id    text,
  ADD COLUMN IF NOT EXISTS entidade_nome  text,
  ADD COLUMN IF NOT EXISTS responsavel    text;

CREATE INDEX IF NOT EXISTS idx_tasks_entidade ON public.tasks (entidade_tipo, entidade_id);
