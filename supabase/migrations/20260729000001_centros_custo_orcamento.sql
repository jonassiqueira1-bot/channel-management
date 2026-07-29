-- ═══════════════════════════════════════════════════════════════════════════
-- Governança financeira/gerencial: Centro de Custo (cadastro simples, em
-- Configurações) + Orçamento (planejado x realizado por centro/período,
-- restrito a admin_isv). Produtos, Comissões (regras), Campanhas, Ações,
-- Projetos e Usuários passam a poder se vincular a um centro de custo
-- (guardado em custom_fields de cada um — não altera schema deles).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.centros_custo (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL,
  nome        text        NOT NULL,
  descricao   text,
  status      text        NOT NULL DEFAULT 'ativo',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_centros_custo_tenant ON public.centros_custo (tenant_id);

DROP TRIGGER IF EXISTS trg_centros_custo_updated_at ON public.centros_custo;
CREATE TRIGGER trg_centros_custo_updated_at
  BEFORE UPDATE ON public.centros_custo
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "centros_custo: select" ON public.centros_custo;
DROP POLICY IF EXISTS "centros_custo: manage" ON public.centros_custo;
DROP POLICY IF EXISTS "centros_custo: delete" ON public.centros_custo;

-- Cadastro simples, tenant inteiro (não é por filial) — qualquer usuário
-- autenticado do tenant enxerga; só admin_isv cria/edita.
CREATE POLICY "centros_custo: select" ON public.centros_custo
  FOR SELECT USING (tenant_id = (SELECT public.my_tenant_id()) AND deleted_at IS NULL);

CREATE POLICY "centros_custo: manage" ON public.centros_custo
  FOR ALL USING (tenant_id = (SELECT public.my_tenant_id()) AND public.my_role() = 'admin_isv')
  WITH CHECK (tenant_id = (SELECT public.my_tenant_id()) AND public.my_role() = 'admin_isv');

CREATE POLICY "centros_custo: delete" ON public.centros_custo AS RESTRICTIVE FOR DELETE USING (false);

GRANT SELECT, INSERT, UPDATE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;

-- ─── Orçamento ────────────────────────────────────────────────────────────
-- Planejado por centro de custo + competência (mês). O realizado NÃO fica
-- armazenado aqui — é calculado em tempo real cruzando Campanhas/Ações/
-- Projetos (que já têm custo próprio) filtrados por centro_custo_id.
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL,
  branch_id       uuid,
  centro_custo_id uuid        NOT NULL REFERENCES public.centros_custo(id) ON DELETE CASCADE,
  competencia     date        NOT NULL, -- sempre dia 01 do mês de referência
  valor_planejado numeric(14,2) NOT NULL DEFAULT 0,
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,

  UNIQUE (tenant_id, centro_custo_id, competencia)
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_tenant ON public.orcamentos (tenant_id, competencia DESC);

DROP TRIGGER IF EXISTS trg_orcamentos_updated_at ON public.orcamentos;
CREATE TRIGGER trg_orcamentos_updated_at
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orcamentos: select" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos: manage" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos: delete" ON public.orcamentos;

-- Restrito a admin_isv — ver e mexer (é o módulo financeiro/compliance).
CREATE POLICY "orcamentos: select" ON public.orcamentos
  FOR SELECT USING (
    tenant_id = (SELECT public.my_tenant_id()) AND public.my_role() = 'admin_isv' AND deleted_at IS NULL
  );

CREATE POLICY "orcamentos: manage" ON public.orcamentos
  FOR ALL USING (tenant_id = (SELECT public.my_tenant_id()) AND public.my_role() = 'admin_isv')
  WITH CHECK (tenant_id = (SELECT public.my_tenant_id()) AND public.my_role() = 'admin_isv');

CREATE POLICY "orcamentos: delete" ON public.orcamentos AS RESTRICTIVE FOR DELETE USING (false);

GRANT SELECT, INSERT, UPDATE ON public.orcamentos TO authenticated;
GRANT ALL ON public.orcamentos TO service_role;

-- ─── Soft-delete: inclui as duas tabelas novas na allowlist genérica ───────
CREATE OR REPLACE FUNCTION public.soft_delete_record(p_table text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'companies','contacts','opportunities','products','projects',
    'contracts','payments','actions','sellers','goals','customer_health',
    'habilitacoes','tipos_acao','campanhas','parceiros','perfis_acesso',
    'equipes','documents','tasks','playbooks','questionnaire_templates',
    'questionnaire_submissions','commission_rules','commission_payments',
    'commission_personas','oportunidade_membros','relatorios',
    'alert_rules','pipeline_stages','provisoes','tabela_precos','profiles',
    'partner_maturity_params','faturas','centros_custo','orcamentos'
  ];
  v_tenant_id uuid;
  v_role text;
  v_oportunidade_id uuid;
BEGIN
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'tabela não permitida: %', p_table USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id, role INTO v_tenant_id, v_role FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_table = 'goals' AND v_role <> 'admin_isv' THEN
    IF EXISTS (SELECT 1 FROM goals WHERE id = p_id AND tenant_id = v_tenant_id AND valor_atual > 0) THEN
      RAISE EXCEPTION 'meta já possui realização registrada — apenas administradores podem excluir' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_table = 'contracts' THEN
    SELECT oportunidade_id INTO v_oportunidade_id FROM contracts WHERE id = p_id AND tenant_id = v_tenant_id;
    IF EXISTS (
      SELECT 1 FROM payments p WHERE p.tenant_id = v_tenant_id AND p.deleted_at IS NULL
        AND p.oportunidade_id = v_oportunidade_id
      UNION ALL
      SELECT 1 FROM provisoes pr JOIN contracts c ON c.id = p_id
        WHERE pr.tenant_id = v_tenant_id AND pr.company_id = c.company_id
      UNION ALL
      SELECT 1 FROM faturas f WHERE f.tenant_id = v_tenant_id AND f.deleted_at IS NULL AND f.contract_id = p_id
    ) THEN
      RAISE EXCEPTION 'contrato possui provisões, faturas ou pagamentos registrados — exclusão bloqueada' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_table = 'projects' AND v_role <> 'admin_isv' THEN
    SELECT oportunidade_id INTO v_oportunidade_id FROM projects WHERE id = p_id AND tenant_id = v_tenant_id;
    IF v_oportunidade_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM commission_rules cr WHERE cr.tenant_id = v_tenant_id AND cr.deleted_at IS NULL
        AND cr.oportunidade_id = v_oportunidade_id
    ) THEN
      RAISE EXCEPTION 'projeto já gerou comissão — apenas administradores podem excluir' USING ERRCODE = '42501';
    END IF;
  END IF;

  EXECUTE format(
    'UPDATE %I SET deleted_at = now() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    p_table
  ) USING p_id, v_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_records(p_table text, p_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'companies','contacts','opportunities','products','projects',
    'contracts','payments','actions','sellers','goals','customer_health',
    'habilitacoes','tipos_acao','campanhas','parceiros','perfis_acesso',
    'equipes','documents','tasks','playbooks','questionnaire_templates',
    'questionnaire_submissions','commission_rules','commission_payments',
    'commission_personas','oportunidade_membros','relatorios',
    'alert_rules','pipeline_stages','provisoes','tabela_precos','profiles',
    'partner_maturity_params','faturas','centros_custo','orcamentos'
  ];
  v_tenant_id uuid;
  v_id uuid;
BEGIN
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'tabela não permitida: %', p_table USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_table IN ('goals', 'contracts', 'projects') THEN
    FOREACH v_id IN ARRAY p_ids LOOP
      PERFORM public.soft_delete_record(p_table, v_id);
    END LOOP;
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE %I SET deleted_at = now() WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL',
    p_table
  ) USING p_ids, v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_record  TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_records TO authenticated;
