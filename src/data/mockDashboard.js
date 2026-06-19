// Mock data para o Dashboard ISV/FRANCHISE
// Em produção: SELECT * FROM critical_alerts WHERE tenant_id = ... AND is_resolved = false
// Em produção: SELECT * FROM user_dashboard_widgets WHERE user_id = auth.uid()

export const DASHBOARD_STORAGE_KEY  = 'dashboard:widgets_v2'
export const ALERTS_STORAGE_KEY     = 'dashboard:alerts_v1'

// ─── Alertas críticos ─────────────────────────────────────────────────────────
export const MOCK_ALERTS = [
  {
    id: 'a1',
    tenant_id: 'a0000000-0000-0000-0000-000000000001',
    company_id: 'a0000000-0000-0000-0000-000000000002',
    severity: 'critical',
    title: 'Franquia Nexus Tech sem contrato ativo',
    description: 'O contrato principal da Nexus Tech venceu há 12 dias. Receita em risco: R$ 42.000/mês.',
    action_label: 'Ver contrato',
    action_url: '/contratos',
    is_resolved: false,
    created_at: '2026-06-01T09:00:00Z',
  },
  {
    id: 'a2',
    tenant_id: 'a0000000-0000-0000-0000-000000000001',
    company_id: null,
    severity: 'warning',
    title: '3 questionários técnicos sem resposta há +7 dias',
    description: 'Franquias Alpha Dist. e FinCorp aguardam suporte técnico.',
    action_label: 'Ver questionários',
    action_url: '/questionarios',
    is_resolved: false,
    created_at: '2026-06-05T14:00:00Z',
  },
  {
    id: 'a3',
    tenant_id: 'a0000000-0000-0000-0000-000000000001',
    company_id: 'a0000000-0000-0000-0000-000000000003',
    severity: 'info',
    title: 'Meta de CDU da Alpha Dist. atingida',
    description: 'Alpha Dist. atingiu 103% da meta mensal de CDU.',
    action_label: 'Ver relatório',
    action_url: '/metas',
    is_resolved: false,
    created_at: '2026-06-10T08:00:00Z',
  },
]

// ─── Widgets padrão para perfil ISV ──────────────────────────────────────────
export const DEFAULT_WIDGETS_ISV = [
  { id:'isv_cdu',        position:0, col_span:1, row_span:1, is_visible:true, settings:{ meta: 850000 } },
  { id:'isv_sms',        position:1, col_span:1, row_span:1, is_visible:true, settings:{ meta: 320000 } },
  { id:'isv_servicos',   position:2, col_span:1, row_span:1, is_visible:true, settings:{ meta: 210000 } },
  { id:'isv_franquias',  position:3, col_span:1, row_span:1, is_visible:true, settings:{} },
  { id:'isv_chart_bar',  position:4, col_span:2, row_span:2, is_visible:true, settings:{} },
  { id:'isv_chart_pie',  position:5, col_span:1, row_span:2, is_visible:true, settings:{} },
  { id:'isv_oport',      position:6, col_span:1, row_span:1, is_visible:true, settings:{} },
  { id:'isv_projetos',   position:7, col_span:1, row_span:1, is_visible:true, settings:{} },
  { id:'isv_pipeline',   position:8, col_span:2, row_span:1, is_visible:true, settings:{} },
]

// ─── Widgets padrão para perfil FRANCHISE ────────────────────────────────────
export const DEFAULT_WIDGETS_FRANCHISE = [
  { id:'fr_oport',      position:0, col_span:1, row_span:1, is_visible:true, settings:{ meta: 15 } },
  { id:'fr_projetos',   position:1, col_span:1, row_span:1, is_visible:true, settings:{ meta: 8 } },
  { id:'fr_quest',      position:2, col_span:1, row_span:1, is_visible:true, settings:{} },
  { id:'fr_cdu',        position:3, col_span:1, row_span:1, is_visible:true, settings:{ meta: 120000 } },
  { id:'fr_pipeline',   position:4, col_span:2, row_span:2, is_visible:true, settings:{} },
  { id:'fr_atv',        position:5, col_span:2, row_span:2, is_visible:true, settings:{} },
]

// ─── Sections model (layout builder) ─────────────────────────────────────────
export const SECTIONS_STORAGE_KEY = 'dashboard:sections_v2'
export const GLOBAL_FILTERS_KEY   = 'dashboard:global_filters_v1'

export const DEFAULT_SECTIONS_ISV = [
  {
    id: 'sc-isv-1', layout: '1-1-1-1',
    slots: [
      { id:'sl-isv-1', widgetId:'isv_cdu',       settings:{ meta:850000 } },
      { id:'sl-isv-2', widgetId:'isv_sms',       settings:{ meta:320000 } },
      { id:'sl-isv-3', widgetId:'isv_servicos',  settings:{ meta:210000 } },
      { id:'sl-isv-4', widgetId:'isv_franquias', settings:{} },
    ],
  },
  {
    id: 'sc-isv-2', layout: '2-1-1',
    slots: [
      { id:'sl-isv-5', widgetId:'isv_chart_bar', settings:{} },
      { id:'sl-isv-6', widgetId:'isv_chart_pie', settings:{} },
      { id:'sl-isv-7', widgetId:'isv_oport',     settings:{} },
    ],
  },
  {
    id: 'sc-isv-3', layout: '2-2',
    slots: [
      { id:'sl-isv-8', widgetId:'isv_pipeline',  settings:{} },
      { id:'sl-isv-9', widgetId:'isv_projetos',  settings:{} },
    ],
  },
]

