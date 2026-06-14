import { useState, useMemo } from 'react'
import {
  Building2, Globe, Phone, Mail, MapPin, Hash,
  ChevronRight, ChevronDown, Pencil, Save, X,
  CheckCircle2, AlertCircle, Loader2, Users, Layers,
  Palette, Info, Landmark,
} from 'lucide-react'
import { useLocalState } from '../../hooks/useLocalState'
import {
  MOCK_COMPANIES, COMPANIES_STORAGE_KEY,
  COMPANY_TYPE_CFG, COMPANY_STATUS_CFG,
} from '../../data/mockCompanies'
import Button from '../../components/Button'

const ISV_ID  = 'a0000000-0000-0000-0000-000000000001'
const ACCENT  = '#6366F1'
const SZ      = 14

// ─── Utilitários ──────────────────────────────────────────────────────────────
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }) : '—'

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

function FieldRow({ label, value, mono }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</div>
      <div style={{ fontSize:13, color: value ? 'var(--text)' : 'var(--text-muted)', fontFamily: mono ? 'var(--mono)' : 'var(--font)', fontStyle: value ? 'normal' : 'italic' }}>
        {value || 'Não informado'}
      </div>
    </div>
  )
}

// ─── Formulário de edição da ISV ──────────────────────────────────────────────
function ISVForm({ isv, onSave, onCancel }) {
  const [form, setForm]     = useState({ ...isv })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Nome fantasia é obrigatório.'); return }
    setSaving(true); setErr(null)
    await new Promise(r => setTimeout(r, 400))
    onSave({ ...form, updated_at: new Date().toISOString() })
    setSaving(false)
  }

  const IN = {
    width: '100%', padding: '8px 11px', borderRadius: 8, fontSize: 13,
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }
  const LB = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* ── Identidade ─────────────────────────────────────────────────── */}
      <Section icon={<Landmark size={13} strokeWidth={2} />} label="Identidade Jurídica">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column' }}>
            <label style={LB}>Nome Fantasia *</label>
            <input style={IN} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: NG Informática" />
          </div>
          <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column' }}>
            <label style={LB}>Razão Social</label>
            <input style={IN} value={form.corporate_name||''} onChange={e => set('corporate_name', e.target.value)} placeholder="Ex: NG Informática Tecnologia da Informação Ltda" />
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>CNPJ</label>
            <input style={{ ...IN, fontFamily:'var(--mono)' }} value={form.cnpj||''} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>Website</label>
            <input style={IN} value={form.website||''} onChange={e => set('website', e.target.value)} placeholder="https://suaempresa.com.br" />
          </div>
        </div>
      </Section>

      {/* ── Contato ────────────────────────────────────────────────────── */}
      <Section icon={<Phone size={13} strokeWidth={2} />} label="Contato">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>E-mail</label>
            <input type="email" style={IN} value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com.br" />
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>Telefone</label>
            <input style={{ ...IN, fontFamily:'var(--mono)' }} value={form.phone||''} onChange={e => set('phone', e.target.value)} placeholder="(11) 0000-0000" />
          </div>
        </div>
      </Section>

      {/* ── Endereço ───────────────────────────────────────────────────── */}
      <Section icon={<MapPin size={13} strokeWidth={2} />} label="Endereço">
        <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:14 }}>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>CEP</label>
            <input style={{ ...IN, fontFamily:'var(--mono)' }} value={form.cep||''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>Logradouro</label>
            <input style={IN} value={form.address||''} onChange={e => set('address', e.target.value)} placeholder="Av. Paulista, 1374 — Sala 101" />
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>Cidade</label>
            <input style={IN} value={form.city||''} onChange={e => set('city', e.target.value)} placeholder="São Paulo" />
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>Estado (UF)</label>
            <input style={{ ...IN, fontFamily:'var(--mono)' }} maxLength={2} value={form.state||''} onChange={e => set('state', e.target.value.toUpperCase())} placeholder="SP" />
          </div>
        </div>
      </Section>

      {/* ── White-label ────────────────────────────────────────────────── */}
      <Section icon={<Palette size={13} strokeWidth={2} />} label="White-label">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, alignItems:'end' }}>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>Cor primária</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="color" value={form.primary_color||'#6366F1'} onChange={e => set('primary_color', e.target.value)} style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
              <input style={{ ...IN, fontFamily:'var(--mono)', fontSize:12 }} value={form.primary_color||''} onChange={e => set('primary_color', e.target.value)} placeholder="#6366F1" />
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>Cor de destaque</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="color" value={form.accent_color||'#10B981'} onChange={e => set('accent_color', e.target.value)} style={{ width:36, height:36, padding:2, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
              <input style={{ ...IN, fontFamily:'var(--mono)', fontSize:12 }} value={form.accent_color||''} onChange={e => set('accent_color', e.target.value)} placeholder="#10B981" />
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={LB}>Prévia</label>
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ padding:'6px 14px', borderRadius:7, background:form.primary_color||ACCENT, color:'#fff', fontSize:12, fontWeight:700 }}>Primária</span>
              <span style={{ padding:'6px 14px', borderRadius:7, background:form.accent_color||'#10B981', color:'#fff', fontSize:12, fontWeight:700 }}>Destaque</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop:12, display:'flex', flexDirection:'column' }}>
          <label style={LB}>Observações internas</label>
          <textarea rows={2} style={{ ...IN, resize:'vertical' }} value={form.notes||''} onChange={e => set('notes', e.target.value)} placeholder="Anotações internas sobre a organização." />
        </div>
      </Section>

      {err && (
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 12px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:13 }}>
          <AlertCircle size={13} strokeWidth={2} />{err}
        </div>
      )}

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:4 }}>
        <Button variant="secondary" icon={<X size={13} strokeWidth={2} />} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={saving} icon={<Save size={13} strokeWidth={2} />}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
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

