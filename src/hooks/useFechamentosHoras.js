import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

const MOCK_KEY = 'projects:fechamentos_v1'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useFechamentosHoras() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()
  const [fechamentos, setFechamentos] = useState(() => load())
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
    let q = supabase.from('fechamentos_horas').select('*').order('periodo', { ascending: false })
    if (activeBranchId) q = q.eq('branch_id', activeBranchId)
    const { data, error } = await q
    if (error) {
      isMock.current = true
      setFechamentos(load())
    } else {
      isMock.current = false
      // Mescla Supabase com registros locais que ainda não foram enviados (offline)
      const remote = data || []
      const local  = load()
      const localOnly = local.filter(l =>
        !remote.some(r => r.id === l.id || (r.periodo === l.periodo && r.user_name === l.user_name))
      )
      const merged = [...remote, ...localOnly]
      setFechamentos(merged)
      persist(merged) // mantém localStorage sincronizado com Supabase
    }
    setLoading(false)
  }, [session, activeBranchId])

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
    // Atualiza estado local independente de erro no Supabase
    setFechamentos(prev => {
      const idx = prev.findIndex(f => f.periodo === record.periodo && f.user_name === record.user_name)
      const next = idx >= 0 ? prev.map((f, i) => i === idx ? { ...f, ...record } : f) : [...prev, record]
      persist(next) // sempre persiste localmente como cache/fallback
      return next
    })
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  }, [])

  return { fechamentos, setFechamentos, loading, reload: fetch, upsert, isMock: isMock.current }
}
