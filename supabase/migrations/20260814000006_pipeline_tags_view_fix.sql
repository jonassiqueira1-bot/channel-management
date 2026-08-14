-- Em produção "oportunidades" é uma VIEW sobre a tabela real "opportunities"
-- (drift de nomenclatura antigo, documentado no projeto) — a migration
-- anterior (20260814000005) tentou ALTER TABLE direto em "oportunidades" e
-- falhou lá com "cannot ALTER a view" (funcionou normal em dev, onde
-- "oportunidades" já é a tabela real). Essa migration cobre os dois casos:
-- se "oportunidades" já é tabela real, não faz nada (tag_ids já existe);
-- se é view sobre "opportunities", adiciona a coluna na tabela real e
-- recria a view incluindo tag_ids.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'oportunidades' AND table_type = 'BASE TABLE'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'opportunities' AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS tag_ids uuid[] DEFAULT '{}';

    EXECUTE '
      CREATE OR REPLACE VIEW public.oportunidades AS
      SELECT id, tenant_id, branch_id, company_id, contact_id, stage_id, owner_id, titulo, valor,
        situacao, origem, prazo, responsavel, descricao, motivo_perda, custom_fields, created_at,
        updated_at, seller_id, funil_id, itens, deleted_at, qualificacao_score, playbook_ids,
        checklist_respostas, qualificacao_desqualificada, tag_ids
      FROM public.opportunities
    ';
  END IF;
END $$;
