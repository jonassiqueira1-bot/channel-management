import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete, softDeleteMany } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

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

// Detecta se o id é um UUID real do Supabase (para distinguir INSERT de UPDATE)
function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)
}

function rowToPayment(row) {
  const cf = row.custom_fields || {}
  return {
    id:               row.id,
    // Campos que podem não existir na tabela real → lê de custom_fields como fallback
    contract_id:      cf.contract_id || null,
    contract_numero:  cf.contract_numero || '',
    project_id:       cf.project_id || null,
    origin_type:      cf.origin_type || cf._origem || null,
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
    // Colunas de data — schema real usa vencimento/data_pagamento
    reference_month:  row.data_pagamento || cf.reference_month || '',
    due_date:         row.vencimento     || cf.due_date        || '',
    status:           row.status || 'pendente',
    processed:        cf.processed || false,
    notes:            row.descricao || '',
    inconsistencia:   row.inconsistencia || false,
    tenant_id:        row.tenant_id || null,
    branch_id:        row.branch_id || null,
  }
}

function paymentToRow(p, tenantId, branchId) {
  return {
    tenant_id:      tenantId,
    branch_id:      branchId || null,
    company_id:     p.company_id || null,
    status:         p.status || 'pendente',
    vencimento:     p.due_date || null,
    data_pagamento: p.reference_month || null,
    descricao:      p.notes || '',
    inconsistencia: p.inconsistencia || false,
    // Todos os campos extras em custom_fields (evita erros de colunas inexistentes)
    custom_fields: {
      contract_id:      p.contract_id,
      contract_numero:  p.contract_numero,
      company_nome:     p.company_nome,
      project_id:       p.project_id,
      origin_type:      p.origin_type,
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
      due_date:         p.due_date,
      reference_month:  p.reference_month,
    },
  }
}

export function usePayments() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

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

    let _q = supabase.from('payments').select('*, companies(nome_fantasia, razao_social)')
    const { data, error } = await _q.order('vencimento', { ascending: false })

    if (error) { console.error('[usePayments]', error.message); isMockMode.current = false; setLoading(false); return }

    isMockMode.current = false
    const fromDB = (data || []).map(rowToPayment)

    // Mescla registros locais (provisões offline ou novos não sincronizados)
    const seenIds = new Set()
    const localAll = [...loadLS(), ...loadProvisoes()].filter(p => {
      if (!p.id || seenIds.has(p.id)) return false
      seenIds.add(p.id)
      return true
    })
    const lsOnly = localAll.filter(ls =>
      !fromDB.some(db => db.id === ls.id) &&
      ls.id && !isUuid(ls.id) // apenas registros locais (id não-UUID)
    )
    const merged = [...fromDB, ...lsOnly]
    setPagamentos(merged)
    saveLS(merged.filter(p => !isUuid(p.id))) // salva só locais no LS (DB items recarregados no próximo load)
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (p) => {
    // Otimista: atualiza estado e localStorage imediatamente
    setPagamentos(prev => {
      const exists = prev.some(x => x.id === p.id)
      const next = exists
        ? prev.map(x => x.id === p.id ? { ...x, ...p } : x)
        : [p, ...prev]
      saveLS(next)
      return next
    })
    if (isMockMode.current) return { ok: true }

    const row = paymentToRow(p, tenantId, branchId)

    if (isUuid(p.id)) {
      // UPDATE — registro existente no banco
      const { error } = await supabase.from('payments').update(row).eq('id', p.id)
      if (error) { console.error('[usePayments.save update]', error.message); return { ok: false, message: error.message } }
    } else {
      // INSERT — registro novo (id local como 'man_...' ou 'prov_...')
      const { data, error } = await supabase.from('payments').insert(row).select().single()
      if (error) { console.error('[usePayments.save insert]', error.message); return { ok: false, message: error.message } }
      if (data) {
        // Substitui o id local pelo UUID do banco
        const novo = rowToPayment(data)
        setPagamentos(prev => {
          const next = prev.map(x => x.id === p.id ? novo : x)
          saveLS(next)
          return next
        })
      }
    }
    return { ok: true }
  }, [tenantId, branchId])

  const removeMany = useCallback(async (ids) => {
    setPagamentos(prev => {
      const next = prev.filter(p => !ids.includes(p.id))
      saveLS(next)
      return next
    })
    if (!isMockMode.current) {
      const uuids = ids.filter(isUuid)
      if (uuids.length) await softDeleteMany('payments', uuids)
    }
  }, [])

  const bulkSetProcessed = useCallback(async (ids) => {
    setPagamentos(prev => {
      const next = prev.map(p => ids.includes(p.id) ? { ...p, processed: true } : p)
      saveLS(next)
      return next
    })
    if (!isMockMode.current) {
      const uuids = ids.filter(isUuid)
      if (uuids.length) await supabase.from('payments').update({ custom_fields: { processed: true } }).in('id', uuids)
    }
  }, [])

  const bulkSetPago = useCallback(async (ids) => {
    setPagamentos(prev => {
      const next = prev.map(p => ids.includes(p.id) ? { ...p, status: 'pago' } : p)
      saveLS(next)
      return next
    })
    if (!isMockMode.current) {
      const uuids = ids.filter(isUuid)
      if (uuids.length) await supabase.from('payments').update({ status: 'pago' }).in('id', uuids)
    }
  }, [])

  return { pagamentos, setPagamentos, loading, reload: load, save, removeMany, bulkSetProcessed, bulkSetPago }
}
