import { captureError } from '../lib/sentry'
import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete, softDeleteMany } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

// Fase 1 do módulo de Faturas — separa a cobrança em si (Fatura, gerada a
// partir dos itens do contrato conforme a cadência de cada produto) do
// recebimento (Payment, que passa a poder ser vinculado a uma fatura).
// Mesmo padrão de Salesforce Billing / HubSpot: Contrato/Itens → Fatura →
// Pagamento.

function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)
}

export function rowToFatura(row) {
  const cf = row.custom_fields || {}
  return {
    id:               row.id,
    tenant_id:        row.tenant_id || null,
    branch_id:        row.branch_id || null,
    company_id:       row.company_id || null,
    company_nome:     cf.company_nome || '',
    contract_id:      row.contract_id || null,
    contract_numero:  cf.contract_numero || '',
    numero:           row.numero || '',
    cadencia:         row.cadencia || 'avulsa',
    origem_cobranca:  row.origem_cobranca || 'parceiro',
    status:           row.status || 'gerada',
    competencia:      row.competencia || '',
    due_date:         row.due_date || '',
    amount_total:     Number(row.amount_total) || 0,
    itens:            Array.isArray(cf.itens) ? cf.itens : [],
    payment_id:       cf.payment_id || null,
    notes:            cf.notes || '',
    criado:           row.created_at?.slice(0, 10) || '',
  }
}

function faturaToRow(f, tenantId, branchId) {
  return {
    tenant_id:       tenantId,
    branch_id:       branchId || null,
    company_id:      f.company_id || null,
    contract_id:      isUuid(f.contract_id) ? f.contract_id : null,
    numero:          f.numero || '',
    cadencia:        f.cadencia || 'avulsa',
    origem_cobranca: f.origem_cobranca || 'parceiro',
    status:          f.status || 'gerada',
    competencia:     f.competencia || null,
    due_date:        f.due_date || null,
    amount_total:    Number(f.amount_total) || 0,
    custom_fields: {
      company_nome:    f.company_nome || '',
      contract_numero: f.contract_numero || '',
      itens:           f.itens || [],
      payment_id:      f.payment_id || null,
      notes:           f.notes || '',
    },
  }
}

export function useFaturas() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [faturas, setFaturas] = useState([])
  const [loading, setLoading] = useState(true)

  const tenantId = profile?.tenant_id
  const branchId = activeBranchId || profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { setFaturas([]); setLoading(false); return }

    // PostgREST limita a 1000 linhas por request — pagina até trazer tudo.
    const PAGE_SIZE = 1000
    let all = []
    let page = 0
    while (true) {
      let q = supabase.from('faturas').select('*')
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q
        .order('due_date', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      if (error) { captureError('useFaturas', error); setLoading(false); return }
      all = all.concat(data || [])
      if (!data || data.length < PAGE_SIZE) break
      page += 1
    }
    setFaturas(all.map(rowToFatura))
    setLoading(false)
  }, [session, branchId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (f) => {
    const row = faturaToRow(f, tenantId, branchId)
    if (isUuid(f.id)) {
      const { error } = await supabase.from('faturas').update(row).eq('id', f.id)
      if (error) return { ok: false, message: error.message }
      setFaturas(prev => prev.map(x => x.id === f.id ? { ...x, ...f } : x))
      return { ok: true }
    }
    const { data, error } = await supabase.from('faturas').insert(row).select('*').single()
    if (error) return { ok: false, message: error.message }
    const nova = rowToFatura(data)
    setFaturas(prev => [nova, ...prev])
    return { ok: true, data: nova }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    const { error } = await softDelete('faturas', id)
    if (error) return { ok: false, message: error.message }
    setFaturas(prev => prev.filter(f => f.id !== id))
    return { ok: true }
  }, [])

  const removeMany = useCallback(async (ids) => {
    setFaturas(prev => prev.filter(f => !ids.includes(f.id)))
    const uuids = ids.filter(isUuid)
    if (uuids.length) await softDeleteMany('faturas', uuids)
  }, [])

  const bulkSetStatus = useCallback(async (ids, status) => {
    setFaturas(prev => prev.map(f => ids.includes(f.id) ? { ...f, status } : f))
    const uuids = ids.filter(isUuid)
    if (uuids.length) await supabase.from('faturas').update({ status }).in('id', uuids)
  }, [])

  return { faturas, setFaturas, loading, reload: load, save, remove, removeMany, bulkSetStatus }
}
