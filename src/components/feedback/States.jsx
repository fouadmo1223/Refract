import { CircleAlert, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-surface-2 text-muted ring-1 ring-inset ring-border">
          <Icon size={20} aria-hidden="true" />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-text">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/**
 * Error panel. Accepts any error (normalized internally) — users only ever
 * see translated, friendly copy, never stack traces.
 */
export function ErrorState({ error, onRetry, retryLabel, secondaryAction, className, compact = false }) {
  const { t } = useTranslation()
  const message = getErrorMessage(t, error)
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <CircleAlert size={20} aria-hidden="true" />
      </div>
      <h3 className="text-[15px] font-semibold text-text">{message.title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{message.description}</p>
      {(onRetry || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button variant="secondary" leftIcon={RotateCcw} onClick={onRetry}>
              {retryLabel ?? t('common.tryAgain')}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export function LoadingState({ label, className }) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-muted', className)} role="status">
      <Spinner size={20} />
      <span>{label ?? t('common.loading')}</span>
    </div>
  )
}

/** Route-level fallback while lazy chunks load. */
export function PageLoader() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
      <div className="h-4 w-40 animate-pulse rounded-sm bg-surface-3" />
      <div className="mt-4 h-7 w-72 animate-pulse rounded-sm bg-surface-3" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded-sm bg-surface-3" />
      <div className="mt-8 h-64 animate-pulse rounded-lg bg-surface-2" />
    </div>
  )
}
