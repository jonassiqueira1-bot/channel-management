import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MOCK_CONTRATOS_FALLBACK = [] // fallback vazio; dados reais vêm de Supabase ou do inline mock

function rowToContrato(row) {
  const cf = row.custom_fields || {}
  return {
    id:                          row.id,
    numero:                      row.numero || '',
    empresa_id:                  row.company_id || null,
    empresa_nome:                row.companies?.nome_fantasia || row.companies?.razao_social || cf.empresa_nome || '',
    status:                      row.status || 'ativo',
    primeira_compra:             cf.primeira_compra || false,
    vigencia_inicio:             row.data_inicio || '',
    vigencia_fim:                row.data_fim || '',
    produto_adesao_id:           cf.produto_adesao_id || null,
    produto_adesao_nome:         cf.produto_adesao_nome || '',
    valor_adesao:                cf.valor_adesao || null,
    tabela_adesao:               cf.tabela_adesao || null,
    desconto_adesao_pct:         cf.desconto_adesao_pct || 0,
    desconto_autorizado_adesao:  cf.desconto_autorizado_adesao || false,
    produto_mrr_id:              cf.produto_mrr_id || null,
    produto_mrr_nome:            cf.produto_mrr_nome || '',
    valor_mrr:                   cf.valor_mrr || null,
    tabela_mrr:                  cf.tabela_mrr || null,
    desconto_mrr_pct:            cf.desconto_mrr_pct || 0,
    desconto_autorizado_mrr:     cf.desconto_autorizado_mrr || false,
    produto_servico_id:          cf.produto_servico_id || null,
    produto_servico_nome:        cf.produto_servico_nome || '',
    valor_servico:               cf.valor_servico || null,
    tabela_servico:              cf.tabela_servico || null,
    desconto_servico_pct:        cf.desconto_servico_pct || 0,
    desconto_autorizado_servico: cf.desconto_autorizado_servico || false,
    responsavel:                 cf.responsavel || '',
    observacoes:                 row.observacoes || '',
    criado:                      row.created_at?.slice(0, 10) || '',
    tenant_id:                   row.tenant_id || null,
    branch_id:                   row.branch_id || null,
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
      empresa_nome:                c.empresa_nome,
      primeira_compra:             c.primeira_compra,
      produto_adesao_id:           c.produto_adesao_id,
      produto_adesao_nome:         c.produto_adesao_nome,
      valor_adesao:                c.valor_adesao,
      tabela_adesao:               c.tabela_adesao,
      desconto_adesao_pct:         c.desconto_adesao_pct,
      desconto_autorizado_adesao:  c.desconto_autorizado_adesao,
      produto_mrr_id:              c.produto_mrr_id,
      produto_mrr_nome:            c.produto_mrr_nome,
      valor_mrr:                   c.valor_mrr,
      tabela_mrr:                  c.tabela_mrr,
      desconto_mrr_pct:            c.desconto_mrr_pct,
      desconto_autorizado_mrr:     c.desconto_autorizado_mrr,
      produto_servico_id:          c.produto_servico_id,
      produto_servico_nome:        c.produto_servico_nome,
      valor_servico:               c.valor_servico,
      tabela_servico:              c.tabela_servico,
      desconto_servico_pct:        c.desconto_servico_pct,
      desconto_autorizado_servico: c.desconto_autorizado_servico,
      responsavel:                 c.responsavel,
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

  return { contratos, setContratos, loading, reload: load, save, remove, bulkSetStatus }
}
