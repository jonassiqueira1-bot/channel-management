import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import {
  ShieldCheck, ShieldAlert, Eye, Pencil, Trash2, Download,
  Upload, Users, BarChart2, Target, Zap, Settings2, FileText,
  DollarSign, CheckSquare, Megaphone, Shield, UserCheck,
  BookOpen, FolderKanban, HeartPulse, CreditCard, ClipboardList,
  FileStack, Building2, UserCircle,
} from 'lucide-react'
import SettingsLayout from '../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../components/ui'

const ACAO_ESCOPO = { id: 'apenas_proprios', label: 'Apenas registros próprios', icon: UserCheck, scope: true }

// ─── Todos os módulos do sistema ─────────────────────────────────────────────
const MODULOS = [
  {
    id: 'dashboard', label: 'Dashboard', icon: BarChart2, grupo: 'Visão Geral',
    desc: 'Indicadores e resumo executivo',
    acoes: [
      { id: 'visualizar',     label: 'Acessar dashboard',         icon: Eye,        danger: false },
      { id: 'ver_financeiro', label: 'Ver indicadores financeiros',icon: DollarSign, danger: false },
      { id: 'exportar',       label: 'Exportar relatórios',        icon: Download,   danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'pipeline', label: 'Pipeline', icon: BarChart2, grupo: 'Comercial',
    desc: 'Oportunidades e funis de venda',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',        icon: Eye,      danger: false },
      { id: 'criar_editar', label: 'Criar / Editar',    icon: Pencil,   danger: false },
      { id: 'excluir',      label: 'Excluir',           icon: Trash2,   danger: true  },
      { id: 'exportar',     label: 'Exportar',          icon: Download, danger: false },
      { id: 'importar',     label: 'Importar',          icon: Upload,   danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'metas', label: 'Metas', icon: Target, grupo: 'Comercial',
    desc: 'Metas individuais e por equipe',
    acoes: [
      { id: 'visualizar',   label: 'Ver próprias',  icon: Eye,    danger: false },
      { id: 'ver_equipe',   label: 'Ver da equipe', icon: Users,  danger: false },
      { id: 'criar_editar', label: 'Definir metas', icon: Pencil, danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'tarefas', label: 'Tarefas', icon: CheckSquare, grupo: 'Comercial',
    desc: 'Atividades, follow-ups e agenda',
    acoes: [
      { id: 'visualizar',   label: 'Ver próprias',   icon: Eye,    danger: false },
      { id: 'ver_equipe',   label: 'Ver da equipe',  icon: Users,  danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil, danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2, danger: true  },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'acoes', label: 'Ações', icon: Zap, grupo: 'Comercial',
    desc: 'Ações comerciais e de relacionamento',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,    danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil, danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2, danger: true  },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'playbooks', label: 'Playbooks', icon: BookOpen, grupo: 'Comercial',
    desc: 'Roteiros e guias de processo',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,    danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil, danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2, danger: true  },
    ],
  },
  {
    id: 'contatos_canais', label: 'Contatos Canais', icon: Users, grupo: 'Canal',
    desc: 'Vendedores e representantes do canal',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,      danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil,   danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2,   danger: true  },
      { id: 'exportar',     label: 'Exportar',       icon: Download, danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'empresas', label: 'Empresas', icon: Building2, grupo: 'CRM',
    desc: 'Cadastro de clientes e empresas',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,        danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil,     danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2,     danger: true  },
      { id: 'ver_valores',  label: 'Ver financeiro', icon: DollarSign, danger: false },
      { id: 'exportar',     label: 'Exportar',       icon: Download,   danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'contatos', label: 'Contatos', icon: UserCircle, grupo: 'CRM',
    desc: 'Pessoas de contato vinculadas a empresas',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,    danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil, danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2, danger: true  },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'contratos', label: 'Contratos', icon: FileText, grupo: 'CRM',
    desc: 'Contratos e acordos comerciais',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,        danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil,     danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2,     danger: true  },
      { id: 'ver_valores',  label: 'Ver valores',    icon: DollarSign, danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'pagamentos', label: 'Pagamentos', icon: CreditCard, grupo: 'Financeiro',
    desc: 'Recebimentos e pagamentos',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,        danger: false },
      { id: 'criar_editar', label: 'Lançar',         icon: Pencil,     danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2,     danger: true  },
      { id: 'ver_valores',  label: 'Ver valores',    icon: DollarSign, danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'comissoes', label: 'Comissões', icon: DollarSign, grupo: 'Financeiro',
    desc: 'Esteira de comissionamento do canal',
    acoes: [
      { id: 'visualizar',   label: 'Ver próprias',     icon: Eye,        danger: false },
      { id: 'ver_equipe',   label: 'Ver da equipe',    icon: Users,      danger: false },
      { id: 'criar_editar', label: 'Lançar / Editar',  icon: Pencil,     danger: false },
      { id: 'ver_valores',  label: 'Ver valores',      icon: DollarSign, danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'projetos', label: 'Projetos', icon: FolderKanban, grupo: 'Pós-venda',
    desc: 'Gestão de projetos e implantações',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,    danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil, danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2, danger: true  },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'customer_success', label: 'Sucesso do Cliente', icon: HeartPulse, grupo: 'Pós-venda',
    desc: 'Saúde de conta e jornada do cliente',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,    danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil, danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'questionarios', label: 'Questionários', icon: ClipboardList, grupo: 'Pós-venda',
    desc: 'NPS, pesquisas e formulários',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,    danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil, danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2, danger: true  },
    ],
  },
  {
    id: 'documentos', label: 'Documentos', icon: FileStack, grupo: 'Pós-venda',
    desc: 'Biblioteca de documentos e arquivos',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,      danger: false },
      { id: 'criar_editar', label: 'Enviar / Editar',icon: Pencil,   danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2,   danger: true  },
      { id: 'exportar',     label: 'Baixar',         icon: Download, danger: false },
      ACAO_ESCOPO,
    ],
  },
  {
    id: 'campanhas', label: 'Campanhas', icon: Megaphone, grupo: 'Canal',
    desc: 'Campanhas de incentivo do canal',
    acoes: [
      { id: 'visualizar',   label: 'Visualizar',     icon: Eye,    danger: false },
      { id: 'criar_editar', label: 'Criar / Editar', icon: Pencil, danger: false },
      { id: 'excluir',      label: 'Excluir',        icon: Trash2, danger: true  },
    ],
  },
  {
    id: 'configuracoes', label: 'Configurações', icon: Settings2, grupo: 'Sistema',
    desc: 'Usuários, funis, integrações e sistema',
    acoes: [
      { id: 'acessar',          label: 'Acessar configurações',   icon: Eye,        danger: false },
      { id: 'gerenciar_users',  label: 'Gerenciar usuários',      icon: Users,      danger: false },
      { id: 'gerenciar_perfis', label: 'Editar perfis de acesso', icon: ShieldCheck,danger: true  },
      { id: 'gerenciar_funis',  label: 'Gerenciar funis',         icon: BarChart2,  danger: false },
      { id: 'integracoes',      label: 'Integrações / APIs',      icon: Settings2,  danger: false },
    ],
  },
]

