import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { useAuthSession } from '@/hooks/useAuthSession'

function sessionKey(user, token) {
  const who = user?.id || user?.email || user?.username || 'anon'
  const session = token ? String(token).slice(-12) : 'nosession'
  return `fluxone:welcome-banner:b2b-admin:${who}:${session}`
}

export function AdminWelcomeBanner({ className }) {
  const { user, token } = useAuthSession()
  const company = user?.tenantName || 'SoftwareFlux'

  return (
    <WelcomeBanner
      key={sessionKey(user, token)}
      className={className}
      scope="b2b-admin"
      eyebrow="B2B Enterprise Admin"
      title={`Welcome to “${company}” Admin Dashboard`}
      description="Consolidated multi-branch financial metrics, live inventory monitoring, and AI predictive insights across all branches."
    />
  )
}

export default AdminWelcomeBanner
