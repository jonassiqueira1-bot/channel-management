import { useState, useMemo } from 'react'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useHabilitacoes } from '../../hooks/useHabilitacoes'
import { MOCK_PRODUTOS } from '../../data/mockProdutos'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

function uid() { return Date.now() + Math.floor(Math.random() * 999) }

const PRODUTOS_ATIVOS = MOCK_PRODUTOS.filter(p => p.status === 'ativo')

// ─── Badges ───────────────────────────────────────────────────────────────────
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

function ProdutoBadge({ produto }) {
  if (!produto) return <span style={{ fontSize: 12, color: 'var(--border2)' }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
      background: 'var(--accent-glow)', color: 'var(--accent)',
      border: '1px solid rgba(99,102,241,0.18)', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.7 }}>{produto.codigo}</span>
      {produto.nome}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Habilitacoes() {
  const { habilitacoes, save: saveHab, remove: removeHab } = useHabilitacoes()
  const { registrar: log } = useAuditLog()
  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(null)
  const [search, setSearch]     = useState('')

  const filtered = habilitacoes.filter(h =>
    h.nome.toLowerCase().includes(search.toLowerCase())
  )

  function abrirNovo() {
    setForm({ nome: '', situacao: 'ativo', produto_id: '' })
    setEditando('novo')
  }

  function abrirEdicao(hab) {
    setForm({ ...hab, produto_id: hab.produto_id ?? '' })
    setEditando(hab)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const nomeErr = useMemo(() => {
    if (!form?.nome?.trim()) return null
    return habilitacoes.some(
      h => h.id !== editando?.id && h.nome.trim().toLowerCase() === form.nome.trim().toLowerCase()
    ) ? 'Já existe uma habilitação com este nome' : null
  }, [form?.nome, habilitacoes, editando])

  const produtoSelecionado = useMemo(
    () => PRODUTOS_ATIVOS.find(p => p.id === Number(form?.produto_id)) || null,
    [form?.produto_id]
  )

  function handleSave() {
    if (!form.nome.trim() || nomeErr) return
    const data = { ...form, nome: form.nome.trim(), produto_id: form.produto_id !== '' ? Number(form.produto_id) : null }
    const isNew = editando === 'novo'
    const id = isNew ? uid() : editando.id
    saveHab({ ...data, id })
    log(isNew ? 'criar' : 'editar', 'habilitacao', id, { descricao: `Habilitação ${isNew ? 'criada' : 'editada'}: ${data.nome}` })
    setEditando(null)
  }

  function handleDelete(id) {
    const h = habilitacoes.find(x => x.id === id)
    removeHab(id)
    log('excluir', 'habilitacao', id, { descricao: `Habilitação excluída: ${h?.nome || id}` })
    setEditando(null)
  }

  if (editando) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Habilitações', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Nova Habilitação' : `Editar: ${editando.nome}`}
        onSave={handleSave}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
      >
        <FPESection title="Identificação">
          <FPEField label="Nome da Habilitação" required error={nomeErr}>
            <input className="fpe-field"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Habilitação Comercial"
              style={nomeErr ? { borderColor: 'var(--red)' } : {}}
            />
          </FPEField>

          <FPEField label="Produto vinculado">
            <select className="fpe-field"
              value={form.produto_id}
              onChange={e => set('produto_id', e.target.value)}
            >
              <option value="">— Nenhum produto —</option>
              {PRODUTOS_ATIVOS.map(p => (
                <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>
              ))}
            </select>
            {produtoSelecionado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '8px 10px', background: 'var(--accent-glow)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                  produto_id: <strong>{produtoSelecionado.id}</strong>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                  R$ {produtoSelecionado.preco?.toLocaleString('pt-BR')} / {produtoSelecionado.cobranca}
                </span>
              </div>
            )}
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
              habilitacao.id: <span style={{ color: 'var(--accent)' }}>{editando.id}</span>
              {editando.produto_id && (
                <> · produto_id: <span style={{ color: 'var(--accent)' }}>{editando.produto_id}</span></>
              )}
            </div>
          )}
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <SettingsLayout
      title="Habilitações"
      description="Defina os tipos de habilitação e vincule-os aos produtos do tenant."
      columns={[
        { key: 'nome', label: 'Nome' },
        { key: 'produto_id', label: 'Produto vinculado', render: (v) => {
          const produto = PRODUTOS_ATIVOS.find(p => p.id === v) || null
          return <ProdutoBadge produto={produto} />
        }},
        { key: 'situacao', label: 'Situação', render: (v) => <SituacaoBadge situacao={v} /> },
      ]}
      data={filtered}
      keyField="id"
      emptyLabel="Nenhuma habilitação cadastrada ainda."
      onNew={abrirNovo}
      newLabel="+ Nova habilitação"
      rowActions={[
        { label: 'Editar',  onClick: abrirEdicao },
        { label: 'Excluir', danger: true, onClick: row => handleDelete(row.id) },
      ]}
      search={search}
      onSearchChange={setSearch}
    />
  )
}
