-- ═══════════════════════════════════════════════════════════════════════════
-- Playbooks ativos: checklist de qualificação por etapa, ICP, vínculo
-- automático a Oportunidades (Funil/Produto/Categoria) e pesos de
-- Segmento/Porte. Checklist/ICP/pesos vivem em playbooks.custom_fields
-- (padrão dinâmico já usado pelo hook usePlaybooks.js) — só as peças que
-- precisam ser filtráveis/estáveis viram schema real:
--   1) product_categories — tira "Categoria de Produto" do localStorage
--      (não compartilhado entre usuários) e coloca no banco, por tenant.
--   2) companies.porte / receita_faixa — já existiam na tela de Empresas
--      mas useCompanies.js nunca gravava esses dois campos (bug pré-existente).
--   3) oportunidades.qualificacao_score / playbook_ids / checklist_respostas.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  UNIQUE (tenant_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON public.product_categories (tenant_id);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_categories: view"   ON public.product_categories;
DROP POLICY IF EXISTS "product_categories: manage" ON public.product_categories;
DROP POLICY IF EXISTS "soft_delete_filter"          ON public.product_categories;
DROP POLICY IF EXISTS no_hard_delete                ON public.product_categories;
CREATE POLICY "product_categories: view" ON public.product_categories
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "product_categories: manage" ON public.product_categories
  FOR ALL USING (tenant_id = public.my_tenant_id())
  WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "soft_delete_filter" ON public.product_categories
  AS RESTRICTIVE FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY no_hard_delete ON public.product_categories
  AS RESTRICTIVE FOR DELETE USING (false);

-- ── Fix: porte/receita_faixa existiam só na UI de Empresas, nunca persistiam
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS porte text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS receita_faixa text;

-- ── Qualificação + vínculo múltiplo de playbooks na oportunidade
ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS qualificacao_score numeric DEFAULT 0;
ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS playbook_ids uuid[] DEFAULT '{}';
ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS checklist_respostas jsonb DEFAULT '{}';

-- ── product_categories entra na allowlist do soft_delete_record genérico
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
    'partner_maturity_params','product_categories'
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

GRANT EXECUTE ON FUNCTION public.soft_delete_record TO authenticated;

NOTIFY pgrst, 'reload schema';
