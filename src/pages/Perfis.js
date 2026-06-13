/**
 * Perfis de Acesso — Roles & Permissions (dinâmico)
 *
 * Supabase schema (referência):
 * ─────────────────────────────────────────────────────────────────────
 * -- Tabela de perfis customizáveis
 * CREATE TABLE roles (
 *   id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   slug       TEXT NOT NULL UNIQUE,
 *   nome       TEXT NOT NULL,
 *   nativo     BOOLEAN NOT NULL DEFAULT FALSE,  -- master/gestor/vendedor/parceiro são nativos
 *   cor        TEXT,
 *   criado_em  TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Tabela de permissões por role
 * CREATE TABLE roles_permissions (
 *   id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   role_id   UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
 *   modulo    TEXT NOT NULL,
 *   acao      TEXT NOT NULL,
 *   permitido BOOLEAN NOT NULL DEFAULT FALSE,
 *   UNIQUE (role_id, modulo, acao)
 * );
 *
 * ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE roles_permissions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "master_rw" ON roles FOR ALL
 *   USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master'));
 * CREATE POLICY "auth_read_roles" ON roles FOR SELECT USING (auth.role() = 'authenticated');
 * CREATE POLICY "auth_read_perms" ON roles_permissions FOR SELECT USING (auth.role() = 'authenticated');
 * ─────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import {
  ShieldCheck, ShieldAlert, Eye, Pencil, Trash2, Download,
  Upload, Users, BarChart2, Target, Zap, Settings2, FileText,
  DollarSign, CheckSquare, Megaphone, Plus, X, Shield, UserCheck,
} from 'lucide-react'

// ─── Ação de escopo (compartilhada por todos os módulos com dados de usuário) ──
const ACAO_ESCOPO = { id: 'apenas_proprios', label: 'Apenas registros com participação própria', icon: UserCheck, scope: true }

// ─── Módulos e ações do sistema ───────────────────────────────────────────────
const MODULOS = [
  {
    id: 'pipeline', label: 'Pipeline', icon: BarChart2,
    desc: 'Oportunidades e funis de venda',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',         icon: Eye,      danger: false },
      { id: 'criar_editar', label: 'Criar / Editar',     icon: Pencil,   danger: false },
      { id: 'excluir',      label: 'Excluir',            icon: Trash2,   danger: true  },
      { id: 'exportar',     label: 'Exportar planilha',  icon: Download, danger: false },
      { id: 'importar',     label: 'Importar dados',     icon: Upload,   danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'clientes', label: 'Clientes & Empresas', icon: Users,
    desc: 'CRM de clientes, contatos e contratos',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',         icon: Eye,        danger: false },
      { id: 'criar_editar', label: 'Criar / Editar',     icon: Pencil,     danger: false },
      { id: 'excluir',      label: 'Excluir registros',  icon: Trash2,     danger: true  },
      { id: 'ver_valores',  label: 'Ver financeiro',     icon: DollarSign, danger: false },
      { id: 'exportar',     label: 'Exportar dados',     icon: Download,   danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'tarefas', label: 'Tarefas & Atividades', icon: CheckSquare,
    desc: 'Atividades, follow-ups e agenda',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar próprias', icon: Eye,    danger: false },
      { id: 'ver_equipe',   label: 'Ver da equipe',       icon: Users,  danger: false },
      { id: 'criar_editar', label: 'Criar / Editar',      icon: Pencil, danger: false },
      { id: 'excluir',      label: 'Excluir',             icon: Trash2, danger: true  },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'metas', label: 'Metas & Indicadores', icon: Target,
    desc: 'Metas, KPIs e performance',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar próprias', icon: Eye,    danger: false },
      { id: 'ver_equipe',   label: 'Ver da equipe',       icon: Users,  danger: false },
      { id: 'criar_editar', label: 'Definir metas',       icon: Pencil, danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'acoes', label: 'Ações & Campanhas', icon: Zap,
    desc: 'Campanhas comerciais e de marketing',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',      icon: Eye,      danger: false },
      { id: 'criar_editar', label: 'Criar / Editar',  icon: Pencil,   danger: false },
      { id: 'excluir',      label: 'Excluir',         icon: Trash2,   danger: true  },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'relatorios', label: 'Relatórios & Dashboard', icon: BarChart2,
    desc: 'Analytics, dashboards e exportações',
    acoes: [
      { id: 'visualizar',     label: 'Acessar relatórios',      icon: Eye,        danger: false },
      { id: 'exportar',       label: 'Exportar relatórios',     icon: Download,   danger: false },
      { id: 'ver_financeiro', label: 'Ver indicadores financ.', icon: DollarSign, danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'configuracoes', label: 'Configurações', icon: Settings2,
    desc: 'Usuários, funis, integrações e sistema',
    acoes: [
      { id: 'acessar',          label: 'Acessar configurações',  icon: Eye,        danger: false },
      { id: 'gerenciar_users',  label: 'Gerenciar usuários',     icon: Users,      danger: false },
      { id: 'gerenciar_perfis', label: 'Editar perfis de acesso',icon: ShieldCheck,danger: true  },
      { id: 'gerenciar_funis',  label: 'Gerenciar funis',        icon: BarChart2,  danger: false },
      { id: 'integracoes',      label: 'Integrações / APIs',     icon: Settings2,  danger: false },
    ],
  },
]

// ─── Paleta de cores para perfis customizados ─────────────────────────────────
const PALETA = [
  '#6366F1','#EC4899','#14B8A6','#F59E0B','#8B5CF6',
  '#10B981','#3B82F6','#EF4444','#84CC16','#06B6D4',
]

function corParaBg(cor) {
  // Converte hex em rgba semi-transparente para o fundo do card
  const r = parseInt(cor.slice(1,3),16)
  const g = parseInt(cor.slice(3,5),16)
  const b = parseInt(cor.slice(5,7),16)
  return `rgba(${r},${g},${b},0.07)`
}

// ─── Perfis nativos (imutáveis) ───────────────────────────────────────────────
const PERFIS_NATIVOS_SEED = [
  {
    id: 'native_master',
    slug: 'master',
    nome: 'Master',
    nativo: true,
    cor: '#7C3AED',
    icon: 'ShieldCheck',
    desc: 'Acesso total. Gerencia usuários, perfis e integrações.',
  },
  {
    id: 'native_gestor',
    slug: 'gestor',
    nome: 'Gestor',
    nativo: true,
    cor: '#1E3A5F',
    icon: 'Users',
    desc: 'Acesso gerencial à equipe. Sem exclusões críticas.',
  },
  {
    id: 'native_vendedor',
    slug: 'vendedor',
    nome: 'Vendedor',
    nativo: true,
    cor: '#059669',
    icon: 'Target',
    desc: 'Acesso operacional ao pipeline e tarefas.',
  },
  {
    id: 'native_parceiro',
    slug: 'parceiro',
    nome: 'Parceiro',
    nativo: true,
    cor: '#D97706',
    icon: 'ShieldAlert',
    desc: 'Acesso restrito ao próprio pipeline.',
  },
]

const ICON_MAP = { ShieldCheck, ShieldAlert, Users, Target, Shield }

// ─── Seed de permissões ───────────────────────────────────────────────────────
function buildSeedPerms() {
  const T = true, F = false
  return {
    native_master: {
      pipeline:      { visualizar:T, criar_editar:T, excluir:T, exportar:T, importar:T, apenas_proprios:F },
      clientes:      { visualizar:T, criar_editar:T, excluir:T, ver_valores:T, exportar:T, apenas_proprios:F },
      tarefas:       { visualizar:T, ver_equipe:T, criar_editar:T, excluir:T, apenas_proprios:F },
      metas:         { visualizar:T, ver_equipe:T, criar_editar:T, apenas_proprios:F },
      acoes:         { visualizar:T, criar_editar:T, excluir:T, apenas_proprios:F },
      relatorios:    { visualizar:T, exportar:T, ver_financeiro:T, apenas_proprios:F },
      configuracoes: { acessar:T, gerenciar_users:T, gerenciar_perfis:T, gerenciar_funis:T, integracoes:T },
    },
    native_gestor: {
      pipeline:      { visualizar:T, criar_editar:T, excluir:F, exportar:T, importar:T, apenas_proprios:F },
      clientes:      { visualizar:T, criar_editar:T, excluir:F, ver_valores:T, exportar:T, apenas_proprios:F },
      tarefas:       { visualizar:T, ver_equipe:T, criar_editar:T, excluir:F, apenas_proprios:F },
      metas:         { visualizar:T, ver_equipe:T, criar_editar:T, apenas_proprios:F },
      acoes:         { visualizar:T, criar_editar:T, excluir:F, apenas_proprios:F },
      relatorios:    { visualizar:T, exportar:T, ver_financeiro:T, apenas_proprios:F },
      configuracoes: { acessar:T, gerenciar_users:T, gerenciar_perfis:F, gerenciar_funis:T, integracoes:F },
    },
    native_vendedor: {
      pipeline:      { visualizar:T, criar_editar:T, excluir:F, exportar:F, importar:F, apenas_proprios:T },
      clientes:      { visualizar:T, criar_editar:T, excluir:F, ver_valores:F, exportar:F, apenas_proprios:T },
      tarefas:       { visualizar:T, ver_equipe:F, criar_editar:T, excluir:F, apenas_proprios:T },
      metas:         { visualizar:T, ver_equipe:F, criar_editar:F, apenas_proprios:T },
      acoes:         { visualizar:T, criar_editar:F, excluir:F, apenas_proprios:T },
      relatorios:    { visualizar:T, exportar:F, ver_financeiro:F, apenas_proprios:T },
      configuracoes: { acessar:F, gerenciar_users:F, gerenciar_perfis:F, gerenciar_funis:F, integracoes:F },
    },
    native_parceiro: {
      pipeline:      { visualizar:T, criar_editar:T, excluir:F, exportar:F, importar:F, apenas_proprios:T },
      clientes:      { visualizar:T, criar_editar:F, excluir:F, ver_valores:F, exportar:F, apenas_proprios:T },
      tarefas:       { visualizar:T, ver_equipe:F, criar_editar:T, excluir:F, apenas_proprios:T },
      metas:         { visualizar:T, ver_equipe:F, criar_editar:F, apenas_proprios:T },
      acoes:         { visualizar:T, criar_editar:F, excluir:F, apenas_proprios:T },
      relatorios:    { visualizar:T, exportar:F, ver_financeiro:F, apenas_proprios:T },
      configuracoes: { acessar:F, gerenciar_users:F, gerenciar_perfis:F, gerenciar_funis:F, integracoes:F },
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function countPerms(permsRole) {
  let total = 0, active = 0
  MODULOS.forEach(mod => mod.acoes.forEach(a => {
    total++
    if (permsRole?.[mod.id]?.[a.id]) active++
  }))
  return { total, active, pct: total > 0 ? Math.round((active / total) * 100) : 0 }
}

function emptyPerms() {
  const p = {}
  MODULOS.forEach(mod => {
    p[mod.id] = {}
    mod.acoes.forEach(a => { p[mod.id][a.id] = false })
  })
  return p
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={value}
      onClick={() => !disabled && onChange(!value)}
      style={{
        position: 'relative', width: 40, height: 22, borderRadius: 11, border: 'none', padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0,
        background: value ? 'var(--accent)' : '#CBD5E1',
        transition: 'background 0.2s', opacity: disabled ? 0.4 : 1,
      }}>
      <span style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ─── Modal: Novo Perfil ───────────────────────────────────────────────────────
function NovoPerfil({ onClose, onSave }) {
  const [nome, setNome] = useState('')
  const [cor, setCor]   = useState(PALETA[0])
  const [err, setErr]   = useState('')
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSave(e) {
    e.preventDefault()
    if (!nome.trim()) { setErr('Informe um nome para o perfil'); return }
    onSave({ nome: nome.trim(), cor })
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 420 }}>
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalSub}>Configuração · Perfis de Acesso</div>
            <h2 style={s.modalTitle}>Novo perfil</h2>
          </div>
          <button onClick={onClose} style={s.closeBtn}><X size={16} /></button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={s.lbl}>Nome do perfil *</label>
            <input ref={inputRef} style={{ ...s.input, ...(err ? { borderColor: 'var(--red)' } : {}) }}
              placeholder="Ex: Supervisor, Analista, Franqueado…"
              value={nome} onChange={e => { setNome(e.target.value); setErr('') }} />
            {err && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>{err}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={s.lbl}>Cor de identificação</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PALETA.map(c => (
                <button key={c} type="button" onClick={() => setCor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                    cursor: 'pointer', flexShrink: 0,
                    outline: cor === c ? `3px solid ${c}` : '3px solid transparent',
                    outlineOffset: 2, transition: 'outline 0.15s',
                  }} />
              ))}
            </div>
          </div>

          {/* Preview do card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 10,
            background: corParaBg(cor), border: `2px solid ${cor}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: cor, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: cor }}>{nome || 'Nome do perfil'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>0/— permissões ativas · Personalizado</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={s.btnSecondary}>Cancelar</button>
            <button type="submit" style={s.btnPrimary}>Criar perfil</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Perfis() {
  // Estado dinâmico de perfis (nativos + customizados)
  const [perfis, setPerfis] = useLocalState('perfis:roles', PERFIS_NATIVOS_SEED)
  // Estado de permissões por perfil: { [perfil.id]: { [modulo]: { [acao]: bool } } }
  const [perms, setPerms]   = useLocalState('perfis:permissions', buildSeedPerms())

  const [selectedId, setSelectedId] = useState('native_master')
  const [novoModal, setNovoModal]   = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [search, setSearch]         = useLocalState('perfis:search', '')
  const [confirmDel, setConfirmDel] = useState(null) // id a deletar

  const selected  = perfis.find(p => p.id === selectedId) || perfis[0]
  const rolePerms = perms[selected?.id] || {}

  // ── Toggle individual ──────────────────────────────────────────────────────
  function toggle(modulo, acao) {
    setPerms(prev => ({
      ...prev,
      [selected.id]: {
        ...prev[selected.id],
        [modulo]: {
          ...prev[selected.id]?.[modulo],
          [acao]: !prev[selected.id]?.[modulo]?.[acao],
        },
      },
    }))
    setHasChanges(true)
  }

  // ── Ativar/desativar todos (módulo ou tudo) ────────────────────────────────
  function setAllInModule(moduloId, value) {
    const mod = MODULOS.find(m => m.id === moduloId)
    if (!mod) return
    const next = {}
    mod.acoes.forEach(a => { next[a.id] = value })
    setPerms(prev => ({
      ...prev,
      [selected.id]: { ...prev[selected.id], [moduloId]: next },
    }))
    setHasChanges(true)
  }

  function setAll(value) {
    const next = {}
    MODULOS.forEach(mod => {
      next[mod.id] = {}
      mod.acoes.forEach(a => { next[mod.id][a.id] = value })
    })
    setPerms(prev => ({ ...prev, [selected.id]: next }))
    setHasChanges(true)
  }

  // ── Restaurar padrão (apenas nativos) ─────────────────────────────────────
  function resetRole() {
    if (!selected.nativo) return
    const seed = buildSeedPerms()
    setPerms(prev => ({ ...prev, [selected.id]: seed[selected.id] }))
    setHasChanges(false)
  }

  // ── Salvar ─────────────────────────────────────────────────────────────────
  function saveChanges() {
    // Produção: upsert em roles_permissions via Supabase
    setHasChanges(false)
  }

  // ── Criar novo perfil ──────────────────────────────────────────────────────
  function handleCriarPerfil({ nome, cor }) {
    const id = `custom_${Date.now()}`
    const novoPerfil = { id, slug: id, nome, nativo: false, cor, icon: 'Shield', desc: 'Perfil personalizado' }
    setPerfis(prev => [...prev, novoPerfil])
    setPerms(prev => ({ ...prev, [id]: emptyPerms() }))
    setSelectedId(id)
    setNovoModal(false)
    setHasChanges(false)
  }

  // ── Excluir perfil customizado ─────────────────────────────────────────────
  function handleDeletar(id) {
    setPerfis(prev => prev.filter(p => p.id !== id))
    setPerms(prev => { const n = { ...prev }; delete n[id]; return n })
    if (selectedId === id) setSelectedId('native_master')
    setConfirmDel(null)
  }

  // ── Filtro de módulos ──────────────────────────────────────────────────────
  const modFiltered = useMemo(() => {
    if (!search) return MODULOS
    const q = search.toLowerCase()
    return MODULOS.filter(m =>
      m.label.toLowerCase().includes(q) ||
      m.acoes.some(a => a.label.toLowerCase().includes(q))
    )
  }, [search])

  const { total, active, pct } = countPerms(rolePerms)

  const nativosIds = new Set(PERFIS_NATIVOS_SEED.map(p => p.id))

  return (
    <div style={s.page}>

      {/* ── Page header ── */}
      <div style={s.pageHeader}>
        <div>
          <div style={s.breadcrumb}>
            Configuração <span style={{ margin: '0 5px', opacity: .5 }}>›</span> Perfis de Acesso
          </div>
          <h1 style={s.title}>Perfis de Acesso</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {hasChanges && (
            <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706', display: 'inline-block' }} />
              Alterações não salvas
            </span>
          )}
          {selected.nativo && (
            <button style={s.btnSecondary} onClick={resetRole}>Restaurar padrão</button>
          )}
          <button style={s.btnPrimary} onClick={saveChanges}>
            Salvar alterações
          </button>
        </div>
      </div>

      {/* ── Layout 2 colunas ── */}
      <div style={s.layout}>

        {/* ════ Coluna esquerda ════ */}
        <div style={s.leftCol}>

          {/* Botão novo perfil */}
          <button style={s.newRoleBtn} onClick={() => setNovoModal(true)}>
            <Plus size={14} />
            Novo perfil
          </button>

          {/* Grupos: Nativos e Customizados */}
          {[
            { label: 'Perfis nativos',      items: perfis.filter(p => p.nativo) },
            { label: 'Perfis personalizados', items: perfis.filter(p => !p.nativo) },
          ].map(group => group.items.length === 0 ? null : (
            <div key={group.label} style={{ marginBottom: 6 }}>
              <div style={s.groupLabel}>{group.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map(perfil => {
                  const { active: a, total: t, pct: pc } = countPerms(perms[perfil.id])
                  const isSelected = perfil.id === selectedId
                  const IconComp = ICON_MAP[perfil.icon] || Shield

                  return (
                    <div key={perfil.id} style={{ position: 'relative' }}>
                      <button
                        onClick={() => { setSelectedId(perfil.id); setHasChanges(false) }}
                        style={{
                          ...s.roleCard,
                          ...(isSelected ? {
                            borderColor: perfil.cor,
                            background: corParaBg(perfil.cor),
                            boxShadow: `0 0 0 3px ${perfil.cor}1A`,
                          } : {}),
                          paddingRight: perfil.nativo ? 14 : 36,
                        }}>

                        {/* Ícone + nome + contador */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                            background: isSelected ? perfil.cor : `${perfil.cor}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s',
                          }}>
                            <IconComp size={16} color={isSelected ? '#fff' : perfil.cor} />
                          </div>
                          <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: 700, fontSize: 13, lineHeight: 1.2,
                              color: isSelected ? perfil.cor : 'var(--text)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {perfil.nome}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                              {a}/{t} ativas · {pc}%
                            </div>
                          </div>
                        </div>

                        {/* Barra de progresso */}
                        <div style={{ height: 3, borderRadius: 2, background: 'var(--surface3)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pc}%`, borderRadius: 2,
                            background: perfil.cor, transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </button>

                      {/* Botão excluir (apenas customizados) */}
                      {!perfil.nativo && (
                        <button
                          onClick={() => setConfirmDel(perfil.id)}
                          title="Excluir perfil"
                          style={{
                            position: 'absolute', top: 10, right: 10,
                            width: 22, height: 22, borderRadius: 6,
                            border: '1px solid var(--border)', background: 'var(--surface)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)', transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FECACA' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {perfis.filter(p => !p.nativo).length === 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px dashed var(--border)',
              textAlign: 'center', marginTop: 4 }}>
              <Shield size={18} color="var(--text-muted)" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Nenhum perfil personalizado.<br />Clique em <strong>+ Novo perfil</strong>.
              </div>
            </div>
          )}
        </div>

        {/* ════ Coluna direita ════ */}
        <div style={s.rightCol}>

          {/* Header do painel */}
          <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                background: selected?.cor || 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 14px ${selected?.cor || 'var(--accent)'}40`,
              }}>
                {selected && (() => { const I = ICON_MAP[selected.icon] || Shield; return <I size={22} color="#fff" /> })()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                    {selected?.nome}
                  </h2>
                  {selected?.nativo ? (
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
                      padding: '2px 7px', borderRadius: 20, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
                      Nativo
                    </span>
                  ) : (
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
                      padding: '2px 7px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      Personalizado
                    </span>
                  )}
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {selected?.desc}
                </p>
              </div>
            </div>

            {/* Gauge de permissões */}
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: selected?.cor, fontFamily: 'var(--mono)', lineHeight: 1 }}>
                {pct}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>
                {active}/{total} ativas
              </div>
              {/* Mini progress */}
              <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--surface3)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: selected?.cor, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>

          {/* Sub-toolbar */}
          <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}>⌕</span>
              <input style={{ ...s.input, paddingLeft: 30, width: '100%', height: 34 }}
                placeholder="Filtrar módulos ou ações…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ flex: 1 }} />
            <button style={s.microBtn} onClick={() => setAll(true)}>Ativar todos</button>
            <button style={{ ...s.microBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => setAll(false)}>
              Desativar todos
            </button>
          </div>

          {/* Matriz de permissões */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {modFiltered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhum módulo encontrado para "{search}".
              </div>
            )}

            {modFiltered.map(mod => {
              const ModIcon = mod.icon
              const modPerms = rolePerms[mod.id] || {}
              const modActive = mod.acoes.filter(a => modPerms[a.id]).length
              const allOn = modActive === mod.acoes.length

              return (
                <div key={mod.id} style={s.modCard}>
                  {/* Cabeçalho do módulo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ModIcon size={15} color="var(--text-soft)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{mod.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{mod.desc}</div>
                    </div>
                    {/* Badge contador + toggle-all rápido */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, padding: '2px 8px',
                        borderRadius: 20, border: `1px solid ${modActive > 0 ? selected?.cor : 'var(--border)'}`,
                        background: modActive > 0 ? corParaBg(selected?.cor || '#1E3A5F') : 'var(--surface2)',
                        color: modActive > 0 ? selected?.cor : 'var(--text-muted)',
                      }}>
                        {modActive}/{mod.acoes.length}
                      </span>
                      <button onClick={() => setAllInModule(mod.id, !allOn)}
                        style={{ ...s.microBtn, fontSize: 10, padding: '2px 8px' }}>
                        {allOn ? 'Nenhum' : 'Todos'}
                      </button>
                    </div>
                  </div>

                  {/* Divisor */}
                  <div style={{ height: 1, background: 'var(--border2)', marginBottom: 10 }} />

                  {/* Ações normais (2 colunas) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {mod.acoes.filter(a => !a.scope).map(acao => {
                      const AcaoIcon = acao.icon
                      const val = !!modPerms[acao.id]
                      const locked = selected?.id === 'native_master' && acao.id === 'gerenciar_perfis'

                      return (
                        <label key={acao.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                            borderRadius: 8, cursor: 'pointer', userSelect: 'none',
                            background: val
                              ? acao.danger ? '#FEF2F222' : corParaBg(selected?.cor || '#1E3A5F')
                              : 'transparent',
                            border: `1px solid ${val && acao.danger ? '#FECACA' : 'transparent'}`,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!val) e.currentTarget.style.background = 'var(--surface2)' }}
                          onMouseLeave={e => { if (!val) e.currentTarget.style.background = 'transparent' }}>

                          <AcaoIcon size={13}
                            color={val ? (acao.danger ? '#DC2626' : selected?.cor) : '#94A3B8'} />

                          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
                            {acao.label}
                            {acao.danger && (
                              <span style={{ display: 'block', fontSize: 10, color: '#DC2626', fontWeight: 600, marginTop: 1 }}>
                                ⚠ Ação destrutiva
                              </span>
                            )}
                          </span>

                          <Toggle value={val} onChange={() => toggle(mod.id, acao.id)} disabled={locked} />
                        </label>
                      )
                    })}
                  </div>

                  {/* Ação de escopo — full-width com visual destacado */}
                  {mod.acoes.filter(a => a.scope).map(acao => {
                    const val = !!modPerms[acao.id]
                    return (
                      <div key={acao.id} style={{ marginTop: 8, borderTop: '1px dashed var(--border2)', paddingTop: 8 }}>
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          borderRadius: 8, cursor: 'pointer', userSelect: 'none',
                          background: val ? 'rgba(245,158,11,0.07)' : 'transparent',
                          border: `1px solid ${val ? 'rgba(245,158,11,0.3)' : 'transparent'}`,
                          transition: 'background 0.15s',
                        }}
                          onMouseEnter={e => { if (!val) e.currentTarget.style.background = 'var(--surface2)' }}
                          onMouseLeave={e => { if (!val) e.currentTarget.style.background = 'transparent' }}>
                          <UserCheck size={13} color={val ? '#D97706' : '#94A3B8'} strokeWidth={1.75} />
                          <span style={{ flex: 1, lineHeight: 1.3 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: val ? '#D97706' : 'var(--text)' }}>
                              {acao.label}
                            </span>
                            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginTop: 1, fontWeight: 400 }}>
                              Restringe a visão do módulo aos registros em que o usuário é responsável ou participante
                            </span>
                          </span>
                          <Toggle value={val} onChange={() => toggle(mod.id, acao.id)} />
                        </label>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Modal: Novo perfil ── */}
      {novoModal && (
        <NovoPerfil onClose={() => setNovoModal(false)} onSave={handleCriarPerfil} />
      )}

      {/* ── Confirm delete ── */}
      {confirmDel && (
        <div style={s.overlay} onClick={() => setConfirmDel(null)}>
          <div style={{ ...s.modal, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalSub}>Atenção</div>
                <h2 style={{ ...s.modalTitle, color: '#DC2626' }}>Excluir perfil</h2>
              </div>
              <button onClick={() => setConfirmDel(null)} style={s.closeBtn}><X size={16} /></button>
            </div>
            <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6 }}>
                Ao excluir este perfil, <strong>todos os usuários vinculados a ele perderão o acesso</strong>.
                Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button style={s.btnSecondary} onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button style={{ ...s.btnPrimary, background: '#DC2626' }} onClick={() => handleDeletar(confirmDel)}>
                  Excluir perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    maxWidth: 1200, margin: '0 auto',
    height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column',
  },
  pageHeader: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    marginBottom: 20, flexShrink: 0,
  },
  breadcrumb: {
    fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  },
  title: {
    margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px',
  },
  layout: {
    display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, flex: 1, minHeight: 0,
  },
  leftCol: {
    overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2,
  },
  rightCol: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
    boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  groupLabel: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
    color: 'var(--text-muted)', marginBottom: 6, paddingLeft: 2,
  },
  newRoleBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    width: '100%', padding: '9px 14px', borderRadius: 9,
    border: '1.5px dashed var(--accent)', background: 'var(--accent-glow)',
    color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'var(--font)', transition: 'all 0.15s', marginBottom: 4,
  },
  roleCard: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '2px solid var(--border)', background: 'var(--surface)',
    cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
  },
  modCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '14px 16px', flexShrink: 0,
  },
  input: {
    padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', fontSize: 13, color: 'var(--text)',
    fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
  },
  microBtn: {
    padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'none', fontSize: 11, fontWeight: 700, color: 'var(--text-soft)',
    cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
  },
  btnPrimary: {
    padding: '9px 20px', borderRadius: 9, border: 'none', background: 'var(--accent)',
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  btnSecondary: {
    padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text-soft)', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  },
  // Modal
  overlay: {
    position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(15,23,42,0.55)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: {
    width: '100%', background: 'var(--surface)', borderRadius: 14,
    boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
  },
  modalSub: {
    fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
  },
  modalTitle: { margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', padding: '4px', borderRadius: 6, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  lbl: {
    fontSize: 11, fontWeight: 700, color: 'var(--text-soft)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
}
