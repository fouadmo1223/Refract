import { useState } from 'react'
import { Download, FileArchive, GalleryHorizontalEnd, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FRAME_FORMATS } from '@/constants/presets'
import { createZip, downloadBlob } from '@/lib/download'
import { getBaseName } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { notify } from '@/lib/notify'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { MAX_EXTRACTED_FRAMES, extractFrames } from '@/services/video/videoFramesService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { ResultStats } from '@/components/media/ResultStats'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-frames'
const DEFAULTS = { interval: 1, format: 'jpeg' }
const isValidInterval = (value) => Number.isFinite(value) && value >= 0.04 && value <= 3600

function FrameThumb({ frame, onDownload }) {
  const url = useObjectUrl(frame.blob)
  return (
    <button type="button" onClick={onDownload} className="group relative aspect-video overflow-hidden rounded-md bg-surface-2 ring-1 ring-inset ring-border outline-none focus-visible:ring-2 focus-visible:ring-primary" title={frame.name}>
      {url && <img src={url} alt={frame.name} className="size-full object-cover" loading="lazy" />}
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <Download size={16} aria-hidden="true" />
      </span>
    </button>
  )
}

function FramesResult({ file, result, reset, startOver }) {
  const { t } = useTranslation()
  const [isZipping, setIsZipping] = useState(false)
  const baseName = getBaseName(file.name)
  const total = result.frames.reduce((sum, frame) => sum + frame.blob.size, 0)
  const namedFrames = result.frames.map((frame) => ({ ...frame, name: `${baseName}-${frame.name}` }))

  const handleDownloadAll = async () => {
    setIsZipping(true)
    try {
      downloadBlob(await createZip(namedFrames), `${baseName}-frames.zip`)
      notify.success('toasts.downloadStarted')
    } catch (error) {
      notify.error(error)
    } finally {
      setIsZipping(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">{t('result.framesExtracted', { count: result.frames.length })}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" leftIcon={SlidersHorizontal} onClick={reset}>
            {t('result.adjustSettings')}
          </Button>
          <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={startOver}>
            {t('common.processAnother')}
          </Button>
        </div>
      </div>
      <ResultStats
        stats={[
          { label: t('frames.count'), value: String(result.frames.length) },
          { label: t('result.format'), value: FRAME_FORMATS.find((format) => format.id === result.format)?.label },
          { label: t('frames.totalSize'), value: formatBytes(total) },
        ]}
      />
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {namedFrames.map((frame) => (
            <FrameThumb key={frame.name} frame={frame} onDownload={() => downloadBlob(frame.blob, frame.name)} />
          ))}
        </div>
      </div>
      <Button variant="primary" size="lg" leftIcon={FileArchive} onClick={handleDownloadAll} loading={isZipping} className="self-start">
        {t('batch.downloadAllZip', { count: result.frames.length })}
      </Button>
    </div>
  )
}

export default function ExtractFramesPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const valid = isValidInterval(settings.interval)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-frames.action')}
        actionIcon={GalleryHorizontalEnd}
        processingTitle={t('processing.extractingFrames')}
        successMessage="toasts.framesExtracted"
        canProcess={valid}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => {
          const expected = valid && meta?.duration ? Math.min(MAX_EXTRACTED_FRAMES, Math.max(1, Math.floor(meta.duration / settings.interval))) : null
          return (
            <>
              <VideoInfo file={file} meta={meta} />
              <SettingsSection title={t('frames.title')}>
                <NumberInput label={t('frames.interval')} description={t('frames.intervalHint')} value={settings.interval} min={0.04} step={0.5} precision={2} onChange={(interval) => updateSettings({ interval })} suffix={t('frames.seconds')} error={valid ? undefined : 'validation.intervalRange'} />
                <SegmentedControl label={t('settings.outputFormat')} value={settings.format} onChange={(format) => updateSettings({ format })} options={FRAME_FORMATS.map((format) => ({ value: format.id, label: format.label }))} />
                {expected != null && (
                  <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                    {t('frames.expected')}: <span className="font-semibold text-text">≈ {expected}</span>
                    {expected >= MAX_EXTRACTED_FRAMES && <span className="block text-xs text-muted">{t('frames.limit', { max: MAX_EXTRACTED_FRAMES })}</span>}
                  </p>
                )}
              </SettingsSection>
            </>
          )
        }}
        onProcess={({ file, meta, signal, onProgress }) => extractFrames(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <FramesResult {...context} />}
      />
    </ToolLayout>
  )
}
