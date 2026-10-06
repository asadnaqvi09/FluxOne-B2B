import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'
import {
  downloadControlTemplate,
  parseControlCsv,
} from '@/lib/controlCsv'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const TAB_LABEL = {
  in: 'Stock In',
  adjustment: 'Adjustment',
  damaged: 'Damaged',
  other: 'Others',
}

// Import Control movements for the active tab (movement-specific CSV).
export function ImportControlDialog({
  open,
  onOpenChange,
  movementType,
  loading = false,
  onSubmit,
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef(null)
  const { captureBaseline, isDirty } = useFormBaseline(open)
  const label = TAB_LABEL[movementType] || 'movements'

  useEffect(() => {
    if (!open) return
    setText('')
    setFileName('')
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
    captureBaseline({ text: '', fileName: '' })
  }, [open, captureBaseline])

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result || ''))
    }
    reader.onerror = () => setError('Could not read CSV file')
    reader.readAsText(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const rows = parseControlCsv(text)
    if (!rows.length) {
      setError('No valid rows. Download the template and fill itemCode/barcode + quantity.')
      return
    }
    setError(null)
    try {
      const result = await onSubmit?.(rows)
      if (result?.success) {
        setText('')
        setFileName('')
        if (fileRef.current) fileRef.current.value = ''
        onOpenChange?.(false)
      } else {
        setError(result?.error || 'Import failed. Please try again.')
      }
    } catch (err) {
      setError(err?.message || 'Import failed. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty({ text, fileName })}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import {label} (CSV)</DialogTitle>
          <DialogDescription>
            Upload a movement CSV for this tab. Use Variant Type / Value columns when the same
            item code has multiple variants. Valid rows are applied; invalid rows are reported.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadControlTemplate(movementType)}
            >
              Download template
            </Button>
            <Label className="cursor-pointer">
              <span
                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium"
                style={{ color: BRAND.deep }}
              >
                Choose file
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={handleFileChange}
              />
            </Label>
            {fileName ? (
              <span className="text-xs text-slate-500">{fileName}</span>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="control-import-text">Or paste CSV</Label>
            <Textarea
              id="control-import-text"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="itemCode,barcode,quantity,scale,reason,..."
              className="font-mono text-xs"
            />
          </div>

          <DialogFooter>
            <DialogCancelButton disabled={loading} />
            <Button
              type="submit"
              className="text-white"
              style={{ background: BRAND.purple }}
              disabled={loading || !text.trim()}
            >
              {loading ? 'Importing…' : 'Import CSV'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
