import { FileQuestion, Home, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { useAuthSession } from '@/hooks/useAuthSession'
import { BRAND } from '@/lib/constants'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppTopNav } from '@/layouts/Navbar/AppTopNav'
import { homePathForRole, PATHS } from '@/router/paths'

// Shared 404 body — used inside role layouts (topbar already present) or with a shell.
function NotFoundContent({ homeTo, homeLabel }) {
  return (
    <div className="space-y-6">
      <MotionHeader>
        <p className="text-sm font-medium text-slate-500">Error 404</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          This URL does not exist. Use the navigation above or go back to a page that does.
        </p>
      </MotionHeader>

      <MotionReveal>
        <SurfaceCard title="Nothing here" description="The link may be mistyped or the page was removed.">
          <div className="flex flex-col items-center gap-4 py-8 text-center sm:py-10">
            <div
              className="flex size-14 items-center justify-center rounded-2xl text-white"
              style={{ background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})` }}
            >
              <FileQuestion className="size-7" aria-hidden />
            </div>
            <p className="max-w-md text-sm leading-relaxed text-slate-600">
              You are still signed in — pick a valid page from the top bar, or open your home
              dashboard below.
            </p>
            <Button
              asChild
              className="mt-1 h-10 gap-2 rounded-lg text-white"
              style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
            >
              <Link to={homeTo}>
                <Home className="size-4" />
                {homeLabel}
              </Link>
            </Button>
          </div>
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

// Inside Admin / Inventory / Branch / Workspace layouts (Outlet only).
export function NotFoundPage() {
  const { role } = useAuthSession()
  const homeTo = homePathForRole(role)

  return (
    <NotFoundContent homeTo={homeTo} homeLabel="Go to dashboard" />
  )
}

// Logged-in user hit a path outside every role prefix (e.g. /random).
export function RoleAwareNotFoundPage() {
  const { role } = useAuthSession()
  const homeTo = homePathForRole(role)

  return (
    <div className="min-h-dvh bg-[#f7f8fc]">
      <AppTopNav />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <NotFoundContent homeTo={homeTo} homeLabel="Go to dashboard" />
      </main>
    </div>
  )
}

// Guest / unknown session — no role topbar; offer login.
export function PublicNotFoundPage() {
  return (
    <AuthLayout>
      <div className="flex w-full flex-col items-center text-center">
        <div
          className="flex size-14 items-center justify-center rounded-2xl text-white"
          style={{ background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})` }}
        >
          <FileQuestion className="size-7" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This URL does not exist. Sign in to open your workspace.
        </p>
        <Button
          asChild
          className="mt-6 h-11 w-full rounded-lg text-base font-semibold text-white"
          style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
        >
          <Link to={PATHS.login}>
            <LogIn className="mr-2 size-4" />
            Go to login
          </Link>
        </Button>
      </div>
    </AuthLayout>
  )
}

// Root catch-all: pick shell from session.
export function RootNotFoundPage() {
  const { isAuthenticated } = useAuthSession()
  if (isAuthenticated) return <RoleAwareNotFoundPage />
  return <PublicNotFoundPage />
}
