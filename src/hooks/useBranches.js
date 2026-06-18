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
    let result
    if (data.id) {
      const { error } = await supabase
        .from('tenant_branches')
        .update({ name: data.name, custom_fields: data.custom_fields || {} })
        .eq('id', data.id)
      result = error ? { ok: false, error: error.message } : { ok: true }
    } else {
      const { error } = await supabase
        .from('tenant_branches')
        .insert({ tenant_id: tenantId, name: data.name, custom_fields: data.custom_fields || {} })
      result = error ? { ok: false, error: error.message } : { ok: true }
    }
    await load()
    setSaving(false)
    return result
  }, [tenantId, load])

  const remove = useCallback(async (id) => {
    setSaving(true)
    const { error } = await supabase.from('tenant_branches').delete().eq('id', id)
    const result = error ? { ok: false, error: error.message } : { ok: true }
    await load()
    setSaving(false)
    return result
  }, [load])

  return { branches, loading, saving, error, reload: load, save, remove }
}
