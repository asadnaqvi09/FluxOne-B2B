import { API_BASE_URL, DEMO_ACCOUNTS, MOCK_API } from '@/lib/constants'
import { endpoints } from '@/api/endpoints'
import { getErrorMessage, parseJson, toQuery } from '@/api/apiHelper'
import { fail, ok } from '@/api/result'
import { tokenStorage } from '@/api/tokenStorage'
import { getTokenExpiryDate } from '@/lib/authToken'

// Paths that must not trigger a silent refresh on 401.
const NO_REFRESH_PATHS = new Set([
  endpoints.auth.login,
  endpoints.auth.refresh,
  endpoints.auth.logout,
])

let refreshInFlight = null

// Refresh while the access token is still valid so Save is not the call that 401s.
const REFRESH_AHEAD_MS = 90_000
// One tab refreshes; the others wait. A crashed tab's lock expires.
const REFRESH_LOCK_KEY = 'fluxone.auth.refreshLock'
const REFRESH_LOCK_TTL_MS = 15_000
const TAB_ID_KEY = 'fluxone.auth.tab'

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mockPath(path) {
  return path.split('?')[0]
}

function mockAccessToken(role) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const payload = btoa(
    JSON.stringify({
      role,
      exp: Math.floor(Date.now() / 1000) + 60 * 15,
    }),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${payload}.mock`
}

function mockRefreshToken() {
  return `mock.refresh.${Date.now()}`
}

async function syncSessionToStore(session) {
  try {
    const [{ store }, { hydrateSession, sessionExpired }] = await Promise.all([
      import('@/rtk/store'),
      import('@/rtk/features/auth/authSlice'),
    ])
    if (!session) {
      store.dispatch(sessionExpired())
      return
    }
    store.dispatch(
      hydrateSession({
        token: session.token,
        refreshToken: session.refreshToken,
        user: session.user,
      }),
    )
  } catch {
    // Store may be unavailable during early boot — localStorage still updated
  }
}

function applySession(data) {
  const user = data.user || tokenStorage.getUser()
  tokenStorage.setSession({
    token: data.token,
    refreshToken: data.refreshToken,
    user,
  })
  return syncSessionToStore({
    token: data.token,
    refreshToken: data.refreshToken,
    user,
  })
}

function clearSession() {
  tokenStorage.clear()
  return syncSessionToStore(null)
}

function unwrapBackendPayload(payload) {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    if (!payload.success) return null
    return payload.data
  }
  return payload?.data ?? payload
}

function tabId() {
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(TAB_ID_KEY, id)
    }
    return id
  } catch {
    return 'tab'
  }
}

function readRefreshLock() {
  try {
    return JSON.parse(localStorage.getItem(REFRESH_LOCK_KEY) || 'null')
  } catch {
    return null
  }
}

function lockHeldByOther(lock) {
  if (!lock?.id || lock.id === tabId()) return false
  return Date.now() - Number(lock.at) < REFRESH_LOCK_TTL_MS
}

function tryAcquireRefreshLock() {
  if (lockHeldByOther(readRefreshLock())) return false
  const next = { id: tabId(), at: Date.now() }
  localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(next))
  // Two tabs can write together. Only the id still stored owns the refresh.
  return readRefreshLock()?.id === next.id
}

function releaseRefreshLock() {
  if (readRefreshLock()?.id === tabId()) localStorage.removeItem(REFRESH_LOCK_KEY)
}

function sessionFromStorage() {
  const token = tokenStorage.getToken()
  const refreshToken = tokenStorage.getRefreshToken()
  if (!token || !refreshToken) return null
  return { token, refreshToken, user: tokenStorage.getUser() }
}

// skewMs > 0 treats a token as due when it expires inside that window.
function accessTokenStillValid(token, skewMs = 0) {
  if (!token) return false
  const exp = getTokenExpiryDate(token)
  if (!exp) return true
  return exp.getTime() - Date.now() > skewMs
}

function shouldMaintainSession(path, options) {
  if (options._retry || options.skipAuthRefresh) return false
  if (NO_REFRESH_PATHS.has(mockPath(path))) return false
  return Boolean(tokenStorage.getToken() && tokenStorage.getRefreshToken())
}

// Another tab already rotated. Adopt its pair instead of reusing the old refresh token.
async function waitForRotatedSession(previousRefreshToken) {
  const started = Date.now()
  while (Date.now() - started < REFRESH_LOCK_TTL_MS) {
    const session = sessionFromStorage()
    if (session && session.refreshToken !== previousRefreshToken) return session
    if (!lockHeldByOther(readRefreshLock())) break
    await delay(200)
  }
  const session = sessionFromStorage()
  if (session && session.refreshToken !== previousRefreshToken) return session
  return null
}

async function requestRefreshedSession(refreshToken) {
  const response = await fetch(`${API_BASE_URL}${endpoints.auth.refresh}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const payload = await parseJson(response)
  // 401 means this refresh token was rejected. Anything else is transient.
  if (response.status === 401) return null
  if (!response.ok) return { transient: true }
  const data = unwrapBackendPayload(payload)
  if (!data?.token) return { transient: true }
  await applySession(data)
  return data
}

