-- Projetos/Comissões: abas internas (Propostas/Recursos/Financeiro/Fechamento
-- em Projetos; "Regras de Configuração" em Comissões) não tinham controle de
-- acesso próprio — qualquer perfil que visse a tela via de tudo. Adiciona
-- ações granulares (ver_propostas/ver_recursos/ver_financeiro/ver_fechamento
-- em projetos; ver_regras em comissoes) e semeia os 2 novos perfis nativos
-- "Financeiro" e "Gestor de Projetos" pra quem já tem perfis_acesso cadastrado
-- (tenants novos já ganham isso automaticamente via seedNativos/JS).

-- ── Merge das novas ações nos perfis já existentes (preserva customizações) ──
UPDATE public.perfis_acesso
SET permissions = jsonb_set(
  permissions, '{projetos}',
  COALESCE(permissions->'projetos', '{}'::jsonb) || '{"ver_propostas":true,"ver_recursos":true,"ver_financeiro":true,"ver_fechamento":true}'::jsonb
)
WHERE slug = 'master';

UPDATE public.perfis_acesso
SET permissions = jsonb_set(
  permissions, '{comissoes}',
  COALESCE(permissions->'comissoes', '{}'::jsonb) || '{"ver_regras":true}'::jsonb
)
WHERE slug = 'master';

UPDATE public.perfis_acesso
SET permissions = jsonb_set(
  permissions, '{projetos}',
  COALESCE(permissions->'projetos', '{}'::jsonb) || '{"ver_propostas":true,"ver_recursos":true,"ver_financeiro":true,"ver_fechamento":true}'::jsonb
)
WHERE slug = 'gestor';

UPDATE public.perfis_acesso
SET permissions = jsonb_set(
  permissions, '{comissoes}',
  COALESCE(permissions->'comissoes', '{}'::jsonb) || '{"ver_regras":false}'::jsonb
)
WHERE slug = 'gestor';

UPDATE public.perfis_acesso
SET permissions = jsonb_set(
  permissions, '{projetos}',
  COALESCE(permissions->'projetos', '{}'::jsonb) || '{"ver_propostas":false,"ver_recursos":false,"ver_financeiro":false,"ver_fechamento":false}'::jsonb
)
WHERE slug = 'vendedor';

UPDATE public.perfis_acesso
SET permissions = jsonb_set(
  permissions, '{comissoes}',
  COALESCE(permissions->'comissoes', '{}'::jsonb) || '{"ver_regras":false}'::jsonb
)
WHERE slug = 'vendedor';

UPDATE public.perfis_acesso
SET permissions = jsonb_set(
  permissions, '{projetos}',
  COALESCE(permissions->'projetos', '{}'::jsonb) || '{"ver_propostas":false,"ver_recursos":false,"ver_financeiro":false,"ver_fechamento":false}'::jsonb
)
WHERE slug = 'parceiro';

UPDATE public.perfis_acesso
SET permissions = jsonb_set(
  permissions, '{comissoes}',
  COALESCE(permissions->'comissoes', '{}'::jsonb) || '{"ver_regras":false}'::jsonb
)
WHERE slug = 'parceiro';

-- ── Semeia os 2 novos perfis nativos pra cada tenant que já tem perfis_acesso ──
INSERT INTO public.perfis_acesso (tenant_id, slug, nome, nativo, cor, icon, descricao, permissions)
SELECT DISTINCT tenant_id, 'financeiro', 'Financeiro', true, '#B45309', 'CreditCard',
  'Pagamentos, comissões e financeiro de projetos.',
  '{
    "dashboard":{"visualizar":true,"ver_financeiro":true,"exportar":true,"apenas_proprios":false},
    "relatorios":{"visualizar":true,"exportar":true,"apenas_proprios":false},
    "pipeline":{"visualizar":true,"criar_editar":false,"excluir":false,"exportar":false,"importar":false,"ver_indicadores":true,"apenas_proprios":false},
    "metas":{"visualizar":false,"ver_equipe":false,"criar_editar":false,"apenas_proprios":false},
    "tarefas":{"visualizar":true,"ver_equipe":false,"criar_editar":false,"excluir":false,"apenas_proprios":true},
    "acoes":{"visualizar":true,"criar_editar":false,"excluir":false,"apenas_proprios":false},
    "playbooks":{"visualizar":false,"criar_editar":false,"excluir":false},
    "contatos_canais":{"visualizar":false,"criar_editar":false,"excluir":false,"exportar":false,"apenas_proprios":false},
    "empresas":{"visualizar":true,"criar_editar":false,"excluir":false,"ver_valores":true,"exportar":true,"apenas_proprios":false},
    "contatos":{"visualizar":true,"criar_editar":false,"excluir":false,"apenas_proprios":false},
    "contratos":{"visualizar":true,"criar_editar":false,"excluir":false,"ver_valores":true,"apenas_proprios":false},
    "pagamentos":{"visualizar":true,"criar_editar":true,"excluir":false,"ver_valores":true,"apenas_proprios":false},
    "comissoes":{"visualizar":true,"ver_equipe":true,"criar_editar":true,"ver_valores":true,"ver_regras":true,"apenas_proprios":false},
    "projetos":{"visualizar":true,"criar_editar":false,"excluir":false,"apenas_proprios":false,"ver_propostas":false,"ver_recursos":false,"ver_financeiro":true,"ver_fechamento":true},
    "customer_success":{"visualizar":false,"criar_editar":false,"apenas_proprios":false},
    "questionarios":{"visualizar":false,"criar_editar":false,"excluir":false},
    "documentos":{"visualizar":true,"criar_editar":false,"excluir":false,"exportar":true,"ver_indicadores":false,"apenas_proprios":false},
    "campanhas":{"visualizar":false,"criar_editar":false,"excluir":false},
    "parceiros":{"visualizar":false,"criar_editar":false,"excluir":false,"exportar":false},
    "configuracoes":{"acessar":false,"gerenciar_users":false,"gerenciar_perfis":false,"gerenciar_funis":false,"integracoes":false},
    "produtos":{"acessar":false,"criar_editar":false,"excluir":false},
    "funis":{"acessar":false,"criar_editar":false},
    "tabela_precos":{"acessar":true,"criar_editar":false},
    "equipes":{"acessar":false,"criar_editar":false,"excluir":false},
    "tipos_acoes":{"acessar":false,"criar_editar":false},
    "integracoes_cfg":{"acessar":false,"criar_editar":false},
    "alertas":{"acessar":false,"criar_editar":false},
    "habilitacoes":{"acessar":false,"criar_editar":false},
    "indicadores":{"acessar":false,"criar_editar":false},
    "perfis":{"acessar":false,"criar_editar":false},
    "usuarios":{"acessar":false,"criar_editar":false,"excluir":false},
    "empresa":{"acessar":false,"criar_editar":false},
    "forms":{"acessar":false,"criar_editar":false},
    "logs":{"acessar":false},
    "compartilhamento":{"acessar":false,"criar_editar":false},
    "assinatura":{"acessar":false},
    "maturidade_parceiros":{"acessar":false,"criar_editar":false}
  }'::jsonb
