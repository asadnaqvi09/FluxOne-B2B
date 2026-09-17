import {
  Dialog,
  DialogCancelButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Form modal shell.
// - Outside / backdrop click: ignored (no close, no message)
// - Esc / X / Cancel: Discard only when dirty; otherwise quiet close
export function FormDialog({
  open,
  onOpenChange,
  dirty = false,
  title,
  description,
  children,
  footer,
  contentClassName,
  showCloseButton = true,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={dirty}>
      <DialogContent
        className={contentClassName || 'sm:max-w-lg md:max-w-xl'}
        showCloseButton={showCloseButton}
      >
        {(title || description) && (
          <DialogHeader>
            {title ? <DialogTitle className="pr-2 text-base sm:text-lg">{title}</DialogTitle> : null}
            {description ? (
              <DialogDescription className="text-xs sm:text-sm">{description}</DialogDescription>
            ) : null}
          </DialogHeader>
        )}
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}

export { DialogCancelButton }

export default FormDialog
