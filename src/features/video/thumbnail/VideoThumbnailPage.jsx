import { useRef, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FRAME_FORMATS } from '@/constants/presets'
import { getImageFormat } from '@/constants/imageFormats'
import { getBaseName } from '@/lib/files'
import { formatDuration } from '@/lib/format'
import { useFilmstrip } from '@/hooks/useFilmstrip'
import { captureVideoFrame } from '@/services/video/videoFramesService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { readVideoMetadata } from '@/services/video/videoMetadataService'
import { ImageResult } from '@/features/image/shared/ImageResult'

const TOOL_ID = 'video-thumbnail'
const DEFAULTS = { format: 'jpeg', quality: 92 }
const FRAME_STEP = 1 / 30

/**
 * Frame grabber. Runs entirely on the <video> element + canvas — no FFmpeg
 * needed, so it's instant. The chosen frame is exported at full resolution.
 */
function FrameScrubber({ file, meta, videoRef }) {
  const { t } = useTranslation()
  const [time, setTime] = useState(0)
  const frames = useFilmstrip(file, { count: 8 })

  const seek = (next) => {
    const clamped = Math.min(meta.duration, Math.max(0, next))
    if (videoRef.current) videoRef.current.currentTime = clamped
    setTime(clamped)
  }

  return (
    <div className="flex flex-col gap-3">
      <VideoPreview file={file} meta={meta} videoRef={videoRef} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} />
      <div className="rounded-lg border border-border bg-surface p-3">
        {frames.length > 0 && (
          <div className="mb-3 grid grid-cols-8 gap-1" dir="ltr">
            {frames.map((frame, index) => (
              <button
                key={frame}
                type="button"
                onClick={() => seek(((index + 0.5) / frames.length) * meta.duration)}
                className="aspect-video overflow-hidden rounded-sm ring-primary outline-none hover:opacity-80 focus-visible:ring-2"
                aria-label={t('thumbnail.jumpTo', { time: formatDuration(((index + 0.5) / frames.length) * meta.duration) })}
              >
                <img src={frame} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2" dir="ltr">
          <IconButton icon={ChevronLeft} label={t('thumbnail.previousFrame')} size="sm" variant="secondary" onClick={() => seek(time - FRAME_STEP)} />
          <Slider aria-label={t('thumbnail.position')} value={time} min={0} max={meta.duration} step={0.01} onChange={seek} showValue={false} className="flex-1" />
          <IconButton icon={ChevronRight} label={t('thumbnail.nextFrame')} size="sm" variant="secondary" onClick={() => seek(time + FRAME_STEP)} />
          <span className="tabular w-16 text-end text-xs text-muted">{formatDuration(time, { precise: true })}</span>
        </div>
      </div>
    </div>
  )
}

export default function VideoThumbnailPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const videoRef = useRef(null)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.video}
        loadMeta={readVideoMetadata}
        actionLabel={t('tools.video-thumbnail.action')}
        actionIcon={Camera}
        processingTitle={t('processing.capturingFrame')}
        successMessage="toasts.frameCaptured"
        canProcess={({ meta }) => meta?.playable !== false}
        renderPreview={({ file, meta }) => (meta?.playable === false ? <VideoPreview file={file} meta={meta} /> : <FrameScrubber file={file} meta={meta} videoRef={videoRef} />)}
        renderSettings={({ meta }) => (
          <SettingsSection title={t('settings.output')}>
            <SegmentedControl label={t('settings.outputFormat')} value={settings.format} onChange={(format) => updateSettings({ format })} options={FRAME_FORMATS.map((format) => ({ value: format.id, label: format.label }))} />
            {settings.format !== 'png' && (
              <Slider label={t('settings.quality')} value={settings.quality} min={1} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />
            )}
            {meta?.playable === false && <p className="text-xs text-muted">{t('thumbnail.needsPlayable')}</p>}
          </SettingsSection>
        )}
        onProcess={async () => {
          videoRef.current?.pause()
          const frame = await captureVideoFrame(videoRef.current, settings)
          return { ...frame, time: videoRef.current?.currentTime ?? 0 }
        }}
        renderResult={(context) => (
          <ImageResult
            {...context}
            outputName={`${getBaseName(context.file.name)}-${formatDuration(context.result.time).replace(/:/g, '-')}.${getImageFormat(context.result.format).ext}`}
            title={t('result.frameCaptured')}
            suffix="frame"
            compare={false}
            stats={[]}
          />
        )}
      />
    </ToolLayout>
  )
}

