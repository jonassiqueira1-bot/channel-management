-- Adiciona campo de inconsistência na tabela de pagamentos
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS inconsistencia boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payments.inconsistencia IS
  'true quando o pagamento apresenta divergência em relação à provisão gerada (valor diferente ou provisão sem pagamento correspondente)';
