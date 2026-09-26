import { useState } from 'react'
import { ImagePlay } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GIF_FPS_OPTIONS, GIF_WIDTH_OPTIONS } from '@/constants/presets'
import { formatBytes } from '@/lib/format'
import { videoToGif } from '@/services/video/videoGifService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { RangePreview, TimeRangeFields, validateRange } from '../shared/TimeRangeEditor'

const TOOL_ID = 'video-to-gif'
const DEFAULTS = { fps: 12, width: 480, quality: 'high' }
const DEFAULT_CLIP_SECONDS = 5

/** Very rough GIF size guide so users notice when a clip will be huge. */
function estimateGifSize(width, height, fps, seconds, quality) {
  const bytesPerPixel = { high: 0.25, medium: 0.18, low: 0.12 }[quality]
  return width * height * fps * seconds * bytesPerPixel
}

export default function VideoToGifPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [range, setRange] = useState(null)
  const resolveRange = (meta) => range ?? { start: 0, end: Math.min(meta?.duration ?? 0, DEFAULT_CLIP_SECONDS) }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        onFileChange={() => setRange(null)}
        actionLabel={t('tools.video-to-gif.action')}
        actionIcon={ImagePlay}
        processingTitle={t('processing.creatingGif')}
        successMessage="toasts.gifCreated"
        canProcess={({ meta }) => Boolean(meta?.duration) && !validateRange(resolveRange(meta), meta.duration)}
        renderPreview={({ file, meta }) => <RangePreview file={file} meta={meta} range={resolveRange(meta)} onRangeChange={setRange} />}
        renderSettings={({ meta }) => {
          const current = resolveRange(meta)
          const width = Math.min(settings.width, meta?.width || settings.width)
          const height = meta?.width ? Math.round((meta.height / meta.width) * width) : width
          const estimate = estimateGifSize(width, height, settings.fps, current.end - current.start, settings.quality)
          return (
            <>
              <SettingsSection title={t('trim.range')}>
                <TimeRangeFields range={current} duration={meta?.duration ?? 0} onRangeChange={setRange} error={validateRange(current, meta?.duration)} />
              </SettingsSection>
              <SettingsSection title={t('gif.output')}>
                <SegmentedControl label={t('gif.fps')} value={settings.fps} onChange={(fps) => updateSettings({ fps })} options={GIF_FPS_OPTIONS.map((fps) => ({ value: fps, label: String(fps) }))} />
                <Select
                  label={t('settings.width')}
                  value={settings.width}
                  onChange={(value) => updateSettings({ width: value })}
                  options={GIF_WIDTH_OPTIONS.map((value) => ({ value, label: `${value}px`, disabled: meta?.width ? value > meta.width : false }))}
                />
                <SegmentedControl
                  label={t('settings.quality')}
                  value={settings.quality}
                  onChange={(quality) => updateSettings({ quality })}
                  options={['high', 'medium', 'low'].map((quality) => ({ value: quality, label: t(`gif.quality.${quality}`) }))}
                />
                <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                  {t('video.estimatedOutput')}: <span className="font-semibold text-text">≈ {formatBytes(estimate)}</span>
                </p>
              </SettingsSection>
            </>
          )
        }}
        onProcess={({ file, meta, signal, onProgress }) => videoToGif(file, { ...resolveRange(meta), ...settings }, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.gifComplete')} suffix="" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
