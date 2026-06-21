import { useState } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'
import { PERFIS_NATIVOS_SEED } from '../Perfis'

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

const SCOPE_OPTIONS = [
  { value: 'todos',    label: 'Todos os usuários',    desc: 'Qualquer usuário logado pode ver' },
  { value: 'perfis',  label: 'Perfis de Acesso',      desc: 'Apenas usuários com os perfis selecionados' },
  { value: 'usuarios', label: 'Usuários específicos', desc: 'Apenas os usuários selecionados' },
]

const CHIP_ON  = { display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'var(--font)', background:'var(--accent)20', color:'var(--accent)' }
const CHIP_OFF = { display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'var(--font)', background:'var(--surface2)', color:'var(--text-muted)' }

const EMPTY = { scope: 'todos', perfil_ids: [], usuario_ids: [], entities: [], canEdit: false, descricao: '' }

function uid() { return Date.now() + Math.floor(Math.random() * 9999) }

const MOCK_USUARIOS = [
  { id: 'u1', nome: 'Jonas Siqueira', papel: 'admin_isv' },
  { id: 'u2', nome: 'Ana Paula',      papel: 'gestor_canais' },
  { id: 'u3', nome: 'Carlos Mendes',  papel: 'vendedor' },
  { id: 'u4', nome: 'Fernanda Lima',  papel: 'vendedor' },
]

function ScopeTag({ scope, perfil_ids, usuario_ids, perfis }) {
  if (scope === 'todos') return <span style={{ fontSize:12, color:'var(--text-muted)' }}>Todos os usuários</span>
  if (scope === 'perfis') {
    const nomes = (perfil_ids || []).map(id => perfis.find(p => p.id === id)?.nome).filter(Boolean)
    return (
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {nomes.length ? nomes.map(n => (
          <span key={n} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'var(--accent)15', color:'var(--accent)', border:'1px solid var(--accent)30' }}>{n}</span>
        )) : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
      </div>
    )
  }
  const nomes = (usuario_ids || []).map(id => MOCK_USUARIOS.find(u => u.id === id)?.nome).filter(Boolean)
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
      {nomes.length ? nomes.map(n => (
        <span key={n} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'var(--surface2)', color:'var(--text)' }}>{n}</span>
      )) : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
    </div>
  )
}

