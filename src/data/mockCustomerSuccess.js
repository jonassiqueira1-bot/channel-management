// ─── Customer Success — Partner Health ────────────────────────────────────────
// Em produção: tabela `partner_health` no Supabase com RLS por tenant_id

export const LAER_STAGES = [
  { value: 'Land',   label: 'Land',   color: 'var(--accent)', bg: '#EDE9FE' },
  { value: 'Adopt',  label: 'Adopt',  color: '#3B82F6', bg: '#DBEAFE' },
  { value: 'Expand', label: 'Expand', color: '#10B981', bg: '#D1FAE5' },
  { value: 'Renew',  label: 'Renew',  color: '#F59E0B', bg: '#FEF3C7' },
]

export const TOUCH_MODELS = [
  { value: 'Tech-Touch', label: 'Tech-Touch', color: 'var(--accent)' },
  { value: 'Mid-Touch',  label: 'Mid-Touch',  color: '#3B82F6' },
  { value: 'High-Touch', label: 'High-Touch', color: '#10B981' },
]

export function healthColor(score) {
  if (score >= 80) return { color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' }
  if (score >= 50) return { color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' }
  return { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' }
}

export const STORAGE_KEY = 'cs:partner_health_v1'

export const MOCK_PARTNER_HEALTH = [
  {
    id: 'ph1', tenant_id: 't1', company_id: 1,
    company_name: 'Nexus Tech', company_city: 'São Paulo', company_uf: 'SP',
    csm: 'Carla Menezes',
    laer_stage: 'Expand', touch_model: 'High-Touch',
    health_score: 87,
    renewal_date: '2026-12-31',
    notes: 'Parceiro estratégico com alto engajamento. Concluiu onboarding em tempo recorde e já expandiu para 3 filiais.',
    action_plans: [
      { id: 'ap1', text: 'QBR agendado para 2026-07-15', done: false },
      { id: 'ap2', text: 'Apresentar módulo de Analytics Pro', done: false },
      { id: 'ap3', text: 'Indicar ao programa de parceiros Gold', done: true },
    ],
    checkins: [
      { id: 'ci1', date: '2026-06-10', type: 'Reunião', summary: 'Revisão de metas Q2. Atingiu 112% da meta de ativação.' },
      { id: 'ci2', date: '2026-05-02', type: 'E-mail', summary: 'Compartilhou feedback positivo sobre suporte técnico.' },
    ],
    criado_em: '2024-03-10',
  },
  {
    id: 'ph2', tenant_id: 't1', company_id: 2,
    company_name: 'Alpha Dist.', company_city: 'Curitiba', company_uf: 'PR',
    csm: 'Fernanda Rocha',
    laer_stage: 'Adopt', touch_model: 'Mid-Touch',
    health_score: 62,
    renewal_date: '2026-09-30',
    notes: 'Em fase de adoção. Treinamentos concluídos mas uso da plataforma ainda abaixo do esperado.',
    action_plans: [
      { id: 'ap4', text: 'Webinar de boas práticas — agendar para julho', done: false },
      { id: 'ap5', text: 'Revisão do plano de ativação com gestor local', done: false },
    ],
    checkins: [
      { id: 'ci3', date: '2026-06-05', type: 'Ligação', summary: 'Identificado gargalo no processo de cadastro de oportunidades.' },
    ],
    criado_em: '2024-05-22',
  },
  {
    id: 'ph3', tenant_id: 't1', company_id: 6,
    company_name: 'FinCorp Soluções', company_city: 'Porto Alegre', company_uf: 'RS',
    csm: 'Lucas Ferreira',
    laer_stage: 'Land', touch_model: 'High-Touch',
    health_score: 41,
    renewal_date: '2027-03-31',
    notes: 'Novo parceiro. Onboarding em andamento. Equipe pequena, requer acompanhamento intensivo.',
    action_plans: [
      { id: 'ap6', text: 'Completar onboarding técnico — prazo: 2026-06-30', done: false },
      { id: 'ap7', text: 'Criar plano de ativação personalizado', done: false },
      { id: 'ap8', text: 'Kick-off com equipe comercial realizado', done: true },
    ],
    checkins: [
      { id: 'ci4', date: '2026-06-12', type: 'Reunião', summary: 'Kick-off realizado. Time alinhado sobre metas iniciais.' },
    ],
    criado_em: '2026-06-01',
  },
  {
    id: 'ph4', tenant_id: 't1', company_id: 4,
    company_name: 'Milenium Const.', company_city: 'Rio de Janeiro', company_uf: 'RJ',
    csm: 'Carla Menezes',
    laer_stage: 'Renew', touch_model: 'Mid-Touch',
    health_score: 91,
    renewal_date: '2026-08-15',
    notes: 'Parceiro maduro. Renovação prevista em agosto. Muito satisfeito com ROI.',
    action_plans: [
      { id: 'ap9', text: 'Enviar proposta de renovação até 2026-07-01', done: false },
      { id: 'ap10', text: 'Oferecer upgrade para plano Enterprise', done: false },
    ],
    checkins: [
      { id: 'ci5', date: '2026-06-08', type: 'E-mail', summary: 'Confirmou intenção de renovar e interesse em ampliar uso.' },
      { id: 'ci6', date: '2026-05-15', type: 'Reunião', summary: 'QBR: NPS 9/10, ROI estimado em 340%.' },
    ],
    criado_em: '2024-01-15',
  },
  {
    id: 'ph5', tenant_id: 't1', company_id: 5,
    company_name: 'Grupo Serra Sul', company_city: 'Florianópolis', company_uf: 'SC',
    csm: 'Fernanda Rocha',
    laer_stage: 'Adopt', touch_model: 'Tech-Touch',
    health_score: 55,
    renewal_date: '2027-01-31',
    notes: 'Parceiro digital-first. Usa bastante o portal self-service. Engajamento via email automático.',
    action_plans: [
      { id: 'ap11', text: 'Configurar sequência de nurturing automática', done: true },
      { id: 'ap12', text: 'Ativar relatórios automáticos mensais', done: false },
    ],
    checkins: [
      { id: 'ci7', date: '2026-05-20', type: 'E-mail', summary: 'Automação de boas-vindas ativada. Abriu 4 de 5 emails.' },
    ],
    criado_em: '2024-11-10',
  },
  {
    id: 'ph6', tenant_id: 't1', company_id: 7,
    company_name: 'TechBridge RS', company_city: 'Caxias do Sul', company_uf: 'RS',
    csm: 'Lucas Ferreira',
    laer_stage: 'Expand', touch_model: 'High-Touch',
    health_score: 78,
    renewal_date: '2026-11-30',
    notes: 'Em expansão. Abertas 2 novas filiais. Oportunidade para up-sell do módulo Integrações.',
    action_plans: [
      { id: 'ap13', text: 'Demonstração do módulo Integrações — agendar', done: false },
      { id: 'ap14', text: 'Mapear necessidades das novas filiais', done: false },
      { id: 'ap15', text: 'Contrato de expansão enviado', done: true },
    ],
    checkins: [
      { id: 'ci8', date: '2026-06-11', type: 'Ligação', summary: 'Confirmou abertura de 2 filiais. Quer integração com ERP.' },
    ],
    criado_em: '2024-07-05',
  },
]
