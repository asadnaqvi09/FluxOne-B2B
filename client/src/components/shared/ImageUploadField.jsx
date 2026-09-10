import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  IMAGE_ACCEPT,
  imageFileNameFromUrl,
  imageUploadHint,
  validateImageFile,
} from '@/lib/imageUpload'
import { toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'

// Image file picker with preview + filename for existing URLs and new selections.
// Browsers cannot pre-fill <input type="file"> — we show the current image separately.
export function ImageUploadField({
  id,
  label,
  value = null,
  existingImageUrl = null,
  onChange,
  error = null,
  className,
  optionalLabel,
}) {
  const [inputKey, setInputKey] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return undefined
    }
    const objectUrl = URL.createObjectURL(value)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [value])

  const displayUrl = previewUrl || existingImageUrl || null
  const displayName = value?.name || (existingImageUrl ? imageFileNameFromUrl(existingImageUrl) : '')
  const statusLabel = value
    ? 'New image — replaces current on save'
    : existingImageUrl
      ? 'Current image'
      : null

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null
    const validationError = validateImageFile(file)
    if (validationError) {
      toastError(validationError)
      event.target.value = ''
      onChange?.(null)
      setInputKey((key) => key + 1)
      return
    }
    onChange?.(file)
  }

  function clearSelection() {
    onChange?.(null)
    setInputKey((key) => key + 1)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <Label htmlFor={id}>
          {label}
          {optionalLabel ? (
            <span className="font-normal text-slate-400"> {optionalLabel}</span>
          ) : null}
        </Label>
      ) : null}

      {displayUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-slate-50 px-3 py-2.5">
          <img
            src={displayUrl}
            alt=""
            className="size-12 shrink-0 rounded-md border border-white object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800" title={displayName}>
              {displayName || 'image'}
            </p>
            {statusLabel ? <p className="text-[11px] text-slate-500">{statusLabel}</p> : null}
          </div>
          {value ? (
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-800"
              onClick={clearSelection}
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}

      <Input
        key={inputKey}
        id={id}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleFileChange}
      />
      <p className="text-[11px] text-slate-400">{imageUploadHint()}</p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
