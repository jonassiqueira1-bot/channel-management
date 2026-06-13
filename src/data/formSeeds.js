// Seeds compartilhados entre settings/Forms.js (editor) e useFormLayout (consumidor)
// Manter em sync com os seeds do editor ao adicionar novos campos ou entidades.

export const FIELDS_SEED = [
  // ── Empresas ──────────────────────────────────────────────────────────────
  { id:'sf_co_razao',    entity:'companies', field_key:'razao',              label:'Razão Social',          field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_co_cnpj',     entity:'companies', field_key:'cnpj',               label:'CNPJ',                  field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_co_fantasia', entity:'companies', field_key:'fantasia',           label:'Nome Fantasia',          field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_tipo',     entity:'companies', field_key:'tipo',               label:'Tipo',                  field_type:'select',   options:['cliente_final','canal','distribuidor','parceiro','isv'], is_required:false, is_system:true  },
  { id:'sf_co_status',   entity:'companies', field_key:'status',             label:'Status',                field_type:'select',   options:['negociacao','ativo','inativo','prospecto'], is_required:false, is_system:true  },
  { id:'sf_co_segmento', entity:'companies', field_key:'segmento',           label:'Segmento',              field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_cnae',     entity:'companies', field_key:'cnae_codigo',        label:'CNAE',                  field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_co_ie',       entity:'companies', field_key:'inscricao_estadual', label:'Inscrição Estadual',    field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_email',    entity:'companies', field_key:'email',              label:'E-mail',                field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_telefone', entity:'companies', field_key:'telefone',           label:'Telefone',              field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_site',     entity:'companies', field_key:'site',               label:'Site',                  field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_origem',   entity:'companies', field_key:'origem',             label:'Origem',                field_type:'select',   options:['Inbound','Outbound','Indicação','Evento','Parceiro'], is_required:false, is_system:false },
  { id:'sf_co_resp',     entity:'companies', field_key:'responsavel',        label:'Responsável',           field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_cep',      entity:'companies', field_key:'cep',                label:'CEP',                   field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_logr',     entity:'companies', field_key:'logradouro',         label:'Logradouro',            field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_num',      entity:'companies', field_key:'numero',             label:'Número',                field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_compl',    entity:'companies', field_key:'complemento',        label:'Complemento',           field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_bairro',   entity:'companies', field_key:'bairro',             label:'Bairro',                field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_cidade',   entity:'companies', field_key:'cidade',             label:'Cidade',                field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_uf',       entity:'companies', field_key:'uf',                 label:'UF',                    field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_obs',      entity:'companies', field_key:'observacoes',        label:'Observações',           field_type:'textarea', options:[], is_required:false, is_system:false },

  // ── Oportunidades ──────────────────────────────────────────────────────────
  { id:'sf_op_titulo',   entity:'opportunities', field_key:'titulo',               label:'Título',                field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_op_empresa',  entity:'opportunities', field_key:'empresa_id',           label:'Empresa',               field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_op_contato',  entity:'opportunities', field_key:'primary_contact_id',   label:'Contato Principal',     field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_op_situacao', entity:'opportunities', field_key:'situacao',             label:'Situação',              field_type:'select',   options:['em_andamento','ganha','perdida'], is_required:false, is_system:true  },
  { id:'sf_op_etapa',    entity:'opportunities', field_key:'etapa_id',             label:'Etapa do Funil',        field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_op_resp',     entity:'opportunities', field_key:'responsavel',          label:'Responsável',           field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_op_origem',   entity:'opportunities', field_key:'origem',               label:'Origem',                field_type:'select',   options:['Inbound','Outbound','Canal','Indicação','Evento'], is_required:false, is_system:false },
  { id:'sf_op_campanha', entity:'opportunities', field_key:'campanha_id',          label:'Campanha',              field_type:'select',   options:[], is_required:false, is_system:false },
  { id:'sf_op_prazo',    entity:'opportunities', field_key:'prazo',                label:'Prazo de Fechamento',   field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_op_playbook', entity:'opportunities', field_key:'playbook_id',          label:'Playbook',              field_type:'select',   options:[], is_required:false, is_system:false },
  { id:'sf_op_cdu',      entity:'opportunities', field_key:'valor_cdu',            label:'Valor CDU',             field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_op_sms',      entity:'opportunities', field_key:'valor_sms',            label:'Valor SMS',             field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_op_servico',  entity:'opportunities', field_key:'valor_servico',        label:'Valor Serviço',         field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_op_desconto', entity:'opportunities', field_key:'valor_desconto',       label:'Desconto',              field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_op_tipo_imp', entity:'opportunities', field_key:'tipo_implantacao',     label:'Tipo de Implantação',   field_type:'select',   options:['Padrão','Customizada','Expressa'], is_required:false, is_system:false },
  { id:'sf_op_segindu',  entity:'opportunities', field_key:'segmento_industria',   label:'Segmento / Indústria',  field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_op_integ',    entity:'opportunities', field_key:'exige_integracao',     label:'Exige Integração',      field_type:'boolean',  options:[], is_required:false, is_system:false },
  { id:'sf_op_motivo',   entity:'opportunities', field_key:'motivo_perda',         label:'Motivo de Perda',       field_type:'textarea', options:[], is_required:false, is_system:false },
  { id:'sf_op_desc',     entity:'opportunities', field_key:'descricao',            label:'Observações',           field_type:'textarea', options:[], is_required:false, is_system:false },

  // ── Projetos ───────────────────────────────────────────────────────────────
  { id:'sf_pr_nome',     entity:'projects', field_key:'name',                 label:'Nome do Projeto',       field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_pr_empresa',  entity:'projects', field_key:'company_nome',         label:'Empresa',               field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_pr_franquia', entity:'projects', field_key:'franchise_nome',       label:'Franquia',              field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_pr_fase',     entity:'projects', field_key:'phase',                label:'Fase',                  field_type:'select',   options:['iniciacao','planejamento','execucao','monitoramento','encerramento'], is_required:true, is_system:true },
  { id:'sf_pr_status',   entity:'projects', field_key:'status',               label:'Status',                field_type:'select',   options:['em_andamento','pausado','concluido','cancelado'], is_required:false, is_system:true  },
  { id:'sf_pr_opp',      entity:'projects', field_key:'opportunity_id',       label:'Oportunidade de Origem',field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_pr_inicio',   entity:'projects', field_key:'start_date',           label:'Data de Início',        field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_pr_fim',      entity:'projects', field_key:'end_date_estimated',   label:'Previsão de Término',   field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_pr_hest',     entity:'projects', field_key:'total_hours_estimated',label:'Horas Estimadas',       field_type:'number',   options:[], is_required:false, is_system:false },
  { id:'sf_pr_hexec',    entity:'projects', field_key:'total_hours_executed', label:'Horas Executadas',      field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_pr_desc',     entity:'projects', field_key:'notes',                label:'Observações',           field_type:'textarea', options:[], is_required:false, is_system:false },

  // ── Produtos ───────────────────────────────────────────────────────────────
  { id:'sf_pd_nome',     entity:'products', field_key:'nome',        label:'Nome do Produto',  field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_pd_codigo',   entity:'products', field_key:'codigo',      label:'Código',           field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_pd_descricao',entity:'products', field_key:'descricao',   label:'Descrição',        field_type:'textarea', options:[], is_required:false, is_system:false },
  { id:'sf_pd_tipo',     entity:'products', field_key:'tipo',        label:'Tipo',             field_type:'select',   options:['saas','licenca','servico','hardware','consultoria','treinamento'], is_required:false, is_system:true  },
  { id:'sf_pd_categoria',entity:'products', field_key:'categoria',   label:'Categoria',        field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_pd_status',   entity:'products', field_key:'status',      label:'Status',           field_type:'select',   options:['ativo','rascunho','descontinuado'], is_required:false, is_system:true  },
  { id:'sf_pd_cobranca', entity:'products', field_key:'cobranca',    label:'Cobrança',         field_type:'select',   options:['mensal','anual','unico','uso','usuario'], is_required:false, is_system:true  },
  { id:'sf_pd_preco',    entity:'products', field_key:'preco',       label:'Preço',            field_type:'number',   options:[], is_required:false, is_system:false },
  { id:'sf_pd_setup',    entity:'products', field_key:'setup',       label:'Setup',            field_type:'number',   options:[], is_required:false, is_system:false },
  { id:'sf_pd_desc_max', entity:'products', field_key:'desconto_max',label:'Desconto Máx. (%)',field_type:'number',   options:[], is_required:false, is_system:false },
  { id:'sf_pd_obs',      entity:'products', field_key:'observacoes', label:'Observações',      field_type:'textarea', options:[], is_required:false, is_system:false },

  // ── Contratos ──────────────────────────────────────────────────────────────
  { id:'sf_ct_numero',   entity:'contracts', field_key:'numero',         label:'Número do Contrato', field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_ct_empresa',  entity:'contracts', field_key:'empresa_id',     label:'Empresa',            field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_ct_tipo',     entity:'contracts', field_key:'tipo',           label:'Tipo',               field_type:'select',   options:['servico','licenca','manutencao','parceria','revenda'], is_required:false, is_system:true  },
  { id:'sf_ct_status',   entity:'contracts', field_key:'status',         label:'Status',             field_type:'select',   options:['rascunho','ativo','encerrado','cancelado','renovacao'], is_required:false, is_system:true  },
  { id:'sf_ct_valor',    entity:'contracts', field_key:'valor',          label:'Valor Total',        field_type:'number',   options:[], is_required:false, is_system:false },
  { id:'sf_ct_inicio',   entity:'contracts', field_key:'data_inicio',    label:'Vigência — Início',  field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_ct_fim',      entity:'contracts', field_key:'data_fim',       label:'Vigência — Fim',     field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_ct_resp',     entity:'contracts', field_key:'responsavel',    label:'Responsável',        field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_ct_objeto',   entity:'contracts', field_key:'objeto',         label:'Objeto do Contrato', field_type:'textarea', options:[], is_required:false, is_system:false },
  { id:'sf_ct_obs',      entity:'contracts', field_key:'observacoes',    label:'Observações',        field_type:'textarea', options:[], is_required:false, is_system:false },

  // ── Pagamentos ─────────────────────────────────────────────────────────────
  { id:'sf_pg_referencia',entity:'payments', field_key:'referencia',     label:'Referência',         field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_pg_empresa',   entity:'payments', field_key:'empresa_id',     label:'Empresa',            field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_pg_tipo',      entity:'payments', field_key:'tipo',           label:'Tipo',               field_type:'select',   options:['fatura','boleto','pix','cartao','transferencia','recibo'], is_required:false, is_system:true  },
  { id:'sf_pg_status',    entity:'payments', field_key:'status',         label:'Status',             field_type:'select',   options:['pendente','pago','vencido','cancelado','estornado'], is_required:false, is_system:true  },
  { id:'sf_pg_valor',     entity:'payments', field_key:'valor',          label:'Valor',              field_type:'number',   options:[], is_required:true,  is_system:true  },
  { id:'sf_pg_vencimento',entity:'payments', field_key:'vencimento',     label:'Vencimento',         field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_pg_pagamento', entity:'payments', field_key:'data_pagamento', label:'Data de Pagamento',  field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_pg_descricao', entity:'payments', field_key:'descricao',      label:'Descrição',          field_type:'textarea', options:[], is_required:false, is_system:false },
  { id:'sf_pg_obs',       entity:'payments', field_key:'observacoes',    label:'Observações',        field_type:'textarea', options:[], is_required:false, is_system:false },

  // ── Ações ──────────────────────────────────────────────────────────────────
  { id:'sf_ac_titulo',   entity:'actions', field_key:'titulo',           label:'Título',             field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_ac_tipo',     entity:'actions', field_key:'tipo',             label:'Tipo de Ação',       field_type:'select',   options:['ligacao','email','reuniao','visita','tarefa','proposta','follow_up'], is_required:true, is_system:true },
  { id:'sf_ac_status',   entity:'actions', field_key:'status',           label:'Status',             field_type:'select',   options:['pendente','em_andamento','concluida','cancelada'], is_required:false, is_system:true  },
  { id:'sf_ac_prioridade',entity:'actions',field_key:'prioridade',       label:'Prioridade',         field_type:'select',   options:['baixa','media','alta','urgente'], is_required:false, is_system:false },
  { id:'sf_ac_resp',     entity:'actions', field_key:'responsavel',      label:'Responsável',        field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_ac_empresa',  entity:'actions', field_key:'empresa_id',       label:'Empresa',            field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_ac_opp',      entity:'actions', field_key:'oportunidade_id',  label:'Oportunidade',       field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_ac_prevista', entity:'actions', field_key:'data_prevista',    label:'Data Prevista',      field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_ac_conclusao',entity:'actions', field_key:'data_conclusao',   label:'Data de Conclusão',  field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_ac_desc',     entity:'actions', field_key:'descricao',        label:'Descrição',          field_type:'textarea', options:[], is_required:false, is_system:false },

  // ── Vendedores ─────────────────────────────────────────────────────────────
  { id:'sf_ve_nome',     entity:'sellers', field_key:'nome',             label:'Nome',               field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_ve_email',    entity:'sellers', field_key:'email',            label:'E-mail',             field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_ve_telefone', entity:'sellers', field_key:'telefone',         label:'Telefone',           field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_ve_cargo',    entity:'sellers', field_key:'cargo',            label:'Cargo',              field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_ve_status',   entity:'sellers', field_key:'status',           label:'Status',             field_type:'select',   options:['ativo','inativo','afastado'], is_required:false, is_system:true  },
  { id:'sf_ve_regiao',   entity:'sellers', field_key:'regiao',           label:'Região / Território',field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_ve_equipe',   entity:'sellers', field_key:'equipe',           label:'Equipe',             field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_ve_admissao', entity:'sellers', field_key:'data_admissao',    label:'Data de Admissão',   field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_ve_meta',     entity:'sellers', field_key:'meta_mensal',      label:'Meta Mensal (R$)',   field_type:'number',   options:[], is_required:false, is_system:false },
  { id:'sf_ve_comissao', entity:'sellers', field_key:'comissao_perc',    label:'Comissão (%)',       field_type:'number',   options:[], is_required:false, is_system:false },
  { id:'sf_ve_obs',      entity:'sellers', field_key:'observacoes',      label:'Observações',        field_type:'textarea', options:[], is_required:false, is_system:false },
]

export const LAYOUT_SEED = {
  companies: {
    sections: [
      {
        id: 'sec_co_1', label: 'Identificação',
        rows: [
          ['sf_co_razao',    'sf_co_fantasia'],
          ['sf_co_cnpj',     'sf_co_ie'],
          ['sf_co_tipo',     'sf_co_status'],
          ['sf_co_segmento', 'sf_co_cnae'],
        ],
      },
      {
        id: 'sec_co_2', label: 'Contato',
        rows: [
          ['sf_co_email',    'sf_co_telefone'],
          ['sf_co_site',     'sf_co_origem'],
          ['sf_co_resp',     null],
        ],
      },
      {
        id: 'sec_co_3', label: 'Endereço',
        rows: [
          ['sf_co_cep',    'sf_co_logr'],
          ['sf_co_num',    'sf_co_compl'],
          ['sf_co_bairro', 'sf_co_cidade'],
          ['sf_co_uf',     null],
        ],
      },
      {
        id: 'sec_co_4', label: 'Observações',
        rows: [['sf_co_obs', null]],
      },
    ],
  },
  opportunities: {
    sections: [
      {
        id: 'sec_op_1', label: 'Identificação',
        rows: [
          ['sf_op_titulo',   'sf_op_empresa'],
          ['sf_op_contato',  'sf_op_resp'],
          ['sf_op_situacao', 'sf_op_etapa'],
          ['sf_op_origem',   'sf_op_campanha'],
          ['sf_op_prazo',    'sf_op_playbook'],
        ],
      },
      {
        id: 'sec_op_2', label: 'Valores',
        rows: [
          ['sf_op_cdu',      'sf_op_sms'],
          ['sf_op_servico',  'sf_op_desconto'],
        ],
      },
      {
        id: 'sec_op_3', label: 'Detalhes',
        rows: [
          ['sf_op_tipo_imp', 'sf_op_segindu'],
          ['sf_op_integ',    null],
          ['sf_op_desc',     null],
          ['sf_op_motivo',   null],
        ],
      },
    ],
  },
  projects: {
    sections: [
      {
        id: 'sec_pr_1', label: 'Identificação',
        rows: [
          ['sf_pr_nome',    'sf_pr_empresa'],
          ['sf_pr_franquia','sf_pr_opp'],
          ['sf_pr_fase',    'sf_pr_status'],
        ],
      },
      {
        id: 'sec_pr_2', label: 'Cronograma',
        rows: [
          ['sf_pr_inicio', 'sf_pr_fim'],
          ['sf_pr_hest',   'sf_pr_hexec'],
        ],
      },
      {
        id: 'sec_pr_3', label: 'Observações',
        rows: [['sf_pr_desc', null]],
      },
    ],
  },
  products: {
    sections: [
      {
        id: 'sec_pd_1', label: 'Identificação',
        rows: [
          ['sf_pd_nome',     'sf_pd_codigo'],
          ['sf_pd_tipo',     'sf_pd_categoria'],
          ['sf_pd_status',   'sf_pd_cobranca'],
        ],
      },
      {
        id: 'sec_pd_2', label: 'Preços',
        rows: [
          ['sf_pd_preco',    'sf_pd_setup'],
          ['sf_pd_desc_max', null],
        ],
      },
      {
        id: 'sec_pd_3', label: 'Detalhes',
        rows: [
          ['sf_pd_descricao', null],
          ['sf_pd_obs',       null],
        ],
      },
    ],
  },
  contracts: {
    sections: [
      {
        id: 'sec_ct_1', label: 'Identificação',
        rows: [
          ['sf_ct_numero',  'sf_ct_empresa'],
          ['sf_ct_tipo',    'sf_ct_status'],
          ['sf_ct_resp',    null],
        ],
      },
      {
        id: 'sec_ct_2', label: 'Vigência & Valor',
        rows: [
          ['sf_ct_inicio', 'sf_ct_fim'],
          ['sf_ct_valor',  null],
        ],
      },
      {
        id: 'sec_ct_3', label: 'Detalhes',
        rows: [
          ['sf_ct_objeto', null],
          ['sf_ct_obs',    null],
        ],
      },
    ],
  },
  payments: {
    sections: [
      {
        id: 'sec_pg_1', label: 'Identificação',
        rows: [
          ['sf_pg_referencia', 'sf_pg_empresa'],
          ['sf_pg_tipo',       'sf_pg_status'],
          ['sf_pg_valor',      null],
        ],
      },
      {
        id: 'sec_pg_2', label: 'Datas',
        rows: [
          ['sf_pg_vencimento', 'sf_pg_pagamento'],
        ],
      },
      {
        id: 'sec_pg_3', label: 'Detalhes',
        rows: [
          ['sf_pg_descricao', null],
          ['sf_pg_obs',       null],
        ],
      },
    ],
  },
  actions: {
    sections: [
      {
        id: 'sec_ac_1', label: 'Identificação',
        rows: [
          ['sf_ac_titulo',    null],
          ['sf_ac_tipo',      'sf_ac_status'],
          ['sf_ac_prioridade','sf_ac_resp'],
        ],
      },
      {
        id: 'sec_ac_2', label: 'Vínculo',
        rows: [
          ['sf_ac_empresa', 'sf_ac_opp'],
        ],
      },
      {
        id: 'sec_ac_3', label: 'Datas',
        rows: [
          ['sf_ac_prevista', 'sf_ac_conclusao'],
        ],
      },
      {
        id: 'sec_ac_4', label: 'Detalhes',
        rows: [['sf_ac_desc', null]],
      },
    ],
  },
  sellers: {
    sections: [
      {
        id: 'sec_ve_1', label: 'Dados Pessoais',
        rows: [
          ['sf_ve_nome',    'sf_ve_email'],
          ['sf_ve_telefone','sf_ve_cargo'],
          ['sf_ve_status',  null],
        ],
      },
      {
        id: 'sec_ve_2', label: 'Organização',
        rows: [
          ['sf_ve_regiao',   'sf_ve_equipe'],
          ['sf_ve_admissao', null],
        ],
      },
      {
        id: 'sec_ve_3', label: 'Metas & Comissão',
        rows: [
          ['sf_ve_meta', 'sf_ve_comissao'],
        ],
      },
      {
        id: 'sec_ve_4', label: 'Observações',
        rows: [['sf_ve_obs', null]],
      },
    ],
  },
}
