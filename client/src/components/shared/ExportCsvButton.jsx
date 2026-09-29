import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Reusable Export (CSV / Excel) action — wire onClick per page
export function ExportCsvButton({
  onClick,
  disabled = false,
  label = 'Export',
  title = 'Export data to Excel / CSV',
  className,
  size = 'sm',
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-8 cursor-pointer text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs',
        className,
      )}
    >
      <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-600" />
      {label}
    </Button>
  )
}

export default ExportCsvButton
