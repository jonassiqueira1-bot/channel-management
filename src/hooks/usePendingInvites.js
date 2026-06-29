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
      .order('criado_em', { ascending: false, nullsFirst: false })
    setInvites(data || [])
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const invite = useCallback(async (record) => {
    if (!session?.access_token) return { ok: false, message: 'Não autenticado' }
    const FNURL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/invite-user`
    const res = await fetch(FNURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(record),
    })
    const json = await res.json()
    if (!res.ok) return { ok: false, message: json.error || 'Erro ao enviar convite' }
    // Recarrega lista para pegar o registro recém-inserido pela Edge Function
    await fetch()
    return { ok: true }
  }, [session, fetch])

  const remove = useCallback(async (id) => {
    const { error } = await supabase.from('pending_invites').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setInvites(prev => prev.filter(i => i.id !== id))
    return { ok: true }
  }, [])

  return { invites, loading, invite, remove, reload: fetch }
}
