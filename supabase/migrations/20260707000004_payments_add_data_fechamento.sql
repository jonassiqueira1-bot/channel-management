-- Adiciona data_fechamento à tabela payments
-- NULL = pagamento ainda não processado em nenhum fechamento mensal
-- Preenchido = data em que o pagamento foi incluído em um fechamento

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS data_fechamento date;

CREATE INDEX IF NOT EXISTS payments_data_fechamento_idx
  ON public.payments (tenant_id, data_fechamento)
  WHERE data_fechamento IS NOT NULL;
