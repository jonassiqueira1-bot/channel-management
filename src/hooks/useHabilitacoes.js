import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MOCK_KEY = 'settings:habilitacoes_v3'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useHabilitacoes() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [habilitacoes, setHabilitacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setHabilitacoes(load())
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('habilitacoes').select('*').order('nome')
    if (error) {
      isMock.current = true
      setHabilitacoes(load())
    } else {
      isMock.current = false
      setHabilitacoes(data || [])
    }
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setHabilitacoes(prev => {
        const idx = prev.findIndex(h => h.id === record.id)
        const next = idx >= 0 ? prev.map(h => h.id === record.id ? record : h) : [...prev, record]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const isNew = !record.id
    const row = { ...record, tenant_id: tid.current, updated_at: new Date().toISOString() }
    if (isNew) {
      const { data, error } = await supabase.from('habilitacoes').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setHabilitacoes(prev => [...prev, data])
      return { ok: true }
    }
    const { error } = await supabase.from('habilitacoes').update(row).eq('id', record.id)
    if (error) return { ok: false, message: error.message }
    setHabilitacoes(prev => prev.map(h => h.id === record.id ? { ...h, ...record } : h))
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setHabilitacoes(prev => { const next = prev.filter(h => h.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('habilitacoes').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setHabilitacoes(prev => prev.filter(h => h.id !== id))
    return { ok: true }
  }, [])

  return { habilitacoes, setHabilitacoes, loading, reload: fetch, save, remove, isMock: isMock.current }
}
