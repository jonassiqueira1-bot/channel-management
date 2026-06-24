import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MOCK_KEY = 'settings:franquias_v2'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useParceiros() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [parceiros, setParceiros] = useState([])
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setParceiros(load())
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('parceiros').select('*').order('nome')
    if (error) {
      isMock.current = true
      setParceiros(load())
    } else {
      isMock.current = false
      setParceiros(data || [])
    }
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setParceiros(prev => {
        const idx = prev.findIndex(p => p.id === record.id)
        const next = idx >= 0 ? prev.map(p => p.id === record.id ? record : p) : [...prev, record]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const row = { ...record, tenant_id: tid.current, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('parceiros').upsert(row, { onConflict: 'id' })
    if (error) return { ok: false, message: error.message }
    setParceiros(prev => {
      const idx = prev.findIndex(p => p.id === record.id)
      return idx >= 0 ? prev.map(p => p.id === record.id ? record : p) : [...prev, record]
    })
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setParceiros(prev => { const next = prev.filter(p => p.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('parceiros').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setParceiros(prev => prev.filter(p => p.id !== id))
    return { ok: true }
  }, [])

  const bulkReclassify = useCallback(async (ids, patch) => {
    if (isMock.current) {
      setParceiros(prev => { const next = prev.map(p => ids.includes(p.id) ? { ...p, ...patch } : p); persist(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('parceiros').update({ ...patch, updated_at: new Date().toISOString() }).in('id', ids)
    if (error) return { ok: false, message: error.message }
    setParceiros(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...patch } : p))
    return { ok: true }
  }, [])

  return { parceiros, setParceiros, loading, reload: fetch, save, remove, bulkReclassify, isMock: isMock.current }
}
