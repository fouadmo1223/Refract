import { cn } from '@/lib/cn'

/**
 * Linear progress. `value` is 0–1; pass null for an indeterminate bar
 * (never fake a percentage when real progress is unavailable).
 */
export function ProgressBar({ value, className, size = 'md', tone = 'primary', label }) {
  const indeterminate = value == null
  const percent = indeterminate ? 0 : Math.round(Math.min(1, Math.max(0, value)) * 100)
  const tones = { primary: 'bg-primary', success: 'bg-success', danger: 'bg-danger', muted: 'bg-muted' }
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : percent}
      className={cn('relative w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1' : size === 'lg' ? 'h-2' : 'h-1.5', className)}
    >
      {indeterminate ? (
        <div className={cn('animate-indeterminate absolute inset-y-0 w-2/5 rounded-full', tones[tone])} />
      ) : (
        <div
          className={cn('h-full rounded-full transition-[width] duration-300 ease-out', tones[tone])}
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  )
}

export function ProgressCircle({ value, size = 40, stroke = 3.5, className, label, showValue = false }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const indeterminate = value == null
  const percent = indeterminate ? 25 : Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : percent}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className={cn('-rotate-90', indeterminate && 'animate-spin')} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-surface-3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-300"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      {showValue && !indeterminate && <span className="tabular absolute text-[10px] font-semibold text-text">{percent}%</span>}
    </div>
  )
}
