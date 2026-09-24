// Universal Form Validators & Input Formatters for FluxOne B2B
// Provides strict validation and real-time input sanitization for Phone, Email, URLs, and Numbers.

// Phone Validation: 10 to 13 digits, optional leading +, typical format 03XXXXXXXXX or +923XXXXXXXXX
export const PHONE_REGEX = /^(?:\+92|0)?3[0-9]{9}$/
export const GENERAL_PHONE_REGEX = /^\+?[0-9]{10,13}$/

// Standard RFC-compliant Email Regex
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// URL Regex (http / https)
export const URL_REGEX = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/i

// Real-time filter that only allows digits and an optional leading plus '+'
// Automatically limits length to 11 digits (or 13 if starts with +92)
export function sanitizePhoneInput(value) {
  if (!value) return ''
  let cleaned = value.replace(/[^\d+]/g, '')
  // Only allow + at the very beginning
  if (cleaned.indexOf('+') > 0) {
    cleaned = cleaned[0] + cleaned.slice(1).replace(/\+/g, '')
  }
  // If starts with +, limit to 13 chars (+923001234567), otherwise 11 digits (03001234567)
  const maxLen = cleaned.startsWith('+') ? 13 : 11
  return cleaned.slice(0, maxLen)
}

// Validates a phone / mobile contact number
export function validatePhone(phone, { required = true, fieldName = 'Phone number' } = {}) {
  const trimmed = (phone || '').trim()
  if (!trimmed) {
    if (required) return `${fieldName} is required`
    return null
  }

  // Remove spaces, dashes, parentheses
  const cleaned = trimmed.replace(/[\s()-]/g, '')
  
  if (/[a-zA-Z]/.test(cleaned)) {
    return `${fieldName} must contain digits only (no alphabets)`
  }

  if (cleaned.startsWith('+92')) {
    const digits = cleaned.slice(3)
    if (digits.length !== 10) {
      return `${fieldName} must be exactly 10 digits after +92 (e.g. +923001234567)`
    }
  } else if (cleaned.startsWith('03')) {
    if (cleaned.length !== 11) {
      return `${fieldName} must be exactly 11 digits (e.g. 03001234567)`
    }
  } else if (cleaned.startsWith('+')) {
    if (cleaned.length < 9 || cleaned.length > 16) {
      return `${fieldName} must be a valid international phone number with country code (e.g. +923001234567)`
    }
  } else {
    const digits = cleaned.replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) {
      return `${fieldName} must be a valid phone number`
    }
  }

  return null
}

// Validates an email address
export function validateEmail(email, { required = true, fieldName = 'Email' } = {}) {
  const trimmed = (email || '').trim()
  if (!trimmed) {
    if (required) return `${fieldName} is required`
    return null
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return `Please enter a valid ${fieldName.toLowerCase()} (e.g. manager@branch.com)`
  }

  return null
}

// Validates a web URL (Facebook, Instagram, website)
export function validateUrl(url, { required = false, fieldName = 'URL' } = {}) {
  const trimmed = (url || '').trim()
  if (!trimmed) {
    if (required) return `${fieldName} is required`
    return null
  }

  if (!URL_REGEX.test(trimmed)) {
    return `Please enter a valid ${fieldName.toLowerCase()} (e.g. https://facebook.com/company)`
  }

  return null
}

// Validates numeric range percentage (whole numbers only)
export function validatePercentage(val, { min = 0, max = 100, fieldName = 'Percentage' } = {}) {
  const num = Number(val)
  if (isNaN(num)) return `${fieldName} must be a valid number`
  if (!Number.isInteger(num)) return `${fieldName} must be a whole number`
  if (num < min || num > max) return `${fieldName} must be between ${min}% and ${max}%`
  return null
}
