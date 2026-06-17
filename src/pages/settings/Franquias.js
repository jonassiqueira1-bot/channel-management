import { useState, useMemo } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

function uid() { return Date.now() + Math.floor(Math.random() * 999) }

// ─── Badge ────────────────────────────────────────────────────────────────────
function SituacaoBadge({ situacao }) {
  const ativo = situacao === 'ativo'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
      background: ativo ? '#D1FAE5' : '#F1F5F9',
      color:      ativo ? '#065F46' : '#475569',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ativo ? '#10B981' : '#9A9590' }} />
      {ativo ? 'Ativa' : 'Inativa'}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Franquias() {
  const [franquias, setFranquias] = useLocalState('settings:franquias_v2', [])
  const [editando, setEditando]   = useState(null)
  const [form, setForm]           = useState(null)
  const [search, setSearch]       = useState('')

  const filtered = franquias.filter(f =>
    f.nome.toLowerCase().includes(search.toLowerCase())
  )

  function abrirNovo() {
    setForm({ nome: '', situacao: 'ativo' })
    setEditando('novo')
  }

  function abrirEdicao(franquia) {
    setForm({ ...franquia })
    setEditando(franquia)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const nomeErr = useMemo(() => {
    if (!form?.nome?.trim()) return null
    return franquias.some(
      f => f.id !== editando?.id && f.nome.trim().toLowerCase() === form.nome.trim().toLowerCase()
    ) ? 'Já existe uma franquia com este nome' : null
  }, [form?.nome, franquias, editando])

  function handleSave() {
    if (!form.nome.trim() || nomeErr) return
    const data = { ...form, nome: form.nome.trim() }
    if (editando !== 'novo') {
      setFranquias(prev => prev.map(f => f.id === editando.id ? { ...f, ...data } : f))
    } else {
      setFranquias(prev => [...prev, { ...data, id: uid() }])
    }
    setEditando(null)
  }

  function handleDelete(id) {
    setFranquias(prev => prev.filter(f => f.id !== id))
    setEditando(null)
  }

  if (editando) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Franquias', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Nova Franquia' : `Editar: ${editando.nome}`}
        onSave={handleSave}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
      >
        <FPESection title="Identificação">
          <FPEField label="Nome da Franquia" required error={nomeErr}>
            <input className="fpe-field"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Franquia Norte"
              style={nomeErr ? { borderColor: 'var(--red)' } : {}}
            />
          </FPEField>

          <FPEField label="Situação">
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: 'ativo',   label: 'Ativa',   color: '#10B981', bg: '#ECFDF5' },
                { value: 'inativo', label: 'Inativa', color: '#9A9590', bg: '#F1F5F9' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => set('situacao', opt.value)}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    border: form.situacao === opt.value ? `2px solid ${opt.color}` : '2px solid var(--border)',
                    background: form.situacao === opt.value ? opt.bg : 'var(--surface)',
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: form.situacao === opt.value ? opt.color : 'var(--text-muted)' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </FPEField>

          {editando !== 'novo' && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 7, border: '1px solid var(--border)' }}>
              franquia_id: <span style={{ color: 'var(--accent)' }}>{editando.id}</span>
              <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>— usado como FK em empresas.franquia_id</span>
            </div>
          )}
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <SettingsLayout
      title="Franquias"
      description="Gerencie as franquias disponíveis. Cada franquia pode ser vinculada a empresas via franquia_id."
      columns={[
        { key: 'nome', label: 'Nome' },
        { key: 'situacao', label: 'Situação', render: (v) => <SituacaoBadge situacao={v} />, width: 120 },
      ]}
      data={filtered}
      keyField="id"
      emptyLabel="Nenhuma franquia cadastrada ainda."
      onNew={abrirNovo}
      newLabel="+ Nova franquia"
      rowActions={[
        { label: 'Editar',  onClick: abrirEdicao },
        { label: 'Excluir', danger: true, onClick: row => handleDelete(row.id) },
      ]}
      search={search}
      onSearchChange={setSearch}
    />
  )
}
