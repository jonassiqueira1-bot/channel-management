import { captureError } from '../lib/sentry'
import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)
}

function rowToLancamento(row) {
  return {
    id:              row.id,
    centro_custo_id: row.centro_custo_id,
    competencia:     row.competencia,
    data_lancamento: row.data_lancamento,
    descricao:       row.descricao || '',
    valor:           Number(row.valor) || 0,
    observacoes:     row.observacoes || '',
  }
}

// Lançamentos manuais de realizado — complementam o realizado automático
// (Campanhas/Ações), pra despesas que não passam por nenhum dos dois módulos.
export function useOrcamentoLancamentos() {
  const { session } = useAuth()
  const { profile }  = useProfile()
  const { activeBranchId } = useBranchContext()

  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)

  const tenantId = profile?.tenant_id
  const branchId = activeBranchId || profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { setLancamentos([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('orcamento_lancamentos')
      .select('*')
      .order('data_lancamento', { ascending: false })
    if (error) { captureError('useOrcamentoLancamentos', error); setLoading(false); return }
    setLancamentos((data || []).map(rowToLancamento))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (l) => {
    const row = {
      tenant_id: tenantId, branch_id: branchId || null,
      centro_custo_id: l.centro_custo_id, competencia: l.competencia,
      data_lancamento: l.data_lancamento || l.competencia,
      descricao: l.descricao || '', valor: Number(l.valor) || 0,
      observacoes: l.observacoes || null,
    }
    if (isUuid(l.id)) {
      const { error } = await supabase.from('orcamento_lancamentos').update(row).eq('id', l.id)
      if (error) return { ok: false, message: error.message }
      setLancamentos(prev => prev.map(x => x.id === l.id ? { ...x, ...l } : x))
      return { ok: true }
    }
    const { data, error } = await supabase.from('orcamento_lancamentos').insert(row).select('*').single()
    if (error) return { ok: false, message: error.message }
    const novo = rowToLancamento(data)
    setLancamentos(prev => [novo, ...prev])
    return { ok: true, data: novo }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    const { error } = await softDelete('orcamento_lancamentos', id)
    if (error) return { ok: false, message: error.message }
    setLancamentos(prev => prev.filter(l => l.id !== id))
    return { ok: true }
  }, [])

  return { lancamentos, loading, reload: load, save, remove }
}
