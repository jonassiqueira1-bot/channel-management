/**
 * Usuários — Gestão de usuários do sistema
 *
 * Supabase schema (referência):
 * ─────────────────────────────────────────────────────────────────────
 * -- Tabela profiles (vinculada a auth.users via trigger)
 * CREATE TABLE profiles (
 *   id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *   nome        TEXT NOT NULL,
 *   email       TEXT NOT NULL,
 *   role        TEXT NOT NULL CHECK (role IN ('master','gestor','vendedor','parceiro')),
 *   id_unidade  UUID REFERENCES unidades(id),
 *   status      TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('ativo','inativo','pendente')),
 *   avatar_url  TEXT,
 *   criado_em   TIMESTAMPTZ DEFAULT NOW(),
 *   atualizado_em TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- RLS
 * ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Usuários veem apenas seu próprio perfil ou admins veem todos"
 *   ON profiles FOR SELECT USING (
 *     auth.uid() = id OR
 *     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','gestor'))
 *   );
 *
 * -- Trigger para criar profile automaticamente ao criar usuário no Auth
 * CREATE OR REPLACE FUNCTION handle_new_user()
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   INSERT INTO profiles (id, email, nome, role, status)
 *   VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome',''), 'vendedor', 'pendente');
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 *
 * CREATE TRIGGER on_auth_user_created
 *   AFTER INSERT ON auth.users
 *   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
 * ─────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { MoreHorizontal, Search } from 'lucide-react'
import { useAuditLog } from '../hooks/useAuditLog'

// ─── Mock de unidades ─────────────────────────────────────────────────────────
const MOCK_UNIDADES = [
  { id: 'u1', nome: 'Matriz — São Paulo' },
  { id: 'u2', nome: 'Filial — Curitiba' },
  { id: 'u3', nome: 'Filial — Rio de Janeiro' },
  { id: 'u4', nome: 'Filial — Belo Horizonte' },
  { id: 'u5', nome: 'Filial — Porto Alegre' },
  { id: 'u6', nome: 'Filial — Ribeirão Preto' },
  { id: 'u7', nome: 'Parceiro — Nexus Tech' },
  { id: 'u8', nome: 'Parceiro — Alpha Dist.' },
]

// ─── Mock de profiles (espelha dados do Pipeline/Empresas) ───────────────────
const MOCK_PROFILES_SEED = [
  {
    id: 'p1', nome: 'Admin Master', email: 'admin@boostly.com.br',
    role: 'master', id_unidade: 'u1', status: 'ativo',
    criado_em: '2024-01-10',
  },
  {
    id: 'p2', nome: 'Carla Menezes', email: 'carla.menezes@boostly.com.br',
    role: 'gestor', id_unidade: 'u1', status: 'ativo',
    criado_em: '2024-01-15',
  },
  {
    id: 'p3', nome: 'Lucas Ferreira', email: 'lucas.ferreira@boostly.com.br',
    role: 'vendedor', id_unidade: 'u1', status: 'ativo',
    criado_em: '2024-02-01',
  },
  {
    id: 'p4', nome: 'Fernanda Rocha', email: 'fernanda.rocha@boostly.com.br',
    role: 'vendedor', id_unidade: 'u5', status: 'ativo',
    criado_em: '2024-02-28',
  },
  {
    id: 'p5', nome: 'Mariana Silva', email: 'mariana.silva@boostly.com.br',
    role: 'gestor', id_unidade: 'u1', status: 'ativo',
    criado_em: '2024-03-05',
  },
  {
    id: 'p6', nome: 'Pedro Alves', email: 'pedro.alves@boostly.com.br',
    role: 'vendedor', id_unidade: 'u4', status: 'ativo',
    criado_em: '2024-03-20',
  },
  {
    id: 'p7', nome: 'João Lima', email: 'joao.lima@boostly.com.br',
    role: 'vendedor', id_unidade: 'u6', status: 'ativo',
    criado_em: '2024-03-05',
  },
  {
    id: 'p8', nome: 'Ana Costa', email: 'ana.costa@boostly.com.br',
    role: 'vendedor', id_unidade: 'u2', status: 'ativo',
    criado_em: '2024-04-10',
  },
  {
    id: 'p9', nome: 'Rafael Santos', email: 'rafael.santos@boostly.com.br',
    role: 'vendedor', id_unidade: 'u1', status: 'inativo',
    criado_em: '2024-04-22',
  },
  {
    id: 'p10', nome: 'Bruno Tavares', email: 'bruno.tavares@nexustech.com',
    role: 'parceiro', id_unidade: 'u7', status: 'ativo',
    criado_em: '2024-05-01',
  },
  {
    id: 'p11', nome: 'Juliana Freitas', email: 'juliana@alphadist.com.br',
    role: 'parceiro', id_unidade: 'u8', status: 'pendente',
    criado_em: '2026-05-28',
  },
  {
    id: 'p12', nome: 'Ricardo Moura', email: 'r.moura@boostly.com.br',
    role: 'gestor', id_unidade: 'u3', status: 'pendente',
    criado_em: '2026-06-02',
  },
]

// ─── Configuração de roles e status ──────────────────────────────────────────
const ROLES = {
  master:   { label: 'Master',   color: 'var(--accent)', bg: '#F5F3FF', text: '#5B21B6' },
  gestor:   { label: 'Gestor',   color: '#1E3A5F', bg: '#EFF6FF', text: '#1E40AF' },
  vendedor: { label: 'Vendedor', color: '#059669', bg: '#F0FDF4', text: '#166534' },
  parceiro: { label: 'Parceiro', color: '#D97706', bg: '#FFFBEB', text: '#92400E' },
}

const STATUS_CFG = {
  ativo:    { label: 'Ativo',    color: '#10B981', bg: '#F0FDF4', text: '#166534' },
  inativo:  { label: 'Inativo',  color: '#94A3B8', bg: '#F1F5F9', text: '#475569' },
  pendente: { label: 'Pendente', color: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
}

const EMPTY_FORM = {
  nome: '', email: '', role: 'vendedor', id_unidade: 'u1', status: 'pendente',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function iniciais(nome) {
  if (!nome) return '?'
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function fmtData(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function Avatar({ nome, size = 36 }) {
  const colors = [
    ['var(--accent)','#EEF2FF'], ['#10B981','#F0FDF4'], ['#F59E0B','#FFFBEB'],
    ['#3B82F6','#EFF6FF'], ['#EC4899','#FDF2F8'], ['var(--accent)','#F5F3FF'],
    ['#059669','#ECFDF5'], ['#D97706','#FFFBEB'],
  ]
  const idx  = (nome || '').charCodeAt(0) % colors.length
  const [fg, bg] = colors[idx]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
      border: `1.5px solid ${fg}30`, letterSpacing: '-0.5px',
    }}>
      {iniciais(nome)}
    </div>
  )
}

function RoleBadge({ role }) {
  const cfg = ROLES[role] || { label: role, color: '#94A3B8', bg: '#F1F5F9', text: '#475569' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      background: cfg.bg, color: cfg.text,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.inativo
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      background: cfg.bg, color: cfg.text,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ─── Modal de Cadastro / Edição ───────────────────────────────────────────────
function UsuarioModal({ initial, onClose, onSave }) {
  const isEditing = !!initial
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_FORM })
  const [errors, setErrors] = useState({})

  function set(f, v) { setForm(prev => ({ ...prev, [f]: v })) }

  function validate() {
    const e = {}
    if (!form.nome.trim())  e.nome  = 'Nome obrigatório'
    if (!form.email.trim()) e.email = 'E-mail obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave(e) {
    e.preventDefault()
    if (!validate()) return
    onSave({
      ...form,
      id: initial?.id || `p_${Date.now()}`,
      criado_em: initial?.criado_em || new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.modalHeader}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              {isEditing ? 'Editar usuário' : 'Novo usuário'}
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              {isEditing ? form.nome : 'Cadastrar usuário'}
            </h2>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Avatar preview (edição) */}
          {isEditing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <Avatar nome={form.nome} size={48} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{form.nome || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{form.email}</div>
              </div>
            </div>
          )}

          <div style={s.grid2}>
            <Field label="Nome completo *" error={errors.nome}>
              <input style={{ ...s.input, ...(errors.nome ? s.inputError : {}) }}
                value={form.nome} placeholder="Ex: Ana Souza"
                onChange={e => set('nome', e.target.value)} />
            </Field>
            <Field label="E-mail *" error={errors.email}>
              <input style={{ ...s.input, ...(errors.email ? s.inputError : {}) }}
                type="email" value={form.email} placeholder="usuario@empresa.com"
                onChange={e => set('email', e.target.value)}
                disabled={isEditing} />
            </Field>
          </div>

          <div style={s.grid2}>
            <Field label="Perfil de acesso">
              <select style={s.input} value={form.role} onChange={e => set('role', e.target.value)}>
                {Object.entries(ROLES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Unidade / Franquia">
              <select style={s.input} value={form.id_unidade} onChange={e => set('id_unidade', e.target.value)}>
                <option value="">— Sem unidade —</option>
                {MOCK_UNIDADES.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </Field>
          </div>

          {isEditing && (
            <Field label="Status">
              <select style={s.input} value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Aviso de convite (apenas criação) */}
          {!isEditing && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 14px', borderRadius: 8,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
            }}>
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>✉</span>
              <p style={{ margin: 0, fontSize: 12, color: '#1E40AF', lineHeight: 1.5 }}>
                O usuário receberá um e-mail para ativar sua conta e definir sua senha.
              </p>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={s.btnSecondary}>Cancelar</button>
            <button type="submit" style={s.btnPrimary}>
              {isEditing ? 'Salvar alterações' : 'Enviar convite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>{error}</span>}
    </div>
  )
}

// ─── Menu de ações de linha ───────────────────────────────────────────────────
function RowMenu({ user, onEdit, onToggleStatus, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const item = (label, action, danger = false) => (
    <button onClick={() => { action(); setOpen(false) }} style={{
      ...s.menuItem, ...(danger ? { color: 'var(--red)' } : {}),
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      {label}
    </button>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={s.dotBtn}>
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div style={s.dropdown}>
          {item('Editar', onEdit)}
          {item(
            user.status === 'ativo' ? 'Desativar conta' : 'Reativar conta',
            () => onToggleStatus(user.id, user.status === 'ativo' ? 'inativo' : 'ativo'),
          )}
          {item('Reenviar convite', () => {})}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          {item('Excluir usuário', () => onDelete(user.id), true)}
        </div>
      )}
    </div>
  )
}

// ─── Menu de ações global (⋯) ────────────────────────────────────────────────
function AcoesGlobaisMenu({ onExport, onClose, anchorRef }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, anchorRef])

  return (
    <div ref={ref} style={{ ...s.dropdown, right: 0, left: 'auto', width: 200, top: 'calc(100% + 6px)' }}>
      <button style={s.menuItem}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        onClick={() => { onExport(); onClose() }}>
        Exportar CSV
      </button>
      <button style={s.menuItem}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        onClick={onClose}>
        Importar usuários
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Usuarios() {
  const [profiles, setProfiles] = useLocalState('usuarios:profiles', MOCK_PROFILES_SEED)
  const { registrar: log } = useAuditLog()
  const [search, setSearch]     = useLocalState('usuarios:search', '')
  const [filterRole, setFilterRole]     = useLocalState('usuarios:filterRole', '')
  const [filterStatus, setFilterStatus] = useLocalState('usuarios:filterStatus', '')
  const [modal, setModal]   = useState(null)   // null | { mode:'new' } | { mode:'edit', user }
  const [acoesOpen, setAcoesOpen] = useState(false)
  const acoesRef = useRef(null)

  // ── Filtro ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return profiles.filter(u => {
      if (q && !(u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false
      if (filterRole   && u.role   !== filterRole)   return false
      if (filterStatus && u.status !== filterStatus) return false
      return true
    }).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [profiles, search, filterRole, filterStatus])

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function handleSave(data) {
    const isNew = !profiles.find(u => u.id === data.id)
    setProfiles(prev => {
      const idx = prev.findIndex(u => u.id === data.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = data; return n }
      return [...prev, data]
    })
    log(isNew ? 'criar' : 'editar', 'usuario', data.id, { descricao: `Usuário ${isNew ? 'criado' : 'editado'}: ${data.nome || data.email || ''}` })
    setModal(null)
  }

  function handleToggleStatus(id, novoStatus) {
    const u = profiles.find(x => x.id === id)
    setProfiles(prev => prev.map(u => u.id === id ? { ...u, status: novoStatus } : u))
    log('editar', 'usuario', id, { descricao: `Status alterado: ${u?.nome || id} → ${novoStatus}` })
  }

  function handleDelete(id) {
    if (!window.confirm('Excluir este usuário permanentemente?')) return
    const u = profiles.find(x => x.id === id)
    setProfiles(prev => prev.filter(u => u.id !== id))
    log('excluir', 'usuario', id, { descricao: `Usuário excluído: ${u?.nome || u?.email || id}` })
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const rows = filtered
    const headers = ['nome', 'email', 'role', 'status', 'id_unidade', 'criado_em']
    const csv = [
      headers.join(';'),
      ...rows.map(u => {
        const unidade = MOCK_UNIDADES.find(un => un.id === u.id_unidade)?.nome || ''
        return [u.nome, u.email, u.role, u.status, unidade, u.criado_em].join(';')
      })
    ].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `usuarios_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Contadores de resumo ──────────────────────────────────────────────────
  const totalAtivos    = profiles.filter(u => u.status === 'ativo').length
  const totalPendentes = profiles.filter(u => u.status === 'pendente').length

  return (
    <div style={s.page}>

      {/* ── Page Header ── */}
      <div style={s.pageHeader}>
        <div>
          <div style={s.breadcrumb}>
            <span>Configuração</span><span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>›</span><span>Usuários</span>
          </div>
          <h1 style={s.title}>Usuários</h1>
        </div>
        <button style={s.btnPrimary} onClick={() => setModal({ mode: 'new' })}>
          + Novo usuário
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: profiles.length, color: 'var(--text)' },
          { label: 'Ativos', value: totalAtivos, color: '#10B981' },
          { label: 'Pendentes', value: totalPendentes, color: '#F59E0B' },
          { label: 'Inativos', value: profiles.length - totalAtivos - totalPendentes, color: '#94A3B8' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: k.color, lineHeight: 1.2, fontFamily: 'var(--mono)' }}>{k.value}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={s.toolbar}>
        {/* Busca */}
        <div style={s.searchWrap}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input style={s.searchInput} placeholder="Buscar por nome ou e-mail…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filtro Perfil */}
        <select style={s.select} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos os perfis</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Filtro Status */}
        <select style={s.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <div style={{ flex: 1 }} />

        {/* Resultado */}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
          {filtered.length} de {profiles.length} usuário{profiles.length !== 1 ? 's' : ''}
        </span>

        {/* ⋯ Ações globais */}
        <div ref={acoesRef} style={{ position: 'relative' }}>
          <button style={s.dotBtn} onClick={() => setAcoesOpen(v => !v)}>
            <MoreHorizontal size={16} />
          </button>
          {acoesOpen && (
            <AcoesGlobaisMenu
              onExport={handleExport}
              onClose={() => setAcoesOpen(false)}
              anchorRef={acoesRef}
            />
          )}
        </div>
      </div>

      {/* ── Tabela ── */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Usuário', 'Perfil', 'Unidade / Franquia', 'Status', 'Cadastrado em', ''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {filtered.map((user, idx) => {
              const unidade = MOCK_UNIDADES.find(u => u.id === user.id_unidade)
              return (
                <tr key={user.id}
                  style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'var(--surface)' : 'transparent'}>

                  {/* Usuário */}
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar nome={user.nome} size={36} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', lineHeight: 1.3 }}>{user.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Perfil */}
                  <td style={s.td}><RoleBadge role={user.role} /></td>

                  {/* Unidade */}
                  <td style={s.td}>
                    <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                      {unidade ? unidade.nome : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={s.td}><StatusBadge status={user.status} /></td>

                  {/* Cadastrado em */}
                  <td style={s.td}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                      {fmtData(user.criado_em)}
                    </span>
                  </td>

                  {/* Ações */}
                  <td style={{ ...s.td, textAlign: 'right', width: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        onClick={() => setModal({ mode: 'edit', user })}
                        style={s.editBtn}>
                        Editar
                      </button>
                      <RowMenu
                        user={user}
                        onEdit={() => setModal({ mode: 'edit', user })}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDelete}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <UsuarioModal
          initial={modal.mode === 'edit' ? modal.user : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
  },
  pageHeader: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    marginBottom: 20,
  },
  breadcrumb: {
    fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  },
  title: {
    margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 14, flexWrap: 'wrap',
  },
  searchWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  searchInput: {
    padding: '0 12px 0 34px', height: 36, borderRadius: 8, width: 260,
    border: '1px solid var(--border)', background: 'var(--surface)',
    fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none',
  },
  select: {
    padding: '0 10px', height: 36, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface)',
    fontSize: 13, color: 'var(--text-soft)', fontFamily: 'var(--font)', cursor: 'pointer', outline: 'none',
  },
  dotBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text-soft)', cursor: 'pointer',
  },
  editBtn: {
    padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    border: '1px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text-soft)', cursor: 'pointer', fontFamily: 'var(--font)',
  },
  tableWrap: {
    background: 'var(--surface)', borderRadius: 12,
    border: '1px solid var(--border)', overflow: 'hidden',
    boxShadow: 'var(--shadow)',
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
  },
  th: {
    padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)',
    background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px', borderBottom: '1px solid var(--border2)',
    fontSize: 13, verticalAlign: 'middle', transition: 'background 0.1s',
  },
  menuItem: {
    display: 'block', width: '100%', padding: '8px 14px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, color: 'var(--text)',
    fontFamily: 'var(--font)', textAlign: 'left', borderRadius: 7,
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 400,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    padding: 6, minWidth: 180,
  },

  // Modal
  overlay: {
    position: 'fixed', inset: 0, zIndex: 600,
    background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%', maxWidth: 560, background: 'var(--surface)',
    borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 16, cursor: 'pointer',
    color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 6, lineHeight: 1,
  },
  grid2: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
  },
  input: {
    padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', fontSize: 13, color: 'var(--text)',
    fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  inputError: {
    borderColor: 'var(--red)',
  },
  btnPrimary: {
    padding: '9px 20px', borderRadius: 9, border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
    whiteSpace: 'nowrap',
  },
  btnSecondary: {
    padding: '9px 18px', borderRadius: 9,
    border: '1px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text-soft)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font)',
  },
}
