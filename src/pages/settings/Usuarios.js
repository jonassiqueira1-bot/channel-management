import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useUsuarios } from '../../hooks/useUsuarios'
import { PAPEIS_CONFIG, PAPEIS_OPTIONS, STATUS_CONFIG, SESSOES_MOCK } from '../../data/mockPerfis'
import { MOCK_EMPRESAS } from '../../data/mockEmpresas'
import { PERFIS_NATIVOS_SEED } from '../Perfis'
import { MOCK_RULES, RULES_STORAGE_KEY } from '../../data/mockComissoes'
import Button from '../../components/Button'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../../components/ui'
import { useBranches } from '../../hooks/useBranches'

const ACCENT = 'var(--accent)'

function uid() { return 'u_' + Date.now() + Math.floor(Math.random() * 999) }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Badges ──────────────────────────────────────────────────────────────────
function PapelBadge({ papel }) {
  const cfg = PAPEIS_CONFIG[papel] || { label: papel, color: '#6B7280', bg: '#F3F4F6', text: '#374151', icon: '◎' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.text, whiteSpace: 'nowrap', fontFamily: 'var(--mono)',
      border: `1px solid ${cfg.color}33`,
    }}>
      <span style={{ fontSize: 9 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inativo
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.text, whiteSpace: 'nowrap', fontFamily: 'var(--mono)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function Avatar({ perfil, size = 34 }) {
  const cfg = PAPEIS_CONFIG[perfil.papel]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: cfg ? cfg.bg : '#F3F4F6',
      border: `2px solid ${cfg ? cfg.color + '55' : '#E5E7EB'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 800, fontFamily: 'var(--mono)',
      color: cfg ? cfg.text : '#6B7280',
    }}>
      {perfil.avatar || perfil.nome.slice(0, 2).toUpperCase()}
    </div>
  )
}

// ─── Filtros de visibilidade por papel ───────────────────────────────────────
function filtrarPorSessao(perfis, sessao) {
  if (sessao.papel === 'admin_isv') return perfis
  if (sessao.papel === 'admin_franquia') {
    return perfis.filter(p => p.empresa_id === sessao.empresa_id)
  }
  // vendedor / outros: apenas o próprio perfil
  return perfis.filter(p => p.id === sessao.id)
}

function papeisCadastravelPor(sessao) {
  if (sessao.papel === 'admin_isv') return PAPEIS_OPTIONS
  if (sessao.papel === 'admin_franquia') {
    return PAPEIS_OPTIONS.filter(p => p.value === 'vendedor' || p.value === 'admin_franquia')
  }
  return []
}

// ─── Modal de Convite ─────────────────────────────────────────────────────────
function ConviteModal({ onClose, onSave, sessao, perfisExistentes }) {
  const papeisDisp = papeisCadastravelPor(sessao)
  const [form, setForm] = useState({
    nome: '',
    email: '',
    papel: papeisDisp[0]?.value || 'vendedor',
    empresa_id: sessao.papel === 'admin_franquia' ? sessao.empresa_id : '',
    status: 'pendente',
  })
  const [erros, setErros] = useState({})

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); setErros(e => ({ ...e, [f]: null })) }

  const empresasDisponiveis = useMemo(() => {
    if (sessao.papel === 'admin_franquia') return MOCK_EMPRESAS.filter(e => e.id === sessao.empresa_id)
    return MOCK_EMPRESAS.filter(e => e.status === 'ativo' || e.status === 'negociacao')
  }, [sessao])

  const papelSelecionado = PAPEIS_OPTIONS.find(p => p.value === form.papel)
  const precisaEmpresa   = papelSelecionado?.tipo === 'externo'

  function validar() {
    const e = {}
    if (!form.nome.trim())  e.nome  = 'Nome obrigatório'
    if (!form.email.trim()) e.email = 'E-mail obrigatório'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
    if (perfisExistentes.some(p => p.email.toLowerCase() === form.email.toLowerCase()))
      e.email = 'Este e-mail já está cadastrado'
    if (precisaEmpresa && !form.empresa_id) e.empresa_id = 'Selecione a empresa'
    setErros(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validar()) return
    onSave({
      id:           uid(),
      nome:         form.nome.trim(),
      email:        form.email.trim().toLowerCase(),
      avatar:       form.nome.trim().split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase(),
      tipo_usuario: papelSelecionado?.tipo || 'externo',
      papel:        form.papel,
      empresa_id:   precisaEmpresa ? Number(form.empresa_id) : null,
      tenant_id:    sessao.tenant_id,
      status:       'pendente',
      criado_em:    new Date().toISOString(),
      ultimo_acesso: null,
    })
    onClose()
  }

  const empresaSelecionada = MOCK_EMPRESAS.find(e => e.id === Number(form.empresa_id))

  return (
    <div style={ov.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={ov.modal}>

        {/* Header */}
        <div style={ov.header}>
          <div>
            <div style={ov.title}>Convidar usuário</div>
            <div style={ov.subtitle}>
              {sessao.papel === 'admin_franquia'
                ? `Convidando para: ${sessao.empresa_nome}`
                : 'Novo acesso ao tenant'}
            </div>
          </div>
          <button style={ov.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Aviso de sessão restrita */}
        {sessao.papel === 'admin_franquia' && (
          <div style={ov.infoBox}>
            <span style={{ fontSize: 13, marginRight: 6 }}>🔒</span>
            <span style={{ fontSize: 12, color: '#92400E' }}>
              Você está logado como <strong>Admin Franquia</strong> da {sessao.empresa_nome}.
              Só é possível convidar usuários para esta empresa.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={ov.body}>

            {/* Nome + E-mail */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Nome completo *" error={erros.nome}>
                <input style={{ ...inp.base, ...(erros.nome ? inp.err : {}) }}
                  placeholder="Ex: Ana Silva" value={form.nome}
                  onChange={e => set('nome', e.target.value)} autoFocus />
              </Field>
              <Field label="E-mail *" error={erros.email}>
                <input style={{ ...inp.base, ...(erros.email ? inp.err : {}) }}
                  type="email" placeholder="usuario@empresa.com" value={form.email}
                  onChange={e => set('email', e.target.value)} />
              </Field>
            </div>

            {/* Papel */}
            <Field label="Papel / Nível de acesso *">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {papeisDisp.map(p => {
                  const cfg = PAPEIS_CONFIG[p.value]
                  const ativo = form.papel === p.value
                  return (
                    <button key={p.value} type="button"
                      onClick={() => set('papel', p.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                        fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                        border: `1.5px solid ${ativo ? cfg.color : 'var(--border)'}`,
                        background: ativo ? cfg.bg : 'none',
                        color: ativo ? cfg.text : 'var(--text-soft)',
                        boxShadow: ativo ? `0 0 0 3px ${cfg.color}22` : 'none',
                        transition: 'all 0.15s',
                      }}>
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
              {/* Descrição do papel */}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                {form.papel === 'admin_isv'      && '★ Acesso total ao tenant: gerencia usuários, configurações e todos os dados.'}
                {form.papel === 'gestor_canais'  && '◈ Gerencia canais, oportunidades e campanhas do tenant.'}
                {form.papel === 'admin_franquia' && '⬡ Administra usuários e dados da própria franquia/empresa.'}
                {form.papel === 'vendedor'       && '◉ Acesso operacional: pipeline, tarefas e oportunidades vinculadas.'}
              </div>
            </Field>

            {/* Empresa — apenas para papéis externos */}
            {precisaEmpresa && (
              <Field label="Empresa *" error={erros.empresa_id}>
                {sessao.papel === 'admin_franquia' ? (
                  /* Travado: admin_franquia só pode vincular à própria empresa */
                  <div style={{ ...inp.base, display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--surface2)', color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                    <span style={{ fontSize: 13 }}>🔒</span>
                    <span style={{ fontWeight: 600 }}>{sessao.empresa_nome}</span>
                    <span style={{ fontSize: 11, marginLeft: 4 }}>(fixo pelo perfil)</span>
                  </div>
                ) : (
                  <select style={{ ...inp.base, ...(erros.empresa_id ? inp.err : {}) }}
                    value={form.empresa_id}
                    onChange={e => set('empresa_id', e.target.value)}>
                    <option value="">— Selecione a empresa —</option>
                    {empresasDisponiveis.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fantasia || emp.razao}</option>
                    ))}
                  </select>
                )}
                {empresaSelecionada && sessao.papel === 'admin_isv' && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                    {empresaSelecionada.cnpj} · {empresaSelecionada.cidade}/{empresaSelecionada.uf}
                  </div>
                )}
              </Field>
            )}

            {/* Nota: convite por e-mail */}
            <div style={{ padding: '10px 14px', background: '#EEF2FF', borderRadius: 8,
              border: '1px solid #C7D2FE', fontSize: 12, color: '#3730A3', lineHeight: 1.5 }}>
              📧 Um e-mail de convite será enviado para <strong>{form.email || 'o endereço informado'}</strong>.
              O usuário ficará com status <strong>Pendente</strong> até aceitar o convite.
            </div>

          </div>

          <div style={ov.footer}>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Enviar convite</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal de edição de perfil ────────────────────────────────────────────────
// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)}
      style={{ width:40, height:22, borderRadius:99, padding:0, flexShrink:0,
        background: checked ? 'var(--accent)' : 'var(--border)',
        border:'none', cursor: disabled ? 'default' : 'pointer', position:'relative', transition:'background 0.2s' }}>
      <span style={{ position:'absolute', top:3, left: checked ? 21 : 3,
        width:16, height:16, borderRadius:'50%', background:'#fff',
        transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }} />
    </button>
  )
}

// ─── SearchableMultiSelect ────────────────────────────────────────────────────
function SearchableMultiSelect({ options, value = [], onChange, placeholder = 'Selecionar…', disabled = false }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.desc || '').toLowerCase().includes(search.toLowerCase())
  )

  function toggle(v) {
    if (disabled) return
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  const selectedLabels = value.map(v => options.find(o => o.value === v)?.label).filter(Boolean)

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          minHeight: 36, padding: '6px 32px 6px 10px', border: '1px solid var(--border)',
          borderRadius: 7, background: disabled ? 'var(--surface2)' : 'var(--surface)',
          cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative',
          display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
          boxSizing: 'border-box', width: '100%',
        }}
      >
        {selectedLabels.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{placeholder}</span>
        )}
        {selectedLabels.map(label => (
          <span key={label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 20, background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          }}>{label}</span>
        ))}
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, color: 'var(--text-muted)', pointerEvents: 'none' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          {/* Busca */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
              border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface2)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔍</span>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar…"
                style={{ border: 'none', background: 'none', outline: 'none', fontSize: 12,
                  color: 'var(--text)', fontFamily: 'var(--font)', flex: 1, minWidth: 0 }}
              />
              {search && (
                <button onClick={() => setSearch('')}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0, lineHeight: 1 }}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Nenhum resultado
              </div>
            ) : filtered.map(opt => {
              const sel = value.includes(opt.value)
              return (
                <div key={opt.value} onClick={() => toggle(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    cursor: 'pointer', background: sel ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent',
                    borderBottom: '1px solid var(--border2)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = sel ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent' }}
                >
                  <div style={{
                    width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                    border: sel ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: sel ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && <span style={{ width: 7, height: 7, background: '#fff', borderRadius: 2, display: 'block' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? 'var(--accent)' : 'var(--text)' }}>
                      {opt.label}
                    </div>
                    {opt.desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{opt.desc}</div>}
                  </div>
                  {opt.badge && opt.badge}
                </div>
              )
            })}
          </div>

          {/* Rodapé com contagem */}
          {value.length > 0 && (
            <div style={{ padding: '7px 12px', borderTop: '1px solid var(--border2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{value.length} selecionado{value.length > 1 ? 's' : ''}</span>
              <button onClick={() => onChange([])}
                style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ChoiceList ───────────────────────────────────────────────────────────────
// multi=false → radio (seleciona um); multi=true → checkbox (múltipla seleção)
function ChoiceList({ options, value, onChange, multi = false, disabled = false }) {
  // value: string (radio) | string[] (multi)
  function isSelected(v) {
    return multi ? (value || []).includes(v) : value === v
  }
  function toggle(v) {
    if (disabled) return
    if (multi) {
      const cur = value || []
      onChange(cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v])
    } else {
      onChange(v)
    }
  }
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
      {options.map((opt, i) => {
        const sel = isSelected(opt.value)
        return (
          <div key={opt.value}
            onClick={() => toggle(opt.value)}
            style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'11px 14px',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              background: sel ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--surface)',
              cursor: disabled ? 'default' : 'pointer',
              transition:'background 0.12s',
            }}
            onMouseEnter={e => { if (!disabled && !sel) e.currentTarget.style.background = 'var(--surface2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = sel ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--surface)' }}
          >
            {/* Indicador radio/checkbox */}
            <div style={{
              width:16, height:16, borderRadius: multi ? 4 : '50%', flexShrink:0,
              border: sel ? '2px solid var(--accent)' : '2px solid var(--border)',
              background: sel ? 'var(--accent)' : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.12s',
            }}>
              {sel && <span style={{ width: multi ? 8 : 6, height: multi ? 8 : 6,
                background:'#fff', borderRadius: multi ? 2 : '50%', display:'block' }} />}
            </div>
            {/* Conteúdo */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight: sel ? 600 : 500, color: sel ? 'var(--accent)' : 'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
                {opt.icon && <span>{opt.icon}</span>}
                {opt.label}
                {opt.badge && opt.badge}
              </div>
              {opt.desc && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{opt.desc}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Editar usuário (página inteira) ─────────────────────────────────────────
function EditarUsuario({ perfil, onClose, onSave, onDelete, sessao }) {
  const [form, setForm] = useState({
    nome:                perfil.nome,
    papel:               perfil.papel,
    status:              perfil.status,
    perfis_acesso_ids:   perfil.perfis_acesso_ids || [],
    branch_ids:          perfil.branch_ids || [],
    franquia_id:         perfil.franquia_id || null,
    regras_comissao_ids: perfil.regras_comissao_ids || [],
    // Perfil de recurso (PSA)
    cargo:               perfil.cargo || '',
    senioridade:         perfil.senioridade || '',
    tipo_recurso:        perfil.tipo_recurso || 'interno',
    billing_rate:        perfil.billing_rate ?? '',
    custo_hora:          perfil.custo_hora ?? '',
    horas_semana:        perfil.horas_semana ?? 40,
    habilidades:         perfil.habilidades || [],
    linkedin_url:        perfil.linkedin_url || '',
    whatsapp:            perfil.whatsapp || '',
  })
  const [novaHabilidade, setNovaHabilidade] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const [rolesStore]   = useLocalState('perfis:roles', PERFIS_NATIVOS_SEED)
  const [regrasComiss] = useLocalState(RULES_STORAGE_KEY, MOCK_RULES)
  const [franquias]    = useLocalState('settings:franquias_v2', [])
  const { branches }  = useBranches()

  const isAdminFranquia = form.papel === 'admin_franquia'

  // Para não-admin: resolve a franquia a partir das unidades selecionadas
  const franquiasDerived = isAdminFranquia ? [] : (() => {
    const ids = new Set(
      (form.branch_ids || [])
        .map(bid => { const b = branches.find(x => x.id === bid); return b?.custom_fields?.franquia_id })
        .filter(Boolean)
    )
    return franquias.filter(f => ids.has(String(f.id)))
  })()

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }
  function toggleBranch(id) {
    setForm(f => {
      const ids = f.branch_ids || []
      return { ...f, branch_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] }
    })
  }
  function togglePerfil(id) {
    setForm(f => {
      const ids = f.perfis_acesso_ids || []
      return { ...f, perfis_acesso_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] }
    })
  }

  const papeisDisp  = papeisCadastravelPor(sessao)
  const podeEditar  = sessao.papel === 'admin_isv' || (sessao.papel === 'admin_franquia' && perfil.empresa_id === sessao.empresa_id)
  const podeExcluir = sessao.papel === 'admin_isv' && perfil.id !== sessao.id && !perfil.is_owner
  const papelSel    = PAPEIS_OPTIONS.find(p => p.value === form.papel)

  function handleSave() {
    onSave({
      ...perfil,
      nome:                form.nome.trim(),
      papel:               form.papel,
      tipo_usuario:        papelSel?.tipo || perfil.tipo_usuario,
      status:              form.status,
      perfis_acesso_ids:   form.perfis_acesso_ids,
      branch_ids:          form.branch_ids,
      franquia_id:         isAdminFranquia ? form.franquia_id : null,
      regras_comissao_ids: form.regras_comissao_ids,
      cargo:               form.cargo.trim(),
      senioridade:         form.senioridade,
      tipo_recurso:        form.tipo_recurso,
      billing_rate:        form.billing_rate === '' ? null : Number(form.billing_rate),
      custo_hora:          form.custo_hora === '' ? null : Number(form.custo_hora),
      horas_semana:        Number(form.horas_semana) || 40,
      habilidades:         form.habilidades,
      linkedin_url:        form.linkedin_url.trim(),
      whatsapp:            form.whatsapp.trim(),
    })
    onClose()
  }

  const ROW = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border)' }
  const LABEL = { fontSize:13, fontWeight:600, color:'var(--text)' }
  const DESC  = { fontSize:11, color:'var(--text-muted)', marginTop:2 }

  return (
    <FullPageEdit
      title={perfil.nome}
      subtitle={perfil.email}
      badge={perfil.is_owner ? (
        <span style={{ fontSize:10, fontWeight:700, color:'#fff', background:'var(--accent)', borderRadius:99, padding:'2px 8px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Owner</span>
      ) : undefined}
      onSave={podeEditar ? handleSave : undefined}
      onCancel={onClose}
    >
      {/* Dados básicos */}
      <FPESection title="Dados do Usuário">
        <FPEGrid>
          <FPEField label="Nome completo" style={{ gridColumn:'1/-1' }}>
            <input className="fpe-field" value={form.nome} disabled={!podeEditar} onChange={e => set('nome', e.target.value)} />
          </FPEField>
          <FPEField label="E-mail" style={{ gridColumn:'1/-1' }}>
            <input className="fpe-field" value={perfil.email} disabled style={{ opacity:0.6 }} />
          </FPEField>
        </FPEGrid>

        {/* Info datas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, padding:'10px 14px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', marginTop:8 }}>
          {[['Criado em', fmtDate(perfil.criado_em)], ['Último acesso', fmtDate(perfil.ultimo_acesso)]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text)' }}>{v}</div>
            </div>
          ))}
        </div>
      </FPESection>

      {/* Papel */}
      <FPESection title="Papel">
        <FPEField label="Papel do usuário" style={{ gridColumn:'1/-1' }}>
          <select className="fpe-field" value={form.papel} disabled={!podeEditar}
            onChange={e => set('papel', e.target.value)}>
            {papeisDisp.map(p => {
              const cfg = PAPEIS_CONFIG[p.value]
              return <option key={p.value} value={p.value}>{cfg.label}</option>
            })}
          </select>
        </FPEField>
      </FPESection>

      {/* Status */}
      <FPESection title="Status">
        <FPEField label="Status do usuário" style={{ gridColumn:'1/-1' }}>
          <select className="fpe-field" value={form.status} disabled={!podeEditar}
            onChange={e => set('status', e.target.value)}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </FPEField>
      </FPESection>

      {/* Franquia — direto para admin_franquia, derivado para os demais */}
      {isAdminFranquia ? (
        <FPESection title="Franquia" description="Informe a franquia à qual este administrador está vinculado.">
          <FPEField label="Franquia" style={{ gridColumn:'1/-1' }}>
            <select className="fpe-field" disabled={!podeEditar} value={form.franquia_id || ''}
              onChange={e => set('franquia_id', e.target.value || null)}>
              <option value="">— Nenhuma —</option>
              {franquias.filter(f => f.classificacao !== 'unidade').map(f => (
                <option key={f.id} value={String(f.id)}>{f.codigo ? `[${f.codigo}] ` : ''}{f.nome}</option>
              ))}
            </select>
          </FPEField>
        </FPESection>
      ) : franquiasDerived.length > 0 && (
        <FPESection title="Franquia" description="Derivada automaticamente das unidades selecionadas.">
          <div style={{ gridColumn:'1/-1', display:'flex', flexWrap:'wrap', gap:6 }}>
            {franquiasDerived.map(f => (
              <span key={f.id} style={{ fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:20, background:'var(--accent-lite)', color:'var(--accent)', border:'1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                {f.codigo ? `[${f.codigo}] ` : ''}{f.nome}
              </span>
            ))}
          </div>
        </FPESection>
      )}

      {/* Unidades */}
      <FPESection title="Unidades com acesso" description="O usuário terá acesso aos dados de todas as unidades marcadas." columns={1}>
        {branches.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--text-muted)', fontStyle:'italic' }}>
            Nenhuma unidade cadastrada. Cadastre unidades em Configurações → Minha Empresa.
          </div>
        ) : (
          <SearchableMultiSelect
            options={branches.map(b => {
              const cf = b.custom_fields || {}
              return { value: b.id, label: `${cf.is_matriz ? '★ ' : ''}${b.name}${cf.cidade ? ` — ${cf.cidade}` : ''}` }
            })}
            value={form.branch_ids || []}
            onChange={ids => set('branch_ids', ids)}
            placeholder="Selecionar unidades…"
            disabled={!podeEditar}
          />
        )}
      </FPESection>

      {/* Perfis de acesso */}
      <FPESection title="Perfis de acesso" description="Define as permissões do usuário no sistema. Pode ter mais de um perfil." columns={1}>
        {rolesStore.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--text-muted)', fontStyle:'italic' }}>Nenhum perfil configurado.</div>
        ) : (
          <SearchableMultiSelect
            options={rolesStore.map(r => ({ value: r.id, label: r.nome, desc: r.descricao }))}
            value={form.perfis_acesso_ids || []}
            onChange={ids => set('perfis_acesso_ids', ids)}
            placeholder="Selecionar perfis de acesso…"
            disabled={!podeEditar}
          />
        )}
      </FPESection>

      {/* Regras de comissão */}
      <FPESection title="Regras de comissão" description="Defina quais regras de comissão se aplicam a este usuário." columns={1}>
        {regrasComiss.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--text-muted)', fontStyle:'italic' }}>Nenhuma regra de comissão cadastrada.</div>
        ) : (
          <SearchableMultiSelect
            options={regrasComiss.map(r => ({
              value: r.id,
              label: r.nome,
              desc: r.descricao,
              badge: r.tipos_calculo_arr?.length > 0 ? (
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:4, background:'var(--surface2)', color:'var(--text-muted)', whiteSpace:'nowrap', flexShrink:0 }}>
                  {r.tipos_calculo_arr.join(' · ')}
                </span>
              ) : undefined,
            }))}
            value={form.regras_comissao_ids || []}
            onChange={ids => set('regras_comissao_ids', ids)}
            placeholder="Selecionar regras de comissão…"
            disabled={!podeEditar}
          />
        )}
      </FPESection>

      {/* Perfil de Recurso (PSA) */}
      <FPESection title="Perfil de Recurso" description="Dados de alocação e capacidade usados em propostas e projetos.">
        <FPEGrid>
          <FPEField label="Cargo / Função">
            <input className="fpe-field" value={form.cargo} disabled={!podeEditar}
              placeholder="Ex: Consultor de Implantação"
              onChange={e => set('cargo', e.target.value)} />
          </FPEField>

          <FPEField label="Senioridade">
            <select className="fpe-field" value={form.senioridade} disabled={!podeEditar}
              onChange={e => set('senioridade', e.target.value)}>
              <option value="">— Não informado —</option>
              <option value="junior">Júnior</option>
              <option value="pleno">Pleno</option>
              <option value="senior">Sênior</option>
              <option value="especialista">Especialista</option>
              <option value="gestor">Gestor</option>
            </select>
          </FPEField>

          <FPEField label="Tipo de recurso">
            <select className="fpe-field" value={form.tipo_recurso} disabled={!podeEditar}
              onChange={e => set('tipo_recurso', e.target.value)}>
              <option value="interno">Interno (ISV)</option>
              <option value="canal">Canal / Franquia</option>
              <option value="subcontratado">Subcontratado</option>
            </select>
          </FPEField>

          <FPEField label="Disponibilidade (h/semana)">
            <input className="fpe-field" type="number" min={0} max={168} value={form.horas_semana} disabled={!podeEditar}
              onChange={e => set('horas_semana', e.target.value)} />
          </FPEField>

          <FPEField label="Preço/hora — billing (R$)">
            <input className="fpe-field" type="number" min={0} step={0.01} value={form.billing_rate} disabled={!podeEditar}
              placeholder="0,00"
              onChange={e => set('billing_rate', e.target.value)} />
          </FPEField>

          <FPEField label="Custo/hora (R$)">
            <input className="fpe-field" type="number" min={0} step={0.01} value={form.custo_hora} disabled={!podeEditar}
              placeholder="0,00"
              onChange={e => set('custo_hora', e.target.value)} />
          </FPEField>

          <FPEField label="LinkedIn">
            <input className="fpe-field" value={form.linkedin_url} disabled={!podeEditar}
              placeholder="https://linkedin.com/in/usuario"
              onChange={e => set('linkedin_url', e.target.value)} />
          </FPEField>

          <FPEField label="WhatsApp">
            <input className="fpe-field" value={form.whatsapp} disabled={!podeEditar}
              placeholder="(00) 00000-0000"
              onChange={e => set('whatsapp', e.target.value)} />
          </FPEField>
        </FPEGrid>

        {/* Habilidades */}
        <FPEField label="Habilidades" style={{ gridColumn:'1/-1', marginTop:8 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
            {(form.habilidades || []).map(h => (
              <span key={h} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20, background:'color-mix(in srgb, var(--accent) 10%, transparent)', color:'var(--accent)', border:'1px solid color-mix(in srgb, var(--accent) 25%, transparent)', fontSize:12, fontWeight:600 }}>
                {h}
                {podeEditar && (
                  <button onClick={() => set('habilidades', form.habilidades.filter(x => x !== h))}
                    style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', padding:0, fontSize:13, lineHeight:1, opacity:0.7 }}>×</button>
                )}
              </span>
            ))}
            {(form.habilidades || []).length === 0 && (
              <span style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>Nenhuma habilidade adicionada</span>
            )}
          </div>
          {podeEditar && (
            <div style={{ display:'flex', gap:6 }}>
              <input className="fpe-field" value={novaHabilidade} placeholder="Ex: SAP, SQL, Power BI…"
                style={{ flex:1 }}
                onChange={e => setNovaHabilidade(e.target.value)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && novaHabilidade.trim()) {
                    e.preventDefault()
                    const tag = novaHabilidade.trim()
                    if (!form.habilidades.includes(tag)) set('habilidades', [...form.habilidades, tag])
                    setNovaHabilidade('')
                  }
                }} />
              <button type="button"
                onClick={() => {
                  const tag = novaHabilidade.trim()
                  if (tag && !form.habilidades.includes(tag)) set('habilidades', [...form.habilidades, tag])
                  setNovaHabilidade('')
                }}
                style={{ padding:'7px 14px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:12, cursor:'pointer' }}>
                + Adicionar
              </button>
            </div>
          )}
        </FPEField>
      </FPESection>

      {/* Zona de perigo */}
      {podeExcluir && (
        <FPESection title="Zona de perigo">
          {!confirmDel ? (
            <button type="button" onClick={() => setConfirmDel(true)}
              style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #ef4444', background:'none', color:'#ef4444', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Remover usuário
            </button>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>Confirmar remoção de <strong>{perfil.nome}</strong>?</span>
              <button type="button" onClick={() => { onDelete(perfil.id); onClose() }}
                style={{ padding:'6px 14px', borderRadius:7, border:'none', background:'#ef4444', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                Confirmar
              </button>
              <button type="button" onClick={() => setConfirmDel(false)}
                style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', fontSize:12, cursor:'pointer' }}>
                Cancelar
              </button>
            </div>
          )}
        </FPESection>
      )}
    </FullPageEdit>
  )
}

// ─── Componente auxiliares de form ───────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)',
        textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{error}</span>}
    </div>
  )
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────────
function exportarCSV(lista) {
  const header = ['id', 'nome', 'email', 'papel', 'tipo_usuario', 'empresa_id', 'status', 'criado_em', 'ultimo_acesso']
  const rows = lista.map(p => header.map(k => {
    const v = p[k] ?? ''
    return String(v).includes(',') ? `"${v}"` : v
  }).join(','))
  const csv = [header.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `usuarios_${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function downloadTemplate() {
  const header = 'nome,email,papel,tipo_usuario,empresa_id,status'
  const exemplo = 'João Silva,joao@empresa.com,vendedor,externo,1,ativo'
  const csv = [header, exemplo].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'template_importacao_usuarios.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── Modal de Importação ──────────────────────────────────────────────────────
function ImportModal({ onClose, onImport }) {
  const [linhas, setLinhas] = useState([])
  const [erro, setErro]     = useState('')
  const fileRef             = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const text = ev.target.result
        const [header, ...rows] = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
        const cols = header.split(',').map(c => c.trim())
        const required = ['nome', 'email', 'papel', 'tipo_usuario']
        const missing = required.filter(r => !cols.includes(r))
        if (missing.length) { setErro(`Colunas obrigatórias faltando: ${missing.join(', ')}`); return }
        const parsed = rows.map(row => {
          const vals = row.split(',').map(v => v.replace(/^"|"$/g, '').trim())
          return Object.fromEntries(cols.map((c, i) => [c, vals[i] || '']))
        })
        setLinhas(parsed); setErro('')
      } catch { setErro('Arquivo inválido. Verifique o formato CSV.') }
    }
    reader.readAsText(file)
  }

  function confirmar() {
    onImport(linhas.map(l => ({
      id: 'u_' + Date.now() + Math.random().toString(36).slice(2, 6),
      nome: l.nome, email: l.email, papel: l.papel,
      tipo_usuario: l.tipo_usuario || 'externo',
      empresa_id: l.empresa_id ? Number(l.empresa_id) : null,
      status: l.status || 'pendente',
      avatar: l.nome.slice(0, 2).toUpperCase(),
      tenant_id: 't1', criado_em: new Date().toISOString(), ultimo_acesso: null,
      perfis_acesso_ids: [],
    })))
    onClose()
  }

  const BG = 'rgba(0,0,0,0.5)'
  return (
    <div style={{ position:'fixed', inset:0, background:BG, backdropFilter:'blur(3px)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:600, padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:640,
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)', display:'flex', flexDirection:'column', gap:0, overflow:'hidden' }}>
        {/* Cabeçalho */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Importar Usuários</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            color:'var(--text-muted)', fontSize:18, lineHeight:1 }}>✕</button>
        </div>
        {/* Corpo */}
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
            background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8 }}>
            <span style={{ fontSize:14 }}>📋</span>
            <div style={{ flex:1, fontSize:12, color:'#1E40AF' }}>
              Use o arquivo CSV no formato correto. Baixe o modelo para ver as colunas esperadas.
            </div>
            <button onClick={downloadTemplate}
              style={{ fontSize:11, fontWeight:600, color:'#1E40AF', background:'#DBEAFE',
                border:'1px solid #93C5FD', borderRadius:6, padding:'4px 10px', cursor:'pointer',
                whiteSpace:'nowrap', fontFamily:'var(--font)' }}>
              Baixar modelo
            </button>
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)',
              textTransform:'uppercase', letterSpacing:.4, display:'block', marginBottom:6 }}>
              Arquivo CSV
            </label>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={() => fileRef.current?.click()}
                style={{ fontSize:12, fontWeight:600, color:'var(--text)', background:'var(--surface2)',
                  border:'1px solid var(--border)', borderRadius:7, padding:'7px 14px',
                  cursor:'pointer', fontFamily:'var(--font)' }}>
                Escolher arquivo
              </button>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                {linhas.length > 0 ? `${linhas.length} linha(s) encontrada(s)` : 'Nenhum arquivo selecionado'}
              </span>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleFile} />
            </div>
            {erro && <p style={{ fontSize:11, color:'#DC2626', marginTop:6 }}>{erro}</p>}
          </div>

          {linhas.length > 0 && (
            <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid var(--border)',
              borderRadius:8, fontSize:11, fontFamily:'var(--mono)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--surface2)' }}>
                    {Object.keys(linhas[0]).map(k => (
                      <th key={k} style={{ padding:'6px 10px', textAlign:'left', borderBottom:'1px solid var(--border)',
                        color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', fontSize:9, letterSpacing:.5 }}>
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--border2)' }}>
                      {Object.values(l).map((v, j) => (
                        <td key={j} style={{ padding:'5px 10px', color:'var(--text)' }}>{v || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Rodapé */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)',
          display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose}
            style={{ fontSize:13, color:'var(--text-muted)', background:'none',
              border:'1px solid var(--border)', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontFamily:'var(--font)' }}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={linhas.length === 0}
            style={{ fontSize:13, fontWeight:600, color:'#fff', background: linhas.length === 0 ? '#9CA3AF' : ACCENT,
              border:'none', borderRadius:8, padding:'7px 20px', cursor: linhas.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily:'var(--font)' }}>
            Importar {linhas.length > 0 ? `(${linhas.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsUsuarios() {
  const { usuarios: perfis, save: saveUsuario, remove: removeUsuario } = useUsuarios()
  const { registrar: log } = useAuditLog()
  const sessao                   = SESSOES_MOCK[0]
  const [modalConvite, setModalConvite] = useState(false)
  const [modalImport, setModalImport]   = useState(false)
  const [editando, setEditando]  = useState(null)
  const [busca, setBusca]        = useState('')

  // Filtro RLS simulado
  const perfisFiltradosSessao = useMemo(() => filtrarPorSessao(perfis, sessao), [perfis, sessao])

  const lista = perfisFiltradosSessao

  function salvarPerfil(novo) {
    const isNew = !perfis.find(p => p.id === novo.id)
    saveUsuario(novo)
    log(isNew ? 'criar' : 'editar', 'usuario', novo.id, { descricao: `Usuário ${isNew ? 'criado' : 'editado'}: ${novo.nome || novo.email || ''}` })
  }

  function deletarPerfil(id) {
    const p = perfis.find(x => x.id === id)
    removeUsuario(id)
    log('excluir', 'usuario', id, { descricao: `Usuário excluído: ${p?.nome || p?.email || id}` })
  }

  const podeCriar = sessao.papel === 'admin_isv' || sessao.papel === 'admin_franquia'

  if (editando) {
    return (
      <EditarUsuario
        perfil={editando}
        onClose={() => setEditando(null)}
        onSave={salvarPerfil}
        onDelete={deletarPerfil}
        sessao={sessao}
      />
    )
  }

  return (
    <div style={pg.wrap}>


      {/* ── Tabela ── */}
      <SettingsLayout
        title="Usuários"
        description="Gerencie os usuários com acesso à plataforma e seus níveis de permissão."
        columns={[
          { key: 'nome', label: 'Usuário', render: (v, row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar perfil={row} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {row.nome}
                  {row.id === sessao.id && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px',
                      background: `${ACCENT}22`, color: ACCENT, borderRadius: 4,
                      fontFamily: 'var(--mono)', border: `1px solid ${ACCENT}44` }}>
                      você
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#71717A' }}>{row.tipo_usuario === 'interno' ? 'ISV' : 'Parceiro'}</div>
              </div>
            </div>
          )},
          { key: 'email', label: 'E-mail', priority: 2, muted: true },
          { key: 'papel', label: 'Papel', render: (v) => <PapelBadge papel={v} /> },
          { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
          { key: 'ultimo_acesso', label: 'Último acesso', priority: 3, muted: true, render: (v) => fmtDate(v) },
        ]}
        data={lista}
        keyField="id"
        onNew={podeCriar ? () => setModalConvite(true) : undefined}
        newLabel="+ Convidar usuário"
        rowActions={[
          { label: 'Editar', onClick: row => setEditando(row) },
        ]}
        emptyLabel="Nenhum usuário encontrado"
        search={busca}
        onSearchChange={setBusca}
        onExportCsv={() => exportarCSV(lista)}
        onImport={() => setModalImport(true)}
      />

      {/* ── Modais ── */}
      {modalImport && (
        <ImportModal
          onClose={() => setModalImport(false)}
          onImport={novos => novos.forEach(u => saveUsuario(u))}
        />
      )}
      {modalConvite && (
        <ConviteModal
          onClose={() => setModalConvite(false)}
          onSave={salvarPerfil}
          sessao={sessao}
          perfisExistentes={perfis}
        />
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const pg = {
  wrap: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  header: {
    padding: '24px 32px 16px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0,
  },
  title: { fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.3px' },
  desc:  { fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' },
  primaryBtn: {
    padding: '8px 16px', background: ACCENT, color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0,
  },
  secondaryBtn: {
    padding: '7px 14px', background: 'var(--surface)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0,
  },
  kpiRow: {
    display: 'flex', gap: 12, padding: '12px 32px', borderBottom: '1px solid var(--border2)', flexShrink: 0,
  },
  kpiCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '8px 20px', background: 'var(--surface2)',
    border: '1px solid var(--border2)', borderRadius: 8, gap: 2, minWidth: 80,
  },
  kpiN: { fontSize: 20, fontWeight: 700, lineHeight: 1 },
  kpiL: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 32px',
    borderBottom: '1px solid var(--border2)', flexShrink: 0,
  },
  search: {
    padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 7,
    fontSize: 13, background: 'var(--surface)', color: 'var(--text)', width: 240,
    fontFamily: 'var(--font)', outline: 'none',
  },
  select: {
    padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7,
    fontSize: 12, background: 'var(--surface)', color: 'var(--text)',
    fontFamily: 'var(--font)', cursor: 'pointer',
  },
  clearBtn: {
    padding: '6px 12px', background: 'none', border: '1px solid var(--border)',
    borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)',
  },
  tableWrap: { flex: 1, overflowY: 'auto', padding: '0 32px 24px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 4 },
  thead: { background: 'var(--surface2)', position: 'sticky', top: 0, zIndex: 1 },
  th: {
    padding: '9px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
    fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
  },
  td: { padding: '10px 12px', verticalAlign: 'middle' },
}

const ov = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20,
  },
  modal: {
    background: 'var(--surface)', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
    width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column',
    maxHeight: '90vh', overflow: 'hidden',
  },
  header: {
    padding: '18px 24px 14px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
  },
  title:    { fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 },
  subtitle: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--mono)' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: 16, padding: '4px 8px', borderRadius: 6,
  },
  body: {
    padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
  },
  footer: {
    padding: '12px 24px 16px', borderTop: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
  },
  infoBox: {
    margin: '0 24px', padding: '10px 14px',
    background: '#FEF3C7', border: '1px solid #F59E0B55', borderRadius: 8,
    display: 'flex', alignItems: 'flex-start', gap: 4,
  },
  cancelBtn: {
    padding: '8px 18px', background: 'none', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)',
  },
  saveBtn: {
    padding: '8px 20px', background: ACCENT, color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
  },
}

const inp = {
  base: {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7,
    fontSize: 13, background: 'var(--surface)', color: 'var(--text)',
    fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
  },
  err: { borderColor: 'var(--red)', background: '#FFF5F5' },
}
