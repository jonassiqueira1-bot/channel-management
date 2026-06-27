-- Alinha a tabela playbooks com o que o hook usePlaybooks envia
-- Schema atual usa: nome, etapas
-- Hook usa: titulo, steps, refs, resources, owner_id, branch_id

-- 1. Adiciona coluna titulo copiando de nome
ALTER TABLE public.playbooks ADD COLUMN IF NOT EXISTS titulo text;
UPDATE public.playbooks SET titulo = nome WHERE titulo IS NULL AND nome IS NOT NULL;

-- 2. Colunas que o hook envia e não existiam
ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS branch_id  uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS steps      jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS refs       jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS resources  jsonb DEFAULT '[]';

-- 3. Copia etapas → steps para não perder dados
UPDATE public.playbooks SET steps = etapas WHERE steps IS NULL OR steps = '[]'::jsonb;

-- 4. Política de gerenciamento já existe; garante que branch_id tem índice
CREATE INDEX IF NOT EXISTS idx_playbooks_owner  ON public.playbooks (owner_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_branch ON public.playbooks (branch_id);
