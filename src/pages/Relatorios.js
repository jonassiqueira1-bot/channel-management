import { useState } from 'react'
import { BarChart2, Lock, Users, Globe } from 'lucide-react'
import BrowseLayout from '../components/BrowseLayout'
import CanvasEditor from '../components/ui/CanvasEditor'
import { useRelatorios } from '../hooks/useRelatorios'
import { useProfile } from '../hooks/useProfile'
import { useLocalState } from '../hooks/useLocalState'

function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ACESSO_BADGE = {
  privado: { icon: <Lock size={10}/>, label: 'Privado', bg: '#F3F4F6', color: '#374151' },
  equipe:  { icon: <Users size={10}/>, label: 'Equipe',  bg: '#EFF6FF', color: '#2563EB' },
  todos:   { icon: <Globe size={10}/>, label: 'Público', bg: '#D1FAE5', color: '#065F46' },
}

const STATUS_BADGE = {
  rascunho:   { bg: '#FEF3C7', color: '#92400E', label: 'Rascunho'  },
  publicado:  { bg: '#D1FAE5', color: '#065F46', label: 'Publicado' },
}

// ── Colunas da tabela ─────────────────────────────────────────────────────────
const columns = [
  {
    key: 'titulo',
    label: 'Título',
    render: (val, row) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{val || '(sem título)'}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {row.elementos?.length || 0} elemento{row.elementos?.length !== 1 ? 's' : ''}
        </span>
      </div>
    ),
  },
  {
    key: 'acesso',
    label: 'Acesso',
    render: (val) => {
      const b = ACESSO_BADGE[val] || ACESSO_BADGE.privado
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: b.bg, color: b.color, fontSize: 11, fontWeight: 600 }}>
          {b.icon} {b.label}
        </span>
      )
    },
  },
  {
    key: 'status',
    label: 'Status',
    render: (val) => {
      const b = STATUS_BADGE[val] || STATUS_BADGE.rascunho
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: b.bg, color: b.color, fontSize: 11, fontWeight: 600 }}>
          {b.label}
        </span>
      )
    },
  },
  {
    key: 'updated_at',
    label: 'Atualizado',
    render: (val) => (
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(val)}</span>
    ),
  },
]

// ── Filtros ───────────────────────────────────────────────────────────────────
const filters = [
  {
    key: 'acesso',
    label: 'Acesso',
    options: [
      { value: 'privado', label: 'Privado'  },
      { value: 'equipe',  label: 'Equipe'   },
      { value: 'todos',   label: 'Público'  },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'rascunho',  label: 'Rascunho'  },
      { value: 'publicado', label: 'Publicado' },
    ],
  },
]

// ── Página principal ──────────────────────────────────────────────────────────
export default function Relatorios() {
  const { relatorios, loading, save, remove, canEdit } = useRelatorios('relatorio')
  const { profile } = useProfile()
  const [current,      setCurrent]      = useState(null)
  const [search,       setSearch]       = useLocalState('browse:relatorios:search', '')
  const [activeFilters,setActiveFilters]= useLocalState('browse:relatorios:filters', {})

  // Filtragem local
  const dados = relatorios.filter(r => {
    if (search) {
      const q = search.toLowerCase()
      if (!r.titulo?.toLowerCase().includes(q)) return false
    }
    const aArr = activeFilters.acesso  || []
    const sArr = activeFilters.status  || []
    if (aArr.length && !aArr.includes(r.acesso))  return false
    if (sArr.length && !sArr.includes(r.status))  return false
    return true
  })

  function handleNew() {
    setCurrent({
      id:               `local_${Date.now()}`,
      titulo:           'Novo relatório',
      tipo:             'relatorio',
      config:           {},
      elementos:        [],
      acesso:           'privado',
      papeis_permitidos: [],
      status:           'rascunho',
    })
  }

  async function handleSave(rel) {
    const result = await save(rel)
    if (result?.ok && result.relatorio) setCurrent(result.relatorio)
    return result
  }

  // ── Editor aberto ─────────────────────────────────────────────────────────
  if (current) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
        <CanvasEditor
          relatorio={current}
          onSave={handleSave}
          onBack={() => setCurrent(null)}
          readOnly={current.id && !current.id.startsWith('local_') && !canEdit(current)}
          mode="relatorio"
        />
      </div>
    )
  }

  // ── Browse ────────────────────────────────────────────────────────────────
  return (
    <BrowseLayout
      storageKey="relatorios"
      columns={columns}
      data={dados}
      keyField="id"
      newLabel="Novo relatório"
      onNew={handleNew}
      search={search}
      onSearchChange={setSearch}
      filters={filters}
      activeFilters={activeFilters}
      onFilterChange={setActiveFilters}
      onRowClick={setCurrent}
      bulkActions={[
        {
          label: 'Excluir selecionados',
          variant: 'danger',
          onClick: (ids) => ids.forEach(id => remove(id)),
        },
      ]}
      emptyState={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '64px 24px', color: 'var(--text-muted)' }}>
          <BarChart2 size={40} style={{ opacity: 0.25 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)' }}>
            {Object.values(activeFilters).some(a => a?.length) || search
              ? 'Nenhum relatório encontrado com esses filtros'
              : 'Nenhum relatório ainda'}
          </div>
          {!search && !Object.values(activeFilters).some(a => a?.length) && (
            <button onClick={handleNew}
              style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Criar primeiro relatório
            </button>
          )}
        </div>
      }
    />
  )
}
