import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

const MOCK_KEY = 'settings:campanhas_v1'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useCampanhas(seeds = []) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()
  const [campanhas, setCampanhas] = useState(load() ?? seeds)
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)
  const bid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])
  useEffect(() => { bid.current = profile?.branch_id || activeBranchId || null }, [profile?.branch_id, activeBranchId])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setCampanhas(load() ?? seeds)
      setLoading(false)
      return
    }
    let q = supabase.from('campanhas').select('*').order('nome')
    const { data, error } = await q
    if (error) {
      isMock.current = true
      setCampanhas(load() ?? seeds)
    } else {
      isMock.current = false
      // Mapeia colunas do banco → campos esperados pelo form
      const mapped = (data || []).map(r => ({
        ...r,
        name:        r.name        || r.nome      || '',
        objective:   r.objective   || r.objetivo  || '',
        description: r.description || r.descricao || '',
        start_date:  r.start_date  || r.inicio    || '',
        end_date:    r.end_date    || r.fim        || '',
        materials:   r.materials   || (r.extra ? JSON.parse(r.extra) : []),
      }))
      setCampanhas(mapped)
    }
    setLoading(false)
  }, [session, activeBranchId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setCampanhas(prev => {
        const idx = prev.findIndex(c => c.id === record.id)
        const next = idx >= 0 ? prev.map(c => c.id === record.id ? record : c) : [record, ...prev]
        persist(next)
        return next
      })
      return { ok: true }
    }
    // Mapeamento campos do form → colunas do banco
    const branchId = record.branch_id || bid.current || null
    const row = {
      id:           record.id,
      tenant_id:    tid.current,
      branch_id:    branchId,
      nome:         record.name      || record.nome      || '',
      objetivo:     record.objective || record.objetivo  || '',
      descricao:    record.description || record.descricao || '',
      inicio:       record.start_date || record.inicio   || null,
      fim:          record.end_date  || record.fim       || null,
      status:       record.status    || 'rascunho',
      pontua_metas: record.pontua_metas ?? false,
      extra:        record.materials  ? record.materials : (record.extra || null),
      updated_at:   new Date().toISOString(),
    }
    const { error } = await supabase.from('campanhas').upsert(row, { onConflict: 'id' })
    if (error) return { ok: false, message: error.message }
    setCampanhas(prev => {
      const idx = prev.findIndex(c => c.id === record.id)
      return idx >= 0 ? prev.map(c => c.id === record.id ? record : c) : [record, ...prev]
    })
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setCampanhas(prev => { const next = prev.filter(c => c.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await softDelete('campanhas', id)
    if (error) return { ok: false, message: error.message }
    setCampanhas(prev => prev.filter(c => c.id !== id))
    return { ok: true }
  }, [])

  return { campanhas, setCampanhas, loading, reload: fetch, save, remove, isMock: isMock.current }
}
