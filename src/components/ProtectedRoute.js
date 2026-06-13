import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Em desenvolvimento, permite bypass com ?dev=1 na URL.
// O flag é salvo no sessionStorage para persistir em navegações internas sem ?dev=1.
const IS_DEV = process.env.NODE_ENV === 'development'
if (IS_DEV && new URLSearchParams(window.location.search).get('dev') === '1') {
  sessionStorage.setItem('dev_bypass', '1')
}
const DEV_BYPASS = IS_DEV && sessionStorage.getItem('dev_bypass') === '1'

export default function ProtectedRoute({ children }) {
  const { session } = useAuth()

  if (DEV_BYPASS) return children

  if (session === undefined) return null // ainda carregando

  if (!session) return <Navigate to="/login" replace />

  return children
}
