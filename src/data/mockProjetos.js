// ─── Mock: projects + phases + time logs + issues + attachments ───────────────

export const PROJECTS_STORAGE_KEY  = 'projects:data_v1'
export const TIME_LOGS_STORAGE_KEY = 'projects:time_logs_v1'
export const PHASES_STORAGE_KEY    = 'projects:phases_v1'
export const MEMBERS_STORAGE_KEY   = 'projects:members_v1'

export const FASES_MIT = [
  { value: 'iniciacao',    label: 'Iniciação',    color: '#6366F1', bg: 'rgba(99,102,241,0.10)',  text: '#4338CA', order: 1 },
  { value: 'modelagem',    label: 'Modelagem',    color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  text: '#1D4ED8', order: 2 },
  { value: 'implantacao',  label: 'Implantação',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',  text: '#6D28D9', order: 3 },
  { value: 'treinamento',  label: 'Treinamento',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  text: '#B45309', order: 4 },
  { value: 'go_live',      label: 'Go-Live',      color: '#10B981', bg: 'rgba(16,185,129,0.10)',  text: '#047857', order: 5 },
  { value: 'encerramento', label: 'Encerramento', color: '#6B7280', bg: 'rgba(107,114,128,0.10)', text: '#374151', order: 6 },
]

export const PHASE_NAMES = ['Iniciação', 'Modelagem', 'Implantação', 'Treinamento', 'Go-Live', 'Encerramento']

export const STATUS_PROJETO = {
  em_andamento: { label: 'Em andamento', color: '#3B82F6', bg: '#DBEAFE', text: '#1E3A5F' },
  suspenso:     { label: 'Suspenso',     color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  concluido:    { label: 'Concluído',    color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
}

export const CRITICALITY_CFG = {
  baixa:   { label: 'Baixa',   color: '#6B7280', bg: '#F3F4F6', text: '#374151' },
  media:   { label: 'Média',   color: '#3B82F6', bg: '#DBEAFE', text: '#1E3A5F' },
  alta:    { label: 'Alta',    color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  critica: { label: 'Crítica', color: '#EF4444', bg: '#FEE2E2', text: '#991B1B' },
}

// ─── Histórico comercial ──────────────────────────────────────────────────────
export const MOCK_OPP_HISTORICO = {
  'opp-1': {
    titulo: 'Implantação ERP — Nexus Tech',
    valor_total: 48900, valor_cdu: 24000, valor_sms: 1400, valor_servico: 23500,
    vendedor: 'Lucas Ferreira', data_fechamento: '2026-05-28', origem: 'Inbound',
    notas: 'Cliente com urgência para migrar do sistema legado até Q3. Diretor de TI (Paulo Marques) sinalizou resistência interna da equipe financeira — reforçar durante treinamento.',
  },
  'opp-5': {
    titulo: 'HIS Clínico — MedGroup',
    valor_total: 112000, valor_cdu: 60000, valor_sms: 2000, valor_servico: 50000,
    vendedor: 'Mariana Silva', data_fechamento: '2026-02-14', origem: 'Indicação',
    notas: 'Projeto estratégico para expansão na vertical saúde. Contrato assinado diretamente com o CEO. Atenção à LGPD e prontuário eletrônico. Prazo contratual improrrogável.',
  },
  'opp-6': {
    titulo: 'ERP Full — FinCorp',
    valor_total: 185000, valor_cdu: 96000, valor_sms: 9000, valor_servico: 80000,
    vendedor: 'Carla Menezes', data_fechamento: '2025-12-10', origem: 'Canal',
    notas: 'Negociação longa (8 meses). Cliente muito exigente em SLA. CFO envolvido diretamente. Multa contratual de 15% em atraso. Integração bancária é pré-requisito para go-live.',
  },
}

// ─── Projetos ─────────────────────────────────────────────────────────────────
export const MOCK_PROJETOS = [
  { id:'prj1', tenant_id:'t1', company_id:1, company_nome:'Nexus Tech',   franchise_id:'f1', franchise_nome:'Canal SP Sul',    opportunity_id:'opp-1', name:'Implantação ERP — Nexus Tech',    phase:'iniciacao',    current_phase_index:1, status:'em_andamento', total_hours_estimated:120, total_hours_executed:8,   start_date:'2026-06-01', end_date_estimated:'2026-09-30', notes:'Kickoff realizado. Aguardando levantamento de requisitos.',          created_at:'2026-06-01' },
  { id:'prj2', tenant_id:'t1', company_id:7, company_nome:'Logix',        franchise_id:null,  franchise_nome:null,              opportunity_id:null,    name:'Implantação CRM — Logix',         phase:'iniciacao',    current_phase_index:1, status:'em_andamento', total_hours_estimated:80,  total_hours_executed:4,   start_date:'2026-06-05', end_date_estimated:'2026-08-31', notes:'',                                                                    created_at:'2026-06-05' },
  { id:'prj3', tenant_id:'t1', company_id:4, company_nome:'Milenium',     franchise_id:'f2', franchise_nome:'Canal RJ Centro', opportunity_id:null,    name:'ERP Financeiro — Milenium',       phase:'modelagem',    current_phase_index:2, status:'em_andamento', total_hours_estimated:200, total_hours_executed:48,  start_date:'2026-05-01', end_date_estimated:'2026-10-15', notes:'Modelagem de processos financeiros e contábeis em andamento.',       created_at:'2026-05-01' },
  { id:'prj4', tenant_id:'t1', company_id:5, company_nome:'AgriSmart',    franchise_id:'f1', franchise_nome:'Canal SP Sul',    opportunity_id:null,    name:'BI Agro — AgriSmart',             phase:'modelagem',    current_phase_index:2, status:'suspenso',     total_hours_estimated:60,  total_hours_executed:12,  start_date:'2026-04-15', end_date_estimated:'2026-07-31', notes:'Suspenso aguardando aprovação de escopo pelo cliente.',              created_at:'2026-04-15' },
  { id:'prj5', tenant_id:'t1', company_id:8, company_nome:'MedGroup',     franchise_id:'f3', franchise_nome:'Canal BH Saúde', opportunity_id:'opp-5', name:'HIS Clínico — MedGroup',          phase:'implantacao',  current_phase_index:3, status:'em_andamento', total_hours_estimated:350, total_hours_executed:180, start_date:'2026-03-01', end_date_estimated:'2026-08-31', notes:'Configurações de módulos assistenciais em execução.',                created_at:'2026-03-01' },
  { id:'prj6', tenant_id:'t1', company_id:6, company_nome:'FinCorp',      franchise_id:null,  franchise_nome:null,              opportunity_id:'opp-6', name:'ERP Full — FinCorp',              phase:'implantacao',  current_phase_index:3, status:'em_andamento', total_hours_estimated:480, total_hours_executed:310, start_date:'2026-01-10', end_date_estimated:'2026-09-10', notes:'Parametrização fiscal concluída. Integrações em andamento.',         created_at:'2026-01-10' },
  { id:'prj7', tenant_id:'t1', company_id:3, company_nome:'Solaris',      franchise_id:'f2', franchise_nome:'Canal RJ Centro', opportunity_id:null,    name:'ERP Comercial — Solaris',         phase:'treinamento',  current_phase_index:4, status:'em_andamento', total_hours_estimated:160, total_hours_executed:130, start_date:'2026-02-15', end_date_estimated:'2026-07-15', notes:'Treinamento de usuários chave concluído. Multiplicadores em andamento.', created_at:'2026-02-15' },
  { id:'prj8', tenant_id:'t1', company_id:2, company_nome:'Alpha Dist.',  franchise_id:'f1', franchise_nome:'Canal SP Sul',    opportunity_id:null,    name:'WMS Distribuição — Alpha',        phase:'go_live',      current_phase_index:5, status:'em_andamento', total_hours_estimated:240, total_hours_executed:225, start_date:'2026-01-20', end_date_estimated:'2026-06-30', notes:'Operação paralela encerrada. Go-live produtivo em 30/06.',           created_at:'2026-01-20' },
  { id:'prj9', tenant_id:'t1', company_id:1, company_nome:'Nexus Tech',   franchise_id:null,  franchise_nome:null,              opportunity_id:null,    name:'CRM Comercial — Nexus (2025)',    phase:'encerramento', current_phase_index:6, status:'concluido',    total_hours_estimated:100, total_hours_executed:98,  start_date:'2025-09-01', end_date_estimated:'2026-03-31', notes:'Projeto concluído com sucesso. TAF assinado pelo cliente.',          created_at:'2025-09-01' },
]

// ─── Fases MIT (6 por projeto) ────────────────────────────────────────────────
function buildPhases(projectId, currentOrder, hoursArr, baseDate) {
  const base = new Date(baseDate).getTime()
  return PHASE_NAMES.map((name, i) => {
    const order  = i + 1
    const startMs = base + i * 21 * 86400000
    return {
      id: `ph_${projectId}_${order}`,
      project_id: projectId, tenant_id: 't1',
      phase_name: name, phase_order: order,
      start_date_planned: new Date(startMs).toISOString().slice(0, 10),
      end_date_planned:   new Date(startMs + 20 * 86400000).toISOString().slice(0, 10),
      hours_estimated: hoursArr[i],
      is_completed: order < currentOrder,
      completed_at: order < currentOrder ? new Date(startMs + 18 * 86400000).toISOString() : null,
    }
  })
}

export const MOCK_PROJECT_PHASES = [
  ...buildPhases('prj1', 1, [20, 30,  30, 20, 10, 10], '2026-06-01'),
  ...buildPhases('prj2', 1, [14, 18,  20, 14,  8,  6], '2026-06-05'),
  ...buildPhases('prj3', 2, [30, 50,  60, 30, 20, 10], '2026-05-01'),
  ...buildPhases('prj4', 2, [10, 15,  15, 10,  5,  5], '2026-04-15'),
  ...buildPhases('prj5', 3, [50, 80, 120, 60, 30, 10], '2026-03-01'),
  ...buildPhases('prj6', 3, [60,100, 160, 80, 60, 20], '2026-01-10'),
  ...buildPhases('prj7', 4, [20, 30,  50, 40, 15,  5], '2026-02-15'),
  ...buildPhases('prj8', 5, [30, 50,  80, 50, 25,  5], '2026-01-20'),
  ...buildPhases('prj9', 7, [15, 25,  30, 20,  8,  2], '2025-09-01'),
]

// ─── Time logs ────────────────────────────────────────────────────────────────
function ph(prjId, order) { return `ph_${prjId}_${order}` }

export const MOCK_TIME_LOGS = [
  // prj1 — fase 1 (est 20h, exe 8h = 40%)
  { id:'tl1',  project_id:'prj1', phase_id:ph('prj1',1), tenant_id:'t1', user_name:'Ana Costa',       hours_executed:4,   description:'Reunião de kickoff e apresentação ao cliente',              logged_at:'2026-06-03' },
  { id:'tl2',  project_id:'prj1', phase_id:ph('prj1',1), tenant_id:'t1', user_name:'Ana Costa',       hours_executed:4,   description:'Levantamento inicial de processos com gestor de TI',       logged_at:'2026-06-05' },

  // prj3 — fase 1 concluída + fase 2 em andamento (est 50h, exe 15h = 30%)
  { id:'tl3',  project_id:'prj3', phase_id:ph('prj3',1), tenant_id:'t1', user_name:'Roberto Lima',    hours_executed:28,  description:'Kickoff, TAP e levantamento de stakeholders',               logged_at:'2026-05-10' },
  { id:'tl4',  project_id:'prj3', phase_id:ph('prj3',1), tenant_id:'t1', user_name:'Roberto Lima',    hours_executed:5,   description:'Ajustes no TAP após revisão do Diretor Financeiro',          logged_at:'2026-05-15' },
  { id:'tl5',  project_id:'prj3', phase_id:ph('prj3',2), tenant_id:'t1', user_name:'Roberto Lima',    hours_executed:10,  description:'Modelagem fluxo contas a pagar e aprovações',                logged_at:'2026-05-28' },
  { id:'tl6',  project_id:'prj3', phase_id:ph('prj3',2), tenant_id:'t1', user_name:'Fernanda Rocha',  hours_executed:5,   description:'Modelagem integração bancária (CNAB240)',                    logged_at:'2026-06-04' },

  // prj5 — fases 1,2 concluídas + fase 3 (est 120h, exe 108h = 90%) → SUGESTÃO AVANÇAR
  { id:'tl7',  project_id:'prj5', phase_id:ph('prj5',1), tenant_id:'t1', user_name:'Mariana Silva',   hours_executed:50,  description:'Iniciação completa — TAP e levantamento assistencial',        logged_at:'2026-03-18' },
  { id:'tl8',  project_id:'prj5', phase_id:ph('prj5',2), tenant_id:'t1', user_name:'Mariana Silva',   hours_executed:80,  description:'Modelagem concluída — internação, UTI, farmácia',             logged_at:'2026-04-20' },
  { id:'tl9',  project_id:'prj5', phase_id:ph('prj5',3), tenant_id:'t1', user_name:'Mariana Silva',   hours_executed:40,  description:'Configuração módulo internação e leitos',                    logged_at:'2026-05-10' },
  { id:'tl10', project_id:'prj5', phase_id:ph('prj5',3), tenant_id:'t1', user_name:'Fernanda Rocha',  hours_executed:30,  description:'Configuração módulo prescrição médica',                      logged_at:'2026-05-22' },
  { id:'tl11', project_id:'prj5', phase_id:ph('prj5',3), tenant_id:'t1', user_name:'Mariana Silva',   hours_executed:38,  description:'Testes integrados com sistema legado Tasy (parcial)',        logged_at:'2026-06-05' },

  // prj6 — fases 1,2 concluídas + fase 3 (est 160h, exe 150h = 93.75%) → SUGESTÃO AVANÇAR
  { id:'tl12', project_id:'prj6', phase_id:ph('prj6',1), tenant_id:'t1', user_name:'Carla Menezes',   hours_executed:60,  description:'Iniciação — levantamento fiscal, contábil e societário',     logged_at:'2026-02-05' },
  { id:'tl13', project_id:'prj6', phase_id:ph('prj6',2), tenant_id:'t1', user_name:'Carla Menezes',   hours_executed:100, description:'Modelagem completa todos os módulos ERP',                    logged_at:'2026-03-20' },
  { id:'tl14', project_id:'prj6', phase_id:ph('prj6',3), tenant_id:'t1', user_name:'Pedro Alves',     hours_executed:60,  description:'Parametrização módulo fiscal e SPED',                        logged_at:'2026-04-15' },
  { id:'tl15', project_id:'prj6', phase_id:ph('prj6',3), tenant_id:'t1', user_name:'Pedro Alves',     hours_executed:50,  description:'Configuração contábil e DRE por filial',                     logged_at:'2026-05-10' },
  { id:'tl16', project_id:'prj6', phase_id:ph('prj6',3), tenant_id:'t1', user_name:'Carla Menezes',   hours_executed:40,  description:'Integração bancária Bradesco (homologação)',                  logged_at:'2026-06-08' },

  // prj7 — fases 1,2,3 concluídas + fase 4 (est 40h, exe 30h = 75%)
  { id:'tl17', project_id:'prj7', phase_id:ph('prj7',1), tenant_id:'t1', user_name:'Igor Teixeira',   hours_executed:20,  description:'Iniciação e levantamento de processos comerciais',           logged_at:'2026-02-22' },
  { id:'tl18', project_id:'prj7', phase_id:ph('prj7',2), tenant_id:'t1', user_name:'Igor Teixeira',   hours_executed:30,  description:'Modelagem processos de vendas e CRM',                        logged_at:'2026-03-18' },
  { id:'tl19', project_id:'prj7', phase_id:ph('prj7',3), tenant_id:'t1', user_name:'Igor Teixeira',   hours_executed:50,  description:'Implantação módulos vendas, estoque e faturamento',          logged_at:'2026-04-30' },
  { id:'tl20', project_id:'prj7', phase_id:ph('prj7',4), tenant_id:'t1', user_name:'Igor Teixeira',   hours_executed:20,  description:'Treinamento usuários chave — vendedores e supervisores',     logged_at:'2026-05-25' },
  { id:'tl21', project_id:'prj7', phase_id:ph('prj7',4), tenant_id:'t1', user_name:'Patrícia Souza',  hours_executed:10,  description:'Treinamento equipe de estoque e expedição',                  logged_at:'2026-06-02' },

  // prj8 — fases 1-4 concluídas + fase 5 go-live (est 25h, exe 22h = 88%)
  { id:'tl22', project_id:'prj8', phase_id:ph('prj8',1), tenant_id:'t1', user_name:'Rafael Santos',   hours_executed:30,  description:'Levantamento de processos e operações do armazém',           logged_at:'2026-01-28' },
  { id:'tl23', project_id:'prj8', phase_id:ph('prj8',2), tenant_id:'t1', user_name:'Rafael Santos',   hours_executed:50,  description:'Modelagem fluxo armazém, endereçamento e picking',           logged_at:'2026-02-25' },
  { id:'tl24', project_id:'prj8', phase_id:ph('prj8',3), tenant_id:'t1', user_name:'Rafael Santos',   hours_executed:80,  description:'Implantação e parametrização WMS completa',                  logged_at:'2026-04-10' },
  { id:'tl25', project_id:'prj8', phase_id:ph('prj8',4), tenant_id:'t1', user_name:'Rafael Santos',   hours_executed:43,  description:'Treinamento operadores — 3 turnos (manhã, tarde, noite)',    logged_at:'2026-05-20' },
  { id:'tl26', project_id:'prj8', phase_id:ph('prj8',5), tenant_id:'t1', user_name:'Rafael Santos',   hours_executed:12,  description:'Suporte go-live semana 1 — acompanhamento presencial',       logged_at:'2026-06-03' },
  { id:'tl27', project_id:'prj8', phase_id:ph('prj8',5), tenant_id:'t1', user_name:'Rafael Santos',   hours_executed:10,  description:'Suporte go-live semana 2 — resolução de ocorrências',        logged_at:'2026-06-09' },

  // prj9 — encerramento
  { id:'tl28', project_id:'prj9', phase_id:ph('prj9',6), tenant_id:'t1', user_name:'Lucas Ferreira',  hours_executed:2,   description:'Elaboração do TAF e encerramento formal do projeto',         logged_at:'2026-03-28' },
]

// ─── Pendências ───────────────────────────────────────────────────────────────
export const MOCK_PROJECT_ISSUES = [
  { id:'iss1', project_id:'prj5', tenant_id:'t1', description:'Integração com sistema legado Tasy retorna erro 403 no endpoint de alta hospitalar. Aguardando liberação de credenciais pela TI do cliente.', criticality:'critica', status:'aberta',   created_at:'2026-06-02', resolved_at:null },
  { id:'iss2', project_id:'prj5', tenant_id:'t1', description:'Leitos do CTI não aparecem no módulo de internação — divergência no cadastro de centros de custo.',                                           criticality:'alta',    status:'aberta',   created_at:'2026-06-05', resolved_at:null },
  { id:'iss3', project_id:'prj5', tenant_id:'t1', description:'Usuários sem perfil de acesso ao módulo de prescrição médica.',                                                                               criticality:'media',   status:'resolvida', created_at:'2026-05-28', resolved_at:'2026-06-01' },
  { id:'iss4', project_id:'prj6', tenant_id:'t1', description:'API bancária do Bradesco não homologada em produção. Bloqueio total para fechamento contábil automático.',                                    criticality:'critica', status:'aberta',   created_at:'2026-06-08', resolved_at:null },
  { id:'iss5', project_id:'prj6', tenant_id:'t1', description:'SPED fiscal de maio com divergência de R$ 1.240 no ICMS. Contador solicitou reunião urgente.',                                               criticality:'critica', status:'aberta',   created_at:'2026-06-09', resolved_at:null },
  { id:'iss6', project_id:'prj6', tenant_id:'t1', description:'Relatório DRE não consolida filiais corretamente.',                                                                                           criticality:'alta',    status:'aberta',   created_at:'2026-06-07', resolved_at:null },
  { id:'iss7', project_id:'prj6', tenant_id:'t1', description:'Carga de saldos iniciais validada e importada com sucesso.',                                                                                  criticality:'alta',    status:'resolvida', created_at:'2026-05-20', resolved_at:'2026-06-03' },
  { id:'iss8', project_id:'prj3', tenant_id:'t1', description:'Fluxo de aprovação de pagamentos ainda não validado com o gerente financeiro do cliente.',                                                    criticality:'media',   status:'aberta',   created_at:'2026-06-01', resolved_at:null },
  { id:'iss9', project_id:'prj8', tenant_id:'t1', description:'Impressora de etiquetas na doca 3 com falha de comunicação com o WMS. Aguardando técnico da Canon.',                                         criticality:'alta',    status:'aberta',   created_at:'2026-06-10', resolved_at:null },
]

// ─── Anexos ───────────────────────────────────────────────────────────────────
export const MOCK_PROJECT_ATTACHMENTS = [
  { id:'att1',  project_id:'prj1', tenant_id:'t1', name:'Proposta_Comercial_Nexus_ERP.pdf',    file_url:'#', file_size:1240000, mime_type:'application/pdf',         uploaded_by:'Lucas Ferreira',  created_at:'2026-06-01' },
  { id:'att2',  project_id:'prj1', tenant_id:'t1', name:'Contrato_Assinado_Nexus.pdf',         file_url:'#', file_size:890000,  mime_type:'application/pdf',         uploaded_by:'Lucas Ferreira',  created_at:'2026-06-02' },
  { id:'att3',  project_id:'prj1', tenant_id:'t1', name:'Ata_Kickoff_01-06.docx',              file_url:'#', file_size:45000,   mime_type:'application/msword',      uploaded_by:'Ana Costa',        created_at:'2026-06-03' },
  { id:'att4',  project_id:'prj5', tenant_id:'t1', name:'Escopo_Tecnico_MedGroup_HIS.pdf',     file_url:'#', file_size:3200000, mime_type:'application/pdf',         uploaded_by:'Mariana Silva',    created_at:'2026-03-05' },
  { id:'att5',  project_id:'prj5', tenant_id:'t1', name:'Mapeamento_Processos_Clinicos.xlsx',  file_url:'#', file_size:520000,  mime_type:'application/vnd.ms-excel',uploaded_by:'Mariana Silva',    created_at:'2026-03-12' },
  { id:'att6',  project_id:'prj5', tenant_id:'t1', name:'Credenciais_Tasy_PROD.docx',          file_url:'#', file_size:18000,   mime_type:'application/msword',      uploaded_by:'Fernanda Rocha',   created_at:'2026-06-01' },
  { id:'att7',  project_id:'prj6', tenant_id:'t1', name:'Contrato_FinCorp_ERP_FULL.pdf',       file_url:'#', file_size:2100000, mime_type:'application/pdf',         uploaded_by:'Carla Menezes',    created_at:'2025-12-11' },
  { id:'att8',  project_id:'prj6', tenant_id:'t1', name:'Carga_Saldos_Iniciais_2025.xlsx',     file_url:'#', file_size:1800000, mime_type:'application/vnd.ms-excel',uploaded_by:'Carla Menezes',    created_at:'2026-05-18' },
  { id:'att9',  project_id:'prj6', tenant_id:'t1', name:'Log_Homologacao_Bradesco_API.zip',    file_url:'#', file_size:340000,  mime_type:'application/zip',         uploaded_by:'Pedro Alves',      created_at:'2026-06-08' },
  { id:'att10', project_id:'prj8', tenant_id:'t1', name:'Manual_Operacao_WMS_Alpha.pdf',       file_url:'#', file_size:4500000, mime_type:'application/pdf',         uploaded_by:'Rafael Santos',    created_at:'2026-06-05' },
]

// ─── Oportunidades (lista simplificada para o picker de vínculo) ──────────────
export const MOCK_OPORTUNIDADES_LISTA = [
  { id:'opp-1',  titulo:'Implantação ERP — Nexus Tech',    empresa:'Nexus Tech',   valor_total:48900  },
  { id:'opp-2',  titulo:'CRM B2B — Logix',                 empresa:'Logix',        valor_total:22000  },
  { id:'opp-3',  titulo:'ERP Financeiro — Milenium',       empresa:'Milenium',     valor_total:68000  },
  { id:'opp-4',  titulo:'BI Agro — AgriSmart',             empresa:'AgriSmart',    valor_total:18500  },
  { id:'opp-5',  titulo:'HIS Clínico — MedGroup',          empresa:'MedGroup',     valor_total:112000 },
  { id:'opp-6',  titulo:'ERP Full — FinCorp',              empresa:'FinCorp',      valor_total:185000 },
  { id:'opp-7',  titulo:'ERP Comercial — Solaris',         empresa:'Solaris',      valor_total:54000  },
  { id:'opp-8',  titulo:'WMS Distribuição — Alpha Dist.',  empresa:'Alpha Dist.',  valor_total:76000  },
  { id:'opp-9',  titulo:'CRM Comercial — Nexus (2025)',    empresa:'Nexus Tech',   valor_total:32000  },
  { id:'opp-10', titulo:'ERP Industrial — TechForge',      empresa:'TechForge',    valor_total:94000  },
  { id:'opp-11', titulo:'Portal B2B — ComercialNet',       empresa:'ComercialNet', valor_total:41000  },
]

// ─── Membros da equipe por projeto ───────────────────────────────────────────
export const MOCK_PROJECT_MEMBERS = [
  // prj1 — Nexus ERP
  { id:'mb1',  project_id:'prj1', tenant_id:'t1', name:'Ana Costa',       role:'Líder de Projeto' },
  { id:'mb2',  project_id:'prj1', tenant_id:'t1', name:'Carlos Pinto',    role:'Consultor'        },

  // prj3 — Milenium
  { id:'mb3',  project_id:'prj3', tenant_id:'t1', name:'Roberto Lima',    role:'Líder de Projeto' },
  { id:'mb4',  project_id:'prj3', tenant_id:'t1', name:'Fernanda Rocha',  role:'Consultora'       },

  // prj5 — MedGroup HIS
  { id:'mb5',  project_id:'prj5', tenant_id:'t1', name:'Mariana Silva',   role:'Líder de Projeto' },
  { id:'mb6',  project_id:'prj5', tenant_id:'t1', name:'Fernanda Rocha',  role:'Consultora'       },
  { id:'mb7',  project_id:'prj5', tenant_id:'t1', name:'Paulo Marques',   role:'Chave do Cliente' },

  // prj6 — FinCorp ERP
  { id:'mb8',  project_id:'prj6', tenant_id:'t1', name:'Carla Menezes',   role:'Líder de Projeto' },
  { id:'mb9',  project_id:'prj6', tenant_id:'t1', name:'Pedro Alves',     role:'Consultor'        },
  { id:'mb10', project_id:'prj6', tenant_id:'t1', name:'Ricardo Torres',  role:'Chave do Cliente' },

  // prj7 — Solaris
  { id:'mb11', project_id:'prj7', tenant_id:'t1', name:'Igor Teixeira',   role:'Líder de Projeto' },
  { id:'mb12', project_id:'prj7', tenant_id:'t1', name:'Patrícia Souza',  role:'Consultora'       },

  // prj8 — Alpha WMS
  { id:'mb13', project_id:'prj8', tenant_id:'t1', name:'Rafael Santos',   role:'Líder de Projeto' },
  { id:'mb14', project_id:'prj8', tenant_id:'t1', name:'Diego Mendes',    role:'Suporte'          },
]
