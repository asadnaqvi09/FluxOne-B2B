import { API_BASE_URL, DEMO_ACCOUNTS, MOCK_API } from '@/lib/constants'
import { endpoints } from '@/api/endpoints'
import { getErrorMessage, parseJson, toQuery } from '@/api/apiHelper'
import { fail, ok } from '@/api/result'
import { tokenStorage } from '@/api/tokenStorage'

// Paths that must not trigger a silent refresh on 401.
const NO_REFRESH_PATHS = new Set([
  endpoints.auth.login,
  endpoints.auth.refresh,
  endpoints.auth.logout,
])

let refreshInFlight = null

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

// Exchange refresh token for a new access/refresh pair.
// Single-flight so parallel 401s share one refresh call.
async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) return null

    if (MOCK_API) {
      const user = tokenStorage.getUser()
      if (!user || !String(refreshToken).startsWith('mock.refresh')) return null
      const data = {
        token: mockAccessToken(user.role),
        refreshToken: mockRefreshToken(),
        user,
      }
      await applySession(data)
      return data
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoints.auth.refresh}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const payload = await parseJson(response)
      if (!response.ok) return null
      const data = unwrapBackendPayload(payload)
      if (!data?.token) return null
      await applySession(data)
      return data
    } catch {
      return null
    }
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
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
        const refreshed = await refreshAccessToken()
        if (refreshed?.token) {
          return api(path, { ...options, _retry: true })
        }
        await clearSession()
        return fail('Session expired. Please sign in again.')
      }
      return fail(getErrorMessage(payload, `HTTP ${response.status}`))
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
  post: (path, body) => api(path, { method: 'POST', body }),
  put: (path, body) => api(path, { method: 'PUT', body }),
  patch: (path, body) => api(path, { method: 'PATCH', body }),
  delete: (path) => api(path, { method: 'DELETE' }),
}
