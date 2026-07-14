import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

function rowToEquipe(row) {
  return {
    ...row,
    membro_ids: row.membro_ids || [],
    meta_ids:   [], // vinculação com Metas ainda não existe no banco — informativo apenas
  }
}

function equipeToRow(e, tenantId, branchId) {
  return {
    tenant_id:  tenantId,
    branch_id:  branchId || null,
    nome:       e.nome,
    descricao:  e.descricao || null,
    status:     e.status || 'ativa',
    lider_id:   e.lider_id || null,
    membro_ids: e.membro_ids || [],
  }
}

export function useEquipes() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [equipes, setEquipes] = useState([])
  const [loading, setLoading] = useState(true)
  const isMockMode            = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = activeBranchId || profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = false; setLoading(false); return }
    let q = supabase.from('equipes').select('*').order('nome')
    if (branchId) q = q.eq('branch_id', branchId)
    const { data, error } = await q
    if (error) { isMockMode.current = false; setEquipes([]); setLoading(false); return }
    isMockMode.current = false
    setEquipes((data || []).map(rowToEquipe))
    setLoading(false)
  }, [session, branchId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (e) => {
    const row = equipeToRow(e, tenantId, branchId)
    const isUuid = typeof e.id === 'string' && e.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('equipes').update(row).eq('id', e.id)
      if (error) return { ok: false, message: error.message }
      setEquipes(prev => prev.map(x => x.id === e.id ? { ...x, ...e } : x))
      return { ok: true }
    }
    const { data, error } = await supabase.from('equipes').insert(row).select().single()
    if (error) return { ok: false, message: error.message }
    setEquipes(prev => [...prev, rowToEquipe(data)])
    return { ok: true, data: rowToEquipe(data) }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    const { error } = await softDelete('equipes', id)
    if (error) return { ok: false, message: error.message }
    setEquipes(prev => prev.filter(e => e.id !== id))
    return { ok: true }
  }, [])

  const importMany = useCallback(async (rows) => {
    const mapped = rows.map(e => equipeToRow(e, tenantId, branchId))
    const { data, error } = await supabase.from('equipes').insert(mapped).select()
    if (error) return { ok: false, message: error.message }
    setEquipes(prev => [...prev, ...(data || []).map(rowToEquipe)])
    return { ok: true }
  }, [tenantId, branchId])

  return { equipes, loading, reload: load, save, remove, importMany, setEquipes, isMock: isMockMode }
}
