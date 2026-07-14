-- Renomeia o Papel de usuário 'parceiro' para 'contato_canal', pra não conflitar
-- (na nomenclatura) com o Perfil de Acesso "Parceiro" (perfis_acesso.slug='parceiro'),
-- que continua existindo normalmente e agora é atribuído via mapeamento explícito
-- na função invite-user, não mais por comparação direta de texto.

UPDATE public.profiles SET role = 'contato_canal' WHERE role = 'parceiro';

ALTER POLICY "payments: block_parceiro" ON public.payments
  USING (public.my_role() <> 'contato_canal');

ALTER POLICY "projects: block_parceiro" ON public.projects
  USING (public.my_role() <> 'contato_canal');

ALTER POLICY "project_tasks: block_parceiro" ON public.project_tasks
  USING (public.my_role() <> 'contato_canal');

ALTER POLICY "time_logs: block_parceiro" ON public.time_logs
  USING (public.my_role() <> 'contato_canal');

ALTER POLICY "customer_health: block_parceiro" ON public.customer_health
  USING (public.my_role() <> 'contato_canal');

ALTER POLICY "equipes: block_parceiro" ON public.equipes
  USING (public.my_role() <> 'contato_canal');

ALTER POLICY "tabela_precos: block_parceiro" ON public.tabela_precos
  USING (public.my_role() <> 'contato_canal');

ALTER POLICY "integracoes: block_parceiro" ON public.integracoes
  USING (public.my_role() <> 'contato_canal');

ALTER POLICY "alert_rules: block_parceiro" ON public.alert_rules
  USING (public.my_role() <> 'contato_canal');

ALTER POLICY "sellers: block_parceiro_select" ON public.sellers
  USING (
    public.my_role() <> 'contato_canal'
    OR id = (SELECT contact_id FROM public.profiles WHERE id = auth.uid())
  );

ALTER POLICY "sellers: block_parceiro_insert" ON public.sellers
  WITH CHECK (public.my_role() <> 'contato_canal');

ALTER POLICY "sellers: block_parceiro_update" ON public.sellers
  USING (public.my_role() <> 'contato_canal')
  WITH CHECK (public.my_role() <> 'contato_canal');

ALTER POLICY "sellers: block_parceiro_delete" ON public.sellers
  USING (public.my_role() <> 'contato_canal');
