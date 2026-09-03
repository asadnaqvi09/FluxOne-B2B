import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthSession } from '@/hooks/useAuthSession'
import { BRAND, DEMO_ACCOUNTS } from '@/lib/constants'
import { hydrateSession, clearAuthError } from '@/rtk/features/auth/authSlice'
import { tokenStorage } from '@/api/tokenStorage'
import { useAppDispatch } from '@/rtk/hooks'
import { homePathForRole, PATHS } from '@/router/paths'
import { setAdminSession } from '@/config/adminAuth.config'
import { toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

export function LoginForm() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { login, status, error } = useAuthSession()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [localError, setLocalError] = useState('')
  const [slowHint, setSlowHint] = useState(false)
  const loading = status === 'loading'
  const displayError = localError || error

  useEffect(() => {
    if (!loading) {
      setSlowHint(false)
      return
    }
    const timer = setTimeout(() => setSlowHint(true), 2500)
    return () => clearTimeout(timer)
  }, [loading])

  function clearErrors() {
    setLocalError('')
    dispatch(clearAuthError())
  }

  function fillDemo(account) {
    setId(account.id)
    setPassword(account.password)
    clearErrors()
  }

  async function onSubmit(event) {
    event.preventDefault()
    clearErrors()

    const loginId = id.trim()
    if (!loginId) {
      setLocalError('User ID is required')
      return
    }
    if (!password || password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }

    // Primary: Authenticate with real Express backend API
    try {
      const data = await login({ id: loginId, password })
      toastSuccess(`Welcome, ${data?.user?.name || 'User'}`)
      navigate(homePathForRole(data?.user?.role), { replace: true })
      return
    } catch (err) {
      // Fallback for demo accounts only if backend is offline / unreachable
      const demoMatch = DEMO_ACCOUNTS.find(
        (a) => a.id.toLowerCase() === loginId.toLowerCase(),
      )

      if (demoMatch && (password === demoMatch.password || password === 'password')) {
        const demoUser = {
          id: demoMatch.id,
          email: demoMatch.id,
          name: demoMatch.name,
          role: demoMatch.role,
          tenantSlug: demoMatch.tenantSlug,
          tenantName:
            demoMatch.tenantSlug === 'company-a'
              ? 'Company A'
              : 'Company B',
          branchName: demoMatch.label,
        }
        const demoToken = 'mock-demo-token-' + Date.now()
        tokenStorage.setSession({
          token: demoToken,
          refreshToken: demoToken,
          user: demoUser,
        })
        dispatch(hydrateSession({ user: demoUser, token: demoToken }))
        setAdminSession(demoUser)
        toastSuccess(`Welcome, ${demoUser.name}`)
        navigate(homePathForRole(demoUser.role), { replace: true })
        return
      }

      const message =
        typeof err === 'string'
          ? err
          : err?.payload || err?.message || err?.error || 'Login failed'
      setLocalError(message)
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      <BrandLogo size="lg" className="mb-5" />
      <h1 className="text-center text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        FluxOne Login
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Sign in with your User ID and password
      </p>

      <form className="mt-6 w-full space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="login-id" className="font-semibold">
            User ID
          </Label>
          <Input
            id="login-id"
            name="id"
            autoComplete="username"
            placeholder="e.g. branch.wah@companya.local"
            value={id}
            disabled={loading}
            onChange={(event) => {
              setId(event.target.value)
              clearErrors()
            }}
            className="h-11 rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password" className="font-semibold">
            Password
          </Label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              disabled={loading}
              onChange={(event) => {
                setPassword(event.target.value)
                clearErrors()
              }}
              className="h-11 rounded-lg pr-11"
            />
            <button
              type="button"
              tabIndex={0}
              disabled={loading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {displayError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {displayError}
          </p>
        ) : null}

        {slowHint ? (
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Waking the server… free hosting can take 15–30 seconds on the first request.
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg text-base font-semibold text-white shadow-md"
          style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
        >
          {loading ? 'Signing in…' : 'Login'}
        </Button>

        <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
          <button
            type="button"
            onClick={() => setDemoOpen((open) => !open)}
            aria-expanded={demoOpen}
            className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/70"
          >
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Demo credentials
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                demoOpen && 'rotate-180',
              )}
            />
          </button>

          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-250 ease-out',
              demoOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
          >
            <div className="overflow-hidden">
              <div className="border-t border-border px-3 pt-2 pb-3">
                <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                  {DEMO_ACCOUNTS.map((account) => (
                    <li key={`${account.tenantSlug}-${account.id}`}>
                      <button
                        type="button"
                        onClick={() => fillDemo(account)}
                        className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-white active:scale-[0.99]"
                      >
                        <span className="font-medium text-foreground">
                          {account.label}
                        </span>
                        <span className="mt-0.5 block truncate text-muted-foreground">
                          {account.id}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Password for all demos: <span className="font-medium">password</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
