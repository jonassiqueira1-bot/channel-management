import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

export function usePendingInvites() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { setInvites([]); setLoading(false); return }
    const { data } = await supabase
      .from('pending_invites')
      .select('*')
      .order('criado_em', { ascending: false })
    setInvites(data || [])
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const invite = useCallback(async (record) => {
    if (!tid.current) return { ok: false, message: 'Tenant não identificado' }
    const { data, error } = await supabase
      .from('pending_invites')
      .insert({ ...record, tenant_id: tid.current })
      .select()
      .single()
    if (error) return { ok: false, message: error.message }
    setInvites(prev => [data, ...prev])
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    const { error } = await supabase.from('pending_invites').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setInvites(prev => prev.filter(i => i.id !== id))
    return { ok: true }
  }, [])

  return { invites, loading, invite, remove, reload: fetch }
}
