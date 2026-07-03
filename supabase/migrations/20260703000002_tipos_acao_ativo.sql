-- Adiciona campo ativo para permitir desativar tipos de ação sem excluí-los
ALTER TABLE public.tipos_acao
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_tipos_acao_ativo ON public.tipos_acao (ativo);
