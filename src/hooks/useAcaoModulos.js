import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

function rowToModulo(row) {
  return {
    id: row.id,
    acao_id: row.acao_id,
    titulo: row.titulo,
    ordem: row.ordem || 0,
    instrutor_responsavel_id: row.instrutor_responsavel_id || null,
  }
}
function rowToItem(row) {
  return {
    id: row.id,
    modulo_id: row.modulo_id,
    documento_id: row.documento_id,
    ordem: row.ordem || 0,
  }
}
function rowToProgresso(row) {
  return {
    id: row.id,
    acao_id: row.acao_id,
    modulo_item_id: row.modulo_item_id,
    seller_id: row.seller_id,
    concluido: row.concluido || false,
    concluido_em: row.concluido_em || null,
  }
}

// Módulos de treinamento de uma Ação — feature aditiva, só usada quando
// Ação.tipo === 'treinamento'. Não interfere em nada do resto de Ações.
export function useAcaoModulos(acaoId) {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [modulos, setModulos] = useState([])
  const [itens, setItens] = useState([])
  const [progresso, setProgresso] = useState([])
  const [loading, setLoading] = useState(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    if (!acaoId || !session?.user) { setLoading(false); return }
    setLoading(true)
    const [{ data: mods }, { data: its }, { data: prog }] = await Promise.all([
      supabase.from('acao_modulos').select('*').eq('acao_id', acaoId).order('ordem'),
      supabase.from('acao_modulo_itens').select('*, acao_modulos!inner(acao_id)').eq('acao_modulos.acao_id', acaoId).order('ordem'),
      supabase.from('acao_modulo_progresso').select('*').eq('acao_id', acaoId),
    ])
    setModulos((mods || []).map(rowToModulo))
    setItens((its || []).map(rowToItem))
    setProgresso((prog || []).map(rowToProgresso))
    setLoading(false)
  }, [acaoId, session])

  useEffect(() => { load() }, [load])

  const addModulo = useCallback(async (titulo) => {
    const ordem = modulos.length
    const { data, error } = await supabase.from('acao_modulos').insert({
      tenant_id: tenantId, branch_id: branchId, acao_id: acaoId, titulo, ordem,
    }).select().single()
    if (error) return { ok: false, message: error.message }
    setModulos(prev => [...prev, rowToModulo(data)])
    return { ok: true, data: rowToModulo(data) }
  }, [acaoId, tenantId, branchId, modulos.length])

  const updateModulo = useCallback(async (id, patch) => {
    const { error } = await supabase.from('acao_modulos').update(patch).eq('id', id)
    if (error) return { ok: false, message: error.message }
    setModulos(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
    return { ok: true }
  }, [])

  const removeModulo = useCallback(async (id) => {
    const { error } = await supabase.from('acao_modulos').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setModulos(prev => prev.filter(m => m.id !== id))
    setItens(prev => prev.filter(i => i.modulo_id !== id))
    return { ok: true }
  }, [])

  const addItem = useCallback(async (moduloId, documentoId) => {
    const ordem = itens.filter(i => i.modulo_id === moduloId).length
    const { data, error } = await supabase.from('acao_modulo_itens').insert({
      tenant_id: tenantId, modulo_id: moduloId, documento_id: documentoId, ordem,
    }).select().single()
    if (error) return { ok: false, message: error.message }
    setItens(prev => [...prev, rowToItem(data)])
    return { ok: true }
  }, [tenantId, itens])

  const removeItem = useCallback(async (id) => {
    const { error } = await supabase.from('acao_modulo_itens').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setItens(prev => prev.filter(i => i.id !== id))
    setProgresso(prev => prev.filter(p => p.modulo_item_id !== id))
    return { ok: true }
  }, [])

  const reorderItens = useCallback(async (moduloId, orderedIds) => {
    setItens(prev => prev.map(i => {
      const idx = orderedIds.indexOf(i.id)
      return idx >= 0 ? { ...i, ordem: idx } : i
    }))
    await Promise.all(orderedIds.map((id, idx) => supabase.from('acao_modulo_itens').update({ ordem: idx }).eq('id', id)))
  }, [])

  // Marca/desmarca um item como concluído por um participante (seller_id).
  // Upsert por (modulo_item_id, seller_id) — mesma linha é reaberta se
  // desmarcar, não duplica.
  const setConcluido = useCallback(async (moduloItemId, sellerId, concluido) => {
    const { data, error } = await supabase.from('acao_modulo_progresso')
      .upsert({
        tenant_id: tenantId, acao_id: acaoId, modulo_item_id: moduloItemId, seller_id: sellerId,
        concluido, concluido_em: concluido ? new Date().toISOString() : null,
      }, { onConflict: 'modulo_item_id,seller_id' })
      .select().single()
    if (error) return { ok: false, message: error.message }
    setProgresso(prev => {
      const existe = prev.some(p => p.modulo_item_id === moduloItemId && p.seller_id === sellerId)
      return existe
        ? prev.map(p => (p.modulo_item_id === moduloItemId && p.seller_id === sellerId) ? rowToProgresso(data) : p)
        : [...prev, rowToProgresso(data)]
    })
    return { ok: true }
  }, [tenantId, acaoId])

  return { modulos, itens, progresso, loading, reload: load, addModulo, updateModulo, removeModulo, addItem, removeItem, reorderItens, setConcluido }
}
