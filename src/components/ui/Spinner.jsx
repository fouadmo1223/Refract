import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Spinner({ size = 16, className, label }) {
  return (
    <LoaderCircle
      size={size}
      className={cn('animate-spin', className)}
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      role={label ? 'status' : undefined}
    />
  )
}
