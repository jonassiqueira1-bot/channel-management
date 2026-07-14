import { useMemo } from 'react'
import { useProfile } from './useProfile'
import { usePerfisAcesso } from './usePerfisAcesso'

export function usePermissions() {
  const { profile, loading: profileLoading } = useProfile()
  const { perms, loading: perfisLoading } = usePerfisAcesso()

  const isAdmin = profile?.role === 'admin_isv' || profile?.papel === 'admin_isv'
  const perfisIds = profile?.perfis_acesso_ids || []

  const can = useMemo(() => {
    return (modulo, acao) => {
      if (isAdmin) return true
      return perfisIds.some(id => perms[id]?.[modulo]?.[acao] === true)
    }
  }, [isAdmin, perfisIds, perms])

  return { can, loading: profileLoading || perfisLoading }
}
