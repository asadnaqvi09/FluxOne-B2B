import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Shared list pagination footer (Products, Suppliers, Control, Staff, …).
 */
export function Pagination({
  page = 1,
  pageCount = 1,
  loading = false,
  onPageChange,
  className,
  alwaysShow = false,
}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeCount = Math.max(1, Number(pageCount) || 1)
  if (!alwaysShow && safeCount <= 1) return null

  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-end gap-2 border-t border-border pt-3',
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={safePage <= 1 || loading}
          onClick={() => onPageChange?.(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={safePage >= safeCount || loading}
          onClick={() => onPageChange?.(safePage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
