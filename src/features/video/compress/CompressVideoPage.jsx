import { Minimize2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { resultFileName } from '@/lib/files'
import { z } from 'zod'
import { VIDEO_COMPRESSION_PRESETS, VIDEO_RESOLUTIONS } from '@/constants/presets'
import { formatBytes, formatPercent } from '@/lib/format'
import { useValidation } from '@/hooks/useValidation'
import { compressVideo, estimateCompressedSize } from '@/services/video/videoCompressionService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Accordion } from '@/components/ui/Accordion'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-compress'
const DEFAULTS = { preset: 'balanced', crf: 28, resolution: 'original', useBitrate: false, bitrate: 1500, format: 'mp4', removeAudio: false }

const schema = z
  .object({ preset: z.string() })
  .passthrough()
  .superRefine((values, ctx) => {
    if (values.preset !== 'custom') return
    if (values.useBitrate && !(Number.isFinite(values.bitrate) && values.bitrate >= 100 && values.bitrate <= 50000)) {
      ctx.addIssue({ code: 'custom', path: ['bitrate'], message: 'validation.bitrateRange' })
    }
  })

function CompressVideoSettings({ file, meta, settings, updateSettings, errors }) {
  const { t } = useTranslation()
  const estimate = estimateCompressedSize(meta, settings)
  const reduction = estimate && file ? 1 - estimate / file.size : null

  return (
    <>
      <VideoInfo file={file} meta={meta} />
      <SettingsSection title={t('settings.compression')}>
        <Select
          label={t('settings.qualityPreset')}
          value={settings.preset}
          onChange={(preset) => updateSettings({ preset })}
          options={VIDEO_COMPRESSION_PRESETS.map((preset) => ({ value: preset.id, label: t(`presets.video.${preset.id}`), description: t(`presets.video.${preset.id}Description`) }))}
        />
        {settings.preset === 'custom' && (
          <>
            <Slider
              label={t('video.crf')}
              value={settings.crf}
              min={18}
              max={40}
              onChange={(crf) => updateSettings({ crf })}
              formatValue={(value) => `CRF ${value}`}
              disabled={settings.useBitrate}
            />
            <p className="-mt-1 text-xs text-muted">{t('video.crfHint')}</p>
            <Switch label={t('video.targetBitrate')} description={t('video.targetBitrateHint')} checked={settings.useBitrate} onChange={(useBitrate) => updateSettings({ useBitrate })} />
            {settings.useBitrate && (
              <NumberInput label={t('video.bitrate')} value={settings.bitrate} min={100} max={50000} step={100} onChange={(bitrate) => updateSettings({ bitrate })} suffix="kbps" error={errors.bitrate} />
            )}
          </>
        )}
        <Select
          label={t('video.resolution')}
          value={settings.resolution}
          onChange={(resolution) => updateSettings({ resolution })}
          options={VIDEO_RESOLUTIONS.map((resolution) => ({
            value: resolution.id,
            label: resolution.height ? resolution.label : t('video.originalResolution'),
            meta: resolution.height ? undefined : meta?.height ? `${meta.height}p` : undefined,
            disabled: Boolean(resolution.height && meta?.height && resolution.height > meta.height),
          }))}
        />
      </SettingsSection>
      <Accordion title={t('settings.advanced')} className="-mb-2">
        <SegmentedControl
          label={t('settings.outputFormat')}
          value={settings.format}
          onChange={(format) => updateSettings({ format })}
          options={[
            { value: 'mp4', label: 'MP4 (H.264)' },
            { value: 'webm', label: 'WebM (VP8)' },
          ]}
        />
        <Switch label={t('video.removeAudio')} checked={settings.removeAudio} onChange={(removeAudio) => updateSettings({ removeAudio })} />
      </Accordion>
      {estimate && (
        <div className="rounded-md border border-border px-3 py-2.5">
          <p className="text-xs text-muted">{t('video.estimatedOutput')}</p>
          <p className="tabular mt-0.5 text-[15px] font-semibold text-text">
            ≈ {formatBytes(estimate)}
            {reduction != null && reduction > 0 && <span className="ms-2 text-[13px] font-medium text-success">−{formatPercent(reduction)}</span>}
          </p>
          <p className="mt-1 text-2xs text-muted">{t('video.estimateDisclaimer')}</p>
        </div>
      )}
    </>
  )
}

export default function CompressVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const { errors, isValid } = useValidation(schema, settings)

  // Controls and processing take settings as arguments so multi-file mode can give each file its own.
  const renderControls = ({ settings, updateSettings, file, meta }) => <CompressVideoSettings file={file} meta={meta} settings={settings} updateSettings={updateSettings} errors={errors} />
  const runJob = ({ settings, file, meta, signal, onProgress }) => compressVideo(file, settings, meta, { signal, onProgress })

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-compress.action')}
        actionIcon={Minimize2}
        processingTitle={t('processing.compressingVideo')}
        successMessage="toasts.videoCompressed"
        canProcess={isValid}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={(context) => renderControls({ ...context, settings, updateSettings })}
        onProcess={(context) => runJob({ ...context, settings })}
        batch={{
          settings,
          updateSettings,
          renderSettings: renderControls,
          process: runJob,
          outputName: (file, result) => resultFileName(file.name, 'compressed', result?.format),
        }}
        renderResult={(context) => <VideoResult {...context} title={t('result.compressionComplete')} suffix="compressed" />}
      />
    </ToolLayout>
  )
}