export const DEFAULT_SECTIONS_FRANCHISE = [
  {
    id: 'sc-fr-1', layout: '1-1-1-1',
    slots: [
      { id:'sl-fr-1', widgetId:'fr_oport',    settings:{ meta:15 } },
      { id:'sl-fr-2', widgetId:'fr_projetos', settings:{ meta:8  } },
      { id:'sl-fr-3', widgetId:'fr_quest',    settings:{} },
      { id:'sl-fr-4', widgetId:'fr_cdu',      settings:{ meta:120000 } },
    ],
  },
  {
    id: 'sc-fr-2', layout: '2-2',
    slots: [
      { id:'sl-fr-5', widgetId:'fr_pipeline', settings:{} },
      { id:'sl-fr-6', widgetId:'fr_atv',      settings:{} },
    ],
  },
]

export function applyFilters(analytics, filters) {
  if (!filters) return analytics
  const mult = ({ this_month:1, last_3m:2.85, this_year:10.4 })[filters.period] || 1
  if (filters.franchise && filters.franchise !== 'all' && analytics.por_franquia) {
    const fr = analytics.por_franquia.find(f => f.nome === filters.franchise)
    if (fr) return {
      ...analytics,
      cdu_receita:      Math.round(fr.cdu      * mult),
      sms_receita:      Math.round(fr.sms      * mult),
      servicos_receita: Math.round(fr.servicos * mult),
      oportunidades:    Math.round(analytics.oportunidades    / 3 * mult),
      projetos_ativos:  Math.round(analytics.projetos_ativos  / 3 * mult),
      contratos_ativos: Math.round(analytics.contratos_ativos / 3 * mult),
      franquias_ativas: 1,
    }
  }
  if (mult === 1) return analytics
  return {
    ...analytics,
    cdu_receita:      Math.round(analytics.cdu_receita      * mult),
    sms_receita:      Math.round(analytics.sms_receita      * mult),
    servicos_receita: Math.round(analytics.servicos_receita * mult),
    oportunidades:    Math.round(analytics.oportunidades    * mult),
    projetos_ativos:  Math.round(analytics.projetos_ativos  * mult),
    contratos_ativos: Math.round(analytics.contratos_ativos * mult),
  }
}

// ─── Dados analíticos mocados ─────────────────────────────────────────────────
export const MOCK_ANALYTICS = {
  isv: {
    cdu_receita:      712400,
    sms_receita:      287300,
    servicos_receita: 184600,
    franquias_ativas: 3,
    oportunidades:    47,
    projetos_ativos:  18,
    taxa_conversao:   18,
    ticket_medio:     24500,
    contratos_ativos: 94,

    // Receita por franquia (para gráfico de barras / pizza)
    por_franquia: [
      { nome: 'Nexus Tech',  cdu: 310000, sms: 118000, servicos: 82000,  color: 'var(--accent)' },
      { nome: 'Alpha Dist.', cdu: 242000, sms:  89000, servicos: 54000,  color: '#0EA5E9' },
      { nome: 'FinCorp',     cdu: 160400, sms:  80300, servicos: 48600,  color: '#10B981' },
    ],

    // Pipeline por etapa
    pipeline: [
      { etapa: 'Prospecção',   qtd: 14, valor: 186000 },
      { etapa: 'Qualificação', qtd:  9, valor: 312000 },
      { etapa: 'Proposta',     qtd:  8, valor: 428000 },
      { etapa: 'Negociação',   qtd:  7, valor: 195000 },
      { etapa: 'Fechamento',   qtd:  9, valor: 280000 },
    ],
  },

  franchise: {
    oportunidades:    11,
    projetos_ativos:   5,
    questionarios:     3,
    cdu_receita:      242000,
    sms_receita:       89000,
    servicos_receita:  54000,
    taxa_conversao:    22,
    ticket_medio:      18200,
    contratos_ativos:  28,

    pipeline: [
      { etapa: 'Prospecção',   qtd: 3, valor: 48000 },
      { etapa: 'Qualificação', qtd: 2, valor: 76000 },
      { etapa: 'Proposta',     qtd: 3, valor: 112000 },
      { etapa: 'Negociação',   qtd: 2, valor: 68000 },
      { etapa: 'Fechamento',   qtd: 1, valor: 42000 },
    ],

    atividades_recentes: [
      { id:1, tipo:'oportunidade', titulo:'MedGroup — Renovação anual',   data:'2026-06-11', status:'em_andamento' },
      { id:2, tipo:'projeto',      titulo:'Implantação Solaris Fase 2',   data:'2026-06-10', status:'em_andamento' },
      { id:3, tipo:'questionario', titulo:'Dúvida técnica CDU — Logix',   data:'2026-06-09', status:'pendente'     },
      { id:4, tipo:'oportunidade', titulo:'AgriSmart — Upgrade de plano', data:'2026-06-08', status:'ganho'        },
      { id:5, tipo:'projeto',      titulo:'Milenium — Documentação',       data:'2026-06-07', status:'concluido'   },
    ],
  },
}
