import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logoBoostly from '../assets/logo-boostly.svg'
import { getDefaultRoute } from '../data/mockPerfis'

export default function AceitarConvite() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [ready, setReady]         = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Verifica erro no hash (Supabase implicit flow redireciona erros no hash)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const hashError = hash.get('error_description') || hash.get('error')
    if (hashError) {
      setError('Link inválido ou expirado. Peça ao administrador para reenviar o convite.')
      return
    }

    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type      = params.get('type') // 'invite' ou 'recovery'

    if (tokenHash) {
      // PKCE flow: troca o token_hash por sessão
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: type || 'invite' })
        .then(({ data, error }) => {
          if (error) setError('Link inválido ou expirado: ' + error.message)
          else if (data?.session) setReady(true)
        })
    } else {
      // Implicit flow: sessão vem via hash fragment (#access_token=...)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true)
        } else {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) { setReady(true); subscription.unsubscribe() }
          })
          return () => subscription.unsubscribe()
        }
      })
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8)  { setError('Mínimo 8 caracteres.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setLoading(false); setError('Erro ao definir senha: ' + error.message); return }
    // Conclui o onboarding: só transiciona status 'pendente' -> 'ativo' (não
    // reativa quem foi desativado por um admin — ver completar_onboarding()).
    await supabase.rpc('completar_onboarding')
    setLoading(false)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single()
    navigate(getDefaultRoute(perfil?.role))
  }

  const s = {
    page:     { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' },
    card:     { width: '100%', maxWidth: 400, padding: '40px 36px', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
    logo:     { height: 36, marginBottom: 28 },
    title:    { fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' },
    sub:      { fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 },
    field:    { marginBottom: 16 },
    label:    { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 },
    input:    { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' },
    button:   { width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
    error:    { fontSize: 12, color: '#DC2626', marginTop: 8 },
    spinner:  { textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '60px 0' },
  }

  if (!ready) return (
    <div style={s.page}>
      <div style={s.spinner}>
        {error
          ? <span style={{ color: '#DC2626' }}>{error}</span>
          : 'Verificando convite…'
        }
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.card}>
        <img src={logoBoostly} alt="Boostly" style={s.logo} />
        <h1 style={s.title}>Crie sua senha</h1>
        <p style={s.sub}>Defina uma senha para ativar seu acesso ao portal.</p>

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Nova senha</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirmar senha</label>
            <input style={s.input} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required />
          </div>
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" style={s.button} disabled={loading}>
            {loading ? 'Salvando…' : 'Ativar acesso'}
          </button>
        </form>
      </div>
    </div>
  )
}
