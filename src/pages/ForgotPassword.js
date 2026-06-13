import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço.')
    } else {
      setSent(true)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoMark}>CM</div>
          <h1 style={styles.title}>Recuperar senha</h1>
          <p style={styles.subtitle}>
            {sent
              ? 'Verifique sua caixa de entrada.'
              : 'Digite seu e-mail e enviaremos um link para redefinir sua senha.'}
          </p>
        </div>

        {sent ? (
          <div style={styles.successBox}>
            ✉️ Link enviado para <strong>{email}</strong>. Verifique também a pasta de spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                required
                style={styles.input}
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Enviando…' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        <Link to="/login" style={styles.back}>← Voltar para o login</Link>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#F0EDE8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 24px rgba(15,27,45,0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logoMark: {
    width: 48,
    height: 48,
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f1b2d',
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: 0,
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
    padding: '10px 14px',
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    fontFamily: 'inherit',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    margin: 0,
    padding: '10px 12px',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    color: '#166534',
    fontSize: 14,
    padding: '14px 16px',
    borderRadius: 8,
    marginBottom: 24,
    lineHeight: 1.5,
  },
  button: {
    padding: '12px',
    backgroundColor: '#1E3A5F',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 4,
  },
  back: {
    display: 'block',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    color: '#6b7280',
  },
}
