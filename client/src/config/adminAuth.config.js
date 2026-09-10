// Legacy mock Admin session helpers.
//
// DISABLED for real B2B Admin auth: Admin routes require a live JWT with
// role `b2b_admin` from `/api/auth/login`. localStorage mock sessions no
// longer unlock `/admin/*`.
//
// File kept so older imports do not break; clearAdminSession still removes
// any leftover `fluxone_admin_session` key from earlier test builds.

export const ADMIN_CREDENTIALS = {
  id: 'admin@fluxone.b2b',
  email: 'admin@fluxone.b2b',
  password: 'password123',
  name: 'Asad Naqvi (B2B Owner)',
  role: 'b2b_owner',
  tenantName: 'FluxOne Enterprise Solutions (All Branches)',
  tenantSlug: 'fluxone-enterprise',
  branchName: 'Global Enterprise HQ',
}

const STORAGE_KEY = 'fluxone_admin_session'

// @deprecated Mock admin localStorage auth is disabled.
export function getAdminSession() {
  return null
}

// Always false — use real JWT `b2b_admin` via AuthContext / tokenStorage.
export function isAdminLoggedIn() {
  return false
}

// No-op: do not write mock admin sessions.
export function setAdminSession() {
  return null
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// Mock credential check disabled — always fail.
export function validateAdminLogin() {
  return {
    success: false,
    error: 'Use softwareflux@company.com with the live API login.',
  }
}
