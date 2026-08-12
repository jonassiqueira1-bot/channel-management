-- perfis_acesso foi criada com RLS mas sem nenhum GRANT (mesma causa raiz já
-- vista em product_categories/contact_list_options/oportunidade_etapa_historico:
-- "permission denied for table", 42501, mesmo pra service_role) — sem o GRANT
-- de INSERT, o auto-seed de Perfis de Acesso nativos (usePerfisAcesso.js)
-- nunca conseguia gravar. Tenants criados antes de um novo perfil nativo
-- (ex: "Parceiro") existir no catálogo simplesmente nunca ganhavam esse
-- perfil, e usuários convidados com aquele papel ficavam com
-- perfis_acesso_ids vazio pra sempre — sem NENHUM módulo liberado.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_acesso TO authenticated;
GRANT ALL ON public.perfis_acesso TO service_role;

NOTIFY pgrst, 'reload schema';
