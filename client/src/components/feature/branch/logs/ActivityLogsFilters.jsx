import { useEffect } from 'react'
import { Search } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_SOURCES,
} from '@/lib/activityLogLabels'

const ACTION_OPTIONS = Object.entries(ACTIVITY_ACTION_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const CLEAR_FILTERS = {
  from: '',
  to: '',
  source: '',
  action: '',
  q: '',
  page: 1,
}

function hasActiveFilters(filters = {}) {
  return Boolean(filters.from || filters.to || filters.source || filters.action || filters.q?.trim())
}

export function ActivityLogsFilters({ filters, onChange }) {
  const { localQ, setLocalQ, onSearchChange } = useDebouncedSearch(onChange, filters.q || '')

  useEffect(() => {
    setLocalQ(filters.q || '')
  }, [filters.q, setLocalQ])

  function clearFilters() {
    setLocalQ('')
    onChange(CLEAR_FILTERS)
  }

  return (
    <SurfaceCard padding="compact">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="logs-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="logs-search"
              value={localQ}
              placeholder="Search by name or action…"
              className="pl-9"
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="logs-from">From</Label>
            <Input
              id="logs-from"
              type="date"
              value={filters.from || ''}
              onChange={(e) => onChange({ from: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logs-to">To</Label>
            <Input
              id="logs-to"
              type="date"
              value={filters.to || ''}
              onChange={(e) => onChange({ to: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logs-source">Source</Label>
            <NativeSelect
              id="logs-source"
              value={filters.source || ''}
              onChange={(e) => onChange({ source: e.target.value })}
            >
              <option value="">All sources</option>
              {ACTIVITY_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logs-action">Action</Label>
            <NativeSelect
              id="logs-action"
              value={filters.action || ''}
              onChange={(e) => onChange({ action: e.target.value })}
            >
              <option value="">All actions</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {hasActiveFilters(filters) ? (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  )
}
