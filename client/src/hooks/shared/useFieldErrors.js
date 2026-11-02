import { useCallback, useState } from 'react'
import {
  clearFieldError,
  DEFAULT_FORM_ERROR,
  focusFirstInvalid,
} from '@/lib/validation/fieldErrors'

// use reusable field-error UX across form dialogs
export function useFieldErrors() {
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const resetErrors = useCallback(() => {
    setFieldErrors({})
    setFormError(null)
  }, [])

  const clearField = useCallback((field) => {
    setFieldErrors((prev) => clearFieldError(prev, field))
    setFormError(null)
  }, [])

  // Apply map of field → message, focus first invalid, keep dialog open
  const applyErrors = useCallback((errors, fieldIds = {}, order = []) => {
    const next = errors && typeof errors === 'object' ? errors : {}
    setFieldErrors(next)
    setFormError(DEFAULT_FORM_ERROR)
    focusFirstInvalid(next, fieldIds, order)
    return false
  }, [])

  return {
    fieldErrors,
    formError,
    setFormError,
    setFieldErrors,
    resetErrors,
    clearField,
    applyErrors,
  }
}

export default useFieldErrors
