import { useState, useEffect } from 'react'
import {
  Users, Clock, AlertTriangle, CheckCircle2,
  QrCode, Copy, FileText, X, CreditCard,
} from 'lucide-react'
import { FPESection } from '../../components/ui'
import Button from '../../components/Button'
import { useBilling } from '../../hooks/useBilling'
import { useProfile } from '../../hooks/useProfile'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  trial:           { label: 'Período de teste',    color: '#2563EB', bg: '#EFF6FF' },
  pending_payment: { label: 'Aguardando pagamento', color: '#D97706', bg: '#FFFBEB' },
  active:          { label: 'Ativa',               color: '#059669', bg: '#F0FDF4' },
  overdue:         { label: 'Inadimplente',         color: '#DC2626', bg: '#FEF2F2' },
  suspended:       { label: 'Suspensa',             color: '#6B7280', bg: '#F3F4F6' },
  trial_expired:   { label: 'Trial expirado',       color: '#6B7280', bg: '#F3F4F6' },
  cancelled:       { label: 'Cancelada',            color: '#6B7280', bg: '#F3F4F6' },
}
const COBR_CFG = {
  PENDING:   { label: 'Pendente', color: '#D97706', bg: '#FFFBEB' },
  RECEIVED:  { label: 'Pago',     color: '#059669', bg: '#F0FDF4' },
  OVERDUE:   { label: 'Vencido',  color: '#DC2626', bg: '#FEF2F2' },
  CANCELLED: { label: 'Cancelado',color: '#6B7280', bg: '#F3F4F6' },
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v ?? 0)
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '—'
}
function daysLeft(d) {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

function Chip({ status, cfg }) {
  const c = cfg[status] || { label: status, color:'#6B7280', bg:'#F3F4F6' }
  return (
    <span style={{ display:'inline-flex', padding:'2px 10px', borderRadius:99,
      fontSize:12, fontWeight:600, color:c.color, background:c.bg }}>
      {c.label}
    </span>
  )
}

// ─── Modal Pix ───────────────────────────────────────────────────────────────
function PixModal({ c, onClose }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(c.pix_copy_paste || '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', borderRadius:16,
        padding:28, width:360, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <strong style={{ fontSize:15 }}>Pagar com Pix</strong>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20, lineHeight:1 }}>×</button>
        </div>
        {c.pix_qr_code_image
          ? <img src={`data:image/png;base64,${c.pix_qr_code_image}`} alt="QR Code" style={{ width:'100%', borderRadius:8, marginBottom:14 }} />
          : <div style={{ padding:32, textAlign:'center', color:'var(--text-muted)', fontSize:13, marginBottom:14 }}>QR Code não disponível.</div>
        }
        {c.pix_copy_paste && (
          <div style={{ background:'var(--surface3)', borderRadius:8, padding:10, fontSize:11,
            fontFamily:'var(--mono)', wordBreak:'break-all', marginBottom:12 }}>
            {c.pix_copy_paste}
          </div>
        )}
        <Button style={{ width:'100%' }} onClick={copy}>
          <Copy size={13} />{copied ? ' Copiado!' : ' Copiar código Pix'}
        </Button>
        <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', marginTop:10, marginBottom:0 }}>
          {fmt(c.valor)} · vencimento {fmtDate(c.vencimento)}
        </p>
      </div>
    </div>
  )
}