// ─── Section helper ───────────────────────────────────────────────────────────
function Section({ icon, label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
        <span style={{ color:'var(--text-muted)' }}>{icon}</span>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.07em', textTransform:'uppercase' }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EmpresaISV() {
  const [companies, setCompanies] = useLocalState(COMPANIES_STORAGE_KEY, MOCK_COMPANIES)
  const [editing, setEditing]     = useState(false)
  const [saved, setSaved]         = useState(false)

  const isv = useMemo(() => companies.find(c => c.type === 'ISV'), [companies])

  if (!isv) {
    return (
      <div style={{ padding:32, color:'var(--text-muted)', fontSize:14 }}>
        Organização principal não encontrada.
      </div>
    )
  }

  function handleSave(updated) {
    setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c))
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <div style={{ padding:'28px 32px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {/* Avatar / logo */}
            <div style={{ width:52, height:52, borderRadius:14, background:`${isv.primary_color || ACCENT}18`, border:`1.5px solid ${isv.primary_color || ACCENT}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Building2 size={22} strokeWidth={1.5} style={{ color: isv.primary_color || ACCENT }} />
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)', margin:0, letterSpacing:'-0.3px' }}>{isv.name}</h2>
                <TypeBadge type="ISV" />
                <StatusDot status={isv.status} />
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                {isv.corporate_name}
                {isv.cnpj ? <span style={{ marginLeft:10, fontFamily:'var(--mono)' }}>{isv.cnpj}</span> : null}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                Cadastro atualizado em {fmtDate(isv.updated_at)}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, paddingTop:4 }}>
            {saved && (
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#10B981', fontWeight:600 }}>
                <CheckCircle2 size={14} strokeWidth={2.5} />Salvo
              </div>
            )}
            {!editing && (
              <Button icon={<Pencil size={13} strokeWidth={2} />} onClick={() => setEditing(true)}>Editar organização</Button>
            )}
          </div>
        </div>

        {/* Info pills */}
        {!editing && (
          <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
            {isv.email   && <InfoPill icon={<Mail size={11} strokeWidth={2} />}  value={isv.email} />}
            {isv.phone   && <InfoPill icon={<Phone size={11} strokeWidth={2} />} value={isv.phone} />}
            {isv.website && <InfoPill icon={<Globe size={11} strokeWidth={2} />} value={isv.website} link />}
            {(isv.city || isv.state) && <InfoPill icon={<MapPin size={11} strokeWidth={2} />} value={[isv.city, isv.state].filter(Boolean).join('/')} />}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', display:'flex', flexDirection:'column', gap:36 }}>

        {editing ? (
          <ISVForm isv={isv} onSave={handleSave} onCancel={() => setEditing(false)} />
        ) : (
          <>
            {/* Dados resumidos */}
            <Section icon={<Landmark size={13} strokeWidth={2} />} label="Dados cadastrais">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
                <FieldRow label="Nome Fantasia"  value={isv.name} />
                <FieldRow label="Razão Social"   value={isv.corporate_name} />
                <FieldRow label="CNPJ"           value={isv.cnpj}    mono />
                <FieldRow label="E-mail"         value={isv.email} />
                <FieldRow label="Telefone"       value={isv.phone}   mono />
                <FieldRow label="Website"        value={isv.website} />
                <FieldRow label="CEP"            value={isv.cep}     mono />
                <FieldRow label="Logradouro"     value={isv.address} />
                <FieldRow label="Cidade / UF"    value={isv.city && isv.state ? `${isv.city} / ${isv.state}` : isv.city || isv.state} />
              </div>
            </Section>

            {/* White-label */}
            <Section icon={<Palette size={13} strokeWidth={2} />} label="Identidade visual">
              <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                <ColorSwatch label="Cor Primária"   hex={isv.primary_color} />
                <ColorSwatch label="Cor de Destaque" hex={isv.accent_color} />
                {isv.notes && (
                  <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 12px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', flex:1, minWidth:200 }}>
                    <Info size={11} strokeWidth={2} style={{ display:'inline', marginRight:5, verticalAlign:'middle' }} />
                    {isv.notes}
                  </div>
                )}
              </div>
            </Section>

            {/* Árvore de canais */}
            <Section icon={<Layers size={13} strokeWidth={2} />} label="Canais conectados">
              <ChannelTree companies={companies} isvId={isv.id} />
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoPill({ icon, value, link }) {
  const inner = (
    <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:99, fontSize:11, fontWeight:500, color:'var(--text-soft)', background:'var(--surface2)', border:'1px solid var(--border)', whiteSpace:'nowrap' }}>
      <span style={{ color:'var(--text-muted)' }}>{icon}</span>
      {value}
    </div>
  )
  return link
    ? <a href={value} target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}>{inner}</a>
    : inner
}

function ColorSwatch({ label, hex }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:28, height:28, borderRadius:7, background:hex||'var(--surface2)', border:'1px solid var(--border)' }} />
        <span style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-soft)' }}>{hex || '—'}</span>
      </div>
    </div>
  )
}
