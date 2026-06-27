-- Corrige RLS da tabela playbooks: policy original só tem USING (para SELECT/DELETE).
-- Para INSERT e UPDATE funcionar, precisa de WITH CHECK também.
-- Substitui a policy por uma que cobre todas as operações (FOR ALL).

DROP POLICY IF EXISTS "tenant_isolation_playbooks" ON public.playbooks;

-- tenant_id é text nesta tabela; my_tenant_id() retorna uuid — cast necessário
CREATE POLICY "playbooks_tenant_all" ON public.playbooks
  FOR ALL
  USING     (tenant_id = public.my_tenant_id()::text)
  WITH CHECK(tenant_id = public.my_tenant_id()::text);
