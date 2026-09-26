import { useId, useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * Accessible radio group with roving tabindex.
 * variant "list": classic radios with labels · "cards": bordered selectable tiles.
 * options: [{ value, label, description?, icon?, disabled? }]
 */
export function RadioGroup({ label, value, onChange, options, variant = 'list', columns = 1, className, disabled }) {
  const labelId = useId()
  const refs = useRef([])
  const enabled = options.filter((option) => !option.disabled && !disabled)

  const handleKeyDown = (event, index) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }
    if (!(event.key in keys)) return
    event.preventDefault()
    const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    let direction = keys[event.key]
    if (isRtl && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) direction *= -1
    const currentEnabledIndex = enabled.indexOf(options[index])
    const next = enabled[(currentEnabledIndex + direction + enabled.length) % enabled.length]
    if (!next) return
    onChange(next.value)
    refs.current[options.indexOf(next)]?.focus()
  }

  const hasSelection = options.some((option) => option.value === value)

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
        className={cn(variant === 'cards' ? 'grid gap-2' : 'flex flex-col gap-2.5')}
        style={variant === 'cards' ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((option, index) => {
          const checked = option.value === value
          const isDisabled = disabled || option.disabled
          const tabbable = checked || (!hasSelection && index === 0)
          const Icon = option.icon
          return (
            <button
              key={String(option.value)}
              ref={(node) => (refs.current[index] = node)}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={isDisabled}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'text-start outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                variant === 'cards'
                  ? cn(
                      'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors duration-[var(--duration-fast)]',
                      checked ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2',
                    )
                  : 'flex items-start gap-2.5 rounded-sm',
              )}
            >
              {variant === 'list' && (
                <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border', checked ? 'border-primary' : 'border-border-strong')}>
                  {checked && <span className="size-2 rounded-full bg-primary" />}
                </span>
              )}
              {Icon && <Icon size={16} className={cn('mt-0.5 shrink-0', checked ? 'text-primary-soft-fg' : 'text-muted')} aria-hidden="true" />}
              <span className="min-w-0">
                <span className={cn('block text-[13px] font-medium', checked && variant === 'cards' ? 'text-primary-soft-fg' : 'text-text')}>{option.label}</span>
                {option.description && <span className="mt-0.5 block text-xs text-muted">{option.description}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
