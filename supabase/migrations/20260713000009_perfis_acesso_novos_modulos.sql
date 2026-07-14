-- Backfill dos 17 módulos novos (Produtos, Funis, Tabela de Preços, Equipes,
-- Tipos de Ações, Integrações, Alertas, Habilitações, Indicadores, Perfis,
-- Usuários, Empresa, Config. de Campos, Logs, Compartilhamento, Assinatura,
-- Maturidade Parceiros) nos perfis de acesso nativos já existentes no banco.
--
-- Sem isso, tenants que já tinham as 4 linhas nativas em perfis_acesso (criadas
-- antes desta sessão) nunca ganhariam as novas chaves — usePerfisAcesso.js só
-- roda o seed completo quando a tabela está vazia. Aqui fazemos merge via ||
-- (jsonb), sem sobrescrever nenhuma permissão já configurada manualmente pelo
-- usuário nos módulos existentes.

UPDATE public.perfis_acesso
SET permissions = permissions || jsonb_build_object(
  'produtos',            jsonb_build_object('acessar', true, 'criar_editar', true, 'excluir', true),
  'funis',               jsonb_build_object('acessar', true, 'criar_editar', true),
  'tabela_precos',       jsonb_build_object('acessar', true, 'criar_editar', true),
  'equipes',             jsonb_build_object('acessar', true, 'criar_editar', true, 'excluir', true),
  'tipos_acoes',         jsonb_build_object('acessar', true, 'criar_editar', true),
  'integracoes_cfg',     jsonb_build_object('acessar', true, 'criar_editar', true),
  'alertas',             jsonb_build_object('acessar', true, 'criar_editar', true),
  'habilitacoes',        jsonb_build_object('acessar', true, 'criar_editar', true),
  'indicadores',         jsonb_build_object('acessar', true, 'criar_editar', true),
  'perfis',              jsonb_build_object('acessar', true, 'criar_editar', true),
  'usuarios',            jsonb_build_object('acessar', true, 'criar_editar', true, 'excluir', true),
  'empresa',             jsonb_build_object('acessar', true, 'criar_editar', true),
  'forms',               jsonb_build_object('acessar', true, 'criar_editar', true),
  'logs',                jsonb_build_object('acessar', true),
  'compartilhamento',    jsonb_build_object('acessar', true, 'criar_editar', true),
  'assinatura',          jsonb_build_object('acessar', true),
  'maturidade_parceiros',jsonb_build_object('acessar', true, 'criar_editar', true)
)
WHERE slug = 'master';

-- Gestor: acesso operacional aos novos módulos, exceto os administrativos
-- (perfis/usuarios/empresa/assinatura/integracoes/logs ficam restritos a Master).
UPDATE public.perfis_acesso
SET permissions = permissions || jsonb_build_object(
  'produtos',            jsonb_build_object('acessar', true, 'criar_editar', true, 'excluir', false),
  'funis',               jsonb_build_object('acessar', true, 'criar_editar', true),
  'tabela_precos',       jsonb_build_object('acessar', true, 'criar_editar', false),
  'equipes',             jsonb_build_object('acessar', true, 'criar_editar', true, 'excluir', false),
  'tipos_acoes',         jsonb_build_object('acessar', true, 'criar_editar', true),
  'integracoes_cfg',     jsonb_build_object('acessar', false, 'criar_editar', false),
  'alertas',             jsonb_build_object('acessar', true, 'criar_editar', true),
  'habilitacoes',        jsonb_build_object('acessar', true, 'criar_editar', true),
  'indicadores',         jsonb_build_object('acessar', true, 'criar_editar', true),
  'perfis',              jsonb_build_object('acessar', false, 'criar_editar', false),
  'usuarios',            jsonb_build_object('acessar', true, 'criar_editar', true, 'excluir', false),
  'empresa',             jsonb_build_object('acessar', false, 'criar_editar', false),
  'forms',               jsonb_build_object('acessar', true, 'criar_editar', true),
  'logs',                jsonb_build_object('acessar', false),
  'compartilhamento',    jsonb_build_object('acessar', true, 'criar_editar', false),
  'assinatura',          jsonb_build_object('acessar', false),
  'maturidade_parceiros',jsonb_build_object('acessar', true, 'criar_editar', true)
)
WHERE slug = 'gestor';

-- Vendedor e Parceiro: sem acesso a nenhum módulo de configuração (mesmo padrão
-- de deny-by-default que já valia pros módulos antigos nesses dois perfis).
UPDATE public.perfis_acesso
SET permissions = permissions || jsonb_build_object(
  'produtos', jsonb_build_object('acessar', false), 'funis', jsonb_build_object('acessar', false),
  'tabela_precos', jsonb_build_object('acessar', false), 'equipes', jsonb_build_object('acessar', false),
  'tipos_acoes', jsonb_build_object('acessar', false), 'integracoes_cfg', jsonb_build_object('acessar', false),
  'alertas', jsonb_build_object('acessar', false), 'habilitacoes', jsonb_build_object('acessar', false),
  'indicadores', jsonb_build_object('acessar', false), 'perfis', jsonb_build_object('acessar', false),
  'usuarios', jsonb_build_object('acessar', false), 'empresa', jsonb_build_object('acessar', false),
  'forms', jsonb_build_object('acessar', false), 'logs', jsonb_build_object('acessar', false),
  'compartilhamento', jsonb_build_object('acessar', false), 'assinatura', jsonb_build_object('acessar', false),
  'maturidade_parceiros', jsonb_build_object('acessar', false)
)
WHERE slug IN ('vendedor', 'parceiro');
