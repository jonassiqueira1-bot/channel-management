// ─── Tabela: perfis ────────────────────────────────────────────────────────────
// Integrada ao auth.users do Supabase via id (PK = FK para auth.users.id).
//
// Schema Supabase:
//
//   CREATE TABLE perfis (
//     id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
//     nome          text        NOT NULL,
//     email         text        NOT NULL,          -- espelhado de auth.users para facilitar queries
//     avatar        text,                          -- iniciais para exibição
//     tipo_usuario  text        NOT NULL CHECK (tipo_usuario IN ('interno','externo')),
//     papel         text        NOT NULL CHECK (papel IN ('admin_isv','gestor_canais','admin_franquia','vendedor')),
//     empresa_id    integer     REFERENCES empresas(id),
//     tenant_id     uuid        NOT NULL,
//     status        text        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','pendente')),
//     criado_em     timestamptz DEFAULT now(),
//     ultimo_acesso timestamptz
//   );
//
// ─── RLS ──────────────────────────────────────────────────────────────────────
//
//   -- admin_isv: acesso total dentro do tenant
//   CREATE POLICY "admin_isv_full" ON perfis
//     FOR ALL USING (
//       tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
//       AND EXISTS (
//         SELECT 1 FROM perfis WHERE id = auth.uid() AND papel = 'admin_isv'
//       )
//     );
//
//   -- admin_franquia: vê e cria apenas usuários da mesma empresa
//   CREATE POLICY "admin_franquia_empresa" ON perfis
//     FOR SELECT USING (
//       empresa_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
//       AND EXISTS (
//         SELECT 1 FROM perfis WHERE id = auth.uid() AND papel = 'admin_franquia'
//       )
//     );
//
//   CREATE POLICY "admin_franquia_insert" ON perfis
//     FOR INSERT WITH CHECK (
//       empresa_id = (SELECT empresa_id FROM perfis WHERE id = auth.uid())
//       AND EXISTS (
//         SELECT 1 FROM perfis WHERE id = auth.uid() AND papel = 'admin_franquia'
//       )
//     );
//
//   -- usuário normal: lê apenas o próprio perfil
//   CREATE POLICY "self_read" ON perfis
//     FOR SELECT USING (id = auth.uid());
//
// ─── Trigger: espelhar email do auth.users → perfis ──────────────────────────
//   CREATE OR REPLACE FUNCTION sync_email_to_perfil()
//   RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
//   BEGIN
//     UPDATE perfis SET email = NEW.email WHERE id = NEW.id;
//     RETURN NEW;
//   END;
//   $$;
//   CREATE TRIGGER on_auth_user_email_change
//     AFTER UPDATE OF email ON auth.users
//     FOR EACH ROW EXECUTE PROCEDURE sync_email_to_perfil();

export const PAPEIS_CONFIG = {
  admin_isv:       { label: 'Admin ISV',        color: 'var(--accent)', bg: 'var(--accent-lite)', text: 'var(--accent)', icon: '★' },
  gestor_canais:   { label: 'Gestor de Canais', color: '#3B82F6', bg: '#DBEAFE', text: '#1D4ED8', icon: '◈' },
  admin_franquia:  { label: 'Admin Franquia',   color: '#10B981', bg: '#D1FAE5', text: '#065F46', icon: '⬡' },
  vendedor:        { label: 'Vendedor',          color: '#F59E0B', bg: '#FEF3C7', text: '#B45309', icon: '◉' },
}

export const PAPEIS_OPTIONS = [
  { value: 'admin_isv',      label: 'Admin ISV',        tipo: 'interno' },
  { value: 'gestor_canais',  label: 'Gestor de Canais', tipo: 'interno' },
  { value: 'admin_franquia', label: 'Admin Franquia',   tipo: 'externo' },
  { value: 'vendedor',       label: 'Vendedor',         tipo: 'externo' },
]

