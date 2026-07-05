import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

function rowToFunil(row) {
  const cf = row.custom_fields || {}
  return {
    id:        row.id,
    nome:      row.name || cf.nome || '',
    descricao: row.description || cf.descricao || '',
    status:    row.status || 'ativo',
    is_padrao: cf.is_padrao || false,
    criado:    row.created_at?.slice(0, 10) || '',
    etapas:    cf.etapas || [],
  }
}

function funilToRow(f, tenantId) {
  return {
    tenant_id:   tenantId,
    name:        f.nome,
    description: f.descricao || null,
    status:      f.status || 'ativo',
    custom_fields: {
      nome:      f.nome,
      descricao: f.descricao,
      etapas:    f.etapas || [],
      is_padrao: f.is_padrao || false,
    },
  }
}

export function useFunnels() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [funis, setFunis] = useState([])
  const [loading, setLoading] = useState(true)
  const isMockMode = useRef(false)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = false; setLoading(false); return }
    let q = supabase.from('form_layouts').select('*').eq('entity', 'funis')
    if (activeBranchId) q = q.eq('branch_id', activeBranchId)
    q = q.limit(1)
    const { data, error } = await q
    if (error) {
      console.error('[useFunnels]', error.message)
      isMockMode.current = false
      setFunis([])
    } else {
      isMockMode.current = false
      const stored = data?.[0]?.fields
      setFunis(Array.isArray(stored) && stored.length > 0 ? stored : [])
    }
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { load() }, [load])

  const persistAll = useCallback(async (list) => {
    if (!tenantId) return
    let q = supabase.from('form_layouts').select('id').eq('tenant_id', tenantId).eq('entity', 'funis')
    if (activeBranchId) q = q.eq('branch_id', activeBranchId)
    const { data: existing } = await q.limit(1)
    if (existing && existing.length > 0) {
      let upd = supabase.from('form_layouts').update({ fields: list }).eq('tenant_id', tenantId).eq('entity', 'funis')
      if (activeBranchId) upd = upd.eq('branch_id', activeBranchId)
      await upd
    } else {
      await supabase.from('form_layouts').insert({ tenant_id: tenantId, branch_id: activeBranchId || null, entity: 'funis', fields: list, layout: [] })
    }
  }, [tenantId, activeBranchId])

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
