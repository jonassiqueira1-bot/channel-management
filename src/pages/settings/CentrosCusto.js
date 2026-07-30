import { useState, useMemo } from 'react'
import { useCentrosCusto } from '../../hooks/useCentrosCusto'
import { useUsuarios } from '../../hooks/useUsuarios'
import { useAuditLog } from '../../hooks/useAuditLog'
import BrowseLayout from '../../components/BrowseLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'
import SearchSelect from '../../components/SearchSelect'

const EMPTY = { nome: '', descricao: '', status: 'ativo', responsavel_id: '' }

// Cadastro simples de Centro de Custo — base pra vincular custos/receitas
// de Produtos, Comissões, Campanhas, Ações, Projetos e Usuários, e pro
// módulo de Orçamento (planejado x realizado) calcular por centro.
export default function SettingsCentrosCusto() {
  const { centros, save, remove } = useCentrosCusto()
  const { usuarios } = useUsuarios()
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
    { key: 'responsavel_id', label: 'Responsável', render: v => {
      const u = usuarios.find(x => x.id === v)
      return u ? <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{u.nome}</span> : <span style={{ color: 'var(--border2)', fontSize: 11 }}>—</span>
    }},
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
  ], [usuarios])

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
        <FPESection title="Responsável" description="Dono do centro — ganha alçada pra aprovar custos vinculados a ele (Ações/Campanhas/Orçamento), além de admin e financeiro.">
          <FPEField label="Responsável">
            <SearchSelect
              options={usuarios.map(u => ({ id: u.id, label: u.nome, sublabel: u.email }))}
              value={form.responsavel_id || null}
              onChange={id => set('responsavel_id', id || '')}
              placeholder="Pesquisar usuário…"
              inputStyle={{ height: 38, border: '1px solid var(--border)', borderRadius: 7, padding: '0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', fontFamily: 'var(--font)', color: 'var(--text)' }}
            />
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
