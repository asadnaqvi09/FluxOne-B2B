import { Trash2, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Standardized confirm modal — destructive / authorize / warning actions
export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  loading = false,
  variant = 'destructive',
  icon: CustomIcon,
}) {
  function renderIcon() {
    if (CustomIcon) {
      return (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-xs">
          <CustomIcon className="size-5.5" />
        </div>
      )
    }

    if (variant === 'destructive') {
      return (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-xs">
          <Trash2 className="size-5.5" />
        </div>
      )
    }

    if (variant === 'warning') {
      return (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
          <AlertTriangle className="size-5.5" />
        </div>
      )
    }

    if (variant === 'success') {
      return (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
          <CheckCircle2 className="size-5.5" />
        </div>
      )
    }

    return (
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs">
        <HelpCircle className="size-5.5" />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-6">
        {/* Header with circular icon badge, title and close button */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 pr-6">
          {renderIcon()}
          <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
            {title}
          </DialogTitle>
        </div>

        {/* Content area: Confirmation message & Warning text */}
        <div className="py-4 space-y-2.5">
          {description ? (
            typeof description === 'string' ? (
              <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
                {description}
              </p>
            ) : (
              <div className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
                {description}
              </div>
            )
          ) : null}

          {warning ? (
            <p className="text-xs sm:text-sm text-slate-500 leading-normal">
              {warning}
            </p>
          ) : null}
        </div>

        {/* Footer actions: Right-aligned Cancel and Destructive / Primary buttons */}
        <div className="flex flex-col-reverse gap-2 pt-4 border-t border-slate-100 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className="w-full sm:w-auto px-5 font-medium border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
            onClick={() => onOpenChange?.(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={loading}
            className={cn(
              'w-full sm:w-auto px-5 font-semibold text-white cursor-pointer shadow-xs transition-colors',
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-purple-700 hover:bg-purple-800',
            )}
            onClick={() => onConfirm?.()}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
