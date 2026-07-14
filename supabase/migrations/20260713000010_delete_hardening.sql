-- ═══════════════════════════════════════════════════════════════════════════
-- Segurança de dados: nenhum registro cadastral pode ser fisicamente excluído
-- do sistema, e alguns (Metas com realização, Contratos com provisões ou
-- pagamentos, Projetos que geraram comissão) não podem nem ser soft-deletados
-- fora das regras abaixo.
--
-- Estratégia em 3 camadas:
--   1) Piso no banco: RESTRICTIVE ... FOR DELETE USING (false) em toda tabela
--      cadastral — bloqueia DELETE físico via API/SQL direto pra QUALQUER
--      papel, inclusive admin_isv. Antes disso, várias tabelas tinham policy
--      FOR DELETE permissiva pra admin_isv que sobrevivia ao soft-delete da
--      aplicação (bypass possível via chamada direta à API REST).
--   2) soft_delete_record/records ganham checagem de "já foi usado" pras 3
--      entidades citadas explicitamente, bloqueando a exclusão (mesmo soft)
--      quando a regra não é satisfeita.
--   3) Tabelas que ainda não tinham deleted_at (profiles, tabela_precos,
--      partner_maturity_params) ganham a coluna + policy de filtro, e entram
--      na allowlist da RPC — corrige também o bug em useProvisoes.js, que já
--      chamava softDelete('provisoes', id) mas 'provisoes' não estava na
--      allowlist (a chamada falhava em runtime).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) Colunas de soft-delete que faltavam ───────────────────────────────────
ALTER TABLE public.profiles                ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.tabela_precos           ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.partner_maturity_params ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP POLICY IF EXISTS soft_delete_filter ON public.profiles;
CREATE POLICY soft_delete_filter ON public.profiles AS RESTRICTIVE FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS soft_delete_filter ON public.tabela_precos;
CREATE POLICY soft_delete_filter ON public.tabela_precos AS RESTRICTIVE FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS soft_delete_filter ON public.partner_maturity_params;
CREATE POLICY soft_delete_filter ON public.partner_maturity_params AS RESTRICTIVE FOR SELECT USING (deleted_at IS NULL);

-- ── 2) soft_delete_record / soft_delete_records: allowlist ampliada + guarda
--       de uso pra goals/contracts/projects ──────────────────────────────────
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
    'partner_maturity_params'
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

  -- Metas já com realização confirmada: só admin_isv pode excluir.
  IF p_table = 'goals' AND v_role <> 'admin_isv' THEN
    IF EXISTS (SELECT 1 FROM goals WHERE id = p_id AND tenant_id = v_tenant_id AND valor_atual > 0) THEN
      RAISE EXCEPTION 'meta já possui realização registrada — apenas administradores podem excluir' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Contratos com provisões ou pagamentos vinculados: bloqueado pra todos.
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

  -- Projetos que já geraram comissão (via a oportunidade vinculada): só admin_isv.
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
    'partner_maturity_params'
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

  -- Reaproveita a checagem individual (goals/contracts/projects) por item,
  -- ao invés de duplicar a lógica de uso aqui.
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

-- ── 3) Piso: bloqueia DELETE físico pra sempre, em qualquer papel ───────────
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'companies','contacts','products','projects','contracts','payments',
    'actions','sellers','goals','customer_health','habilitacoes','tipos_acao',
    'campanhas','parceiros','perfis_acesso','equipes','documents','tasks',
    'playbooks','questionnaire_templates','questionnaire_submissions',
    'oportunidades','provisoes','tabela_precos','profiles',
    'partner_maturity_params','commission_rules','commission_payments'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('DROP POLICY IF EXISTS no_hard_delete ON public.%I', t);
    EXECUTE format('CREATE POLICY no_hard_delete ON public.%I AS RESTRICTIVE FOR DELETE USING (false)', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
