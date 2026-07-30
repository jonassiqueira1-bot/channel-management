import { captureError } from '../lib/sentry'
import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete, softDeleteMany } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)
}

function rowToProvisao(row) {
  const cf = row.custom_fields || {}
  return {
    id:               row.id,
    contract_id:      cf.contract_id || null,
    contract_numero:  cf.contract_numero || '',
    project_id:       cf.project_id || null,
    origin_type:      cf.origin_type || null,
    company_id:       row.company_id || null,
    company_nome:     cf.company_nome || '',
    produto_id:       cf.produto_id || null,
    produto_nome:     cf.produto_nome || '',
    // Mesma estrutura de `itens` usada em contratos (produto_id, nome,
    // tipo_produto, quantidade, valor, desconto_pct) — provisão de um
    // contrato sempre carrega o produto que a originou. Ainda não suporta
    // múltiplos produtos numa provisão só (é sempre 1 cobrança = 1 item),
    // mas o formato bate com o de Contratos pra manter compatibilidade.
    itens:            Array.isArray(cf.itens) ? cf.itens : [],
    amount_cdu:       Number(row.amount_cdu)       || 0,
    amount_sms:       Number(row.amount_sms)       || 0,
    amount_services:  Number(row.amount_services)  || 0,
    amount_discount:  Number(row.amount_discount)  || 0,
    amount_total_net: Number(row.amount_total_net) || 0,
    num_documento:    cf.num_documento || '',
    data_emissao:     cf.data_emissao || '',
    data_baixa:       cf.data_baixa || '',
    valor_recebido:   cf.valor_recebido ?? null,
    parcela:          cf.parcela || '',
    // % efetivamente recebido em relação ao previsto — mesmo conceito do
    // campo PERCBAIXA da TOTVS; permite representar baixa parcial em vez de
    // só pago/não-pago binário.
    percentual_baixa: cf.percentual_baixa ?? null,
    proposta_id:      cf.proposta_id || '',
    reference_month:  row.reference_month || cf.reference_month || '',
    due_date:         row.due_date        || cf.due_date        || '',
    data_fechamento:  row.data_fechamento || cf.data_fechamento || null,
    status:           row.status || 'pendente',
    processed:        row.processed ?? false,
    notes:            row.notes || cf.notes || '',
    inconsistencia:        row.inconsistencia || false,
    inconsistencia_status: row.inconsistencia_status || cf.inconsistencia_status || 'sem_inconsistencia',
    tenant_id:             row.tenant_id || null,
    branch_id:        row.branch_id || null,
  }
}

function provisaoToRow(p, tenantId, branchId) {
  // Se `itens` não veio explícito (ex: forms antigos, ou o produto único
  // selecionado no form atual), monta um item único a partir de
  // produto_id/produto_nome + o valor total já calculado — garante que toda
  // provisão salva tenha a mesma estrutura de `itens` que um contrato.
  const itens = Array.isArray(p.itens) && p.itens.length > 0
    ? p.itens
    : (p.produto_id ? [{
        produto_id: p.produto_id, nome: p.produto_nome || '', tipo_produto: p.produto_tipo || null,
        quantidade: 1,
        valor: (Number(p.amount_cdu)||0) + (Number(p.amount_sms)||0) + (Number(p.amount_services)||0),
        desconto_pct: 0,
      }] : [])
  return {
    tenant_id:       tenantId,
    branch_id:       branchId || null,
    company_id:      p.company_id || null,
    status:          p.status || 'pendente',
    descricao:       p.notes || '',
    reference_month: p.reference_month || null,
    due_date:        p.due_date || null,
    data_fechamento: p.data_fechamento || null,
    notes:           p.notes || '',
    processed:       p.processed ?? false,
    inconsistencia:        p.inconsistencia || false,
    inconsistencia_status: p.inconsistencia_status || 'sem_inconsistencia',
    amount_cdu:      Number(p.amount_cdu)      || 0,
    amount_sms:      Number(p.amount_sms)      || 0,
    amount_services: Number(p.amount_services) || 0,
    amount_discount: Number(p.amount_discount) || 0,
    custom_fields: {
      contract_id:     p.contract_id,
      contract_numero: p.contract_numero,
      company_nome:    p.company_nome,
      project_id:      p.project_id,
      origin_type:     p.origin_type,
      produto_id:      p.produto_id,
      produto_nome:    p.produto_nome,
      itens,
      num_documento:   p.num_documento,
      data_emissao:    p.data_emissao,
      data_baixa:      p.data_baixa,
      valor_recebido:  p.valor_recebido,
      parcela:         p.parcela,
      percentual_baixa: p.percentual_baixa ?? null,
      proposta_id:      p.proposta_id || null,
    },
  }
}

export function useProvisoes() {
  const { session }       = useAuth()
  const { profile }       = useProfile()
  const { activeBranchId } = useBranchContext()

  const [provisoes, setProvisoes] = useState([])
  const [loading,   setLoading]   = useState(true)

  const tenantId = profile?.tenant_id
  const branchId = activeBranchId || profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { setProvisoes([]); setLoading(false); return }

    // PostgREST limita a 1000 linhas por request — sem paginação explícita,
    // uma base com mais de 1000 provisões é truncada silenciosamente.
    const PAGE_SIZE = 1000
    let all = []
    let page = 0
    while (true) {
      let q = supabase.from('provisoes').select('*')
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q
        .order('due_date', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      if (error) { captureError('useProvisoes', error); setLoading(false); return }
      all = all.concat(data || [])
      if (!data || data.length < PAGE_SIZE) break
      page += 1
    }
    setProvisoes(all.map(rowToProvisao))
    setLoading(false)
  }, [session, branchId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (p) => {
    const row = provisaoToRow(p, tenantId, branchId)
    if (isUuid(p.id)) {
      const { error } = await supabase.from('provisoes').update(row).eq('id', p.id)
      if (error) return { ok: false, message: error.message }
      setProvisoes(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x))
    } else {
      const { data, error } = await supabase.from('provisoes').insert(row).select('*').single()
      if (error) return { ok: false, message: error.message }
      setProvisoes(prev => [rowToProvisao(data), ...prev])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    const { error } = await softDelete('provisoes', id)
    if (error) return { ok: false, message: error.message }
    setProvisoes(prev => prev.filter(p => p.id !== id))
    return { ok: true }
  }, [])

  const removeMany = useCallback(async (ids) => {
    setProvisoes(prev => prev.filter(p => !ids.includes(p.id)))
    const uuids = ids.filter(isUuid)
    if (uuids.length) await softDeleteMany('provisoes', uuids)
  }, [])

  const bulkSetStatus = useCallback(async (ids, status) => {
    setProvisoes(prev => prev.map(p => ids.includes(p.id) ? { ...p, status } : p))
    const uuids = ids.filter(isUuid)
    if (uuids.length) await supabase.from('provisoes').update({ status }).in('id', uuids)
  }, [])

  return { provisoes, setProvisoes, loading, reload: load, save, remove, removeMany, bulkSetStatus }
}
