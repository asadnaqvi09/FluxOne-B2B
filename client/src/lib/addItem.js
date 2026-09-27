// Add Item wizard constants + combination builder (API-backed create).

export const ADD_ITEM_TABS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'type', label: 'Product Type' },
  { id: 'variantTypes', label: 'Variant Type', variantOnly: true },
  { id: 'values', label: 'Values', variantOnly: true },
  { id: 'combinations', label: 'Combinations', variantOnly: true },
  { id: 'save', label: 'Save' },
]

export const PRODUCT_KIND = {
  NORMAL: 'normal',
  VARIANT: 'variant',
}

// Cartesian product of value arrays → combination rows
export function buildCombinations(selectedTypes) {
  // selectedTypes: [{ typeId, typeName, values: [{ id, name }] }]
  const lists = selectedTypes
    .map((t) =>
      (t.values || []).map((v) => ({
        typeId: t.typeId,
        typeName: t.typeName,
        valueId: v.id,
        valueName: v.name,
        isCustomType: Boolean(t.isCustom),
        isCustomValue: Boolean(v.isCustom),
      })),
    )
    .filter((list) => list.length > 0)

  if (!lists.length) return []

  let combos = [[]]
  for (const list of lists) {
    const next = []
    for (const prefix of combos) {
      for (const item of list) {
        next.push([...prefix, item])
      }
    }
    combos = next
  }

  return combos.map((parts, index) => {
    const label = parts.map((p) => p.valueName).join('–')
    const slug = parts
      .map((p) => p.valueName.replace(/\s+/g, '').slice(0, 6).toUpperCase())
      .join('-')
    const stamp = Date.now().toString(36).toUpperCase()
    return {
      key: parts.map((p) => p.valueId).join('|'),
      label,
      parts,
      sku: `SKU-${slug}-${stamp}-${index + 1}`,
      barcode: `890${String(Date.now()).slice(-8)}${String(index + 1).padStart(2, '0')}`.slice(0, 13),
      purchasePrice: '',
      sellingPrice: '',
      openingStock: '0',
      lowStockThreshold: '',
      dailyPriceChange: false,
      status: 'active',
    }
  })
}

// Build POST /inventory/products body from wizard state
export function buildAddItemApiPayload({
  form,
  productKind,
  combinations = [],
  selectedTypes = [],
  selectedValuesByType = {},
}) {
  const name = String(form.name || '').trim()
  const description = String(form.description || '').trim() || undefined
  const categoryId = form.categoryId || undefined
  const subcategoryId = form.subcategoryId || undefined

  if (productKind === PRODUCT_KIND.NORMAL) {
    return {
      name,
      description,
      categoryId,
      subcategoryId,
      type: 'single',
      scale: 'unit',
      itemCode: String(form.sku || '').trim(),
      barcode: String(form.barcode || '').trim(),
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      quantity: Number(form.openingStock) || 0,
      reorderPoint:
        form.lowStockThreshold === '' || form.lowStockThreshold == null
          ? undefined
          : Number(form.lowStockThreshold),
      dailyPriceChange: Boolean(form.dailyPriceChange),
      confirmed: true,
    }
  }

  const activeRows = combinations.filter((row) => row.status === 'active')
  const variants = activeRows.map((row) => ({
    label: row.label,
    itemCode: String(row.sku || '').trim(),
    barcode: String(row.barcode || '').trim(),
    purchasePrice: Number(row.purchasePrice) || 0,
    sellingPrice: Number(row.sellingPrice) || 0,
    quantity: Number(row.openingStock) || 0,
    reorderPoint:
      row.lowStockThreshold === '' || row.lowStockThreshold == null
        ? undefined
        : Number(row.lowStockThreshold),
    dailyPriceChange: Boolean(row.dailyPriceChange),
    status: 'active',
    parts: (row.parts || []).map((p) => ({
      typeId: p.typeId,
      typeName: p.typeName,
      valueId: p.valueId,
      valueName: p.valueName,
      isCustomType: Boolean(p.isCustomType),
      isCustomValue: Boolean(p.isCustomValue),
    })),
  }))

  // TEMP: custom type/value metadata kept for BM notify (task 4)
  const customMeta = selectedTypes.map((t) => ({
    id: t.id,
    name: t.name,
    isCustom: Boolean(t.isCustom),
    values: (t.values || [])
      .filter((v) => (selectedValuesByType[t.id] || []).includes(v.id))
      .map((v) => ({ id: v.id, name: v.name, isCustom: Boolean(v.isCustom) })),
  }))

  return {
    name,
    description,
    categoryId,
    subcategoryId,
    type: 'variant',
    scale: 'unit',
    confirmed: true,
    variants,
    // Not sent to API — stripped in thunk; useful for console / future notify
    _customVariantMeta: customMeta,
  }
}

