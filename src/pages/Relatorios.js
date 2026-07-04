import { useState } from 'react'
import { BarChart2, Lock, Users, Globe, FileEdit } from 'lucide-react'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField } from '../components/ui/SlideOver'
import CanvasEditor from '../components/ui/CanvasEditor'
import { useRelatorios } from '../hooks/useRelatorios'
import { useProfile } from '../hooks/useProfile'
import { useLocalState } from '../hooks/useLocalState'

function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ACESSO_OPTS = [
  { value: 'privado', label: 'Privado — só eu vejo',        icon: <Lock size={12}/> },
  { value: 'equipe',  label: 'Equipe — papéis selecionados', icon: <Users size={12}/> },
  { value: 'todos',   label: 'Público — todos no tenant',    icon: <Globe size={12}/> },
]

const ACESSO_BADGE = {
  privado: { icon: <Lock size={10}/>,  label: 'Privado', bg: '#F3F4F6', color: '#374151' },
  equipe:  { icon: <Users size={10}/>, label: 'Equipe',  bg: '#EFF6FF', color: '#2563EB' },
  todos:   { icon: <Globe size={10}/>, label: 'Público', bg: '#D1FAE5', color: '#065F46' },
}

const STATUS_BADGE = {
  rascunho:  { bg: '#FEF3C7', color: '#92400E', label: 'Rascunho'  },
  publicado: { bg: '#D1FAE5', color: '#065F46', label: 'Publicado' },
}

const PAPEIS = [
  { value: 'admin_isv',      label: 'Admin ISV'     },
  { value: 'gestor_canais',  label: 'Gestor Canais' },
  { value: 'vendedor',       label: 'Vendedor'      },
  { value: 'cs',             label: 'CS'            },
  { value: 'financeiro',     label: 'Financeiro'    },
  { value: 'operacional',    label: 'Operacional'   },
]

