import { Cloud, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/**
 * States where processing happens. Only tools that genuinely run in the
 * browser pass `mode="local"`.
 */
export function PrivacyNote({ mode = 'local', className, detail }) {
  const { t } = useTranslation()
  const isLocal = mode === 'local'
  const Icon = isLocal ? ShieldCheck : Cloud
  return (
    <div className={cn('flex items-start gap-2.5 rounded-md bg-surface-2 px-3 py-2.5', className)}>
      <Icon size={16} className={cn('mt-px shrink-0', isLocal ? 'text-success' : 'text-warning')} aria-hidden="true" />
      <div className="min-w-0 text-xs leading-relaxed">
        <p className="font-medium text-text">{t(isLocal ? 'privacy.localTitle' : 'privacy.serverTitle')}</p>
        <p className="text-muted">{detail ?? t(isLocal ? 'privacy.localDescription' : 'privacy.serverDescription')}</p>
      </div>
    </div>
  )
}
