import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, QrCode, Copy, Users, Shield, Zap } from 'lucide-react'
import { useBilling } from '../hooks/useBilling'
import { useProfile } from '../hooks/useProfile'
import Button from '../components/Button'

function fmt(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0)
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function ConfirmarAssinatura() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const { tenant, plan, cobrancas, userCount, loading, saveBillingData, reload } = useBilling()
  const [step, setStep] = useState('form') // 'form' | 'pix'
  const [form, setForm] = useState({ name:'', cpf_cnpj:'', email:'', phone:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Redireciona se já está ativo
  useEffect(() => {
    if (tenant && tenant.status === 'active') navigate('/dashboard', { replace: true })
  }, [tenant, navigate])

  // Pré-preenche com dados existentes
  useEffect(() => {
    if (tenant) {
      setForm({
        name:     tenant.billing_name     || profile?.nome || '',
        cpf_cnpj: tenant.billing_cpf_cnpj || '',
        email:    tenant.billing_email    || profile?.email || '',
        phone:    tenant.billing_phone    || profile?.phone || '',
      })
    }
  }, [tenant, profile])

  // Fatura pendente (já gerada)
  const faturaPendente = cobrancas.find(c => c.status === 'PENDING')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.cpf_cnpj || !form.email) {
      setError('Preencha nome, CPF/CNPJ e e-mail.')
      return
    }
    setSaving(true)
    setError(null)
    const res = await saveBillingData(form)
    setSaving(false)
    if (!res.ok) { setError(res.message); return }
    await reload()
    // Se já existe fatura pendente, vai direto para o Pix
    if (faturaPendente) setStep('pix')
    else setStep('pix') // a fatura será gerada pelo CRON — mostra mensagem de aguardo
  }

  function copyPix() {
    navigator.clipboard.writeText(faturaPendente?.pix_copy_paste || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const trialDaysLeft = tenant?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at) - new Date()) / 86400000))
    : null

  return (
    <div style={{ minHeight:'100vh', background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:520 }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg, #4F7FE8, #2B52C8)',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px',
            boxShadow:'0 4px 14px rgba(37,99,235,0.3)' }}>
            <span style={{ color:'#fff', fontWeight:800, fontSize:22, fontFamily:'var(--font)' }}>B</span>
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 6px' }}>
            {step === 'form' ? 'Confirmar assinatura' : 'Pagar com Pix'}
          </h1>
          <p style={{ fontSize:13, color:'var(--text-soft)', margin:0 }}>
            {step === 'form'
              ? 'Preencha os dados de cobrança para ativar sua assinatura'
              : 'Escaneie o QR Code ou copie o código Pix'}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>Carregando…</div>
        ) : step === 'form' ? (
          <div style={{ background:'var(--surface)', borderRadius:16, padding:28, boxShadow:'0 2px 16px rgba(0,0,0,0.06)' }}>
            {/* Resumo do plano */}
            {plan && (
              <div style={{ background:'var(--surface3)', borderRadius:10, padding:16, marginBottom:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontWeight:600, fontSize:15 }}>Plano {plan.name}</span>
                  <span style={{ fontWeight:700, fontSize:16, color:'var(--accent)' }}>{fmt(plan.value)}<span style={{ fontWeight:400, fontSize:12, color:'var(--text-muted)' }}>/mês</span></span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-soft)', display:'flex', gap:16 }}>
                  <span><Users size={12} style={{ marginRight:4 }} />{userCount} usuários ativos</span>
                  <span>{plan.min_users}–{plan.max_users ?? '∞'} usuários inclusos</span>
                </div>
                {trialDaysLeft !== null && trialDaysLeft > 0 && (
                  <div style={{ marginTop:10, fontSize:12, color:'#2563EB', fontWeight:500 }}>
                    ⏱ {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''} de trial gratuito
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { key:'name',     label:'Nome / Razão Social *', placeholder:'Nome completo ou razão social' },
                { key:'cpf_cnpj', label:'CPF / CNPJ *',          placeholder:'000.000.000-00 ou 00.000.000/0001-00' },
                { key:'email',    label:'E-mail de cobrança *',   placeholder:'financeiro@empresa.com' },
                { key:'phone',    label:'Telefone (WhatsApp)',     placeholder:'(11) 99999-0000' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:12, fontWeight:500, color:'var(--text-soft)', display:'block', marginBottom:4 }}>{f.label}</label>
                  <input className="fpe-field" value={form[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}

              {error && <p style={{ fontSize:12, color:'#DC2626', margin:0 }}>{error}</p>}

              <Button type="submit" disabled={saving} style={{ marginTop:4 }}>
                {saving ? 'Processando…' : 'Continuar para pagamento'}
              </Button>
            </form>

            {/* Garantias */}
            <div style={{ display:'flex', gap:16, marginTop:20, paddingTop:20, borderTop:'1px solid var(--border)' }}>
              {[
                { Icon: Shield, text: 'Pagamento seguro via Pix' },
                { Icon: Zap,    text: 'Ativação imediata após pagamento' },
                { Icon: CheckCircle2, text: 'Cancele quando quiser' },
              ].map(({ Icon, text }) => (
                <div key={text} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' }}>
                  <Icon size={16} color="var(--accent)" />
                  <span style={{ fontSize:11, color:'var(--text-soft)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

        ) : (
          // Step Pix
          <div style={{ background:'var(--surface)', borderRadius:16, padding:28, boxShadow:'0 2px 16px rgba(0,0,0,0.06)' }}>
            {faturaPendente ? (
              <>
                {faturaPendente.pix_qr_code_image && (
                  <img src={`data:image/png;base64,${faturaPendente.pix_qr_code_image}`}
                    alt="QR Code Pix" style={{ width:'100%', maxWidth:280, display:'block', margin:'0 auto 20px', borderRadius:8 }} />
                )}
                <div style={{ background:'var(--surface3)', borderRadius:8, padding:12, fontSize:11,
                  fontFamily:'var(--mono)', wordBreak:'break-all', marginBottom:14, lineHeight:1.6 }}>
                  {faturaPendente.pix_copy_paste}
                </div>
                <Button onClick={copyPix} style={{ width:'100%', marginBottom:12 }}>
                  <Copy size={14} /> {copied ? 'Copiado!' : 'Copiar código Pix'}
                </Button>
                <p style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', margin:'0 0 20px' }}>
                  {fmt(faturaPendente.valor)} · vencimento {fmtDate(faturaPendente.vencimento)}
                </p>
                <div style={{ background:'#F0FDF4', borderRadius:8, padding:12, fontSize:12, color:'#059669', display:'flex', gap:8, alignItems:'flex-start' }}>
                  <CheckCircle2 size={14} style={{ flexShrink:0, marginTop:1 }} />
                  <span>Após o pagamento, sua conta será ativada automaticamente em alguns minutos.</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <CheckCircle2 size={40} color="#059669" style={{ marginBottom:12 }} />
                <p style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Dados salvos com sucesso!</p>
                <p style={{ fontSize:13, color:'var(--text-soft)' }}>
                  Sua fatura será gerada em instantes. Você receberá o Pix por e-mail em <strong>{form.email}</strong>.
                </p>
                <Button onClick={() => navigate('/dashboard')} style={{ marginTop:20 }}>
                  Ir para o sistema
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
