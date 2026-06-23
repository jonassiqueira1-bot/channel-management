export const DATA_SOURCES = [
  {
    id: 'oportunidades',
    label: 'Oportunidades',
    icon: '🔵',
    color: '#6366F1',
    fields: [
      { key: 'etapa',        label: 'Etapa',        type: 'text'   },
      { key: 'situacao',     label: 'Situação',      type: 'text'   },
      { key: 'empresa_nome', label: 'Empresa',       type: 'text'   },
      { key: 'responsavel',  label: 'Responsável',   type: 'text'   },
      { key: 'valor',        label: 'Valor (R$)',    type: 'number' },
      { key: 'probabilidade',label: 'Probabilidade', type: 'number' },
      { key: 'created_at',   label: 'Criado em',     type: 'date'   },
    ],
    registros: [
      { etapa:'Prospecção',   situacao:'aberta', empresa_nome:'MedGroup',    responsavel:'João Silva',  valor:18000, probabilidade:20, created_at:'2026-05-01' },
      { etapa:'Qualificação', situacao:'aberta', empresa_nome:'AgriSmart',   responsavel:'Ana Costa',   valor:32000, probabilidade:40, created_at:'2026-05-10' },
      { etapa:'Proposta',     situacao:'aberta', empresa_nome:'Solaris Tech',responsavel:'João Silva',  valor:54000, probabilidade:60, created_at:'2026-05-15' },
      { etapa:'Negociação',   situacao:'aberta', empresa_nome:'Logix SA',    responsavel:'Pedro Melo',  valor:28000, probabilidade:75, created_at:'2026-06-01' },
      { etapa:'Fechamento',   situacao:'ganha',  empresa_nome:'FinCorp',     responsavel:'Ana Costa',   valor:76000, probabilidade:95, created_at:'2026-06-10' },
      { etapa:'Prospecção',   situacao:'aberta', empresa_nome:'Nexus',       responsavel:'Pedro Melo',  valor:12000, probabilidade:15, created_at:'2026-06-15' },
      { etapa:'Qualificação', situacao:'aberta', empresa_nome:'Alpha Dist',  responsavel:'João Silva',  valor:41000, probabilidade:35, created_at:'2026-06-18' },
      { etapa:'Proposta',     situacao:'perdida',empresa_nome:'RealCo',      responsavel:'Ana Costa',   valor:22000, probabilidade:0,  created_at:'2026-06-20' },
    ]
  },
  {
    id: 'projetos',
    label: 'Projetos',
    icon: '📁',
    color: '#F59E0B',
    fields: [
      { key: 'fase',         label: 'Fase',            type: 'text'   },
      { key: 'status',       label: 'Status',           type: 'text'   },
      { key: 'company_nome', label: 'Empresa',          type: 'text'   },
      { key: 'horas_est',    label: 'Horas Estimadas',  type: 'number' },
      { key: 'horas_exec',   label: 'Horas Executadas', type: 'number' },
    ],
    registros: [
      { fase:'Iniciação',    status:'em_andamento', company_nome:'MedGroup',  horas_est:40,  horas_exec:12  },
      { fase:'Modelagem',    status:'em_andamento', company_nome:'AgriSmart', horas_est:80,  horas_exec:65  },
      { fase:'Implantação',  status:'em_andamento', company_nome:'Solaris',   horas_est:160, horas_exec:110 },
      { fase:'Implantação',  status:'em_andamento', company_nome:'FinCorp',   horas_est:120, horas_exec:88  },
      { fase:'Treinamento',  status:'em_andamento', company_nome:'Logix',     horas_est:60,  horas_exec:48  },
      { fase:'Go-live',      status:'em_andamento', company_nome:'Nexus',     horas_est:20,  horas_exec:18  },
      { fase:'Encerramento', status:'concluido',    company_nome:'Alpha',     horas_est:200, horas_exec:195 },
    ]
  },
  {
    id: 'contratos',
    label: 'Contratos',
    icon: '📝',
    color: '#3B82F6',
    fields: [
      { key: 'status',      label: 'Status',    type: 'text'   },
      { key: 'tipo',        label: 'Tipo',       type: 'text'   },
      { key: 'empresa',     label: 'Empresa',    type: 'text'   },
      { key: 'valor_mrr',   label: 'MRR (R$)',   type: 'number' },
      { key: 'valor_total', label: 'Total (R$)', type: 'number' },
    ],
    registros: [
      { status:'ativo',         tipo:'MRR',    empresa:'MedGroup',  valor_mrr:4200, valor_total:50400 },
      { status:'ativo',         tipo:'MRR',    empresa:'AgriSmart', valor_mrr:2800, valor_total:33600 },
      { status:'ativo',         tipo:'Avulso', empresa:'FinCorp',   valor_mrr:0,    valor_total:18000 },
      { status:'encerrado',     tipo:'MRR',    empresa:'Logix',     valor_mrr:1500, valor_total:18000 },
      { status:'em_negociacao', tipo:'MRR',    empresa:'Nexus',     valor_mrr:3600, valor_total:43200 },
      { status:'ativo',         tipo:'MRR',    empresa:'Alpha',     valor_mrr:5100, valor_total:61200 },
    ]
  },
  {
    id: 'pagamentos',
    label: 'Pagamentos',
    icon: '💳',
    color: '#10B981',
    fields: [
      { key: 'status',  label: 'Status',     type: 'text'   },
      { key: 'empresa', label: 'Empresa',    type: 'text'   },
      { key: 'valor',   label: 'Valor (R$)', type: 'number' },
      { key: 'mes',     label: 'Mês',        type: 'text'   },
    ],
    registros: [
      { status:'pago',     empresa:'MedGroup',  valor:4200, mes:'Jan' },
      { status:'pago',     empresa:'AgriSmart', valor:2800, mes:'Jan' },
      { status:'pago',     empresa:'FinCorp',   valor:5100, mes:'Jan' },
      { status:'pendente', empresa:'Nexus',     valor:3600, mes:'Jun' },
      { status:'atrasado', empresa:'Logix',     valor:1500, mes:'Mai' },
      { status:'pago',     empresa:'MedGroup',  valor:4200, mes:'Fev' },
      { status:'pago',     empresa:'Alpha',     valor:2100, mes:'Fev' },
      { status:'pendente', empresa:'AgriSmart', valor:2800, mes:'Jun' },
    ]
  },
  {
    id: 'comissoes',
    label: 'Comissões',
    icon: '💰',
    color: '#EC4899',
    fields: [
      { key: 'vendedor', label: 'Vendedor',      type: 'text'   },
      { key: 'status',   label: 'Status',         type: 'text'   },
      { key: 'valor',    label: 'Comissão (R$)',  type: 'number' },
      { key: 'mes',      label: 'Mês',            type: 'text'   },
    ],
    registros: [
      { vendedor:'João Silva', status:'pago',    valor:3200, mes:'Mai' },
      { vendedor:'Ana Costa',  status:'pago',    valor:4100, mes:'Mai' },
      { vendedor:'Pedro Melo', status:'pago',    valor:2800, mes:'Mai' },
      { vendedor:'João Silva', status:'pendente',valor:2600, mes:'Jun' },
      { vendedor:'Ana Costa',  status:'pago',    valor:3800, mes:'Jun' },
      { vendedor:'Pedro Melo', status:'pendente',valor:1900, mes:'Jun' },
    ]
  },
  {
    id: 'empresas',
    label: 'Empresas',
    icon: '🏢',
    color: '#F59E0B',
    fields: [
      { key: 'segmento', label: 'Segmento', type: 'text' },
      { key: 'status',   label: 'Status',   type: 'text' },
      { key: 'cidade',   label: 'Cidade',   type: 'text' },
      { key: 'uf',       label: 'UF',       type: 'text' },
    ],
    registros: [
      { segmento:'Tecnologia', status:'ativo',   cidade:'São Paulo',    uf:'SP' },
      { segmento:'Saúde',      status:'ativo',   cidade:'Campinas',     uf:'SP' },
      { segmento:'Varejo',     status:'ativo',   cidade:'Curitiba',     uf:'PR' },
      { segmento:'Tecnologia', status:'ativo',   cidade:'Rio',          uf:'RJ' },
      { segmento:'Indústria',  status:'inativo', cidade:'Belo Horiz.',  uf:'MG' },
      { segmento:'Serviços',   status:'ativo',   cidade:'Brasília',     uf:'DF' },
      { segmento:'Saúde',      status:'ativo',   cidade:'Porto Alegre', uf:'RS' },
      { segmento:'Varejo',     status:'inativo', cidade:'Recife',       uf:'PE' },
    ]
  },
  {
    id: 'cs_health',
    label: 'Customer Success',
    icon: '💚',
    color: '#10B981',
    fields: [
      { key: 'empresa', label: 'Empresa',      type: 'text'   },
      { key: 'score',   label: 'Health Score', type: 'number' },
      { key: 'nivel',   label: 'Nível',        type: 'text'   },
      { key: 'nps',     label: 'NPS',          type: 'number' },
    ],
    registros: [
      { empresa:'MedGroup',  score:87, nivel:'saudável', nps:72 },
      { empresa:'AgriSmart', score:64, nivel:'atenção',  nps:45 },
      { empresa:'FinCorp',   score:91, nivel:'saudável', nps:80 },
      { empresa:'Logix',     score:42, nivel:'crítico',  nps:18 },
      { empresa:'Nexus',     score:78, nivel:'saudável', nps:61 },
      { empresa:'Alpha',     score:55, nivel:'atenção',  nps:37 },
    ]
  },
  {
    id: 'questionarios',
    label: 'Questionários',
    icon: '📋',
    color: '#8B5CF6',
    fields: [
      { key: 'titulo',    label: 'Questionário', type: 'text'   },
      { key: 'respondido',label: 'Respondido',   type: 'text'   },
      { key: 'empresa',   label: 'Empresa',      type: 'text'   },
      { key: 'score',     label: 'Score',        type: 'number' },
    ],
    registros: [
      { titulo:'Onboarding Técnico', respondido:'sim', empresa:'MedGroup',  score:88 },
      { titulo:'NPS Trimestral',     respondido:'sim', empresa:'AgriSmart', score:72 },
      { titulo:'Onboarding Técnico', respondido:'não', empresa:'Logix',     score:0  },
      { titulo:'Satisfação Suporte', respondido:'sim', empresa:'FinCorp',   score:91 },
      { titulo:'NPS Trimestral',     respondido:'sim', empresa:'Nexus',     score:65 },
      { titulo:'Satisfação Suporte', respondido:'não', empresa:'Alpha',     score:0  },
    ]
  },
]

export const COMPONENT_TYPES = [
  { id:'kpi',   label:'KPI Card', icon:'🔢', desc:'Métrica única destacada' },
  { id:'bar',   label:'Barras',   icon:'📊', desc:'Comparação entre categorias' },
  { id:'pie',   label:'Pizza',    icon:'🥧', desc:'Distribuição proporcional' },
  { id:'table', label:'Tabela',   icon:'📋', desc:'Dados detalhados em grade' },
  { id:'line',  label:'Linha',    icon:'📈', desc:'Tendência ao longo do tempo' },
]

export const PRESET_CORES = ['#6366F1','#10B981','#F59E0B','#3B82F6','#EC4899','#8B5CF6','#EF4444','#0EA5E9']
