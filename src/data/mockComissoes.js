// Mock de Comissões v3
// Em produção: SELECT * FROM commission_rules / commission_payments WHERE tenant_id = auth.uid()

// ─── Chaves localStorage ──────────────────────────────────────────────────────
export const RULES_STORAGE_KEY    = 'comissoes:rules_v3'
export const PAYMENTS_STORAGE_KEY = 'comissoes:payments_v1'
export const PERSONAS_STORAGE_KEY = 'comissoes:personas_v1'

// ─── Personas editáveis ───────────────────────────────────────────────────────
export const MOCK_PERSONAS = [
  { id: 'interno',          slug: 'interno',          label: 'Interno',           descricao: 'Equipe ISV',                     cor: 'var(--accent)', ordem: 0, ativo: true },
  { id: 'externo',          slug: 'externo',          label: 'Externo',           descricao: 'Franquia / Revendedor',          cor: '#0EA5E9', ordem: 1, ativo: true },
  { id: 'finder',           slug: 'finder',           label: 'Finder',            descricao: 'Indicador externo',              cor: '#F59E0B', ordem: 2, ativo: true },
  { id: 'parceiro',         slug: 'parceiro',         label: 'Parceiro',          descricao: 'ISV parceiro / integrador',      cor: '#10B981', ordem: 3, ativo: true },
  { id: 'inside_sales_sr',  slug: 'inside_sales_sr',  label: 'Inside Sales Sênior', descricao: 'Vendedor interno experiente',  cor: 'var(--accent)', ordem: 4, ativo: true },
]

// ─── Tipos de receita ─────────────────────────────────────────────────────────
export const RECEITA_TIPOS = ['CDU', 'SMS', 'Serviços']

