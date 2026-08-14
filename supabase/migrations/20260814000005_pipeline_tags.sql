-- Tags de Pipeline: cadastro simples (nome + cor + descrição opcional) pra
-- destacar campanha/origem/qualquer coisa relevante em Kanban e Lista de
-- oportunidades. Cadastradas direto na tela de Pipeline (sem tela própria em
-- Configurações). Relação com oportunidades via array (mesmo padrão já usado
-- em oportunidades.playbook_ids), não junction table.

CREATE TABLE IF NOT EXISTS public.tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  branch_id  uuid,
  nome       text NOT NULL,
  cor        text NOT NULL DEFAULT '#6B7280',
  descricao  text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS tags_tenant_id_idx ON public.tags(tenant_id);

-- "oportunidades" é tabela real na maioria dos ambientes, mas em produção é
-- uma VIEW sobre "opportunities" (drift de nomenclatura antigo) — ALTER
-- TABLE numa view falha. Só roda aqui quando for tabela de verdade; o caso
-- de view é coberto separadamente pela migration 20260814000006.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'oportunidades' AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS tag_ids uuid[] DEFAULT '{}';
  END IF;
END $$;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags: select" ON public.tags
  FOR SELECT
  USING (tenant_id = my_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "tags: manage" ON public.tags
  FOR ALL
  USING (tenant_id = my_tenant_id() AND (my_role() = 'admin_isv' OR branch_id = my_branch_id()))
  WITH CHECK (tenant_id = my_tenant_id() AND (my_role() = 'admin_isv' OR branch_id = my_branch_id()));

CREATE POLICY "tags: no_hard_delete" ON public.tags
  FOR DELETE
  USING (false);

-- Sem GRANT explícito, RLS sozinha não libera nada pro role authenticated
-- (mesmo problema encontrado em seller_habilitacoes nesta sessão).
GRANT SELECT, INSERT, UPDATE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tags TO service_role;