FROM public.perfis_acesso
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO public.perfis_acesso (tenant_id, slug, nome, nativo, cor, icon, descricao, permissions)
SELECT DISTINCT tenant_id, 'gestor_projetos', 'Gestor de Projetos', true, '#0E7490', 'FolderKanban',
  'Gestão operacional de projetos e implantações, sem acesso ao financeiro.',
  '{
    "dashboard":{"visualizar":true,"ver_financeiro":false,"exportar":false,"apenas_proprios":false},
    "relatorios":{"visualizar":true,"exportar":true,"apenas_proprios":false},
    "pipeline":{"visualizar":true,"criar_editar":false,"excluir":false,"exportar":false,"importar":false,"ver_indicadores":true,"apenas_proprios":false},
    "metas":{"visualizar":true,"ver_equipe":true,"criar_editar":false,"apenas_proprios":false},
    "tarefas":{"visualizar":true,"ver_equipe":true,"criar_editar":true,"excluir":false,"apenas_proprios":false},
    "acoes":{"visualizar":true,"criar_editar":true,"excluir":false,"apenas_proprios":false},
    "playbooks":{"visualizar":true,"criar_editar":false,"excluir":false},
    "contatos_canais":{"visualizar":false,"criar_editar":false,"excluir":false,"exportar":false,"apenas_proprios":false},
    "empresas":{"visualizar":true,"criar_editar":false,"excluir":false,"ver_valores":false,"exportar":false,"apenas_proprios":false},
    "contatos":{"visualizar":true,"criar_editar":false,"excluir":false,"apenas_proprios":false},
    "contratos":{"visualizar":true,"criar_editar":false,"excluir":false,"ver_valores":false,"apenas_proprios":false},
    "pagamentos":{"visualizar":false,"criar_editar":false,"excluir":false,"ver_valores":false,"apenas_proprios":false},
    "comissoes":{"visualizar":false,"ver_equipe":false,"criar_editar":false,"ver_valores":false,"ver_regras":false,"apenas_proprios":false},
    "projetos":{"visualizar":true,"criar_editar":true,"excluir":false,"apenas_proprios":false,"ver_propostas":true,"ver_recursos":true,"ver_financeiro":false,"ver_fechamento":true},
    "customer_success":{"visualizar":true,"criar_editar":true,"apenas_proprios":false},
    "questionarios":{"visualizar":true,"criar_editar":false,"excluir":false},
    "documentos":{"visualizar":true,"criar_editar":true,"excluir":false,"exportar":true,"ver_indicadores":false,"apenas_proprios":false},
    "campanhas":{"visualizar":false,"criar_editar":false,"excluir":false},
    "parceiros":{"visualizar":false,"criar_editar":false,"excluir":false,"exportar":false},
    "configuracoes":{"acessar":false,"gerenciar_users":false,"gerenciar_perfis":false,"gerenciar_funis":false,"integracoes":false},
    "produtos":{"acessar":false,"criar_editar":false,"excluir":false},
    "funis":{"acessar":false,"criar_editar":false},
    "tabela_precos":{"acessar":false,"criar_editar":false},
    "equipes":{"acessar":true,"criar_editar":false,"excluir":false},
    "tipos_acoes":{"acessar":false,"criar_editar":false},
    "integracoes_cfg":{"acessar":false,"criar_editar":false},
    "alertas":{"acessar":false,"criar_editar":false},
    "habilitacoes":{"acessar":false,"criar_editar":false},
    "indicadores":{"acessar":false,"criar_editar":false},
    "perfis":{"acessar":false,"criar_editar":false},
    "usuarios":{"acessar":false,"criar_editar":false,"excluir":false},
    "empresa":{"acessar":false,"criar_editar":false},
    "forms":{"acessar":false,"criar_editar":false},
    "logs":{"acessar":false},
    "compartilhamento":{"acessar":false,"criar_editar":false},
    "assinatura":{"acessar":false},
    "maturidade_parceiros":{"acessar":false,"criar_editar":false}
  }'::jsonb
FROM public.perfis_acesso
ON CONFLICT (tenant_id, slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';
