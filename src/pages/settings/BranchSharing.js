import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../hooks/useProfile'

const ENTITIES = [
  { key: 'companies',    label: 'Empresas' },
  { key: 'contacts',     label: 'Contatos' },
  { key: 'opportunities',label: 'Oportunidades' },
  { key: 'contracts',    label: 'Contratos' },
  { key: 'payments',     label: 'Pagamentos' },
  { key: 'projects',     label: 'Projetos' },
  { key: 'actions',      label: 'Ações' },
  { key: 'tasks',        label: 'Tarefas' },
  { key: 'sellers',      label: 'Vendedores' },
]

const s = {
  page:    { padding: '28px 32px', maxWidth: 900, margin: '0 auto', fontFamily: 'var(--font)' },
  title:   { fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.3px' },
  sub:     { fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 },
  card:    { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 },
  cardTitle:{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 },
  label:   { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' },
  select:  { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', width: '100%' },
  grid2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:      { textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' },
  td:      { padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle' },
  chip:    (active) => ({ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'var(--font)', background: active ? '#6366F120' : 'var(--surface2)', color: active ? '#6366F1' : 'var(--text-muted)' }),
  btn:     { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', background: '#6366F1', color: '#fff' },
  btnGhost:{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)', background: 'var(--surface2)', color: 'var(--text-muted)' },
  msg:     (type) => ({ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, background: type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: type === 'error' ? '#EF4444' : '#10B981' }),
}

export default function BranchSharing() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [branches,    setBranches]    = useState([])
  const [visibility,  setVisibility]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState(null)

  // Form novo vínculo
  const [srcBranch,  setSrcBranch]  = useState('')
  const [tgtBranch,  setTgtBranch]  = useState('')
  const [entities,   setEntities]   = useState([])
  const [canEdit,    setCanEdit]    = useState(false)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    setLoading(true)
    const [b, v] = await Promise.all([
      supabase.from('tenant_branches').select('id, name').order('name'),
      supabase.from('branch_table_visibility').select('*'),
    ])
    setBranches(b.data || [])
    setVisibility(v.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (session?.user) load() }, [load, session])

  function toggleEntity(key) {
    setEntities(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function handleSave() {
    if (!srcBranch || !tgtBranch || entities.length === 0) {
      setMsg({ type: 'error', text: 'Selecione a filial de origem, destino e pelo menos uma entidade.' })
      return
    }
    if (srcBranch === tgtBranch) { setMsg({ type: 'error', text: 'Origem e destino não podem ser iguais.' }); return }
    setSaving(true); setMsg(null)

    const rows = entities.map(entity_table => ({
      tenant_id:        tenantId,
      source_branch_id: srcBranch,
      target_branch_id: tgtBranch,
      entity_table,
      can_view:  true,
      can_edit:  canEdit,
    }))

    const { error } = await supabase
      .from('branch_table_visibility')
      .upsert(rows, { onConflict: 'tenant_id,source_branch_id,target_branch_id,entity_table' })

    if (error) { setMsg({ type: 'error', text: error.message }); setSaving(false); return }
    setMsg({ type: 'success', text: 'Compartilhamento salvo com sucesso.' })
    setSaving(false)
    setEntities([])
    load()
  }

  async function handleRemove(id) {
    if (!window.confirm('Remover este compartilhamento?')) return
    await supabase.from('branch_table_visibility').delete().eq('id', id)
    load()
  }

  const branchName = (id) => branches.find(b => b.id === id)?.name || id?.slice(0, 8)

  if (!session?.user) return <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Faça login para acessar esta configuração.</div>

  return (
    <div style={s.page}>
      <h2 style={s.title}>Compartilhamento entre Filiais</h2>
      <p style={s.sub}>Defina quais filiais podem ver os registros de outras filiais, por entidade.</p>

      {loading ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div> : (
        <>
          {/* ── Novo compartilhamento ── */}
          <div style={s.card}>
            <div style={s.cardTitle}>Novo Compartilhamento</div>
            {msg && <div style={s.msg(msg.type)}>{msg.text}</div>}

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Filial de origem (quem compartilha)</label>
                <select style={s.select} value={srcBranch} onChange={e => setSrcBranch(e.target.value)}>
                  <option value="">Selecione…</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Filial de destino (quem vai ver)</label>
                <select style={s.select} value={tgtBranch} onChange={e => setTgtBranch(e.target.value)}>
                  <option value="">Selecione…</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Entidades visíveis</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ENTITIES.map(e => (
                  <button key={e.key} style={s.chip(entities.includes(e.key))} onClick={() => toggleEntity(e.key)}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <input type="checkbox" id="canEdit" checked={canEdit} onChange={e => setCanEdit(e.target.checked)} />
              <label htmlFor="canEdit" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                Permitir edição (além de visualização)
              </label>
            </div>

            <button style={s.btn} onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar compartilhamento'}
            </button>
          </div>

          {/* ── Compartilhamentos existentes ── */}
          {visibility.length > 0 && (
            <div style={s.card}>
              <div style={s.cardTitle}>Compartilhamentos configurados</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Origem</th>
                    <th style={s.th}>Destino</th>
                    <th style={s.th}>Entidade</th>
                    <th style={s.th}>Pode editar</th>
                    <th style={s.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {visibility.map(v => (
                    <tr key={v.id}>
                      <td style={s.td}>{branchName(v.source_branch_id)}</td>
                      <td style={s.td}>{branchName(v.target_branch_id)}</td>
                      <td style={s.td}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#6366F1' }}>
                          {ENTITIES.find(e => e.key === v.entity_table)?.label || v.entity_table}
                        </span>
                      </td>
                      <td style={s.td}>{v.can_edit ? '✓' : '—'}</td>
                      <td style={s.td}>
                        <button style={s.btnGhost} onClick={() => handleRemove(v.id)}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {branches.length === 0 && (
            <div style={{ ...s.card, color: 'var(--text-muted)', fontSize: 13 }}>
              Nenhuma filial cadastrada ainda. Crie filiais em Configurações → Empresa para usar o compartilhamento.
            </div>
          )}
        </>
      )}
    </div>
  )
}
