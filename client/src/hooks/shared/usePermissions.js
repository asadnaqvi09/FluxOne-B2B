import { useCallback, useMemo } from 'react'
import { hasPermission } from '@/lib/rbac'
import { useAuthSession } from '@/hooks/shared/useAuthSession'

export function usePermissions() {
  const { role } = useAuthSession()

  const can = useCallback((permission) => hasPermission(role, permission), [role])

  return useMemo(() => ({ role, can }), [role, can])
}
