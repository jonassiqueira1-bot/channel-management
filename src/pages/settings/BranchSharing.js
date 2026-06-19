import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../hooks/useProfile'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../../components/ui'

const ENTITIES = [
  { key: 'companies',     label: 'Empresas' },
  { key: 'contacts',      label: 'Contatos' },
  { key: 'opportunities', label: 'Oportunidades' },
  { key: 'contracts',     label: 'Contratos' },
  { key: 'payments',      label: 'Pagamentos' },
  { key: 'projects',      label: 'Projetos' },
  { key: 'actions',       label: 'Ações' },
  { key: 'tasks',         label: 'Tarefas' },
  { key: 'sellers',       label: 'Vendedores' },
]

const CHIP_ON  = { display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'var(--font)', background: 'var(--accent)20', color: 'var(--accent)' }
const CHIP_OFF = { display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'var(--font)', background: 'var(--surface2)', color: 'var(--text-muted)' }

const EMPTY = { srcBranch: '', tgtBranch: '', entities: [], canEdit: false }

export default function BranchSharing() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [branches,   setBranches]  = useState([])
  const [visibility, setVisibility] = useState([])
  const [loading,    setLoading]   = useState(true)
  const [saving,     setSaving]    = useState(false)
  const [editando,   setEditando]  = useState(null)
  const [form,       setForm]      = useState(EMPTY)
  const [busca,      setBusca]     = useState('')

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    setLoading(true)
    const [b, v] = await Promise.all([
      supabase.from('tenant_branches').select('id, name').order('name'),
      supabase.from('branch_table_visibility').select('*'),
    ])
    setBranches(b.data || [])
    setVisibility(v.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (session?.user) load() }, [load, session])

  function abrirNovo() {
    setForm(EMPTY)
    setEditando('novo')
  }

  function abrirEdicao(row) {
    setForm({
      srcBranch: row.source_branch_id,
      tgtBranch: row.target_branch_id,
      entities:  [row.entity_table],
      canEdit:   row.can_edit,
      _id:       row.id,
    })
    setEditando(row)
  }

  function toggleEntity(key) {
    setForm(f => ({
      ...f,
      entities: f.entities.includes(key) ? f.entities.filter(k => k !== key) : [...f.entities, key],
    }))
  }

  async function handleSave() {
    if (!form.srcBranch || !form.tgtBranch || form.entities.length === 0) return
    if (form.srcBranch === form.tgtBranch) return
    setSaving(true)

    const rows = form.entities.map(entity_table => ({
      tenant_id:        tenantId,
      source_branch_id: form.srcBranch,
      target_branch_id: form.tgtBranch,
      entity_table,
      can_view: true,
      can_edit: form.canEdit,
    }))

    await supabase
      .from('branch_table_visibility')
      .upsert(rows, { onConflict: 'tenant_id,source_branch_id,target_branch_id,entity_table' })

    setSaving(false)
    setEditando(null)
    load()
  }

  async function handleDelete(id) {
    await supabase.from('branch_table_visibility').delete().eq('id', id)
    setEditando(null)
    load()
  }

  const branchName = (id) => branches.find(b => b.id === id)?.name || id?.slice(0, 8)
  const entityLabel = (key) => ENTITIES.find(e => e.key === key)?.label || key

  if (!session?.user) return (
    <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
      Faça login para acessar esta configuração.
    </div>
  )

  if (editando) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Compartilhamento', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Novo Compartilhamento' : `${branchName(editando.source_branch_id)} → ${branchName(editando.target_branch_id)}`}
        subtitle="Defina quais dados uma filial pode ver de outra"
        onSave={handleSave}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
        saving={saving}
      >
        <FPESection title="Filiais">
          <FPEGrid>
            <FPEField label="Filial de origem (quem compartilha)" required>
              <select className="fpe-field" value={form.srcBranch} onChange={e => setForm(f => ({ ...f, srcBranch: e.target.value }))}>
                <option value="">Selecione…</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </FPEField>
            <FPEField label="Filial de destino (quem vai ver)" required>
              <select className="fpe-field" value={form.tgtBranch} onChange={e => setForm(f => ({ ...f, tgtBranch: e.target.value }))}>
                <option value="">Selecione…</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </FPEField>
          </FPEGrid>
        </FPESection>

        <FPESection title="Entidades">
          <FPEField label="Selecione as entidades que serão compartilhadas" required>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
              {ENTITIES.map(e => (
                <button key={e.key} type="button"
                  style={form.entities.includes(e.key) ? CHIP_ON : CHIP_OFF}
                  onClick={() => toggleEntity(e.key)}>
                  {e.label}
                </button>
              ))}
            </div>
          </FPEField>
          <FPEField label="Permissão de edição">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
              <input type="checkbox" checked={form.canEdit} onChange={e => setForm(f => ({ ...f, canEdit: e.target.checked }))} />
              Permitir edição além de visualização
            </label>
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <SettingsLayout
      title="Compartilhamento entre Filiais"
      description="Defina quais filiais podem ver os registros de outras filiais."
      columns={[
        { key: 'source_branch_id', label: 'Origem', render: (v) => branchName(v) },
        { key: 'target_branch_id', label: 'Destino', render: (v) => branchName(v) },
        { key: 'entity_table',     label: 'Entidade', render: (v) => entityLabel(v) },
        { key: 'can_edit',         label: 'Pode editar', align: 'center', width: 100,
          render: (v) => <span style={{ fontSize: 13 }}>{v ? '✓' : '—'}</span> },
      ]}
      data={visibility.filter(v =>
        !busca ||
        branchName(v.source_branch_id).toLowerCase().includes(busca.toLowerCase()) ||
        branchName(v.target_branch_id).toLowerCase().includes(busca.toLowerCase()) ||
        entityLabel(v.entity_table).toLowerCase().includes(busca.toLowerCase())
      )}
      keyField="id"
      loading={loading}
      emptyLabel="Nenhum compartilhamento configurado."
      onNew={abrirNovo}
      newLabel="+ Novo"
      rowActions={[
        { label: 'Editar',  onClick: abrirEdicao },
        { label: 'Remover', danger: true, onClick: row => handleDelete(row.id) },
      ]}
      search={busca}
      onSearchChange={setBusca}
    />
  )
}
