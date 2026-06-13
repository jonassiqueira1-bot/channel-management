// ─── Tabela: acoes ─────────────────────────────────────────────────────────────
// Schema Supabase:
//
//   CREATE TYPE tipo_acao AS ENUM ('treinamento','evento','capacitacao','outros');
//   CREATE TYPE status_acao AS ENUM ('agendado','realizado','cancelado','em_andamento');
//
//   CREATE TABLE acoes (
//     id              bigserial PRIMARY KEY,
//     empresa_id      integer      NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
//     tipo            tipo_acao    NOT NULL,
//     titulo          text         NOT NULL,
//     descricao       text,
//     data_inicio     date         NOT NULL,
//     data_fim        date,
//     responsavel_id  uuid         REFERENCES auth.users(id),
//     responsavel_nome text,          -- desnormalizado p/ performance
//     local           text,
//     vagas           integer,
//     inscritos       integer DEFAULT 0,
//     tenant_id       uuid NOT NULL,
//     status          status_acao NOT NULL DEFAULT 'agendado',
//     criado_em       timestamptz DEFAULT now(),
//     atualizado_em   timestamptz DEFAULT now()
//   );
//
//   CREATE INDEX ON acoes (tenant_id, empresa_id);
//   CREATE INDEX ON acoes (tipo, status);
//
// ─── RLS ──────────────────────────────────────────────────────────────────────
//
//   -- Gestor ISV: vê todas as ações do tenant
//   CREATE POLICY "isv_all" ON acoes
//     FOR ALL USING (
//       tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
//       AND EXISTS (
//         SELECT 1 FROM perfis
//         WHERE id = auth.uid() AND papel IN ('admin_isv','gestor_canais')
//       )
//     );
//
//   -- Usuário de franquia: vê apenas ações da própria empresa
//   CREATE POLICY "franquia_read" ON acoes
//     FOR SELECT USING (
//       empresa_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
//       AND tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
//     );
//
//   -- Trigger: atualiza atualizado_em automaticamente
//   CREATE TRIGGER set_atualizado_em BEFORE UPDATE ON acoes
//     FOR EACH ROW EXECUTE PROCEDURE moddatetime(atualizado_em);

