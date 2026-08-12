-- acao_membros (participantes de Ações, tabela criada em 20260717000002)
-- nunca foi adicionada à allowlist de soft_delete_record/records — remover um
-- participante sempre falhava com 403 "tabela não permitida: acao_membros".
-- Bug pré-existente, não relacionado ao trabalho desta sessão; só apareceu
-- agora porque foi testado. Reaplica a versão mais recente das duas funções
-- (a de 20260713000010, com as checagens de uso de goals/contracts/projects)
-- só acrescentando 'acao_membros' na allowlist. Também faltava a coluna
-- deleted_at em si (nunca existiu) e o filtro de RLS que a esconde depois de
-- soft-deletada — sem isso, o UPDATE feito pela RPC falharia (coluna
-- inexistente) e, mesmo corrigido, o participante removido continuaria
-- aparecendo na lista.
ALTER TABLE public.acao_membros ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP POLICY IF EXISTS soft_delete_filter ON public.acao_membros;
CREATE POLICY soft_delete_filter ON public.acao_membros AS RESTRICTIVE FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS no_hard_delete ON public.acao_membros;
CREATE POLICY no_hard_delete ON public.acao_membros AS RESTRICTIVE FOR DELETE USING (false);
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
    'partner_maturity_params','acao_membros'
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
    ) THEN
      RAISE EXCEPTION 'contrato possui provisões ou pagamentos registrados — exclusão bloqueada' USING ERRCODE = '42501';
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
    'partner_maturity_params','acao_membros'
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

NOTIFY pgrst, 'reload schema';
