// ─── Mock: Módulo de Questionários v2 ────────────────────────────────────────

export const STORAGE_KEY_TEMPLATES    = 'questionarios:templates_v2'
export const STORAGE_KEY_SUBMISSIONS  = 'questionarios:submissions_v2'

export const TIPO_CFG = {
  pre_venda:       { label: 'Pré-Venda',       icon: '🎯', color: '#6366F1', bg: '#EEF2FF', text: '#3730A3' },
  apoio_comercial: { label: 'Apoio Comercial',  icon: '🤝', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  diagnostico:     { label: 'Diagnóstico',      icon: '🔍', color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  onboarding:      { label: 'Onboarding',       icon: '🚀', color: '#3B82F6', bg: '#DBEAFE', text: '#1E3A5F' },
}

export const STATUS_CFG = {
  rascunho:   { label: 'Rascunho',   color: '#9CA3AF', bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' },
  enviado:    { label: 'Enviado',    color: '#3B82F6', bg: '#DBEAFE', text: '#1E3A5F', dot: '#3B82F6' },
  em_revisao: { label: 'Em Revisão', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  aprovado:   { label: 'Aprovado',   color: '#10B981', bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  reprovado:  { label: 'Reprovado',  color: '#EF4444', bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
}

// ─── Templates ────────────────────────────────────────────────────────────────
// estrutura_secoes: { secoes: [{ id, titulo, perguntas: [{ id, tipo, label, obrigatorio, opcoes }] }] }
// tipos: 'texto' | 'numero' | 'multipla_escolha'
export const MOCK_TEMPLATES = [
  {
    id: 'tpl-1',
    tenant_id: 't1',
    title: 'Levantamento de Pré-Venda',
    description: 'Diagnóstico inicial do cenário técnico e comercial do prospect antes da proposta.',
    type: 'pre_venda',
    is_active: true,
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T10:00:00Z',
    estrutura_secoes: {
      secoes: [
        {
          id: 'sec-1',
          titulo: 'Identificação do Cliente',
          perguntas: [
            { id: 'p1', tipo: 'texto',           label: 'Nome do prospect / empresa',     obrigatorio: true,  opcoes: [] },
            { id: 'p2', tipo: 'multipla_escolha', label: 'Segmento de atuação',            obrigatorio: true,  opcoes: ['Saúde', 'Varejo', 'Indústria', 'Agronegócio', 'Serviços', 'Educação', 'Outro'] },
            { id: 'p3', tipo: 'numero',           label: 'Número de usuários estimados',   obrigatorio: false, opcoes: [] },
          ],
        },
        {
          id: 'sec-2',
          titulo: 'Necessidades e Dores',
          perguntas: [
            { id: 'p4', tipo: 'texto',           label: 'Descreva a principal dor ou desafio atual', obrigatorio: true,  opcoes: [] },
            { id: 'p5', tipo: 'multipla_escolha', label: 'Urgência da implantação',                  obrigatorio: true,  opcoes: ['Imediata (< 30 dias)', 'Curto prazo (1-3 meses)', 'Médio prazo (3-6 meses)', 'Longo prazo (> 6 meses)'] },
          ],
        },
        {
          id: 'sec-3',
          titulo: 'Orçamento e Decisão',
          perguntas: [
            { id: 'p6', tipo: 'multipla_escolha', label: 'Orçamento aprovado para esta solução?', obrigatorio: true,  opcoes: ['Sim, já aprovado', 'Em aprovação', 'Ainda não definido'] },
            { id: 'p7', tipo: 'texto',            label: 'Quem é o decisor final?',               obrigatorio: false, opcoes: [] },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-2',
    tenant_id: 't1',
    title: 'Solicitação de Apoio Comercial',
    description: 'Formulário para franquias solicitarem suporte da equipe ISV em negociações específicas.',
    type: 'apoio_comercial',
    is_active: true,
    created_at: '2026-05-10T14:00:00Z',
    updated_at: '2026-05-10T14:00:00Z',
    estrutura_secoes: {
      secoes: [
        {
          id: 'sec-1',
          titulo: 'Dados da Oportunidade',
          perguntas: [
            { id: 'p1', tipo: 'texto',  label: 'Nome da oportunidade / negócio', obrigatorio: true,  opcoes: [] },
            { id: 'p2', tipo: 'texto',  label: 'Empresa cliente',                obrigatorio: true,  opcoes: [] },
            { id: 'p3', tipo: 'numero', label: 'Valor estimado (R$)',            obrigatorio: false, opcoes: [] },
          ],
        },
        {
          id: 'sec-2',
          titulo: 'Tipo de Apoio',
          perguntas: [
            { id: 'p4', tipo: 'multipla_escolha', label: 'Que tipo de apoio você precisa?', obrigatorio: true, opcoes: ['Reunião conjunta', 'Elaboração de proposta', 'Demonstração técnica', 'Negociação de condições', 'Material de marketing', 'Outro'] },
            { id: 'p5', tipo: 'texto',            label: 'Descreva o contexto e o que você precisa', obrigatorio: true, opcoes: [] },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-3',
    tenant_id: 't1',
    title: 'Diagnóstico de Maturidade Digital',
    description: 'Avalia o nível de maturidade digital da empresa parceira.',
    type: 'diagnostico',
    is_active: true,
    created_at: '2026-05-20T09:00:00Z',
    updated_at: '2026-05-20T09:00:00Z',
    estrutura_secoes: {
      secoes: [
        {
          id: 'sec-1',
          titulo: 'Infraestrutura',
          perguntas: [
            { id: 'p1', tipo: 'multipla_escolha', label: 'Como você avalia a infraestrutura de TI atual?', obrigatorio: true, opcoes: ['Muito básica', 'Básica', 'Intermediária', 'Avançada'] },
          ],
        },
        {
          id: 'sec-2',
          titulo: 'Processos e Expectativas',
          perguntas: [
            { id: 'p2', tipo: 'multipla_escolha', label: 'Processos comerciais estão documentados?', obrigatorio: true, opcoes: ['Sim, todos', 'Parcialmente', 'Não'] },
            { id: 'p3', tipo: 'numero',           label: 'Quantos colaboradores usarão o sistema?', obrigatorio: true, opcoes: [] },
            { id: 'p4', tipo: 'texto',            label: 'Quais resultados espera alcançar em 6 meses?', obrigatorio: false, opcoes: [] },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-4',
    tenant_id: 't1',
    title: 'Checklist de Onboarding',
    description: 'Garante que todos os requisitos de configuração inicial foram atendidos.',
    type: 'onboarding',
    is_active: true,
    created_at: '2026-06-01T11:00:00Z',
    updated_at: '2026-06-01T11:00:00Z',
    estrutura_secoes: {
      secoes: [
        {
          id: 'sec-1',
          titulo: 'Dados Cadastrais',
          perguntas: [
            { id: 'p1', tipo: 'texto', label: 'Razão Social',        obrigatorio: true,  opcoes: [] },
            { id: 'p2', tipo: 'texto', label: 'CNPJ',                obrigatorio: true,  opcoes: [] },
            { id: 'p3', tipo: 'texto', label: 'Responsável técnico', obrigatorio: true,  opcoes: [] },
          ],
        },
        {
          id: 'sec-2',
          titulo: 'Configurações Iniciais',
          perguntas: [
            { id: 'p4', tipo: 'multipla_escolha', label: 'O que já foi configurado?', obrigatorio: false, opcoes: ['Usuários criados', 'Logo carregado', 'Dados bancários', 'Treinamento concluído'] },
            { id: 'p5', tipo: 'texto',            label: 'Pendências ou observações', obrigatorio: false, opcoes: [] },
          ],
        },
      ],
    },
  },
]

// ─── Submissions (respostas) ───────────────────────────────────────────────────
export const MOCK_SUBMISSIONS = [
  {
    id: 'sub-1',
    tenant_id: 't1',
    template_id: 'tpl-1',
    company_nome: 'MedGroup',
    opportunity_nome: 'Expansão Canal SP',
    status: 'aprovado',
    answered_by_nome: 'Fernanda Rocha',
    valores_respostas: { p1: 'MedGroup', p2: 'Saúde', p3: '45', p4: 'Necessidade de integração com prontuário eletrônico.', p5: 'Curto prazo (1-3 meses)', p6: 'Sim, já aprovado', p7: 'Dr. Roberto Alves' },
    created_at: '2026-05-15T09:30:00Z',
    submitted_at: '2026-05-15T10:00:00Z',
  },
  {
    id: 'sub-2',
    tenant_id: 't1',
    template_id: 'tpl-2',
    company_nome: 'AgriSmart',
    opportunity_nome: 'Contrato financeiro SP',
    status: 'em_revisao',
    answered_by_nome: 'Carla Menezes',
    valores_respostas: { p1: 'Contrato financeiro SP', p2: 'AgriSmart', p3: '85000', p4: ['Reunião conjunta', 'Negociação de condições'], p5: 'Cliente com dúvidas sobre cláusulas de rescisão.' },
    created_at: '2026-06-05T14:00:00Z',
    submitted_at: '2026-06-05T14:30:00Z',
  },
  {
    id: 'sub-3',
    tenant_id: 't1',
    template_id: 'tpl-3',
    company_nome: 'FinCorp',
    opportunity_nome: null,
    status: 'enviado',
    answered_by_nome: 'Lucas Ferreira',
    valores_respostas: { p1: 'Intermediária', p2: 'Parcialmente', p3: '30', p4: 'Reduzir 40% do tempo em processos manuais.' },
    created_at: '2026-06-08T11:00:00Z',
    submitted_at: '2026-06-08T11:45:00Z',
  },
  {
    id: 'sub-4',
    tenant_id: 't1',
    template_id: 'tpl-1',
    company_nome: 'Solaris',
    opportunity_nome: 'Piloto agro PR',
    status: 'rascunho',
    answered_by_nome: 'Lucas Ferreira',
    valores_respostas: { p1: 'Solaris', p2: 'Agronegócio' },
    created_at: '2026-06-10T16:00:00Z',
    submitted_at: null,
  },
  {
    id: 'sub-5',
    tenant_id: 't1',
    template_id: 'tpl-4',
    company_nome: 'TechVision',
    opportunity_nome: null,
    status: 'aprovado',
    answered_by_nome: 'Carla Menezes',
    valores_respostas: { p1: 'TechVision Soluções Ltda', p2: '11.222.333/0001-44', p3: 'Marcos Oliveira', p4: ['Usuários criados', 'Logo carregado', 'Treinamento concluído'], p5: '' },
    created_at: '2026-06-02T08:00:00Z',
    submitted_at: '2026-06-02T09:00:00Z',
  },
]
