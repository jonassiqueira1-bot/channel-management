import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

// Chave exclusiva para provisões geradas pela integração (separada de dados mock)
export const PROVISOES_LS_KEY = 'pagamentos:provisoes_v1'
const PAYMENTS_LS_KEY = 'pagamentos:lista_v1'

function loadProvisoes() {
  try { return JSON.parse(localStorage.getItem(PROVISOES_LS_KEY) || '[]') } catch { return [] }
}
function loadLS() {
  try { return JSON.parse(localStorage.getItem(PAYMENTS_LS_KEY) || '[]') } catch { return [] }
}
function saveLS(list) {
  try { localStorage.setItem(PAYMENTS_LS_KEY, JSON.stringify(list)) } catch {}
}

function rowToPayment(row) {
  const cf = row.custom_fields || {}
  return {
    id:               row.id,
    contract_id:      row.contract_id || null,
    contract_numero:  cf.contract_numero || '',
    project_id:       row.project_id || null,
    origin_type:      row.origin_type || cf._origem || null,
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
    reference_month:  row.reference_month || '',
    due_date:         row.due_date || '',
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
    project_id:      p.project_id || null,
    origin_type:     p.origin_type || null,
    status:          p.status || 'pendente',
    due_date:        p.due_date || null,
    reference_month: p.reference_month || null,
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

  const [pagamentos, setPagamentos] = useState([])
  const [loading,    setLoading]    = useState(true)
  const isMockMode                  = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMockMode.current = true
      const ls = loadLS()
      const provisoes = loadProvisoes()
      const lsOnly = provisoes.filter(p => !ls.some(x => x.id === p.id))
      setPagamentos([...ls, ...lsOnly])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*, companies(nome_fantasia, razao_social)')
      .order('due_date', { ascending: false })

    if (error) { console.error('[usePayments]', error.message); isMockMode.current = false; setLoading(false); return }

    isMockMode.current = false
    const fromDB = (data || []).map(rowToPayment)
    // Mescla entradas do localStorage que ainda não estão no Supabase
    const fromLS = loadProvisoes()
    const lsOnly = fromLS.filter(ls =>
      !fromDB.some(db =>
        String(db.contract_id) === String(ls.contract_id) &&
        db.due_date === ls.due_date &&
        String(db.produto_id) === String(ls.produto_id)
      )
    )
    const merged = [...fromDB, ...lsOnly]
    setPagamentos(merged)
    saveLS(merged)
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (p) => {
    // Atualiza estado e localStorage imediatamente (otimista)
    setPagamentos(prev => {
      const next = prev.map(x => x.id === p.id ? { ...x, ...p } : x)
      saveLS(next)
      return next
    })
    if (isMockMode.current) return { ok: true }

    const row = paymentToRow(p, tenantId, branchId)
    const { error } = await supabase.from('payments').update(row).eq('id', p.id)
    if (error) {
      console.error('[usePayments.save]', error.message)
      return { ok: false, message: error.message }
    }
    return { ok: true }
  }, [tenantId, branchId])

  const removeMany = useCallback(async (ids) => {
    setPagamentos(prev => {
      const next = prev.filter(p => !ids.includes(p.id))
      saveLS(next)
      return next
    })
    if (!isMockMode.current) await supabase.from('payments').delete().in('id', ids)
  }, [])

  const bulkSetProcessed = useCallback(async (ids) => {
    setPagamentos(prev => {
      const next = prev.map(p => ids.includes(p.id) ? { ...p, processed: true } : p)
      saveLS(next)
      return next
    })
    if (!isMockMode.current) {
      const patch = { custom_fields: { processed: true } }
      await supabase.from('payments').update(patch).in('id', ids)
    }
  }, [])

  const bulkSetPago = useCallback(async (ids) => {
    setPagamentos(prev => {
      const next = prev.map(p => ids.includes(p.id) ? { ...p, status: 'pago' } : p)
      saveLS(next)
      return next
    })
    if (!isMockMode.current) await supabase.from('payments').update({ status: 'pago' }).in('id', ids)
  }, [])

  return { pagamentos, setPagamentos, loading, reload: load, save, removeMany, bulkSetProcessed, bulkSetPago }
}
