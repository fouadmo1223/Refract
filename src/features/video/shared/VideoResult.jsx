import { useTranslation } from 'react-i18next'
import { AUDIO_OUTPUT_FORMATS, VIDEO_OUTPUT_FORMATS } from '@/constants/presets'
import { buildOutputName } from '@/lib/files'
import { formatBytes, formatDimensions, formatDuration, formatPercent } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { MediaStage } from '@/components/layout/Panels'
import { AudioPreview, VideoPreview } from '@/components/media/Previews'
import { ResultView } from '@/components/media/ResultView'

function formatLabelFor(ext) {
  return [...VIDEO_OUTPUT_FORMATS, ...AUDIO_OUTPUT_FORMATS].find((format) => format.ext === ext)?.label ?? ext.toUpperCase()
}

/** Shared result for video/audio/GIF outputs. */
export function VideoResult({ file, meta, result, reset, startOver, title, suffix, notice, showSizeChange = true }) {
  const { t } = useTranslation()
  const extension = result.format === 'aac' ? 'm4a' : result.format
  const isAudio = ['mp3', 'wav', 'm4a', 'aac'].includes(extension)
  const isGif = extension === 'gif'
  const gifUrl = useObjectUrl(isGif ? result.blob : null)
  const change = file.size ? 1 - result.blob.size / file.size : 0

  const stats = [
    { label: t('result.before'), value: formatBytes(file.size) },
    { label: t('result.after'), value: formatBytes(result.blob.size) },
    showSizeChange && { label: change >= 0 ? t('result.saved') : t('result.larger'), value: formatPercent(Math.abs(change)), tone: change > 0.005 ? 'success' : undefined },
    !isAudio && result.width && { label: t('result.resolution'), value: formatDimensions(result.width, result.height) },
    result.duration && { label: t('result.duration'), value: formatDuration(result.duration) },
  ].filter(Boolean)

  let preview
  if (isAudio) preview = <AudioPreview blob={result.blob} />
  else if (isGif) preview = <MediaStage checkerboard>{gifUrl && <img src={gifUrl} alt={t('result.result')} className="max-h-[62vh] max-w-full object-contain" />}</MediaStage>
  else preview = <VideoPreview file={result.blob} meta={{ playable: !['avi', 'mkv'].includes(extension) || undefined }} />

  return (
    <ResultView
      title={title}
      notice={notice}
      stats={stats}
      onAdjust={reset}
      onProcessAnother={startOver}
      preview={preview}
      exportProps={{
        blob: result.blob,
        fileName: buildOutputName(file.name, suffix, extension),
        extension,
        formatLabel: formatLabelFor(extension),
        width: isAudio ? undefined : result.width ?? meta?.width,
        height: isAudio ? undefined : result.height ?? meta?.height,
        duration: result.duration,
      }}
    />
  )
}
