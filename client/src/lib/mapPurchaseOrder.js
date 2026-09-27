// Live purchase-order mapper (IM API).
export function mapPurchaseOrder(row = {}) {
  return {
    id: row.id,
    orderNumber: row.orderNumber || row.order_number || row.reference || '',
    supplierId: row.supplierId ?? row.supplier_id ?? null,
    companyName: row.companyName || row.company_name || row.supplierName || '',
    representativeName: row.representativeName || row.representative_name || '',
    representativePhone: row.representativePhone || row.representative_phone || '',
    companyPhone: row.companyPhone || row.company_phone || '',
    // Generate auto-accepts → default approved when API omits status
    status: row.status || 'approved',
    explanation: row.explanation || '',
    createdAt: row.createdAt || row.created_at || null,
    itemsNumber: Number(row.itemsNumber ?? row.items_number ?? row.lines?.length ?? 0),
    lines: Array.isArray(row.lines)
      ? row.lines.map((line) => ({
          id: line.id,
          productId: line.productId ?? line.product_id ?? line.itemId,
          name: line.name || '',
          itemCode: line.itemCode || line.item_code || '',
          scale: line.scale || 'unit',
          quantity: Number(line.quantity ?? 0),
          unitCost: Number(line.unitCost ?? line.unit_cost ?? 0),
          lastPurchasePrice: Number(line.lastPurchasePrice ?? line.last_purchase_price ?? 0),
        }))
      : [],
  }
}

export function mapPurchaseHistory(data = {}) {
  return {
    orderId: data.orderId || data.order_id || null,
    orderNumber: data.orderNumber || data.order_number || '',
    companyName: data.companyName || data.company_name || '',
    lines: Array.isArray(data.lines)
      ? data.lines.map((line) => ({
          productId: line.productId,
          name: line.name || '',
          itemCode: line.itemCode || '',
          scale: line.scale || '',
          lastPurchasePrice: Number(line.lastPurchasePrice ?? 0),
          currentPurchasePrice: Number(line.currentPurchasePrice ?? 0),
          direction: line.direction || 'same',
        }))
      : [],
  }
}
