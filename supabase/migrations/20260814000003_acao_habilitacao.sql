-- Relaciona Habilitações ao cadastro de Ações: uma Ação (tipicamente
-- Treinamento) pode conceder uma Habilitação aos participantes que a
-- concluírem. A concessão em si reaproveita seller_habilitacoes (mesma
-- tabela usada na aba Habilitações do Contato Canal), com rastro de origem
-- (acao_id) pra saber que veio daqui e permitir desfazer só por aqui.

ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS habilitacao_id text;

ALTER TABLE public.seller_habilitacoes
  ADD COLUMN IF NOT EXISTS acao_id uuid REFERENCES public.actions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS seller_habilitacoes_acao_id_idx ON public.seller_habilitacoes(acao_id);
