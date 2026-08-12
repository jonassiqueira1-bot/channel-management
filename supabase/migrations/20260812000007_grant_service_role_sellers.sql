-- sellers nunca teve GRANT nenhum pra service_role — mesma causa raiz de
-- profiles/perfis_acesso. Isso quebrava silenciosamente a correção de ontem
-- em invite-user (admin.from('sellers').select('branch_id')...): a query
-- falhava, sellerBranchId ficava null, e o Contato Canal continuava sem
-- filial "chumbada" mesmo depois do fix.
GRANT SELECT ON public.sellers TO service_role;

NOTIFY pgrst, 'reload schema';
