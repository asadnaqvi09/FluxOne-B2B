import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { useAuthSession } from '@/hooks/useAuthSession'
import { ROLES } from '@/lib/constants'

const STORAGE_KEY = 'fluxone.bm.welcomeSeen'

export function BranchWelcomeBanner({ className }) {
  const { user, role } = useAuthSession()
  const company = user?.tenantName || 'your company'
  const storageKey = `${STORAGE_KEY}.${user?.tenantId || company}`
  const enabled = role === ROLES.BRANCH_MANAGER

  return (
    <WelcomeBanner
      className={className}
      storageKey={storageKey}
      enabled={enabled}
      eyebrow="Welcome"
      title={`Welcome to “${company}” Branch Manager Dashboard`}
      description="Manage your branch team, sales overview, and daily operations from here."
    />
  )
}

export default BranchWelcomeBanner
