import { forwardRef } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

const VARIANTS = {
  primary: 'bg-primary text-primary-fg shadow-xs hover:bg-primary-hover disabled:opacity-50',
  secondary: 'bg-surface text-text border border-border shadow-xs hover:bg-surface-2 hover:border-border-strong disabled:opacity-50',
  subtle: 'bg-surface-2 text-text hover:bg-surface-3 disabled:opacity-50',
  ghost: 'bg-transparent text-text-2 hover:bg-surface-2 hover:text-text disabled:opacity-40',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
  'danger-ghost': 'bg-transparent text-danger hover:bg-danger-soft disabled:opacity-40',
  link: 'bg-transparent text-primary hover:underline underline-offset-4 px-0 h-auto',
}

const SIZES = {
  xs: 'h-7 px-2 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-lg',
}

export const buttonClasses = ({ variant = 'secondary', size = 'md', fullWidth, className } = {}) =>
  cn(
    'inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap',
    'transition-[background-color,border-color,color,box-shadow,opacity] duration-[var(--duration-fast)] ease-[var(--ease-soft)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none',
    VARIANTS[variant],
    variant !== 'link' && SIZES[size],
    fullWidth && 'w-full',
    className,
  )

/**
 * Button. Pass `as={Link}` (plus `to`) to render a router link styled as a button.
 */
export const Button = forwardRef(function Button(
  { as: Component = 'button', variant, size, fullWidth, loading = false, leftIcon: LeftIcon, rightIcon: RightIcon, className, children, disabled, type, ...props },
  ref,
) {
  const iconSize = size === 'lg' ? 18 : size === 'xs' ? 14 : 16
  return (
    <Component
      ref={ref}
      type={Component === 'button' ? (type ?? 'button') : undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={Component === 'button' ? disabled || loading : undefined}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size={iconSize} /> : LeftIcon ? <LeftIcon size={iconSize} aria-hidden="true" /> : null}
      {children}
      {RightIcon && !loading ? <RightIcon size={iconSize} aria-hidden="true" className="rtl:-scale-x-100" /> : null}
    </Component>
  )
})
