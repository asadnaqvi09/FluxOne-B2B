import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { useAuthSession } from '@/hooks/useAuthSession'

export function AdminWelcomeBanner({ className }) {
  const { user } = useAuthSession()
  const company = user?.tenantName || 'SoftwareFlux'

  return (
    <WelcomeBanner
      className={className}
      eyebrow="B2B Enterprise Admin"
      title={`Welcome to “${company}” Admin Dashboard`}
      description="Consolidated multi-branch financial metrics, live inventory monitoring, and AI predictive insights across all branches."
    />
  )
}

export default AdminWelcomeBanner