export const STATUS_CONFIG = {
  ativo:    { label: 'Ativo',    color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  inativo:  { label: 'Inativo', color: '#9CA3AF', bg: '#F3F4F6', text: '#4B5563' },
  pendente: { label: 'Pendente',color: '#F59E0B', bg: '#FEF3C7', text: '#B45309' },
}

// Seeds — tenant_id t1 = ISV principal
export const MOCK_PERFIS = [
  // ── Internos (ISV) ──────────────────────────────────────────────────────────
  {
    id: 'u1', nome: 'Lucas Ferreira',  email: 'lucas@isv.com.br',
    avatar: 'LF', tipo_usuario: 'interno', papel: 'admin_isv',
    empresa_id: null, tenant_id: 't1', status: 'ativo',
    criado_em: '2024-01-10T09:00:00Z', ultimo_acesso: '2026-06-09T14:32:00Z',
    perfis_acesso_ids: ['native_master'],
  },
  {
    id: 'u2', nome: 'Carla Menezes',   email: 'carla@isv.com.br',
    avatar: 'CM', tipo_usuario: 'interno', papel: 'gestor_canais',
    empresa_id: null, tenant_id: 't1', status: 'ativo',
    criado_em: '2024-02-15T10:00:00Z', ultimo_acesso: '2026-06-08T11:20:00Z',
    perfis_acesso_ids: ['native_gestor'],
  },
  {
    id: 'u3', nome: 'Fernanda Rocha',  email: 'fernanda@isv.com.br',
    avatar: 'FR', tipo_usuario: 'interno', papel: 'gestor_canais',
    empresa_id: null, tenant_id: 't1', status: 'ativo',
    criado_em: '2024-03-20T08:30:00Z', ultimo_acesso: '2026-06-07T16:00:00Z',
    perfis_acesso_ids: ['native_gestor'],
  },
  {
    id: 'u4', nome: 'Pedro Alves',     email: 'pedro@isv.com.br',
    avatar: 'PA', tipo_usuario: 'interno', papel: 'gestor_canais',
    empresa_id: null, tenant_id: 't1', status: 'inativo',
    criado_em: '2024-04-05T09:00:00Z', ultimo_acesso: '2025-12-01T10:00:00Z',
    perfis_acesso_ids: [],
  },
  {
    id: 'u5', nome: 'Mariana Silva',   email: 'mariana@isv.com.br',
    avatar: 'MS', tipo_usuario: 'interno', papel: 'admin_isv',
    empresa_id: null, tenant_id: 't1', status: 'ativo',
    criado_em: '2024-01-20T08:00:00Z', ultimo_acesso: '2026-06-10T08:15:00Z',
    perfis_acesso_ids: ['native_master'],
  },

  // ── Externos (franquias / parceiros) ────────────────────────────────────────
  {
    id: 'u7',  nome: 'Ricardo Barros',  email: 'r.barros@norte.com.br',
    avatar: 'RB', tipo_usuario: 'externo', papel: 'admin_franquia',
    empresa_id: 1, tenant_id: 't1', status: 'ativo',
    criado_em: '2024-05-10T11:00:00Z', ultimo_acesso: '2026-06-09T09:00:00Z',
    perfis_acesso_ids: ['native_parceiro'],
  },
  {
    id: 'u8',  nome: 'Tatiane Costa',   email: 't.costa@norte.com.br',
    avatar: 'TC', tipo_usuario: 'externo', papel: 'vendedor',
    empresa_id: 1, tenant_id: 't1', status: 'ativo',
    criado_em: '2024-05-15T13:00:00Z', ultimo_acesso: '2026-06-06T15:30:00Z',
    perfis_acesso_ids: ['native_vendedor'],
  },
  {
    id: 'u9',  nome: 'André Mendes',    email: 'a.mendes@alphadist.com.br',
    avatar: 'AM', tipo_usuario: 'externo', papel: 'admin_franquia',
    empresa_id: 2, tenant_id: 't1', status: 'ativo',
    criado_em: '2024-06-01T10:00:00Z', ultimo_acesso: '2026-06-05T12:00:00Z',
    perfis_acesso_ids: ['native_parceiro'],
  },
  {
    id: 'u10', nome: 'Bianca Oliveira', email: 'b.oliveira@alphadist.com.br',
    avatar: 'BO', tipo_usuario: 'externo', papel: 'vendedor',
    empresa_id: 2, tenant_id: 't1', status: 'pendente',
    criado_em: '2026-06-01T09:00:00Z', ultimo_acesso: null,
    perfis_acesso_ids: [],
  },
  {
    id: 'u11', nome: 'Gustavo Faria',   email: 'g.faria@fincorp.com.br',
    avatar: 'GF', tipo_usuario: 'externo', papel: 'vendedor',
    empresa_id: 6, tenant_id: 't1', status: 'ativo',
    criado_em: '2024-09-10T08:00:00Z', ultimo_acesso: '2026-06-04T17:00:00Z',
    perfis_acesso_ids: ['native_vendedor'],
  },
  {
    id: 'u12', nome: 'Patrícia Duarte', email: 'p.duarte@fincorp.com.br',
    avatar: 'PD', tipo_usuario: 'externo', papel: 'admin_franquia',
    empresa_id: 6, tenant_id: 't1', status: 'inativo',
    criado_em: '2024-09-15T09:00:00Z', ultimo_acesso: '2025-11-20T10:00:00Z',
    perfis_acesso_ids: [],
  },
]

// Sessões mockadas para simular contexto de login
// Em produção: SELECT * FROM perfis WHERE id = auth.uid()
export const SESSOES_MOCK = [
  {
    id: 'u1',
    nome: 'Lucas Ferreira',
    papel: 'admin_isv',
    empresa_id: null,
    tenant_id: 't1',
    descricao: 'admin_isv — vê e gerencia tudo',
  },
  {
    id: 'u7',
    nome: 'Ricardo Barros',
    papel: 'admin_franquia',
    empresa_id: 1,
    empresa_nome: 'Nexus Tech',
    tenant_id: 't1',
    descricao: 'admin_franquia — restrito à Nexus Tech',
  },
  {
    id: 'u8',
    nome: 'Tatiane Costa',
    papel: 'vendedor',
    empresa_id: 1,
    empresa_nome: 'Nexus Tech',
    tenant_id: 't1',
    descricao: 'vendedor — apenas leitura do próprio perfil',
  },
]
