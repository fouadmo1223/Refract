import { FileVideo } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { MediaStage } from '@/components/layout/Panels'

/** Image preview on a checkerboard (transparency visible). */
export function ImagePreview({ file, alt, className, imgClassName }) {
  const url = useObjectUrl(file)
  return (
    <MediaStage checkerboard className={className}>
      {url && <img src={url} alt={alt ?? file?.name ?? ''} className={cn('max-h-[62vh] w-auto max-w-full object-contain', imgClassName)} />}
    </MediaStage>
  )
}

/**
 * Video preview with native controls. Browsers can't play every container
 * (AVI, some MKV) — processing still works, so show a clear note instead.
 */
export function VideoPreview({ file, meta, videoRef, className, onTimeUpdate, onLoadedMetadata, controls = true }) {
  const { t } = useTranslation()
  const url = useObjectUrl(file)
  if (meta && meta.playable === false) {
    return (
      <MediaStage className={className}>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg bg-surface-2 text-muted ring-1 ring-inset ring-border">
            <FileVideo size={20} aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-text">{t('video.previewUnavailable')}</p>
          <p className="max-w-xs text-xs text-muted">{t('video.previewUnavailableHint')}</p>
        </div>
      </MediaStage>
    )
  }
  return (
    <MediaStage className={cn('bg-black p-0 sm:p-0', className)}>
      {url && (
        <video
          ref={videoRef}
          src={url}
          controls={controls}
          playsInline
          preload="metadata"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          className="max-h-[62vh] w-full bg-black object-contain"
        />
      )}
    </MediaStage>
  )
}

export function AudioPreview({ blob }) {
  const url = useObjectUrl(blob)
  return (
    <MediaStage>
      <div className="flex w-full max-w-md flex-col items-center gap-4 py-8">
        <div className="flex h-16 w-full items-end justify-center gap-[3px]" aria-hidden="true">
          {Array.from({ length: 48 }, (_, index) => (
            <span key={index} className="w-1 rounded-full bg-primary/60" style={{ height: `${20 + Math.abs(Math.sin(index * 0.7) * Math.cos(index * 0.23)) * 80}%` }} />
          ))}
        </div>
        {url && <audio src={url} controls className="w-full" />}
      </div>
    </MediaStage>
  )
}
