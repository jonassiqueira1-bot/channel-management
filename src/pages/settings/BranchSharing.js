import { useState, useRef, useEffect } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useParceiros } from '../../hooks/useParceiros'
import { MOCK_PERFIS } from '../../data/mockPerfis'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'
import { PERFIS_NATIVOS_SEED } from '../Perfis'
import { Share2, ArrowLeftRight } from 'lucide-react'

// Módulos compartilháveis
const MODULOS = [
  { key: 'pipeline',        label: 'Pipeline',           grupo: 'Comercial'   },
  { key: 'acoes',           label: 'Ações',              grupo: 'Comercial'   },
  { key: 'tarefas',         label: 'Tarefas',            grupo: 'Comercial'   },
  { key: 'metas',           label: 'Metas',              grupo: 'Comercial'   },
  { key: 'playbooks',       label: 'Playbooks',          grupo: 'Comercial'   },
  { key: 'empresas',        label: 'Empresas',           grupo: 'CRM'         },
  { key: 'contatos',        label: 'Contatos',           grupo: 'CRM'         },
  { key: 'contratos',       label: 'Contratos',          grupo: 'CRM'         },
  { key: 'pagamentos',      label: 'Pagamentos',         grupo: 'Financeiro'  },
  { key: 'comissoes',       label: 'Comissões',          grupo: 'Financeiro'  },
  { key: 'projetos',        label: 'Projetos',           grupo: 'Pós-venda'   },
  { key: 'customer_success',label: 'Sucesso do Cliente', grupo: 'Pós-venda'   },
  { key: 'questionarios',   label: 'Questionários',      grupo: 'Pós-venda'   },
  { key: 'documentos',      label: 'Documentos',         grupo: 'Pós-venda'   },
  { key: 'campanhas',       label: 'Campanhas',          grupo: 'Canal'       },
]

const GRUPOS_MODULOS = [...new Set(MODULOS.map(m => m.grupo))]

const ACESSO_OPTIONS = [
  { value: 'todos',    label: 'Todos os usuários',     desc: 'Qualquer usuário com acesso às filiais pode ver' },
  { value: 'perfis',  label: 'Por Perfis de Acesso',   desc: 'Apenas usuários com os perfis selecionados'     },
  { value: 'usuarios',label: 'Usuários específicos',   desc: 'Apenas os usuários listados'                    },
]

const PERMISSAO_OPTIONS = [
  { value: 'leitura',       label: 'Somente leitura',    desc: 'Visualizar os dados da outra filial'                 },
  { value: 'leitura_escrita',label: 'Leitura e escrita', desc: 'Visualizar e criar/editar registros entre as filiais' },
]

const CHIP_ON  = { display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'var(--font)', background:'var(--accent)20', color:'var(--accent)' }
const CHIP_OFF = { display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'var(--font)', background:'var(--surface2)', color:'var(--text-muted)' }

const EMPTY = {
  filial_ids:   [],   // filiais envolvidas no compartilhamento
  modulos:      [],   // módulos compartilhados
  acesso:       'todos',
  perfil_ids:   [],
  usuario_ids:  [],
  permissao:    'leitura',
  descricao:    '',
}

function uid() { return Date.now() + Math.floor(Math.random() * 9999) }
const moduloLabel = key => MODULOS.find(m => m.key === key)?.label || key

