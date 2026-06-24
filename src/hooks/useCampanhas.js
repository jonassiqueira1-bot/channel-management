import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MOCK_KEY = 'settings:campanhas_v1'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useCampanhas(seeds = []) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [campanhas, setCampanhas] = useState(load() ?? seeds)
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setCampanhas(load() ?? seeds)
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('campanhas').select('*').order('nome')
    if (error) {
      isMock.current = true
      setCampanhas(load() ?? seeds)
    } else {
      isMock.current = false
      setCampanhas(data && data.length > 0 ? data : (load() ?? seeds))
    }
    setLoading(false)
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setCampanhas(prev => {
        const idx = prev.findIndex(c => c.id === record.id)
        const next = idx >= 0 ? prev.map(c => c.id === record.id ? record : c) : [record, ...prev]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const row = { ...record, tenant_id: tid.current, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('campanhas').upsert(row, { onConflict: 'id' })
    if (error) return { ok: false, message: error.message }
    setCampanhas(prev => {
      const idx = prev.findIndex(c => c.id === record.id)
      return idx >= 0 ? prev.map(c => c.id === record.id ? record : c) : [record, ...prev]
    })
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setCampanhas(prev => { const next = prev.filter(c => c.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('campanhas').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setCampanhas(prev => prev.filter(c => c.id !== id))
    return { ok: true }
  }, [])

  return { campanhas, setCampanhas, loading, reload: fetch, save, remove, isMock: isMock.current }
}
