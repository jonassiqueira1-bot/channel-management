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
    if (data) setBranches(data)
  }, [profile?.tenant_id])

  useEffect(() => { load() }, [load])

  // Se o usuário tem uma filial própria no perfil e nenhuma foi selecionada, usa a dele
  useEffect(() => {
    if (!activeBranchId && profile?.branch_id) {
      setActiveBranch(profile.branch_id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.branch_id])

  function setActiveBranch(id) {
    setActive(id)
    try { localStorage.setItem('boostly:activeBranch', id || '') } catch {}
  }

  const activeBranch = branches.find(b => b.id === activeBranchId) || null

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
