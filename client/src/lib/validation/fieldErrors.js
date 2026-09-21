// Shared field-level validation UX (QA tc-07q pattern).
// Use with FieldError + useFieldErrors across Inventory / Branch / Admin forms.

export function fieldErrorClass(hasError) {
  return hasError ? 'border-red-500 focus-visible:ring-red-500' : ''
}

export function firstErrorKey(errors = {}, order = []) {
  if (Array.isArray(order) && order.length) {
    const found = order.find((key) => errors[key])
    if (found) return found
  }
  const keys = Object.keys(errors || {})
  return keys.length ? keys[0] : null
}

export function firstValidationMessage(errors = {}, order = []) {
  const key = firstErrorKey(errors, order)
  return key ? errors[key] : null
}

export function clearFieldError(prev, field) {
  if (!prev?.[field]) return prev || {}
  const next = { ...prev }
  delete next[field]
  return next
}

export function focusFieldById(elementId) {
  if (!elementId) return
  requestAnimationFrame(() => {
    const el = document.getElementById(elementId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (typeof el.focus === 'function') {
      try {
        el.focus({ preventScroll: true })
      } catch {
        el.focus()
      }
    }
  })
}

// fieldIds: { fieldKey: 'dom-element-id' }
export function focusFirstInvalid(errors, fieldIds = {}, order = []) {
  const key = firstErrorKey(errors, order)
  if (!key) return null
  focusFieldById(fieldIds[key] || key)
  return key
}

export const DEFAULT_FORM_ERROR = 'Please fix the highlighted fields before continuing.'
