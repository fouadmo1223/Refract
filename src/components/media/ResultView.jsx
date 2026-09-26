import { motion } from 'framer-motion'
import { CircleCheckBig, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Stagger, StaggerItem } from '@/components/ui/Stagger'
import { ExportPanel } from './ExportPanel'
import { ResultStats } from './ResultStats'

/**
 * Shared success state: headline, stats, preview and the export panel.
 * "Adjust settings" returns to the same file with settings intact;
 * "Process another" clears the file but keeps settings.
 */
export function ResultView({ title, notice, stats, preview, exportProps, onAdjust, onProcessAnother, extraActions }) {
  const { t } = useTranslation()
  return (
    <Stagger stagger={0.07} className="flex flex-col gap-4">
      <StaggerItem className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex size-7 items-center justify-center rounded-full bg-success-soft text-success"
          >
            <CircleCheckBig size={16} aria-hidden="true" />
          </motion.span>
          <h2 className="text-lg font-semibold text-text">{title}</h2>
        </div>
        {onAdjust && (
          <Button variant="secondary" size="sm" leftIcon={SlidersHorizontal} onClick={onAdjust}>
            {t('result.adjustSettings')}
          </Button>
        )}
      </StaggerItem>
      {notice && <StaggerItem>{notice}</StaggerItem>}
      {stats?.length > 0 && (
        <StaggerItem>
          <ResultStats stats={stats} />
        </StaggerItem>
      )}
      <StaggerItem className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="min-w-0">{preview}</div>
        <div className="lg:sticky lg:top-20">
          <ExportPanel {...exportProps} onProcessAnother={onProcessAnother} extraActions={extraActions} />
        </div>
      </StaggerItem>
    </Stagger>
  )
}