export const TIPOS_ACAO = {
  treinamento: { label: 'Treinamento',  icon: '🎓', color: '#6366F1', bg: '#EDE9FE', text: '#4338CA' },
  evento:      { label: 'Evento',       icon: '📅', color: '#3B82F6', bg: '#DBEAFE', text: '#1D4ED8' },
  capacitacao: { label: 'Capacitação',  icon: '🚀', color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  outros:      { label: 'Outros',       icon: '◎',  color: '#6B7280', bg: '#F3F4F6', text: '#374151' },
}

export const STATUS_ACAO = {
  agendado:     { label: 'Agendado',      color: '#F59E0B', bg: '#FEF3C7', text: '#B45309' },
  em_andamento: { label: 'Em andamento',  color: '#3B82F6', bg: '#DBEAFE', text: '#1D4ED8' },
  realizado:    { label: 'Realizado',     color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  cancelado:    { label: 'Cancelado',     color: '#EF4444', bg: '#FEE2E2', text: '#991B1B' },
}

export const MOCK_ACOES = [
  {
    id: 1,
    empresa_id: 1, empresa_nome: 'Nexus Tech',
    tipo: 'treinamento',
    titulo: 'Treinamento Técnico — Plataforma v3.0',
    descricao: 'Capacitação técnica para os vendedores da Nexus Tech na nova versão da plataforma, cobrindo integrações via API e novos módulos.',
    data_inicio: '2026-06-18', data_fim: '2026-06-19',
    responsavel_id: 'u2', responsavel_nome: 'Carla Menezes',
    local: 'Online — Google Meet',
    vagas: 20, inscritos: 14,
    tenant_id: 't1', status: 'agendado',
    criado_em: '2026-05-20T10:00:00Z',
  },
  {
    id: 2,
    empresa_id: 2, empresa_nome: 'Alpha Dist.',
    tipo: 'evento',
    titulo: 'Kick-off Q3 — Alpha Distribuidora',
    descricao: 'Reunião de alinhamento de metas comerciais para o Q3. Apresentação de campanhas de incentivo e revisão de resultados do semestre.',
    data_inicio: '2026-07-02', data_fim: '2026-07-02',
    responsavel_id: 'u1', responsavel_nome: 'Lucas Ferreira',
    local: 'Curitiba — Sede Alpha Dist.',
    vagas: 30, inscritos: 28,
    tenant_id: 't1', status: 'agendado',
    criado_em: '2026-05-28T09:00:00Z',
  },
  {
    id: 3,
    empresa_id: 6, empresa_nome: 'FinCorp',
    tipo: 'capacitacao',
    titulo: 'Go-to-Market: Mercado Financeiro',
    descricao: 'Workshop estratégico de posicionamento e abordagem comercial focado no segmento financeiro, com cases e simulações de venda consultiva.',
    data_inicio: '2026-05-28', data_fim: '2026-05-29',
    responsavel_id: 'u5', responsavel_nome: 'Mariana Silva',
    local: 'São Paulo — WeWork Faria Lima',
    vagas: 15, inscritos: 15,
    tenant_id: 't1', status: 'realizado',
    criado_em: '2026-04-10T08:00:00Z',
  },
  {
    id: 4,
    empresa_id: 1, empresa_nome: 'Nexus Tech',
    tipo: 'capacitacao',
    titulo: 'Capacitação Comercial — Ciclo de Vendas',
    descricao: 'Treinamento focado em metodologia SPIN Selling aplicada ao canal. Inclui simulações de reunião e objeções comuns.',
    data_inicio: '2026-06-05', data_fim: '2026-06-05',
    responsavel_id: 'u3', responsavel_nome: 'Fernanda Rocha',
    local: 'Online — Zoom',
    vagas: 12, inscritos: 9,
    tenant_id: 't1', status: 'realizado',
    criado_em: '2026-05-01T11:00:00Z',
  },
  {
    id: 5,
    empresa_id: 8, empresa_nome: 'MedGroup',
    tipo: 'treinamento',
    titulo: 'Onboarding MedGroup — Módulo Inicial',
    descricao: 'Primeiro treinamento de onboarding para a equipe da MedGroup recém-habilitada. Cobrindo produto, processos e ferramentas.',
    data_inicio: '2026-07-10', data_fim: '2026-07-12',
    responsavel_id: 'u2', responsavel_nome: 'Carla Menezes',
    local: 'Porto Alegre — Sede MedGroup',
    vagas: 10, inscritos: 6,
    tenant_id: 't1', status: 'agendado',
    criado_em: '2026-06-01T14:00:00Z',
  },
  {
    id: 6,
    empresa_id: 4, empresa_nome: 'Milenium',
    tipo: 'evento',
    titulo: 'Encontro de Parceiros — Summit Canal',
    descricao: 'Evento anual de parceiros do canal com premiação, apresentação de roadmap de produto e networking.',
    data_inicio: '2026-04-15', data_fim: '2026-04-15',
    responsavel_id: 'u1', responsavel_nome: 'Lucas Ferreira',
    local: 'Rio de Janeiro — Hotel Windsor',
    vagas: 80, inscritos: 74,
    tenant_id: 't1', status: 'realizado',
    criado_em: '2026-02-10T09:00:00Z',
  },
  {
    id: 7,
    empresa_id: 5, empresa_nome: 'AgriSmart',
    tipo: 'treinamento',
    titulo: 'Treinamento de Reativação — AgriSmart',
    descricao: 'Treinamento de reciclagem para reativar a parceria com a AgriSmart após período de inatividade.',
    data_inicio: '2026-03-20', data_fim: '2026-03-20',
    responsavel_id: 'u3', responsavel_nome: 'Fernanda Rocha',
    local: 'Ribeirão Preto — Online',
    vagas: 8, inscritos: 3,
    tenant_id: 't1', status: 'cancelado',
    criado_em: '2026-02-28T10:00:00Z',
  },
  {
    id: 8,
    empresa_id: 2, empresa_nome: 'Alpha Dist.',
    tipo: 'capacitacao',
    titulo: 'Workshop Proposta de Valor B2B',
    descricao: 'Workshop intensivo sobre construção e apresentação de proposta de valor diferenciada para o mercado B2B de distribuição.',
    data_inicio: '2026-08-05', data_fim: '2026-08-05',
    responsavel_id: 'u5', responsavel_nome: 'Mariana Silva',
    local: 'Online — Google Meet',
    vagas: 18, inscritos: 0,
    tenant_id: 't1', status: 'agendado',
    criado_em: '2026-06-08T08:30:00Z',
  },
]
