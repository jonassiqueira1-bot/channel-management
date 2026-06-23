// ─── Tabela: payments ─────────────────────────────────────────────────────────
// Schema → migration 20260611000002_payments.sql
//
// RLS: admin_isv/gestor_canais → CRUD completo no tenant
//      admin_franquia          → SELECT apenas da própria empresa
//
// reference_month: sempre o primeiro dia do mês  ex: '2026-06-01'
// amount_total_net: coluna GENERATED (CDU + SMS + Serviços − Desconto)
// valor_recebido:   valor efetivamente baixado (pode diferir de amount_total_net)
// produto_id / produto_nome: produto/tipo vinculado ao faturamento

export const PAGAMENTOS_STORAGE_KEY = 'pagamentos:data_v1'

export const STATUS_PAGAMENTO = {
  pendente:  { label:'Pendente',  color:'#F59E0B', bg:'#FEF3C7', text:'#B45309' },
  pago:      { label:'Pago',      color:'#10B981', bg:'#D1FAE5', text:'#065F46' },
  vencido:   { label:'Vencido',   color:'#EF4444', bg:'#FEE2E2', text:'#991B1B' },
  cancelado: { label:'Cancelado', color:'#94A3B8', bg:'#F1F5F9', text:'#475569' },
}

export const MOCK_PAGAMENTOS = [
  // ── Jun/2026 ────────────────────────────────────────────────────────────────
  {
    id:'pay1', contract_id:1, contract_numero:'CTR-2024-001',
    company_id:1, company_nome:'Nexus Tech',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:890, amount_sms:47, amount_services:450, amount_discount:0, amount_total_net:1387,
    num_documento:'NF100124', data_emissao:'2026-06-01', data_baixa:'2026-06-09',
    valor_recebido:1387, parcela:'1/1',
    reference_month:'2026-06-01', due_date:'2026-06-10',
    status:'pago', processed:true, notes:'', tenant_id:'t1', criado:'2026-06-01',
  },
  {
    id:'pay2', contract_id:2, contract_numero:'CTR-2024-002',
    company_id:2, company_nome:'Alpha Dist.',
    produto_id:2, produto_nome:'Boostly Starter',
    amount_cdu:261, amount_sms:0, amount_services:0, amount_discount:0, amount_total_net:261,
    num_documento:'NF100125', data_emissao:'2026-06-01', data_baixa:null,
    valor_recebido:null, parcela:'1/1',
    reference_month:'2026-06-01', due_date:'2026-06-10',
    status:'pendente', processed:true, notes:'', tenant_id:'t1', criado:'2026-06-01',
  },
  {
    id:'pay3', contract_id:3, contract_numero:'CTR-2024-003',
    company_id:3, company_nome:'Solaris',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:890, amount_sms:120, amount_services:0, amount_discount:50, amount_total_net:960,
    num_documento:'NF100126', data_emissao:'2026-06-01', data_baixa:'2026-06-08',
    valor_recebido:960, parcela:'1/1',
    reference_month:'2026-06-01', due_date:'2026-06-10',
    status:'pago', processed:true, notes:'Desconto negociado contratualmente', tenant_id:'t1', criado:'2026-06-01',
  },
  {
    id:'pay4', contract_id:4, contract_numero:'CTR-2024-004',
    company_id:4, company_nome:'Milenium',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:600, amount_sms:85, amount_services:200, amount_discount:0, amount_total_net:885,
    num_documento:'NF100127', data_emissao:'2026-06-01', data_baixa:null,
    valor_recebido:null, parcela:'1/2',
    reference_month:'2026-06-01', due_date:'2026-06-12',
    status:'pendente', processed:true, notes:'Parcela 1 de 2', tenant_id:'t1', criado:'2026-06-01',
  },
  {
    id:'pay5', contract_id:5, contract_numero:'CTR-2024-005',
    company_id:5, company_nome:'AgriSmart',
    produto_id:2, produto_nome:'Boostly Starter',
    amount_cdu:261, amount_sms:0, amount_services:0, amount_discount:0, amount_total_net:261,
    num_documento:'NF100128', data_emissao:'2026-05-25', data_baixa:null,
    valor_recebido:null, parcela:'1/1',
    reference_month:'2026-06-01', due_date:'2026-05-31',
    status:'vencido', processed:true, notes:'Contrato suspenso — aguardando regularização', tenant_id:'t1', criado:'2026-06-01',
  },
  {
    id:'pay6', contract_id:6, contract_numero:'CTR-2024-006',
    company_id:6, company_nome:'FinCorp',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:1800, amount_sms:340, amount_services:1200, amount_discount:200, amount_total_net:3140,
    num_documento:'NF100129', data_emissao:'2026-06-01', data_baixa:'2026-06-05',
    valor_recebido:3140, parcela:'1/1',
    reference_month:'2026-06-01', due_date:'2026-06-15',
    status:'pago', processed:true, notes:'Fatura especial aprovada pelo gestor', tenant_id:'t1', criado:'2026-06-01',
  },
  {
    id:'pay7', contract_id:7, contract_numero:'CTR-2024-007',
    company_id:7, company_nome:'Logix',
    produto_id:2, produto_nome:'Boostly Starter',
    amount_cdu:261, amount_sms:0, amount_services:0, amount_discount:0, amount_total_net:261,
    num_documento:null, data_emissao:null, data_baixa:null,
    valor_recebido:null, parcela:'1/1',
    reference_month:'2026-06-01', due_date:'2026-06-10',
    status:'pendente', processed:false, notes:'', tenant_id:'t1', criado:'2026-06-01',
  },
  {
    id:'pay8', contract_id:8, contract_numero:'CTR-2024-008',
    company_id:8, company_nome:'MedGroup',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:890, amount_sms:210, amount_services:450, amount_discount:0, amount_total_net:1550,
    num_documento:'NF100130', data_emissao:'2026-06-01', data_baixa:'2026-06-07',
    valor_recebido:1550, parcela:'1/1',
    reference_month:'2026-06-01', due_date:'2026-06-10',
    status:'pago', processed:false, notes:'', tenant_id:'t1', criado:'2026-06-01',
  },
  // ── Mai/2026 ────────────────────────────────────────────────────────────────
  {
    id:'pay9', contract_id:1, contract_numero:'CTR-2024-001',
    company_id:1, company_nome:'Nexus Tech',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:890, amount_sms:32, amount_services:450, amount_discount:0, amount_total_net:1372,
    num_documento:'NF099211', data_emissao:'2026-05-01', data_baixa:'2026-05-09',
    valor_recebido:1372, parcela:'1/1',
    reference_month:'2026-05-01', due_date:'2026-05-10',
    status:'pago', processed:true, notes:'', tenant_id:'t1', criado:'2026-05-01',
  },
  {
    id:'pay10', contract_id:6, contract_numero:'CTR-2024-006',
    company_id:6, company_nome:'FinCorp',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:1800, amount_sms:298, amount_services:1200, amount_discount:200, amount_total_net:3098,
    num_documento:'NF099212', data_emissao:'2026-05-01', data_baixa:'2026-05-14',
    valor_recebido:3098, parcela:'1/1',
    reference_month:'2026-05-01', due_date:'2026-05-15',
    status:'pago', processed:true, notes:'', tenant_id:'t1', criado:'2026-05-01',
  },
  {
    id:'pay11', contract_id:2, contract_numero:'CTR-2024-002',
    company_id:2, company_nome:'Alpha Dist.',
    produto_id:2, produto_nome:'Boostly Starter',
    amount_cdu:261, amount_sms:0, amount_services:0, amount_discount:0, amount_total_net:261,
    num_documento:'NF099213', data_emissao:'2026-05-01', data_baixa:'2026-05-09',
    valor_recebido:261, parcela:'1/1',
    reference_month:'2026-05-01', due_date:'2026-05-10',
    status:'pago', processed:true, notes:'', tenant_id:'t1', criado:'2026-05-01',
  },
  {
    id:'pay12', contract_id:8, contract_numero:'CTR-2024-008',
    company_id:8, company_nome:'MedGroup',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:890, amount_sms:185, amount_services:450, amount_discount:0, amount_total_net:1525,
    num_documento:'NF099214', data_emissao:'2026-05-01', data_baixa:'2026-05-09',
    valor_recebido:1525, parcela:'1/1',
    reference_month:'2026-05-01', due_date:'2026-05-10',
    status:'pago', processed:true, notes:'', tenant_id:'t1', criado:'2026-05-01',
  },
  // ── Abr/2026 ────────────────────────────────────────────────────────────────
  {
    id:'pay13', contract_id:1, contract_numero:'CTR-2024-001',
    company_id:1, company_nome:'Nexus Tech',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:890, amount_sms:28, amount_services:450, amount_discount:0, amount_total_net:1368,
    num_documento:'NF098301', data_emissao:'2026-04-01', data_baixa:'2026-04-09',
    valor_recebido:1368, parcela:'1/1',
    reference_month:'2026-04-01', due_date:'2026-04-10',
    status:'pago', processed:true, notes:'', tenant_id:'t1', criado:'2026-04-01',
  },
  {
    id:'pay14', contract_id:6, contract_numero:'CTR-2024-006',
    company_id:6, company_nome:'FinCorp',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:1800, amount_sms:311, amount_services:1200, amount_discount:200, amount_total_net:3111,
    num_documento:'NF098302', data_emissao:'2026-04-01', data_baixa:'2026-04-14',
    valor_recebido:3200, parcela:'1/1',
    reference_month:'2026-04-01', due_date:'2026-04-15',
    status:'pago', processed:true, notes:'Recebido com juros de mora', tenant_id:'t1', criado:'2026-04-01',
  },
  {
    id:'pay15', contract_id:4, contract_numero:'CTR-2024-004',
    company_id:4, company_nome:'Milenium',
    produto_id:1, produto_nome:'Boostly Pro',
    amount_cdu:600, amount_sms:72, amount_services:200, amount_discount:0, amount_total_net:872,
    num_documento:'NF098303', data_emissao:'2026-04-01', data_baixa:'2026-04-11',
    valor_recebido:872, parcela:'2/2',
    reference_month:'2026-04-01', due_date:'2026-04-12',
    status:'pago', processed:true, notes:'Parcela final quitada', tenant_id:'t1', criado:'2026-04-01',
  },
]
