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
  downloadTextFile,
  parseProductsCsv,
  productCsvTemplate,
} from '@/lib/productCsv'
import { useFormBaseline } from '@/hooks/useFormBaseline'

// Import products from CSV file or pasted text (same columns as Export).
export function ImportItemsDialog({ open, onOpenChange, loading = false, onSubmit }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef(null)
  const { captureBaseline, isDirty } = useFormBaseline(open)

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

  function handleDownloadTemplate() {
    downloadTextFile('fluxone-products-template.csv', productCsvTemplate())
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const rows = parseProductsCsv(text)
    if (!rows.length) {
      setError(
        'No valid rows. Use headers: itemCode,name,barcode,type,scale,status,purchasePrice,sellingPrice,quantity',
      )
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
          <DialogTitle>Import products (CSV)</DialogTitle>
          <DialogDescription>
            Upload a CSV or paste rows. Same format as Export — download the template to get started.
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
              className="cursor-pointer"
              onClick={handleDownloadTemplate}
            >
              Download template
            </Button>
            <Label
              htmlFor="import-csv-file"
              className="inline-flex cursor-pointer items-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Choose CSV file
            </Label>
            <input
              ref={fileRef}
              id="import-csv-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFileChange}
            />
            {fileName ? (
              <span className="text-xs text-slate-500">{fileName}</span>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="import-rows">CSV content</Label>
            <Textarea
              id="import-rows"
              className="min-h-40 font-mono text-xs"
              placeholder={
                'itemCode,name,barcode,type,scale,status,purchasePrice,sellingPrice,quantity\nBEV-001,Cola 1.5L,890123,single,unit,active,80,120,48'
              }
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setFileName('')
              }}
            />
          </div>
          <DialogFooter>
            <DialogCancelButton className="cursor-pointer" />
            <Button
              type="submit"
              className="cursor-pointer text-white"
              style={{ background: BRAND.purple }}
              disabled={loading}
            >
              {loading ? 'Importing…' : 'Import CSV'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