const EMPTY_FORM = {
  titulo:            'Novo relatório',
  tipo:              'relatorio',
  acesso:            'privado',
  papeis_permitidos: [],
  status:            'rascunho',
  projeto_id:        null,
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
    key: 'tipo',
    label: 'Tipo',
    render: (val) => (
      <span style={{ fontSize: 11, color: 'var(--text-soft)', textTransform: 'capitalize' }}>
        {val === 'proposta' ? 'Proposta' : 'Relatório'}
      </span>
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
    key: 'tipo',
    label: 'Tipo',
    options: [
      { value: 'relatorio', label: 'Relatório' },
      { value: 'proposta',  label: 'Proposta'  },
    ],
  },
  {
    key: 'acesso',
    label: 'Acesso',
    options: [
      { value: 'privado', label: 'Privado' },
      { value: 'equipe',  label: 'Equipe'  },
      { value: 'todos',   label: 'Público' },
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

// ── Formulário do SlideOver ───────────────────────────────────────────────────
function RelatorioForm({ form, setForm }) {
  const so = { width: '100%', padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 6, background: '#F8FAFC', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }

  function toggle(papel) {
    const cur = form.papeis_permitidos || []
    setForm(f => ({ ...f, papeis_permitidos: cur.includes(papel) ? cur.filter(p => p !== papel) : [...cur, papel] }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Título */}
      <div>
        <label style={lbl}>Título</label>
        <input style={so} value={form.titulo || ''} placeholder="Ex: Pipeline mensal — Jan 2026"
          onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
      </div>

      {/* Tipo */}
      <div>
        <label style={lbl}>Tipo</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ v: 'relatorio', l: 'Relatório' }, { v: 'proposta', l: 'Proposta' }].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => setForm(f => ({ ...f, tipo: v }))}
              style={{ flex: 1, padding: '8px 0', border: `1.5px solid ${form.tipo === v ? 'var(--accent)' : '#CBD5E1'}`, borderRadius: 8, background: form.tipo === v ? 'var(--accent-glow, #EFF6FF)' : '#F8FAFC', color: form.tipo === v ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <label style={lbl}>Status</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ v: 'rascunho', l: 'Rascunho' }, { v: 'publicado', l: 'Publicado' }].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => setForm(f => ({ ...f, status: v }))}
              style={{ flex: 1, padding: '8px 0', border: `1.5px solid ${form.status === v ? 'var(--accent)' : '#CBD5E1'}`, borderRadius: 8, background: form.status === v ? 'var(--accent-glow, #EFF6FF)' : '#F8FAFC', color: form.status === v ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Acesso */}
      <div>
        <label style={lbl}>Quem pode ver</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ACESSO_OPTS.map(({ value, label, icon }) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1.5px solid ${form.acesso === value ? 'var(--accent)' : '#CBD5E1'}`, borderRadius: 8, background: form.acesso === value ? 'var(--accent-glow, #EFF6FF)' : '#F8FAFC', cursor: 'pointer' }}>
              <input type="radio" name="acesso" value={value} checked={form.acesso === value}
                onChange={() => setForm(f => ({ ...f, acesso: value }))}
                style={{ accentColor: 'var(--accent)' }} />
              <span style={{ color: 'var(--accent)', display: 'flex' }}>{icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Papéis permitidos (só quando acesso = equipe) */}
      {form.acesso === 'equipe' && (
        <div>
          <label style={lbl}>Papéis com acesso</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {PAPEIS.map(({ value, label }) => {
              const sel = (form.papeis_permitidos || []).includes(value)
              return (
                <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
                  <input type="checkbox" checked={sel} style={{ accentColor: 'var(--accent)' }}
                    onChange={() => toggle(value)} />
                  {label}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Relatorios() {
  const { relatorios, loading, save, remove, canEdit } = useRelatorios('relatorio')
  const { profile } = useProfile()
  const [search,        setSearch]        = useLocalState('browse:relatorios:search', '')
  const [activeFilters, setActiveFilters] = useLocalState('browse:relatorios:filters', {})

  // SlideOver de cadastro
  const [slideOpen,  setSlideOpen]  = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)

  // Canvas editor (abre sobre tudo)
  const [editando, setEditando] = useState(null)

  // Filtragem local
  const dados = relatorios.filter(r => {
    if (search) {
      const q = search.toLowerCase()
      if (!r.titulo?.toLowerCase().includes(q)) return false
    }
    const tArr = activeFilters.tipo   || []
    const aArr = activeFilters.acesso || []
    const sArr = activeFilters.status || []
    if (tArr.length && !tArr.includes(r.tipo))   return false
    if (aArr.length && !aArr.includes(r.acesso)) return false
    if (sArr.length && !sArr.includes(r.status)) return false
    return true
  })

  function openNew() {
    setForm({ ...EMPTY_FORM, titulo: 'Novo relatório' })
    setSlideOpen(true)
  }

  function openEdit(rel) {
    setForm({ ...rel })
    setSlideOpen(true)
  }

  async function handleSaveForm() {
    setSaving(true)
    try {
      const result = await save(form)
      if (result?.ok) {
        setSlideOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await remove(id)
    setSlideOpen(false)
  }

  async function handleSaveCanvas(rel) {
    const result = await save(rel)
    if (result?.ok && result.relatorio) setEditando(result.relatorio)
    return result
  }

  const isNew = !form.id || String(form.id).startsWith('local_')

  // ── Canvas editor aberto ─────────────────────────────────────────────────
  if (editando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
        <CanvasEditor
          relatorio={editando}
          onSave={handleSaveCanvas}
          onBack={() => setEditando(null)}
          readOnly={!isNew && !canEdit(editando)}
          mode="relatorio"
        />
      </div>
    )
  }

  // ── Browse ────────────────────────────────────────────────────────────────
  return (
    <>
      <BrowseLayout
        storageKey="relatorios"
        columns={columns}
        data={dados}
        keyField="id"
        newLabel="Novo relatório"
        onNew={openNew}
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        onRowClick={openEdit}
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
              <button onClick={openNew}
                style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Criar primeiro relatório
              </button>
            )}
          </div>
        }
      />

      {/* ── SlideOver de cadastro ── */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={isNew ? 'Novo relatório' : (form.titulo || 'Relatório')}
        subtitle={isNew ? 'Defina as configurações antes de editar o documento' : 'Configurações do relatório'}
        saving={saving}
        saveLabel={isNew ? 'Criar relatório' : 'Salvar configurações'}
        onSave={handleSaveForm}
        onDelete={!isNew && canEdit(form) ? () => handleDelete(form.id) : undefined}
        deleteConfirm="Excluir este relatório permanentemente?"
        headerExtra={
          !isNew && (
            <button
              onClick={() => { setSlideOpen(false); setEditando(form) }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '7px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              <FileEdit size={14} /> Editar documento
            </button>
          )
        }
      >
        <div style={{ padding: '20px 24px' }}>
          <RelatorioForm form={form} setForm={setForm} />
        </div>
      </SlideOver>
    </>
  )
}
