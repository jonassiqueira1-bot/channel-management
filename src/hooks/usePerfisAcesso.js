import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MOCK_KEY_PERFIS = 'perfis:roles'
const MOCK_KEY_PERMS  = 'perfis:permissions'

function loadPerfis() { try { const r = localStorage.getItem(MOCK_KEY_PERFIS); return r ? JSON.parse(r) : null } catch { return null } }
function loadPerms()  { try { const r = localStorage.getItem(MOCK_KEY_PERMS);  return r ? JSON.parse(r) : {} }  catch { return {} } }
function persistPerfis(list) { try { localStorage.setItem(MOCK_KEY_PERFIS, JSON.stringify(list)) } catch {} }
function persistPerms(obj)   { try { localStorage.setItem(MOCK_KEY_PERMS,  JSON.stringify(obj))  } catch {} }

export function usePerfisAcesso(defaultPerfis = [], defaultPerms = {}) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [perfis, setPerfis] = useState(loadPerfis() ?? defaultPerfis)
  const [perms,  setPerms]  = useState(loadPerms())
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setPerfis(loadPerfis() ?? defaultPerfis)
      setPerms(loadPerms())
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('perfis_acesso').select('*').order('nome')
    if (error) {
      isMock.current = true
      setPerfis(loadPerfis() ?? defaultPerfis)
      setPerms(loadPerms())
    } else {
      isMock.current = false
      if (data && data.length > 0) {
        const permsMap = {}
        data.forEach(r => { permsMap[r.id] = r.permissions || {} })
        setPerfis(data.map(({ permissions, ...rest }) => rest))
        setPerms(permsMap)
      } else {
        setPerfis(loadPerfis() ?? defaultPerfis)
        setPerms(loadPerms())
      }
    }
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const savePerfil = useCallback(async (perfil, permsObj) => {
    if (isMock.current) {
      setPerfis(prev => {
        const idx = prev.findIndex(p => p.id === perfil.id)
        const next = idx >= 0 ? prev.map(p => p.id === perfil.id ? perfil : p) : [...prev, perfil]
        persistPerfis(next)
        return next
      })
      if (permsObj !== undefined) {
        setPerms(prev => { const next = { ...prev, [perfil.id]: permsObj }; persistPerms(next); return next })
      }
      return { ok: true }
    }
    const row = { ...perfil, tenant_id: tid.current, permissions: permsObj ?? perms[perfil.id] ?? {}, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('perfis_acesso').upsert(row, { onConflict: 'id' })
    if (error) return { ok: false, message: error.message }
    setPerfis(prev => {
      const idx = prev.findIndex(p => p.id === perfil.id)
      return idx >= 0 ? prev.map(p => p.id === perfil.id ? perfil : p) : [...prev, perfil]
    })
    if (permsObj !== undefined) setPerms(prev => ({ ...prev, [perfil.id]: permsObj }))
    return { ok: true }
  }, [perms])

  const savePerms = useCallback(async (perfilId, permsObj) => {
    setPerms(prev => {
      const next = { ...prev, [perfilId]: permsObj }
      persistPerms(next)
      return next
    })
    if (!isMock.current) {
      await supabase.from('perfis_acesso').update({ permissions: permsObj, updated_at: new Date().toISOString() }).eq('id', perfilId)
    }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setPerfis(prev => { const next = prev.filter(p => p.id !== id); persistPerfis(next); return next })
      setPerms(prev => { const next = { ...prev }; delete next[id]; persistPerms(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('perfis_acesso').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setPerfis(prev => prev.filter(p => p.id !== id))
    setPerms(prev => { const next = { ...prev }; delete next[id]; return next })
    return { ok: true }
  }, [])

  return { perfis, setPerfis, perms, setPerms, loading, reload: fetch, savePerfil, savePerms, remove, isMock: isMock.current }
}
