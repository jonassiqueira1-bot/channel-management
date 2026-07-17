import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

function rowToMembro(row) {
  return {
    id:            row.id,
    acao_id:       row.acao_id,
    user_id:       row.user_id,
    papel:         row.papel || 'participante',
    tipo_membro:   row.tipo_membro || 'canal',
    franquia_id_na_epoca: row.franquia_id_na_epoca || null,
    adicionado_em: row.created_at?.slice(0, 10) || '',
  }
}

// Participantes de Ações (Contatos Canal) — user_id é sellers.id diretamente
// (todos os Contatos Canais cadastrados em /vendedores, com ou sem login na
// plataforma; diferente de oportunidade_membros, que usa profiles.id).
export function useAcaoMembros() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const isMockMode = useRef(true)

  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setLoading(false); return }
    isMockMode.current = false
    const { data, error } = await supabase.from('acao_membros').select('*')
    if (error) { console.warn('[useAcaoMembros] load error:', error.message); setLoading(false); return }
    setMembros((data || []).map(rowToMembro))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (membro) => {
    if (isMockMode.current) return { ok: false }

    // Snapshot da franquia do Contato Canal no momento em que participa da
    // Ação — aqui user_id é sellers.id diretamente (pool = todos os
    // Contatos Canais cadastrados, com ou sem login na plataforma).
    let franquiaIdNaEpoca = null
    const { data: seller } = await supabase.from('sellers').select('parceiro_id').eq('id', membro.user_id).single()
    franquiaIdNaEpoca = seller?.parceiro_id || null

    const { data, error } = await supabase.from('acao_membros').insert({
      tenant_id:            tenantId,
      branch_id:            branchId || null,
      acao_id:              membro.acao_id,
      user_id:              membro.user_id,
      papel:                membro.papel || 'participante',
      tipo_membro:          'canal',
      franquia_id_na_epoca: franquiaIdNaEpoca,
    }).select().single()
    if (error) { console.warn('[useAcaoMembros] insert error:', error.message); return { ok: false, message: error.message } }
    setMembros(prev => [...prev, rowToMembro(data)])
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) return { ok: false }
    const { error } = await softDelete('acao_membros', id)
    if (error) return { ok: false, message: error.message }
    setMembros(prev => prev.filter(m => m.id !== id))
    return { ok: true }
  }, [])

  return { membros, loading, reload: load, add, remove }
}
