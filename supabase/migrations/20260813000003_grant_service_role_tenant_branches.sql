GRANT SELECT ON public.tenant_branches TO service_role;
NOTIFY pgrst, 'reload schema';
