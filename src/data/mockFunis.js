// Dados mock compartilhados entre Funis e Pipeline
// Em produção: SELECT * FROM funis WHERE organization_id = ? AND status = 'ativo'

export const MOCK_FUNIS = [
  {
    id: 1, nome: 'Funil Padrão', descricao: 'Funil de vendas padrão para novos clientes.',
    status: 'ativo', criado: '2023-06-01',
    etapas: [
      { id: 11, nome: 'Prospecção',      ordem: 1, cor: '#6B7280', probabilidade: 10 },
      { id: 12, nome: 'Qualificação',    ordem: 2, cor: '#3B82F6', probabilidade: 25 },
      { id: 13, nome: 'Proposta',        ordem: 3, cor: 'var(--accent)', probabilidade: 50 },
      { id: 14, nome: 'Negociação',      ordem: 4, cor: '#F59E0B', probabilidade: 75 },
      { id: 15, nome: 'Fechado Ganho',   ordem: 5, cor: '#10B981', probabilidade: 100 },
      { id: 16, nome: 'Fechado Perdido', ordem: 6, cor: '#EF4444', probabilidade: 0 },
    ],
  },
  {
    id: 2, nome: 'Funil Canal Parceiro', descricao: 'Funil específico para negócios originados via canal de parceiros.',
    status: 'ativo', criado: '2024-01-10',
    etapas: [
      { id: 21, nome: 'Lead Canal',        ordem: 1, cor: '#6B7280', probabilidade: 15 },
      { id: 22, nome: 'Demo Agendada',     ordem: 2, cor: '#3B82F6', probabilidade: 30 },
      { id: 23, nome: 'Proposta Enviada',  ordem: 3, cor: 'var(--accent)', probabilidade: 55 },
      { id: 24, nome: 'Em Aprovação',      ordem: 4, cor: '#F59E0B', probabilidade: 70 },
      { id: 25, nome: 'Contrato Assinado', ordem: 5, cor: '#10B981', probabilidade: 100 },
      { id: 26, nome: 'Perdido',           ordem: 6, cor: '#EF4444', probabilidade: 0 },
    ],
  },
  {
    id: 3, nome: 'Funil Enterprise', descricao: 'Ciclo longo para grandes contas com múltiplos decisores.',
    status: 'inativo', criado: '2024-06-01',
    etapas: [
      { id: 31, nome: 'Mapeamento',        ordem: 1, cor: '#6B7280', probabilidade: 5  },
      { id: 32, nome: 'Stakeholders',      ordem: 2, cor: '#3B82F6', probabilidade: 15 },
      { id: 33, nome: 'PoC',               ordem: 3, cor: '#14B8A6', probabilidade: 35 },
      { id: 34, nome: 'Proposta Técnica',  ordem: 4, cor: 'var(--accent)', probabilidade: 50 },
      { id: 35, nome: 'Proposta Comercial',ordem: 5, cor: '#F59E0B', probabilidade: 65 },
      { id: 36, nome: 'Negociação',        ordem: 6, cor: '#F97316', probabilidade: 80 },
      { id: 37, nome: 'Fechado Ganho',     ordem: 7, cor: '#10B981', probabilidade: 100},
      { id: 38, nome: 'Fechado Perdido',   ordem: 8, cor: '#EF4444', probabilidade: 0  },
    ],
  },
]
