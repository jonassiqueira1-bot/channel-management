-- Tabela de Preços: histórico de reajustes de produtos, aplicado sob demanda em products.preco.
-- Contratos/Oportunidades já copiam o preço no momento do cadastro (custom_fields.itens) e
-- não são afetados por mudanças futuras aqui.

CREATE TABLE IF NOT EXISTS public.tabela_precos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  produto_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  routine_id      uuid REFERENCES public.routines(id) ON DELETE SET NULL,
  preco           numeric(14,2) NOT NULL,
  preco_anterior  numeric(14,2),
  percentual      numeric(6,3),
  indice          text,
  vigencia_inicio date NOT NULL DEFAULT CURRENT_DATE,
  observacoes     text,
  aplicado_em     timestamptz,
  criado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tabela_precos_produto ON public.tabela_precos(produto_id, vigencia_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_tabela_precos_tenant  ON public.tabela_precos(tenant_id);

ALTER TABLE public.tabela_precos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tabela_precos: view"   ON public.tabela_precos;
DROP POLICY IF EXISTS "tabela_precos: manage" ON public.tabela_precos;

CREATE POLICY "tabela_precos: view" ON public.tabela_precos FOR SELECT
  USING (tenant_id = public.my_tenant_id());

CREATE POLICY "tabela_precos: manage" ON public.tabela_precos FOR ALL
  USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabela_precos TO authenticated;

-- Propaga os preços vigentes (última linha com vigencia_inicio <= hoje, por produto) para products.preco.
-- Idempotente: rodar de novo sem novidades não altera nada.
CREATE OR REPLACE FUNCTION public.aplicar_atualizacao_precos(p_tenant_id uuid)
RETURNS TABLE(produto_id uuid, produto_nome text, preco_anterior numeric, preco_novo numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _mudancas (produto_id uuid, produto_nome text, preco_anterior numeric, preco_novo numeric) ON COMMIT DROP;
  TRUNCATE _mudancas;

  INSERT INTO _mudancas
  SELECT pr.id, pr.nome, pr.preco, v.preco
  FROM public.products pr
  JOIN (
    SELECT DISTINCT ON (tp.produto_id) tp.produto_id, tp.preco
    FROM public.tabela_precos tp
    WHERE tp.tenant_id = p_tenant_id AND tp.vigencia_inicio <= CURRENT_DATE
    ORDER BY tp.produto_id, tp.vigencia_inicio DESC, tp.created_at DESC
  ) v ON v.produto_id = pr.id
  WHERE pr.tenant_id = p_tenant_id AND pr.preco IS DISTINCT FROM v.preco;

  UPDATE public.products pr SET preco = m.preco_novo, updated_at = now()
  FROM _mudancas m WHERE pr.id = m.produto_id;

  UPDATE public.tabela_precos tp SET aplicado_em = now()
  WHERE tp.tenant_id = p_tenant_id AND tp.vigencia_inicio <= CURRENT_DATE AND tp.aplicado_em IS NULL;

  RETURN QUERY SELECT * FROM _mudancas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aplicar_atualizacao_precos(uuid) TO authenticated;
