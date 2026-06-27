import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import {
  MOCK_RULES, MOCK_PAYMENTS, MOCK_PERSONAS,
} from '../data/mockComissoes'

function rowToRule(row) {
  return {
    id:           row.id,
    nome:         row.nome,
    tipo_calculo: row.tipo_calculo,
    recorrencia:  row.recorrencia || null,
    status:       row.status || 'ativa',
    vigencia_ini: row.vigencia_ini || null,
    vigencia_fim: row.vigencia_fim || null,
    ...(row.config || {}),
    custom_fields: row.custom_fields || {},
    criado:       row.created_at?.slice(0, 10) || '',
  }
}

function ruleToRow(r, tenantId, branchId) {
  const { id, nome, tipo_calculo, recorrencia, status, vigencia_ini, vigencia_fim, criado, custom_fields, ...rest } = r
  return {
    tenant_id:    tenantId,
    branch_id:    branchId || null,
    nome:         nome,
    tipo_calculo: tipo_calculo,
    recorrencia:  recorrencia || null,
    status:       status || 'ativa',
    vigencia_ini: vigencia_ini || null,
    vigencia_fim: vigencia_fim || null,
    config:       rest,
    custom_fields: custom_fields || {},
  }
}

function rowToPayment(row) {
  const cf = row.custom_fields || {}
  return {
    id:               row.id,
    rule_id:          row.rule_id || null,
    company_id:       row.company_id || null,
    contract_id:      row.contract_id || null,
    beneficiario_id:  row.beneficiario_id || cf.beneficiario_id || null,
    beneficiario_nome:row.beneficiario_nome || cf.beneficiario_nome || '',
    persona_slug:     row.persona_slug || cf.persona_slug || '',
    periodo_mes:      row.periodo_mes || null,
    periodo_ano:      row.periodo_ano || null,
    valor_bruto:      row.valor_bruto || 0,
    valor_comissao:   row.valor_comissao || 0,
    status:           row.status || 'pendente',
    data_pagamento:   row.data_pagamento || null,
    observacoes:      row.observacoes || '',
    ...cf,
    criado:           row.created_at?.slice(0, 10) || '',
  }
}

function paymentToRow(p, tenantId, branchId) {
  const { id, criado, ...rest } = p
  return {
    tenant_id:        tenantId,
    branch_id:        branchId || null,
    rule_id:          p.rule_id || null,
    company_id:       p.company_id || null,
    contract_id:      p.contract_id || null,
    beneficiario_id:  p.beneficiario_id ? String(p.beneficiario_id) : null,
    beneficiario_nome:p.beneficiario_nome || null,
    persona_slug:     p.persona_slug || null,
    periodo_mes:      p.periodo_mes ? Number(p.periodo_mes) : null,
    periodo_ano:      p.periodo_ano ? Number(p.periodo_ano) : null,
    valor_bruto:      p.valor_bruto ? Number(p.valor_bruto) : null,
    valor_comissao:   p.valor_comissao ? Number(p.valor_comissao) : null,
    status:           p.status || 'pendente',
    data_pagamento:   p.data_pagamento || null,
    observacoes:      p.observacoes || null,
    custom_fields:    {},
  }
}

function rowToPersona(row) {
  return { id: row.id, slug: row.slug, label: row.label, descricao: row.descricao || '', cor: row.cor || 'var(--accent)', ordem: row.ordem || 0, ativo: row.ativo }
}

export function useCommissions() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [rules,    setRules]    = useState([])
  const [payments, setPayments] = useState([])
  const [personas, setPersonas] = useState(MOCK_PERSONAS)
  const [loading, setLoading]   = useState(true)
  const isMockMode              = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setRules(MOCK_RULES); setPayments(MOCK_PAYMENTS); setPersonas(MOCK_PERSONAS); setLoading(false); return }
    const [r, p, pe] = await Promise.all([
      supabase.from('commission_rules').select('*').order('created_at', { ascending: false }),
      supabase.from('commission_payments').select('*').order('created_at', { ascending: false }),
      supabase.from('commission_personas').select('*').order('ordem'),
    ])
    if (r.error) { isMockMode.current = false; setRules([]); setPayments([]); setLoading(false); return }
    isMockMode.current = false
    setRules((r.data || []).map(rowToRule))
    setPayments((p.data || []).map(rowToPayment))
    if (!pe.error) setPersonas((pe.data || []).map(rowToPersona))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const saveRule = useCallback(async (rule) => {
    if (isMockMode.current) {
      setRules(prev => { const idx = prev.findIndex(x => x.id === rule.id); if (idx >= 0) { const n=[...prev]; n[idx]=rule; return n } return [...prev, { ...rule, id: rule.id || `r${Date.now()}` }] })
      return { ok: true }
    }
    const row = ruleToRow(rule, tenantId, branchId)
    const isUuid = typeof rule.id === 'string' && rule.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('commission_rules').update(row).eq('id', rule.id)
      if (error) return { ok: false, message: error.message }
      setRules(prev => prev.map(x => x.id === rule.id ? { ...x, ...rule } : x))
    } else {
      const { data, error } = await supabase.from('commission_rules').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setRules(prev => [...prev, rowToRule(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const removeRule = useCallback(async (id) => {
    if (isMockMode.current) { setRules(prev => prev.filter(r => r.id !== id)); return { ok: true } }
    const { error } = await supabase.from('commission_rules').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setRules(prev => prev.filter(r => r.id !== id))
    return { ok: true }
  }, [])

  const savePayment = useCallback(async (p) => {
    if (isMockMode.current) {
      setPayments(prev => { const idx = prev.findIndex(x => x.id === p.id); if (idx >= 0) { const n=[...prev]; n[idx]=p; return n } return [...prev, { ...p, id: p.id || `pay${Date.now()}` }] })
      return { ok: true }
    }
    const row = paymentToRow(p, tenantId, branchId)
    const isUuid = typeof p.id === 'string' && p.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('commission_payments').update(row).eq('id', p.id)
      if (error) return { ok: false, message: error.message }
      setPayments(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x))
    } else {
      const { data, error } = await supabase.from('commission_payments').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setPayments(prev => [...prev, rowToPayment(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const removePayment = useCallback(async (id) => {
    if (isMockMode.current) { setPayments(prev => prev.filter(p => p.id !== id)); return { ok: true } }
    const { error } = await supabase.from('commission_payments').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setPayments(prev => prev.filter(p => p.id !== id))
    return { ok: true }
  }, [])

  const bulkSetPaymentStatus = useCallback(async (ids, status) => {
    if (isMockMode.current) { setPayments(prev => prev.map(p => ids.includes(p.id) ? { ...p, status } : p)); return }
    await supabase.from('commission_payments').update({ status }).in('id', ids)
    setPayments(prev => prev.map(p => ids.includes(p.id) ? { ...p, status } : p))
  }, [])

  return {
    rules, payments, personas, loading, reload: load,
    saveRule, removeRule,
    savePayment, removePayment, bulkSetPaymentStatus,
    setRules, setPayments, setPersonas,
    isMock: isMockMode,
  }
}
