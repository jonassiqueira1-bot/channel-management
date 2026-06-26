import { useState, useRef, useEffect } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { useAuditLog } from '../../hooks/useAuditLog'
import { MOCK_PERFIS } from '../../data/mockPerfis'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'
import { PERFIS_NATIVOS_SEED } from '../Perfis'

// Módulos do sistema alinhados com a sidebar atual
const ENTITIES = [
  { key: 'dashboard',        label: 'Dashboard',           grupo: 'Visão Geral'   },
  { key: 'relatorios',       label: 'Relatórios',          grupo: 'Visão Geral'   },
  { key: 'metas',            label: 'Metas',               grupo: 'Visão Geral'   },
  { key: 'pipeline',         label: 'Pipeline',            grupo: 'Comercial'     },
  { key: 'acoes',            label: 'Ações',               grupo: 'Comercial'     },
  { key: 'tarefas',          label: 'Tarefas',             grupo: 'Comercial'     },
  { key: 'playbooks',        label: 'Playbooks',           grupo: 'Comercial'     },
  { key: 'contatos_canais',  label: 'Contatos Canais',     grupo: 'Canal'         },
  { key: 'campanhas',        label: 'Campanhas',           grupo: 'Canal'         },
  { key: 'empresas',         label: 'Empresas',            grupo: 'CRM'           },
  { key: 'contatos',         label: 'Contatos',            grupo: 'CRM'           },
  { key: 'contratos',        label: 'Contratos',           grupo: 'CRM'           },
  { key: 'pagamentos',       label: 'Pagamentos',          grupo: 'Financeiro'    },
  { key: 'comissoes',        label: 'Comissões',           grupo: 'Financeiro'    },
  { key: 'projetos',         label: 'Projetos',            grupo: 'Pós-venda'     },
  { key: 'customer_success', label: 'Sucesso do Cliente',  grupo: 'Pós-venda'     },
  { key: 'questionarios',    label: 'Questionários',       grupo: 'Pós-venda'     },
  { key: 'documentos',       label: 'Documentos',          grupo: 'Pós-venda'     },
]

const GRUPOS_ENTITIES = [...new Set(ENTITIES.map(e => e.grupo))]

const SCOPE_OPTIONS = [
  { value: 'todos',    label: 'Todos os usuários',    desc: 'Qualquer usuário logado pode ver' },
  { value: 'perfis',  label: 'Perfis de Acesso',      desc: 'Apenas usuários com os perfis selecionados' },
  { value: 'usuarios', label: 'Usuários específicos', desc: 'Apenas os usuários selecionados' },
]

const CHIP_ON  = { display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'var(--font)', background:'var(--accent)20', color:'var(--accent)' }
const CHIP_OFF = { display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'var(--font)', background:'var(--surface2)', color:'var(--text-muted)' }

const EMPTY = { scope: 'todos', perfil_ids: [], usuario_ids: [], entities: [], canEdit: false, descricao: '' }

function uid() { return Date.now() + Math.floor(Math.random() * 9999) }

