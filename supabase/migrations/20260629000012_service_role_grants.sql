-- Grants para service_role em todas as tabelas lidas pelo process-alerts
GRANT SELECT ON public.oportunidades        TO service_role;
GRANT SELECT ON public.contracts            TO service_role;
GRANT SELECT ON public.commission_payments  TO service_role;
GRANT SELECT ON public.tasks                TO service_role;
GRANT SELECT ON public.projects             TO service_role;
GRANT SELECT ON public.companies            TO service_role;
GRANT SELECT ON public.goals                TO service_role;
GRANT SELECT ON public.profiles             TO service_role;
GRANT SELECT ON public.tenants              TO service_role;
GRANT INSERT, UPDATE ON public.alerts       TO service_role;
GRANT INSERT        ON public.tasks         TO service_role;
