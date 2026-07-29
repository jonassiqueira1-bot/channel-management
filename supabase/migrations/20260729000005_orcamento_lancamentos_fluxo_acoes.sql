-- Lançamento manual de Orçamento passa a seguir o mesmo fluxo de Ações →
-- aba Custos: classificação (despesa/receita), previsto x realizado,
-- execução e aprovação (admin/financeiro) antes de contar como realizado.
ALTER TABLE public.orcamento_lancamentos
  RENAME COLUMN valor TO valor_realizado;

ALTER TABLE public.orcamento_lancamentos
  ADD COLUMN IF NOT EXISTS tipo            text    NOT NULL DEFAULT 'despesa',
  ADD COLUMN IF NOT EXISTS valor_previsto  numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS executado       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aprovacoes      jsonb   NOT NULL DEFAULT '[]';
