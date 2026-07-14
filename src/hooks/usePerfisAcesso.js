import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { PERFIS_NATIVOS_SEED, buildSeedPerms } from '../data/perfisAcessoSeed'

function rowsToState(data) {
  const permsMap = {}
  data.forEach(r => { permsMap[r.id] = r.permissions || {} })
  const perfis = data.map(({ permissions, descricao, ...rest }) => ({ ...rest, desc: descricao }))
  return { perfis, perms: permsMap }
}

export function usePerfisAcesso() {
  const { session } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const tenantId = profile?.tenant_id
  const [perfis, setPerfis] = useState([])
  const [perms,  setPerms]  = useState({})
  const [loading, setLoading] = useState(true)

  const seedNativos = useCallback(async () => {
    const seedPerms = buildSeedPerms()
    const rows = PERFIS_NATIVOS_SEED.map(p => ({
      tenant_id: tenantId, slug: p.slug, nome: p.nome, nativo: p.nativo,
      cor: p.cor, icon: p.icon, descricao: p.desc, permissions: seedPerms[p.id] || {},
    }))
    const { data, error } = await supabase.from('perfis_acesso').upsert(rows, { onConflict: 'tenant_id,slug' }).select()
    if (error || !data) return null
    return rowsToState(data)
  }, [tenantId])

  const load = useCallback(async () => {
    // profile ainda carregando — espera antes de decidir que não há tenant
    if (profileLoading) return
    setLoading(true)
    if (!session?.user || !tenantId) { setPerfis([]); setPerms({}); setLoading(false); return }
    const { data, error } = await supabase.from('perfis_acesso').select('*').eq('tenant_id', tenantId).order('nome')
    if (error) { setPerfis([]); setPerms({}); setLoading(false); return }
    if (!data || data.length === 0) {
      const seeded = await seedNativos()
      if (seeded) { setPerfis(seeded.perfis); setPerms(seeded.perms) }
      setLoading(false)
      return
    }
    const { perfis: p, perms: pm } = rowsToState(data)
    setPerfis(p)
    setPerms(pm)
    setLoading(false)
  }, [session, tenantId, profileLoading, seedNativos])

  useEffect(() => { load() }, [load])

  const savePerfil = useCallback(async (perfil, permsObj) => {
    const { desc, id, ...perfilRest } = perfil
    const row = { ...perfilRest, descricao: desc, tenant_id: tenantId, permissions: permsObj ?? perms[id] ?? {}, updated_at: new Date().toISOString() }
    const isUuid = typeof id === 'string' && id.includes('-') && id.length > 20

    if (isUuid) {
      const { error } = await supabase.from('perfis_acesso').update(row).eq('id', id)
      if (error) return { ok: false, message: error.message }
      setPerfis(prev => prev.map(p => p.id === id ? { ...p, ...perfil } : p))
      if (permsObj !== undefined) setPerms(prev => ({ ...prev, [id]: permsObj }))
      return { ok: true, data: { ...perfil, id } }
    }

    const { data, error } = await supabase.from('perfis_acesso').insert(row).select().single()
    if (error) return { ok: false, message: error.message }
    const salvo = { ...perfil, id: data.id }
    setPerfis(prev => [...prev, salvo])
    if (permsObj !== undefined) setPerms(prev => ({ ...prev, [data.id]: permsObj }))
    return { ok: true, data: salvo }
  }, [perms, tenantId])

  const savePerms = useCallback(async (perfilId, permsObj) => {
    setPerms(prev => ({ ...prev, [perfilId]: permsObj }))
    await supabase.from('perfis_acesso').update({ permissions: permsObj, updated_at: new Date().toISOString() }).eq('id', perfilId)
  }, [])

  const remove = useCallback(async (id) => {
    const { error } = await softDelete('perfis_acesso', id)
    if (error) return { ok: false, message: error.message }
    setPerfis(prev => prev.filter(p => p.id !== id))
    setPerms(prev => { const next = { ...prev }; delete next[id]; return next })
    return { ok: true }
  }, [])

  return { perfis, setPerfis, perms, setPerms, loading: loading || profileLoading, reload: load, savePerfil, savePerms, remove }
}
