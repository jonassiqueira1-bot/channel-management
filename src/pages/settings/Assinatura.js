import { useState } from 'react'
import {
  CreditCard, Users, CheckCircle2, Clock, AlertTriangle, XCircle,
  QrCode, Copy, FileText, ChevronRight, X, Info,
} from 'lucide-react'
import SettingsLayout from '../../components/ui/SettingsLayout'
import Button from '../../components/Button'
import { useBilling } from '../../hooks/useBilling'
import { useProfile } from '../../hooks/useProfile'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  trial:           { label: 'Período de teste',   color: '#2563EB', bg: '#EFF6FF' },
  pending_payment: { label: 'Aguardando pagamento',color: '#D97706', bg: '#FFFBEB' },
  active:          { label: 'Ativa',              color: '#059669', bg: '#F0FDF4' },
  overdue:         { label: 'Inadimplente',        color: '#DC2626', bg: '#FEF2F2' },
  suspended:       { label: 'Suspensa',            color: '#6B7280', bg: '#F3F4F6' },
  trial_expired:   { label: 'Trial expirado',      color: '#6B7280', bg: '#F3F4F6' },
  cancelled:       { label: 'Cancelada',           color: '#6B7280', bg: '#F3F4F6' },
}

const COBRANCA_STATUS = {
  PENDING:   { label: 'Pendente',  color: '#D97706', bg: '#FFFBEB' },
  RECEIVED:  { label: 'Pago',      color: '#059669', bg: '#F0FDF4' },
  OVERDUE:   { label: 'Vencido',   color: '#DC2626', bg: '#FEF2F2' },
  CANCELLED: { label: 'Cancelado', color: '#6B7280', bg: '#F3F4F6' },
}

function fmt(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0)
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}
function daysLeft(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

// ─── Chip de status ───────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const cfg = STATUS_LABEL[status] || { label: status, color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
      borderRadius:99, fontSize:12, fontWeight:600,
      color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

// ─── Modal PIX ───────────────────────────────────────────────────────────────
function PixModal({ cobranca, onClose }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(cobranca.pix_copy_paste || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:'var(--surface)', borderRadius:16, padding:32, width:380,
        boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <strong style={{ fontSize:16 }}>Pagar com Pix</strong>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>×</button>
        </div>
        {cobranca.pix_qr_code_image ? (
          <img src={`data:image/png;base64,${cobranca.pix_qr_code_image}`}
            alt="QR Code Pix" style={{ width:'100%', borderRadius:8, marginBottom:16 }} />
        ) : (
          <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13, marginBottom:16 }}>
            QR Code não disponível. Use o código copia e cola.
          </div>
        )}
        {cobranca.pix_copy_paste && (
          <div style={{ background:'var(--surface3)', borderRadius:8, padding:12, fontSize:11,
            fontFamily:'var(--mono)', wordBreak:'break-all', marginBottom:12 }}>
            {cobranca.pix_copy_paste}
          </div>
        )}
        <Button style={{ width:'100%' }} onClick={copy}>
          <Copy size={14} /> {copied ? 'Copiado!' : 'Copiar código Pix'}
        </Button>
        <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', marginTop:12, marginBottom:0 }}>
          Vencimento: {fmtDate(cobranca.vencimento)} · {fmt(cobranca.valor)}
        </p>
      </div>
    </div>
  )
}

