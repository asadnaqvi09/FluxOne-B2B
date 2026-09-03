import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAdminLoggedIn } from '@/config/adminAuth.config'
import { useAuthSession } from '@/hooks/useAuthSession'
import { PATHS } from '@/router/paths'

export function AdminAuthGate() {
  const location = useLocation()
  const { isAuthenticated, role } = useAuthSession()
  const authenticated =
    isAdminLoggedIn() ||
    (isAuthenticated && (role === 'b2b_admin' || role === 'b2b_owner'))

  if (!authenticated) {
    return <Navigate to={PATHS.login} state={{ from: location }} replace />
  }

  return <Outlet />
}
export default AdminAuthGate
