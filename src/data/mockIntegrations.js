// Mock de integrações — Em produção: integration_settings + integration_logs

export const INTEGRATIONS_STORAGE_KEY = 'integrations:settings_v1'

// ─── Catálogo de provedores disponíveis ──────────────────────────────────────
export const PROVIDERS = [
  {
    id:          'rd_station',
    name:        'RD Station Marketing',
    description: 'Importa leads e conversões do RD Station Marketing como oportunidades no Pipeline.',
    category:    'CRM',
    color:       '#00C4A7',
    supabase:    true,
    fields: [
      { key: 'token_privado', label: 'Token Privado', type: 'password', placeholder: 'Token privado da conta RD Station', required: true },
    ],
  },
  {
    id:          'hubspot',
    name:        'HubSpot',
    description: 'Sincronização bidirecional de contatos, negócios e pipeline de vendas.',
    category:    'CRM',
    color:       '#FF7A59',
    fields: [
      { key: 'access_token',  label: 'Access Token',       type: 'password', placeholder: 'Token privado de app do HubSpot', required: true },
      { key: 'portal_id',     label: 'Portal ID',          type: 'text',     placeholder: 'Ex: 12345678',                    required: true },
      { key: 'map_cdu',       label: 'Campo → Receita CDU', type: 'text',    placeholder: 'Nome da propriedade no HubSpot',  required: false },
    ],
  },
  {
    id:          'webhook',
    name:        'Webhook Genérico',
    description: 'Receba eventos externos em tempo real via HTTP POST para qualquer sistema.',
    category:    'Automação',
    color:       'var(--accent)',
    fields: [
      { key: 'signing_secret', label: 'Signing Secret',    type: 'password', placeholder: 'Segredo para validar assinatura HMAC', required: false },
      { key: 'allowed_ips',    label: 'IPs Permitidos',    type: 'text',     placeholder: 'Ex: 192.168.1.0/24 (separado por vírgula)', required: false },
    ],
  },
  {
    id:          'pipedrive',
    name:        'Pipedrive',
    description: 'Importação de negócios e atualização de estágio do pipeline automaticamente.',
    category:    'CRM',
    color:       '#1A7BD4',
    fields: [
      { key: 'api_token', label: 'API Token',    type: 'password', placeholder: 'Token de usuário do Pipedrive', required: true },
      { key: 'company_domain', label: 'Domínio', type: 'text',     placeholder: 'Ex: suaempresa.pipedrive.com',  required: true },
    ],
  },
  {
    id:          'slack',
    name:        'Slack',
    description: 'Notificações automáticas em canais do Slack para alertas e eventos críticos.',
    category:    'Notificações',
    color:       '#4A154B',
    fields: [
      { key: 'bot_token',   label: 'Bot Token',     type: 'password', placeholder: 'xoxb-...', required: true },
      { key: 'channel_id',  label: 'Canal padrão',  type: 'text',     placeholder: 'Ex: #canal-alertas', required: true },
    ],
  },
  {
    id:          'zapier',
    name:        'Zapier',
    description: 'Conecte mais de 5.000 apps via automações Zap sem código.',
    category:    'Automação',
    color:       '#FF4A00',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL do Zap', type: 'text', placeholder: 'https://hooks.zapier.com/hooks/catch/...', required: true },
    ],
  },
]

// ─── Settings salvas (estado inicial — nenhuma ativa) ─────────────────────────
export const DEFAULT_SETTINGS = PROVIDERS.map(p => ({
  id:            `mock-${p.id}`,
  provider_name: p.id,
  credentials:   {},
  status:        'inactive',
  created_at:    new Date().toISOString(),
  updated_at:    new Date().toISOString(),
}))

// ─── Logs mock ────────────────────────────────────────────────────────────────
export const MOCK_LOGS = {
  rd_station: [
    { id:'l1', event_type:'lead_created',     status:'success', created_at:'2026-06-12T09:14:00Z', error_message:null, payload:{ lead_id:'rd-4891', nome:'Luciana Freitas', email:'luciana@alphacorp.com', cdu:12400 } },
    { id:'l2', event_type:'webhook_received', status:'success', created_at:'2026-06-12T08:52:00Z', error_message:null, payload:{ event:'oportunidade.atualizada', id:'op-882', stage:'proposta' } },
    { id:'l3', event_type:'sync_error',       status:'error',   created_at:'2026-06-11T22:30:00Z', error_message:'Timeout ao conectar com RD Station API (504)', payload:{ retries:3, endpoint:'/crm/oportunidades' } },
    { id:'l4', event_type:'lead_created',     status:'success', created_at:'2026-06-11T15:08:00Z', error_message:null, payload:{ lead_id:'rd-4879', nome:'Carlos Mota', email:'carlos@nexustech.io', cdu:8200 } },
    { id:'l5', event_type:'webhook_received', status:'warning', created_at:'2026-06-11T11:00:00Z', error_message:'Assinatura HMAC inválida — evento ignorado', payload:{ raw_event:'deal.won' } },
  ],
  hubspot: [
    { id:'l6', event_type:'contact_synced',   status:'success', created_at:'2026-06-12T07:20:00Z', error_message:null, payload:{ contact_id:'hs-9021', email:'renata@fincorp.com.br' } },
    { id:'l7', event_type:'deal_updated',     status:'error',   created_at:'2026-06-11T18:45:00Z', error_message:'401 Unauthorized — token expirado', payload:{ deal_id:'hs-d-302' } },
  ],
  webhook:   [],
  pipedrive: [],
  slack:     [],
  zapier:    [],
}
