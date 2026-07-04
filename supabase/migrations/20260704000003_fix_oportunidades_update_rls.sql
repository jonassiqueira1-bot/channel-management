-- Corrige 403 Forbidden ao fazer soft-delete (UPDATE deleted_at) em oportunidades
-- Garante GRANT explícito e recria a policy de UPDATE com WITH CHECK

-- Garante permissões para o role authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades TO authenticated;

-- Recria a policy de UPDATE incluindo WITH CHECK explícito
-- (sem WITH CHECK, o Supabase pode rejeitar rows onde deleted_at != null após a escrita)
DROP POLICY IF EXISTS "oportunidades: update" ON public.oportunidades;

CREATE POLICY "oportunidades: update" ON public.oportunidades
  FOR UPDATE
  USING (tenant_id = public.my_tenant_id())
  WITH CHECK (tenant_id = public.my_tenant_id());

NOTIFY pgrst, 'reload schema';
