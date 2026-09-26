import { forwardRef } from 'react'
import { cn } from '@/lib/cn'
import { Tooltip } from './Tooltip'

const VARIANTS = {
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  secondary: 'bg-surface text-text-2 border border-border shadow-xs hover:bg-surface-2 hover:text-text',
  subtle: 'bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text',
  'danger-ghost': 'text-muted hover:text-danger hover:bg-danger-soft',
  overlay: 'bg-black/55 text-white hover:bg-black/70 backdrop-blur-sm',
}

const SIZES = { xs: 'size-7', sm: 'size-8', md: 'size-9', lg: 'size-10' }
const ICON_SIZES = { xs: 14, sm: 16, md: 18, lg: 18 }

/**
 * Square icon-only button. `label` is required: it becomes the accessible
 * name and the tooltip text.
 */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', active = false, tooltip = true, className, iconClassName, type = 'button', ...props },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        active && 'bg-primary-soft text-primary-soft-fg hover:bg-primary-soft hover:text-primary-soft-fg',
        className,
      )}
      {...props}
    >
      <Icon size={ICON_SIZES[size]} aria-hidden="true" className={iconClassName} />
    </button>
  )
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button
})
