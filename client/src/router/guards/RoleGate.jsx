import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from '@/hooks/shared/useAuthSession'
import { PATHS } from '@/router/paths'

export function RoleGate({ roles = [] }) {
  const { role } = useAuthSession()

  if (!roles.includes(role)) {
    return <Navigate to={PATHS.profile} replace />
  }

  return <Outlet />
}
