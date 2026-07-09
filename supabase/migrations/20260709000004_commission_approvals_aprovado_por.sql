-- Adiciona campo aprovado_por em commission_approvals para registrar quem aprovou
ALTER TABLE public.commission_approvals
  ADD COLUMN IF NOT EXISTS aprovado_por text;