// ─── Status de pagamento ──────────────────────────────────────────────────────
export const STATUS_CFG = {
  pendente:   { label: 'Pendente',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  pago:       { label: 'Pago',       color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  cancelado:  { label: 'Cancelado',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
}

// ─── Tipos de cálculo ─────────────────────────────────────────────────────────
export const TIPO_CALCULO_CFG = {
  percentual_fixo: {
    label: 'Percentual Fixo por Persona',
    desc:  'Grade de percentuais fixa por persona × tipo de receita',
    color: 'var(--accent)', bg: 'rgba(99,102,241,0.1)',
  },
  cadeia_repasse: {
    label: 'Cadeia de Repasse',
    desc:  'Cascata: valor bruto → repasse fabricante/dist. → base NG → % comissão',
    color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)',
  },
  escalonado: {
    label: 'Escalonado por Meta',
    desc:  'Faixas de atingimento de meta individual + bônus de equipe',
    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
  },
  split: {
    label: 'Split de Comissão',
    desc:  'Divide a comissão entre múltiplos beneficiários com % individuais',
    color: '#10B981', bg: 'rgba(16,185,129,0.1)',
  },
  override: {
    label: 'Override de Gestor',
    desc:  'Gestor recebe % sobre a comissão paga aos subordinados da equipe',
    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',
  },
  draw: {
    label: 'Draw (Adiantamento)',
    desc:  'Valor fixo mensal adiantado, descontado da comissão apurada no período',
    color: '#EF4444', bg: 'rgba(239,68,68,0.1)',
  },
  acelerador: {
    label: 'Acelerador por Quota',
    desc:  'Multiplicador sobre o % base quando atingimento supera threshold definido',
    color: '#F97316', bg: 'rgba(249,115,22,0.1)',
  },
}

// ─── Recorrência ──────────────────────────────────────────────────────────────
export const TIPO_RECORRENCIA_CFG = {
  indefinida: { label: 'Recorrente indefinida', desc: 'Vigora enquanto o contrato estiver ativo' },
  prazo_fixo: { label: 'Recorrente com prazo',  desc: 'Comissão paga mensalmente por N meses' },
  unica:      { label: 'Pagamento único (CDU)', desc: 'Comissão paga uma única vez no fechamento' },
}

// ─── Condition builder — entidades e campos ───────────────────────────────────
export const ENTIDADES_ELEGIBILIDADE = [
  {
    id: 'oportunidade', label: 'Oportunidade',
    campos: [
      { id: 'status',        label: 'Status',            tipo: 'select', opcoes: ['Aberta','Fechada (ganho)','Fechada (perda)','Em negociação'] },
      { id: 'valor',         label: 'Valor (R$)',         tipo: 'numero' },
      { id: 'etapa',         label: 'Etapa do funil',    tipo: 'texto'  },
      { id: 'origem',        label: 'Origem',             tipo: 'select', opcoes: ['Inbound','Outbound','Canal','Indicação','Evento'] },
      { id: 'data_cadastro', label: 'Data de cadastro',  tipo: 'data'   },
    ],
  },
  {
    id: 'contrato', label: 'Contrato',
    campos: [
      { id: 'status',        label: 'Status',             tipo: 'select', opcoes: ['Ativo','Encerrado','Suspenso','Em renovação'] },
      { id: 'tipo',          label: 'Tipo',               tipo: 'select', opcoes: ['Intera (recorrente)','MntNG','Quírons','CDU Tradicional','CDU Corporativo','Keepfy'] },
      { id: 'valor_mensal',  label: 'Valor mensal (R$)',  tipo: 'numero' },
      { id: 'prazo_meses',   label: 'Prazo (meses)',      tipo: 'numero' },
      { id: 'data_cadastro', label: 'Data de cadastro',   tipo: 'data'   },
    ],
  },
  {
    id: 'meta', label: 'Meta',
    campos: [
      { id: 'atingimento_pct', label: 'Atingimento (%)', tipo: 'numero' },
      { id: 'status',          label: 'Status',          tipo: 'select', opcoes: ['Atingida','Não atingida','Em progresso'] },
      { id: 'periodo',         label: 'Período',         tipo: 'select', opcoes: ['Mensal','Trimestral','Anual'] },
      { id: 'tipo',            label: 'Tipo de meta',    tipo: 'select', opcoes: ['Individual','Equipe'] },
    ],
  },
  {
    id: 'produto', label: 'Produto',
    campos: [
      { id: 'nome',   label: 'Nome',   tipo: 'texto' },
      { id: 'tipo',   label: 'Tipo',   tipo: 'select', opcoes: ['SaaS','Serviço','Licença'] },
      { id: 'codigo', label: 'Código', tipo: 'texto' },
    ],
  },
  {
    id: 'cliente', label: 'Cliente',
    campos: [
      { id: 'ativo',    label: 'Ativo',    tipo: 'booleano' },
      { id: 'segmento', label: 'Segmento', tipo: 'texto' },
      { id: 'regiao',   label: 'Região',   tipo: 'texto' },
    ],
  },
]

// Pares de campo possíveis para condições Join entre entidades
export const JOIN_PARES = [
  {
    id: 'opp_antes_contrato',
    label: 'Oportunidade cadastrada antes do Contrato',
    descricao: 'data_cadastro da Oportunidade < data_cadastro do Contrato',
    entidade_a: 'oportunidade', campo_a: 'data_cadastro',
    entidade_b: 'contrato',     campo_b: 'data_cadastro',
    operador: '<',
  },
  {
    id: 'opp_dia_antes_contrato',
    label: 'Prospecção ≥ 1 dia antes do fechamento',
    descricao: 'data_cadastro da Oportunidade ≤ data_cadastro do Contrato − 1 dia',
    entidade_a: 'oportunidade', campo_a: 'data_cadastro',
    entidade_b: 'contrato',     campo_b: 'data_cadastro',
    operador: '<=_minus',
    offset_dias: 1,
  },
  {
    id: 'opp_mesmo_periodo',
    label: 'Oportunidade e Contrato no mesmo mês',
    descricao: 'mês/ano de data_cadastro da Oportunidade = mês/ano do Contrato',
    entidade_a: 'oportunidade', campo_a: 'data_cadastro',
    entidade_b: 'contrato',     campo_b: 'data_cadastro',
    operador: 'mesmo_mes',
  },
  {
    id: 'opp_valor_contrato',
    label: 'Valor Oportunidade ≥ Valor Mensal do Contrato',
    descricao: 'valor da Oportunidade ≥ valor_mensal do Contrato',
    entidade_a: 'oportunidade', campo_a: 'valor',
    entidade_b: 'contrato',     campo_b: 'valor_mensal',
    operador: '>=',
  },
]

export const OPERADORES_POR_TIPO = {
  numero:   [{ id: '=',  l:'= igual' },{ id: '!=',l:'≠ diferente' },{ id: '>=',l:'≥ maior ou igual' },{ id: '<=',l:'≤ menor ou igual' },{ id: '>',l:'> maior que' },{ id: '<',l:'< menor que' }],
  select:   [{ id: '=',  l:'= igual' },{ id: '!=',l:'≠ diferente' }],
  texto:    [{ id: '=',  l:'= igual' },{ id: '!=',l:'≠ diferente' },{ id: 'contém',l:'contém' }],
  booleano: [{ id: '=',  l:'= é' }],
  data:     [{ id: '=',  l:'= igual' },{ id: '<',l:'antes de' },{ id: '>',l:'depois de' }],
}

// ─── Escalas padrão ───────────────────────────────────────────────────────────
export const DEFAULT_ESCALA_INDIVIDUAL = [
  { label: '< 90%',       min_pct: 0,   max_pct: 89.99,  comissao_pct: 0  },
  { label: '90% – 99%',   min_pct: 90,  max_pct: 99.99,  comissao_pct: 10 },
  { label: '100% – 109%', min_pct: 100, max_pct: 109.99, comissao_pct: 20 },
  { label: '≥ 110%',      min_pct: 110, max_pct: null,   comissao_pct: 21 },
]
export const DEFAULT_ESCALA_EQUIPE = [
  { label: '< 90%',       min_pct: 0,   max_pct: 89.99,  bonus_pct: 0 },
  { label: '90% – 99%',   min_pct: 90,  max_pct: 99.99,  bonus_pct: 3 },
  { label: '100% – 109%', min_pct: 100, max_pct: 109.99, bonus_pct: 6 },
  { label: '≥ 110%',      min_pct: 110, max_pct: null,   bonus_pct: 9 },
]

// ─── Template de regra vazia ──────────────────────────────────────────────────
export const EMPTY_RULE = {
  id: null, nome: '', ativo: true,

  // Contexto
  descricao: '',
  contexto: '',

  // Escopo (multi-seleção: interna, equipe e/ou externa)
  escopo_interno: false,
  escopo_equipe: false,
  escopo_externo: false,
  // Beneficiário interno (usuário do sistema)
  beneficiario_id: null,
  beneficiario_nome: null,
  // Beneficiário por equipe (lista de usuário ids)
  equipe_ids: [],
  equipe_nome: '',
  // Beneficiário externo (Contato Canal)
  contato_id: null,
  contato_nome: null,
  contato_empresa: null,
  // Condições Join entre entidades
  condicoes_join: [],

  // Tipos compostos (array)
  tipos_calculo_arr: ['percentual_fixo'],

  // Percentual fixo por persona × receita
  persona_percentuais: [], // [{persona_id, cdu_pct, sms_pct, servicos_pct}] — gerado dinamicamente

  // Cadeia de repasse
  repasse_origem_pct:  50,
  base_calculo_pct:    100,
  percentual_comissao: 5,
  tipo_recorrencia:    'indefinida',
  prazo_meses:         null,

  // Escalonado
  escala_individual:     DEFAULT_ESCALA_INDIVIDUAL,
  escala_equipe:         DEFAULT_ESCALA_EQUIPE,
  condicao_bonus_equipe: 'Exige atingimento prévio da meta individual',

  // Split de Comissão
  split_participantes: [], // [{beneficiario_id, beneficiario_nome, persona, pct}]

  // Override de Gestor
  override_gestor_id:   null,
  override_gestor_nome: '',
  override_pct:         10, // % sobre a comissão dos subordinados

  // Draw (Adiantamento)
  draw_valor_mensal:  0,    // valor fixo adiantado por mês
  draw_recuperavel:   true, // se deve ser descontado da comissão

  // Acelerador por Quota
  acelerador_threshold_pct: 100, // % de atingimento a partir do qual ativa
  acelerador_multiplicador: 1.5, // ex: 1.5x sobre o percentual base
  acelerador_teto_pct:      null, // limite máximo de atingimento (null = sem teto)

  // Elegibilidade aberta
  condicoes_elegibilidade: [],
  exige_participacao_venda: false,
  cessa_no_cancelamento:    true,
  notas_elegibilidade:      '',

  // Vigência
  vigencia_inicio: null,
  vigencia_fim:    null,
  revisao_anual:   false,

  // Produto / Categoria (múltipla seleção) — legado, substituído por combinacoes
  produto_filtro_tipo: null,
  produto_ids:       [],
  produto_categorias: [],

  // Combinações Produto/Categoria × Tipo de Cálculo
  combinacoes: [], // [{id, produto_filtro_tipo, produto_ids, produto_categorias, tipo_calculo, prazo_meses, elegibilidade_propria, exige_participacao_venda, cessa_no_cancelamento, persona_percentuais}]

  // Elegibilidade global
  elegibilidade_por_combinacao: false, // false = global, true = por combinação
}

// ─── Helper: percentuais por persona para regra fixo ─────────────────────────
function mkPersonaPercs(personas, vals) {
  return personas.map(p => ({
    persona_id:   p.id,
    cdu_pct:      vals[`${p.id}_cdu`]      ?? 0,
    sms_pct:      vals[`${p.id}_sms`]      ?? 0,
    servicos_pct: vals[`${p.id}_servicos`] ?? 0,
  }))
}

// ─── Regras mock ──────────────────────────────────────────────────────────────
// Persona percentuais são gerados com os IDs do MOCK_PERSONAS padrão
const basePercs = (vals) => MOCK_PERSONAS.map(p => ({
  persona_id: p.id,
  cdu_pct:      vals[p.id]?.cdu      ?? 0,
  sms_pct:      vals[p.id]?.sms      ?? 0,
  servicos_pct: vals[p.id]?.servicos ?? 0,
}))

export const MOCK_RULES = [
  {
    ...EMPTY_RULE,
    id: 'r1', nome: 'Regra Padrão Canal',
    descricao: 'Aplica-se a todos os parceiros de canal sem regra específica.',
    contexto: 'Regra base do programa de canal. Usada como fallback quando nenhuma regra específica de produto ou persona se aplica.',
    escopo: 'global', tipos_calculo_arr: ['percentual_fixo'],
    persona_percentuais: basePercs({
      interno:  { cdu:5, sms:3, servicos:8  },
      externo:  { cdu:12,sms:8, servicos:15 },
      finder:   { cdu:3, sms:2, servicos:5  },
      parceiro: { cdu:6, sms:4, servicos:10 },
      inside_sales_sr: { cdu:5, sms:3, servicos:8 },
    }),
    exige_participacao_venda: false, cessa_no_cancelamento: true,
    created_at: '2026-01-10T10:00:00Z', updated_at: '2026-04-15T08:30:00Z',
  },
  {
    ...EMPTY_RULE,
    id: 'r2', nome: 'Regra Premium — Boostly Pro',
    descricao: 'Para franquias com contrato Premium ativo.',
    contexto: 'Percentuais elevados como incentivo para parceiros do nível Premium. Revisada anualmente pela diretoria comercial.',
    escopo: 'global', tipos_calculo_arr: ['percentual_fixo'],
    persona_percentuais: basePercs({
      interno:  { cdu:6,  sms:4,  servicos:10 },
      externo:  { cdu:15, sms:10, servicos:18 },
      finder:   { cdu:4,  sms:3,  servicos:7  },
      parceiro: { cdu:8,  sms:5,  servicos:12 },
      inside_sales_sr: { cdu:6, sms:4, servicos:10 },
    }),
    revisao_anual: true, vigencia_inicio: '2026-01-01',
    condicoes_elegibilidade: [
      { id: 'c1', entidade: 'contrato', campo: 'tipo', operador: '=', valor: 'Boostly Pro', label: 'Contrato tipo Boostly Pro' },
      { id: 'c2', entidade: 'contrato', campo: 'status', operador: '=', valor: 'Ativo', label: 'Contrato ativo' },
    ],
    created_at: '2026-01-10T10:00:00Z', updated_at: '2026-04-15T08:30:00Z',
  },
  {
    ...EMPTY_RULE,
    id: 'r3', nome: 'Regra Finder Especial — Campanha Q2',
    descricao: 'Percentual elevado de finder para campanha Q2 2026.',
    contexto: 'Campanha pontual para aumentar geração de leads via indicadores externos durante o Q2. Válida até 30/06/2026.',
    escopo: 'global', tipos_calculo_arr: ['percentual_fixo'],
    persona_percentuais: basePercs({
      interno:  { cdu:4, sms:2, servicos:6  },
      externo:  { cdu:10,sms:7, servicos:12 },
      finder:   { cdu:6, sms:5, servicos:9  },
      parceiro: { cdu:5, sms:3, servicos:8  },
      inside_sales_sr: { cdu:5, sms:3, servicos:8 },
    }),
    vigencia_inicio: '2026-04-01', vigencia_fim: '2026-06-30',
    created_at: '2026-01-10T10:00:00Z', updated_at: '2026-04-15T08:30:00Z',
  },
  {
    ...EMPTY_RULE,
    id: 'r4', nome: 'Recorrente — Quírons / MntNG',
    descricao: 'Comissão mensal sobre cadeia de repasse TOTVS→NG.',
    contexto: 'Modelo de remuneração para produtos recorrentes Protheus. A base de cálculo é 39% do líquido NG (após repasse de 50% da TOTVS). Prazo padrão Quírons: 18 meses.',
    escopo: 'global', tipos_calculo_arr: ['cadeia_repasse'],
    repasse_origem_pct: 50, base_calculo_pct: 39, percentual_comissao: 5,
    tipo_recorrencia: 'prazo_fixo', prazo_meses: 18,
    exige_participacao_venda: true, cessa_no_cancelamento: true,
    notas_elegibilidade: 'Cessa imediatamente em caso de cancelamento. Apenas vendas diretas (sem compartilhamento de território).',
    vigencia_inicio: '2026-01-01', revisao_anual: true,
    created_at: '2026-01-10T10:00:00Z', updated_at: '2026-04-15T08:30:00Z',
  },
  {
    ...EMPTY_RULE,
    id: 'r5', nome: 'CDU Único — Protheus Tradicional',
    descricao: 'Comissão única no fechamento. Repasse médio TOTVS→NG = 45%.',
    contexto: 'Produto CDU com pagamento de comissão à vista no ato do fechamento. Não há recorrência. O líquido NG considera desconto médio de negociação da TOTVS.',
    escopo: 'global', tipos_calculo_arr: ['cadeia_repasse'],
    repasse_origem_pct: 45, base_calculo_pct: 100, percentual_comissao: 5,
    tipo_recorrencia: 'unica',
    exige_participacao_venda: true, cessa_no_cancelamento: false,
    vigencia_inicio: '2026-01-01', revisao_anual: true,
    created_at: '2026-01-10T10:00:00Z', updated_at: '2026-04-15T08:30:00Z',
  },
  {
    ...EMPTY_RULE,
    id: 'r6', nome: 'Escalonado — Keepfy',
    descricao: 'Comissão individual até 21% + bônus equipe até 9%.',
    contexto: 'Produto Keepfy opera com modelo de comissão desvinculado da estrutura TOTVS. A base é o valor líquido recebido pela NG. Comissão individual e bônus de equipe são acumulativos.',
    escopo: 'global', tipos_calculo_arr: ['escalonado'],
    escala_individual: DEFAULT_ESCALA_INDIVIDUAL,
    escala_equipe: DEFAULT_ESCALA_EQUIPE,
    condicao_bonus_equipe: 'Exige atingimento prévio da meta individual',
    exige_participacao_venda: true, cessa_no_cancelamento: false,
    notas_elegibilidade: 'Base = valor líquido recebido pela NG. Comissão individual + bônus equipe são acumulativos.',
    vigencia_inicio: '2026-01-01', revisao_anual: true,
    created_at: '2026-01-10T10:00:00Z', updated_at: '2026-04-15T08:30:00Z',
  },
  {
    // Exemplo de regra individual + tipos compostos (fixo + escalonado)
    ...EMPTY_RULE,
    id: 'r7', nome: 'Ana Consoli — Inside Sales Sênior',
    descricao: 'Regra individual para Ana Consoli combinando percentual fixo e bônus escalonado.',
    contexto: 'Modelo de remuneração personalizado para Inside Sales Sênior. Combina percentual base fixo de 5% (cadeia de repasse) com bônus escalonado por atingimento de meta mensal de receita.',
    escopo: 'individual',
    beneficiario_id: 'u2',
    beneficiario_nome: 'Carla Menezes', // exemplo de pessoa vinculada
    tipos_calculo_arr: ['cadeia_repasse', 'escalonado'],
    repasse_origem_pct: 50, base_calculo_pct: 39, percentual_comissao: 5,
    tipo_recorrencia: 'prazo_fixo', prazo_meses: 18,
    escala_individual: [
      { label: '< 100%',  min_pct: 0,   max_pct: 99.99,  comissao_pct: 0   },
      { label: '≥ 100%',  min_pct: 100, max_pct: 109.99, comissao_pct: 2   },
      { label: '≥ 110%',  min_pct: 110, max_pct: null,   comissao_pct: 3.5 },
    ],
    escala_equipe: [],
    exige_participacao_venda: true, cessa_no_cancelamento: true,
    condicoes_elegibilidade: [
      { id: 'c1', entidade: 'oportunidade', campo: 'status',  operador: '=',  valor: 'Fechada (ganho)', label: 'Oportunidade fechada (ganho)' },
      { id: 'c2', entidade: 'meta',         campo: 'tipo',    operador: '=',  valor: 'Individual',      label: 'Meta individual' },
    ],
    notas_elegibilidade: 'Comissão recorrente cessa imediatamente em caso de cancelamento pelo cliente. Aplicável apenas a vendas diretas.',
    vigencia_inicio: '2026-01-01', revisao_anual: true,
    created_at: '2026-01-10T10:00:00Z', updated_at: '2026-04-15T08:30:00Z',
  },
]

// ─── Pagamentos mock ──────────────────────────────────────────────────────────
export const MOCK_PAYMENTS = [
  { id:'p1', rule_id:'r1', beneficiario_id:'u7', beneficiario_nome:'Ricardo Barros', persona:'externo', receita_tipo:'CDU', valor_base:2800, percentual:12, valor_comissao:336, data_competencia:'2026-04-01', data_vencimento:'2026-04-30', data_pagamento:'2026-04-28', status:'pago', descricao:'Oportunidade: Upgrade Pro — Solaris', notas:null },
  { id:'p2', rule_id:'r2', beneficiario_id:'u8', beneficiario_nome:'Tatiane Costa', persona:'externo', receita_tipo:'SMS', valor_base:1200, percentual:10, valor_comissao:120, data_competencia:'2026-04-01', data_vencimento:'2026-04-30', data_pagamento:null, status:'pendente', descricao:'Oportunidade: Nova unidade RS — MedGroup', notas:'Aguardando aprovação financeira.' },
  { id:'p3', rule_id:'r1', beneficiario_id:'u2', beneficiario_nome:'Carla Menezes', persona:'interno', receita_tipo:'Serviços', valor_base:4800, percentual:8, valor_comissao:384, data_competencia:'2026-04-01', data_vencimento:'2026-05-15', data_pagamento:null, status:'pendente', descricao:'Contrato: Implantação Assistida — FinCorp', notas:null },
  { id:'p4', rule_id:'r4', beneficiario_id:'u11', beneficiario_nome:'Gustavo Faria', persona:'finder', receita_tipo:'CDU', valor_base:682.50, percentual:5, valor_comissao:34.13, data_competencia:'2026-04-01', data_vencimento:'2026-04-30', data_pagamento:'2026-04-29', status:'pago', descricao:'Quírons QRS — MedGroup (Bruto R$3.500 × 50% × 39%)', notas:null },
  { id:'p5', rule_id:'r5', beneficiario_id:'u2', beneficiario_nome:'Carla Menezes', persona:'interno', receita_tipo:'CDU', valor_base:8100, percentual:5, valor_comissao:405, data_competencia:'2026-05-01', data_vencimento:'2026-05-31', data_pagamento:null, status:'pendente', descricao:'Protheus Tradicional — AgriSmart (Bruto R$18.000 × 45%)', notas:null },
  { id:'p6', rule_id:'r6', beneficiario_id:'u5', beneficiario_nome:'Mariana Silva', persona:'interno', receita_tipo:'Serviços', valor_base:12000, percentual:20, valor_comissao:2400, data_competencia:'2026-05-01', data_vencimento:'2026-05-31', data_pagamento:null, status:'pendente', descricao:'Keepfy — Meta individual 105% atingida', notas:'Bônus equipe pendente de apuração.' },
  { id:'p7', rule_id:'r1', beneficiario_id:'u12', beneficiario_nome:'Patrícia Duarte', persona:'parceiro', receita_tipo:'Serviços', valor_base:2400, percentual:10, valor_comissao:240, data_competencia:'2026-03-01', data_vencimento:'2026-03-31', data_pagamento:null, status:'cancelado', descricao:'Contrato rescindido: Suporte Premium — Milenium', notas:'Cancelado em 15/03/2026.' },
  { id:'p8', rule_id:'r7', beneficiario_id:'u2', beneficiario_nome:'Carla Menezes', persona:'inside_sales_sr', receita_tipo:'CDU', valor_base:682.50, percentual:5, valor_comissao:34.13, data_competencia:'2026-05-01', data_vencimento:'2026-06-15', data_pagamento:null, status:'pendente', descricao:'Quírons QRS — Milenium (regra individual + bônus meta)', notas:null },
]
