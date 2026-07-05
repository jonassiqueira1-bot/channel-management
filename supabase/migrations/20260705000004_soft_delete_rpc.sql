-- ═══════════════════════════════════════════════════════════════════════════
-- RPC genérica para soft-delete
--
-- Problema: PATCH para setar deleted_at falha com 403 no PostgREST porque
-- após o UPDATE o row some da SELECT policy (deleted_at IS NULL),
-- e o PostgREST interpreta isso como violação de RLS.
--
-- Solução: função SECURITY DEFINER que bypassa RLS, valida permissão
-- internamente e executa o UPDATE diretamente.
-- ═══════════════════════════════════════════════════════════════════════════

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
    'alert_rules','pipeline_stages'
  ];
  v_tenant_id uuid;
BEGIN
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'tabela não permitida: %', p_table USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    'UPDATE %I SET deleted_at = now() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    p_table
  ) USING p_id, v_tenant_id;
END;
$$;

-- Versão bulk (para exclusão de múltiplos registros)
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
    'alert_rules','pipeline_stages'
  ];
  v_tenant_id uuid;
BEGIN
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'tabela não permitida: %', p_table USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
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
