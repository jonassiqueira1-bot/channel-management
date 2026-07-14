import { useState, useEffect, useCallback } from 'react'
import { supabase, softDeleteMany } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

export function useTabelaPrecos() {
  const { session } = useAuth()
  const { profile }  = useProfile()
  const tenantId     = profile?.tenant_id

  const [historico, setHistorico] = useState([])
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    if (!session?.user || !tenantId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('tabela_precos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { setHistorico([]); setLoading(false); return }
    setHistorico(data || [])
    setLoading(false)
  }, [session, tenantId])

  useEffect(() => { load() }, [load])

  const registrarReajusteEmMassa = useCallback(async ({ produtos, percentual, vigencia_inicio, indice, observacoes }) => {
    if (!produtos?.length) return { ok: false, message: 'Selecione ao menos um produto' }
    const pct = Number(percentual || 0)
    const { data: { user } } = await supabase.auth.getUser()
    const rows = produtos.map(p => ({
      tenant_id:       tenantId,
      produto_id:      p.id,
      preco:           Math.round((Number(p.preco || 0) * (1 + pct / 100)) * 100) / 100,
      preco_anterior:  Number(p.preco || 0),
      percentual:      pct,
      indice:          indice || 'manual',
      vigencia_inicio: vigencia_inicio || new Date().toISOString().slice(0, 10),
      observacoes:     observacoes || null,
      criado_por:      user?.id || null,
    }))
    const { data, error } = await supabase.from('tabela_precos').insert(rows).select()
    if (error) return { ok: false, message: error.message }
    setHistorico(prev => [...(data || []), ...prev])
    return { ok: true, data }
  }, [tenantId])

  const registrarReajusteIndividual = useCallback(async ({ produto_id, preco_atual, preco, vigencia_inicio, indice, observacoes }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const row = {
      tenant_id:       tenantId,
      produto_id,
      preco:           Number(preco),
      preco_anterior:  Number(preco_atual || 0),
      percentual:      null,
      indice:          indice || 'manual',
      vigencia_inicio: vigencia_inicio || new Date().toISOString().slice(0, 10),
      observacoes:     observacoes || null,
      criado_por:      user?.id || null,
    }
    const { data, error } = await supabase.from('tabela_precos').insert(row).select().single()
    if (error) return { ok: false, message: error.message }
    setHistorico(prev => [data, ...prev])
    return { ok: true, data }
  }, [tenantId])

  const aplicarAtualizacoes = useCallback(async () => {
    const { data, error } = await supabase.rpc('aplicar_atualizacao_precos', { p_tenant_id: tenantId })
    if (error) return { ok: false, message: error.message }
    await load()
    return { ok: true, mudancas: data || [] }
  }, [tenantId, load])

  const removerLinhas = useCallback(async (ids) => {
    if (!ids?.length) return { ok: true }
    const { ok, message } = await softDeleteMany('tabela_precos', ids)
    if (!ok) return { ok: false, message }
    setHistorico(prev => prev.filter(h => !ids.includes(h.id)))
    return { ok: true }
  }, [])

  return {
    historico,
    loading,
    reload: load,
    registrarReajusteEmMassa,
    registrarReajusteIndividual,
    aplicarAtualizacoes,
    removerLinhas,
  }
}
