-- CRON: roda process-alerts a cada hora
select cron.schedule(
  'process-alerts-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://tbzlezyzkicyvjujxlru.supabase.co/functions/v1/process-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
