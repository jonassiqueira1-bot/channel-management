const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const adminKey = req.headers['x-admin-key']
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { nome, admin_email, admin_nome } = req.body
  if (!nome || !admin_email) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, admin_email' })
  }

  let userId = null
  let tenantId = null

  try {
    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: admin_email,
      email_confirm: true,
      user_metadata: { nome: admin_nome || admin_email.split('@')[0] },
    })
    if (authError) return res.status(400).json({ error: `Erro ao criar usuário: ${authError.message}` })
    userId = authData.user.id

    // 2. Criar tenant
    const { data: tenantData, error: tenantError } = await supabase.from('tenants').insert({
      name: nome,
      slug: slugify(nome),
      plan: 'pro',
      status: 'active',
      created_at: new Date().toISOString(),
    }).select('id').single()
    if (tenantError) {
      await supabase.auth.admin.deleteUser(userId)
      return res.status(400).json({ error: `Erro ao criar tenant: ${tenantError.message}` })
    }
    tenantId = tenantData.id

    // 3. Criar empresa principal em companies
    const { error: companyError } = await supabase.from('companies').insert({
      tenant_id: tenantId,
      nome_fantasia: nome,
      razao_social: nome,
    })
    if (companyError) {
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('tenants').delete().eq('id', tenantId)
      return res.status(400).json({ error: `Erro ao criar empresa: ${companyError.message}` })
    }

    // 4. Criar perfil do admin
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      nome: admin_nome || admin_email.split('@')[0],
      email: admin_email,
      papel: 'admin_isv',
      role: 'admin_isv',
      tenant_id: tenantId,
      status: 'ativo',
    })
    if (profileError) {
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('tenants').delete().eq('id', tenantId)
      return res.status(400).json({ error: `Erro ao criar perfil: ${profileError.message}` })
    }

    // 5. Enviar magic link de primeiro acesso
    await supabase.auth.admin.generateLink({ type: 'magiclink', email: admin_email })

    return res.status(201).json({
      ok: true,
      tenant_id: tenantId,
      admin_email,
      login_url: process.env.APP_URL || 'https://canaisng.vercel.app',
      message: `Tenant "${nome}" criado. Email de acesso enviado para ${admin_email}.`,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}
