import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { MOCK_PERFIS, PAPEIS_CONFIG, PAPEIS_OPTIONS, STATUS_CONFIG, SESSOES_MOCK } from '../../data/mockPerfis'
import { MOCK_EMPRESAS } from '../../data/mockEmpresas'
import { PERFIS_NATIVOS_SEED } from '../Perfis'

const ACCENT = '#6366F1'

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
                      <span style={{ fontSize: 14 }}>{cfg.icon}</span>
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
            <button type="button" style={ov.cancelBtn} onClick={onClose}>Cancelar</button>
            <button type="submit" style={ov.saveBtn}>Enviar convite</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal de edição de perfil ────────────────────────────────────────────────
function EditarModal({ perfil, onClose, onSave, onDelete, sessao }) {
  const [form, setForm] = useState({
    nome:               perfil.nome,
    papel:              perfil.papel,
    status:             perfil.status,
    empresa_id:         perfil.empresa_id || '',
    perfis_acesso_ids:  perfil.perfis_acesso_ids || [],
  })
  const [confirmDel, setConfirmDel]     = useState(false)
  const [perfilSearch, setPerfilSearch] = useState('')
  const [perfilOpen, setPerfilOpen]     = useState(false)
  const perfilRef                       = useRef(null)
  const [rolesStore]  = useLocalState('perfis:roles', PERFIS_NATIVOS_SEED)
  const [permsStore]  = useLocalState('perfis:permissions', {})

  useEffect(() => {
    if (!perfilOpen) return
    function h(e) { if (perfilRef.current && !perfilRef.current.contains(e.target)) { setPerfilOpen(false); setPerfilSearch('') } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [perfilOpen])

  // Permissões efetivas = union de todos os perfis atribuídos
  const permissoesEfetivas = useMemo(() => {
    const result = {}
    ;(form.perfis_acesso_ids || []).forEach(pid => {
      const p = permsStore[pid] || {}
      Object.entries(p).forEach(([mod, acoes]) => {
        if (!result[mod]) result[mod] = {}
        Object.entries(acoes).forEach(([acao, val]) => {
          if (val) result[mod][acao] = true
        })
      })
    })
    return result
  }, [form.perfis_acesso_ids, permsStore])

  function togglePerfilAcesso(id) {
    setForm(f => {
      const ids = f.perfis_acesso_ids || []
      return { ...f, perfis_acesso_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] }
    })
  }

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  const papeisDisp = papeisCadastravelPor(sessao)
  const podeEditar = sessao.papel === 'admin_isv' ||
    (sessao.papel === 'admin_franquia' && perfil.empresa_id === sessao.empresa_id)
  const podeExcluir = sessao.papel === 'admin_isv' && perfil.id !== sessao.id

  const papelSelecionado = PAPEIS_OPTIONS.find(p => p.value === form.papel)
  const precisaEmpresa   = papelSelecionado?.tipo === 'externo'

  function handleSave(e) {
    e.preventDefault()
    onSave({
      ...perfil,
      nome:              form.nome.trim(),
      papel:             form.papel,
      tipo_usuario:      papelSelecionado?.tipo || perfil.tipo_usuario,
      empresa_id:        precisaEmpresa ? (Number(form.empresa_id) || null) : null,
      status:            form.status,
      perfis_acesso_ids: form.perfis_acesso_ids,
    })
    onClose()
  }

  return (
    <div style={ov.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={ov.modal}>

        {/* Header */}
        <div style={ov.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar perfil={perfil} size={40} />
            <div>
              <div style={ov.title}>{perfil.nome}</div>
              <div style={ov.subtitle}>{perfil.email}</div>
            </div>
          </div>
          <button style={ov.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          <div style={ov.body}>

            <Field label="Nome completo">
              <input style={inp.base} value={form.nome} disabled={!podeEditar}
                onChange={e => set('nome', e.target.value)} />
            </Field>

            {/* Papel */}
            {podeEditar && (
              <Field label="Papel">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {papeisDisp.map(p => {
                    const cfg = PAPEIS_CONFIG[p.value]
                    const ativo = form.papel === p.value
                    return (
                      <button key={p.value} type="button" onClick={() => set('papel', p.value)}
                        style={{
                          padding: '7px 13px', borderRadius: 8, cursor: 'pointer',
                          fontFamily: 'var(--font)', fontSize: 12, fontWeight: ativo ? 700 : 500,
                          border: `1.5px solid ${ativo ? cfg.color : 'var(--border)'}`,
                          background: ativo ? cfg.bg : 'none',
                          color: ativo ? cfg.text : 'var(--text-soft)',
                          transition: 'all 0.15s',
                        }}>
                        {cfg.icon} {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
            )}

            {!podeEditar && (
              <Field label="Papel">
                <PapelBadge papel={perfil.papel} />
              </Field>
            )}

            {/* Empresa */}
            {precisaEmpresa && (
              <Field label="Empresa">
                {sessao.papel === 'admin_isv' ? (
                  <select style={inp.base} value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}>
                    <option value="">— Nenhuma —</option>
                    {MOCK_EMPRESAS.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fantasia || emp.razao}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {MOCK_EMPRESAS.find(e => e.id === perfil.empresa_id)?.fantasia || '—'}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(fixo)</span>
                  </div>
                )}
              </Field>
            )}

            {/* Status */}
            {podeEditar && (
              <Field label="Status">
                <div style={{ display: 'flex', gap: 8 }}>
                  {['ativo', 'inativo'].map(s => {
                    const cfg = STATUS_CONFIG[s]
                    const ativo = form.status === s
                    return (
                      <button key={s} type="button" onClick={() => set('status', s)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                          fontFamily: 'var(--font)', fontSize: 12, fontWeight: ativo ? 700 : 500,
                          border: `1.5px solid ${ativo ? cfg.color : 'var(--border)'}`,
                          background: ativo ? cfg.bg : 'none',
                          color: ativo ? cfg.text : 'var(--text-soft)',
                          transition: 'all 0.15s',
                        }}>
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
            )}

            {/* Perfis de Acesso */}
            <Field label="Perfis de Acesso">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* Chips dos perfis atribuídos */}
                {(form.perfis_acesso_ids || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(form.perfis_acesso_ids || []).map(pid => {
                      const p = rolesStore.find(r => r.id === pid)
                      if (!p) return null
                      return (
                        <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 8px 3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                          background: `${p.cor}18`, color: p.cor,
                          border: `1px solid ${p.cor}44` }}>
                          {p.nome}
                          {podeEditar && (
                            <button type="button" onClick={() => togglePerfilAcesso(pid)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer',
                                color: p.cor, display: 'flex', alignItems: 'center', padding: 0, fontSize: 13 }}>×</button>
                          )}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Busca para adicionar */}
                {podeEditar && (
                  <div ref={perfilRef} style={{ position: 'relative' }}>
                    <input
                      value={perfilSearch}
                      onFocus={() => setPerfilOpen(true)}
                      onChange={e => { setPerfilSearch(e.target.value); setPerfilOpen(true) }}
                      placeholder={(form.perfis_acesso_ids || []).length > 0 ? '+ Adicionar perfil…' : 'Buscar perfil de acesso…'}
                      style={{ ...inp.base, fontSize: 13 }}
                    />
                    {perfilOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                        zIndex: 600, background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                        {rolesStore
                          .filter(r => !perfilSearch || r.nome.toLowerCase().includes(perfilSearch.toLowerCase()))
                          .map(r => {
                            const sel = (form.perfis_acesso_ids || []).includes(r.id)
                            return (
                              <button key={r.id} type="button"
                                onMouseDown={e => { e.preventDefault(); togglePerfilAcesso(r.id); setPerfilSearch('') }}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                                  padding: '8px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                  fontFamily: 'var(--font)', background: sel ? `${r.cor}10` : 'transparent' }}
                                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--surface2)' }}
                                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.cor, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.nome}</div>
                                  {r.desc && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.desc}</div>}
                                </div>
                                {sel && <span style={{ fontSize: 11, color: r.cor, fontWeight: 700 }}>✓</span>}
                              </button>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Permissões efetivas */}
                {(form.perfis_acesso_ids || []).length > 0 && Object.keys(permissoesEfetivas).length > 0 && (
                  <div style={{ marginTop: 4, padding: '10px 12px', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Permissões efetivas (union dos perfis)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(permissoesEfetivas).map(([mod, acoes]) => {
                        const ativos = Object.entries(acoes).filter(([, v]) => v).map(([k]) => k)
                        if (!ativos.length) return null
                        return (
                          <div key={mod} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)',
                              minWidth: 90, paddingTop: 2, textTransform: 'capitalize' }}>{mod}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {ativos.map(a => (
                                <span key={a} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4,
                                  background: 'rgba(99,102,241,0.1)', color: '#6366F1',
                                  fontWeight: 600, fontFamily: 'var(--mono)' }}>{a}</span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {(form.perfis_acesso_ids || []).length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Nenhum perfil atribuído — o usuário terá apenas as permissões do papel.
                  </div>
                )}
              </div>
            </Field>

            {/* Info: datas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '10px 14px',
              background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Criado em</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                  {fmtDate(perfil.criado_em)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Último acesso</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: perfil.ultimo_acesso ? 'var(--text)' : 'var(--text-muted)' }}>
                  {fmtDate(perfil.ultimo_acesso)}
                </div>
              </div>
            </div>

            {/* tenant_id / id (info dev) */}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)',
              padding: '6px 10px', background: 'var(--surface2)', borderRadius: 6,
              border: '1px solid var(--border2)' }}>
              id: <span style={{ color: 'var(--accent)' }}>{perfil.id}</span>
              {' · '}tenant: <span style={{ color: 'var(--accent)' }}>{perfil.tenant_id}</span>
            </div>

          </div>

          <div style={ov.footer}>
            <div style={{ flex: 1 }}>
              {podeExcluir && !confirmDel && (
                <button type="button"
                  style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}
                  onClick={() => setConfirmDel(true)}>
                  Remover usuário
                </button>
              )}
              {confirmDel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Confirmar remoção?</span>
                  <button type="button"
                    style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--red)',
                      border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
                    onClick={() => { onDelete(perfil.id); onClose() }}>
                    Sim, remover
                  </button>
                  <button type="button"
                    style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none',
                      border: 'none', cursor: 'pointer' }}
                    onClick={() => setConfirmDel(false)}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
            <button type="button" style={ov.cancelBtn} onClick={onClose}>Fechar</button>
            {podeEditar && <button type="submit" style={ov.saveBtn}>Salvar</button>}
          </div>
        </form>
      </div>
    </div>
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
  const [perfis, setPerfis]      = useLocalState('settings:perfis_v1', [])
  const [rolesStore]             = useLocalState('perfis:roles', PERFIS_NATIVOS_SEED)
  const sessao                   = SESSOES_MOCK[0]
  const [modalConvite, setModalConvite] = useState(false)
  const [modalImport, setModalImport]   = useState(false)
  const [editando, setEditando]  = useState(null)
  const [busca, setBusca]        = useState('')
  const [filtroPapel, setFiltroPapel]   = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [sortField, setSortField]       = useState('nome')
  const [sortDir, setSortDir]           = useState('asc')

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // Filtro RLS simulado
  const perfisFiltradosSessao = useMemo(() => filtrarPorSessao(perfis, sessao), [perfis, sessao])

  // Filtros de UI + ordenação
  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    const filtered = perfisFiltradosSessao.filter(p =>
      (!q || p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)) &&
      (!filtroPapel  || p.papel === filtroPapel) &&
      (!filtroStatus || p.status === filtroStatus) &&
      (!filtroTipo   || p.tipo_usuario === filtroTipo)
    )
    return [...filtered].sort((a, b) => {
      const av = (a[sortField] || '').toString().toLowerCase()
      const bv = (b[sortField] || '').toString().toLowerCase()
      return sortDir === 'asc' ? av.localeCompare(bv, 'pt') : bv.localeCompare(av, 'pt')
    })
  }, [perfisFiltradosSessao, busca, filtroPapel, filtroStatus, filtroTipo, sortField, sortDir])

  // KPIs
  const total    = perfisFiltradosSessao.length
  const ativos   = perfisFiltradosSessao.filter(p => p.status === 'ativo').length
  const pendentes= perfisFiltradosSessao.filter(p => p.status === 'pendente').length
  const externos = perfisFiltradosSessao.filter(p => p.tipo_usuario === 'externo').length

  function salvarPerfil(novo) {
    setPerfis(prev => {
      const idx = prev.findIndex(p => p.id === novo.id)
      if (idx >= 0) { const a = [...prev]; a[idx] = novo; return a }
      return [...prev, novo]
    })
  }

  function deletarPerfil(id) {
    setPerfis(prev => prev.filter(p => p.id !== id))
  }

  const podeCriar = sessao.papel === 'admin_isv' || sessao.papel === 'admin_franquia'

  return (
    <div style={pg.wrap}>

      {/* ── Header ── */}
      <div style={pg.header}>
        <div>
          <h2 style={pg.title}>Usuários</h2>
          <p style={pg.desc}>Gerencie os usuários com acesso à plataforma e seus níveis de permissão.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={pg.secondaryBtn} onClick={() => exportarCSV(lista)}>
            ↓ Exportar CSV
          </button>
          <button style={pg.secondaryBtn} onClick={() => setModalImport(true)}>
            ↑ Importar
          </button>
          {podeCriar && (
            <button style={pg.primaryBtn} onClick={() => setModalConvite(true)}>
              + Convidar usuário
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={pg.kpiRow}>
        {[
          { label: 'Total',     value: total,    color: 'var(--text)' },
          { label: 'Ativos',    value: ativos,   color: '#10B981' },
          { label: 'Pendentes', value: pendentes, color: '#F59E0B' },
          { label: 'Externos',  value: externos,  color: '#8B5CF6' },
        ].map(k => (
          <div key={k.label} style={pg.kpiCard}>
            <span style={{ ...pg.kpiN, color: k.color }}>{k.value}</span>
            <span style={pg.kpiL}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={pg.toolbar}>
        <input
          style={pg.search}
          placeholder="Buscar por nome ou e-mail…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <select style={pg.select} value={filtroPapel} onChange={e => setFiltroPapel(e.target.value)}>
          <option value="">Todos os papéis</option>
          {PAPEIS_OPTIONS.map(p => <option key={p.value} value={p.value}>{PAPEIS_CONFIG[p.value].label}</option>)}
        </select>
        <select style={pg.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={pg.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Interno / Externo</option>
          <option value="interno">Interno (ISV)</option>
          <option value="externo">Externo (Parceiro)</option>
        </select>
        {(busca || filtroPapel || filtroStatus || filtroTipo) && (
          <button style={pg.clearBtn} onClick={() => { setBusca(''); setFiltroPapel(''); setFiltroStatus(''); setFiltroTipo('') }}>
            ✕ Limpar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
          {lista.length} de {total}
        </span>
      </div>

      {/* ── Tabela ── */}
      <div style={pg.tableWrap}>
        <table style={pg.table}>
          <thead>
            <tr style={pg.thead}>
              {[
                { label: 'Usuário',           field: 'nome' },
                { label: 'E-mail',            field: 'email' },
                { label: 'Empresa',           field: null },
                { label: 'Papel',             field: 'papel' },
                { label: 'Perfis de Acesso',  field: null },
                { label: 'Status',            field: 'status' },
                { label: 'Último acesso',     field: 'ultimo_acesso' },
                { label: '',                  field: null },
              ].map(({ label, field }, i) => (
                <th key={i}
                  onClick={field ? () => toggleSort(field) : undefined}
                  style={{ ...pg.th, textAlign: i === 7 ? 'center' : 'left',
                    cursor: field ? 'pointer' : 'default',
                    userSelect: 'none',
                    color: sortField === field ? 'var(--text)' : 'var(--text-muted)',
                  }}>
                  {label}
                  {field && (
                    <span style={{ marginLeft: 4, opacity: sortField === field ? 1 : 0.3, fontSize: 9 }}>
                      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                  <div style={{ fontSize: 13 }}>Nenhum usuário encontrado</div>
                </td>
              </tr>
            )}
            {lista.map(perfil => {
              const empresa = MOCK_EMPRESAS.find(e => e.id === perfil.empresa_id)
              const ehSessaoAtual = perfil.id === sessao.id
              return (
                <tr key={perfil.id}
                  style={{ borderBottom: '1px solid var(--border2)', cursor: 'pointer',
                    background: ehSessaoAtual ? `${ACCENT}06` : 'transparent' }}
                  onClick={() => setEditando(perfil)}
                  onMouseEnter={e => e.currentTarget.style.background = ehSessaoAtual ? `${ACCENT}10` : 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ehSessaoAtual ? `${ACCENT}06` : 'transparent'}>

                  {/* Usuário */}
                  <td style={pg.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar perfil={perfil} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {perfil.nome}
                          {ehSessaoAtual && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px',
                              background: `${ACCENT}22`, color: ACCENT, borderRadius: 4,
                              fontFamily: 'var(--mono)', border: `1px solid ${ACCENT}44` }}>
                              você
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {perfil.tipo_usuario === 'interno' ? 'ISV' : 'Parceiro'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* E-mail */}
                  <td style={{ ...pg.td, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-soft)' }}>
                    {perfil.email}
                  </td>

                  {/* Empresa */}
                  <td style={pg.td}>
                    {empresa ? (
                      <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{empresa.fantasia || empresa.razao}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ISV</span>
                    )}
                  </td>

                  {/* Papel */}
                  <td style={pg.td}><PapelBadge papel={perfil.papel} /></td>

                  {/* Perfis de Acesso */}
                  <td style={pg.td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(perfil.perfis_acesso_ids || []).length === 0 ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      ) : (perfil.perfis_acesso_ids || []).map(pid => {
                        const r = rolesStore.find(r => r.id === pid)
                        if (!r) return null
                        return (
                          <span key={pid} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px',
                            borderRadius: 99, background: `${r.cor}18`, color: r.cor,
                            border: `1px solid ${r.cor}44`, whiteSpace: 'nowrap' }}>
                            {r.nome}
                          </span>
                        )
                      })}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={pg.td}><StatusBadge status={perfil.status} /></td>

                  {/* Último acesso */}
                  <td style={{ ...pg.td, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                    {fmtDate(perfil.ultimo_acesso)}
                  </td>

                  {/* Ação */}
                  <td style={{ ...pg.td, textAlign: 'center' }}>
                    <button type="button"
                      onClick={e => { e.stopPropagation(); setEditando(perfil) }}
                      style={{ fontSize: 11.5, fontWeight: 600, color: ACCENT, background: 'none',
                        border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px',
                        cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      Editar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modais ── */}
      {modalImport && (
        <ImportModal
          onClose={() => setModalImport(false)}
          onImport={novos => setPerfis(prev => [...prev, ...novos])}
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
      {editando && (
        <EditarModal
          perfil={editando}
          onClose={() => setEditando(null)}
          onSave={salvarPerfil}
          onDelete={deletarPerfil}
          sessao={sessao}
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
