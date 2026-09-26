import { memo } from 'react'
import { Download, RotateCcw, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import { formatBytes, formatPercent } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { IconButton } from '@/components/ui/IconButton'
import { ProgressBar } from '@/components/ui/Progress'

const STATUS_STYLES = {
  idle: 'text-muted',
  waiting: 'text-muted',
  processing: 'text-primary',
  completed: 'text-success',
  failed: 'text-danger',
  canceled: 'text-muted',
}

/** One row of the batch queue. Memoized so progress on one file doesn't re-render all rows. */
export const BatchQueueItem = memo(function BatchQueueItem({ item, onCancel, onRemove, onRetry, onDownload }) {
  const { t } = useTranslation()
  const thumbnail = useObjectUrl(item.file)
  const saved = item.result ? 1 - item.result.blob.size / item.file.size : null
  const errorText = item.error ? getErrorMessage(t, item.error).title : null

  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-center gap-3 px-3 py-2.5">
      <div className="checkerboard size-10 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-border">
        {thumbnail && <img src={thumbnail} alt="" className="size-full object-cover" loading="lazy" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[13px] font-medium text-text" dir="auto" title={item.file.name}>
            {item.file.name}
          </p>
          <span className={cn('tabular shrink-0 text-xs font-medium', STATUS_STYLES[item.status])}>
            {item.status === 'processing' ? formatPercent(item.progress) : t(`batch.status.${item.status}`)}
          </span>
        </div>
        {item.status === 'processing' ? (
          <ProgressBar value={item.progress} size="sm" className="mt-2" label={item.file.name} />
        ) : (
          <p className={cn('tabular mt-0.5 truncate text-xs', item.status === 'failed' ? 'text-danger' : 'text-muted')}>
            {item.status === 'completed' && item.result ? (
              <>
                {formatBytes(item.file.size)} → <span className="font-medium text-text">{formatBytes(item.result.blob.size)}</span>
                {saved != null && <span className={saved > 0 ? 'text-success' : 'text-danger'}> ({saved > 0 ? '−' : '+'}{formatPercent(Math.abs(saved))})</span>}
              </>
            ) : item.status === 'failed' ? (
              errorText
            ) : (
              formatBytes(item.file.size)
            )}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {(item.status === 'processing' || item.status === 'waiting') && <IconButton icon={X} label={t('common.cancel')} size="sm" onClick={() => onCancel(item.id)} />}
        {(item.status === 'failed' || item.status === 'canceled') && <IconButton icon={RotateCcw} label={t('common.retry')} size="sm" onClick={() => onRetry(item.id)} />}
        {item.status === 'completed' && <IconButton icon={Download} label={t('common.download')} size="sm" onClick={() => onDownload(item)} />}
        {item.status !== 'processing' && <IconButton icon={Trash2} label={t('common.removeFile')} size="sm" variant="danger-ghost" onClick={() => onRemove(item.id)} />}
      </div>
    </motion.li>
  )
})
