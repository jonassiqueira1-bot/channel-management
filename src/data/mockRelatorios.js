import { MOCK_EMPRESAS }        from './mockEmpresas'
import { MOCK_PAGAMENTOS }       from './mockPagamentos'
import { MOCK_PAYMENTS as MOCK_COMMISSION_PAYMENTS, MOCK_RULES } from './mockComissoes'
import { MOCK_CUSTOMER_HEALTH }  from './mockCustomerSuccess'
import { MOCK_PROJETOS }         from './mockProjetos'

export const RELATORIOS_STORAGE_KEY = 'relatorios:saved_v1'

export const COMPONENT_TYPES = [
  { id:'kpi',   label:'KPI Card', icon:'🔢', desc:'Métrica única destacada' },
  { id:'bar',   label:'Barras',   icon:'📊', desc:'Comparação entre categorias' },
  { id:'pie',   label:'Pizza',    icon:'🥧', desc:'Distribuição proporcional' },
  { id:'table', label:'Tabela',   icon:'📋', desc:'Dados detalhados em grade' },
  { id:'line',  label:'Linha',    icon:'📈', desc:'Tendência ao longo do tempo' },
]

export const PRESET_CORES = ['#6366F1','#10B981','#F59E0B','#3B82F6','#EC4899','#8B5CF6','#EF4444','#0EA5E9']

// ─── Lê dados reais do localStorage com fallback para mock ───────────────────
function readLS(key, fallback = []) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback }
  catch { return fallback }
}

