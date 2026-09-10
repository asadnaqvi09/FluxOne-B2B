import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { useAuthSession } from '@/hooks/useAuthSession'

const STORAGE_KEY = 'fluxone.admin.welcomeSeen'

export function AdminWelcomeBanner({ className }) {
  const { user } = useAuthSession()
  const company = user?.tenantName || 'SoftwareFlux'

  return (
    <WelcomeBanner
      className={className}
      storageKey={STORAGE_KEY}
      eyebrow="B2B Enterprise Admin"
      title={`Welcome to “${company}” Admin Dashboard`}
      description="Consolidated multi-branch financial metrics, live inventory monitoring, and AI predictive insights across all branches."
    />
  )
}

export default AdminWelcomeBanner
