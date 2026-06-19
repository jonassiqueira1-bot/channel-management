import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_MEMBROS_OPP } from '../data/mockMembroOportunidade'

const LS_KEY = 'opp_membros_v1'

function lsLoad() {
  try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
function lsSave(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch {}
}

function rowToMembro(row) {
  return {
    id:              row.id,
    oportunidade_id: row.opportunity_id || row.oportunidade_id,
    user_id:         row.user_id,
    papel:           row.papel || 'vendedor',
    tipo_membro:     row.tipo_membro || 'interno',
    adicionado_em:   row.created_at?.slice(0, 10) || '',
  }
}

export function useOppMembros() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const isMockMode  = useRef(true)

  const [membros, setMembros] = useState(() => lsLoad() || MOCK_MEMBROS_OPP)

  useEffect(() => { lsSave(membros) }, [membros])

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  useEffect(() => {
    if (!session?.user) { isMockMode.current = true; return }
    isMockMode.current = false
    supabase
      .from('oportunidade_membros')
      .select('*')
      .then(({ data, error }) => {
        if (error) { console.warn('[useOppMembros] load error:', error.message); return }
        const lista = (data || []).map(rowToMembro)
        setMembros(lista)
      })
  }, [session])

  const add = useCallback(async (membro) => {
    const novo = { ...membro, id: membro.id || (Date.now() + Math.floor(Math.random() * 999)) }
    setMembros(prev => [...prev, novo])
    if (isMockMode.current) return { ok: true }
    const { error } = await supabase.from('oportunidade_membros').insert({
      tenant_id:       tenantId,
      branch_id:       branchId || null,
      opportunity_id:  novo.oportunidade_id,
      user_id:         novo.user_id,
      papel:           novo.papel,
      tipo_membro:     novo.tipo_membro,
    })
    if (error) console.warn('[useOppMembros] insert error:', error.message)
    return { ok: !error }
  }, [tenantId, branchId])

  const remove = useCallback(async (membroId) => {
    setMembros(prev => prev.filter(m => m.id !== membroId))
    if (isMockMode.current) return { ok: true }
    const { error } = await supabase.from('oportunidade_membros').delete().eq('id', membroId)
    if (error) console.warn('[useOppMembros] delete error:', error.message)
    return { ok: !error }
  }, [])

  return { membros, add, remove }
}