// Map product detail → combination rows (edit)
export function variantsToCombinationRows(variants = []) {
  return (variants || []).map((v) => {
    const parts = (v.parts || []).map((p) => ({
      typeId: p.variantTypeId || p.typeId,
      typeName: p.typeName,
      valueId: p.variantValueId || p.valueId,
      valueName: p.valueName,
      isCustomType: Boolean(p.isCustomType),
      isCustomValue: Boolean(p.isCustomValue),
    }))
    const key =
      parts.map((p) => p.valueId || p.valueName).join('|') ||
      v.id ||
      `row-${v.variantLabel || v.label}`
    return {
      key,
      productId: v.id || null,
      label: v.variantLabel || v.label || parts.map((p) => p.valueName).join('–'),
      parts,
      sku: v.itemCode || '',
      barcode: v.barcode || '',
      purchasePrice: v.purchasePrice === 0 || v.purchasePrice ? String(v.purchasePrice) : '',
      sellingPrice: v.sellingPrice === 0 || v.sellingPrice ? String(v.sellingPrice) : '',
      openingStock: String(v.quantity ?? 0),
      lowStockThreshold:
        v.reorderPoint === 0 || v.reorderPoint ? String(v.reorderPoint) : '',
      dailyPriceChange: Boolean(v.dailyPriceChange),
      status: v.status === 'inactive' ? 'inactive' : 'active',
    }
  })
}

// Infer selected types/values from existing child parts (+ merge into catalog list)
export function hydrateVariantSelectionFromRows(rows, catalogTypes = []) {
  const typeMap = new Map()
  for (const t of catalogTypes) {
    typeMap.set(t.id, {
      id: t.id,
      name: t.name,
      isCustom: Boolean(t.isCustom),
      values: [...(t.values || [])],
    })
  }

  const selectedTypeIds = []
  const selectedValuesByType = {}

  for (const row of rows) {
    for (const part of row.parts || []) {
      let typeId = part.typeId
      if (!typeId || !typeMap.has(typeId)) {
        // Custom / missing — key by type name
        const existing = [...typeMap.values()].find(
          (t) => t.name.toLowerCase() === String(part.typeName || '').toLowerCase(),
        )
        if (existing) {
          typeId = existing.id
        } else {
          typeId = part.typeId || `custom-type-${part.typeName}`
          typeMap.set(typeId, {
            id: typeId,
            name: part.typeName,
            isCustom: true,
            values: [],
          })
        }
      }
      const type = typeMap.get(typeId)
      if (!selectedTypeIds.includes(typeId)) selectedTypeIds.push(typeId)

      let valueId = part.valueId
      const valueExists = type.values.some((v) => v.id === valueId)
      if (!valueId || !valueExists) {
        const byName = type.values.find(
          (v) => v.name.toLowerCase() === String(part.valueName || '').toLowerCase(),
        )
        if (byName) {
          valueId = byName.id
        } else {
          valueId = part.valueId || `custom-val-${part.typeName}-${part.valueName}`
          type.values.push({
            id: valueId,
            name: part.valueName,
            isCustom: Boolean(part.isCustomValue) || !part.valueId,
          })
        }
      }
      const bucket = selectedValuesByType[typeId] || []
      if (!bucket.includes(valueId)) bucket.push(valueId)
      selectedValuesByType[typeId] = bucket

      // Keep parts aligned with resolved ids for rebuild matching
      part.typeId = typeId
      part.valueId = valueId
    }
  }

  return {
    variantTypes: [...typeMap.values()],
    selectedTypeIds,
    selectedValuesByType,
  }
}

// PATCH body for Edit Item
export function buildEditItemApiPayload({
  form,
  productKind,
  combinations = [],
}) {
  const name = String(form.name || '').trim()
  const description = String(form.description || '').trim() || undefined
  const categoryId = form.categoryId || undefined
  const subcategoryId = form.subcategoryId || undefined

  if (productKind === PRODUCT_KIND.NORMAL) {
    return {
      name,
      description,
      categoryId,
      subcategoryId,
      type: 'single',
      scale: 'unit',
      itemCode: String(form.sku || '').trim(),
      barcode: String(form.barcode || '').trim(),
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      reorderPoint:
        form.lowStockThreshold === '' || form.lowStockThreshold == null
          ? undefined
          : Number(form.lowStockThreshold),
      dailyPriceChange: Boolean(form.dailyPriceChange),
      status: form.status === 'inactive' ? 'inactive' : 'active',
    }
  }

  const variants = combinations.map((row) => {
    const base = {
      label: row.label,
      itemCode: String(row.sku || '').trim(),
      barcode: String(row.barcode || '').trim(),
      purchasePrice: Number(row.purchasePrice) || 0,
      sellingPrice: Number(row.sellingPrice) || 0,
      reorderPoint:
        row.lowStockThreshold === '' || row.lowStockThreshold == null
          ? undefined
          : Number(row.lowStockThreshold),
      dailyPriceChange: Boolean(row.dailyPriceChange),
      status: row.status === 'inactive' ? 'inactive' : 'active',
      parts: (row.parts || []).map((p) => ({
        typeId: p.typeId,
        typeName: p.typeName,
        valueId: p.valueId,
        valueName: p.valueName,
        isCustomType: Boolean(p.isCustomType),
        isCustomValue: Boolean(p.isCustomValue),
      })),
    }
    if (row.productId) {
      return { ...base, id: row.productId }
    }
    // New SKU — opening stock allowed
    return {
      ...base,
      quantity: Number(row.openingStock) || 0,
    }
  })

  return {
    name,
    description,
    categoryId,
    subcategoryId,
    type: 'variant',
    scale: 'unit',
    status: form.status === 'inactive' ? 'inactive' : 'active',
    variants,
  }
}