// ─── Modal cancelamento ──────────────────────────────────────────────────────
function CancelModal({ onConfirm, onClose, loading }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', borderRadius:16,
        padding:28, width:440, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:18 }}>
          <div style={{ width:38, height:38, borderRadius:9, background:'#FEF2F2',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <AlertTriangle size={18} color="#DC2626" />
          </div>
          <div>
            <strong style={{ fontSize:15 }}>Cancelar assinatura</strong>
            <p style={{ fontSize:13, color:'var(--text-soft)', margin:'4px 0 0' }}>Antes de confirmar, leia com atenção:</p>
          </div>
        </div>
        <div style={{ background:'#FEF2F2', borderRadius:10, padding:14, marginBottom:20, fontSize:13 }}>
          <p style={{ margin:'0 0 6px', fontWeight:600, color:'#DC2626' }}>Isso é uma solicitação, não um cancelamento imediato</p>
          <p style={{ margin:'0 0 6px', color:'var(--text)' }}>
            Sua assinatura <strong>continua ativa normalmente</strong>. Nossa equipe recebe o pedido e entra em
            contato pra confirmar os próximos passos antes de cancelar de fato.
          </p>
          <p style={{ margin:0, color:'var(--text-soft)' }}>
            Nada muda no seu acesso até lá.
          </p>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Voltar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Aguarde…' : 'Confirmar cancelamento'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Tela principal ──────────────────────────────────────────────────────────
export default function Assinatura() {
  const { isAdmin } = useProfile()
  const { tenant, plan, cobrancas, planHistory, userCount, pendingCancellation, loading, saveBillingData, requestCancellation, reload } = useBilling()
  const [pixModal, setPixModal]       = useState(null)
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelling, setCancelling]   = useState(false)
  const [editBilling, setEditBilling] = useState(false)
  const [form, setForm]               = useState({})
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState(null)

  useEffect(() => {
    if (tenant) setForm({
      name:     tenant.billing_name     || '',
      cpf_cnpj: tenant.billing_cpf_cnpj || '',
      email:    tenant.billing_email    || '',
      phone:    tenant.billing_phone    || '',
    })
  }, [tenant])

  if (!isAdmin) return (
    <div style={{ padding:32, color:'var(--text-soft)', fontSize:14 }}>
      Apenas administradores podem gerenciar a assinatura.
    </div>
  )

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const res = await saveBillingData(form)
    setSaving(false)
    if (!res.ok) setMsg({ type:'error', text: res.message })
    else { setMsg({ type:'success', text: 'Dados de cobrança salvos.' }); setEditBilling(false) }
  }

  async function handleCancel() {
    setCancelling(true)
    const res = await requestCancellation()
    setCancelling(false)
    setCancelModal(false)
    setMsg(res.ok
      ? { type:'success', text: 'Solicitação enviada. Nossa equipe vai entrar em contato — sua assinatura continua ativa normalmente até lá.' }
      : { type:'error',   text: res.message }
    )
  }

  const trialDays  = daysLeft(tenant?.trial_ends_at)
  const statusCfg  = STATUS_CFG[tenant?.status] || { label: tenant?.status, color:'#6B7280', bg:'#F3F4F6' }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', maxWidth:820 }}><h2 style={{ fontSize:20, fontWeight:700, margin:'0 0 20px' }}>Assinatura</h2>

      {msg && (
        <div style={{ marginBottom:4, padding:'10px 14px', borderRadius:8, fontSize:13,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background: msg.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          color:      msg.type === 'error' ? '#DC2626' : '#059669' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.6 }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Status ── */}
      <FPESection title="Plano atual">
        {loading ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Carregando…</p> : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontWeight:700, fontSize:18 }}>{plan?.name ?? 'Sem plano'}</span>
                  <Chip status={tenant?.status} cfg={STATUS_CFG} />
                </div>
                <div style={{ fontSize:13, color:'var(--text-soft)', display:'flex', flexDirection:'column', gap:3 }}>
                  {plan && <span style={{ fontSize:15, fontWeight:600, color:'var(--text)' }}>{fmt(plan.value)}<span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)' }}>/mês</span></span>}
                  <span><Users size={13} style={{ marginRight:4, verticalAlign:'middle' }} />{userCount} usuário{userCount !== 1 ? 's' : ''} ativos{plan && <span style={{ color:'var(--text-muted)' }}> · faixa {plan.min_users}–{plan.max_users ?? '∞'}</span>}</span>
                  {tenant?.asaas_next_due_date && <span><Clock size={13} style={{ marginRight:4, verticalAlign:'middle' }} />Próximo vencimento: {fmtDate(tenant.asaas_next_due_date)}</span>}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                {tenant?.status === 'trial' && trialDays !== null && (
                  <span style={{ background:'#EFF6FF', color:'#2563EB', borderRadius:8, padding:'5px 11px', fontSize:12, fontWeight:500 }}>
                    {trialDays > 0 ? `${trialDays} dias restantes de trial` : 'Trial vence hoje'}
                  </span>
                )}
                {pendingCancellation && (
                  <span style={{ background:'#FEF2F2', color:'#DC2626', borderRadius:8, padding:'5px 11px', fontSize:12, fontWeight:500 }}>
                    Cancelamento solicitado — aguardando nossa equipe
                  </span>
                )}
              </div>
            </div>

            {tenant?.status === 'overdue' && tenant.overdue_since && (
              <div style={{ background:'#FEF2F2', borderRadius:8, padding:12, fontSize:13, color:'#DC2626', display:'flex', gap:8 }}>
                <AlertTriangle size={15} style={{ flexShrink:0, marginTop:1 }} />
                Pagamento vencido desde {fmtDate(tenant.overdue_since)}. Você tem {tenant.grace_period_days} dias de carência antes da suspensão.
              </div>
            )}

            {tenant?.status === 'active' && !pendingCancellation && (
              <div style={{ paddingTop:8 }}>
                <button onClick={() => setCancelModal(true)}
                  style={{ fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', padding:0 }}>
                  Solicitar cancelamento
                </button>
              </div>
            )}
          </div>
        )}
      </FPESection>

      {/* ── Dados de cobrança ── */}
      <FPESection title="Dados de cobrança">
        {!editBilling && (
          <div style={{ marginBottom:12 }}>
            <Button size="sm" variant="ghost" onClick={() => setEditBilling(true)}>Editar</Button>
          </div>
        )}
        {editBilling ? (
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { k:'name',     l:'Nome / Razão Social', p:'Nome completo ou razão social' },
              { k:'cpf_cnpj', l:'CPF / CNPJ',          p:'000.000.000-00 ou 00.000.000/0001-00' },
              { k:'email',    l:'E-mail de cobrança',   p:'financeiro@empresa.com' },
              { k:'phone',    l:'Telefone',             p:'(11) 99999-0000' },
            ].map(f => (
              <div key={f.k}>
                <label style={{ fontSize:12, fontWeight:500, color:'var(--text-soft)', display:'block', marginBottom:4 }}>{f.l}</label>
                <input className="fpe-field" value={form[f.k] || ''} placeholder={f.p}
                  onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
              <Button type="button" variant="ghost" onClick={() => setEditBilling(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          </form>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 32px', fontSize:13 }}>
            {[
              ['Nome / Razão Social', tenant?.billing_name],
              ['CPF / CNPJ',          tenant?.billing_cpf_cnpj],
              ['E-mail de cobrança',  tenant?.billing_email],
              ['Telefone',            tenant?.billing_phone],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{label}</div>
                <div style={{ color: val ? 'var(--text)' : 'var(--text-muted)' }}>{val || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </FPESection>

      {/* ── Evolução do plano ── */}
      {planHistory.length > 1 && (
        <FPESection title="Evolução do plano" description="Histórico de mudanças de faixa conforme o número de usuários ativos varia.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {planHistory.map((h, i) => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '10px 0', borderBottom: i < planHistory.length - 1 ? '1px solid var(--border2)' : 'none',
                flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: i === 0 ? 'var(--accent)' : 'var(--border2)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500 }}>{h.plan_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {fmtDate(h.changed_at)}{h.user_count_at != null ? ` · ${h.user_count_at} usuário${h.user_count_at !== 1 ? 's' : ''} ativos` : ''}
                    </div>
                  </div>
                </div>
                <strong style={{ fontSize: 13 }}>{fmt(h.value)}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>/mês</span></strong>
              </div>
            ))}
          </div>
        </FPESection>
      )}

      {/* ── Faturas ── */}
      <FPESection title="Faturas">
        {loading ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Carregando…</p>
        : cobrancas.length === 0
          ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Nenhuma fatura ainda.</p>
          : cobrancas.map((c, i) => (
            <div key={c.id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
              padding:'11px 0', borderBottom: i < cobrancas.length - 1 ? '1px solid var(--border2)' : 'none',
              flexWrap:'wrap',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:34, height:34, borderRadius:8, background:'var(--surface3)',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <FileText size={15} color="var(--text-soft)" />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>Fatura — {fmtDate(c.vencimento)}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                    {c.tipo}{c.payment_date ? ` · Pago em ${fmtDate(c.payment_date)}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <strong style={{ fontSize:13 }}>{fmt(c.valor)}</strong>
                <Chip status={c.status} cfg={COBR_CFG} />
                {c.status === 'PENDING' && c.pix_copy_paste && (
                  <Button size="sm" onClick={() => setPixModal(c)}>
                    <QrCode size={13} /> Pagar
                  </Button>
                )}
                {c.invoice_url && (
                  <a href={c.invoice_url} target="_blank" rel="noreferrer"
                    style={{ fontSize:12, color:'var(--accent)' }}>Ver fatura</a>
                )}
              </div>
            </div>
          ))
        }
      </FPESection>

      {pixModal    && <PixModal c={pixModal} onClose={() => setPixModal(null)} />}
      {cancelModal && <CancelModal onConfirm={handleCancel} onClose={() => setCancelModal(false)} loading={cancelling} />}
    </div>
  )
}
