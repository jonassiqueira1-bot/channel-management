-- Corrige RLS de tasks: update/delete exigia owner_id = auth.uid()
-- mas owner_id nunca é preenchido pelo frontend → delete sempre falha para não-admins.
-- Tarefas são colaborativas: qualquer membro do tenant pode editar/excluir.
DROP POLICY IF EXISTS "tasks: update" ON public.tasks;
DROP POLICY IF EXISTS "tasks: delete" ON public.tasks;

CREATE POLICY "tasks: update" ON public.tasks
  FOR UPDATE USING (tenant_id = public.my_tenant_id());

CREATE POLICY "tasks: delete" ON public.tasks
  FOR DELETE USING (tenant_id = public.my_tenant_id());
