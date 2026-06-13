// Dados mock compartilhados entre Produtos e Contratos
// Em produção: SELECT * FROM produtos WHERE organization_id = ?

export const MOCK_PRODUTOS = [
  {
    id: 1, nome: 'Canal NG Pro', codigo: 'CNG-PRO', tipo: 'saas', categoria: 'CRM',
    descricao: 'Plataforma completa de gestão de canal de vendas com pipeline, metas e comissões.',
    status: 'ativo', cobranca: 'mensal', preco: 890, setup: 2500, desconto_max: 20,
    unidades_incluidas: 1, usuarios_incluidos: 10,
    features: 'Pipeline Kanban\nGestão de metas\nComissões automáticas\nRelatorios avançados\nAPI REST',
    visivel_canal: true, criado: '2023-06-01', contratos: 14,
  },
  {
    id: 2, nome: 'Canal NG Starter', codigo: 'CNG-STR', tipo: 'saas', categoria: 'CRM',
    descricao: 'Versão de entrada ideal para equipes pequenas que estão começando.',
    status: 'ativo', cobranca: 'mensal', preco: 290, setup: 0, desconto_max: 10,
    unidades_incluidas: 1, usuarios_incluidos: 3,
    features: 'Pipeline básico\nGestão de contatos\nRelatorios simples',
    visivel_canal: true, criado: '2023-06-01', contratos: 31,
  },
  {
    id: 3, nome: 'Implantação Assistida', codigo: 'IMPL-01', tipo: 'servico', categoria: 'Implementação',
    descricao: 'Serviço de implantação com consultores. Inclui configuração, migração de dados e treinamento.',
    status: 'ativo', cobranca: 'unico', preco: 4800, setup: 0, desconto_max: 15,
    unidades_incluidas: null, usuarios_incluidos: null,
    features: 'Configuração do ambiente\nMigração de dados\nTreinamento (8h)',
    visivel_canal: true, criado: '2023-09-15', contratos: 8,
  },
  {
    id: 4, nome: 'Suporte Premium', codigo: 'SUP-PRE', tipo: 'servico', categoria: 'Suporte',
    descricao: 'SLA prioritário com atendimento dedicado em até 2h para incidentes críticos.',
    status: 'ativo', cobranca: 'mensal', preco: 450, setup: 0, desconto_max: 0,
    unidades_incluidas: null, usuarios_incluidos: null,
    features: 'SLA 2h crítico\nAtendimento 24/7\nGerente de conta dedicado',
    visivel_canal: false, criado: '2024-01-10', contratos: 5,
  },
  {
    id: 5, nome: 'Canal NG Enterprise', codigo: 'CNG-ENT', tipo: 'saas', categoria: 'CRM',
    descricao: 'Para grandes operações com múltiplas franquias e controle avançado de comissões.',
    status: 'rascunho', cobranca: 'anual', preco: 18000, setup: 5000, desconto_max: 25,
    unidades_incluidas: 10, usuarios_incluidos: 100,
    features: 'Tudo do Pro\nMulti-franquia\nBI integrado\nSSO/SAML',
    visivel_canal: false, criado: '2024-11-01', contratos: 0,
  },
  {
    id: 6, nome: 'Licença Legado v2', codigo: 'LEG-V2', tipo: 'licenca', categoria: 'CRM',
    descricao: 'Licença perpétua da versão 2 do sistema legado.',
    status: 'descontinuado', cobranca: 'unico', preco: 3200, setup: 0, desconto_max: 30,
    unidades_incluidas: 1, usuarios_incluidos: 5,
    features: 'Módulos básicos v2\nSuporte até 31/12/2025',
    visivel_canal: false, criado: '2021-03-01', contratos: 3,
  },
]
