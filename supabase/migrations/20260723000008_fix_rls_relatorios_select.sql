-- relatorios_select tem lógica extra (papéis/acesso), não é o padrão
-- genérico das outras ~27 tabelas — atualizada à parte, mesma correção de
-- performance: passa a filial do usuário já calculada pro
-- can_see_branch_record em vez de deixar a função buscar sozinha por linha.
DROP POLICY IF EXISTS "relatorios_select" ON public.relatorios;

CREATE POLICY "relatorios_select" ON public.relatorios
  FOR SELECT USING (
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1) = tenant_id
    AND public.can_see_branch_record(branch_id, id, 'relatorios', (SELECT public.my_branch_id()), (SELECT public.my_branch_ids()))
    AND deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin_isv'
      OR acesso = 'todos'
      OR (acesso = 'equipe' AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = ANY(papeis_permitidos)
      ))
    )
  );
