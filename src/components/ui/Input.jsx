import { forwardRef } from 'react'
import { cn } from '@/lib/cn'
import { Field } from './Field'

export const controlShell = (invalid, disabled) =>
  cn(
    'group/control flex h-9 w-full items-center rounded-md border bg-surface text-sm text-text shadow-xs',
    'transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
    'focus-within:border-primary focus-within:ring-3 focus-within:ring-ring',
    invalid ? 'border-danger focus-within:border-danger focus-within:ring-danger/20' : 'border-border hover:border-border-strong',
    disabled && 'pointer-events-none opacity-55 bg-surface-2',
  )

/** Text input with label, description, error, prefix and suffix support. */
export const Input = forwardRef(function Input(
  { label, description, error, hint, required, prefix, suffix, className, inputClassName, disabled, id, labelAction, ...props },
  ref,
) {
  return (
    <Field label={label} description={description} error={error} hint={hint} required={required} className={className} id={id} labelAction={labelAction}>
      {({ id: fieldId, describedBy, invalid }) => (
        <div className={controlShell(invalid, disabled)}>
          {prefix && <span className="flex shrink-0 items-center ps-3 text-muted">{prefix}</span>}
          <input
            ref={ref}
            id={fieldId}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            required={required}
            className={cn('h-full w-full min-w-0 bg-transparent px-3 outline-none placeholder:text-faint', prefix && 'ps-2', suffix && 'pe-2', inputClassName)}
            {...props}
          />
          {suffix && <span className="flex shrink-0 items-center pe-3 text-xs text-muted">{suffix}</span>}
        </div>
      )}
    </Field>
  )
})
