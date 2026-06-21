import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MOCK_COMPANIES } from '../data/mockCompanies'
import { PAPEIS_CONFIG } from '../data/mockPerfis'

// Mesmo padrão do ProtectedRoute — lê do sessionStorage para sobreviver a navegações internas
const IS_DEV = process.env.NODE_ENV === 'development'
if (IS_DEV && new URLSearchParams(window.location.search).get('dev') === '1') {
  sessionStorage.setItem('dev_bypass', '1')
}
const DEV_BYPASS = IS_DEV && sessionStorage.getItem('dev_bypass') === '1'

const DEV_PROFILE = {
  id:           'u1',
  nome:         'Lucas Ferreira',
  email:        'lucas@ngi.com.br',
  phone:        '(11) 98888-7777',
  avatar_url:   null,
  avatar:       'LF',
  cargo:        'Diretor Comercial',
  papel:        'admin_isv',
  tipo_usuario: 'interno',
  empresa_id:   'a0000000-0000-0000-0000-000000000001',
  tenant_id:    'a0000000-0000-0000-0000-000000000001',
  status:       'ativo',
}

function initials(nome) {
  if (!nome) return '?'
  return nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function useProfile() {
  const { session } = useAuth()
  const [profile,    setProfile]    = useState(null)
  const [company,    setCompany]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // ── Carregar perfil ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null)

    if (DEV_BYPASS) {
      // Dev: retorna mock imediatamente
      setProfile(DEV_PROFILE)
      setCompany(MOCK_COMPANIES.find(c => c.id === DEV_PROFILE.empresa_id) || null)
      setLoading(false)
      return
    }

    if (!session?.user) { setLoading(false); return }

    try {
      // 1. Perfil
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profErr) {
        // Perfil não encontrado — usa fallback mínimo sem dados mock
        const fallback = {
          id:           session.user.id,
          nome:         session.user.email?.split('@')[0] || 'Usuário',
          email:        session.user.email,
          avatar:       initials(session.user.email?.split('@')[0] || 'U'),
          papel:        'admin_isv',
          role:         'admin_isv',
          tenant_id:    null,
          branch_id:    null,
          status:       'ativo',
        }
        setProfile(fallback)
        setLoading(false)
        return
      }

      const hydrated = {
        ...prof,
        email:  session.user.email,
        avatar: initials(prof.nome),
        papel:  prof.role || prof.papel || 'admin_isv',
      }
      setProfile(hydrated)

      // 2. Empresa
      if (prof.empresa_id || prof.company_id) {
        const empresaId = prof.empresa_id || prof.company_id
        const { data: comp } = await supabase
          .from('companies')
          .select('*')
          .eq('id', empresaId)
          .single()
        setCompany(comp || null)
      }
    } catch (e) {
      setError(e.message || 'Erro ao carregar perfil.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  // ── Salvar dados pessoais ─────────────────────────────────────────────────
  const saveProfile = useCallback(async (patch) => {
    if (DEV_BYPASS) {
      const updated = { ...profile, ...patch, avatar: initials(patch.nome || profile.nome) }
      setProfile(updated)
      return { ok: true }
    }
    const { error } = await supabase
      .from('profiles')
      .update({ nome: patch.nome, phone: patch.phone, cargo: patch.cargo, avatar_url: patch.avatar_url })
      .eq('id', profile.id)
    if (error) return { ok: false, message: error.message }
    setProfile(p => ({ ...p, ...patch, avatar: initials(patch.nome || p.nome) }))
    return { ok: true }
  }, [profile])

  // ── Salvar empresa (apenas admin_isv) ─────────────────────────────────────
  const saveCompany = useCallback(async (patch) => {
    if (DEV_BYPASS) {
      const updated = { ...company, ...patch }
      setCompany(updated)
      return { ok: true }
    }
    const { error } = await supabase
      .from('companies')
      .update(patch)
      .eq('id', company.id)
    if (error) return { ok: false, message: error.message }
    setCompany(c => ({ ...c, ...patch }))
    return { ok: true }
  }, [company])

  // ── Alterar senha ─────────────────────────────────────────────────────────
  const changePassword = useCallback(async (newPassword) => {
    if (DEV_BYPASS) {
      // Simula delay de rede em dev
      await new Promise(r => setTimeout(r, 600))
      return { ok: true }
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  }, [])

  // ── Upload de avatar ──────────────────────────────────────────────────────
  const uploadAvatar = useCallback(async (file) => {
    if (DEV_BYPASS) {
      const url = URL.createObjectURL(file)
      setProfile(p => ({ ...p, avatar_url: url }))
      return { ok: true, url }
    }
    const ext  = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (upErr) return { ok: false, message: upErr.message }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
    setProfile(p => ({ ...p, avatar_url: publicUrl }))
    return { ok: true, url: publicUrl }
  }, [profile])

  return {
    profile, company, loading, error,
    reload: load,
    saveProfile, saveCompany, changePassword, uploadAvatar,
    isAdmin: profile?.papel === 'admin_isv',
    papelCfg: PAPEIS_CONFIG[profile?.papel] || null,
  }
}
