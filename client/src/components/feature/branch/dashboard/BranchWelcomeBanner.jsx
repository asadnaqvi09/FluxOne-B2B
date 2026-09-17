import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { useAuthSession } from '@/hooks/useAuthSession'
import { ROLES } from '@/lib/constants'

function sessionKey(user, token) {
  const who = user?.id || user?.email || user?.username || 'anon'
  const session = token ? String(token).slice(-12) : 'nosession'
  return `fluxone:welcome-banner:branch-manager:${who}:${session}`
}

export function BranchWelcomeBanner({ className }) {
  const { user, role, token } = useAuthSession()
  const company = user?.tenantName || 'your company'
  const enabled = role === ROLES.BRANCH_MANAGER

  return (
    <WelcomeBanner
      key={sessionKey(user, token)}
      className={className}
      enabled={enabled}
      scope="branch-manager"
      eyebrow="Welcome"
      title={`Welcome to “${company}” Branch Manager Dashboard`}
      description="Manage your branch team, sales overview, and daily operations from here."
    />
  )
}

export default BranchWelcomeBanner