// Exchange refresh token for a new access/refresh pair.
// One refresh is shared in this tab and across tabs, so rotation is not reused.
async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const previousRefreshToken = tokenStorage.getRefreshToken()
    if (!previousRefreshToken) return null

    if (MOCK_API) {
      const user = tokenStorage.getUser()
      if (!user || !String(previousRefreshToken).startsWith('mock.refresh')) return null
      const data = {
        token: mockAccessToken(user.role),
        refreshToken: mockRefreshToken(),
        user,
      }
      await applySession(data)
      return data
    }

    let holdLock = false
    try {
      if (!tryAcquireRefreshLock()) {
        const rotated = await waitForRotatedSession(previousRefreshToken)
        if (rotated?.token) {
          await syncSessionToStore(rotated)
          return rotated
        }
        if (!tryAcquireRefreshLock()) return { transient: true }
      }
      holdLock = true

      const refreshToken = tokenStorage.getRefreshToken()
      if (!refreshToken) return null
      // The other tab finished rotating while we waited for the lock.
      if (refreshToken !== previousRefreshToken) {
        const session = sessionFromStorage()
        if (session) await syncSessionToStore(session)
        return session
      }

      const result = await requestRefreshedSession(refreshToken)
      if (result?.token || result?.transient) return result

      const latest = sessionFromStorage()
      if (latest && latest.refreshToken !== refreshToken && accessTokenStillValid(latest.token)) {
        await syncSessionToStore(latest)
        return latest
      }
      return null
    } catch {
      // Offline refresh keeps the session. The next action can try again.
      const latest = sessionFromStorage()
      if (latest && latest.refreshToken !== previousRefreshToken && accessTokenStillValid(latest.token)) {
        await syncSessionToStore(latest)
        return latest
      }
      return { transient: true }
    } finally {
      if (holdLock) releaseRefreshLock()
    }
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

// Returns 'ok' when the access token can be used, 'rejected' when the session is dead.
async function ensureAccessTokenFresh(path, options) {
  if (!shouldMaintainSession(path, options)) return 'skipped'
  const token = tokenStorage.getToken()
  if (accessTokenStillValid(token, REFRESH_AHEAD_MS)) return 'ok'

  const refreshed = await refreshAccessToken()
  if (refreshed?.token) return 'ok'
  if (refreshed?.transient) return 'skipped'
  if (accessTokenStillValid(tokenStorage.getToken())) return 'ok'
  return 'rejected'
}

// Minimal mock: auth only (inventory/branch modules use live API).
async function mockRequest(method, path, body) {
  await delay()
  const route = mockPath(path)

  if (route === endpoints.auth.login && method === 'POST') {
    const loginId = body?.id || body?.email
    const matches = DEMO_ACCOUNTS.filter(
      (item) => item.id === loginId && item.password === body?.password,
    )
    if (!matches.length) return fail('Invalid id or password')
    if (matches.length > 1) {
      return fail('This User ID exists in more than one company. Contact your administrator.')
    }
    const account = matches[0]
    const user = {
      id: `mock-${account.id}`,
      name: account.name,
      email: account.id,
      role: account.role,
      tenantSlug: account.tenantSlug,
      tenantId: account.tenantSlug,
      tenantName:
        account.tenantSlug === 'company-a'
          ? 'Company A'
          : account.tenantSlug === 'softwareflux'
            ? 'SoftwareFlux'
            : 'Company B',
      branchId: null,
    }
    return ok({
      token: mockAccessToken(account.role),
      refreshToken: mockRefreshToken(),
      user,
    })
  }

  if (route === endpoints.auth.refresh && method === 'POST') {
    const refreshToken = body?.refreshToken || tokenStorage.getRefreshToken()
    const user = tokenStorage.getUser()
    if (!user || !refreshToken || !String(refreshToken).startsWith('mock.refresh')) {
      return fail('Invalid refresh token')
    }
    return ok({
      token: mockAccessToken(user.role),
      refreshToken: mockRefreshToken(),
      user,
    })
  }

  if (route === endpoints.auth.me || route === endpoints.auth.update) {
    const user = tokenStorage.getUser()
    if (!user) return fail('Unauthorized')
    if (method === 'PATCH') {
      // Support JSON or FormData (profile photo upload)
      const asForm = typeof FormData !== 'undefined' && body instanceof FormData
      const nextName = (asForm ? body.get('name') : body?.name)?.toString?.()?.trim?.() || ''
      const nextId =
        (asForm ? body.get('id') : body?.id || body?.email)?.toString?.()?.trim?.() || ''
      const nextPassword = (asForm ? body.get('password') : body?.password) || ''
      const nextImage = asForm ? body.get('image') : body?.image
      if (!nextName && !nextId && !nextPassword && !nextImage) {
        return fail('name, id, password, or image is required')
      }
      return ok({
        ...user,
        name: nextName || user.name,
        email: nextId || user.email,
        imageUrl: nextImage ? user.imageUrl || 'mock://profile-image' : user.imageUrl,
        passwordUpdated: Boolean(nextPassword),
      })
    }
    return ok(user)
  }

  if (route === endpoints.auth.logout) return ok({ loggedOut: true })

  if (method === 'POST' || method === 'PATCH') {
    return ok({ ...(body || {}), id: body?.id || crypto.randomUUID() })
  }

  if (route.includes('/inventory/control') || route.includes('/inventory/')) {
    return fail(
      `Mock API does not cover inventory Control. Disable VITE_MOCK_API and use the live API for ${method} ${route}`,
    )
  }

  return fail(`No mock handler for ${method} ${route}`)
}