export function buildDataSources() {
  // ── Oportunidades ──────────────────────────────────────────────────────────
  const rawOpps = readLS('opps_cache_v1', [])
  const oppsRegs = rawOpps.map(o => ({
    etapa:        o.etapa || o.stage || 'Prospecção',
    situacao:     o.situacao || o.status || '',
    empresa_nome: o.empresa_nome || '',
    responsavel:  o.responsavel || '',
    valor:        (Number(o.valor_cdu)||0) + (Number(o.valor_sms)||0) + (Number(o.valor_servico)||0),
    probabilidade: Number(o.probabilidade || 0),
    created_at:   o.created_at?.slice(0, 10) || '',
  }))

  // ── Projetos ───────────────────────────────────────────────────────────────
  const rawProjs = readLS('projetos:lista_v2', MOCK_PROJETOS)
  const projsRegs = rawProjs.map(p => ({
    fase:         p.phase || '',
    status:       p.status || '',
    company_nome: p.company_nome || '',
    horas_est:    Number(p.total_hours_estimated || 0),
    horas_exec:   Number(p.total_hours_executed  || 0),
    created_at:   p.start_date || p.created_at || '',
  }))

  // ── Contratos ──────────────────────────────────────────────────────────────
  const rawConts = readLS('crm:contratos_v2', [])
  const contsRegs = rawConts.map(c => ({
    status:      c.status || '',
    empresa:     c.empresa_nome || '',
    valor_mrr:   (c.itens_mrr     || []).reduce((s, i) => s + (Number(i.valor)||0), 0),
    valor_total: [...(c.itens_mrr||[]),...(c.itens_adesao||[]),...(c.itens_servico||[])].reduce((s,i) => s + (Number(i.valor)||0), 0),
    created_at:  c.criado || c.vigencia_inicio || '',
  }))

  // ── Pagamentos ─────────────────────────────────────────────────────────────
  const rawPags = readLS('pagamentos:data_v1', MOCK_PAGAMENTOS)
  const pagsRegs = rawPags.map(p => ({
    status:  p.status || '',
    empresa: p.company_nome || '',
    valor:   Number(p.amount_total_net || 0),
    mes:     p.reference_month ? p.reference_month.slice(0, 7) : '',
    created_at: p.due_date || '',
  }))

  // ── Comissões ──────────────────────────────────────────────────────────────
  const rawComs = readLS('comissoes:payments_v1', MOCK_COMMISSION_PAYMENTS)
  const comsRegs = rawComs.map(c => ({
    vendedor: c.beneficiario_nome || '',
    status:   c.status || '',
    valor:    Number(c.valor_comissao || 0),
    mes:      c.data_competencia ? c.data_competencia.slice(0, 7) : '',
    created_at: c.data_competencia || '',
  }))

  // ── Empresas ───────────────────────────────────────────────────────────────
  const rawEmps = MOCK_EMPRESAS
  const empsRegs = rawEmps.map(e => ({
    segmento: e.segmento || '',
    status:   e.status || '',
    cidade:   e.cidade || '',
    uf:       e.uf || '',
    mrr:      Number(e.mrr || 0),
    created_at: e.criado || '',
  }))

  // ── Customer Success ───────────────────────────────────────────────────────
  const rawCS = readLS('cs:customer_health_v1', MOCK_CUSTOMER_HEALTH)
  const csRegs = rawCS.map(c => ({
    empresa: c.company_name || '',
    score:   Number(c.health_score || 0),
    nivel:   c.health_score >= 80 ? 'saudável' : c.health_score >= 50 ? 'atenção' : 'crítico',
    laer:    c.laer_stage || '',
    created_at: '',
  }))

  // ── Regras de Comissão ─────────────────────────────────────────────────────
  const rawRules = readLS('comissoes:rules_v3', MOCK_RULES)
  const rulesRegs = rawRules.map(r => ({
    nome:   r.nome || '',
    escopo: r.escopo || '',
    tipo:   (r.tipos_calculo_arr || []).join(', '),
  }))

  return [
    {
      id: 'oportunidades', label: 'Oportunidades', icon: '🔵', color: '#6366F1',
      fields: [
        { key: 'etapa',        label: 'Etapa',        type: 'text'   },
        { key: 'situacao',     label: 'Situação',     type: 'text'   },
        { key: 'empresa_nome', label: 'Empresa',      type: 'text'   },
        { key: 'responsavel',  label: 'Responsável',  type: 'text'   },
        { key: 'valor',        label: 'Valor (R$)',   type: 'number' },
        { key: 'probabilidade',label: 'Probabilidade',type: 'number' },
        { key: 'created_at',   label: 'Criado em',   type: 'date'   },
      ],
      registros: oppsRegs,
    },
    {
      id: 'projetos', label: 'Projetos', icon: '📁', color: '#F59E0B',
      fields: [
        { key: 'fase',         label: 'Fase',             type: 'text'   },
        { key: 'status',       label: 'Status',            type: 'text'   },
        { key: 'company_nome', label: 'Empresa',           type: 'text'   },
        { key: 'horas_est',    label: 'Horas Estimadas',   type: 'number' },
        { key: 'horas_exec',   label: 'Horas Executadas',  type: 'number' },
        { key: 'created_at',   label: 'Início',            type: 'date'   },
      ],
      registros: projsRegs,
    },
    {
      id: 'contratos', label: 'Contratos', icon: '📝', color: '#3B82F6',
      fields: [
        { key: 'status',      label: 'Status',     type: 'text'   },
        { key: 'empresa',     label: 'Empresa',    type: 'text'   },
        { key: 'valor_mrr',   label: 'MRR (R$)',   type: 'number' },
        { key: 'valor_total', label: 'Total (R$)', type: 'number' },
        { key: 'created_at',  label: 'Vigência',   type: 'date'   },
      ],
      registros: contsRegs,
    },
    {
      id: 'pagamentos', label: 'Pagamentos', icon: '💳', color: '#10B981',
      fields: [
        { key: 'status',     label: 'Status',     type: 'text'   },
        { key: 'empresa',    label: 'Empresa',    type: 'text'   },
        { key: 'valor',      label: 'Valor (R$)', type: 'number' },
        { key: 'mes',        label: 'Mês ref.',   type: 'text'   },
        { key: 'created_at', label: 'Vencimento', type: 'date'   },
      ],
      registros: pagsRegs,
    },
    {
      id: 'comissoes', label: 'Comissões', icon: '💰', color: '#EC4899',
      fields: [
        { key: 'vendedor',   label: 'Beneficiário',  type: 'text'   },
        { key: 'status',     label: 'Status',         type: 'text'   },
        { key: 'valor',      label: 'Comissão (R$)',  type: 'number' },
        { key: 'mes',        label: 'Competência',    type: 'text'   },
        { key: 'created_at', label: 'Data',           type: 'date'   },
      ],
      registros: comsRegs,
    },
    {
      id: 'empresas', label: 'Empresas', icon: '🏢', color: '#F59E0B',
      fields: [
        { key: 'segmento', label: 'Segmento', type: 'text'   },
        { key: 'status',   label: 'Status',   type: 'text'   },
        { key: 'cidade',   label: 'Cidade',   type: 'text'   },
        { key: 'uf',       label: 'UF',       type: 'text'   },
        { key: 'mrr',      label: 'MRR (R$)', type: 'number' },
        { key: 'created_at', label: 'Criado', type: 'date'   },
      ],
      registros: empsRegs,
    },
    {
      id: 'cs_health', label: 'Customer Success', icon: '💚', color: '#10B981',
      fields: [
        { key: 'empresa', label: 'Empresa',      type: 'text'   },
        { key: 'score',   label: 'Health Score', type: 'number' },
        { key: 'nivel',   label: 'Nível',        type: 'text'   },
        { key: 'laer',    label: 'LAER Stage',   type: 'text'   },
      ],
      registros: csRegs,
    },
    {
      id: 'regras_comissao', label: 'Regras de Comissão', icon: '📐', color: '#8B5CF6',
      fields: [
        { key: 'nome',   label: 'Regra',  type: 'text' },
        { key: 'escopo', label: 'Escopo', type: 'text' },
        { key: 'tipo',   label: 'Tipo',   type: 'text' },
      ],
      registros: rulesRegs,
    },
  ]
}

