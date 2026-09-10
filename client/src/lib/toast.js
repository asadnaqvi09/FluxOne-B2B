import { toast } from 'react-toastify'
import { BRAND } from '@/lib/constants'

const base = {
  position: 'top-right',
  autoClose: 2800,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
}

export function toastSuccess(message, options = {}) {
  if (!message) return
  return toast.success(String(message), {
    ...base,
    style: { borderLeft: `4px solid ${BRAND.purple}` },
    ...options,
  })
}

export function toastError(message, options = {}) {
  if (!message) return
  return toast.error(String(message), {
    ...base,
    autoClose: 4000,
    ...options,
  })
}

export function toastInfo(message, options = {}) {
  if (!message) return
  return toast.info(String(message), { ...base, ...options })
}

// Convenience: show success or error from an apiClient-style result.
export function toastFromResult(result, successMessage) {
  if (result?.success) {
    if (successMessage) toastSuccess(successMessage)
    return true
  }
  toastError(result?.error || 'Something went wrong')
  return false
}
