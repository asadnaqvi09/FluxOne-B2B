import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Checkbox = forwardRef(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn('h-4 w-4 rounded border-input text-primary accent-primary', className)}
      {...props}
    />
  )
})

export { Checkbox }
