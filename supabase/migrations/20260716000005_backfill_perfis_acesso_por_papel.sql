-- Backfill: perfis (profiles) sem nenhum Perfil de Acesso atribuído
-- (perfis_acesso_ids vazio) ficam sem acesso a qualquer módulo mesmo logados
-- normalmente — mesmo bug corrigido manualmente pro usuário de teste. Atribui
-- o Perfil de Acesso nativo esperado pro Papel (mesmo mapeamento de
-- PAPEL_PERFIL_ESPERADO em src/data/mockPerfis.js e invite-user).
UPDATE public.profiles p
SET perfis_acesso_ids = to_jsonb(ARRAY[pa.id::text])
FROM public.perfis_acesso pa
WHERE pa.tenant_id = p.tenant_id
  AND pa.deleted_at IS NULL
  AND pa.slug = CASE p.role
    WHEN 'admin_isv'     THEN 'master'
    WHEN 'vendedor'      THEN 'vendedor'
    WHEN 'financeiro'    THEN 'financeiro'
    WHEN 'projetos'      THEN 'gestor_projetos'
    WHEN 'contato_canal' THEN 'parceiro'
  END
  AND (p.perfis_acesso_ids IS NULL OR p.perfis_acesso_ids = '[]'::jsonb OR jsonb_array_length(p.perfis_acesso_ids) = 0);

NOTIFY pgrst, 'reload schema';