export default function BranchSharing() {
  const [perfisRoles]       = useLocalState('perfis:roles', PERFIS_NATIVOS_SEED)
  const [regras, setRegras]  = useLocalState('settings:compartilhamento_v2', [])
  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [busca, setBusca]       = useState('')

  function abrirNovo() {
    setForm({ ...EMPTY })
    setEditando('novo')
  }

  function abrirEdicao(row) {
    setForm({ ...row })
    setEditando(row)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function toggleList(field, key) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(key) ? f[field].filter(k => k !== key) : [...f[field], key],
    }))
  }

  function handleSave() {
    if (form.entities.length === 0) return
    if (form.scope === 'perfis'   && form.perfil_ids.length  === 0) return
    if (form.scope === 'usuarios' && form.usuario_ids.length === 0) return

    const record = { ...form, id: editando === 'novo' ? uid() : form.id }
    if (editando === 'novo') {
      setRegras(prev => [...prev, record])
    } else {
      setRegras(prev => prev.map(r => r.id === form.id ? record : r))
    }
    setEditando(null)
  }

  function handleDelete(id) {
    setRegras(prev => prev.filter(r => r.id !== id))
    setEditando(null)
  }

  const entityLabel = key => ENTITIES.find(e => e.key === key)?.label || key

  const filtered = regras.filter(r => {
    if (!busca) return true
    const q = busca.toLowerCase()
    const perfisNomes = (r.perfil_ids || []).map(id => perfisRoles.find(p => p.id === id)?.nome || '').join(' ')
    const usersNomes  = (r.usuario_ids || []).map(id => MOCK_USUARIOS.find(u => u.id === id)?.nome || '').join(' ')
    return (r.descricao || '').toLowerCase().includes(q) ||
      perfisNomes.toLowerCase().includes(q) ||
      usersNomes.toLowerCase().includes(q) ||
      (r.entities || []).some(e => entityLabel(e).toLowerCase().includes(q))
  })

  if (editando) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Compartilhamento', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Nova Regra de Compartilhamento' : 'Editar Regra de Compartilhamento'}
        subtitle="Defina quais usuários ou perfis podem ver determinadas entidades do sistema"
        onSave={handleSave}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(form.id) : undefined}
      >
        <FPESection title="Identificação">
          <FPEField label="Descrição (opcional)">
            <input className="fpe-field" value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Ex: Vendedores veem oportunidades do canal…" />
          </FPEField>
        </FPESection>

        <FPESection title="Quem pode ver">
          <FPEField label="Escopo de acesso" required>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {SCOPE_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:8, border:`2px solid ${form.scope === opt.value ? 'var(--accent)' : 'var(--border)'}`, background: form.scope === opt.value ? 'var(--accent-glow, var(--surface2))' : 'var(--surface)' }}>
                  <input type="radio" name="scope" value={opt.value} checked={form.scope === opt.value}
                    onChange={() => set('scope', opt.value)} style={{ marginTop:2, accentColor:'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </FPEField>

          {form.scope === 'perfis' && (
            <FPEField label="Perfis de acesso com visibilidade" required>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, paddingTop:4 }}>
                {perfisRoles.map(p => (
                  <button key={p.id} type="button"
                    style={form.perfil_ids.includes(p.id)
                      ? { ...CHIP_ON, borderLeft:`3px solid ${p.cor || 'var(--accent)'}` }
                      : CHIP_OFF}
                    onClick={() => toggleList('perfil_ids', p.id)}>
                    {p.nome}
                  </button>
                ))}
              </div>
            </FPEField>
          )}

          {form.scope === 'usuarios' && (
            <FPEField label="Usuários com visibilidade" required>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {MOCK_USUARIOS.map(u => (
                  <label key={u.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 10px', borderRadius:7, border:`1px solid ${form.usuario_ids.includes(u.id) ? 'var(--accent)' : 'var(--border)'}`, background: form.usuario_ids.includes(u.id) ? 'var(--accent-glow, var(--surface2))' : 'transparent' }}>
                    <input type="checkbox" checked={form.usuario_ids.includes(u.id)}
                      onChange={() => toggleList('usuario_ids', u.id)}
                      style={{ accentColor:'var(--accent)' }} />
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{u.nome}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{u.papel}</span>
                  </label>
                ))}
              </div>
            </FPEField>
          )}
        </FPESection>

        <FPESection title="Dados compartilhados">
          <FPEField label="Entidades visíveis" required>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, paddingTop:4 }}>
              {ENTITIES.map(e => (
                <button key={e.key} type="button"
                  style={form.entities.includes(e.key) ? CHIP_ON : CHIP_OFF}
                  onClick={() => toggleList('entities', e.key)}>
                  {e.label}
                </button>
              ))}
            </div>
          </FPEField>
          <FPEField label="Permissão de edição">
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, color:'var(--text)' }}>
              <input type="checkbox" checked={form.canEdit}
                onChange={e => set('canEdit', e.target.checked)}
                style={{ accentColor:'var(--accent)' }} />
              Permitir edição além de visualização
            </label>
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <SettingsLayout
      title="Compartilhamento de Dados"
      description="Defina quais perfis ou usuários têm acesso a determinadas entidades do sistema."
      columns={[
        { key: 'scope', label: 'Quem pode ver', render: (v, row) => (
          <ScopeTag scope={v} perfil_ids={row.perfil_ids} usuario_ids={row.usuario_ids} perfis={perfisRoles} />
        )},
        { key: 'entities', label: 'Entidades', render: (v) => (
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{(v || []).map(entityLabel).join(', ') || '—'}</span>
        )},
        { key: 'canEdit', label: 'Pode editar', align:'center', width:100,
          render: (v) => <span style={{ fontSize:13 }}>{v ? '✓' : '—'}</span> },
        { key: 'descricao', label: 'Descrição', priority:2,
          render: (v) => <span style={{ fontSize:12, color:'var(--text-muted)' }}>{v || '—'}</span> },
      ]}
      data={filtered}
      keyField="id"
      emptyLabel="Nenhuma regra de compartilhamento configurada."
      onNew={abrirNovo}
      newLabel="+ Nova regra"
      rowActions={[
        { label: 'Editar',  onClick: abrirEdicao },
        { label: 'Remover', danger: true, onClick: row => handleDelete(row.id) },
      ]}
      search={busca}
      onSearchChange={setBusca}
    />
  )
}
