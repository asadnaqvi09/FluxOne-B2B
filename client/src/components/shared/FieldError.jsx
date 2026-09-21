import { cn } from '@/lib/utils'

// Inline field error under inputs / selects
export function FieldError({ message, className }) {
  if (!message) return null
  return <p className={cn('text-xs font-medium text-red-600', className)}>{message}</p>
}

export default FieldError
