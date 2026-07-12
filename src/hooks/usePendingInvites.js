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

  const loadInvites = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { setInvites([]); setLoading(false); return }
    const { data } = await supabase
      .from('pending_invites')
      .select('*')
      .order('criado_em', { ascending: false, nullsFirst: false })
    setInvites(data || [])
    setLoading(false)
  }, [session])

  useEffect(() => { loadInvites() }, [loadInvites])

  const invite = useCallback(async (record) => {
    if (!session?.access_token) return { ok: false, message: 'Não autenticado' }
    const FNURL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/invite-user`
    const res = await window.fetch(FNURL, {
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
    // Adiciona otimisticamente para não depender de RLS na releitura
    const optimistic = {
      id:           `tmp_${Date.now()}`,
      tenant_id:    tid.current,
      nome:         record.nome || record.email,
      email:        record.email,
      papel:        record.papel || 'parceiro',
      tipo_usuario: record.tipo_usuario || 'externo',
      status:       'pendente',
      criado_em:    new Date().toISOString(),
    }
    setInvites(prev => [optimistic, ...prev.filter(i => i.email !== record.email)])
    // Tenta sincronizar com o DB em segundo plano
    loadInvites()
    return { ok: true }
  }, [session, loadInvites])

  const remove = useCallback(async (id) => {
    const { error } = await supabase.from('pending_invites').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setInvites(prev => prev.filter(i => i.id !== id))
    return { ok: true }
  }, [])

  return { invites, loading, invite, remove, reload: loadInvites }
}
