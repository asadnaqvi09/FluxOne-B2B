import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const DialogContext = createContext(null)

// Modal close policy:
// - Backdrop / outside click never closes (no message)
// - Esc / X / DialogCancelButton → Discard prompt only when dirty
function Dialog({ open, onOpenChange, dirty = false, children }) {
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    if (!open) setDiscardOpen(false)
  }, [open])

  const forceClose = useCallback(() => {
    setDiscardOpen(false)
    onOpenChange?.(false)
  }, [onOpenChange])

  const requestClose = useCallback(() => {
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    forceClose()
  }, [dirty, forceClose])

  const handleOpenChange = useCallback(
    (next) => {
      if (next === false) requestClose()
      else onOpenChange?.(next)
    },
    [onOpenChange, requestClose],
  )

  return (
    <DialogContext.Provider
      value={{
        open,
        onOpenChange,
        dirty,
        discardOpen,
        setDiscardOpen,
        requestClose,
        forceClose,
        handleOpenChange,
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}

function useDialogContext() {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    throw new Error('Dialog components must be used within Dialog')
  }
  return ctx
}

// Guarded close for Cancel buttons — must be rendered inside Dialog.
function useRequestDialogClose() {
  const { requestClose } = useDialogContext()
  return requestClose
}

function DialogCancelButton({ children = 'Cancel', className, ...props }) {
  const { requestClose } = useDialogContext()
  return (
    <Button
      type="button"
      variant="outline"
      className={cn('h-11 w-full sm:h-10 sm:w-auto', className)}
      onClick={requestClose}
      {...props}
    >
      {children}
    </Button>
  )
}

function DialogTrigger({ asChild, children, className, ...props }) {
  const { handleOpenChange } = useDialogContext()
  if (asChild) {
    return (
      <span className={className} onClick={() => handleOpenChange?.(true)} {...props}>
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={className}
      onClick={() => handleOpenChange?.(true)}
      {...props}
    >
      {children}
    </button>
  )
}

function DiscardChangesPrompt({ onStay, onDiscard }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center rounded-t-2xl bg-black/40 p-3 sm:items-center sm:rounded-xl sm:p-4">
      <div
        className="w-full max-w-sm rounded-xl border bg-card p-3 shadow-lg sm:p-4"
        role="alertdialog"
        aria-labelledby="discard-dialog-title"
        aria-describedby="discard-dialog-description"
      >
        <h3 id="discard-dialog-title" className="text-sm font-semibold sm:text-base">
          Discard changes?
        </h3>
        <p id="discard-dialog-description" className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Are you sure you want to close? Unsaved changes will be lost.
        </p>
        <div className="mt-3 flex flex-col-reverse gap-2 sm:mt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:h-10 sm:w-auto"
            onClick={onStay}
          >
            Stay
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full sm:h-10 sm:w-auto"
            onClick={onDiscard}
          >
            Discard
          </Button>
        </div>
      </div>
    </div>
  )
}

function DialogContent({ className, children, showCloseButton = true }) {
  const { open, discardOpen, setDiscardOpen, requestClose, forceClose } = useDialogContext()

  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (discardOpen) {
        setDiscardOpen(false)
        return
      }
      requestClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, discardOpen, setDiscardOpen, requestClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 lg:p-6">
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
      <div
        className={cn(
          // Phone: bottom sheet · sm+: centered card · xl: capped width (not full 32" stretch)
          'relative z-10 w-full max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-2xl border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg',
          'sm:max-h-[90dvh] sm:max-w-lg sm:rounded-xl sm:p-6 sm:pb-6',
          'md:max-w-xl',
          className,
        )}
      >
        {showCloseButton ? (
          <button
            type="button"
            className="absolute right-2.5 top-2.5 z-10 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer sm:right-3 sm:top-3 sm:p-1.5"
            aria-label="Close"
            onClick={() => {
              if (discardOpen) {
                setDiscardOpen(false)
                return
              }
              requestClose()
            }}
          >
            <X className="size-4" />
          </button>
        ) : null}

        {children}

        {discardOpen ? (
          <DiscardChangesPrompt
            onStay={() => setDiscardOpen(false)}
            onDiscard={() => forceClose()}
          />
        ) : null}
      </div>
    </div>
  )
}

function DialogHeader({ className, ...props }) {
  return <div className={cn('mb-4 space-y-1 pr-8', className)} {...props} />
}

function DialogTitle({ className, ...props }) {
  return <h2 className={cn('text-base font-semibold break-words sm:text-lg', className)} {...props} />
}

function DialogDescription({ className, ...props }) {
  return <p className={cn('text-xs text-muted-foreground sm:text-sm', className)} {...props} />
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        'mt-4 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2.5',
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogCancelButton,
}
