import { useId } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Checkbox({ checked, indeterminate = false, onChange, label, description, disabled, className }) {
  const id = useId()
  const state = indeterminate ? 'mixed' : checked
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={state}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'mt-px flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50',
          checked || indeterminate ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong bg-surface hover:border-muted',
        )}
      >
        {indeterminate ? <Minus size={12} strokeWidth={3} aria-hidden="true" /> : checked ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
      </button>
      {(label || description) && (
        <label htmlFor={id} className={cn('min-w-0 select-none', disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer')}>
          {label && <span className="block text-[13px] font-medium leading-5 text-text">{label}</span>}
          {description && <span className="block text-xs text-muted">{description}</span>}
        </label>
      )}
    </div>
  )
}
