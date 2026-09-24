// Normalize notification display — short header + full gray detail body
export function displayNotification(n = {}) {
  const type = String(n.type || '')
  const meta = n.meta && typeof n.meta === 'object' ? n.meta : {}

  if (type === 'leave_request') {
    const employeeName =
      meta.managerName || meta.employeeName || meta.staffName || n.name || 'Employee'
    const detail =
      n.body && n.body !== n.title
        ? n.body
        : n.body || n.title || ''
    return {
      title: `New Leave Request From ${employeeName}`,
      body: detail,
    }
  }

  if (type === 'stock_request') {
    const product = meta.productName || 'product'
    const qty = meta.requiredQuantity
    const branch = meta.branchName || 'branch'
    return {
      title: n.title || 'Stock request',
      body:
        n.body && n.body !== n.title
          ? n.body
          : `${branch}: ${qty != null ? `${qty} unit(s) of ` : ''}${product}`,
    }
  }

  return {
    title: n.title || 'Notification',
    body: n.body && n.body !== n.title ? n.body : n.body || '',
  }
}
