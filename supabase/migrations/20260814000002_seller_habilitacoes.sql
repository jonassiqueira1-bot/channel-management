-- Habilitações hoje só se relacionam com Parceiros (partner_habilitacoes).
-- Nova tabela mirror pra relacionar habilitações a Contatos Canais (sellers)
-- individualmente, seguindo a mesma estrutura de partner_habilitacoes.
CREATE TABLE IF NOT EXISTS public.seller_habilitacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  seller_id      uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  habilitacao_id text NOT NULL,
  branch_id      uuid,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seller_habilitacoes_seller_id_idx ON public.seller_habilitacoes(seller_id);
CREATE INDEX IF NOT EXISTS seller_habilitacoes_tenant_id_idx ON public.seller_habilitacoes(tenant_id);

ALTER TABLE public.seller_habilitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_habilitacoes: select" ON public.seller_habilitacoes
  FOR SELECT
  USING (tenant_id = my_tenant_id());

-- Escrita restrita a admin_isv ou dono da filial — mesmo padrão já usado em
-- commission_rules/documents, evita repetir o "ALL para qualquer membro do
-- tenant" que partner_habilitacoes tem hoje.
CREATE POLICY "seller_habilitacoes: manage" ON public.seller_habilitacoes
  FOR ALL
  USING (tenant_id = my_tenant_id() AND (my_role() = 'admin_isv' OR branch_id = my_branch_id()))
  WITH CHECK (tenant_id = my_tenant_id() AND (my_role() = 'admin_isv' OR branch_id = my_branch_id()));
