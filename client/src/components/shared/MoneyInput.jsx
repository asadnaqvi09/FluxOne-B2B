import { Input } from '@/components/ui/input'
import {
  formatMoneyInput,
  normalizeMoneyInput,
  sanitizeMoneyInput,
} from '@/lib/money'
import { cn } from '@/lib/utils'

// Number input for currency — up to 2 decimal places (matches NUMERIC(12,2)).
export function MoneyInput({
  value,
  onChange,
  onBlur,
  min = 0,
  max,
  allowEmpty = true,
  className,
  ...props
}) {
  const handleChange = (event) => {
    const cleaned = sanitizeMoneyInput(event.target.value)
    onChange?.({
      ...event,
      target: { ...event.target, value: cleaned },
    })
  }

  const handleBlur = (event) => {
    const next = normalizeMoneyInput(event.target.value, {
      min,
      max: max != null ? Number(max) : null,
      allowEmpty,
      emptyAs: allowEmpty ? '' : formatMoneyInput(min),
    })
    if (next !== String(value ?? '')) {
      onChange?.({
        ...event,
        target: { ...event.target, value: next },
      })
    }
    onBlur?.(event)
  }

  return (
    <Input
      type="number"
      inputMode="decimal"
      step={0.01}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(className)}
      {...props}
    />
  )
}

export default MoneyInput
