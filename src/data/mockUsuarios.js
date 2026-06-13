// Mock de usuários internos (ISV) e externos (franquias/parceiros)
// Em produção: SELECT * FROM users WHERE tenant_id = ?
// RLS:
//   - usuários tipo 'interno' podem ver e gerenciar todos os vínculos do tenant
//   - usuários tipo 'externo' só veem membros da sua franquia OU membros internos
//     explicitamente vinculados à mesma oportunidade
//     (policy: auth.uid() IN (SELECT user_id FROM oportunidade_membros WHERE oportunidade_id = NEW.oportunidade_id))

export const MOCK_USUARIOS = [
  // ── Internos (ISV) ──────────────────────────────────────────────
  { id: 'u1', nome: 'Lucas Ferreira',  email: 'lucas@isv.com',    tipo: 'interno', avatar: 'LF', cargo: 'Gerente de Canal',      franquia_id: null },
  { id: 'u2', nome: 'Carla Menezes',   email: 'carla@isv.com',    tipo: 'interno', avatar: 'CM', cargo: 'Executiva de Vendas',    franquia_id: null },
  { id: 'u3', nome: 'Fernanda Rocha',  email: 'fernanda@isv.com', tipo: 'interno', avatar: 'FR', cargo: 'Pré-vendas',             franquia_id: null },
  { id: 'u4', nome: 'Pedro Alves',     email: 'pedro@isv.com',    tipo: 'interno', avatar: 'PA', cargo: 'Engenheiro de Soluções', franquia_id: null },
  { id: 'u5', nome: 'Mariana Silva',   email: 'mariana@isv.com',  tipo: 'interno', avatar: 'MS', cargo: 'Key Account Manager',    franquia_id: null },
  { id: 'u6', nome: 'João Lima',       email: 'joao@isv.com',     tipo: 'interno', avatar: 'JL', cargo: 'Diretor Comercial',      franquia_id: null },

  // ── Externos (franquias / parceiros) ────────────────────────────
  { id: 'u7',  nome: 'Ricardo Barros',   email: 'r.barros@norte.com',    tipo: 'externo', avatar: 'RB', cargo: 'Vendedor',        franquia_id: 'f1' },
  { id: 'u8',  nome: 'Tatiane Costa',    email: 't.costa@norte.com',     tipo: 'externo', avatar: 'TC', cargo: 'Gerente Parceiro', franquia_id: 'f1' },
  { id: 'u9',  nome: 'André Mendes',     email: 'a.mendes@sul.com',      tipo: 'externo', avatar: 'AM', cargo: 'Vendedor',        franquia_id: 'f2' },
  { id: 'u10', nome: 'Bianca Oliveira',  email: 'b.oliveira@sul.com',    tipo: 'externo', avatar: 'BO', cargo: 'Pré-vendas',      franquia_id: 'f2' },
  { id: 'u11', nome: 'Gustavo Faria',    email: 'g.faria@nordeste.com',  tipo: 'externo', avatar: 'GF', cargo: 'Vendedor',        franquia_id: 'f3' },
  { id: 'u12', nome: 'Patrícia Duarte',  email: 'p.duarte@nordeste.com', tipo: 'externo', avatar: 'PD', cargo: 'Supervisora',     franquia_id: 'f3' },
]
