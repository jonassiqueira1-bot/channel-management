-- Habilita pg_cron (extensão já disponível no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove job anterior se existir (idempotente)
SELECT cron.unschedule('billing-lifecycle') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'billing-lifecycle'
);

-- Executa run_billing_lifecycle() todo dia às 08h (horário UTC = 05h Brasília)
SELECT cron.schedule(
  'billing-lifecycle',
  '0 8 * * *',
  $$ SELECT public.run_billing_lifecycle(); $$
);