function isFormDataBody(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function shouldAttemptRefresh(path, options, status) {
  if (status !== 401) return false
  if (options._retry) return false
  if (options.skipAuthRefresh) return false
  const route = mockPath(path)
  if (NO_REFRESH_PATHS.has(route)) return false
  return Boolean(tokenStorage.getRefreshToken())
}

// Prevent form submit from hanging forever (QA tc-IM-suppliers091)
const DEFAULT_FETCH_TIMEOUT_MS = 45_000

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body

  if (MOCK_API) {
    return mockRequest(method, path, body)
  }

  const url = `${API_BASE_URL}${path}`
  const asForm = isFormDataBody(body)
  const timeoutMs =
    typeof options.timeoutMs === 'number' ? options.timeoutMs : DEFAULT_FETCH_TIMEOUT_MS
  const controller = new AbortController()
  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null

  try {
    // Renew before expiry so an in-progress product or bundle edit is not signed out.
    const ahead = await ensureAccessTokenFresh(path, options)
    if (ahead === 'rejected') {
      await clearSession()
      return fail('Session expired. Please sign in again.')
    }

    const token = tokenStorage.getToken()
    const response = await fetch(url, {
      method,
      // Avoid stale 304/ETag responses after mutations (categories delete looked “stuck”)
      cache: 'no-store',
      signal: options.signal || controller.signal,
      headers: {
        ...(asForm ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body:
        body === undefined ? undefined : asForm ? body : JSON.stringify(body),
    })

    // 304 with empty body would otherwise look like success + null data
    if (response.status === 304) {
      return fail(`Stale cache for ${url}`)
    }

    const payload = await parseJson(response)

    if (!response.ok) {
      if (shouldAttemptRefresh(path, options, response.status)) {
        const sentToken = token
        const refreshed = await refreshAccessToken()
        // Rate limit, 5xx, or a dropped network must not wipe the form.
        if (refreshed?.transient) {
          return fail('Request failed. Please try again.', { status: response.status })
        }
        const latest = tokenStorage.getToken()
        const adopted = latest && latest !== sentToken && accessTokenStillValid(latest)
        if (refreshed?.token || adopted) {
          return api(path, { ...options, _retry: true })
        }
        await clearSession()
        return fail('Session expired. Please sign in again.')
      }
      const retryAfterRaw = response.headers.get('Retry-After')
      const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : undefined
      return fail(getErrorMessage(payload, `HTTP ${response.status}`), {
        status: response.status,
        ...(Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? { retryAfterSec }
          : {}),
      })
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      if (!payload.success) return fail(payload.error || 'Request failed')
      return ok(payload.data)
    }
    return ok(payload?.data ?? payload)
  } catch (error) {
    if (error?.name === 'AbortError') {
      return fail('Request timed out. Please try again.')
    }
    return fail(error.message || `Network error calling ${url}`)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export const apiClient = {
  get: (path, params) => api(`${path}${toQuery(params)}`),
  post: (path, body, options = {}) =>
    api(path, { method: 'POST', body, ...options }),
  put: (path, body, options = {}) =>
    api(path, { method: 'PUT', body, ...options }),
  patch: (path, body, options = {}) =>
    api(path, { method: 'PATCH', body, ...options }),
  delete: (path) => api(path, { method: 'DELETE' }),
}
