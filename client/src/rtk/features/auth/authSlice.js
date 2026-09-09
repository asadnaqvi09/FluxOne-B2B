// Auth Slice — Express /api/auth → RTK → AuthContext / useAuthSession → UI
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { tokenStorage } from '@/api/tokenStorage'
import { invalidateProductCatalog } from '@/lib/productCatalogCache'

const storedUser = tokenStorage.getUser()
const storedToken = tokenStorage.getToken()
const storedRefreshToken = tokenStorage.getRefreshToken()

function clearSessionState(state) {
  state.user = null
  state.token = null
  state.refreshToken = null
  state.role = null
  state.isAuthenticated = false
  state.status = 'idle'
  state.error = null
}

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  const result = await apiClient.post(endpoints.auth.login, credentials)
  if (!result?.success) {
    return rejectWithValue(result?.error || 'Login failed')
  }
  return result.data
})

/**
 * Optimistic logout: session is cleared on `pending` so LoginPage never
 * bounces back to the dashboard while the API request is in flight.
 */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await apiClient.post(endpoints.auth.logout, {})
  } catch {
    // Client session already cleared — ignore network errors
  }
})

// JSON when text-only; multipart FormData when a new profile image is selected
function buildProfileUpdateBody(payload) {
  const hasImage = payload.image instanceof File && payload.image.size > 0

  if (!hasImage) {
    const body = {
      name: payload.name,
      id: payload.id,
    }
    if (payload.password) body.password = payload.password
    return body
  }

  const form = new FormData()
  if (payload.name) form.append('name', payload.name)
  if (payload.id) form.append('id', payload.id)
  if (payload.password) form.append('password', payload.password)
  form.append('image', payload.image)
  return form
}

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload, { rejectWithValue }) => {
    const result = await apiClient.patch(endpoints.auth.update, buildProfileUpdateBody(payload))
    if (!result?.success) {
      return rejectWithValue(result?.error || 'Profile update failed')
    }
    return result.data
  },
)

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    const result = await apiClient.get(endpoints.auth.me)
    if (!result?.success) {
      return rejectWithValue(result?.error || 'Failed to load profile')
    }
    return result.data
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser,
    token: storedToken,
    refreshToken: storedRefreshToken,
    role: storedUser?.role || null,
    isAuthenticated: Boolean(storedToken && storedUser),
    status: 'idle',
    error: null,
  },
  reducers: {
    hydrateSession(state, action) {
      const { user, token, refreshToken } = action.payload || {}
      if (user !== undefined) state.user = user
      if (token !== undefined) state.token = token
      if (refreshToken !== undefined) state.refreshToken = refreshToken
      state.role = (user || state.user)?.role || null
      state.isAuthenticated = Boolean((token ?? state.token) && (user ?? state.user))
    },
    sessionExpired(state) {
      invalidateProductCatalog()
      clearSessionState(state)
    },
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        invalidateProductCatalog()
        state.status = 'succeeded'
        state.user = action.payload.user
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken || null
        state.role = action.payload.user?.role || null
        state.isAuthenticated = true
        tokenStorage.setSession({
          token: action.payload.token,
          refreshToken: action.payload.refreshToken,
          user: action.payload.user,
        })
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message || 'Login failed'
      })
      .addCase(logoutUser.pending, (state) => {
        tokenStorage.clear()
        invalidateProductCatalog()
        clearSessionState(state)
      })
      .addCase(logoutUser.fulfilled, (state) => {
        clearSessionState(state)
      })
      .addCase(logoutUser.rejected, (state) => {
        // Still signed out locally even if API failed
        tokenStorage.clear()
        invalidateProductCatalog()
        clearSessionState(state)
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        const payload = action.payload || {}
        const { passwordUpdated: _passwordUpdated, ...user } = payload
        state.user = user
        state.role = user?.role || state.role
        tokenStorage.setUser(user)
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        if (!action.payload) return
        state.user = action.payload
        state.role = action.payload?.role || state.role
        tokenStorage.setUser(action.payload)
      })
  },
})

export const { hydrateSession, sessionExpired, clearAuthError } = authSlice.actions
export default authSlice.reducer
