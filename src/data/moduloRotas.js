// Rotas sempre liberadas pra qualquer usuário autenticado, checadas ANTES do
// bloqueio genérico de prefixo — autoatendimento da própria conta não deve
// depender de permissão de módulo nenhum.
const SEMPRE_LIBERADO = ['/my-account', '/settings/conta']

// Mapa rota → {modulo, acao} usado pelo bloqueio real de rota (ProtectedRoute.js).
// Rotas não listadas aqui (ex: /my-account) ficam sempre liberadas pra qualquer
// usuário autenticado.
export const MODULO_ROTAS = [
  { path: '/dashboard',        modulo: 'dashboard',        acao: 'visualizar' },
  { path: '/pipeline',         modulo: 'pipeline',         acao: 'visualizar' },
  { path: '/metas',            modulo: 'metas',            acao: 'visualizar' },
  { path: '/tarefas',          modulo: 'tarefas',          acao: 'visualizar' },
  { path: '/acoes',            modulo: 'acoes',            acao: 'visualizar' },
  { path: '/playbooks',        modulo: 'playbooks',        acao: 'visualizar' },
  { path: '/vendedores',       modulo: 'contatos_canais',  acao: 'visualizar' },
  { path: '/empresas',         modulo: 'empresas',         acao: 'visualizar' },
  { path: '/contatos',         modulo: 'contatos',         acao: 'visualizar' },
  { path: '/contratos',        modulo: 'contratos',        acao: 'visualizar' },
  { path: '/pagamentos',       modulo: 'pagamentos',       acao: 'visualizar' },
  { path: '/comissoes',        modulo: 'comissoes',        acao: 'visualizar' },
  { path: '/projetos',         modulo: 'projetos',         acao: 'visualizar' },
  { path: '/fechamento-horas', modulo: 'projetos',         acao: 'visualizar' },
  { path: '/customer-success', modulo: 'customer_success', acao: 'visualizar' },
  { path: '/questionarios',    modulo: 'questionarios',    acao: 'visualizar' },
  { path: '/documentos',       modulo: 'documentos',       acao: 'visualizar' },
  { path: '/campanhas',        modulo: 'campanhas',        acao: 'visualizar' },
  { path: '/parceiros',        modulo: 'parceiros',        acao: 'visualizar' },
  { path: '/franquias',        modulo: 'parceiros',        acao: 'visualizar' },
  { path: '/relatorios',       modulo: 'relatorios',       acao: 'visualizar' },
  { path: '/settings/empresa',              modulo: 'empresa',              acao: 'acessar' },
  { path: '/settings/assinatura',           modulo: 'assinatura',           acao: 'acessar' },
  { path: '/settings/franquias',            modulo: 'parceiros',            acao: 'visualizar' },
  { path: '/settings/maturidade-parceiros', modulo: 'maturidade_parceiros', acao: 'acessar' },
  { path: '/settings/usuarios',    modulo: 'usuarios',      acao: 'acessar' },
  { path: '/settings/perfis',      modulo: 'perfis',        acao: 'acessar' },
  { path: '/settings/equipes',     modulo: 'equipes',       acao: 'acessar' },
  { path: '/settings/habilitacoes', modulo: 'habilitacoes', acao: 'acessar' },
  { path: '/settings/produtos',     modulo: 'produtos',       acao: 'acessar' },
  { path: '/settings/tabela-precos', modulo: 'tabela_precos', acao: 'acessar' },
  { path: '/settings/funis',        modulo: 'funis',          acao: 'acessar' },
  { path: '/settings/tipos-acoes',  modulo: 'tipos_acoes',    acao: 'acessar' },
  { path: '/settings/campanhas',    modulo: 'campanhas',      acao: 'visualizar' },
  { path: '/settings/indicadores',  modulo: 'indicadores',    acao: 'acessar' },
  { path: '/settings/metas',        modulo: 'metas',          acao: 'visualizar' },
  { path: '/settings/compartilhamento', modulo: 'compartilhamento', acao: 'acessar' },
  { path: '/settings/forms',       modulo: 'forms',        acao: 'acessar' },
  { path: '/settings/alertas',     modulo: 'alertas',       acao: 'acessar' },
  { path: '/settings/integracoes', modulo: 'integracoes_cfg', acao: 'acessar' },
  { path: '/settings/logs',        modulo: 'logs',          acao: 'acessar' },
  { path: '/settings',         modulo: 'configuracoes',    acao: 'acessar' },
]

// Ordem de prioridade pra escolher a primeira rota permitida (pós-login/convite,
// ou quando o usuário tenta acessar algo bloqueado).
const PRIORIDADE = [
  '/dashboard', '/pipeline', '/tarefas', '/acoes', '/metas', '/playbooks',
  '/empresas', '/contatos', '/contratos', '/pagamentos', '/comissoes',
  '/projetos', '/customer-success', '/questionarios', '/documentos',
  '/campanhas', '/parceiros', '/vendedores', '/relatorios', '/settings',
]

export function findRotaPermissao(pathname) {
  if (SEMPRE_LIBERADO.some(p => pathname === p || pathname.startsWith(p + '/'))) return null
  // match por prefixo — cobre /settings/usuarios, /settings/perfis, etc.
  return MODULO_ROTAS.find(r => pathname === r.path || pathname.startsWith(r.path + '/'))
}

export function firstAllowedRoute(can) {
  for (const path of PRIORIDADE) {
    const rota = MODULO_ROTAS.find(r => r.path === path)
    if (rota && can(rota.modulo, rota.acao)) return path
  }
  return '/my-account'
}
