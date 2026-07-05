import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from './useProfile'

function toRelatorio(row) {
  return {
    id:               row.id,
    tenant_id:        row.tenant_id,
    branch_id:        row.branch_id || null,
    owner_id:         row.owner_id,
    titulo:           row.titulo || 'Sem título',
    tipo:             row.tipo || 'relatorio',
    projeto_id:       row.projeto_id || null,
    config:           row.config || {},
    elementos:        row.elementos || [],
    acesso:           row.acesso || 'privado',
    papeis_permitidos: row.papeis_permitidos || [],
    status:           row.status || 'rascunho',
    created_at:       row.created_at,
    updated_at:       row.updated_at,
  }
}

export function useRelatorios(tipo = 'relatorio') {
  const { profile } = useProfile()
  const [relatorios, setRelatorios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null
  const userId   = profile?.id

  const load = useCallback(async () => {
    if (!tenantId && !userId) { setLoading(false); return }
    setLoading(true); setError(null)
    try {
      let q = supabase.from('relatorios').select('*').eq('tipo', tipo).is('deleted_at', null).order('updated_at', { ascending: false })
      if (tenantId) q = q.eq('tenant_id', tenantId)
      const { data, error: err } = await q
      if (err) throw err
      setRelatorios((data || []).map(toRelatorio))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tenantId, userId, tipo])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (rel) => {
    if (!tenantId || !userId) return { ok: false, message: 'Sem contexto de tenant' }
    const row = {
      tenant_id:        tenantId,
      branch_id:        branchId,
      owner_id:         userId,
      titulo:           rel.titulo || 'Sem título',
      tipo:             rel.tipo || tipo,
      projeto_id:       rel.projeto_id || null,
      config:           rel.config || {},
      elementos:        rel.elementos || [],
      acesso:           rel.acesso || 'privado',
      papeis_permitidos: rel.papeis_permitidos || [],
      status:           rel.status || 'rascunho',
    }
    try {
      if (rel.id && !rel.id.startsWith('local_')) {
        const { data, error: err } = await supabase.from('relatorios').update(row).eq('id', rel.id).select().single()
        if (err) throw err
        const updated = toRelatorio(data)
        setRelatorios(prev => prev.map(r => r.id === updated.id ? updated : r))
        return { ok: true, relatorio: updated }
      } else {
        const { data, error: err } = await supabase.from('relatorios').insert(row).select().single()
        if (err) throw err
        const created = toRelatorio(data)
        setRelatorios(prev => [created, ...prev.filter(r => r.id !== rel.id)])
        return { ok: true, relatorio: created }
      }
    } catch (e) {
      return { ok: false, message: e.message }
    }
  }, [tenantId, branchId, userId, tipo])

  const remove = useCallback(async (id) => {
    try {
      const { error: err } = await supabase.rpc('soft_delete_relatorio', { relatorio_id: id })
      if (err) throw err
      setRelatorios(prev => prev.filter(r => r.id !== id))
      return { ok: true }
    } catch (e) {
      return { ok: false, message: e.message }
    }
  }, [])

  const canEdit = useCallback((rel) => rel?.owner_id === userId, [userId])

  return { relatorios, loading, error, save, remove, canEdit, reload: load }
}
