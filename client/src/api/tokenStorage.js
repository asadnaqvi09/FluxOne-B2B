const TOKEN_KEY = 'fluxone.auth.token'
const REFRESH_TOKEN_KEY = 'fluxone.auth.refresh'
const USER_KEY = 'fluxone.auth.user'

// Keys another tab must observe so login, refresh, and logout stay in sync.
export const AUTH_STORAGE_KEYS = [TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]

export function isAuthStorageKey(key) {
  return AUTH_STORAGE_KEYS.includes(key)
}

export const tokenStorage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },
  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  },
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },
  setRefreshToken(refreshToken) {
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    else localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    } catch {
      return null
    }
  },
  setUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  },
  // Persist access + refresh (+ optional user) from login/refresh responses.
  setSession({ token, refreshToken, user } = {}) {
    if (token !== undefined) this.setToken(token)
    if (refreshToken !== undefined) this.setRefreshToken(refreshToken)
    if (user !== undefined) this.setUser(user)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}
