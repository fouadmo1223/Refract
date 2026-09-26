import { useMemo } from 'react'

/**
 * Validate settings against a zod schema. Returns field errors as translation
 * keys (zod messages in schemas are i18n keys) plus an `isValid` flag.
 */
export function useValidation(schema, values) {
  return useMemo(() => {
    if (!schema) return { errors: {}, isValid: true }
    const result = schema.safeParse(values)
    if (result.success) return { errors: {}, isValid: true }
    const errors = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_form'
      if (!errors[key]) errors[key] = issue.message
    }
    return { errors, isValid: false }
  }, [schema, values])
}
