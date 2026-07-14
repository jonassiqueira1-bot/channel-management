import { useState, useMemo } from 'react'
import { BarChart2, Lock, Users, Globe, FileEdit, Printer, ChevronDown, ChevronUp } from 'lucide-react'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField } from '../components/ui/SlideOver'
import CanvasEditor from '../components/ui/CanvasEditor'
import { useRelatorios } from '../hooks/useRelatorios'
import { useProfile } from '../hooks/useProfile'
import { useLocalState } from '../hooks/useLocalState'
import { useDocumentDataSources } from '../hooks/useDocumentDataSources'

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
  { value: 'admin_isv',  label: 'Administrador'    },
  { value: 'vendedor',   label: 'Vendedor'         },
  { value: 'cs',         label: 'Customer Success' },
  { value: 'financeiro', label: 'Financeiro'       },
  { value: 'projetos',   label: 'Projetos'         },
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
function makeColumns(onPrint) { return [
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
  {
    key: '_print',
    label: '',
    width: 40,
    render: (_, row) => (
      <button
        onClick={e => { e.stopPropagation(); onPrint(row) }}
        title="Imprimir"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}
      >
        <Printer size={14} />
      </button>
    ),
  },
]}

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
function PrintModal({ relatorio, sources = [], onConfirm, onClose }) {
  const imp = relatorio.config?.impressao || {}
  const [opts, setOpts] = useState({
    orientacao: imp.orientacao || 'retrato',
    cabecalho:  imp.cabecalho !== false,
    rodape:     imp.rodape    !== false,
    escala:     imp.escala    || 100,
    nota:       imp.nota      || '',
  })
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const [paramValues, setParamValues] = useState({})

  // Collect all param fields from config.filtrosParametro
  const paramFields = useMemo(() => {
    const fp = relatorio.config?.filtrosParametro || {}
    const fields = []
    for (const [srcId, srcFields] of Object.entries(fp)) {
      for (const [key, meta] of Object.entries(srcFields)) {
        if (meta?.enabled) fields.push({ srcId, key, ...meta })
      }
    }
    return fields
  }, [relatorio])

  const inp = { width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }
  const row = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }

  function buildFiltros() {
    const filtros = {}
    for (const f of paramFields) {
      const val = paramValues[`${f.srcId}__${f.key}`]
      if (val !== undefined && val !== '') {
        if (!filtros[f.srcId]) filtros[f.srcId] = {}
        filtros[f.srcId][f.key] = val
      }
    }
    return filtros
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, width: 420, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Printer size={18} color="var(--accent)" />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', flex: 1 }}>Imprimir relatório</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>✕</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px' }}>
          {relatorio.titulo}
        </div>

        {/* Filtros de impressão (params) — colapsável */}
        {paramFields.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
            <button onClick={() => setFiltrosOpen(o => !o)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface2)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Filtros de impressão</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {Object.values(paramValues).some(v => v) && (
                  <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', borderRadius: 99, padding: '1px 6px', fontWeight: 700 }}>
                    {Object.values(paramValues).filter(v => v).length}
                  </span>
                )}
                {filtrosOpen ? <ChevronUp size={13} color="var(--text-muted)"/> : <ChevronDown size={13} color="var(--text-muted)"/>}
              </div>
            </button>
            {filtrosOpen && (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {paramFields.map(f => {
                  const pk = `${f.srcId}__${f.key}`
                  const src = sources.find(s => s.id === f.srcId)
                  const uniqueVals = src
                    ? [...new Set(src.registros.map(r => r[f.key]).filter(v => v && v !== '—'))].sort()
                    : []
                  return (
                    <div key={pk}>
                      <label style={{ ...lbl, marginBottom: 2 }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 10 }}>{f.sourceLabel} · </span>
                        {f.label}
                      </label>
                      {uniqueVals.length > 0 ? (
                        <select style={{ ...inp, cursor: 'pointer' }}
                          value={paramValues[pk] || ''}
                          onChange={e => setParamValues(p => ({ ...p, [pk]: e.target.value }))}>
                          <option value="">Todos</option>
                          {uniqueVals.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      ) : (
                        <input style={inp} placeholder={`Filtrar por ${f.label.toLowerCase()}…`}
                          value={paramValues[pk] || ''}
                          onChange={e => setParamValues(p => ({ ...p, [pk]: e.target.value }))} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Config de página */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={lbl}>Orientação</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['retrato', 'Retrato'], ['paisagem', 'Paisagem']].map(([v, l]) => (
                <button key={v} onClick={() => setOpts(o => ({ ...o, orientacao: v }))}
                  style={{ flex: 1, padding: '8px 0', fontSize: 12, border: `1.5px solid ${opts.orientacao === v ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)', background: opts.orientacao === v ? 'var(--accent)11' : 'none', color: opts.orientacao === v ? 'var(--accent)' : 'var(--text-soft)', fontWeight: opts.orientacao === v ? 700 : 400 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <label style={row}>
            <input type="checkbox" checked={opts.cabecalho} style={{ accentColor: 'var(--accent)' }}
              onChange={e => setOpts(o => ({ ...o, cabecalho: e.target.checked }))} />
            Incluir cabeçalho
          </label>
          <label style={row}>
            <input type="checkbox" checked={opts.rodape} style={{ accentColor: 'var(--accent)' }}
              onChange={e => setOpts(o => ({ ...o, rodape: e.target.checked }))} />
            Incluir rodapé
          </label>

          <div>
            <label style={lbl}>Escala (%)</label>
            <input type="number" min={50} max={150} step={5} style={{ ...inp, width: 100 }}
              value={opts.escala} onChange={e => setOpts(o => ({ ...o, escala: Number(e.target.value) }))} />
          </div>

          <div>
            <label style={lbl}>Nota de rodapé</label>
            <input style={inp} placeholder="Ex: Confidencial — uso interno" value={opts.nota}
              onChange={e => setOpts(o => ({ ...o, nota: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose}
            style={{ padding: '9px 18px', border: '1px solid var(--border)', borderRadius: 8, background: 'none', color: 'var(--text-soft)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm({ opts, filtros: buildFiltros() })}
            style={{ padding: '9px 22px', border: 'none', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Relatorios() {
  const { relatorios, loading, save, remove, canEdit } = useRelatorios('relatorio')
  const { profile } = useProfile()
  const { sources } = useDocumentDataSources()
  const [search,        setSearch]        = useLocalState('browse:relatorios:search', '')
  const [activeFilters, setActiveFilters] = useLocalState('browse:relatorios:filters', {})

  // SlideOver de cadastro
  const [slideOpen,  setSlideOpen]  = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)

  // Canvas editor (abre sobre tudo)
  const [editando,    setEditando]    = useState(null)
  const [printModal,  setPrintModal]  = useState(null)  // relatório a imprimir

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

  const columns = makeColumns(setPrintModal)

  // ── Print job: abre CanvasEditor em modo impressão ──────────────────────
  const [printJob, setPrintJob] = useState(null)

  function handlePrintConfirm({ filtros }) {
    const rel = printModal
    setPrintModal(null)
    setPrintJob({ relatorio: rel, filtros })
  }

  if (printJob) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
        <CanvasEditor
          relatorio={printJob.relatorio}
          onBack={() => setPrintJob(null)}
          readOnly
          mode="relatorio"
          initialFiltros={printJob.filtros}
          autoPrint
        />
      </div>
    )
  }

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
        modulo="relatorios"
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

      {/* ── Modal de impressão ── */}
      {printModal && <PrintModal relatorio={printModal} sources={sources} onConfirm={handlePrintConfirm} onClose={() => setPrintModal(null)} />}

      {/* ── SlideOver de cadastro ── */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={isNew ? 'Novo relatório' : (form.titulo || 'Relatório')}
        subtitle={isNew ? 'Defina as configurações antes de editar o documento' : 'Configurações do relatório'}
        saving={saving}
        saveLabel={isNew ? 'Criar relatório' : 'Salvar configurações'}
        onSave={handleSaveForm}
        onDelete={!isNew && canEdit(form) && !form.is_system ? () => handleDelete(form.id) : undefined}
        deleteConfirm="Excluir este relatório permanentemente?"
        headerExtra={
          !isNew && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <button
                onClick={() => { setSlideOpen(false); setEditando(form) }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                <FileEdit size={14} /> Editar documento
              </button>
              {form.is_system && form.elementos_padrao && (
                <button
                  onClick={async () => {
                    await save({ ...form, elementos: form.elementos_padrao })
                    setSlideOpen(false)
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  ↩ Restaurar padrão
                </button>
              )}
              {form.is_system && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 0' }}>
                  Relatório padrão do sistema · não pode ser excluído
                </div>
              )}
            </div>
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
