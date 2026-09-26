import { useId, useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * Tabs with roving focus and direction-aware arrow keys.
 * Render panels yourself with `getPanelProps(value)` for correct ARIA wiring.
 * tabs: [{ value, label, icon?, count? }]
 */
export function Tabs({ tabs, value, onChange, className, 'aria-label': ariaLabel, variant = 'underline' }) {
  const baseId = useId()
  const refs = useRef([])

  const handleKeyDown = (event, index) => {
    const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight'
    const back = isRtl ? 'ArrowRight' : 'ArrowLeft'
    let next = null
    if (event.key === forward) next = (index + 1) % tabs.length
    else if (event.key === back) next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    if (next == null) return
    event.preventDefault()
    onChange(tabs[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'scrollbar-thin flex max-w-full overflow-x-auto overflow-y-hidden',
        variant === 'underline' ? 'gap-5 border-b border-border' : 'gap-1 rounded-md bg-surface-2 p-0.5 ring-1 ring-inset ring-border w-fit',
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            ref={(node) => (refs.current[index] = node)}
            id={`${baseId}-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium outline-none transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring',
              variant === 'underline'
                ? cn('h-10 rounded-t-sm', selected ? 'text-text' : 'text-muted hover:text-text')
                : cn('h-8 rounded-[5px] px-3', selected ? 'bg-surface text-text shadow-sm ring-1 ring-border' : 'text-muted hover:text-text'),
            )}
          >
            {Icon && <Icon size={15} aria-hidden="true" />}
            {tab.label}
            {tab.count != null && (
              <span className={cn('tabular rounded-sm px-1.5 text-2xs', selected ? 'bg-primary-soft text-primary-soft-fg' : 'bg-surface-2 text-muted')}>{tab.count}</span>
            )}
            {variant === 'underline' && selected && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-text" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}

export function getTabPanelProps(baseId, value) {
  return { role: 'tabpanel', id: `${baseId}-panel-${value}`, 'aria-labelledby': `${baseId}-tab-${value}`, tabIndex: 0 }
}