const GRUPOS = [...new Set(MODULOS.map(m => m.grupo))]

// ─── Paleta de cores ──────────────────────────────────────────────────────────
const PALETA = [
  '#1E3A5F','#2E5090','#059669','#D97706','#DC2626',
  '#7C3AED','#EC4899','#14B8A6','#3B82F6','#84CC16',
]

// ─── Perfis nativos ───────────────────────────────────────────────────────────
export const PERFIS_NATIVOS_SEED = [
  { id: 'native_master',   slug: 'master',   nome: 'Master',   nativo: true, cor: '#1E3A5F', icon: 'ShieldCheck', desc: 'Acesso total. Gerencia usuários, perfis e integrações.' },
  { id: 'native_gestor',   slug: 'gestor',   nome: 'Gestor',   nativo: true, cor: '#2E5090', icon: 'Users',       desc: 'Acesso gerencial à equipe. Sem exclusões críticas.' },
  { id: 'native_vendedor', slug: 'vendedor', nome: 'Vendedor', nativo: true, cor: '#059669', icon: 'Target',      desc: 'Acesso operacional ao pipeline e tarefas.' },
  { id: 'native_parceiro', slug: 'parceiro', nome: 'Parceiro', nativo: true, cor: '#D97706', icon: 'ShieldAlert', desc: 'Acesso restrito ao próprio pipeline.' },
]

const ICON_MAP = { ShieldCheck, ShieldAlert, Users, Target, Shield }

