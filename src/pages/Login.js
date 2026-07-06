import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import logoBoostly from '../assets/logo-boostly.svg'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [inviteMode, setInviteMode] = useState(false)
  const { signIn }  = useAuth()
  const navigate    = useNavigate()

  // Detecta fluxo de convite pelo hash da URL
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setInviteMode(true)
      // Supabase já processa o token do hash automaticamente via onAuthStateChange
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (inviteMode) {
      // Define a senha para o usuário convidado (já está autenticado via token do hash)
      const { error } = await supabase.auth.updateUser({ password })
      setLoading(false)
      if (error) setError('Erro ao definir senha: ' + error.message)
      else navigate('/dashboard')
    } else {
      const { error } = await signIn(email, password)
      setLoading(false)
      if (error) setError('E-mail ou senha inválidos.')
      else navigate('/dashboard')
    }
  }

  return (
    <div style={s.page}>
      {/* Painel esquerdo */}
      <div style={s.left}>
        <div style={s.leftInner}>
          <img src={logoBoostly} alt="Boostly" style={{ height: 44, width: 'auto' }} />

          <div style={s.heroText}>
            <h1 style={s.heroTitle}>Impulsione seu canal de parceiros.</h1>
            <p style={s.heroSub}>Gerencie revendas, franquias e times de vendas — do pipeline ao pagamento, em um só lugar.</p>
          </div>

          <div style={s.pillars}>
            {[
              { icon: '◈', label: 'Pipeline', desc: 'Oportunidades em tempo real' },
              { icon: '◎', label: 'Comissões', desc: 'Cálculo e pagamento automatizados' },
              { icon: '◉', label: 'Parceiros', desc: 'Visibilidade total da rede' },
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
          <h2 style={s.formTitle}>{inviteMode ? 'Crie sua senha' : 'Acesse sua conta'}</h2>
          {inviteMode && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Você foi convidado para o portal. Defina uma senha para ativar seu acesso.
            </p>
          )}

          <form onSubmit={handleSubmit} style={s.form}>
            {!inviteMode && (
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
            )}

            <div style={s.field}>
              <label style={s.label}>{inviteMode ? 'Nova senha' : 'Senha'}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={inviteMode ? 8 : undefined}
                style={s.input}
              />
              {inviteMode && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Mínimo 8 caracteres
                </span>
              )}
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button type="submit" disabled={loading} style={s.button}>
              {loading ? (inviteMode ? 'Salvando…' : 'Entrando…') : (inviteMode ? 'Ativar acesso' : 'Entrar')}
            </button>

            {!inviteMode && <Link to="/forgot-password" style={s.forgot}>Esqueci minha senha</Link>}
          </form>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    backgroundColor: '#0D1117',
  },
  left: {
    background: 'linear-gradient(145deg, #1b2d4e, #0f1c33)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
  },
  leftInner: {
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 48,
  },
  heroText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  heroTitle: {
    margin: 0,
    fontSize: 30,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.25,
    letterSpacing: '-0.5px',
  },
  heroSub: {
    margin: 0,
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.65,
  },
  pillars: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  pillar: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
  },
  pillarIcon: {
    fontSize: 20,
    color: '#4F7FE8',
    lineHeight: 1.2,
    flexShrink: 0,
  },
  pillarLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    marginBottom: 2,
  },
  pillarDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 1.4,
  },
  right: {
    backgroundColor: '#161B27',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
  },
  formWrap: {
    width: '100%',
    maxWidth: 380,
  },
  formTitle: {
    margin: '0 0 32px',
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily: 'var(--mono)',
  },
  input: {
    padding: '11px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'var(--font)',
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    margin: 0,
    padding: '10px 12px',
    background: 'rgba(220,38,38,0.1)',
    borderRadius: 8,
    border: '1px solid rgba(220,38,38,0.2)',
  },
  button: {
    padding: '12px',
    background: 'linear-gradient(135deg, #4F7FE8, #2B52C8)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    fontFamily: 'var(--font)',
  },
  forgot: {
    display: 'block',
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
}
