ALTER TABLE public.habilitacoes
  ADD COLUMN IF NOT EXISTS categoria_produto text,
  ADD COLUMN IF NOT EXISTS custom_fields     jsonb NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
