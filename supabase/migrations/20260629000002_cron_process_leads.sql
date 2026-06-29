create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('process-leads-queue')
  where exists (select 1 from cron.job where jobname = 'process-leads-queue');

select cron.schedule(
  'process-leads-queue',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://tbzlezyzkicyvjujxlru.supabase.co/functions/v1/process-rd-queue',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiemxlenl6a2ljeXZqdWp4bHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTY1NDIsImV4cCI6MjA5ODA3MjU0Mn0.IHoHHtoHBUtaM3JjmEa5Wlabtmkph3czd49jUYoKDT8"}'::jsonb
  );
  $$
);
