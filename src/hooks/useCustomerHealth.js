import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_CUSTOMER_HEALTH, STORAGE_KEY as MOCK_KEY } from '../data/mockCustomerSuccess'

function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useCustomerHealth() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setRecords(load() ?? MOCK_CUSTOMER_HEALTH)
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('customer_health').select('*').order('company_name')
    if (error) {
      isMock.current = true
      setRecords(load() ?? MOCK_CUSTOMER_HEALTH)
    } else {
      isMock.current = false
      setRecords(data || [])
    }
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setRecords(prev => {
        const idx = prev.findIndex(r => r.id === record.id)
        const next = idx >= 0 ? prev.map(r => r.id === record.id ? record : r) : [...prev, { ...record, id: record.id || `ph_${Date.now()}` }]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const { id, ...rest } = record
    const base = { ...rest, tenant_id: tid.current, updated_at: new Date().toISOString() }
    if (isUuid(id)) {
      // UPDATE
      const { error } = await supabase.from('customer_health').update(base).eq('id', id)
      if (error) return { ok: false, message: error.message }
      setRecords(prev => prev.map(r => r.id === id ? { ...r, ...record } : r))
    } else {
      // INSERT — deixa DB gerar UUID
      const { data, error } = await supabase.from('customer_health').insert(base).select().single()
      if (error) return { ok: false, message: error.message }
      setRecords(prev => [...prev, { ...record, id: data.id }])
    }
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setRecords(prev => { const next = prev.filter(r => r.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('customer_health').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setRecords(prev => prev.filter(r => r.id !== id))
    return { ok: true }
  }, [])

  return { records, setRecords, loading, reload: fetch, save, remove, isMock: isMock.current }
}
