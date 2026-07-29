import { useState, useMemo } from 'react'
import { useCentrosCusto } from '../../hooks/useCentrosCusto'
import { useAuditLog } from '../../hooks/useAuditLog'
import BrowseLayout from '../../components/BrowseLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

const EMPTY = { nome: '', descricao: '', status: 'ativo' }

// Cadastro simples de Centro de Custo — base pra vincular custos/receitas
// de Produtos, Comissões, Campanhas, Ações, Projetos e Usuários, e pro
// módulo de Orçamento (planejado x realizado) calcular por centro.
export default function SettingsCentrosCusto() {
  const { centros, save, remove } = useCentrosCusto()
  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(null)
  const { registrar: log } = useAuditLog()

  function abrir(centro) { setEditando(centro); setForm({ ...centro }) }
  function fechar()      { setEditando(null); setForm(null) }
  function set(k, v)     { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.nome?.trim()) return
    const isNew = !form.id
    const res = await save(form)
    if (!res.ok) return alert('Erro ao salvar: ' + res.message)
    log(isNew ? 'criar' : 'editar', 'centro_custo', form.id || res.data?.id, { descricao: `Centro de custo ${isNew ? 'criado' : 'editado'}: ${form.nome}` })
    fechar()
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir o centro de custo "${form.nome}"?`)) return
    const res = await remove(form.id)
    if (!res.ok) return alert('Erro ao excluir: ' + res.message)
    log('excluir', 'centro_custo', form.id, { descricao: `Centro de custo excluído: ${form.nome}` })
    fechar()
  }

  const columns = useMemo(() => [
    { key: 'nome', label: 'Nome', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
        {row.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{row.descricao}</div>}
      </div>
    )},
    { key: 'status', label: 'Status', width: 90, render: v => (
      <span style={{
        fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px',
        background: v === 'ativo' ? 'var(--accent-lite)' : 'var(--surface)',
        color: v === 'ativo' ? 'var(--accent)' : 'var(--text-muted)',
        border: `1px solid ${v === 'ativo' ? 'var(--accent)' : 'var(--border)'}`,
      }}>
        {v === 'ativo' ? 'Ativo' : 'Inativo'}
      </span>
    )},
  ], [])

  if (editando !== null && form !== null) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Centros de Custo', onClick: fechar }]}
        title={form.id ? form.nome : 'Novo centro de custo'}
        onSave={form.nome?.trim() ? handleSave : undefined}
        onCancel={fechar}
        onDelete={form.id ? handleDelete : undefined}
      >
        <FPESection title="Identificação">
          <FPEField label="Nome" required>
            <input className="fpe-field" value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Comercial, Marketing, Implementação…" autoFocus />
          </FPEField>
          <FPEField label="Descrição">
            <textarea className="fpe-field" rows={3} value={form.descricao}
              onChange={e => set('descricao', e.target.value)} placeholder="Opcional" />
          </FPEField>
        </FPESection>
        <FPESection title="Status">
          <FPEField label="Status">
            <select className="fpe-field" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <BrowseLayout
      modulo="centros_custo"
      columns={columns}
      data={centros}
      keyField="id"
      storageKey="settings_centros_custo"
      onNew={() => abrir({ ...EMPTY })}
      newLabel="Novo centro de custo"
      onRowClick={abrir}
    />
  )
}
