import { z } from 'zod'
import { MAX_CANVAS_DIMENSION } from '@/constants/fileConstraints'

/**
 * Shared zod validators. Messages are translation keys so field errors
 * render in the active language.
 */
export const qualitySchema = z
  .number({ error: 'validation.qualityRange' })
  .int('validation.qualityRange')
  .min(1, 'validation.qualityRange')
  .max(100, 'validation.qualityRange')

export const dimensionSchema = (key = 'width') =>
  z
    .number({ error: `validation.${key}Required` })
    .refine((value) => Number.isFinite(value), `validation.${key}Required`)
    .refine((value) => value > 0, `validation.${key}Positive`)
    .refine((value) => Number.isInteger(value), 'validation.wholeNumber')
    .refine((value) => value <= MAX_CANVAS_DIMENSION, 'validation.dimensionTooLarge')

/**
 * Validate `field` with `fieldSchema` only when `flag` is on
 * (e.g. max dimension only matters when "Limit dimensions" is enabled).
 */
export function refineWhen(flag, field, fieldSchema) {
  return (values, ctx) => {
    if (!values[flag]) return
    const result = fieldSchema.safeParse(values[field])
    if (!result.success) ctx.addIssue({ code: 'custom', path: [field], message: result.error.issues[0].message })
  }
}
