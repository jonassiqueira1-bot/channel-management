-- Em prod, oportunidades é VIEW sobre a tabela real opportunities (dev tem
-- oportunidades como tabela base — por isso esse arquivo só age quando for
-- view). As colunas de Qualificação (20260714000001/000002) foram
-- adicionadas em opportunities, mas a view listava colunas explicitamente
-- (sem SELECT *), então continuavam invisíveis pra API/app até recriar a view.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='oportunidades' AND table_type='VIEW'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.oportunidades AS
      SELECT id, tenant_id, branch_id, company_id, contact_id, stage_id, owner_id,
             titulo, valor, situacao, origem, prazo, responsavel, descricao, motivo_perda,
             custom_fields, created_at, updated_at, seller_id, funil_id, itens, deleted_at,
             qualificacao_score, playbook_ids, checklist_respostas, qualificacao_desqualificada
      FROM public.opportunities
    ';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
