import { useState, useMemo } from 'react'
import { Building2, ChevronRight, ChevronDown, Users, Layers } from 'lucide-react'
import { useLocalState } from '../../hooks/useLocalState'
import {
  MOCK_COMPANIES, COMPANIES_STORAGE_KEY,
  COMPANY_TYPE_CFG, COMPANY_STATUS_CFG,
} from '../../data/mockCompanies'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../../components/ui'

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

      <FPESection title="Canais conectados">
        <ChannelTree companies={companies} isvId={isv.id} />
      </FPESection>
    </FullPageEdit>
  )
}

