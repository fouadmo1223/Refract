import { cn } from '@/lib/cn'

/** Preview surface on the main side of a tool. */
export function MediaStage({ children, className, checkerboard = false, padded = true }) {
  return (
    <div
      className={cn(
        'relative flex min-h-72 items-center justify-center overflow-hidden rounded-lg border border-border',
        checkerboard ? 'checkerboard' : 'bg-surface',
        padded && 'p-3 sm:p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Settings sidebar card. */
export function SettingsPanel({ children, footer, className }) {
  return (
    <aside className={cn('flex flex-col rounded-lg border border-border bg-surface lg:sticky lg:top-20', className)}>
      <div className="flex flex-col gap-5 p-4">{children}</div>
      {footer && (
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-b-lg border-t border-border bg-surface p-3 max-lg:shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.25)] lg:static">
          {footer}
        </div>
      )}
    </aside>
  )
}

export function SettingsSection({ title, description, children, className, action }) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title && <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>}
          {action}
        </div>
      )}
      {description && <p className="-mt-1.5 text-xs text-muted">{description}</p>}
      {children}
    </section>
  )
}
