import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatPercent } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/Progress'

/**
 * Dedicated processing view. Shows real progress when available and an
 * indeterminate bar otherwise (e.g. while the engine loads) — never fake numbers.
 */
export function ProcessingState({ title, progress, stage, onCancel, longRunning = false }) {
  const { t } = useTranslation()
  const hasProgress = progress != null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[15px] font-semibold text-text">{title}</h3>
          {hasProgress && <span className="tabular text-sm font-medium text-text-2">{formatPercent(progress)}</span>}
        </div>
        <ProgressBar value={progress} size="lg" className="mt-3" label={title} />
        <p className="mt-2.5 text-start text-[13px] text-muted">{t(`processing.stages.${stage ?? 'processing'}`, { defaultValue: t('processing.stages.processing') })}</p>
        {longRunning && <p className="mt-6 text-xs text-muted">{t('processing.keepTabOpen')}</p>}
        {onCancel && (
          <Button variant="ghost" size="sm" leftIcon={X} onClick={onCancel} className="mt-4">
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
