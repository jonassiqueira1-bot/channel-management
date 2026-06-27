import { useState, useMemo, useRef, useEffect } from 'react'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useHabilitacoes } from '../../hooks/useHabilitacoes'
import { useProducts } from '../../hooks/useProducts'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'
import { Search, X } from 'lucide-react'

// ─── Multi-select com pesquisa ────────────────────────────────────────────────
function MultiSelect({ options, value = [], onChange, placeholder = 'Buscar…' }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o =>
    !q || o.label.toLowerCase().includes(q.toLowerCase())
  )

  function toggle(id) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  const selected = options.filter(o => value.includes(o.id))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          minHeight: 34, padding: '4px 8px', borderRadius: 6,
          border: '1px solid var(--border)', background: 'var(--surface2)',
          cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
        }}
      >
        {selected.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum selecionado…</span>
        )}
        {selected.map(o => (
          <span key={o.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px',
            borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)',
          }}>
            {o.label}
            <span onClick={e => { e.stopPropagation(); toggle(o.id) }} style={{ cursor: 'pointer', lineHeight: 1 }}>
              <X size={10} strokeWidth={2.5} />
            </span>
          </span>
        ))}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={placeholder}
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font)' }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Nenhum resultado.</div>
            )}
            {filtered.map(o => (
              <label key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer',
                background: value.includes(o.id) ? 'var(--accent-glow)' : 'transparent',
                fontSize: 12,
              }}>
                <input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} style={{ accentColor: 'var(--accent)' }} />
                <span style={{ color: 'var(--text)' }}>{o.label}</span>
                {o.sub && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{o.sub}</span>}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function SituacaoBadge({ situacao }) {
  const ativo = situacao === 'ativo'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)',
      background: ativo ? '#D1FAE5' : '#F1F5F9', color: ativo ? '#065F46' : '#475569',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ativo ? '#10B981' : '#9A9590' }} />
      {ativo ? 'Ativa' : 'Inativa'}
    </span>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Habilitacoes() {
  const { habilitacoes, save: saveHab, remove: removeHab } = useHabilitacoes()
  const { registrar: log } = useAuditLog()
  const { produtos } = useProducts()

  const produtosAtivos = useMemo(() => produtos.filter(p => p.status === 'ativo'), [produtos])
  const categorias = useMemo(() => {
    const s = new Set(produtosAtivos.map(p => p.categoria).filter(Boolean))
    return [...s].sort()
  }, [produtosAtivos])

  const produtoOptions = useMemo(() =>
    produtosAtivos.map(p => ({ id: p.id, label: p.nome, sub: p.codigo || '' })),
  [produtosAtivos])

  const categoriaOptions = useMemo(() =>
    categorias.map(c => ({ id: c, label: c })),
  [categorias])

  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(null)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [erro, setErro]         = useState(null)

  const filtered = habilitacoes.filter(h =>
    (h.nome || '').toLowerCase().includes(search.toLowerCase())
  )

  function abrirNovo() {
    setForm({ nome: '', situacao: 'ativo', tipo_vinculo: 'produto', produto_ids: [], categoria_produtos: [] })
    setEditando('novo')
    setErro(null)
  }

  function abrirEdicao(hab) {
    const cf = hab.custom_fields || {}
    setForm({
      ...hab,
      tipo_vinculo: cf.tipo_vinculo || (hab.categoria_produto ? 'categoria' : hab.produto_id ? 'produto' : 'produto'),
      produto_ids:       cf.produto_ids       || (hab.produto_id ? [hab.produto_id] : []),
      categoria_produtos: cf.categoria_produtos || (hab.categoria_produto ? [hab.categoria_produto] : []),
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
    const record = {
      nome:     form.nome.trim(),
      situacao: form.situacao,
      // mantém compat com campos legados
      produto_id:        form.tipo_vinculo === 'produto'   && form.produto_ids?.[0]          ? form.produto_ids[0] : null,
      categoria_produto: form.tipo_vinculo === 'categoria' && form.categoria_produtos?.[0]    ? form.categoria_produtos[0] : null,
      custom_fields: {
        tipo_vinculo:       form.tipo_vinculo,
        produto_ids:        form.tipo_vinculo === 'produto'   ? (form.produto_ids || [])        : [],
        categoria_produtos: form.tipo_vinculo === 'categoria' ? (form.categoria_produtos || []) : [],
      },
      ...(isNew ? {} : { id: editando.id }),
    }

    const result = await saveHab(record)
    setSaving(false)

    if (!result?.ok) { setErro(result?.message || 'Erro ao salvar'); return }
    log(isNew ? 'criar' : 'editar', 'habilitacao', editando?.id || 'novo', {
      descricao: `Habilitação ${isNew ? 'criada' : 'editada'}: ${record.nome}`,
    })
    setEditando(null)
  }

  function handleDelete(id) {
    const h = habilitacoes.find(x => x.id === id)
    removeHab(id)
    log('excluir', 'habilitacao', id, { descricao: `Habilitação excluída: ${h?.nome || id}` })
    setEditando(null)
  }

  // label para browse
  function vinculoCell(row) {
    const cf = row.custom_fields || {}
    const pIds = cf.produto_ids || (row.produto_id ? [row.produto_id] : [])
    const cats = cf.categoria_produtos || (row.categoria_produto ? [row.categoria_produto] : [])
    if (pIds.length) {
      const nomes = pIds.map(id => produtosAtivos.find(p => p.id === id)?.nome || id)
      return nomes.join(', ')
    }
    if (cats.length) return cats.map(c => `cat. ${c}`).join(', ')
    return '—'
  }

  const seg = (key, label) => (
    <button type="button" onClick={() => set('tipo_vinculo', key)} style={{
      padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'var(--font)', border: '1px solid',
      borderColor: form?.tipo_vinculo === key ? 'var(--accent)' : 'var(--border)',
      background:  form?.tipo_vinculo === key ? 'var(--accent-glow)' : 'var(--surface2)',
      color:       form?.tipo_vinculo === key ? 'var(--accent)' : 'var(--text-muted)',
    }}>{label}</button>
  )

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

          <FPEField label="Vínculo">
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {seg('produto',   'Produto'  )}
              {seg('categoria', 'Categoria')}
              {seg('nenhum',    'Nenhum'   )}
            </div>
            {form.tipo_vinculo === 'produto' && (
              <MultiSelect
                options={produtoOptions}
                value={form.produto_ids}
                onChange={v => set('produto_ids', v)}
                placeholder="Buscar produto…"
              />
            )}
            {form.tipo_vinculo === 'categoria' && (
              <MultiSelect
                options={categoriaOptions}
                value={form.categoria_produtos}
                onChange={v => set('categoria_produtos', v)}
                placeholder="Buscar categoria…"
              />
            )}
          </FPEField>

          <FPEField label="Situação">
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { value: 'ativo',   label: 'Ativa',   color: '#10B981', bg: '#ECFDF5' },
                { value: 'inativo', label: 'Inativa', color: '#9A9590', bg: '#F1F5F9' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => set('situacao', opt.value)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    border: form.situacao === opt.value ? `2px solid ${opt.color}` : '2px solid var(--border)',
                    background: form.situacao === opt.value ? opt.bg : 'var(--surface)',
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: opt.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: form.situacao === opt.value ? opt.color : 'var(--text-muted)' }}>
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
        { key: 'nome',     label: 'Nome' },
        { key: 'id',       label: 'Vínculo', render: (_, row) => <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{vinculoCell(row)}</span> },
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
