-- Adiciona colunas que o hook usePlaybooks.js usa mas que não existem no schema original
-- Schema original (v2) usa: title, description, segment, is_active
-- Hook usa: titulo, descricao, status, custom_fields, branch_id, owner_id, steps, refs, resources

ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS titulo        text,
  ADD COLUMN IF NOT EXISTS descricao     text,
  ADD COLUMN IF NOT EXISTS status        text    NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS custom_fields jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS branch_id     uuid    REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_id      uuid,
  ADD COLUMN IF NOT EXISTS steps         jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS refs          jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resources     jsonb   NOT NULL DEFAULT '[]'::jsonb;

-- Copia title → titulo para registros existentes (onde titulo ainda é NULL)
UPDATE public.playbooks SET titulo = title WHERE titulo IS NULL AND title IS NOT NULL;
UPDATE public.playbooks SET descricao = description WHERE descricao IS NULL AND description IS NOT NULL;
