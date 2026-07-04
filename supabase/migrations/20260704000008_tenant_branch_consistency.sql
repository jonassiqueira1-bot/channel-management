-- ─── 1. Trigger: cria Matriz automaticamente ao criar um novo tenant ──────────
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.tenant_branches (tenant_id, name, custom_fields, ativo)
  VALUES (
    NEW.id,
    NEW.name,
    '{"is_matriz": true}'::jsonb,
    true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tenant_created_matriz ON public.tenants;
CREATE TRIGGER on_tenant_created_matriz
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();

-- ─── 2. Trigger: atribui Matriz ao perfil quando branch_id for null ────────────
CREATE OR REPLACE FUNCTION public.handle_profile_branch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_branch uuid;
BEGIN
  IF NEW.branch_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    -- Tenta pegar a Matriz primeiro
    SELECT id INTO v_branch
      FROM public.tenant_branches
      WHERE tenant_id = NEW.tenant_id
        AND (custom_fields->>'is_matriz')::boolean = true
        AND ativo = true
      LIMIT 1;

    -- Se não tiver Matriz, pega a primeira filial ativa
    IF v_branch IS NULL THEN
      SELECT id INTO v_branch
        FROM public.tenant_branches
        WHERE tenant_id = NEW.tenant_id AND ativo = true
        ORDER BY created_at
        LIMIT 1;
    END IF;

    NEW.branch_id := v_branch;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_branch_assign ON public.profiles;
CREATE TRIGGER on_profile_branch_assign
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_branch();

-- ─── 3. Função helper: retorna o branch_id padrão do tenant ──────────────────
-- Usada pela aplicação antes de inserir qualquer registro
CREATE OR REPLACE FUNCTION public.get_default_branch_id(p_tenant_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.tenant_branches
  WHERE tenant_id = p_tenant_id
    AND (custom_fields->>'is_matriz')::boolean = true
    AND ativo = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_tenant()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_profile_branch()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_branch_id(uuid)        TO authenticated;
