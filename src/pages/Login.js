import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ROLES = [
  { id: 'isv', label: 'ISV Admin' },
  { id: 'canal', label: 'Canal' },
  { id: 'vendedor', label: 'Vendedor' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('isv')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('E-mail ou senha inválidos.')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={s.page}>
      {/* Left panel */}
      <div style={s.left}>
        <div style={s.leftInner}>
          <div style={s.brand}>
            <div style={s.logoMark}>CN</div>
            <span style={s.brandName}>Canais NG</span>
          </div>

          <div style={s.heroText}>
            <h1 style={s.heroTitle}>Gestão de canais indiretos, do jeito certo.</h1>
            <p style={s.heroSub}>Visibilidade total sobre franquias, unidades e vendedores — em uma só plataforma.</p>
          </div>

          <div style={s.stats}>
            {[
              { label: 'Franquias ativas', value: '247' },
              { label: 'Receita gerenciada', value: 'R$ 18M' },
              { label: 'Vendedores', value: '1.340' },
            ].map(stat => (
              <div key={stat.label} style={s.stat}>
                <span style={s.statValue}>{stat.value}</span>
                <span style={s.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={s.right}>
        <div style={s.formWrap}>
          <h2 style={s.formTitle}>Entrar na plataforma</h2>
          <p style={s.formSub}>Acesse sua conta para continuar</p>

          {/* Role pills */}
          <div style={s.pills}>
            {ROLES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                style={{ ...s.pill, ...(role === r.id ? s.pillActive : {}) }}
              >
                {r.label}
              </button>
            ))}
          </div>

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

            <div style={s.field}>
              <label style={s.label}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={s.input}
              />
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button type="submit" disabled={loading} style={s.button}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>

            <Link to="/forgot-password" style={s.forgot}>
              Esqueci minha senha
            </Link>
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
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 40,
    height: 40,
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 10,
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--mono)',
  },
  brandName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.3px',
  },
  heroText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  heroTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.3,
    letterSpacing: '-0.5px',
  },
  heroSub: {
    margin: 0,
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.6,
  },
  stats: {
    display: 'flex',
    gap: 32,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    fontFamily: 'var(--mono)',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily: 'var(--mono)',
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
    margin: '0 0 4px',
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  formSub: {
    margin: '0 0 28px',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  pills: {
    display: 'flex',
    gap: 8,
    marginBottom: 28,
  },
  pill: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'var(--font)',
  },
  pillActive: {
    background: 'rgba(30,58,95,0.6)',
    borderColor: 'rgba(46,80,144,0.6)',
    color: '#fff',
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
    background: '#1E3A5F',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    fontFamily: 'var(--font)',
    transition: 'background 0.15s',
  },
  forgot: {
    display: 'block',
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
}
