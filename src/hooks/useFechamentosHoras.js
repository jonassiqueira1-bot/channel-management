import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MOCK_KEY = 'projects:fechamentos_v1'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useFechamentosHoras() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [fechamentos, setFechamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setFechamentos(load())
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('fechamentos_horas').select('*').order('periodo', { ascending: false })
    if (error) {
      isMock.current = true
      setFechamentos(load())
    } else {
      isMock.current = false
      setFechamentos(data || [])
    }
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const upsert = useCallback(async (record) => {
    if (isMock.current) {
      setFechamentos(prev => {
        const idx = prev.findIndex(f => f.periodo === record.periodo && f.user_name === record.user_name)
        const next = idx >= 0 ? prev.map((f, i) => i === idx ? { ...f, ...record } : f) : [...prev, record]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const row = { ...record, tenant_id: tid.current, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('fechamentos_horas').upsert(row, { onConflict: 'tenant_id,periodo,user_name' })
    if (error) return { ok: false, message: error.message }
    setFechamentos(prev => {
      const idx = prev.findIndex(f => f.periodo === record.periodo && f.user_name === record.user_name)
      return idx >= 0 ? prev.map((f, i) => i === idx ? { ...f, ...record } : f) : [...prev, record]
    })
    return { ok: true }
  }, [])

  return { fechamentos, setFechamentos, loading, reload: fetch, upsert, isMock: isMock.current }
}
