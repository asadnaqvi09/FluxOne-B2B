export const ok = (data) => ({ success: true, data })

// Optional meta: status, retryAfterSec (e.g. login lockout / rate limit)
export const fail = (error, meta = {}) => ({
  success: false,
  error: String(error || 'Request failed'),
  ...meta,
})

export function unwrap(result) {
  if (!result?.success) {
    throw new Error(result?.error || 'Request failed')
  }
  return result.data
}