// ─── SearchableMultiSelect ────────────────────────────────────────────────────
function SearchableMultiSelect({ options, value = [], onChange, placeholder = 'Selecionar…' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selected = options.filter(o => value.includes(o.value))

  function toggle(val) {
    onChange(value.includes(val) ? value.filter(v => v !== val) : [...value, val])
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', minHeight: 38, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' }}>
        {selected.length === 0
          ? <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{placeholder}</span>
          : selected.map(o => (
            <span key={o.value} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-lite)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {o.label}
              <span onClick={e => { e.stopPropagation(); toggle(o.value) }} style={{ cursor: 'pointer', opacity: 0.7 }}>×</span>
            </span>
          ))
        }
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border2)' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar…" className="fpe-field" style={{ height: 30, fontSize: 12 }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Nenhum resultado</div>
              : filtered.map(o => {
                const checked = value.includes(o.value)
                return (
                  <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', background: checked ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{o.label}</span>
                    {o.sub && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.sub}</span>}
                  </label>
                )
              })
            }
          </div>
          {value.length > 0 && (
            <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{value.length} selecionado{value.length !== 1 ? 's' : ''}</span>
              <button type="button" onClick={() => onChange([])} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>Limpar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ScopeTag (para coluna da lista) ─────────────────────────────────────────
function ScopeTag({ scope, perfil_ids, usuario_ids, perfis, usuarios }) {
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
  const nomes = (usuario_ids || []).map(id => usuarios.find(u => u.id === id)?.nome).filter(Boolean)
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
      {nomes.length ? nomes.map(n => (
        <span key={n} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'var(--surface2)', color:'var(--text)' }}>{n}</span>
      )) : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BranchSharing() {
  const [perfisRoles]        = useLocalState('perfis:roles', PERFIS_NATIVOS_SEED)
  const [usuarios]           = useLocalState('settings:perfis_v2', MOCK_PERFIS)
  const [regras, setRegras]  = useLocalState('settings:compartilhamento_v2', [])
  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [busca, setBusca]       = useState('')
  const { registrar: log } = useAuditLog()

  const usuariosAtivos = usuarios.filter(u => u.status !== 'inativo')

  function abrirNovo() { setForm({ ...EMPTY }); setEditando('novo') }
  function abrirEdicao(row) { setForm({ ...row }); setEditando(row) }
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

    const isNew = editando === 'novo'
    const record = { ...form, id: isNew ? uid() : form.id }
    setRegras(prev => isNew ? [...prev, record] : prev.map(r => r.id === form.id ? record : r))
    log(isNew ? 'criar' : 'editar', 'compartilhamento', record.id, { descricao: `Regra de compartilhamento ${isNew ? 'criada' : 'editada'}: ${form.descricao || ''}` })
    setEditando(null)
  }

  function handleDelete(id) {
    setRegras(prev => prev.filter(r => r.id !== id))
    log('excluir', 'compartilhamento', id, { descricao: 'Regra de compartilhamento excluída' })
    setEditando(null)
  }

  const entityLabel = key => ENTITIES.find(e => e.key === key)?.label || key

  const filtered = regras.filter(r => {
    if (!busca) return true
    const q = busca.toLowerCase()
    const perfisNomes = (r.perfil_ids || []).map(id => perfisRoles.find(p => p.id === id)?.nome || '').join(' ')
    const usersNomes  = (r.usuario_ids || []).map(id => usuariosAtivos.find(u => u.id === id)?.nome || '').join(' ')
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
          <FPEField label="Descrição (opcional)" style={{ gridColumn: '1/-1' }}>
            <input className="fpe-field" value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Ex: Vendedores veem oportunidades do canal…" />
          </FPEField>
        </FPESection>

        <FPESection title="Quem pode ver" columns={1}>
          <FPEField label="Escopo de acesso" required>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {SCOPE_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:8, border:`2px solid ${form.scope === opt.value ? 'var(--accent)' : 'var(--border)'}`, background: form.scope === opt.value ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'var(--surface)' }}>
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
            <FPEField label="Perfis com visibilidade" required>
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
              <SearchableMultiSelect
                options={usuariosAtivos.map(u => ({ value: u.id, label: u.nome, sub: u.papel }))}
                value={form.usuario_ids}
                onChange={ids => set('usuario_ids', ids)}
                placeholder="Selecionar usuários…"
              />
            </FPEField>
          )}
        </FPESection>

        <FPESection title="Módulos compartilhados" columns={1}>
          <FPEField label="Selecione os módulos visíveis" required>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {GRUPOS_ENTITIES.map(grupo => (
                <div key={grupo}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:8 }}>{grupo}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {ENTITIES.filter(e => e.grupo === grupo).map(e => (
                      <button key={e.key} type="button"
                        style={form.entities.includes(e.key) ? CHIP_ON : CHIP_OFF}
                        onClick={() => toggleList('entities', e.key)}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {form.entities.length > 0 && (
                <button type="button" onClick={() => set('entities', [])}
                  style={{ alignSelf:'flex-start', fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                  Limpar seleção ({form.entities.length})
                </button>
              )}
            </div>
          </FPEField>

          <FPEField label="Permissão de edição">
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, color:'var(--text)', padding:'10px 12px', borderRadius:8, border:`1px solid ${form.canEdit ? 'var(--accent)' : 'var(--border)'}`, background: form.canEdit ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent' }}>
              <input type="checkbox" checked={form.canEdit}
                onChange={e => set('canEdit', e.target.checked)}
                style={{ accentColor:'var(--accent)' }} />
              <div>
                <div style={{ fontWeight:600 }}>Permitir edição além de visualização</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>Os usuários selecionados poderão criar e editar registros nos módulos acima</div>
              </div>
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
          <ScopeTag scope={v} perfil_ids={row.perfil_ids} usuario_ids={row.usuario_ids} perfis={perfisRoles} usuarios={usuariosAtivos} />
        )},
        { key: 'entities', label: 'Módulos', render: (v) => (
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{(v || []).map(entityLabel).join(', ') || '—'}</span>
        )},
        { key: 'canEdit', label: 'Edição', align:'center', width:80,
          render: (v) => <span style={{ fontSize:13, color: v ? 'var(--accent)' : 'var(--text-muted)' }}>{v ? '✓' : '—'}</span> },
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
