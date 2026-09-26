import { FileVideo, Music, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { getExtension } from '@/lib/files'
import { formatBytes, formatDimensions, formatDuration } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { IconButton } from '@/components/ui/IconButton'

/** Compact summary of a selected file with optional replace / remove actions. */
export function FileCard({ file, meta, onRemove, onReplace, className, children }) {
  const { t } = useTranslation()
  const isImage = file.type.startsWith('image/')
  const thumbnail = useObjectUrl(isImage ? file : null)
  const Icon = file.type.startsWith('audio/') ? Music : FileVideo

  const details = [
    getExtension(file.name).toUpperCase(),
    formatBytes(file.size),
    meta?.width ? formatDimensions(meta.width, meta.height) : null,
    meta?.duration ? formatDuration(meta.duration) : null,
  ].filter(Boolean)

  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5', className)}>
      <div className="checkerboard flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-inset ring-border">
        {thumbnail ? <img src={thumbnail} alt="" className="size-full object-cover" /> : <Icon size={18} className="text-muted" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text" title={file.name} dir="auto">
          {file.name}
        </p>
        <p className="tabular mt-0.5 truncate text-xs text-muted">{details.join(' · ')}</p>
      </div>
      {children}
      {onReplace && <IconButton icon={RefreshCw} label={t('common.replaceFile')} size="sm" onClick={onReplace} />}
      {onRemove && <IconButton icon={X} label={t('common.removeFile')} size="sm" variant="danger-ghost" onClick={onRemove} />}
    </div>
  )
}
