import { cn } from '@/lib/cn'

/**
 * Row of key/value stats (Before · After · Saved …).
 * stats: [{ label, value, tone?: 'success'|'danger'|'muted', hint? }]
 */
export function ResultStats({ stats, className }) {
  return (
    <dl className={cn('grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))]', className)}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            'min-w-0 px-4 py-3',
            index > 0 && 'border-s border-border',
            index % 2 === 0 && 'max-sm:border-s-0',
            index >= 2 && 'max-sm:border-t',
          )}
        >
          <dt className="truncate text-xs text-muted">{stat.label}</dt>
          <dd
            className={cn(
              'tabular mt-1 truncate text-lg font-semibold tracking-tight',
              stat.tone === 'success' ? 'text-success' : stat.tone === 'danger' ? 'text-danger' : 'text-text',
            )}
          >
            {stat.value}
          </dd>
          {stat.hint && <p className="mt-0.5 truncate text-2xs text-muted">{stat.hint}</p>}
        </div>
      ))}
    </dl>
  )
}