// ─── Seed de permissões ───────────────────────────────────────────────────────
function buildSeedPerms() {
  const T = true, F = false
  return {
    native_master: {
      dashboard:       { visualizar:T, ver_financeiro:T, exportar:T, apenas_proprios:F },
      pipeline:        { visualizar:T, criar_editar:T, excluir:T, exportar:T, importar:T, apenas_proprios:F },
      metas:           { visualizar:T, ver_equipe:T, criar_editar:T, apenas_proprios:F },
      tarefas:         { visualizar:T, ver_equipe:T, criar_editar:T, excluir:T, apenas_proprios:F },
      acoes:           { visualizar:T, criar_editar:T, excluir:T, apenas_proprios:F },
      playbooks:       { visualizar:T, criar_editar:T, excluir:T },
      contatos_canais: { visualizar:T, criar_editar:T, excluir:T, exportar:T, apenas_proprios:F },
      empresas:        { visualizar:T, criar_editar:T, excluir:T, ver_valores:T, exportar:T, apenas_proprios:F },
      contatos:        { visualizar:T, criar_editar:T, excluir:T, apenas_proprios:F },
      contratos:       { visualizar:T, criar_editar:T, excluir:T, ver_valores:T, apenas_proprios:F },
      pagamentos:      { visualizar:T, criar_editar:T, excluir:T, ver_valores:T, apenas_proprios:F },
      comissoes:       { visualizar:T, ver_equipe:T, criar_editar:T, ver_valores:T, apenas_proprios:F },
      projetos:        { visualizar:T, criar_editar:T, excluir:T, apenas_proprios:F },
      customer_success:{ visualizar:T, criar_editar:T, apenas_proprios:F },
      questionarios:   { visualizar:T, criar_editar:T, excluir:T },
      documentos:      { visualizar:T, criar_editar:T, excluir:T, exportar:T, apenas_proprios:F },
      campanhas:       { visualizar:T, criar_editar:T, excluir:T },
      configuracoes:   { acessar:T, gerenciar_users:T, gerenciar_perfis:T, gerenciar_funis:T, integracoes:T },
    },
    native_gestor: {
      dashboard:       { visualizar:T, ver_financeiro:T, exportar:T, apenas_proprios:F },
      pipeline:        { visualizar:T, criar_editar:T, excluir:F, exportar:T, importar:T, apenas_proprios:F },
      metas:           { visualizar:T, ver_equipe:T, criar_editar:T, apenas_proprios:F },
      tarefas:         { visualizar:T, ver_equipe:T, criar_editar:T, excluir:F, apenas_proprios:F },
      acoes:           { visualizar:T, criar_editar:T, excluir:F, apenas_proprios:F },
      playbooks:       { visualizar:T, criar_editar:T, excluir:F },
      contatos_canais: { visualizar:T, criar_editar:T, excluir:F, exportar:T, apenas_proprios:F },
      empresas:        { visualizar:T, criar_editar:T, excluir:F, ver_valores:T, exportar:T, apenas_proprios:F },
      contatos:        { visualizar:T, criar_editar:T, excluir:F, apenas_proprios:F },
      contratos:       { visualizar:T, criar_editar:T, excluir:F, ver_valores:T, apenas_proprios:F },
      pagamentos:      { visualizar:T, criar_editar:F, excluir:F, ver_valores:T, apenas_proprios:F },
      comissoes:       { visualizar:T, ver_equipe:T, criar_editar:F, ver_valores:T, apenas_proprios:F },
      projetos:        { visualizar:T, criar_editar:T, excluir:F, apenas_proprios:F },
      customer_success:{ visualizar:T, criar_editar:T, apenas_proprios:F },
      questionarios:   { visualizar:T, criar_editar:T, excluir:F },
      documentos:      { visualizar:T, criar_editar:T, excluir:F, exportar:T, apenas_proprios:F },
      campanhas:       { visualizar:T, criar_editar:F, excluir:F },
      configuracoes:   { acessar:T, gerenciar_users:T, gerenciar_perfis:F, gerenciar_funis:T, integracoes:F },
    },
    native_vendedor: {
      dashboard:       { visualizar:T, ver_financeiro:F, exportar:F, apenas_proprios:T },
      pipeline:        { visualizar:T, criar_editar:T, excluir:F, exportar:F, importar:F, apenas_proprios:T },
      metas:           { visualizar:T, ver_equipe:F, criar_editar:F, apenas_proprios:T },
      tarefas:         { visualizar:T, ver_equipe:F, criar_editar:T, excluir:F, apenas_proprios:T },
      acoes:           { visualizar:T, criar_editar:F, excluir:F, apenas_proprios:T },
      playbooks:       { visualizar:T, criar_editar:F, excluir:F },
      contatos_canais: { visualizar:F, criar_editar:F, excluir:F, exportar:F, apenas_proprios:F },
      empresas:        { visualizar:T, criar_editar:T, excluir:F, ver_valores:F, exportar:F, apenas_proprios:T },
      contatos:        { visualizar:T, criar_editar:T, excluir:F, apenas_proprios:T },
      contratos:       { visualizar:T, criar_editar:F, excluir:F, ver_valores:F, apenas_proprios:T },
      pagamentos:      { visualizar:F, criar_editar:F, excluir:F, ver_valores:F, apenas_proprios:F },
      comissoes:       { visualizar:T, ver_equipe:F, criar_editar:F, ver_valores:T, apenas_proprios:T },
      projetos:        { visualizar:T, criar_editar:F, excluir:F, apenas_proprios:T },
      customer_success:{ visualizar:T, criar_editar:F, apenas_proprios:T },
      questionarios:   { visualizar:T, criar_editar:F, excluir:F },
      documentos:      { visualizar:T, criar_editar:F, excluir:F, exportar:T, apenas_proprios:T },
      campanhas:       { visualizar:T, criar_editar:F, excluir:F },
      configuracoes:   { acessar:F, gerenciar_users:F, gerenciar_perfis:F, gerenciar_funis:F, integracoes:F },
    },
    native_parceiro: {
      dashboard:       { visualizar:T, ver_financeiro:F, exportar:F, apenas_proprios:T },
      pipeline:        { visualizar:T, criar_editar:T, excluir:F, exportar:F, importar:F, apenas_proprios:T },
      metas:           { visualizar:T, ver_equipe:F, criar_editar:F, apenas_proprios:T },
      tarefas:         { visualizar:T, ver_equipe:F, criar_editar:T, excluir:F, apenas_proprios:T },
      acoes:           { visualizar:T, criar_editar:F, excluir:F, apenas_proprios:T },
      playbooks:       { visualizar:T, criar_editar:F, excluir:F },
      contatos_canais: { visualizar:F, criar_editar:F, excluir:F, exportar:F, apenas_proprios:F },
      empresas:        { visualizar:T, criar_editar:F, excluir:F, ver_valores:F, exportar:F, apenas_proprios:T },
      contatos:        { visualizar:T, criar_editar:F, excluir:F, apenas_proprios:T },
      contratos:       { visualizar:T, criar_editar:F, excluir:F, ver_valores:F, apenas_proprios:T },
      pagamentos:      { visualizar:F, criar_editar:F, excluir:F, ver_valores:F, apenas_proprios:F },
      comissoes:       { visualizar:T, ver_equipe:F, criar_editar:F, ver_valores:T, apenas_proprios:T },
      projetos:        { visualizar:F, criar_editar:F, excluir:F, apenas_proprios:F },
      customer_success:{ visualizar:F, criar_editar:F, apenas_proprios:F },
      questionarios:   { visualizar:T, criar_editar:F, excluir:F },
      documentos:      { visualizar:T, criar_editar:F, excluir:F, exportar:T, apenas_proprios:T },
      campanhas:       { visualizar:T, criar_editar:F, excluir:F },
      configuracoes:   { acessar:F, gerenciar_users:F, gerenciar_perfis:F, gerenciar_funis:F, integracoes:F },
    },
  }
}

