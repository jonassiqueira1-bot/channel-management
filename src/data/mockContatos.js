// ─── Tabela: contacts ──────────────────────────────────────────────────────────
// Schema Supabase → ver migration 20260611000001_contacts.sql
//
// RLS resumido:
//   admin_isv / gestor_canais → CRUD completo no tenant
//   admin_franquia → lê contatos da própria empresa, cria apenas para ela
//
// Campos:
//   id (uuid PK), tenant_id, company_id (FK → empresas), name, email,
//   phone, job_title, notes, created_at, updated_at

export const CONTATOS_STORAGE_KEY = 'contatos:data_v1'

export const MOCK_CONTATOS = [
  // ── Nexus Tech (empresa_id: 1) ──────────────────────────────────────────────
  { id:'c1',  empresa_id:1, empresa_nome:'Nexus Tech',  nome:'Lucas Ferreira',   email:'lucas@nexustech.com.br',    telefone:'(11) 99876-5432', cargo:'Diretor Comercial',          notas:'',                        tenant_id:'t1', criado_em:'2024-03-15' },
  { id:'c2',  empresa_id:1, empresa_nome:'Nexus Tech',  nome:'Beatriz Souza',    email:'beatriz@nexustech.com.br',  telefone:'(11) 98765-4321', cargo:'Gerente de Parcerias',        notas:'',                        tenant_id:'t1', criado_em:'2024-04-01' },
  { id:'c3',  empresa_id:1, empresa_nome:'Nexus Tech',  nome:'Carlos Drummond',  email:'carlos@nexustech.com.br',   telefone:'(11) 97654-3210', cargo:'Analista de Vendas',          notas:'',                        tenant_id:'t1', criado_em:'2024-05-10' },
  { id:'c4',  empresa_id:1, empresa_nome:'Nexus Tech',  nome:'Diana Lima',       email:'diana@nexustech.com.br',    telefone:'',                cargo:'SDR',                         notas:'',                        tenant_id:'t1', criado_em:'2024-06-01' },
  // ── Alpha Dist. (empresa_id: 2) ─────────────────────────────────────────────
  { id:'c5',  empresa_id:2, empresa_nome:'Alpha Dist.', nome:'Ana Costa',        email:'ana@alphadist.com.br',      telefone:'(41) 99123-4567', cargo:'Gerente Comercial',           notas:'',                        tenant_id:'t1', criado_em:'2024-05-22' },
  { id:'c6',  empresa_id:2, empresa_nome:'Alpha Dist.', nome:'Rodrigo Mendes',   email:'rodrigo@alphadist.com.br',  telefone:'(41) 98234-5678', cargo:'Representante de Vendas',     notas:'',                        tenant_id:'t1', criado_em:'2024-06-15' },
  // ── Solaris (empresa_id: 3) ──────────────────────────────────────────────────
  { id:'c7',  empresa_id:3, empresa_nome:'Solaris',     nome:'Pedro Alves',      email:'pedro@solaris.com.br',      telefone:'(31) 99345-6789', cargo:'CEO',                         notas:'Tomador de decisão',      tenant_id:'t1', criado_em:'2024-06-05' },
  // ── Milenium (empresa_id: 4) ─────────────────────────────────────────────────
  { id:'c8',  empresa_id:4, empresa_nome:'Milenium',    nome:'Carla Menezes',    email:'carla@milenium.com.br',     telefone:'(21) 99456-7890', cargo:'Diretora de TI',              notas:'',                        tenant_id:'t1', criado_em:'2024-01-20' },
  { id:'c9',  empresa_id:4, empresa_nome:'Milenium',    nome:'Felipe Souza',     email:'felipe@milenium.com.br',    telefone:'(21) 98567-8901', cargo:'Gerente de Projetos',         notas:'',                        tenant_id:'t1', criado_em:'2024-02-10' },
  { id:'c10', empresa_id:4, empresa_nome:'Milenium',    nome:'Gabriela Pires',   email:'gabriela@milenium.com.br',  telefone:'',                cargo:'Analista de Compras',         notas:'',                        tenant_id:'t1', criado_em:'2024-03-05' },
  // ── AgriSmart (empresa_id: 5) ────────────────────────────────────────────────
  { id:'c11', empresa_id:5, empresa_nome:'AgriSmart',   nome:'João Lima',        email:'joao@agrismart.com.br',     telefone:'(16) 99678-9012', cargo:'Sócio-Proprietário',          notas:'',                        tenant_id:'t1', criado_em:'2023-11-10' },
  { id:'c12', empresa_id:5, empresa_nome:'AgriSmart',   nome:'Tatiana Ramos',    email:'tatiana@agrismart.com.br',  telefone:'(16) 98789-0123', cargo:'Gerente Administrativa',      notas:'',                        tenant_id:'t1', criado_em:'2023-12-01' },
  // ── FinCorp (empresa_id: 6) ──────────────────────────────────────────────────
  { id:'c13', empresa_id:6, empresa_nome:'FinCorp',     nome:'Mariana Silva',    email:'mariana@fincorp.com.br',    telefone:'(11) 99890-1234', cargo:'VP de Tecnologia',            notas:'Contato estratégico',     tenant_id:'t1', criado_em:'2023-08-25' },
  { id:'c14', empresa_id:6, empresa_nome:'FinCorp',     nome:'Roberto Nunes',    email:'roberto@fincorp.com.br',    telefone:'(11) 98901-2345', cargo:'Gerente de Inovação',         notas:'',                        tenant_id:'t1', criado_em:'2023-09-15' },
  { id:'c15', empresa_id:6, empresa_nome:'FinCorp',     nome:'Silvia Barros',    email:'silvia@fincorp.com.br',     telefone:'(11) 97012-3456', cargo:'Analista de Contratos',       notas:'',                        tenant_id:'t1', criado_em:'2023-10-01' },
  { id:'c16', empresa_id:6, empresa_nome:'FinCorp',     nome:'Thiago Machado',   email:'thiago@fincorp.com.br',     telefone:'',                cargo:'CTO',                         notas:'Tomador de decisão técnica', tenant_id:'t1', criado_em:'2023-11-20' },
  // ── Logix (empresa_id: 7) ────────────────────────────────────────────────────
  { id:'c17', empresa_id:7, empresa_nome:'Logix',       nome:'Rafael Santos',    email:'rafael@logix.com.br',       telefone:'(19) 99123-7890', cargo:'Diretor de Operações',        notas:'',                        tenant_id:'t1', criado_em:'2024-06-08' },
  // ── MedGroup (empresa_id: 8) ─────────────────────────────────────────────────
  { id:'c18', empresa_id:8, empresa_nome:'MedGroup',    nome:'Fernanda Rocha',   email:'fernanda@medgroup.com.br',  telefone:'(51) 99234-5678', cargo:'Diretora Executiva',          notas:'',                        tenant_id:'t1', criado_em:'2024-03-01' },
  { id:'c19', empresa_id:8, empresa_nome:'MedGroup',    nome:'Hugo Teixeira',    email:'hugo@medgroup.com.br',      telefone:'(51) 98345-6789', cargo:'Gerente de TI',               notas:'',                        tenant_id:'t1', criado_em:'2024-03-15' },
  { id:'c20', empresa_id:8, empresa_nome:'MedGroup',    nome:'Isabela Castro',   email:'isabela@medgroup.com.br',   telefone:'(51) 97456-7890', cargo:'Coordenadora de Projetos',    notas:'',                        tenant_id:'t1', criado_em:'2024-04-20' },
  // ── Sem empresa vinculada ────────────────────────────────────────────────────
  { id:'c21', empresa_id:null, empresa_nome:'',         nome:'Marcos Oliveira',  email:'marcos.oliveira@gmail.com', telefone:'(11) 91234-5678', cargo:'Consultor Independente',      notas:'Prospect quente',         tenant_id:'t1', criado_em:'2024-06-10' },
]
