// Soft landing for roles without a full web dashboard (Cashier + Phase 2 staff)
import { Construction, LogOut, MonitorSmartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { useAuthSession } from '@/hooks/useAuthSession'
import { BRAND, ROLES } from '@/lib/constants'
import { roleDisplayName } from '@/lib/nav'
import { PATHS } from '@/router/paths'

export function ComingSoonPage() {
  const navigate = useNavigate()
  const { user, role, logout } = useAuthSession()
  const name = user?.name || user?.fullName || 'there'
  const roleLabel = roleDisplayName(role)
  const isCashier = role === ROLES.CASHIER

  function handleLogout() {
    logout()
    navigate(PATHS.login, { replace: true })
  }

  return (
    <div className="space-y-6">
      <MotionHeader>
        <p className="text-sm font-medium text-slate-500">Welcome, {name}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {isCashier ? 'Web access is not available for this role' : 'Your workspace is almost ready'}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          {isCashier
            ? `You’re signed in as ${roleLabel}. Cashier tools run on the desktop / POS app — use that app to continue, or sign out below.`
            : `The ${roleLabel} tools are part of Phase 2. We’re polishing this experience for your team — check back soon.`}
        </p>
      </MotionHeader>

      <MotionReveal>
        <SurfaceCard
          title={isCashier ? 'Use the desktop app' : 'Phase 2 in progress'}
          description={
            isCashier
              ? 'This account works on POS / desktop. There is no cashier dashboard on the web panel yet.'
              : 'You can still manage your profile or sign out from the menu above.'
          }
        >
          <div className="flex flex-col items-center gap-4 py-8 text-center sm:py-10">
            <div
              className="flex size-14 items-center justify-center rounded-2xl text-white"
              style={{ background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})` }}
            >
              {isCashier ? (
                <MonitorSmartphone className="size-7" aria-hidden />
              ) : (
                <Construction className="size-7" aria-hidden />
              )}
            </div>
            <div className="max-w-md space-y-2">
              <p className="text-base font-semibold text-slate-900">
                {isCashier ? 'Nothing is wrong with your login' : 'Thanks for your patience'}
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                {isCashier
                  ? 'Open the FluxOne desktop / POS application with the same User ID and password to start selling. You can safely log out of the web panel now.'
                  : 'Production kitchen flows, delivery routes, and related dashboards will appear here when Phase 2 ships. Nothing is broken — this account is ready and waiting for those modules.'}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="mt-2 h-10 gap-2 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}