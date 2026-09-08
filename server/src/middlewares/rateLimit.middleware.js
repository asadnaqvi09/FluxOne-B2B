import rateLimit from 'express-rate-limit'

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)

function createLimiter(max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: message },
  })
}

// Global fallback for unmatched routes / health
export const globalLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_GLOBAL_MAX || 300),
  'Too many requests. Please try again later.',
)

// Strict limiter for login / refresh / password endpoints
export const authLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  'Too many authentication attempts. Please try again later.',
)

// Inventory manager APIs (products, control, suppliers, POs, dashboard, reports)
export const inventoryLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_INVENTORY_MAX || 200),
  'Too many inventory requests. Please try again later.',
)

// Branch manager APIs
export const branchLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_BRANCH_MAX || 150),
  'Too many branch requests. Please try again later.',
)

// POS sync push/pull — higher throughput for devices
export const syncLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_SYNC_MAX || 400),
  'Too many sync requests. Please try again later.',
)

// B2B Admin APIs
export const adminLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_ADMIN_MAX || 150),
  'Too many admin requests. Please try again later.',
)
