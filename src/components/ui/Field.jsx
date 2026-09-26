import { useId } from 'react'
import { CircleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/**
 * Wraps a control with label, optional description, error and trailing hint.
 * Render prop receives the ids needed for accessible wiring.
 *
 * `error` may be a translation key (as produced by zod schemas) or plain text.
 */
export function Field({ label, description, error, hint, required, className, labelAction, children, id: providedId }) {
  const { t } = useTranslation()
  const generatedId = useId()
  const id = providedId ?? generatedId
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || hint || labelAction) && (
        <div className="flex min-h-5 items-center justify-between gap-3">
          {label && (
            <label htmlFor={id} className="text-[13px] font-medium text-text">
              {label}
              {required && <span className="ms-0.5 text-danger" aria-hidden="true">*</span>}
            </label>
          )}
          {hint && <span className="tabular text-xs text-muted">{hint}</span>}
          {labelAction}
        </div>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {description && !error && (
        <p id={descriptionId} className="text-xs leading-relaxed text-muted">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-danger">
          <CircleAlert size={13} className="mt-px shrink-0" aria-hidden="true" />
          {t(error, { defaultValue: error })}
        </p>
      )}
    </div>
  )
}
