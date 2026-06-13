import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_PAGAMENTOS } from '../data/mockPagamentos'

function rowToPayment(row) {
  const cf = row.custom_fields || {}
  return {
    id:               row.id,
    contract_id:      row.contract_id || null,
    contract_numero:  cf.contract_numero || '',
    company_id:       row.company_id || null,
    company_nome:     row.companies?.nome_fantasia || row.companies?.razao_social || cf.company_nome || '',
    produto_id:       cf.produto_id || null,
    produto_nome:     cf.produto_nome || '',
    amount_cdu:       cf.amount_cdu || 0,
    amount_sms:       cf.amount_sms || 0,
    amount_services:  cf.amount_services || 0,
    amount_discount:  cf.amount_discount || 0,
    amount_total_net: cf.amount_total_net || 0,
    num_documento:    cf.num_documento || '',
    data_emissao:     cf.data_emissao || '',
    data_baixa:       cf.data_baixa || '',
    valor_recebido:   cf.valor_recebido || 0,
    parcela:          cf.parcela || '',
    reference_month:  row.data_pagamento || '',
    due_date:         row.vencimento || '',
    status:           row.status || 'pendente',
    processed:        cf.processed || false,
    notes:            row.descricao || '',
    tenant_id:        row.tenant_id || null,
    branch_id:        row.branch_id || null,
  }
}

function paymentToRow(p, tenantId, branchId) {
  return {
    tenant_id:       tenantId,
    branch_id:       branchId || null,
    company_id:      p.company_id || null,
    contract_id:     p.contract_id || null,
    status:          p.status || 'pendente',
    vencimento:      p.due_date || null,
    data_pagamento:  p.reference_month || null,
    descricao:       p.notes || '',
    custom_fields: {
      contract_numero:  p.contract_numero,
      company_nome:     p.company_nome,
      produto_id:       p.produto_id,
      produto_nome:     p.produto_nome,
      amount_cdu:       p.amount_cdu,
      amount_sms:       p.amount_sms,
      amount_services:  p.amount_services,
      amount_discount:  p.amount_discount,
      amount_total_net: p.amount_total_net,
      num_documento:    p.num_documento,
      data_emissao:     p.data_emissao,
      data_baixa:       p.data_baixa,
      valor_recebido:   p.valor_recebido,
      parcela:          p.parcela,
      processed:        p.processed,
    },
  }
}

export function usePayments() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [pagamentos, setPagamentos] = useState(MOCK_PAGAMENTOS)
  const [loading,    setLoading]    = useState(true)
  const isMockMode                  = useRef(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setLoading(false); return }

    const { data, error } = await supabase
      .from('payments')
      .select('*, companies(nome_fantasia, razao_social)')
      .order('vencimento', { ascending: false })

    if (error) { isMockMode.current = true; setLoading(false); return }

    isMockMode.current = false
    setPagamentos((data || []).map(rowToPayment))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (p) => {
    if (isMockMode.current) {
      setPagamentos(prev => prev.map(x => x.id === p.id ? p : x))
      return { ok: true }
    }
    const row = paymentToRow(p, tenantId, branchId)
    const { error } = await supabase.from('payments').update(row).eq('id', p.id)
    if (error) return { ok: false, message: error.message }
    setPagamentos(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x))
    return { ok: true }
  }, [tenantId, branchId])

  const removeMany = useCallback(async (ids) => {
    setPagamentos(prev => prev.filter(p => !ids.includes(p.id)))
    if (!isMockMode.current) await supabase.from('payments').delete().in('id', ids)
  }, [])

  const bulkSetProcessed = useCallback(async (ids) => {
    setPagamentos(prev => prev.map(p => ids.includes(p.id) ? { ...p, processed: true } : p))
    if (!isMockMode.current) {
      const patch = { custom_fields: { processed: true } }
      await supabase.from('payments').update(patch).in('id', ids)
    }
  }, [])

  const bulkSetPago = useCallback(async (ids) => {
    setPagamentos(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'pago' } : p))
    if (!isMockMode.current) await supabase.from('payments').update({ status: 'pago' }).in('id', ids)
  }, [])

  return { pagamentos, setPagamentos, loading, reload: load, save, removeMany, bulkSetProcessed, bulkSetPago }
}
