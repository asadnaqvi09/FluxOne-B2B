//
// Shared parent/child list filter for Categories + Variant Management.
// Status: all | active | inactive. Search matches parent name or any child name.
//
export function filterParentChildRows(rows, statusFilter = 'all', query = '') {
  const list = Array.isArray(rows) ? rows : []

  let next = list
  if (statusFilter === 'active') {
    next = list
      .filter((row) => row.isActive !== false)
      .map((row) => ({
        ...row,
        children: (row.children || []).filter((child) => child.isActive !== false),
      }))
  } else if (statusFilter === 'inactive') {
    next = list
      .map((row) => {
        const inactiveChildren = (row.children || []).filter(
          (child) => child.isActive === false,
        )
        if (row.isActive === false) {
          return { ...row, children: inactiveChildren }
        }
        if (inactiveChildren.length > 0) {
          return { ...row, children: inactiveChildren }
        }
        return null
      })
      .filter(Boolean)
  }

  const needle = String(query || '')
    .trim()
    .toLowerCase()
  if (!needle) return next

  // Parent name hit keeps all (status-filtered) children; else only matching children.
  return next
    .map((row) => {
      const parentHit = String(row.name || '')
        .toLowerCase()
        .includes(needle)
      const matchedChildren = (row.children || []).filter((child) =>
        String(child.name || '')
          .toLowerCase()
          .includes(needle),
      )
      if (parentHit) return row
      if (matchedChildren.length) return { ...row, children: matchedChildren }
      return null
    })
    .filter(Boolean)
}
