-- Adiciona coluna ativo em tenant_branches
ALTER TABLE public.tenant_branches
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- RPC: desativa se tiver dados vinculados, exclui se não tiver
-- Retorna 'deleted' ou 'deactivated'
CREATE OR REPLACE FUNCTION public.delete_or_deactivate_branch(p_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_caller_tenant uuid;
  v_count         bigint := 0;
BEGIN
  SELECT tenant_id INTO v_caller_tenant
    FROM public.profiles WHERE id = auth.uid() LIMIT 1;

  IF v_caller_tenant IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;

  -- Verifica se há dados vinculados a esta filial nas principais tabelas
  SELECT COUNT(*) INTO v_count FROM (
    (SELECT 1 FROM public.oportunidades    WHERE branch_id = p_id LIMIT 1) UNION ALL
    (SELECT 1 FROM public.companies        WHERE branch_id = p_id LIMIT 1) UNION ALL
    (SELECT 1 FROM public.contacts         WHERE branch_id = p_id LIMIT 1) UNION ALL
    (SELECT 1 FROM public.tarefas          WHERE branch_id = p_id LIMIT 1) UNION ALL
    (SELECT 1 FROM public.acoes            WHERE branch_id = p_id LIMIT 1) UNION ALL
    (SELECT 1 FROM public.projects         WHERE branch_id = p_id LIMIT 1) UNION ALL
    (SELECT 1 FROM public.contracts        WHERE branch_id = p_id LIMIT 1) UNION ALL
    (SELECT 1 FROM public.commission_rules WHERE branch_id = p_id LIMIT 1) UNION ALL
    (SELECT 1 FROM public.customer_health  WHERE branch_id = p_id LIMIT 1) UNION ALL
    (SELECT 1 FROM public.playbooks        WHERE branch_id = p_id LIMIT 1)
  ) sub;

  IF v_count > 0 THEN
    UPDATE public.tenant_branches
      SET ativo = false
      WHERE id = p_id AND tenant_id = v_caller_tenant;
    RETURN 'deactivated';
  ELSE
    DELETE FROM public.tenant_branches
      WHERE id = p_id AND tenant_id = v_caller_tenant;
    RETURN 'deleted';
  END IF;
END;
$$;

-- RPC: reativa filial desativada
CREATE OR REPLACE FUNCTION public.reactivate_branch(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_caller_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_caller_tenant
    FROM public.profiles WHERE id = auth.uid() LIMIT 1;

  UPDATE public.tenant_branches
    SET ativo = true
    WHERE id = p_id AND tenant_id = v_caller_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_or_deactivate_branch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_branch(uuid) TO authenticated;
