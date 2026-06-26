import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_FUNIS } from '../data/mockFunis'

function rowToFunil(row) {
  const cf = row.custom_fields || {}
  return {
    id:       row.id,
    nome:     row.name || cf.nome || '',
    descricao:row.description || cf.descricao || '',
    status:   row.status || 'ativo',
    criado:   row.created_at?.slice(0, 10) || '',
    etapas:   cf.etapas || [],
  }
}

function funilToRow(f, tenantId) {
  return {
    tenant_id:   tenantId,
    name:        f.nome,
    description: f.descricao || null,
    status:      f.status || 'ativo',
    custom_fields: {
      nome:    f.nome,
      descricao: f.descricao,
      etapas:  f.etapas || [],
    },
  }
}

export function useFunnels() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [funis, setFunis] = useState([])
  const [loading, setLoading] = useState(true)
  const isMockMode = useRef(true)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setFunis(MOCK_FUNIS); setLoading(false); return }
    const { data, error } = await supabase
      .from('form_layouts')
      .select('*')
      .eq('entity', 'funis')
      .limit(1)
    if (error) {
      isMockMode.current = true
      setFunis(MOCK_FUNIS)
    } else {
      isMockMode.current = false
      const stored = data?.[0]?.fields
      setFunis(Array.isArray(stored) && stored.length > 0 ? stored : [])
    }
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const persistAll = useCallback(async (list) => {
    if (!tenantId) return
    const { data: existing } = await supabase
      .from('form_layouts').select('id').eq('tenant_id', tenantId).eq('entity', 'funis').limit(1)
    if (existing && existing.length > 0) {
      await supabase.from('form_layouts').update({ fields: list }).eq('tenant_id', tenantId).eq('entity', 'funis')
    } else {
      await supabase.from('form_layouts').insert({ tenant_id: tenantId, entity: 'funis', fields: list, layout: [] })
    }
  }, [tenantId])

  const save = useCallback(async (data) => {
    let next
    setFunis(prev => {
      const idx = prev.findIndex(f => f.id === data.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = data; next = n; return n }
      next = [...prev, { ...data, criado: new Date().toISOString().slice(0, 10) }]
      return next
    })
    setTimeout(() => { if (next && !isMockMode.current) persistAll(next) }, 0)
    return { ok: true }
  }, [persistAll])

  const remove = useCallback(async (id) => {
    let next
    setFunis(prev => { next = prev.filter(f => f.id !== id); return next })
    setTimeout(() => { if (next && !isMockMode.current) persistAll(next) }, 0)
    return { ok: true }
  }, [persistAll])

  return { funis, loading, reload: load, save, remove, setFunis, isMock: isMockMode }
}