// ─── Relatórios pré-definidos (templates) ────────────────────────────────────
export const PRESET_RELATORIOS = [
  {
    id: 'preset_mrr',
    nome: 'MRR por Empresa',
    descricao: 'Receita recorrente mensal por empresa',
    icone: '💵',
    widgets: [
      { id: 'w1', tipo: 'kpi', colSpan: 3, titulo: 'Total MRR', sourceId: 'contratos', metrica: 'SUM', campoY: 'valor_mrr', cor: '#10B981', formula: '', filtros: [], camposTabela: [], campoX: '' },
      { id: 'w2', tipo: 'kpi', colSpan: 3, titulo: 'Contratos Ativos', sourceId: 'contratos', metrica: 'COUNT', cor: '#6366F1', formula: '', filtros: [{ campo: 'status', valor: 'ativo' }], camposTabela: [], campoX: '' },
      { id: 'w3', tipo: 'bar', colSpan: 6, titulo: 'MRR por Empresa', sourceId: 'contratos', metrica: 'SUM', campoY: 'valor_mrr', campoX: 'empresa', cor: '#3B82F6', formula: '', filtros: [], camposTabela: [] },
      { id: 'w4', tipo: 'pie', colSpan: 6, titulo: 'Distribuição por Status', sourceId: 'contratos', metrica: 'COUNT', campoX: 'status', cor: '#6366F1', formula: '', filtros: [], camposTabela: [] },
    ],
  },
  {
    id: 'preset_pipeline',
    nome: 'Pipeline de Vendas',
    descricao: 'Oportunidades por etapa e responsável',
    icone: '📈',
    widgets: [
      { id: 'w1', tipo: 'kpi', colSpan: 4, titulo: 'Total em Negociação', sourceId: 'oportunidades', metrica: 'SUM', campoY: 'valor', cor: '#6366F1', formula: '', filtros: [], camposTabela: [], campoX: '' },
      { id: 'w2', tipo: 'kpi', colSpan: 4, titulo: 'Qtd. Oportunidades', sourceId: 'oportunidades', metrica: 'COUNT', cor: '#F59E0B', formula: '', filtros: [], camposTabela: [], campoX: '' },
      { id: 'w3', tipo: 'kpi', colSpan: 4, titulo: 'Ganhas', sourceId: 'oportunidades', metrica: 'COUNT', cor: '#10B981', formula: '', filtros: [{ campo: 'situacao', valor: 'ganha' }], camposTabela: [], campoX: '' },
      { id: 'w4', tipo: 'bar', colSpan: 12, titulo: 'Valor por Etapa', sourceId: 'oportunidades', metrica: 'SUM', campoY: 'valor', campoX: 'etapa', cor: '#6366F1', formula: '', filtros: [], camposTabela: [] },
    ],
  },
  {
    id: 'preset_cs',
    nome: 'Saúde dos Clientes',
    descricao: 'Health Score e LAER Stage por empresa',
    icone: '💚',
    widgets: [
      { id: 'w1', tipo: 'kpi', colSpan: 4, titulo: 'Score Médio', sourceId: 'cs_health', metrica: 'AVG', campoY: 'score', cor: '#10B981', formula: '', filtros: [], camposTabela: [], campoX: '' },
      { id: 'w2', tipo: 'pie', colSpan: 4, titulo: 'Distribuição por Nível', sourceId: 'cs_health', metrica: 'COUNT', campoX: 'nivel', cor: '#10B981', formula: '', filtros: [], camposTabela: [] },
      { id: 'w3', tipo: 'bar', colSpan: 4, titulo: 'Score por Empresa', sourceId: 'cs_health', metrica: 'AVG', campoY: 'score', campoX: 'empresa', cor: '#10B981', formula: '', filtros: [], camposTabela: [] },
      { id: 'w4', tipo: 'table', colSpan: 12, titulo: 'Detalhe — Customer Success', sourceId: 'cs_health', metrica: 'COUNT', campoX: '', cor: '#10B981', formula: '', filtros: [], camposTabela: ['empresa', 'score', 'nivel', 'laer'] },
    ],
  },
  {
    id: 'preset_projetos',
    nome: 'Status dos Projetos',
    descricao: 'Projetos por fase, status e carga horária',
    icone: '📁',
    widgets: [
      { id: 'w1', tipo: 'kpi', colSpan: 4, titulo: 'Total Horas Estimadas', sourceId: 'projetos', metrica: 'SUM', campoY: 'horas_est', cor: '#F59E0B', formula: '', filtros: [], camposTabela: [], campoX: '' },
      { id: 'w2', tipo: 'kpi', colSpan: 4, titulo: 'Total Horas Executadas', sourceId: 'projetos', metrica: 'SUM', campoY: 'horas_exec', cor: '#10B981', formula: '', filtros: [], camposTabela: [], campoX: '' },
      { id: 'w3', tipo: 'pie', colSpan: 4, titulo: 'Projetos por Status', sourceId: 'projetos', metrica: 'COUNT', campoX: 'status', cor: '#F59E0B', formula: '', filtros: [], camposTabela: [] },
      { id: 'w4', tipo: 'bar', colSpan: 12, titulo: 'Horas por Fase', sourceId: 'projetos', metrica: 'SUM', campoY: 'horas_exec', campoX: 'fase', cor: '#F59E0B', formula: '', filtros: [], camposTabela: [] },
    ],
  },
]
