// Shared helper — normalize RTK thunk results for hooks / UI
export function asResult(promise) {
  return promise
    .then((data) => {
      if (data && typeof data === 'object' && 'success' in data) return data
      return { success: true, data }
    })
    .catch((err) => ({
      success: false,
      error: typeof err === 'string' ? err : err?.message || 'Request failed',
    }))
}

// Rebuild Map for UI code that calls childrenByParent.get(...)
export function catalogForUi(catalog) {
  if (!catalog) {
    return {
      parents: [],
      childrenByParent: new Map(),
      all: [],
      taxes: [],
      offers: [],
      defaults: {
        defaultProfitPercent: 0,
        defaultTaxPercent: 0,
      },
    }
  }
  const raw = catalog.childrenByParent
  const childrenByParent =
    raw instanceof Map ? raw : new Map(Object.entries(raw || {}))
  return {
    parents: catalog.parents || [],
    childrenByParent,
    all: catalog.all || [],
    taxes: catalog.taxes || [],
    offers: catalog.offers || [],
    defaults: {
      defaultProfitPercent: Number(catalog.defaults?.defaultProfitPercent) || 0,
      defaultTaxPercent: Number(catalog.defaults?.defaultTaxPercent) || 0,
    },
  }
}

// Inventory control + product forms — active categories/subcategories only.
export function catalogActiveOnly(catalog) {
  const ui = catalogForUi(catalog)
  const parents = (ui.parents || []).filter((row) => row.isActive !== false)
  const childrenByParent = new Map()

  for (const parent of parents) {
    const children = (ui.childrenByParent.get(parent.id) || []).filter(
      (row) => row.isActive !== false,
    )
    childrenByParent.set(parent.id, children)
  }

  return {
    ...ui,
    parents,
    childrenByParent,
  }
}
