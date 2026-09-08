import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { clearAdminSession } from '@/config/adminAuth.config'
import { useAuthSession } from '@/hooks/useAuthSession'
import { PATHS } from '@/router/paths'

/**
 * Admin shell requires a real backend session with role `b2b_admin`.
 * Legacy localStorage mock admin (`b2b_owner` / fluxone_admin_session) is ignored.
 */
export function AdminAuthGate() {
  const location = useLocation()
  const { isAuthenticated, role } = useAuthSession()

  useEffect(() => {
    clearAdminSession()
  }, [])

  const authenticated = isAuthenticated && role === 'b2b_admin'

  if (!authenticated) {
    return <Navigate to={PATHS.login} state={{ from: location }} replace />
  }

  return <Outlet />
}

export default AdminAuthGate
