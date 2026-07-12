import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logoBoostly from '../assets/logo-boostly.svg'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.functions.invoke('forgot-password', {
      body: { email },
    })
    setLoading(false)
    if (error) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço.')
    } else {
      setSent(true)
    }
  }

  return (
    <div style={s.page} className="login-page">
      {/* Painel esquerdo */}
      <div style={s.left} className="login-left">
        <div style={s.leftInner}>
          <img src={logoBoostly} alt="Boostly" style={{ height: 44, width: 'auto' }} />

          <div style={s.heroText}>
            <h1 style={s.heroTitle}>Recupere seu acesso.</h1>
            <p style={s.heroSub}>Enviaremos um link seguro para redefinir sua senha em instantes.</p>
          </div>

          <div style={s.pillars}>
            {[
              { icon: '🔒', label: 'Seguro', desc: 'Link com validade de 1 hora' },
              { icon: '📨', label: 'Rápido', desc: 'Email enviado imediatamente' },
              { icon: '✓',  label: 'Simples', desc: 'Sem burocracia, sem suporte' },
            ].map(p => (
              <div key={p.label} style={s.pillar}>
                <span style={s.pillarIcon}>{p.icon}</span>
                <div>
                  <div style={s.pillarLabel}>{p.label}</div>
                  <div style={s.pillarDesc}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito */}
      <div style={s.right}>
        <div style={s.formWrap}>
          <h2 style={s.formTitle}>Recuperar senha</h2>

          {sent ? (
            <>
              <div style={s.successBox}>
                <span style={s.successIcon}>✉️</span>
                <div>
                  <p style={s.successTitle}>Link enviado!</p>
                  <p style={s.successText}>
                    Verifique a caixa de entrada de <strong>{email}</strong>. Cheque também a pasta de spam.
                  </p>
                </div>
              </div>
              <Link to="/login" style={s.back}>← Voltar para o login</Link>
            </>
          ) : (
            <>
              <p style={s.formSub}>
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit} style={s.form}>
                <div style={s.field}>
                  <label style={s.label}>E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
                    required
                    style={s.input}
                  />
                </div>

                {error && <p style={s.error}>{error}</p>}

                <button type="submit" disabled={loading} style={s.button}>
                  {loading ? 'Enviando…' : 'Enviar link de recuperação'}
                </button>
              </form>

              <Link to="/login" style={s.back}>← Voltar para o login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  left: {
    flex: '0 0 420px',
    background: 'linear-gradient(160deg, #0f1b2d 0%, #1E3A5F 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
  },
  leftInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 40,
    maxWidth: 320,
  },
  heroText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
    lineHeight: 1.2,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    margin: 0,
    lineHeight: 1.6,
  },
  pillars: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  pillar: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  pillarIcon: {
    fontSize: 20,
    width: 40,
    height: 40,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pillarLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: 2,
  },
  pillarDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
    background: '#f9fafb',
  },
  formWrap: {
    width: '100%',
    maxWidth: 400,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f1b2d',
    margin: '0 0 8px',
  },
  formSub: {
    fontSize: 14,
    color: '#6b7280',
    margin: '0 0 28px',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    padding: '11px 14px',
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    fontFamily: 'inherit',
    background: '#ffffff',
    transition: 'border-color 0.15s',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    margin: 0,
    padding: '10px 12px',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  button: {
    padding: '13px',
    background: 'linear-gradient(135deg, #1E3A5F 0%, #2B52C8 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 4,
    transition: 'opacity 0.15s',
  },
  successBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '18px 20px',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 22,
    flexShrink: 0,
  },
  successTitle: {
    fontWeight: 700,
    color: '#166534',
    margin: '0 0 4px',
    fontSize: 15,
  },
  successText: {
    color: '#166534',
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
  },
  back: {
    display: 'block',
    marginTop: 24,
    fontSize: 13,
    color: '#6b7280',
    textDecoration: 'none',
  },
}
