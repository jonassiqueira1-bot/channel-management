import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logoBoostly from '../assets/logo-boostly.svg'

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function Signup() {
  const navigate = useNavigate()

  const [step, setStep]       = useState(1) // 1 = organização, 2 = admin
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Step 1
  const [orgName, setOrgName] = useState('')

  // Step 2
  const [nome, setNome]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8)  { setError('A senha deve ter pelo menos 8 caracteres.'); return }

    setError('')
    setLoading(true)

    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome } },
      })
      if (authErr) throw new Error(authErr.message)
      const userId = authData.user?.id
      if (!userId) throw new Error('Erro ao criar usuário.')

      // 2. Criar tenant
      const slug = slugify(orgName) + '-' + Math.random().toString(36).slice(2, 6)
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({ name: orgName, slug, plan: 'trial', status: 'active' })
        .select()
        .single()
      if (tenantErr) throw new Error(tenantErr.message)

      // 3. Criar branch matriz
      const { data: branch, error: branchErr } = await supabase
        .from('tenant_branches')
        .insert({ tenant_id: tenant.id, name: orgName + ' (Matriz)', code: 'MATRIZ', status: 'active' })
        .select()
        .single()
      if (branchErr) throw new Error(branchErr.message)

      // 4. Criar perfil do admin
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id:        userId,
          tenant_id: tenant.id,
          branch_id: branch.id,
          role:      'admin_isv',
          nome,
          status:    'ativo',
        })
      if (profileErr) throw new Error(profileErr.message)

      // 5. Popular seed do tenant
      const { error: seedErr } = await supabase.rpc('seed_tenant', {
        p_tenant_id: tenant.id,
        p_branch_id: branch.id,
      })
      if (seedErr) throw new Error(seedErr.message)

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      {/* Painel esquerdo */}
      <div style={s.left}>
        <div style={s.leftInner}>
          <img src={logoBoostly} alt="Boostly" style={{ height: 44, width: 'auto' }} />
          <div style={s.heroText}>
            <h1 style={s.heroTitle}>Comece em minutos, sem cartão de crédito.</h1>
            <p style={s.heroSub}>Crie sua conta e tenha pipeline, parceiros e comissões funcionando hoje.</p>
          </div>
          <div style={s.pillars}>
            {[
              { icon: '◈', label: 'Configuração rápida', desc: 'Funis e perfis prontos no primeiro acesso' },
              { icon: '◎', label: '14 dias grátis',       desc: 'Sem limitações, cancele quando quiser' },
              { icon: '◉', label: 'Suporte incluído',     desc: 'Chat disponível direto na plataforma' },
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
          {/* Steps indicator */}
          <div style={s.steps}>
            <div style={{ ...s.stepDot, background: '#4F7FE8' }}>1</div>
            <div style={{ ...s.stepLine, background: step === 2 ? '#4F7FE8' : 'rgba(255,255,255,0.1)' }} />
            <div style={{ ...s.stepDot, background: step === 2 ? '#4F7FE8' : 'rgba(255,255,255,0.15)', color: step === 2 ? '#fff' : 'rgba(255,255,255,0.4)' }}>2</div>
          </div>

          <h2 style={s.formTitle}>
            {step === 1 ? 'Sua organização' : 'Seu acesso'}
          </h2>
          <p style={s.formSub}>
            {step === 1
              ? 'Como se chama a empresa que vai usar o Boostly?'
              : 'Dados do administrador da conta.'}
          </p>

          <form onSubmit={handleSubmit} style={s.form}>
            {step === 1 && (
              <div style={s.field}>
                <label style={s.label}>Nome da empresa</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="Ex: Acme Tecnologia"
                  required
                  autoFocus
                  style={s.input}
                />
              </div>
            )}

            {step === 2 && (
              <>
                <div style={s.field}>
                  <label style={s.label}>Seu nome</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Nome completo"
                    required
                    autoFocus
                    style={s.input}
                  />
                </div>
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
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    style={s.input}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Confirmar senha</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={s.input}
                  />
                </div>
              </>
            )}

            {error && <p style={s.error}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => { setStep(1); setError('') }}
                  style={s.btnSecondary}
                >
                  Voltar
                </button>
              )}
              <button type="submit" disabled={loading} style={{ ...s.button, flex: 1 }}>
                {loading ? 'Criando conta…' : step === 1 ? 'Continuar →' : 'Criar minha conta'}
              </button>
            </div>

            <p style={s.login}>
              Já tem conta?{' '}
              <Link to="/login" style={{ color: '#4F7FE8' }}>Entrar</Link>
            </p>
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
  heroText: { display: 'flex', flexDirection: 'column', gap: 14 },
  heroTitle: {
    margin: 0, fontSize: 28, fontWeight: 700,
    color: '#fff', lineHeight: 1.25, letterSpacing: '-0.5px',
  },
  heroSub: {
    margin: 0, fontSize: 15,
    color: 'rgba(255,255,255,0.5)', lineHeight: 1.65,
  },
  pillars:  { display: 'flex', flexDirection: 'column', gap: 20 },
  pillar:   { display: 'flex', alignItems: 'flex-start', gap: 14 },
  pillarIcon:  { fontSize: 20, color: '#4F7FE8', lineHeight: 1.2, flexShrink: 0 },
  pillarLabel: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 },
  pillarDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 },
  right: {
    backgroundColor: '#161B27',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '48px',
  },
  formWrap: { width: '100%', maxWidth: 380 },
  steps: {
    display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  stepLine: {
    flex: 1, height: 2, margin: '0 8px',
  },
  formTitle: {
    margin: '0 0 8px', fontSize: 22, fontWeight: 700,
    color: '#fff', letterSpacing: '-0.3px',
  },
  formSub: {
    margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5,
  },
  form:  { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontSize: 12, fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    fontFamily: 'var(--mono)',
  },
  input: {
    padding: '11px 14px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: 'var(--font)',
  },
  error: {
    color: '#f87171', fontSize: 13, margin: 0,
    padding: '10px 12px', background: 'rgba(220,38,38,0.1)',
    borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)',
  },
  button: {
    padding: '12px',
    background: 'linear-gradient(135deg, #4F7FE8, #2B52C8)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  btnSecondary: {
    padding: '12px 20px',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, fontSize: 15, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'var(--font)',
  },
  login: {
    textAlign: 'center', fontSize: 13,
    color: 'rgba(255,255,255,0.35)', margin: 0,
  },
}
