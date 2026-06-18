import { useState, useMemo } from 'react'
import { Building2, ChevronRight, ChevronDown, Users, Layers, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { useLocalState } from '../../hooks/useLocalState'
import {
  MOCK_COMPANIES, COMPANIES_STORAGE_KEY,
  COMPANY_TYPE_CFG, COMPANY_STATUS_CFG,
} from '../../data/mockCompanies'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../../components/ui'
import { useBranches } from '../../hooks/useBranches'

const ACCENT = '#6366F1'

// ─── Micro-components ─────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const cfg = COMPANY_TYPE_CFG[type] || COMPANY_TYPE_CFG.CUSTOMER
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:700, color:cfg.color, background:cfg.bg, letterSpacing:'0.03em' }}>
      {cfg.label}
    </span>
  )
}

function StatusDot({ status }) {
  const cfg = COMPANY_STATUS_CFG[status] || COMPANY_STATUS_CFG.inactive
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:cfg.color }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}

// ─── Árvore de canais ─────────────────────────────────────────────────────────
function ChannelTree({ companies, isvId }) {
  const [expanded, setExpanded] = useState(() => new Set([isvId]))

  const franchises = companies.filter(c => c.type === 'FRANCHISE' && c.parent_id === isvId)
  const customerOf = parentId => companies.filter(c => c.type === 'CUSTOMER' && c.parent_id === parentId)

  function toggle(id) {
    setExpanded(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalFranchises = franchises.length
  const totalCustomers  = companies.filter(c => c.type === 'CUSTOMER').length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Resumo */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {[
          { label:'Franquias ativas', value: franchises.filter(f=>f.status==='active').length + ' / ' + totalFranchises, color:'#0EA5E9', bg:'rgba(14,165,233,0.08)', icon: <Users size={15} strokeWidth={1.75} /> },
          { label:'Clientes totais',  value: totalCustomers, color:'#10B981', bg:'rgba(16,185,129,0.08)', icon: <Building2 size={15} strokeWidth={1.75} /> },
          { label:'Nível hierárquico',value: '2 níveis',   color:'#8B5CF6', bg:'rgba(139,92,246,0.08)', icon: <Layers size={15} strokeWidth={1.75} /> },
        ].map(m => (
          <div key={m.label} style={{ background:m.bg, border:`1px solid ${m.color}22`, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ color:m.color }}>{m.icon}</span>
            <div>
              <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</div>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)', lineHeight:1.2 }}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Árvore */}
      <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {franchises.length === 0 ? (
          <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            Nenhuma franquia conectada.
          </div>
        ) : (
          franchises.map((fr, fi) => {
            const customers = customerOf(fr.id)
            const open      = expanded.has(fr.id)
            return (
              <div key={fr.id} style={{ borderBottom: fi < franchises.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {/* Franquia row */}
                <div
                  onClick={() => customers.length && toggle(fr.id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', cursor:customers.length?'pointer':'default', background:'var(--surface2)', transition:'background 0.1s', userSelect:'none' }}
                  onMouseEnter={e => { if(customers.length) e.currentTarget.style.background='var(--surface)' }}
                  onMouseLeave={e => e.currentTarget.style.background='var(--surface2)'}
                >
                  <div style={{ width:32, height:32, borderRadius:9, background:`${COMPANY_TYPE_CFG.FRANCHISE.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Building2 size={14} strokeWidth={1.75} style={{ color:COMPANY_TYPE_CFG.FRANCHISE.color }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{fr.name}</span>
                      <TypeBadge type="FRANCHISE" />
                      <StatusDot status={fr.status} />
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, fontFamily:'var(--mono)' }}>
                      {fr.corporate_name}{fr.city ? ` · ${fr.city}/${fr.state}` : ''}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:99, padding:'2px 9px', fontFamily:'var(--mono)' }}>
                      {customers.length} cliente{customers.length !== 1 ? 's' : ''}
                    </span>
                    {customers.length > 0 && (
                      open
                        ? <ChevronDown size={14} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                        : <ChevronRight size={14} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                    )}
                  </div>
                </div>

                {/* Customers (colapsável) */}
                {open && customers.map((cu, ci) => (
                  <div key={cu.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px 10px 52px', borderTop:'1px solid var(--border)', background: ci % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)' }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:`${COMPANY_TYPE_CFG.CUSTOMER.color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Building2 size={12} strokeWidth={1.75} style={{ color:COMPANY_TYPE_CFG.CUSTOMER.color }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{cu.name}</span>
                        <TypeBadge type="CUSTOMER" />
                        <StatusDot status={cu.status} />
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, fontFamily:'var(--mono)' }}>
                        {cu.corporate_name}{cu.city ? ` · ${cu.city}/${cu.state}` : ''}
                      </div>
                    </div>
                    {cu.cnpj && (
                      <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', flexShrink:0 }}>{cu.cnpj}</span>
                    )}
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Gerenciamento de Filiais ──────────────────────────────────────────────────
const BRANCH_EMPTY = { name: '', custom_fields: { cnpj: '', cidade: '', uf: '', responsavel: '' } }

function FilialRow({ branch, onEdit, onDelete }) {
  const cf = branch.custom_fields || {}
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
      <div style={{ width:34, height:34, borderRadius:9, background:'rgba(99,102,241,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Building2 size={15} strokeWidth={1.75} style={{ color:'#6366F1' }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{branch.name}</div>
        {(cf.cidade || cf.uf || cf.cnpj) && (
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
            {[cf.cnpj, cf.cidade && cf.uf ? `${cf.cidade}/${cf.uf}` : cf.cidade || cf.uf].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      {cf.responsavel && (
        <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{cf.responsavel}</span>
      )}
      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
        <button onClick={() => onEdit(branch)} style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'var(--text-muted)', borderRadius:6 }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(branch.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'#ef4444', borderRadius:6 }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function FilialForm({ value, onChange, onSave, onCancel, saving }) {
  const cf = value.custom_fields || {}
  const set = (k, v) => onChange({ ...value, [k]: v })
  const setCf = (k, v) => onChange({ ...value, custom_fields: { ...cf, [k]: v } })
  return (
    <div style={{ padding:'16px', borderTop:'1px solid var(--border)', background:'var(--surface2)', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Nome da Filial *</label>
          <input className="fpe-field" style={{ marginTop:4 }} value={value.name || ''} onChange={e => set('name', e.target.value)} placeholder="Ex: Filial São Paulo" autoFocus />
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>CNPJ</label>
          <input className="fpe-field" style={{ marginTop:4, fontFamily:'var(--mono)' }} value={cf.cnpj || ''} onChange={e => setCf('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Responsável</label>
          <input className="fpe-field" style={{ marginTop:4 }} value={cf.responsavel || ''} onChange={e => setCf('responsavel', e.target.value)} placeholder="Nome do responsável" />
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Cidade</label>
          <input className="fpe-field" style={{ marginTop:4 }} value={cf.cidade || ''} onChange={e => setCf('cidade', e.target.value)} placeholder="São Paulo" />
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>UF</label>
          <input className="fpe-field" style={{ marginTop:4, fontFamily:'var(--mono)' }} maxLength={2} value={cf.uf || ''} onChange={e => setCf('uf', e.target.value.toUpperCase())} placeholder="SP" />
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <button onClick={onCancel} style={{ padding:'7px 14px', borderRadius:7, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          <X size={13} /> Cancelar
        </button>
        <button onClick={onSave} disabled={!value.name?.trim() || saving} style={{ padding:'7px 14px', borderRadius:7, border:'none', background:'#6366F1', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, opacity: (!value.name?.trim() || saving) ? 0.5 : 1 }}>
          <Check size={13} /> {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

function GerenciarFiliais() {
  const { branches, loading, saving, error, save, remove } = useBranches()
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)

  function handleNew() { setEditando('novo'); setForm(BRANCH_EMPTY) }
  function handleEdit(b) { setEditando(b.id); setForm({ id: b.id, name: b.name, custom_fields: b.custom_fields || {} }) }
  function handleCancel() { setEditando(null); setForm(null) }

  async function handleSave() {
    const result = await save(form)
    if (result?.ok) handleCancel()
    else if (result?.error) alert('Erro: ' + result.error)
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover esta filial?')) return
    const result = await remove(id)
    if (!result?.ok) alert('Erro: ' + result?.error)
  }

  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--surface2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Filiais cadastradas</span>
          <span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:99, padding:'1px 8px' }}>
            {loading ? '…' : branches.length}
          </span>
        </div>
        {editando !== 'novo' && (
          <button onClick={handleNew} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, border:'none', background:'#6366F1', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            <Plus size={12} /> Nova filial
          </button>
        )}
      </div>

      {error && <div style={{ padding:'10px 16px', fontSize:12, color:'#ef4444', borderTop:'1px solid var(--border)' }}>Erro ao carregar: {error}</div>}

      {editando === 'novo' && (
        <FilialForm value={form} onChange={setForm} onSave={handleSave} onCancel={handleCancel} saving={saving} />
      )}

      {loading ? (
        <div style={{ padding:'20px 16px', textAlign:'center', fontSize:12, color:'var(--text-muted)', borderTop:'1px solid var(--border)' }}>Carregando…</div>
      ) : branches.length === 0 && editando !== 'novo' ? (
        <div style={{ padding:'20px 16px', textAlign:'center', fontSize:12, color:'var(--text-muted)', borderTop:'1px solid var(--border)' }}>Nenhuma filial cadastrada.</div>
      ) : branches.map(b => (
        <div key={b.id}>
          {editando === b.id ? (
            <FilialForm value={form} onChange={setForm} onSave={handleSave} onCancel={handleCancel} saving={saving} />
          ) : (
            <FilialRow branch={b} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EmpresaISV() {
  const [companies, setCompanies] = useLocalState(COMPANIES_STORAGE_KEY, MOCK_COMPANIES)
  const isv = useMemo(() => companies.find(c => c.type === 'ISV'), [companies])
  const [form, setForm] = useState(null)

  const current = form || isv

  if (!isv) {
    return (
      <div style={{ padding:32, color:'var(--text-muted)', fontSize:14 }}>
        Organização principal não encontrada.
      </div>
    )
  }

  function set(k, v) { setForm(f => ({ ...(f || isv), [k]: v })) }

  function handleSave() {
    const updated = { ...(form || isv), updated_at: new Date().toISOString() }
    setCompanies(prev => prev.map(c => c.id === isv.id ? updated : c))
    setForm(null)
  }

  function handleCancel() { setForm(null) }

  return (
    <FullPageEdit
      title="Minha Empresa"
      subtitle={isv.corporate_name || isv.name}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <FPESection title="Identidade Jurídica">
        <FPEGrid>
          <FPEField label="Nome Fantasia" required style={{ gridColumn: '1 / -1' }}>
            <input className="fpe-field" value={current.name || ''} onChange={e => set('name', e.target.value)} placeholder="Ex: NG Informática" />
          </FPEField>
          <FPEField label="Razão Social" style={{ gridColumn: '1 / -1' }}>
            <input className="fpe-field" value={current.corporate_name || ''} onChange={e => set('corporate_name', e.target.value)} placeholder="Ex: NG Informática Tecnologia da Informação Ltda" />
          </FPEField>
          <FPEField label="CNPJ">
            <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} value={current.cnpj || ''} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
          </FPEField>
          <FPEField label="Website">
            <input className="fpe-field" value={current.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://suaempresa.com.br" />
          </FPEField>
        </FPEGrid>
      </FPESection>

      <FPESection title="Contato">
        <FPEGrid>
          <FPEField label="E-mail">
            <input className="fpe-field" type="email" value={current.email || ''} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com.br" />
          </FPEField>
          <FPEField label="Telefone">
            <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} value={current.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(11) 0000-0000" />
          </FPEField>
        </FPEGrid>
      </FPESection>

      <FPESection title="Endereço">
        <FPEGrid>
          <FPEField label="CEP">
            <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} value={current.cep || ''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
          </FPEField>
          <FPEField label="Logradouro">
            <input className="fpe-field" value={current.address || ''} onChange={e => set('address', e.target.value)} placeholder="Av. Paulista, 1374 — Sala 101" />
          </FPEField>
          <FPEField label="Cidade">
            <input className="fpe-field" value={current.city || ''} onChange={e => set('city', e.target.value)} placeholder="São Paulo" />
          </FPEField>
          <FPEField label="UF">
            <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} maxLength={2} value={current.state || ''} onChange={e => set('state', e.target.value.toUpperCase())} placeholder="SP" />
          </FPEField>
        </FPEGrid>
      </FPESection>

      <FPESection title="Identidade Visual (White-label)">
        <FPEGrid>
          <FPEField label="Cor primária">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="color" value={current.primary_color || '#6366F1'} onChange={e => set('primary_color', e.target.value)}
                style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
              <input className="fpe-field" style={{ fontFamily:'var(--mono)', fontSize:12 }} value={current.primary_color || ''} onChange={e => set('primary_color', e.target.value)} placeholder="#6366F1" />
            </div>
          </FPEField>
          <FPEField label="Cor de destaque">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="color" value={current.accent_color || '#10B981'} onChange={e => set('accent_color', e.target.value)}
                style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
              <input className="fpe-field" style={{ fontFamily:'var(--mono)', fontSize:12 }} value={current.accent_color || ''} onChange={e => set('accent_color', e.target.value)} placeholder="#10B981" />
            </div>
          </FPEField>
          <FPEField label="Prévia">
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ padding:'6px 14px', borderRadius:7, background:current.primary_color || ACCENT, color:'#fff', fontSize:12, fontWeight:700 }}>Primária</span>
              <span style={{ padding:'6px 14px', borderRadius:7, background:current.accent_color || '#10B981', color:'#fff', fontSize:12, fontWeight:700 }}>Destaque</span>
            </div>
          </FPEField>
        </FPEGrid>
        <FPEField label="Observações internas">
          <textarea className="fpe-field" rows={2} style={{ resize:'vertical' }} value={current.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Anotações internas sobre a organização." />
        </FPEField>
      </FPESection>

      <FPESection title="Filiais (Unidades de Negócio)">
        <GerenciarFiliais />
      </FPESection>

      <FPESection title="Canais conectados">
        <ChannelTree companies={companies} isvId={isv.id} />
      </FPESection>
    </FullPageEdit>
  )
}

