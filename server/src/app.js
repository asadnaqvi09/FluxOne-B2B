import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './config/db.js'
import { authMiddleware } from './middlewares/auth.middleware.js'
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware.js'
import {
  authLimiter,
  branchLimiter,
  globalLimiter,
  inventoryLimiter,
  syncLimiter,
} from './middlewares/rateLimit.middleware.js'
import authRoutes from './modules/auth/auth.routes.js'
import inventoryRoutes from './modules/inventory-manager/inventory.routes.js'
import branchRoutes from './modules/branch-manager/branch.routes.js'
import syncRoutes from './modules/sync/sync.routes.js'

export const app = express()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localUploadsDir = path.resolve(__dirname, '../uploads')

const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const isProd = process.env.NODE_ENV === 'production'

const allowedOrigins = new Set(
  [origin, 'http://localhost:5173', 'http://127.0.0.1:5173']
    .filter(Boolean)
    .flatMap((value) => value.split(',').map((part) => part.trim())),
)

app.set('trust proxy', 1)
// Prevent browser/proxy 304 reuse of stale JSON after DELETE/PATCH (e.g. categories)
app.set('etag', false)
app.use(helmet())
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    res.set('Pragma', 'no-cache')
  }
  next()
})
app.use(
  cors({
    origin(requestOrigin, callback) {
      if (!requestOrigin || allowedOrigins.has(requestOrigin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    credentials: true,
  }),
)
app.use(compression())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan(isProd ? 'combined' : 'dev'))
app.use('/uploads', express.static(localUploadsDir))
app.use(globalLimiter)

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    return res.json({ status: true, data: { status: 'ok' }, error: null })
  } catch {
    return res.status(503).json({ status: false, error: 'Database unreachable' })
  }
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/inventory', inventoryLimiter, authMiddleware, inventoryRoutes)
app.use('/api/branch', branchLimiter, authMiddleware, branchRoutes)
app.use('/api/sync', syncLimiter, authMiddleware, syncRoutes)

app.use(notFoundMiddleware)
app.use(errorMiddleware)
