import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MOCK_CONTRATOS_FALLBACK = [] // fallback vazio; dados reais vêm de Supabase ou do inline mock

// Migra campos legados (produto único por slot) para o formato de array
function migrarSlotLegado(cf, slot) {
  const id   = cf[`produto_${slot}_id`]
  const nome = cf[`produto_${slot}_nome`] || ''
  if (!id) return []
  return [{
    produto_id:          id,
    nome,
    valor:               cf[`valor_${slot}`] || 0,
    tabela:              cf[`tabela_${slot}`] || null,
    desconto_pct:        cf[`desconto_${slot}_pct`] || 0,
    desconto_autorizado: cf[`desconto_autorizado_${slot}`] || false,
  }]
}

function rowToContrato(row) {
  const cf = row.custom_fields || {}
  return {
    id:              row.id,
    numero:          row.numero || '',
    empresa_id:      row.company_id || null,
    empresa_nome:    row.companies?.nome_fantasia || row.companies?.razao_social || cf.empresa_nome || '',
    status:          row.status || 'ativo',
    primeira_compra: cf.primeira_compra || false,
    vigencia_inicio: row.data_inicio || '',
    vigencia_fim:    row.data_fim || '',
    itens_adesao:    cf.itens_adesao  || migrarSlotLegado(cf, 'adesao'),
    itens_mrr:       cf.itens_mrr     || migrarSlotLegado(cf, 'mrr'),
    itens_servico:   cf.itens_servico || migrarSlotLegado(cf, 'servico'),
    responsavel:     cf.responsavel || '',
    observacoes:     row.observacoes || '',
    criado:          row.created_at?.slice(0, 10) || '',
    tenant_id:       row.tenant_id || null,
    branch_id:       row.branch_id || null,
    opportunity_id:  cf.opportunity_id || null,
    opportunity_titulo: cf.opportunity_titulo || '',
    origem:          cf.origem || '',
    data_pag_cdu:    cf.data_pag_cdu || '',
    data_pag_sms:    cf.data_pag_sms || '',
  }
}

function contratoToRow(c, tenantId, branchId) {
  return {
    tenant_id:   tenantId,
    branch_id:   branchId || null,
    company_id:  c.empresa_id || null,
    numero:      c.numero || '',
    status:      c.status || 'ativo',
    data_inicio: c.vigencia_inicio || null,
    data_fim:    c.vigencia_fim || null,
    observacoes: c.observacoes || '',
    custom_fields: {
      empresa_nome:       c.empresa_nome,
      primeira_compra:    c.primeira_compra,
      itens_adesao:       c.itens_adesao  || [],
      itens_mrr:          c.itens_mrr     || [],
      itens_servico:      c.itens_servico || [],
      responsavel:        c.responsavel,
      opportunity_id:     c.opportunity_id || null,
      opportunity_titulo: c.opportunity_titulo || '',
      origem:             c.origem || '',
      data_pag_cdu:       c.data_pag_cdu || '',
      data_pag_sms:       c.data_pag_sms || '',
    },
  }
}

export function useContracts(mockFallback = MOCK_CONTRATOS_FALLBACK) {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [contratos, setContratos] = useState(mockFallback)
  const [loading,   setLoading]   = useState(true)
  const isMockMode                = useRef(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setLoading(false); return }

    const { data, error } = await supabase
      .from('contracts')
      .select('*, companies(nome_fantasia, razao_social)')
      .order('created_at', { ascending: false })

    if (error) { isMockMode.current = true; setLoading(false); return }

    isMockMode.current = false
    setContratos((data || []).map(rowToContrato))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  // Sync para localStorage — permite que Indicadores leiam os dados
  useEffect(() => {
    if (!loading) localStorage.setItem('crm:contratos_v2', JSON.stringify(contratos))
  }, [contratos, loading])

  const save = useCallback(async (c) => {
    if (isMockMode.current) {
      setContratos(prev => {
        const idx = prev.findIndex(x => x.id === c.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = c; return n }
        return [...prev, { ...c, id: c.id || Date.now(), criado: new Date().toISOString().slice(0, 10) }]
      })
      return { ok: true }
    }
    const row = contratoToRow(c, tenantId, branchId)
    const isUuid = typeof c.id === 'string' && c.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('contracts').update(row).eq('id', c.id)
      if (error) return { ok: false, message: error.message }
      setContratos(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x))
    } else {
      const { data, error } = await supabase.from('contracts').insert(row).select('*, companies(nome_fantasia, razao_social)').single()
      if (error) return { ok: false, message: error.message }
      setContratos(prev => [...prev, rowToContrato(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setContratos(prev => prev.filter(c => c.id !== id)); return { ok: true } }
    const { error } = await supabase.from('contracts').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setContratos(prev => prev.filter(c => c.id !== id))
    return { ok: true }
  }, [])

  const bulkSetStatus = useCallback(async (ids, status) => {
    setContratos(prev => prev.map(c => ids.includes(c.id) ? { ...c, status } : c))
    if (!isMockMode.current) {
      await supabase.from('contracts').update({ status }).in('id', ids)
    }
  }, [])

  const bulkRemove = useCallback(async (ids) => {
    setContratos(prev => prev.filter(c => !ids.includes(c.id)))
    if (!isMockMode.current) {
      await supabase.from('contracts').delete().in('id', ids)
    }
  }, [])

  return { contratos, setContratos, loading, reload: load, save, remove, bulkSetStatus, bulkRemove }
}
