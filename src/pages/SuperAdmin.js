import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const PLANS = ['trial', 'starter', 'professional', 'enterprise']
const STATUS_OPTS = ['active', 'suspended', 'cancelled']

const s = {
  page:    { padding: '28px 32px', maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--font)' },
  header:  { marginBottom: 28 },
  title:   { fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.3px' },
  sub:     { fontSize: 13, color: 'var(--text-muted)', marginTop: 4 },
  card:    { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 },
  cardTitle:{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:      { textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' },
  td:      { padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle' },
  badge:   (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: color + '20', color }),
  btn:     { padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)' },
  btnPrimary: { background: '#6366F1', color: '#fff' },
  btnGhost:   { background: 'var(--surface2)', color: 'var(--text)' },
  btnRed:     { background: 'rgba(239,68,68,0.1)', color: '#EF4444' },
  input:   { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', width: '100%', boxSizing: 'border-box' },
  label:   { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' },
  grid2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  grid3:   { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 },
  row:     { display: 'flex', alignItems: 'center', gap: 8 },
  danger:  { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 18px', marginTop: 24 },
  dangerTitle: { fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 6 },
}

const PLAN_COLOR  = { trial: '#6B7280', starter: '#3B82F6', professional: '#6366F1', enterprise: '#8B5CF6' }
const STATUS_COLOR= { active: '#10B981', suspended: '#F59E0B', cancelled: '#EF4444' }

function NewTenantForm({ onCreated }) {
  const [form, setForm] = useState({ name: '', slug: '', plan: 'professional', adminEmail: '', adminNome: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.slug || !form.adminEmail) { setMsg({ type: 'error', text: 'Preencha nome, slug e e-mail do admin.' }); return }
    setLoading(true); setMsg(null)
    try {
      // 1. Cria o tenant via função SECURITY DEFINER (bypassa RLS)
      const { data: result, error: tErr } = await supabase.rpc('provision_new_tenant', {
        p_name: form.name,
        p_slug: form.slug,
        p_plan: form.plan,
      })
      if (tErr) throw new Error(tErr.message)
      const tenantId = result.id

      // 2. Tenta convidar o admin (requer service role — pode falhar em frontend)
      const { error: iErr } = await supabase.auth.admin.inviteUserByEmail(form.adminEmail, {
        data: { tenant_id: tenantId, role: 'admin_isv', nome: form.adminNome || form.adminEmail.split('@')[0] }
      })
      if (iErr) {
        setMsg({ type: 'warn', text: `Tenant "${form.name}" criado (ID: ${tenantId}). Convite deve ser enviado manualmente no painel Supabase Auth.` })
        setLoading(false)
        onCreated()
        return
      }

      setMsg({ type: 'success', text: `Tenant "${form.name}" criado com sucesso! Convite enviado para ${form.adminEmail}.` })
      setForm({ name: '', slug: '', plan: 'professional', adminEmail: '', adminNome: '' })
      onCreated()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setLoading(false)
  }

  return (
    <div style={s.card}>
      <div style={s.cardTitle}>Provisionar Novo Tenant</div>
      <form onSubmit={handleSubmit}>
        <div style={{ ...s.grid2, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Nome da empresa *</label>
            <input style={s.input} value={form.name} onChange={e => { set('name', e.target.value); if (!form.slug) set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) }} placeholder="Acme Corp" />
          </div>
          <div>
            <label style={s.label}>Slug (único) *</label>
            <input style={s.input} value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} placeholder="acme-corp" />
          </div>
        </div>
        <div style={{ ...s.grid3, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Plano</label>
            <select style={s.input} value={form.plan} onChange={e => set('plan', e.target.value)}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>E-mail do Admin *</label>
            <input style={s.input} type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} placeholder="admin@empresa.com" />
          </div>
          <div>
            <label style={s.label}>Nome do Admin</label>
            <input style={s.input} value={form.adminNome} onChange={e => set('adminNome', e.target.value)} placeholder="João Silva" />
          </div>
        </div>
        {msg && (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: msg.type === 'error' ? 'rgba(239,68,68,0.1)' : msg.type === 'warn' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
            color: msg.type === 'error' ? '#EF4444' : msg.type === 'warn' ? '#F59E0B' : '#10B981',
            border: `1px solid ${msg.type === 'error' ? '#EF4444' : msg.type === 'warn' ? '#F59E0B' : '#10B981'}40`,
          }}>
            {msg.text}
          </div>
        )}
        <button type="submit" style={{ ...s.btn, ...s.btnPrimary }} disabled={loading}>
          {loading ? 'Criando...' : '+ Criar Tenant'}
        </button>
      </form>
    </div>
  )
}

function TenantRow({ tenant, onStatusChange }) {
  const [editing, setEditing] = useState(false)
  const [plan, setPlan] = useState(tenant.plan)
  const [status, setStatus] = useState(tenant.status)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('tenants').update({ plan, status }).eq('id', tenant.id)
    await supabase.from('super_admin_log').insert({ action: 'tenant_updated', tenant_id: tenant.id, details: { plan, status } })
    setSaving(false); setEditing(false); onStatusChange()
  }

  return (
    <tr>
      <td style={s.td}>
        <div style={{ fontWeight: 600 }}>{tenant.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tenant.slug}</div>
      </td>
      <td style={s.td}>
        {editing
          ? <select style={{ ...s.input, width: 130 }} value={plan} onChange={e => setPlan(e.target.value)}>{PLANS.map(p => <option key={p} value={p}>{p}</option>)}</select>
          : <span style={s.badge(PLAN_COLOR[tenant.plan] || '#6B7280')}>{tenant.plan}</span>}
      </td>
      <td style={s.td}>
        {editing
          ? <select style={{ ...s.input, width: 130 }} value={status} onChange={e => setStatus(e.target.value)}>{STATUS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}</select>
          : <span style={s.badge(STATUS_COLOR[tenant.status] || '#6B7280')}>{tenant.status}</span>}
      </td>
      <td style={s.td}>{tenant.created_at?.slice(0, 10) || '—'}</td>
      <td style={s.td}>
        <div style={s.row}>
          {editing
            ? <>
                <button style={{ ...s.btn, ...s.btnPrimary }} onClick={save} disabled={saving}>{saving ? '...' : 'Salvar'}</button>
                <button style={{ ...s.btn, ...s.btnGhost }} onClick={() => setEditing(false)}>Cancelar</button>
              </>
            : <button style={{ ...s.btn, ...s.btnGhost }} onClick={() => setEditing(true)}>Editar</button>
          }
        </div>
      </td>
    </tr>
  )
}

function TenantsTable({ tenants, onRefresh }) {
  if (!tenants.length) return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Nenhum tenant encontrado.</div>
  return (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>Empresa</th>
          <th style={s.th}>Plano</th>
          <th style={s.th}>Status</th>
          <th style={s.th}>Criado</th>
          <th style={s.th}></th>
        </tr>
      </thead>
      <tbody>
        {tenants.map(t => <TenantRow key={t.id} tenant={t} onStatusChange={onRefresh} />)}
      </tbody>
    </table>
  )
}

function LogsTable({ logs }) {
  if (!logs.length) return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Nenhum log registrado.</div>
  return (
    <table style={s.table}>
      <thead>
        <tr>
          <th style={s.th}>Ação</th>
          <th style={s.th}>Tenant</th>
          <th style={s.th}>Ator</th>
          <th style={s.th}>Data</th>
        </tr>
      </thead>
      <tbody>
        {logs.map(l => (
          <tr key={l.id}>
            <td style={s.td}><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#6366F1' }}>{l.action}</span></td>
            <td style={s.td}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.tenant_id?.slice(0, 8)}…</span></td>
            <td style={s.td}>{l.actor_email || '—'}</td>
            <td style={s.td}>{l.created_at?.slice(0, 16).replace('T', ' ') || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function SuperAdmin() {
  const { session } = useAuth()
  const [tenants, setTenants] = useState([])
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tenants')

  const load = useCallback(async () => {
    setLoading(true)
    const [t, l] = await Promise.all([
      supabase.from('tenants').select('*').order('created_at', { ascending: false }),
      supabase.from('super_admin_log').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setTenants(t.data || [])
    setLogs(l.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const TABS = [
    { id: 'tenants',    label: 'Tenants' },
    { id: 'novo',       label: 'Novo Tenant' },
    { id: 'logs',       label: 'Logs' },
  ]

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Sistema › Super Admin
        </div>
        <h1 style={s.title}>Painel Super Admin</h1>
        <div style={s.sub}>Gerenciamento global de tenants e configurações do sistema.</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font)', borderRadius: '8px 8px 0 0',
            background: tab === t.id ? 'var(--surface)' : 'transparent',
            color: tab === t.id ? '#6366F1' : 'var(--text-muted)',
            borderBottom: tab === t.id ? '2px solid #6366F1' : '2px solid transparent',
          }}>
            {t.label}
            {t.id === 'tenants' && tenants.length > 0 && (
              <span style={{ marginLeft: 6, background: '#6366F120', color: '#6366F1', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                {tenants.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 20 }}>Carregando...</div>
      ) : (
        <>
          {tab === 'tenants' && (
            <div style={s.card}>
              <div style={s.cardTitle}>Todos os Tenants ({tenants.length})</div>
              <TenantsTable tenants={tenants} onRefresh={load} />
            </div>
          )}

          {tab === 'novo' && <NewTenantForm onCreated={load} />}

          {tab === 'logs' && (
            <div style={s.card}>
              <div style={s.cardTitle}>Log de Ações Administrativas</div>
              <LogsTable logs={logs} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
