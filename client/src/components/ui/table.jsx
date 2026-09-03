import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableFooter({ className, ...props }) {
  return <tfoot className={cn('border-t bg-muted/50 font-medium', className)} {...props} />
}

function TableRow({ className, ...props }) {
  return <tr className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />
}

function TableHead({ className, ...props }) {
  return <th className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', className)} {...props} />
}

function TableCell({ className, ...props }) {
  return <td className={cn('p-4 align-middle', className)} {...props} />
}

function TableCaption({ className, ...props }) {
  return <caption className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
}

function TablePagination({
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
          className="h-8 cursor-pointer px-2.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={safePage <= 1 || loading}
          onClick={() => onPageChange?.(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4 mr-0.5" />
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 cursor-pointer px-2.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={safePage >= safeCount || loading}
          onClick={() => onPageChange?.(safePage + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="size-4 ml-0.5" />
        </Button>
      </div>
    </div>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TablePagination,
  TablePagination as Pagination,
}
