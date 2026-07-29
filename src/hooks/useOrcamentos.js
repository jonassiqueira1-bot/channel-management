import { captureError } from '../lib/sentry'
import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)
}

function rowToOrcamento(row) {
  return {
    id:              row.id,
    centro_custo_id: row.centro_custo_id,
    competencia:     row.competencia,
    valor_planejado: Number(row.valor_planejado) || 0,
    observacoes:     row.observacoes || '',
  }
}

// Planejado por Centro de Custo + competência (mês) — o realizado é
// calculado à parte (ver TelaOrcamento), cruzando Campanhas/Ações/Projetos.
export function useOrcamentos() {
  const { session } = useAuth()
  const { profile }  = useProfile()
  const { activeBranchId } = useBranchContext()

  const [orcamentos, setOrcamentos] = useState([])
  const [loading, setLoading] = useState(true)

  const tenantId = profile?.tenant_id
  const branchId = activeBranchId || profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { setOrcamentos([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .order('competencia', { ascending: false })
    if (error) { captureError('useOrcamentos', error); setLoading(false); return }
    setOrcamentos((data || []).map(rowToOrcamento))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  // Upsert por (centro_custo_id, competencia) — mesma linha é atualizada se
  // já existir planejado pra esse centro naquele mês (UNIQUE no banco).
  const save = useCallback(async (o) => {
    const row = {
      tenant_id: tenantId, branch_id: branchId || null,
      centro_custo_id: o.centro_custo_id, competencia: o.competencia,
      valor_planejado: Number(o.valor_planejado) || 0, observacoes: o.observacoes || null,
    }
    if (isUuid(o.id)) {
      const { error } = await supabase.from('orcamentos').update(row).eq('id', o.id)
      if (error) return { ok: false, message: error.message }
      setOrcamentos(prev => prev.map(x => x.id === o.id ? { ...x, ...o } : x))
      return { ok: true }
    }
    const { data, error } = await supabase.from('orcamentos')
      .upsert(row, { onConflict: 'tenant_id,centro_custo_id,competencia' })
      .select('*').single()
    if (error) return { ok: false, message: error.message }
    const novo = rowToOrcamento(data)
    setOrcamentos(prev => [novo, ...prev.filter(x => !(x.centro_custo_id === novo.centro_custo_id && x.competencia === novo.competencia))])
    return { ok: true, data: novo }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    const { error } = await softDelete('orcamentos', id)
    if (error) return { ok: false, message: error.message }
    setOrcamentos(prev => prev.filter(o => o.id !== id))
    return { ok: true }
  }, [])

  return { orcamentos, loading, reload: load, save, remove }
}
