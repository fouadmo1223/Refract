import { useId } from 'react'
import { cn } from '@/lib/cn'

export function Switch({ checked, onChange, label, description, disabled, className, size = 'md' }) {
  const id = useId()
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      {(label || description) && (
        <label htmlFor={id} className={cn('min-w-0 flex-1', disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer')}>
          {label && <span className="block text-[13px] font-medium text-text">{label}</span>}
          {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-[var(--duration-base)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50',
          size === 'sm' ? 'h-4 w-7' : 'h-5 w-9',
          checked ? 'bg-primary' : 'bg-surface-3 ring-1 ring-inset ring-border-strong',
        )}
      >
        <span
          className={cn(
            'inline-block rounded-full bg-white shadow-sm transition-transform duration-[var(--duration-base)] ease-[var(--ease-soft)]',
            size === 'sm' ? 'size-3' : 'size-4',
            checked
              ? size === 'sm'
                ? 'translate-x-3.5 rtl:-translate-x-3.5'
                : 'translate-x-[18px] rtl:-translate-x-[18px]'
              : 'translate-x-0.5 rtl:-translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
