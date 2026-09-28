import { createContext, useContext, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { isAuthStorageKey, tokenStorage } from '@/api/tokenStorage'
import {
  fetchCurrentUser,
  hydrateSession,
  loginUser,
  logoutUser,
  sessionExpired,
} from '@/rtk/features/auth/authSlice'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (!auth.token || !auth.isAuthenticated) return
    void dispatch(fetchCurrentUser())
  }, [dispatch, auth.token, auth.isAuthenticated])

  // Other tabs share localStorage. Pick up their refresh, and sign out if they do.
  useEffect(() => {
    function onStorage(event) {
      if (!isAuthStorageKey(event.key)) return
      const token = tokenStorage.getToken()
      const refreshToken = tokenStorage.getRefreshToken()
      const user = tokenStorage.getUser()
      // Ignore a half-written session. Login and refresh update the keys one by one.
      if (token && user) {
        dispatch(hydrateSession({ token, refreshToken, user }))
        return
      }
      if (!token && !refreshToken && !user) dispatch(sessionExpired())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [dispatch])

  const value = useMemo(
    () => ({
      ...auth,
      login: (credentials) => dispatch(loginUser(credentials)).unwrap(),
      logout: () => dispatch(logoutUser()),
    }),
    [auth, dispatch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
