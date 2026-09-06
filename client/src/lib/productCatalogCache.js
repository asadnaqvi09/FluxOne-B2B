import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { splitCategories } from '@/lib/mapProduct'

const TTL_MS = 5 * 60 * 1000

const emptyCatalog = () => ({
  parents: [],
  childrenByParent: new Map(),
  all: [],
  taxes: [],
  offers: [],
})

/** Module-level cache shared across Products + Categories pages (same session). */
let cache = {
  data: null,
  fetchedAt: 0,
  inFlight: null,
}

function isFresh() {
  return Boolean(cache.data) && Date.now() - cache.fetchedAt < TTL_MS
}

function applyCategories(rows) {
  const split = splitCategories(Array.isArray(rows) ? rows : [])
  const base = cache.data || emptyCatalog()
  cache.data = {
    ...base,
    ...split,
  }
  cache.fetchedAt = Date.now()
  return cache.data
}

function applyFull({ categories, taxes, offers }) {
  const split = splitCategories(Array.isArray(categories) ? categories : [])
  cache.data = {
    ...split,
    taxes: Array.isArray(taxes) ? taxes : [],
    offers: Array.isArray(offers) ? offers : [],
  }
  cache.fetchedAt = Date.now()
  return cache.data
}

/**
 * Load categories + taxes + offers once; dedupe parallel callers.
 * @param {{ force?: boolean }} [options]
 */
export async function getProductCatalog(options = {}) {
  const force = Boolean(options.force)
  if (!force && isFresh()) return cache.data
  if (!force && cache.inFlight) return cache.inFlight

  cache.inFlight = (async () => {
    try {
      const [catsRes, taxesRes, offersRes] = await Promise.all([
        apiClient.get(endpoints.products.categories),
        apiClient.get(endpoints.products.taxes),
        apiClient.get(endpoints.products.offers),
      ])
      return applyFull({
        categories: catsRes.success && Array.isArray(catsRes.data) ? catsRes.data : [],
        taxes: taxesRes.success && Array.isArray(taxesRes.data) ? taxesRes.data : [],
        offers: offersRes.success && Array.isArray(offersRes.data) ? offersRes.data : [],
      })
    } finally {
      cache.inFlight = null
    }
  })()

  return cache.inFlight
}

/** After category/subcategory CRUD — refresh categories only; keep taxes/offers. */
export async function refreshProductCategories() {
  // Cache-bust query so intermediaries cannot serve a pre-delete list
  const catsRes = await apiClient.get(endpoints.products.categories, {
    _ts: Date.now(),
  })
  if (!catsRes.success || !Array.isArray(catsRes.data)) {
    // Never wipe a good catalog with null/empty from a failed/stale response
    if (!cache.data) return getProductCatalog({ force: true })
    return cache.data
  }
  return applyCategories(catsRes.data)
}

export function peekProductCatalog() {
  return cache.data
}

/** Patch isActive on a cached category row without refetching the full catalog.
 * When a parent is deactivated, cascade to children (matches server behavior).
 */
export function patchCatalogCategoryActive(id, isActive) {
  if (!cache.data || !id) return
  const parents = cache.data.parents || []
  const isParent = parents.some((row) => row.id === id)

  const shouldPatch = (row) => {
    if (row.id === id) return true
    if (!isActive && isParent && row.parentId === id) return true
    return false
  }
  const patchRow = (row) => (shouldPatch(row) ? { ...row, isActive } : row)

  cache.data.parents = parents.map(patchRow)
  if (cache.data.childrenByParent instanceof Map) {
    for (const [key, rows] of cache.data.childrenByParent.entries()) {
      cache.data.childrenByParent.set(key, (rows || []).map(patchRow))
    }
  }
  cache.data.all = (cache.data.all || []).map(patchRow)
}

export function invalidateProductCatalog() {
  cache = { data: null, fetchedAt: 0, inFlight: null }
}
