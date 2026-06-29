-- Grants para alert_rules e alerts (necessário para Edge Functions com service_role via PostgREST)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_rules TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts      TO authenticated, service_role;

-- Coluna gatilho_nome e campos dinâmicos do builder (adicionados após criação inicial)
ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS gatilho_nome text,
  ADD COLUMN IF NOT EXISTS origem       text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;
