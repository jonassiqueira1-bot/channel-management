import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'

const BranchContext = createContext(null)

export function BranchProvider({ children }) {
  const { profile } = useProfile()
  const [branches, setBranches]     = useState([])
  const [activeBranchId, setActive] = useState(() => {
    try { return localStorage.getItem('boostly:activeBranch') || null } catch { return null }
  })

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return
    const { data } = await supabase
      .from('tenant_branches')
      .select('id, name')
      .eq('tenant_id', profile.tenant_id)
      .eq('ativo', true)
      .order('name')
    if (!data) return

    const isAdmin = profile.role === 'admin_isv'
    const allowed = Array.isArray(profile.branch_ids) ? profile.branch_ids : []

    if (!isAdmin && allowed.length > 0) {
      // Filtra apenas as branches que o perfil tem acesso explícito
      const allowedSet = new Set([...allowed, profile.branch_id].filter(Boolean))
      setBranches(data.filter(b => allowedSet.has(b.id)))
    } else {
      // Admin ou sem restrição: vê todas
      setBranches(data)
    }
  }, [profile?.tenant_id, profile?.role, profile?.branch_id, profile?.branch_ids])

  useEffect(() => { load() }, [load])

  // Garante que sempre haja uma filial ativa — nunca fica sem seleção
  useEffect(() => {
    if (branches.length === 0) return
    const valid = branches.find(b => b.id === activeBranchId)
    if (!valid) {
      // Prioridade: filial do perfil → primeira da lista
      const defaultId = profile?.branch_id && branches.find(b => b.id === profile.branch_id)
        ? profile.branch_id
        : branches[0]?.id
      if (defaultId) setActiveBranch(defaultId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, profile?.branch_id])

  function setActiveBranch(id) {
    if (!id) return
    setActive(id)
    try { localStorage.setItem('boostly:activeBranch', id) } catch {}
    // Persiste no banco — my_branch_id() lê profiles.branch_id para RLS
    if (profile?.id && id !== profile?.branch_id) {
      supabase.from('profiles').update({ branch_id: id }).eq('id', profile.id)
    }
  }

  const activeBranch = branches.find(b => b.id === activeBranchId) || branches[0] || null

  return (
    <BranchContext.Provider value={{ branches, activeBranchId, activeBranch, setActiveBranch }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranchContext() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranchContext deve ser usado dentro de BranchProvider')
  return ctx
}