function emptyPerms() {
  const p = {}
  MODULOS.forEach(mod => { p[mod.id] = {}; mod.acoes.forEach(a => { p[mod.id][a.id] = false }) })
  return p
}

function countPerms(permsRole) {
  let total = 0, active = 0
  MODULOS.forEach(mod => mod.acoes.forEach(a => { total++; if (permsRole?.[mod.id]?.[a.id]) active++ }))
  return { total, active, pct: total > 0 ? Math.round((active / total) * 100) : 0 }
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Perfis() {
  const [perfis, setPerfis]         = useLocalState('perfis:roles', PERFIS_NATIVOS_SEED)
  const [perms, setPerms]           = useLocalState('perfis:permissions', buildSeedPerms())
  const [editando, setEditando]     = useState(null)  // perfil obj | 'novo'
  const [formNovo, setFormNovo]     = useState({ nome: '', cor: PALETA[0], desc: '' })
  const [confirmDel, setConfirmDel] = useState(null)
  const [search, setSearch]         = useState('')
  const [grupoAberto, setGrupoAberto] = useState(null)

  const perfil = editando === 'novo' ? null : editando
  const rolePerms = perfil ? (perms[perfil.id] || {}) : {}

  function toggle(modulo, acao) {
    setPerms(prev => ({
      ...prev,
      [perfil.id]: { ...prev[perfil.id], [modulo]: { ...prev[perfil.id]?.[modulo], [acao]: !prev[perfil.id]?.[modulo]?.[acao] } },
    }))
  }

  function setAllInModule(moduloId, value) {
    const mod = MODULOS.find(m => m.id === moduloId)
    if (!mod) return
    const next = {}; mod.acoes.forEach(a => { next[a.id] = value })
    setPerms(prev => ({ ...prev, [perfil.id]: { ...prev[perfil.id], [moduloId]: next } }))
  }

  function setAll(value) {
    const next = {}
    MODULOS.forEach(mod => { next[mod.id] = {}; mod.acoes.forEach(a => { next[mod.id][a.id] = value }) })
    setPerms(prev => ({ ...prev, [perfil.id]: next }))
  }

  function resetRole() {
    const seed = buildSeedPerms()
    setPerms(prev => ({ ...prev, [perfil.id]: seed[perfil.id] || emptyPerms() }))
  }

  function handleCriar() {
    if (!formNovo.nome.trim()) return
    const id = `custom_${Date.now()}`
    const novo = { id, slug: id, nome: formNovo.nome.trim(), nativo: false, cor: formNovo.cor, icon: 'Shield', desc: formNovo.desc.trim() || 'Perfil personalizado' }
    setPerfis(prev => [...prev, novo])
    setPerms(prev => ({ ...prev, [id]: emptyPerms() }))
    setEditando(novo)
  }

  function handleDeletar(id) {
    setPerfis(prev => prev.filter(p => p.id !== id))
    setPerms(prev => { const n = { ...prev }; delete n[id]; return n })
    setConfirmDel(null); setEditando(null)
  }

  const modFiltered = useMemo(() => {
    if (!search) return MODULOS
    const q = search.toLowerCase()
    return MODULOS.filter(m => m.label.toLowerCase().includes(q) || m.acoes.some(a => a.label.toLowerCase().includes(q)))
  }, [search])

  const gruposVisiveis = useMemo(() => {
    const grupos = {}
    modFiltered.forEach(m => { if (!grupos[m.grupo]) grupos[m.grupo] = []; grupos[m.grupo].push(m) })
    return grupos
  }, [modFiltered])

  // ── Criar novo perfil ─────────────────────────────────────────────────────
  if (editando === 'novo') {
    const nomeErr = perfis.some(p => p.nome.trim().toLowerCase() === formNovo.nome.trim().toLowerCase())
      ? 'Já existe um perfil com este nome' : null
    const podeGravar = formNovo.nome.trim() && !nomeErr

    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Perfis de Acesso', onClick: () => setEditando(null) }]}
        title="Novo perfil"
        subtitle="Configure a identidade do perfil antes de definir permissões"
        onSave={podeGravar ? handleCriar : undefined}
        saveLabel="Criar e configurar permissões"
        onCancel={() => setEditando(null)}
      >
        <FPESection title="Identificação">
          <FPEField label="Nome do perfil" required error={nomeErr} style={{ gridColumn: '1/-1' }}>
            <input className="fpe-field" value={formNovo.nome} autoFocus
              onChange={e => setFormNovo(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Supervisor, Analista, Franqueado…"
              style={nomeErr ? { borderColor: 'var(--red)' } : {}} />
          </FPEField>
          <FPEField label="Descrição" style={{ gridColumn: '1/-1' }}>
            <input className="fpe-field" value={formNovo.desc}
              onChange={e => setFormNovo(f => ({ ...f, desc: e.target.value }))}
              placeholder="Descreva brevemente o papel deste perfil…" />
          </FPEField>
          <FPEField label="Cor de identificação" style={{ gridColumn: '1/-1' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {PALETA.map(c => (
                <button key={c} type="button" onClick={() => setFormNovo(f => ({ ...f, cor: c }))}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', flexShrink: 0, outline: formNovo.cor === c ? `3px solid ${c}` : '3px solid transparent', outlineOffset: 2, transition: 'outline 0.15s' }} />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, padding: '6px 14px', borderRadius: 10, background: `${formNovo.cor}18`, border: `2px solid ${formNovo.cor}` }}>
                <Shield size={14} color={formNovo.cor} />
                <span style={{ fontSize: 13, fontWeight: 700, color: formNovo.cor }}>{formNovo.nome || 'Prévia'}</span>
              </div>
            </div>
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  // ── Editar permissões ─────────────────────────────────────────────────────
  if (editando) {
    const { total, active, pct } = countPerms(rolePerms)
    const IconComp = ICON_MAP[editando.icon] || Shield

    return (
      <>
        <FullPageEdit
          breadcrumb={[{ label: 'Perfis de Acesso', onClick: () => setEditando(null) }]}
          title={editando.nome}
          subtitle={editando.nativo ? 'Perfil nativo — identificação não pode ser alterada' : editando.desc}
          onSave={() => setEditando(null)}
          saveLabel="Salvar e voltar"
          onCancel={() => setEditando(null)}
          onDelete={!editando.nativo ? () => setConfirmDel(editando.id) : undefined}
          deleteLabel="Excluir perfil"
        >
          {/* Identificação — só para custom */}
          {!editando.nativo && (
            <FPESection title="Identificação">
              <FPEField label="Nome" style={{ gridColumn: '1/-1' }}>
                <input className="fpe-field" value={editando.nome}
                  onChange={e => { const n = { ...editando, nome: e.target.value }; setEditando(n); setPerfis(prev => prev.map(p => p.id === n.id ? n : p)) }} />
              </FPEField>
              <FPEField label="Descrição" style={{ gridColumn: '1/-1' }}>
                <input className="fpe-field" value={editando.desc || ''}
                  onChange={e => { const n = { ...editando, desc: e.target.value }; setEditando(n); setPerfis(prev => prev.map(p => p.id === n.id ? n : p)) }} />
              </FPEField>
              <FPEField label="Cor" style={{ gridColumn: '1/-1' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {PALETA.map(c => (
                    <button key={c} type="button"
                      onClick={() => { const n = { ...editando, cor: c }; setEditando(n); setPerfis(prev => prev.map(p => p.id === n.id ? n : p)) }}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: editando.cor === c ? `3px solid ${c}` : '3px solid transparent', outlineOffset: 2 }} />
                  ))}
                </div>
              </FPEField>
            </FPESection>
          )}

          <FPESection title={`Permissões — ${active}/${total} ativas (${pct}%)`} columns={1}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}>⌕</span>
                <input className="fpe-field" style={{ paddingLeft: 30, height: 34 }}
                  placeholder="Filtrar módulos…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {editando.nativo && <button type="button" style={s.microBtn} onClick={resetRole}>Restaurar padrão</button>}
              <button type="button" style={s.microBtn} onClick={() => setAll(true)}>Ativar todos</button>
              <button type="button" style={{ ...s.microBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => setAll(false)}>Desativar todos</button>
            </div>

            {/* Barra de progresso */}
            <div style={{ height: 4, borderRadius: 2, background: 'var(--surface3)', marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: editando.cor, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>

            {/* Grupos de módulos */}
            {GRUPOS.filter(g => gruposVisiveis[g]).map(grupo => (
              <div key={grupo} style={{ marginBottom: 8 }}>
                <button type="button"
                  onClick={() => setGrupoAberto(g => g === grupo ? null : grupo)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', marginBottom: grupoAberto === grupo || grupoAberto === null ? 8 : 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', flex: 1, textAlign: 'left' }}>{grupo}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{grupoAberto === grupo ? '▲' : '▼'}</span>
                </button>

                {(grupoAberto === grupo || grupoAberto === null) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(gruposVisiveis[grupo] || []).map(mod => {
                      const ModIcon = mod.icon
                      const modPerms = rolePerms[mod.id] || {}
                      const modActive = mod.acoes.filter(a => modPerms[a.id]).length
                      const allOn = modActive === mod.acoes.length
                      return (
                        <div key={mod.id} style={s.modCard}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <ModIcon size={14} color="var(--text-soft)" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{mod.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{mod.desc}</div>
                            </div>
                            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${modActive > 0 ? editando.cor : 'var(--border)'}`, color: modActive > 0 ? editando.cor : 'var(--text-muted)', background: 'transparent' }}>
                              {modActive}/{mod.acoes.length}
                            </span>
                            <button type="button" onClick={() => setAllInModule(mod.id, !allOn)} style={{ ...s.microBtn, fontSize: 10, padding: '2px 8px' }}>
                              {allOn ? 'Nenhum' : 'Todos'}
                            </button>
                          </div>
                          <div style={{ height: 1, background: 'var(--border2)', marginBottom: 8 }} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {mod.acoes.filter(a => !a.scope).map(acao => {
                              const AcaoIcon = acao.icon
                              const val = !!modPerms[acao.id]
                              const locked = editando.id === 'native_master' && acao.id === 'gerenciar_perfis'
                              return (
                                <label key={acao.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', userSelect: 'none', background: val ? (acao.danger ? 'rgba(220,38,38,0.05)' : `${editando.cor}10`) : 'transparent', border: `1px solid ${val && acao.danger ? '#FECACA' : 'transparent'}`, transition: 'background 0.12s' }}>
                                  <AcaoIcon size={12} color={val ? (acao.danger ? '#DC2626' : editando.cor) : '#94A3B8'} />
                                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
                                    {acao.label}
                                    {acao.danger && <span style={{ display: 'block', fontSize: 10, color: '#DC2626', fontWeight: 600 }}>⚠ Destrutiva</span>}
                                  </span>
                                  <Toggle value={val} onChange={() => toggle(mod.id, acao.id)} disabled={locked} />
                                </label>
                              )
                            })}
                          </div>
                          {mod.acoes.filter(a => a.scope).map(acao => {
                            const val = !!modPerms[acao.id]
                            return (
                              <div key={acao.id} style={{ marginTop: 6, borderTop: '1px dashed var(--border2)', paddingTop: 6 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', background: val ? 'rgba(245,158,11,0.06)' : 'transparent', border: `1px solid ${val ? 'rgba(245,158,11,0.3)' : 'transparent'}`, transition: 'background 0.12s' }}>
                                  <UserCheck size={12} color={val ? '#D97706' : '#94A3B8'} />
                                  <span style={{ flex: 1, lineHeight: 1.3 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: val ? '#D97706' : 'var(--text)' }}>{acao.label}</span>
                                    <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>Restringe a visão aos registros com participação própria</span>
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
                )}
              </div>
            ))}
          </FPESection>
        </FullPageEdit>

        {confirmDel && (
          <div style={s.overlay} onClick={() => setConfirmDel(null)}>
            <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#DC2626', marginBottom: 12 }}>Excluir perfil</div>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6 }}>
                Ao excluir, <strong>todos os usuários vinculados perderão o acesso</strong>. Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button style={s.btnSecondary} onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button style={{ ...s.btnPrimary, background: '#DC2626' }} onClick={() => handleDeletar(confirmDel)}>Excluir</button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Lista ─────────────────────────────────────────────────────────────────
  return (
    <SettingsLayout
      title="Perfis de Acesso"
      description="Defina as permissões de cada perfil. Os perfis nativos não podem ser removidos."
      columns={[
        { key: 'nome', label: 'Perfil', render: (v, row) => {
          const IconComp = ICON_MAP[row.icon] || Shield
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${row.cor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconComp size={15} color={row.cor} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.desc}</div>
              </div>
            </div>
          )
        }},
        { key: 'nativo', label: 'Tipo', width: 100, render: v => (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: v ? 'var(--accent-lite)' : 'var(--surface2)', color: v ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${v ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'var(--border)'}` }}>
            {v ? 'Nativo' : 'Custom'}
          </span>
        )},
        { key: 'id', label: 'Permissões', width: 130, render: v => {
          const { active: a, total: t, pct: pc } = countPerms(perms[v] || {})
          return <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{a}/{t} · {pc}%</span>
        }},
      ]}
      data={perfis}
      keyField="id"
      emptyLabel="Nenhum perfil encontrado."
      onNew={() => { setFormNovo({ nome: '', cor: PALETA[0], desc: '' }); setEditando('novo') }}
      newLabel="+ Novo perfil"
      rowActions={[
        { label: 'Editar permissões', onClick: row => setEditando(row) },
        { label: 'Excluir', danger: true, onClick: row => setConfirmDel(row.id), disabled: row => row.nativo },
      ]}
    />
  )
}

const s = {
  modCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', flexShrink: 0 },
  microBtn: { padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' },
  btnPrimary: { padding: '9px 20px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
}
