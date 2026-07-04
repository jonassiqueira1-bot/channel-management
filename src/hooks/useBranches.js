import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

export function useBranches() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('tenant_branches')
      .select('*')
      .order('name')
    if (error) {
      console.warn('[useBranches] load error:', error.message)
      setError(error.message)
    } else {
      setBranches(data || [])
      setError(null)
    }
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (data) => {
    if (!tenantId) return { ok: false, error: 'tenant não carregado' }
    setSaving(true)
    const { error } = await supabase.rpc('save_tenant_branch', {
      p_tenant_id:    tenantId,
      p_name:         data.name,
      p_custom_fields: data.custom_fields || {},
      p_id:           data.id || null,
    })
    const result = error ? { ok: false, error: error.message } : { ok: true }
    await load()
    setSaving(false)
    return result
  }, [tenantId, load])

  const remove = useCallback(async (id) => {
    setSaving(true)
    const { data, error } = await supabase.rpc('delete_or_deactivate_branch', { p_id: id })
    let result
    if (error) {
      result = { ok: false, error: error.message }
    } else {
      result = { ok: true, action: data } // 'deleted' ou 'deactivated'
    }
    await load()
    setSaving(false)
    return result
  }, [load])

  const reactivate = useCallback(async (id) => {
    setSaving(true)
    const { error } = await supabase.rpc('reactivate_branch', { p_id: id })
    const result = error ? { ok: false, error: error.message } : { ok: true }
    await load()
    setSaving(false)
    return result
  }, [load])

  return { branches, loading, saving, error, reload: load, save, remove, reactivate }
}
