import { useEffect, useId, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// use reusable components if possible — Search + Status bar (Inventory list pages)
export function SearchStatusFilters({
  q = '',
  status = '',
  searchPlaceholder = 'Search…',
  searchLabel = 'Search',
  statusLabel = 'Status',
  statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'all', label: 'All' },
  ],
  // Debounce search before calling onSearchChange (ms). 0 = immediate.
  debounceMs = 300,
  onSearchChange,
  onStatusChange,
  className,
  // Extra selects rendered between search and status (optional)
  children,
}) {
  const reactId = useId()
  const searchId = `list-search-${reactId}`
  const statusId = `list-status-${reactId}`
  const [localQ, setLocalQ] = useState(q)
  const timerRef = useRef(null)

  useEffect(() => {
    setLocalQ(q || '')
  }, [q])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleSearch(value) {
    setLocalQ(value)
    if (debounceMs <= 0) {
      onSearchChange?.(value)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSearchChange?.(value), debounceMs)
  }

  return (
    <SurfaceCard className={cn(className)} padding="compact">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={searchId}>{searchLabel}</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id={searchId}
              value={localQ}
              placeholder={searchPlaceholder}
              className="pl-9"
              onChange={(event) => handleSearch(event.target.value)}
            />
          </div>
        </div>

        {children}

        <div className="w-full space-y-1.5 sm:w-40">
          <Label htmlFor={statusId}>{statusLabel}</Label>
          <NativeSelect
            id={statusId}
            value={status}
            onChange={(event) => onStatusChange?.(event.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </SurfaceCard>
  )
}

export default SearchStatusFilters
