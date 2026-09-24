import { useMemo, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { cn } from '@/lib/utils'

// Pick existing single items for a bundle.
// Items may already belong to other bundles — selection is from the full single-item catalog.
export function BundleItemPicker({
  catalogItems = [],
  value = [],
  onChange,
  excludeId = null,
  loading = false,
  className,
}) {
  const [query, setQuery] = useState('')

  const options = useMemo(
    () =>
      catalogItems.filter(
        (item) => item.id !== excludeId && item.type !== 'bundle',
      ),
    [catalogItems, excludeId],
  )

  const selectedIds = useMemo(
    () => new Set(value.map((row) => row.itemId).filter(Boolean)),
    [value],
  )

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((item) => {
      const haystack = `${item.name || ''} ${item.itemCode || ''} ${item.scale || ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [options, query])

  const selectedRows = useMemo(
    () =>
      value
        .map((row) => {
          const item = options.find((opt) => opt.id === row.itemId)
          return item ? { ...row, item } : null
        })
        .filter(Boolean),
    [value, options],
  )

  function toggleItem(itemId) {
    if (selectedIds.has(itemId)) {
      onChange?.(value.filter((row) => row.itemId !== itemId))
      return
    }
    onChange?.([...value, { itemId, quantity: 1 }])
  }

  function patchQuantity(itemId, quantity) {
    onChange?.(
      value.map((row) =>
        row.itemId === itemId ? { ...row, quantity: Number(quantity) || 1 } : row,
      ),
    )
  }

  function removeItem(itemId) {
    onChange?.(value.filter((row) => row.itemId !== itemId))
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <Label>Select existing items</Label>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Choose single items from your catalog. Items can belong to different bundles elsewhere.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Loading item catalog…</p>
      ) : !options.length ? (
        <p className="text-xs text-slate-400">
          Create at least one single item before building a bundle.
        </p>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or item code…"
              className="pl-9"
            />
          </div>

          <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-slate-50/50">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">No items match your search.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {filteredOptions.map((item) => {
                  const checked = selectedIds.has(item.id)
                  return (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-white">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => toggleItem(item.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {item.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                            {item.itemCode || '—'} · {item.scale || 'unit'}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {selectedRows.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                Selected ({selectedRows.length})
              </p>
              <div className="space-y-2">
                {selectedRows.map((row) => (
                  <div
                    key={row.itemId}
                    className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{row.item.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{row.item.itemCode}</p>
                    </div>
                    <div className="w-20 shrink-0 space-y-0.5">
                      <Label className="text-[10px] text-slate-400">Qty</Label>
                      <WholeNumberInput
                        min={1}
                        value={row.quantity}
                        onChange={(event) => patchQuantity(row.itemId, event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 cursor-pointer text-red-600"
                      onClick={() => removeItem(row.itemId)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-700">Select at least one item for this bundle.</p>
          )}
        </>
      )}
    </div>
  )
}
