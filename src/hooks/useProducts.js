import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_PRODUTOS } from '../data/mockProdutos'

function rowToProduct(row) {
  const cf = row.custom_fields || {}
  return {
    id:                  row.id,
    nome:                row.nome,
    codigo:              cf.codigo || '',
    tipo:                row.tipo || cf.tipo || 'saas',
    categoria:           cf.categoria || '',
    descricao:           row.descricao || '',
    status:              row.status || 'ativo',
    cobranca:            cf.cobranca || 'mensal',
    preco:               row.preco || 0,
    setup:               cf.setup || 0,
    desconto_max:        cf.desconto_max || 0,
    unidades_incluidas:  cf.unidades_incluidas || null,
    usuarios_incluidos:  cf.usuarios_incluidos || null,
    features:            cf.features || '',
    visivel_canal:       cf.visivel_canal ?? true,
    contratos:           cf.contratos || 0,
    criado:              row.created_at?.slice(0, 10) || '',
  }
}

function productToRow(p, tenantId, branchId) {
  return {
    tenant_id:  tenantId,
    branch_id:  branchId || null,
    nome:       p.nome,
    descricao:  p.descricao || null,
    tipo:       p.tipo || null,
    preco:      p.preco ? Number(p.preco) : null,
    unidade:    null,
    status:     p.status || 'ativo',
    custom_fields: {
      codigo:             p.codigo,
      categoria:          p.categoria,
      cobranca:           p.cobranca,
      setup:              p.setup,
      desconto_max:       p.desconto_max,
      unidades_incluidas: p.unidades_incluidas,
      usuarios_incluidos: p.usuarios_incluidos,
      features:           p.features,
      visivel_canal:      p.visivel_canal,
      contratos:          p.contratos,
    },
  }
}

export function useProducts() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [produtos, setProdutos] = useState(MOCK_PRODUTOS)
  const [loading, setLoading]   = useState(true)
  const isMockMode              = useRef(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setLoading(false); return }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('nome')
    if (error) { isMockMode.current = true; setLoading(false); return }
    isMockMode.current = false
    setProdutos((data || []).map(rowToProduct))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (p) => {
    if (isMockMode.current) {
      setProdutos(prev => {
        const idx = prev.findIndex(x => x.id === p.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = p; return n }
        return [...prev, { ...p, id: p.id || Date.now(), criado: new Date().toISOString().slice(0, 10) }]
      })
      return { ok: true }
    }
    const row = productToRow(p, tenantId, branchId)
    const isUuid = typeof p.id === 'string' && p.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('products').update(row).eq('id', p.id)
      if (error) return { ok: false, message: error.message }
      setProdutos(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x))
    } else {
      const { data, error } = await supabase.from('products').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setProdutos(prev => [...prev, rowToProduct(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setProdutos(prev => prev.filter(p => p.id !== id)); return { ok: true } }
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setProdutos(prev => prev.filter(p => p.id !== id))
    return { ok: true }
  }, [])

  const bulkSetStatus = useCallback(async (ids, status) => {
    if (isMockMode.current) { setProdutos(prev => prev.map(p => ids.includes(p.id) ? { ...p, status } : p)); return }
    await supabase.from('products').update({ status }).in('id', ids)
    setProdutos(prev => prev.map(p => ids.includes(p.id) ? { ...p, status } : p))
  }, [])

  const importMany = useCallback(async (rows) => {
    if (isMockMode.current) { setProdutos(prev => [...prev, ...rows]); return { ok: true } }
    const mapped = rows.map(p => productToRow(p, tenantId, branchId))
    const { data, error } = await supabase.from('products').insert(mapped).select()
    if (error) return { ok: false, message: error.message }
    setProdutos(prev => [...prev, ...(data || []).map(rowToProduct)])
    return { ok: true }
  }, [tenantId, branchId])

  return { produtos, loading, reload: load, save, remove, bulkSetStatus, importMany, setProdutos, isMock: isMockMode }
}
