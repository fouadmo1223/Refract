import { useState } from 'react'
import { Download, FileArchive, RotateCcw, SlidersHorizontal, SplitSquareHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createZip, downloadBlob } from '@/lib/download'
import { getBaseName } from '@/lib/files'
import { formatBytes, formatDuration } from '@/lib/format'
import { notify } from '@/lib/notify'
import { MAX_SPLIT_PARTS, splitVideo } from '@/services/video/videoLookService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-split'
const DEFAULTS = { mode: 'parts', parts: 2, length: 30 }

function partCount(settings, duration) {
  if (!duration) return 0
  return settings.mode === 'parts' ? settings.parts : Math.ceil(duration / settings.length)
}

function isValid(settings, duration) {
  const segment = settings.mode === 'parts' ? duration / settings.parts : settings.length
  const count = partCount(settings, duration)
  return Boolean(duration) && Number.isFinite(segment) && segment > 0.5 && count >= 2 && count <= MAX_SPLIT_PARTS
}

function SplitResult({ file, result, reset, startOver }) {
  const { t } = useTranslation()
  const [isZipping, setIsZipping] = useState(false)
  const baseName = getBaseName(file.name)
  const parts = result.parts.map((part, index) => ({ ...part, name: `${baseName}-part${index + 1}.${result.format}` }))

  const handleZip = async () => {
    setIsZipping(true)
    try {
      downloadBlob(await createZip(parts), `${baseName}-parts.zip`)
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
        <h2 className="text-lg font-semibold text-text">{t('result.splitComplete', { count: parts.length })}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" leftIcon={SlidersHorizontal} onClick={reset}>
            {t('result.adjustSettings')}
          </Button>
          <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={startOver}>
            {t('common.processAnother')}
          </Button>
        </div>
      </div>
      <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {parts.map((part, index) => (
          <li key={part.name} className="flex items-center gap-3 px-3 py-2.5">
            <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-xs font-semibold text-text-2">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-text" dir="auto">
                {part.name}
              </p>
              <p className="tabular text-xs text-muted">≈ {formatDuration(result.segmentLength)} · {formatBytes(part.blob.size)}</p>
            </div>
            <IconButton icon={Download} label={t('common.download')} size="sm" onClick={() => downloadBlob(part.blob, part.name)} />
          </li>
        ))}
      </ol>
      <Button variant="primary" size="lg" leftIcon={FileArchive} onClick={handleZip} loading={isZipping} className="self-start">
        {t('batch.downloadAllZip', { count: parts.length })}
      </Button>
    </div>
  )
}

export default function SplitVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-split.action')}
        actionIcon={SplitSquareHorizontal}
        processingTitle={t('processing.splittingVideo')}
        successMessage="toasts.videoSplit"
        canProcess={({ meta }) => isValid(settings, meta?.duration)}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => (
          <>
            <VideoInfo file={file} meta={meta} />
            <SettingsSection title={t('split.title')}>
              <SegmentedControl
                value={settings.mode}
                onChange={(mode) => updateSettings({ mode })}
                options={[
                  { value: 'parts', label: t('split.byParts') },
                  { value: 'length', label: t('split.byLength') },
                ]}
              />
              {settings.mode === 'parts' ? (
                <NumberInput label={t('split.parts')} value={settings.parts} min={2} max={MAX_SPLIT_PARTS} onChange={(parts) => updateSettings({ parts })} />
              ) : (
                <NumberInput label={t('split.length')} value={settings.length} min={1} step={5} precision={1} onChange={(length) => updateSettings({ length })} suffix={t('frames.seconds')} />
              )}
              {isValid(settings, meta?.duration) ? (
                <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">{t('split.summary', { count: partCount(settings, meta.duration), length: formatDuration(settings.mode === 'parts' ? meta.duration / settings.parts : settings.length) })}</p>
              ) : (
                <p className="text-xs font-medium text-danger">{t('validation.splitRange', { max: MAX_SPLIT_PARTS })}</p>
              )}
              <p className="text-xs text-muted">{t('split.keyframeNote')}</p>
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => splitVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <SplitResult {...context} />}
      />
    </ToolLayout>
  )
}
