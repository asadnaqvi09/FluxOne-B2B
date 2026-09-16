import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const COUNTRY_CODES = [
  { code: '+92', iso: 'PK', name: 'Pakistan', flag: '🇵🇰', maxLen: 10, placeholder: '3001234567' },
  { code: '+1', iso: 'US', name: 'United States', flag: '🇺🇸', maxLen: 10, placeholder: '2025550123' },
  { code: '+44', iso: 'GB', name: 'United Kingdom', flag: '🇬🇧', maxLen: 10, placeholder: '7911123456' },
  { code: '+971', iso: 'AE', name: 'UAE', flag: '🇦🇪', maxLen: 9, placeholder: '501234567' },
  { code: '+966', iso: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', maxLen: 9, placeholder: '512345678' },
  { code: '+91', iso: 'IN', name: 'India', flag: '🇮🇳', maxLen: 10, placeholder: '9876543210' },
  { code: '+1', iso: 'CA', name: 'Canada', flag: '🇨🇦', maxLen: 10, placeholder: '4165550123' },
  { code: '+61', iso: 'AU', name: 'Australia', flag: '🇦🇺', maxLen: 9, placeholder: '412345678' },
  { code: '+86', iso: 'CN', name: 'China', flag: '🇨🇳', maxLen: 11, placeholder: '13800138000' },
  { code: '+49', iso: 'DE', name: 'Germany', flag: '🇩🇪', maxLen: 11, placeholder: '15123456789' },
  { code: '+33', iso: 'FR', name: 'France', flag: '🇫🇷', maxLen: 9, placeholder: '612345678' },
  { code: '+90', iso: 'TR', name: 'Turkey', flag: '🇹🇷', maxLen: 10, placeholder: '5321234567' },
  { code: '+60', iso: 'MY', name: 'Malaysia', flag: '🇲🇾', maxLen: 10, placeholder: '123456789' },
  { code: '+968', iso: 'OM', name: 'Oman', flag: '🇴🇲', maxLen: 8, placeholder: '91234567' },
  { code: '+974', iso: 'QA', name: 'Qatar', flag: '🇶🇦', maxLen: 8, placeholder: '33123456' },
  { code: '+965', iso: 'KW', name: 'Kuwait', flag: '🇰🇼', maxLen: 8, placeholder: '51234567' },
  { code: '+973', iso: 'BH', name: 'Bahrain', flag: '🇧🇭', maxLen: 8, placeholder: '36123456' },
]

export function parsePhoneNumber(rawVal) {
  if (!rawVal) return { countryCode: '+92', nationalNumber: '' }
  const str = String(rawVal).trim().replace(/[\s()-]/g, '')
  if (!str) return { countryCode: '+92', nationalNumber: '' }

  // Check if starts with a known country code (+92, +971, +1, etc.)
  if (str.startsWith('+')) {
    // Sort descending by code length so +971 matches before +9
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
    for (const c of sorted) {
      if (str.startsWith(c.code)) {
        const remaining = str.slice(c.code.length).replace(/\D/g, '')
        return { countryCode: c.code, nationalNumber: remaining.slice(0, c.maxLen) }
      }
    }
    // Fallback if +xxx not found in preset
    const match = str.match(/^(\+\d{1,4})(\d*)$/)
    if (match) {
      return { countryCode: match[1], nationalNumber: match[2].slice(0, 15) }
    }
  }

  // If starts with 00 (e.g. 00923001234567)
  if (str.startsWith('00')) {
    return parsePhoneNumber('+' + str.slice(2))
  }

  // If starts with 03 (Pakistan national format 03XXXXXXXXX)
  if (str.startsWith('03')) {
    const digits = str.replace(/\D/g, '')
    return { countryCode: '+92', nationalNumber: digits.slice(1, 11) }
  }

  // If starts with 92 and 12 digits (923001234567)
  if (str.startsWith('92') && str.length >= 11) {
    const digits = str.replace(/\D/g, '')
    return { countryCode: '+92', nationalNumber: digits.slice(2, 12) }
  }

  // Plain digits without prefix
  const digits = str.replace(/\D/g, '')
  return { countryCode: '+92', nationalNumber: digits.slice(0, 10) }
}

export function PhoneInput({
  value = '',
  onChange,
  id,
  name,
  placeholder,
  required = false,
  disabled = false,
  className,
  ...props
}) {
  const { countryCode, nationalNumber } = useMemo(() => parsePhoneNumber(value), [value])

  const selectedCountry = useMemo(() => {
    return (
      COUNTRY_CODES.find((c) => c.code === countryCode) || {
        code: countryCode,
        iso: 'OTHER',
        name: 'Other',
        flag: '🌐',
        maxLen: 15,
        placeholder: '1234567890',
      }
    )
  }, [countryCode])

  function handleCountryChange(e) {
    const newCode = e.target.value
    const newCountry = COUNTRY_CODES.find((c) => c.code === newCode) || { maxLen: 15 }
    const trimmedNumber = nationalNumber.slice(0, newCountry.maxLen)
    if (onChange) {
      onChange(trimmedNumber ? `${newCode}${trimmedNumber}` : '')
    }
  }

  function handleNumberChange(e) {
    let raw = e.target.value

    // If pasted full international number with + or 00
    if (raw.startsWith('+') || raw.startsWith('00')) {
      const parsed = parsePhoneNumber(raw)
      if (onChange) {
        onChange(parsed.nationalNumber ? `${parsed.countryCode}${parsed.nationalNumber}` : '')
      }
      return
    }

    // Strip non-digits
    let digits = raw.replace(/\D/g, '')

    // If user starts with 0 (e.g. typing 0300... for Pakistan), strip the leading 0
    if (digits.startsWith('0') && (countryCode === '+92' || countryCode === '+44' || countryCode === '+971' || countryCode === '+966')) {
      digits = digits.replace(/^0+/, '')
    }

    // Limit to max length for current country
    digits = digits.slice(0, selectedCountry.maxLen)

    if (onChange) {
      onChange(digits ? `${countryCode}${digits}` : '')
    }
  }

  return (
    <div
      className={cn(
        'group relative flex h-10 w-full items-center rounded-md border border-input bg-background text-sm ring-offset-background transition-colors focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 focus-within:outline-none',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {/* Compact Country Code Trigger with Native Select Overlay */}
      <div className="relative flex h-full w-[86px] shrink-0 items-center justify-between border-r border-input bg-slate-50/80 px-2.5 hover:bg-slate-100 transition-colors rounded-l-md">
        <div className="flex items-center gap-1 min-w-0 pointer-events-none">
          <span className="text-base leading-none shrink-0">{selectedCountry.flag}</span>
          <span className="text-xs sm:text-sm font-semibold text-slate-800 shrink-0">{selectedCountry.code}</span>
        </div>
        <ChevronDown className="pointer-events-none size-3.5 shrink-0 text-slate-400" />
        
        <select
          value={selectedCountry.code}
          onChange={handleCountryChange}
          disabled={disabled}
          aria-label="Country Code"
          title={`${selectedCountry.name} (${selectedCountry.code})`}
          className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={`${c.iso}-${c.code}`} value={c.code}>
              {c.flag} {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* Full-width National Number Text Input */}
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        value={nationalNumber}
        onChange={handleNumberChange}
        placeholder={placeholder || selectedCountry.placeholder}
        disabled={disabled}
        required={required}
        className="h-full flex-1 min-w-0 bg-transparent px-3 py-2 text-xs sm:text-sm outline-none placeholder:text-slate-400 text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
    </div>
  )
}

export default PhoneInput
