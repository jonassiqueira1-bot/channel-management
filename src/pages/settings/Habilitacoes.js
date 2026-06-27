import { useState, useMemo } from 'react'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useHabilitacoes } from '../../hooks/useHabilitacoes'
import { useProducts } from '../../hooks/useProducts'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

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

function VinculoBadge({ text, muted }) {
  if (!text) return <span style={{ fontSize: 12, color: 'var(--border2)' }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
      background: muted ? 'var(--surface2)' : 'var(--accent-glow)',
      color: muted ? 'var(--text-muted)' : 'var(--accent)',
      border: muted ? '1px solid var(--border)' : '1px solid rgba(99,102,241,0.18)',
      whiteSpace: 'nowrap',
    }}>
      {muted && <span style={{ fontSize: 10, opacity: 0.6 }}>cat.</span>}
      {text}
    </span>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Habilitacoes() {
  const { habilitacoes, save: saveHab, remove: removeHab } = useHabilitacoes()
  const { registrar: log } = useAuditLog()
  const { produtos } = useProducts()

  const produtosAtivos = useMemo(() => produtos.filter(p => p.status === 'ativo'), [produtos])

  // categorias únicas extraídas dos produtos
  const categorias = useMemo(() => {
    const set = new Set(produtosAtivos.map(p => p.categoria).filter(Boolean))
    return [...set].sort()
  }, [produtosAtivos])

  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(null)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [erro, setErro]         = useState(null)

  const filtered = habilitacoes.filter(h =>
    (h.nome || '').toLowerCase().includes(search.toLowerCase())
  )

  function abrirNovo() {
    setForm({ nome: '', situacao: 'ativo', tipo_vinculo: 'produto', produto_id: '', categoria_produto: '' })
    setEditando('novo')
    setErro(null)
  }

  function abrirEdicao(hab) {
    setForm({
      ...hab,
      tipo_vinculo: hab.categoria_produto ? 'categoria' : 'produto',
      produto_id: hab.produto_id ?? '',
      categoria_produto: hab.categoria_produto ?? '',
    })
    setEditando(hab)
    setErro(null)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const nomeErr = useMemo(() => {
    if (!form?.nome?.trim()) return null
    return habilitacoes.some(
      h => h.id !== editando?.id && h.nome.trim().toLowerCase() === form.nome.trim().toLowerCase()
    ) ? 'Já existe uma habilitação com este nome' : null
  }, [form?.nome, habilitacoes, editando])

  async function handleSave() {
    if (!form.nome.trim() || nomeErr) return
    setSaving(true)
    setErro(null)

    const isNew = editando === 'novo'
    const data = {
      nome:              form.nome.trim(),
      situacao:          form.situacao,
      // envia apenas o campo do tipo de vínculo selecionado
      produto_id:        form.tipo_vinculo === 'produto' && form.produto_id ? form.produto_id : null,
      categoria_produto: form.tipo_vinculo === 'categoria' && form.categoria_produto ? form.categoria_produto : null,
    }

    // Para novo: sem id (Supabase gera UUID). Para edição: usa o id existente.
    const record = isNew ? data : { ...data, id: editando.id }

    const result = await saveHab(record)
    setSaving(false)

    if (!result?.ok) {
      setErro(result?.message || 'Erro ao salvar')
      return
    }

    log(isNew ? 'criar' : 'editar', 'habilitacao', editando?.id || 'novo', {
      descricao: `Habilitação ${isNew ? 'criada' : 'editada'}: ${data.nome}`,
    })
    setEditando(null)
  }

  function handleDelete(id) {
    const h = habilitacoes.find(x => x.id === id)
    removeHab(id)
    log('excluir', 'habilitacao', id, { descricao: `Habilitação excluída: ${h?.nome || id}` })
    setEditando(null)
  }

  // ─── Vinculo label para o browse ─────────────────────────────────────────────
  function vinculoLabel(row) {
    if (row.categoria_produto) return { text: row.categoria_produto, muted: true }
    if (row.produto_id) {
      const p = produtosAtivos.find(x => x.id === row.produto_id)
      return { text: p ? `${p.nome}${p.codigo ? ` (${p.codigo})` : ''}` : row.produto_id, muted: false }
    }
    return { text: null }
  }

  if (editando) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Habilitações', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Nova Habilitação' : `Editar: ${editando.nome}`}
        onSave={handleSave}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
        saving={saving}
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

          {/* Tipo de vínculo */}
          <FPEField label="Vínculo">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[
                { key: 'produto',   label: 'Produto específico'   },
                { key: 'categoria', label: 'Categoria de produto'  },
                { key: 'nenhum',    label: 'Nenhum'               },
              ].map(opt => (
                <button key={opt.key} type="button"
                  onClick={() => set('tipo_vinculo', opt.key)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
                    border: form.tipo_vinculo === opt.key ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: form.tipo_vinculo === opt.key ? 'var(--accent-glow)' : 'var(--surface)',
                    color: form.tipo_vinculo === opt.key ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {form.tipo_vinculo === 'produto' && (
              <select className="fpe-field"
                value={form.produto_id}
                onChange={e => set('produto_id', e.target.value)}
              >
                <option value="">— Selecione um produto —</option>
                {produtosAtivos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}{p.codigo ? ` (${p.codigo})` : ''}</option>
                ))}
              </select>
            )}

            {form.tipo_vinculo === 'categoria' && (
              categorias.length > 0
                ? <select className="fpe-field"
                    value={form.categoria_produto}
                    onChange={e => set('categoria_produto', e.target.value)}
                  >
                    <option value="">— Selecione uma categoria —</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                : <input className="fpe-field"
                    value={form.categoria_produto}
                    onChange={e => set('categoria_produto', e.target.value)}
                    placeholder="Nome da categoria…"
                  />
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

          {erro && (
            <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 7, fontSize: 12, color: '#DC2626' }}>
              {erro}
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
        { key: 'nome',      label: 'Nome' },
        { key: 'produto_id', label: 'Vínculo', render: (_, row) => {
          const v = vinculoLabel(row)
          return <VinculoBadge text={v.text} muted={v.muted} />
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
