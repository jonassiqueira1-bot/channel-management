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
  const { id, nome, tipo_calculo, tipos_calculo_arr, recorrencia, status, vigencia_ini, vigencia_fim, criado, custom_fields, ...rest } = r
  const tipoCalculo = tipo_calculo || (tipos_calculo_arr && tipos_calculo_arr[0]) || 'percentual_fixo'
  return {
    tenant_id:        tenantId,
    branch_id:        branchId || null,
    nome:             nome || 'Sem nome',
    tipo_calculo:     tipoCalculo,
    tipos_calculo_arr: tipos_calculo_arr || [tipoCalculo],
    recorrencia:      recorrencia || null,
    status:           status || 'ativa',
    vigencia_ini:     vigencia_ini || null,
    vigencia_fim:     vigencia_fim || null,
    config:           rest,
    custom_fields:    custom_fields || {},
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
  return { id: row.id, slug: row.slug, label: row.label, descricao: row.descricao || '', cor: row.cor || 'var(--accent)', ordem: row.ordem || 0, ativo: row.ativo, usuario_id: row.usuario_id || null, parceiro_id: row.parceiro_id || null }
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

  const savePersonas = useCallback(async (list) => {
    setPersonas(list)
    if (isMockMode.current || !tenantId) return { ok: true }
    const isUuid = (id) => typeof id === 'string' && id.includes('-') && id.length > 20

    const toRow = (p) => ({
      tenant_id:   tenantId,
      slug:        p.slug,
      label:       p.label,
      descricao:   p.descricao || null,
      cor:         p.cor || '#6366F1',
      ordem:       p.ordem ?? 0,
      ativo:       p.ativo ?? true,
      usuario_id:  p.usuario_id  || null,
      parceiro_id: p.parceiro_id || null,
    })

    // Personas que existem no DB têm UUID real; novas têm UUID gerado em add()
    const dbPersonaIds = personas.filter(p => isUuid(p.id)).map(p => p.id)
    const toDelete  = personas.filter(p => isUuid(p.id) && !list.find(n => n.id === p.id))
    const toUpdate  = list.filter(p => isUuid(p.id) && dbPersonaIds.includes(p.id))
    const toInsert  = list.filter(p => !isUuid(p.id) || !dbPersonaIds.includes(p.id))

    const ops = []
    if (toDelete.length) {
      ops.push(supabase.from('commission_personas').delete().in('id', toDelete.map(p => p.id)))
    }
    for (const p of toUpdate) {
      ops.push(supabase.from('commission_personas').update(toRow(p)).eq('id', p.id))
    }
    if (toInsert.length) {
      const rows = toInsert.map(p => ({ ...toRow(p), ...(isUuid(p.id) ? { id: p.id } : {}) }))
      ops.push(supabase.from('commission_personas').insert(rows).select())
    }

    const results = await Promise.all(ops)
    const err = results.find(r => r.error)
    if (err) return { ok: false, message: err.error.message }

    // Recarrega para obter ids reais de personas recém inseridas
    const { data: fresh } = await supabase.from('commission_personas').select('*').order('ordem')
    if (fresh) setPersonas(fresh.map(rowToPersona))

    return { ok: true }
  }, [tenantId, personas])

  return {
    rules, payments, personas, loading, reload: load,
    saveRule, removeRule,
    savePayment, removePayment, bulkSetPaymentStatus,
    savePersonas,
    setRules, setPayments, setPersonas,
    isMock: isMockMode,
  }
}
