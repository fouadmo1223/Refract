import { useRef, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FRAME_FORMATS } from '@/constants/presets'
import { getImageFormat } from '@/constants/imageFormats'
import { getBaseName } from '@/lib/files'
import { formatDuration } from '@/lib/format'
import { useFilmstrip } from '@/hooks/useFilmstrip'
import { DEFAULT_SHEET, captureVideoFrame, createContactSheet } from '@/services/video/videoFramesService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ColorInput } from '@/components/ui/ColorInput'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { readVideoMetadata } from '@/services/video/videoMetadataService'
import { ImageResult } from '@/features/image/shared/ImageResult'

const TOOL_ID = 'video-thumbnail'
const DEFAULTS = { mode: 'frame', format: 'jpeg', quality: 92, maxWidth: 0, ...DEFAULT_SHEET }
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
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const sheet = settings.mode === 'sheet'
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
          <>
          <SettingsSection title={t('thumbnail.mode')}>
            <SegmentedControl
              value={settings.mode}
              onChange={(mode) => updateSettings({ mode })}
              options={[
                { value: 'frame', label: t('thumbnail.modes.frame') },
                { value: 'sheet', label: t('thumbnail.modes.sheet') },
              ]}
            />
            <p className="-mt-1 text-xs text-muted">{t(`thumbnail.modeHints.${settings.mode}`)}</p>
          </SettingsSection>
          {sheet && (
            <SettingsSection title={t('thumbnail.sheet')}>
              <div className="grid grid-cols-2 gap-3">
                <Select label={t('collage.columns')} value={settings.columns} onChange={(columns) => updateSettings({ columns })} options={[2, 3, 4, 5, 6].map((value) => ({ value, label: String(value) }))} />
                <Select label={t('thumbnail.rows')} value={settings.rows} onChange={(rows) => updateSettings({ rows })} options={[2, 3, 4, 5, 6, 8].map((value) => ({ value, label: String(value) }))} />
              </div>
              <Select label={t('settings.width')} value={settings.width} onChange={(width) => updateSettings({ width })} options={[1280, 1920, 2560, 3840].map((value) => ({ value, label: `${value}px` }))} />
              <Slider label={t('collage.gap')} value={settings.gap} min={0} max={32} onChange={(gap) => updateSettings({ gap })} formatValue={(value) => `${value}px`} />
              <ColorInput label={t('settings.backgroundColor')} value={settings.background} onChange={(background) => updateSettings({ background })} />
              <Switch label={t('thumbnail.timestamps')} checked={settings.timestamps} onChange={(timestamps) => updateSettings({ timestamps })} />
              <Switch label={t('thumbnail.header')} description={t('thumbnail.headerHint')} checked={settings.header} onChange={(header) => updateSettings({ header })} />
            </SettingsSection>
          )}
          <SettingsSection title={t('settings.output')}>
            <SegmentedControl label={t('settings.outputFormat')} value={settings.format} onChange={(format) => updateSettings({ format })} options={FRAME_FORMATS.map((format) => ({ value: format.id, label: format.label }))} />
            {settings.format !== 'png' && (
              <Slider label={t('settings.quality')} value={settings.quality} min={1} max={100} onChange={(quality) => updateSettings({ quality })} formatValue={(value) => `${value}%`} />
            )}
            {!sheet && (
              <Select
                label={t('frames.size')}
                value={settings.maxWidth}
                onChange={(maxWidth) => updateSettings({ maxWidth })}
                options={[0, 1920, 1280, 640, 320].map((value) => ({ value, label: value ? t('frames.maxWidth', { width: value }) : t('frames.fullSize'), disabled: value && meta?.width ? value >= meta.width : false }))}
              />
            )}
            {meta?.playable === false && <p className="text-xs text-muted">{t('thumbnail.needsPlayable')}</p>}
          </SettingsSection>
          </>
        )}
        onProcess={async ({ file, signal, onProgress }) => {
          if (sheet) return createContactSheet(file, settings, { signal, onProgress })
          videoRef.current?.pause()
          const frame = await captureVideoFrame(videoRef.current, settings)
          return { ...frame, time: videoRef.current?.currentTime ?? 0 }
        }}
        renderResult={(context) => (
          <ImageResult
            {...context}
            outputName={`${getBaseName(context.file.name)}-${sheet ? 'contact-sheet' : formatDuration(context.result.time).replace(/:/g, '-')}.${getImageFormat(context.result.format).ext}`}
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

