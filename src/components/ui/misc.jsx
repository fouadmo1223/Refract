import { cn } from '@/lib/cn'

export function Kbd({ children, className }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-surface-2 px-1 font-sans text-2xs font-medium text-muted', className)}>
      {children}
    </kbd>
  )
}

const BADGE_TONES = {
  neutral: 'bg-surface-2 text-text-2 ring-border',
  primary: 'bg-primary-soft text-primary-soft-fg ring-transparent',
  success: 'bg-success-soft text-success ring-transparent',
  warning: 'bg-warning-soft text-warning ring-transparent',
  danger: 'bg-danger-soft text-danger ring-transparent',
}

export function Badge({ children, tone = 'neutral', className, icon: Icon }) {
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-2xs font-medium ring-1 ring-inset', BADGE_TONES[tone], className)}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </span>
  )
}

export function Divider({ className }) {
  return <div className={cn('h-px w-full bg-border', className)} role="separator" />
}

export function VisuallyHidden({ children }) {
  return <span className="sr-only">{children}</span>
}