// ─── SearchableMultiSelect ────────────────────────────────────────────────────
function SearchableMultiSelect({ options, value = [], onChange, placeholder = 'Selecionar…' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filteredOpts = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selected = options.filter(o => value.includes(o.value))

  function toggle(val) {
    onChange(value.includes(val) ? value.filter(v => v !== val) : [...value, val])
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width:'100%', minHeight:38, padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', flexWrap:'wrap', gap:4, cursor:'pointer', textAlign:'left', fontFamily:'var(--font)' }}>
        {selected.length === 0
          ? <span style={{ fontSize:13, color:'var(--text-muted)' }}>{placeholder}</span>
          : selected.map(o => (
            <span key={o.value} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'var(--accent-lite)', color:'var(--accent)', border:'1px solid color-mix(in srgb, var(--accent) 25%, transparent)', display:'flex', alignItems:'center', gap:4 }}>
              {o.label}
              <span onClick={e => { e.stopPropagation(); toggle(o.value) }} style={{ cursor:'pointer', opacity:0.7 }}>×</span>
            </span>
          ))
        }
        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, marginTop:4, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border2)' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar…" className="fpe-field" style={{ height:30, fontSize:12 }} />
          </div>
          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {filteredOpts.length === 0
              ? <div style={{ padding:'10px 12px', fontSize:12, color:'var(--text-muted)' }}>Nenhum resultado</div>
              : filteredOpts.map(o => {
                const checked = value.includes(o.value)
                return (
                  <label key={o.value} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', cursor:'pointer', background: checked ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} style={{ accentColor:'var(--accent)', flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'var(--text)', flex:1 }}>{o.label}</span>
                    {o.sub && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{o.sub}</span>}
                  </label>
                )
              })
            }
          </div>
          {value.length > 0 && (
            <div style={{ padding:'6px 12px', borderTop:'1px solid var(--border2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{value.length} selecionado{value.length !== 1 ? 's' : ''}</span>
              <button type="button" onClick={() => onChange([])} style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:600 }}>Limpar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BranchSharing() {
  const { parceiros, loading: loadingFiliais } = useParceiros()
  const [perfisRoles]        = useLocalState('perfis:roles', PERFIS_NATIVOS_SEED)
  const [usuarios]           = useLocalState('settings:perfis_v2', MOCK_PERFIS)
  const [regras, setRegras]  = useLocalState('settings:compartilhamento_v3', [])
  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [busca, setBusca]       = useState('')
  const { registrar: log } = useAuditLog()

  const filiais      = parceiros  // unidades e franquias cadastradas
  const usuariosAtivos = usuarios.filter(u => u.status !== 'inativo')

  function abrirNovo()      { setForm({ ...EMPTY }); setEditando('novo') }
  function abrirEdicao(row) { setForm({ ...row });   setEditando(row)    }
  function set(k, v)        { setForm(f => ({ ...f, [k]: v })) }

  const podeGravar = form.filial_ids.length >= 2 && form.modulos.length > 0 &&
    (form.acesso === 'todos' ||
     (form.acesso === 'perfis'   && form.perfil_ids.length  > 0) ||
     (form.acesso === 'usuarios' && form.usuario_ids.length > 0))

  function handleSave() {
    if (!podeGravar) return
    const isNew = editando === 'novo'
    const record = { ...form, id: isNew ? uid() : form.id }
    setRegras(prev => isNew ? [...prev, record] : prev.map(r => r.id === form.id ? record : r))
    log(isNew ? 'criar' : 'editar', 'compartilhamento', record.id, {
      descricao: `Compartilhamento ${isNew ? 'criado' : 'editado'}: ${form.descricao || form.modulos.map(moduloLabel).join(', ')}`,
    })
    setEditando(null)
  }

  function handleDelete(id) {
    setRegras(prev => prev.filter(r => r.id !== id))
    log('excluir', 'compartilhamento', id, { descricao: 'Regra de compartilhamento excluída' })
    setEditando(null)
  }

  const filialNome = id => filiais.find(f => String(f.id) === String(id))?.nome || id

  const filtered = regras.filter(r => {
    if (!busca) return true
    const q = busca.toLowerCase()
    const fNomes = (r.filial_ids || []).map(filialNome).join(' ')
    const mNomes = (r.modulos || []).map(moduloLabel).join(' ')
    return (r.descricao || '').toLowerCase().includes(q) ||
      fNomes.toLowerCase().includes(q) ||
      mNomes.toLowerCase().includes(q)
  })

  if (editando) {
    const filiaisOpts = filiais.map(f => ({ value: String(f.id), label: f.nome, sub: f.classificacao === 'unidade' ? 'Unidade' : 'Parceiro' }))

    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Compartilhamento', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Nova Regra de Compartilhamento' : 'Editar Compartilhamento'}
        subtitle="Compartilhe dados de módulos específicos entre filiais da mesma organização"
        onSave={podeGravar ? handleSave : undefined}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(form.id) : undefined}
      >
        {/* Identificação */}
        <FPESection title="Identificação">
          <FPEField label="Descrição (opcional)" style={{ gridColumn:'1/-1' }}>
            <input className="fpe-field" value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Ex: Pipeline compartilhado entre Filial SP e Filial RJ…" />
          </FPEField>
        </FPESection>

        {/* Filiais */}
        <FPESection title="Filiais envolvidas" description="Selecione 2 ou mais filiais que compartilharão os dados entre si." columns={1}>
          {loadingFiliais
            ? <div style={{ fontSize:13, color:'var(--text-muted)' }}>Carregando filiais…</div>
            : filiais.length === 0
              ? <div style={{ fontSize:13, color:'var(--text-muted)', padding:'12px', borderRadius:8, border:'1px dashed var(--border)', textAlign:'center' }}>
                  Nenhuma filial cadastrada. Acesse <strong>Configurações → Parceiros</strong> para cadastrar unidades.
                </div>
              : <>
                  <SearchableMultiSelect
                    options={filiaisOpts}
                    value={form.filial_ids}
                    onChange={ids => set('filial_ids', ids)}
                    placeholder="Selecionar filiais…"
                  />
                  {form.filial_ids.length >= 2 && (
                    <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <ArrowLeftRight size={14} color="var(--accent)" />
                      {form.filial_ids.map((id, i) => (
                        <span key={id}>
                          <span style={{ fontWeight:600, fontSize:12, color:'var(--text)' }}>{filialNome(id)}</span>
                          {i < form.filial_ids.length - 1 && <span style={{ fontSize:11, color:'var(--text-muted)', margin:'0 6px' }}>↔</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {form.filial_ids.length === 1 && (
                    <div style={{ marginTop:6, fontSize:11, color:'#F59E0B' }}>Selecione pelo menos 2 filiais para compartilhar.</div>
                  )}
                </>
          }
        </FPESection>

        {/* Módulos */}
        <FPESection title="O que será compartilhado" description="Selecione os módulos cujos dados ficarão visíveis entre as filiais." columns={1}>
          {GRUPOS_MODULOS.map(grupo => (
            <div key={grupo} style={{ marginBottom:4 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:6 }}>{grupo}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {MODULOS.filter(m => m.grupo === grupo).map(m => (
                  <button key={m.key} type="button"
                    style={form.modulos.includes(m.key) ? CHIP_ON : CHIP_OFF}
                    onClick={() => set('modulos', form.modulos.includes(m.key) ? form.modulos.filter(k => k !== m.key) : [...form.modulos, m.key])}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {form.modulos.length > 0 && (
            <button type="button" onClick={() => set('modulos', [])}
              style={{ alignSelf:'flex-start', fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', marginTop:4 }}>
              Limpar seleção ({form.modulos.length})
            </button>
          )}
        </FPESection>

        {/* Permissão */}
        <FPESection title="Nível de acesso" columns={1}>
          <FPEField label="O que os usuários das filiais poderão fazer" required>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {PERMISSAO_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:8, border:`2px solid ${form.permissao === opt.value ? 'var(--accent)' : 'var(--border)'}`, background: form.permissao === opt.value ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'var(--surface)' }}>
                  <input type="radio" name="permissao" value={opt.value} checked={form.permissao === opt.value}
                    onChange={() => set('permissao', opt.value)} style={{ marginTop:2, accentColor:'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </FPEField>
        </FPESection>

        {/* Quem pode ver */}
        <FPESection title="Quem tem acesso ao compartilhamento" columns={1}>
          <FPEField label="Restringir visibilidade" required>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {ACESSO_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:8, border:`2px solid ${form.acesso === opt.value ? 'var(--accent)' : 'var(--border)'}`, background: form.acesso === opt.value ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'var(--surface)' }}>
                  <input type="radio" name="acesso" value={opt.value} checked={form.acesso === opt.value}
                    onChange={() => set('acesso', opt.value)} style={{ marginTop:2, accentColor:'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </FPEField>

          {form.acesso === 'perfis' && (
            <FPEField label="Perfis com acesso" required>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, paddingTop:4 }}>
                {perfisRoles.map(p => (
                  <button key={p.id} type="button"
                    style={form.perfil_ids.includes(p.id)
                      ? { ...CHIP_ON, borderLeft:`3px solid ${p.cor || 'var(--accent)'}` }
                      : CHIP_OFF}
                    onClick={() => set('perfil_ids', form.perfil_ids.includes(p.id) ? form.perfil_ids.filter(x => x !== p.id) : [...form.perfil_ids, p.id])}>
                    {p.nome}
                  </button>
                ))}
              </div>
            </FPEField>
          )}

          {form.acesso === 'usuarios' && (
            <FPEField label="Usuários com acesso" required>
              <SearchableMultiSelect
                options={usuariosAtivos.map(u => ({ value: u.id, label: u.nome, sub: u.papel }))}
                value={form.usuario_ids}
                onChange={ids => set('usuario_ids', ids)}
                placeholder="Selecionar usuários…"
              />
            </FPEField>
          )}
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <SettingsLayout
      title="Compartilhamento entre Filiais"
      description="Defina quais dados são compartilhados entre as filiais da organização."
      columns={[
        { key: 'filial_ids', label: 'Filiais', render: v => (
          <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
            {(v || []).map((id, i) => (
              <span key={id}>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{filialNome(id)}</span>
                {i < v.length - 1 && <span style={{ fontSize:10, color:'var(--text-muted)', margin:'0 4px' }}>↔</span>}
              </span>
            ))}
          </div>
        )},
        { key: 'modulos', label: 'Módulos compartilhados', render: v => (
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{(v || []).map(moduloLabel).join(', ') || '—'}</span>
        )},
        { key: 'permissao', label: 'Acesso', width:140, render: v => (
          <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4,
            background: v === 'leitura_escrita' ? '#FEF3C7' : 'var(--surface2)',
            color:      v === 'leitura_escrita' ? '#B45309'  : 'var(--text-muted)' }}>
            {v === 'leitura_escrita' ? 'Leitura + Escrita' : 'Somente leitura'}
          </span>
        )},
        { key: 'descricao', label: 'Descrição', priority:2, render: v => (
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{v || '—'}</span>
        )},
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
