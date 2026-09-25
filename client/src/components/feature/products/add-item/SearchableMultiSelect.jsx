import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Input that filters a checkbox list (dropdown + search). Supports inline Custom add.
export function SearchableMultiSelect({
  label,
  hint,
  options = [],
  value = [],
  onChange,
  customLabel = '+ Custom',
  onAddCustom,
  placeholder = 'Search or select…',
  emptyText = 'No options match',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [customName, setCustomName] = useState('')
  const [addingCustom, setAddingCustom] = useState(false)
  const rootRef = useRef(null)

  const selectedSet = useMemo(() => new Set(value), [value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => String(opt.label || '').toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    function onDocClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
        setAddingCustom(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function toggle(id) {
    if (selectedSet.has(id)) onChange?.(value.filter((x) => x !== id))
    else onChange?.([...value, id])
  }

  function removeChip(id) {
    onChange?.(value.filter((x) => x !== id))
  }

  function submitCustom() {
    const name = customName.trim()
    if (!name) return
    const id = onAddCustom?.(name)
    if (id) {
      if (!selectedSet.has(id)) onChange?.([...value, id])
      setCustomName('')
      setAddingCustom(false)
      setQuery('')
    }
  }

  const selectedOptions = options.filter((opt) => selectedSet.has(opt.id))

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      {label ? <Label>{label}</Label> : null}
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {opt.label}
              {opt.isCustom ? (
                <span className="text-[10px] text-amber-600">(custom)</span>
              ) : null}
              <button
                type="button"
                className="cursor-pointer text-slate-400 hover:text-slate-700"
                aria-label={`Remove ${opt.label}`}
                onClick={() => removeChip(opt.id)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pr-9 pl-9"
        />
        <button
          type="button"
          className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle options"
        >
          <ChevronsUpDown className="size-4" />
        </button>
      </div>

      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          <ul className="max-h-44 overflow-y-auto divide-y divide-border/60">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-400">{emptyText}</li>
            ) : (
              filtered.map((opt) => {
                const checked = selectedSet.has(opt.id)
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                      onClick={() => toggle(opt.id)}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded border',
                          checked
                            ? 'border-transparent text-white'
                            : 'border-slate-300 bg-white',
                        )}
                        style={checked ? { background: BRAND.purple } : undefined}
                      >
                        {checked ? <Check className="size-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {opt.label}
                        {opt.isCustom ? (
                          <span className="ml-1 text-[10px] text-amber-600">custom</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          <div className="border-t border-border bg-slate-50/80 p-2">
            {addingCustom ? (
              <div className="flex gap-2">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Custom name"
                  className="h-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitCustom()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer text-white"
                  style={{ background: BRAND.purple }}
                  onClick={submitCustom}
                >
                  Add
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full cursor-pointer"
                style={{ color: BRAND.deep }}
                onClick={() => setAddingCustom(true)}
              >
                <Plus className="size-4" />
                {customLabel}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
