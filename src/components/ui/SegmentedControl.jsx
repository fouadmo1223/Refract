import { useId, useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * Compact single-choice control (radiogroup semantics) for short option sets
 * like presets, aspect ratios or formats.
 * options: [{ value, label, icon?, disabled?, title? }]
 */
export function SegmentedControl({ label, value, onChange, options, size = 'md', className, fullWidth = true, wrap = false, disabled }) {
  const labelId = useId()
  const refs = useRef([])

  const handleKeyDown = (event, index) => {
    const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight'
    const back = isRtl ? 'ArrowRight' : 'ArrowLeft'
    if (event.key !== forward && event.key !== back) return
    event.preventDefault()
    const direction = event.key === forward ? 1 : -1
    let next = index
    for (let step = 0; step < options.length; step += 1) {
      next = (next + direction + options.length) % options.length
      if (!options[next].disabled) break
    }
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <span id={labelId} className="text-[13px] font-medium text-text">
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        className={cn(
          'rounded-md bg-surface-2 p-0.5 ring-1 ring-inset ring-border',
          wrap ? 'flex flex-wrap gap-0.5' : 'flex',
          fullWidth ? 'w-full' : 'w-fit',
        )}
      >
        {options.map((option, index) => {
          const checked = option.value === value
          const Icon = option.icon
          return (
            <button
              key={String(option.value)}
              ref={(node) => (refs.current[index] = node)}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.ariaLabel}
              title={option.title}
              tabIndex={checked || (value == null && index === 0) ? 0 : -1}
              disabled={disabled || option.disabled}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] font-medium outline-none',
                'transition-[background-color,color,box-shadow] duration-[var(--duration-fast)] focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-40',
                size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-[13px]',
                checked ? 'bg-surface text-text shadow-sm ring-1 ring-border' : 'text-muted hover:text-text',
              )}
            >
              {Icon && <Icon size={size === 'sm' ? 13 : 14} aria-hidden="true" />}
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
