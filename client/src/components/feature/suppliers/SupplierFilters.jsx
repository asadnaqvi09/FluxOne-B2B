import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'

/**
 * Debounced search + active filter for suppliers.
 * Input updates immediately; parent fetch fires after 300ms.
 */
export function SupplierFilters({
  q = '',
  active = 'active',
  onSearchChange,
  onActiveChange,
  className,
}) {
  const [localQ, setLocalQ] = useState(q)
  const timerRef = useRef(null)

  // Keep local box in sync if parent resets filters
  useEffect(() => {
    setLocalQ(q || '')
  }, [q])

  function handleChange(value) {
    setLocalQ(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSearchChange?.(value), 300)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end ${className || ''}`}>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="supplier-search" className="sr-only">
          Search suppliers
        </Label>
        <Input
          id="supplier-search"
          value={localQ}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Search by company name or ID…"
        />
      </div>
      <div className="w-full space-y-1.5 sm:w-40">
        <Label htmlFor="supplier-active-filter">Status</Label>
        <NativeSelect
          id="supplier-active-filter"
          value={active}
          onChange={(event) => onActiveChange?.(event.target.value)}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </NativeSelect>
      </div>
    </div>
  )
}
