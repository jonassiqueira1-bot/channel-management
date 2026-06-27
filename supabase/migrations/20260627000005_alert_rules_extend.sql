-- Extende alert_rules com campos para o builder de condições dinâmicas

ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS gatilho_nome  text,          -- nome amigável da regra
  ADD COLUMN IF NOT EXISTS origem        text,          -- tabela de origem: contracts | oportunidades | etc.
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb; -- condições, consequência, destinatários