// ─── Modal cancelamento ──────────────────────────────────────────────────────
function CancelModal({ plan, onConfirm, onClose, loading }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:'var(--surface)', borderRadius:16, padding:32, width:440,
        boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:20 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'#FEF2F2',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <AlertTriangle size={20} color="#DC2626" />
          </div>
          <div>
            <strong style={{ fontSize:15 }}>Cancelar assinatura</strong>
            <p style={{ fontSize:13, color:'var(--text-soft)', marginTop:4, marginBottom:0 }}>
              Você tem certeza? Antes de confirmar, entenda o que acontece:
            </p>
          </div>
        </div>
        <div style={{ background:'#FEF2F2', borderRadius:10, padding:14, marginBottom:20, fontSize:13 }}>
          <p style={{ margin:'0 0 8px', fontWeight:600, color:'#DC2626' }}>Período de carência — 90 dias</p>
          <p style={{ margin:'0 0 6px', color:'var(--text)' }}>
            Após o pedido de cancelamento, sua assinatura permanece ativa por 90 dias.
            Durante esse período, <strong>3 faturas serão cobradas normalmente</strong>.
          </p>
          <p style={{ margin:0, color:'var(--text-soft)' }}>
            Seus dados ficam disponíveis até o final da carência. Após isso, o acesso é encerrado.
          </p>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Voltar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Processando…' : 'Confirmar cancelamento'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Tela principal ──────────────────────────────────────────────────────────
export default function Assinatura() {
  const { profile, isAdmin } = useProfile()
  const { tenant, plan, cobrancas, userCount, loading, saveBillingData, requestCancellation } = useBilling()
  const [pixModal, setPixModal] = useState(null)
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [editBilling, setEditBilling] = useState(false)
  const [billingForm, setBillingForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  if (!isAdmin) return (
    <SettingsLayout title="Assinatura">
      <p style={{ color:'var(--text-soft)', fontSize:14 }}>Apenas administradores podem gerenciar a assinatura.</p>
    </SettingsLayout>
  )

  async function handleCancelConfirm() {
    setCancelling(true)
    const res = await requestCancellation()
    setCancelling(false)
    setCancelModal(false)
    if (!res.ok) setMsg({ type:'error', text: res.message })
    else setMsg({ type:'success', text: 'Cancelamento solicitado. Sua assinatura permanece ativa por 90 dias.' })
  }

  async function handleSaveBilling(e) {
    e.preventDefault()
    setSaving(true)
    const res = await saveBillingData(billingForm)
    setSaving(false)
    if (!res.ok) setMsg({ type:'error', text: res.message })
    else { setMsg({ type:'success', text: 'Dados de cobrança salvos.' }); setEditBilling(false) }
  }

  const trialDays = tenant ? daysLeft(tenant.trial_ends_at) : null
  const cancelDays = tenant ? daysLeft(tenant.cancel_at) : null

  return (
    <SettingsLayout title="Assinatura">
      {msg && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, fontSize:13,
          background: msg.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          color: msg.type === 'error' ? '#DC2626' : '#059669',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.6 }}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>Carregando…</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* ── Status da assinatura ── */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <strong style={{ fontSize:16 }}>{plan?.name ?? 'Sem plano'}</strong>
                  <StatusChip status={tenant?.status} />
                </div>
                <div style={{ fontSize:13, color:'var(--text-soft)', display:'flex', flexDirection:'column', gap:4 }}>
                  {plan && <span>{fmt(plan.value)}<span style={{ color:'var(--text-muted)' }}>/mês</span></span>}
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <Users size={13} /> {userCount} usuário{userCount !== 1 ? 's' : ''} ativos
                    {plan && <span style={{ color:'var(--text-muted)' }}> · faixa: {plan.min_users}–{plan.max_users ?? '∞'} usuários</span>}
                  </span>
                  {tenant?.asaas_next_due_date && (
                    <span><Clock size={13} style={{ marginRight:4 }} />Próximo vencimento: {fmtDate(tenant.asaas_next_due_date)}</span>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
                {tenant?.status === 'trial' && trialDays !== null && (
                  <div style={{ background:'#EFF6FF', color:'#2563EB', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:500 }}>
                    {trialDays > 0 ? `${trialDays} dias restantes de trial` : 'Trial vencendo hoje'}
                  </div>
                )}
                {tenant?.cancellation_requested_at && cancelDays !== null && cancelDays > 0 && (
                  <div style={{ background:'#FEF2F2', color:'#DC2626', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:500 }}>
                    Cancelamento em {cancelDays} dias
                  </div>
                )}
              </div>
            </div>

            {tenant?.status === 'overdue' && tenant.overdue_since && (
              <div style={{ marginTop:16, background:'#FEF2F2', borderRadius:8, padding:12, fontSize:13, color:'#DC2626', display:'flex', gap:8 }}>
                <AlertTriangle size={16} style={{ flexShrink:0, marginTop:1 }} />
                <span>Pagamento vencido desde {fmtDate(tenant.overdue_since)}. Você tem {tenant.grace_period_days} dias de carência antes da suspensão.</span>
              </div>
            )}

            {tenant?.status === 'active' && !tenant.cancellation_requested_at && (
              <div style={{ marginTop:16, borderTop:'1px solid var(--border)', paddingTop:16 }}>
                <button onClick={() => setCancelModal(true)}
                  style={{ fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                  Solicitar cancelamento
                </button>
              </div>
            )}
          </div>

          {/* ── Dados de cobrança ── */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <strong style={{ fontSize:14 }}>Dados de cobrança</strong>
              {!editBilling && (
                <Button size="sm" variant="ghost" onClick={() => {
                  setBillingForm({
                    name: tenant?.billing_name || '',
                    cpf_cnpj: tenant?.billing_cpf_cnpj || '',
                    email: tenant?.billing_email || '',
                    phone: tenant?.billing_phone || '',
                  })
                  setEditBilling(true)
                }}>Editar</Button>
              )}
            </div>
            {editBilling ? (
              <form onSubmit={handleSaveBilling} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { key:'name',     label:'Nome / Razão Social', placeholder:'Nome completo ou razão social' },
                  { key:'cpf_cnpj', label:'CPF / CNPJ',          placeholder:'000.000.000-00 ou 00.000.000/0001-00' },
                  { key:'email',    label:'E-mail de cobrança',   placeholder:'financeiro@empresa.com' },
                  { key:'phone',    label:'Telefone',             placeholder:'(11) 99999-0000' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:12, fontWeight:500, color:'var(--text-soft)', display:'block', marginBottom:4 }}>{f.label}</label>
                    <input className="fpe-field" value={billingForm[f.key] || ''} placeholder={f.placeholder}
                      onChange={e => setBillingForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
                  <Button type="button" variant="ghost" onClick={() => setEditBilling(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
                </div>
              </form>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 24px', fontSize:13 }}>
                {[
                  ['Nome', tenant?.billing_name],
                  ['CPF / CNPJ', tenant?.billing_cpf_cnpj],
                  ['E-mail', tenant?.billing_email],
                  ['Telefone', tenant?.billing_phone],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:2 }}>{label}</div>
                    <div style={{ color: val ? 'var(--text)' : 'var(--text-muted)' }}>{val || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Histórico de faturas ── */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:24 }}>
            <strong style={{ fontSize:14, display:'block', marginBottom:16 }}>Faturas</strong>
            {cobrancas.length === 0 ? (
              <p style={{ color:'var(--text-muted)', fontSize:13 }}>Nenhuma fatura ainda.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {cobrancas.map((c, i) => {
                  const st = COBRANCA_STATUS[c.status] || { label: c.status, color:'#6B7280', bg:'#F3F4F6' }
                  return (
                    <div key={c.id} style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'12px 0', borderBottom: i < cobrancas.length - 1 ? '1px solid var(--border2)' : 'none',
                      gap:12, flexWrap:'wrap',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:8, background:'var(--surface3)',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <FileText size={16} color="var(--text-soft)" />
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500 }}>Fatura — {fmtDate(c.vencimento)}</div>
                          <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                            {c.tipo} · {c.payment_date ? `Pago em ${fmtDate(c.payment_date)}` : `Vencimento ${fmtDate(c.vencimento)}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <strong style={{ fontSize:13 }}>{fmt(c.valor)}</strong>
                        <span style={{ padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600,
                          color: st.color, background: st.bg }}>
                          {st.label}
                        </span>
                        {c.status === 'PENDING' && c.pix_copy_paste && (
                          <Button size="sm" onClick={() => setPixModal(c)}>
                            <QrCode size={13} /> Pagar
                          </Button>
                        )}
                        {c.invoice_url && (
                          <a href={c.invoice_url} target="_blank" rel="noreferrer"
                            style={{ fontSize:12, color:'var(--accent)', textDecoration:'none' }}>
                            Ver fatura
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {pixModal && <PixModal cobranca={pixModal} onClose={() => setPixModal(null)} />}
      {cancelModal && <CancelModal plan={plan} onConfirm={handleCancelConfirm} onClose={() => setCancelModal(false)} loading={cancelling} />}
    </SettingsLayout>
  )
}
