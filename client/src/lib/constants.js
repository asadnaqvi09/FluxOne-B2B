export const APP_NAME = 'FluxOne'
export const COMPANY_NAME = 'Software Flux Solution'

export const MOCK_API = String(import.meta.env.VITE_MOCK_API ?? 'false') !== 'false'
/** Prefer Vite proxy `/api` in local dev (see vite.config.js). */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const PAGE_SIZE = 10

export const BRAND = {
  name: 'Software Flux Solution',
  product: 'FluxOne Management System',
  purple: '#8E238F',
  deep: '#412283',
  soft: '#f3e8f5',
}

export const ROLES = {
  INVENTORY_MANAGER: 'inventory_manager',
  BRANCH_MANAGER: 'branch_manager',
  B2B_ADMIN: 'b2b_admin',
  CASHIER: 'cashier',
  PRODUCTION_STAFF: 'production_staff',
  DELIVERY_STAFF: 'delivery_staff',
}

//Seeded demo accounts (password for all: password).
export const DEMO_ACCOUNTS = [
  {
    tenantSlug: 'company-a',
    id: 'admin@companya.local',
    password: 'password',
    role: ROLES.B2B_ADMIN,
    name: 'Asad',
    label: 'B2B Admin · Company A (Wah Cantt)',
  },
  {
    tenantSlug: 'company-a',
    id: 'branch.wah@companya.local',
    password: 'password',
    role: ROLES.BRANCH_MANAGER,
    name: 'Bilal Khan',
    label: 'Branch Manager · Wah Cantt',
  },
  {
    tenantSlug: 'company-b',
    id: 'admin@companyb.local',
    password: 'password',
    role: ROLES.B2B_ADMIN,
    name: 'Hassan Raza',
    label: 'B2B Admin · Company B (Haripur)',
  },
  {
    tenantSlug: 'company-b',
    id: 'branch.haripur@companyb.local',
    password: 'password',
    role: ROLES.BRANCH_MANAGER,
    name: 'Sara Ahmed',
    label: 'Branch Manager · Haripur',
  },
]
