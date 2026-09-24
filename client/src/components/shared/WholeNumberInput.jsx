import { Input } from '@/components/ui/input'
import {
  normalizeWholeNumber,
  sanitizeWholeNumberInput,
} from '@/lib/wholeNumber'
import { cn } from '@/lib/utils'

/**
 * Number input that only accepts whole units (1, 2, 10) — never 1.001 / 0.01.
 * Spinner step is always 1. Use for stock qty, prices, percents, scores, etc.
 */
export function WholeNumberInput({
  value,
  onChange,
  onBlur,
  min = 0,
  max,
  allowNegative = false,
  allowEmpty = true,
  className,
  ...props
}) {
  const handleChange = (event) => {
    const cleaned = sanitizeWholeNumberInput(event.target.value, { allowNegative })
    onChange?.({
      ...event,
      target: { ...event.target, value: cleaned },
    })
  }

  const handleBlur = (event) => {
    const next = normalizeWholeNumber(event.target.value, {
      min,
      max: max != null ? Number(max) : null,
      allowNegative,
      emptyAs: allowEmpty ? '' : min,
    })
    const asString = next === '' ? '' : String(next)
    if (asString !== String(value ?? '')) {
      onChange?.({
        ...event,
        target: { ...event.target, value: asString },
      })
    }
    onBlur?.(event)
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      step={1}
      min={allowNegative ? undefined : min}
      max={max}
      value={value ?? ''}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(className)}
      {...props}
    />
  )
}

export default WholeNumberInput
