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

/** Stable id so the same message cannot stack while still visible (QA TC-Multiple notification-003). */
function resolveToastId(type, message, customId) {
  if (customId != null && customId !== '') return customId
  return `${type}:${String(message)}`
}

function showToast(type, message, options = {}) {
  if (!message) return undefined
  const { toastId: customId, ...rest } = options
  const toastId = resolveToastId(type, message, customId)

  // Skip if an identical toast is already on screen.
  if (toast.isActive(toastId)) return toastId

  const payload = {
    ...base,
    ...rest,
    toastId,
  }

  if (type === 'success') {
    return toast.success(String(message), {
      ...payload,
      style: { borderLeft: `4px solid ${BRAND.purple}`, ...(rest.style || {}) },
    })
  }
  if (type === 'error') {
    return toast.error(String(message), {
      ...payload,
      autoClose: rest.autoClose ?? 4000,
    })
  }
  return toast.info(String(message), payload)
}

export function toastSuccess(message, options = {}) {
  return showToast('success', message, options)
}

export function toastError(message, options = {}) {
  return showToast('error', message, options)
}

export function toastInfo(message, options = {}) {
  return showToast('info', message, options)
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
