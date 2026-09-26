import { forwardRef } from 'react'
import { cn } from '@/lib/cn'
import { Field } from './Field'

export const Textarea = forwardRef(function Textarea(
  { label, description, error, hint, required, className, textareaClassName, disabled, id, labelAction, ...props },
  ref,
) {
  return (
    <Field label={label} description={description} error={error} hint={hint} required={required} className={className} id={id} labelAction={labelAction}>
      {({ id: fieldId, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={fieldId}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-24 w-full resize-y rounded-md border bg-surface px-3 py-2 text-sm text-text shadow-xs outline-none placeholder:text-faint',
            'transition-[border-color,box-shadow] focus:border-primary focus:ring-3 focus:ring-ring',
            invalid ? 'border-danger' : 'border-border hover:border-border-strong',
            disabled && 'opacity-55',
            textareaClassName,
          )}
          {...props}
        />
      )}
    </Field>
  )
})
