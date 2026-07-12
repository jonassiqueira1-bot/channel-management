import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logoBoostly from '../assets/logo-boostly.svg'
import { getDefaultRoute } from '../data/mockPerfis'

export default function ResetPassword() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [ready, setReady]         = useState(false)
  const [done, setDone]           = useState(false)
  const navigate = useNavigate()

  // Supabase processa o hash automaticamente e dispara onAuthStateChange
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6)  { setError('A senha deve ter pelo menos 6 caracteres.'); return }

    setError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Erro ao redefinir senha: ' + error.message)
    } else {
      setDone(true)
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
      setTimeout(() => navigate(getDefaultRoute(perfil?.role)), 2000)
    }
  }

  return (
    <div style={s.page} className="login-page">
      <div style={s.left} className="login-left">
        <div style={s.leftInner}>
          <img src={logoBoostly} alt="Boostly" style={{ height: 44, width: 'auto' }} />
          <div style={s.heroText}>
            <h1 style={s.heroTitle}>Crie uma nova senha.</h1>
            <p style={s.heroSub}>Escolha uma senha segura para proteger seu acesso ao Boostly.</p>
          </div>
          <div style={s.pillars}>
            {[
              { icon: '🔒', label: 'Seguro', desc: 'Senha criptografada' },
              { icon: '✓',  label: 'Simples', desc: 'Um passo e pronto' },
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

      <div style={s.right}>
        <div style={s.formWrap}>
          <h2 style={s.formTitle}>Redefinir senha</h2>

          {done ? (
            <div style={s.successBox}>
              <span style={s.successIcon}>✅</span>
              <div>
                <p style={s.successTitle}>Senha redefinida!</p>
                <p style={s.successText}>Redirecionando para o painel…</p>
              </div>
            </div>
          ) : !ready ? (
            <p style={s.formSub}>Verificando link de recuperação…</p>
          ) : (
            <>
              <p style={s.formSub}>Defina uma nova senha para sua conta.</p>
              <form onSubmit={handleSubmit} style={s.form}>
                <div style={s.field}>
                  <label style={s.label}>Nova senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    style={s.input}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Confirmar senha</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    style={s.input}
                  />
                </div>

                {error && <p style={s.error}>{error}</p>}

                <button type="submit" disabled={loading} style={s.button}>
                  {loading ? 'Salvando…' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  left: { flex: '0 0 420px', background: 'linear-gradient(160deg, #0f1b2d 0%, #1E3A5F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' },
  leftInner: { display: 'flex', flexDirection: 'column', gap: 40, maxWidth: 320 },
  heroText: { display: 'flex', flexDirection: 'column', gap: 10 },
  heroTitle: { fontSize: 28, fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.2 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.6 },
  pillars: { display: 'flex', flexDirection: 'column', gap: 18 },
  pillar: { display: 'flex', alignItems: 'center', gap: 14 },
  pillarIcon: { fontSize: 20, width: 40, height: 40, background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pillarLabel: { fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 2 },
  pillarDesc: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  right: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', background: '#f9fafb' },
  formWrap: { width: '100%', maxWidth: 400 },
  formTitle: { fontSize: 24, fontWeight: 700, color: '#0f1b2d', margin: '0 0 8px' },
  formSub: { fontSize: 14, color: '#6b7280', margin: '0 0 28px', lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: { padding: '11px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#111827', outline: 'none', fontFamily: 'inherit', background: '#ffffff' },
  error: { color: '#dc2626', fontSize: 13, margin: 0, padding: '10px 12px', backgroundColor: '#fef2f2', borderRadius: 8 },
  button: { padding: '13px', background: 'linear-gradient(135deg, #1E3A5F 0%, #2B52C8 100%)', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 },
  successBox: { display: 'flex', alignItems: 'flex-start', gap: 14, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '18px 20px' },
  successIcon: { fontSize: 22, flexShrink: 0 },
  successTitle: { fontWeight: 700, color: '#166534', margin: '0 0 4px', fontSize: 15 },
  successText: { color: '#166534', margin: 0, fontSize: 14 },
}
