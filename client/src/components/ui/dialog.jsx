import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const DialogContext = createContext(null)

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
      className={className}
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
    <div className="absolute inset-0 z-20 flex items-end justify-center rounded-t-2xl bg-black/40 p-4 sm:items-center sm:rounded-xl">
      <div
        className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-lg"
        role="alertdialog"
        aria-labelledby="discard-dialog-title"
        aria-describedby="discard-dialog-description"
      >
        <h3 id="discard-dialog-title" className="text-base font-semibold">
          Discard changes?
        </h3>
        <p id="discard-dialog-description" className="mt-1 text-sm text-muted-foreground">
          Are you sure you want to close? Unsaved changes will be lost.
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onStay}>
            Stay
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
      />
      <div
        className={cn(
          'relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border bg-card p-4 shadow-lg sm:max-h-[90dvh] sm:max-w-lg sm:rounded-xl sm:p-6',
          className,
        )}
      >
        {showCloseButton ? (
          <button
            type="button"
            className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
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
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

function DialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
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
