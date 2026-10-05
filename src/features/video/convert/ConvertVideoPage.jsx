import { Repeat2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VIDEO_OUTPUT_FORMATS } from '@/constants/presets'
import { getExtension, resultFileName } from '@/lib/files'
import { CONVERT_QUALITY, convertVideo } from '@/services/video/videoConversionService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-convert'
const DEFAULTS = { format: 'mp4', copyStreams: false, quality: 'balanced', height: 'original', fps: 'original', keepAudio: true, gifFps: 12, gifWidth: 480 }
const COPYABLE = ['mp4', 'mov', 'mkv']

export default function ConvertVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const target = VIDEO_OUTPUT_FORMATS.find((format) => format.id === settings.format)

  // Controls and processing take settings as arguments so multi-file mode can give each file its own.
  const renderControls = ({ settings, updateSettings, file, meta }) => (
    <>
      <VideoInfo file={file} meta={meta} />
      <SettingsSection title={t('settings.conversion')}>
        <Select
          label={t('settings.targetFormat')}
          value={settings.format}
          onChange={(format) => updateSettings({ format })}
          options={VIDEO_OUTPUT_FORMATS.map((format) => ({
            value: format.id,
            label: format.label,
            description: t(`formats.video.${format.id}`),
            disabled: Boolean(file) && format.ext === getExtension(file.name),
          }))}
        />
        {COPYABLE.includes(settings.format) && (
          <Switch label={t('video.copyStreams')} description={t('video.copyStreamsHint')} checked={settings.copyStreams} onChange={(copyStreams) => updateSettings({ copyStreams })} />
        )}
        {settings.format === 'gif' && <p className="text-xs text-muted">{t('video.gifConvertHint')}</p>}
      </SettingsSection>
      {settings.format === 'gif' ? (
        <SettingsSection title={t('gif.output')}>
          <SegmentedControl label={t('gif.fps')} value={settings.gifFps} onChange={(gifFps) => updateSettings({ gifFps })} options={[8, 10, 12, 15, 20].map((value) => ({ value, label: String(value) }))} />
          <SegmentedControl label={t('settings.width')} value={settings.gifWidth} onChange={(gifWidth) => updateSettings({ gifWidth })} options={[320, 480, 640].map((value) => ({ value, label: `${value}px` }))} />
        </SettingsSection>
      ) : (
        !(settings.copyStreams && COPYABLE.includes(settings.format)) && (
          <SettingsSection title={t('convertVideo.encoding')}>
            <SegmentedControl
              label={t('settings.quality')}
              value={settings.quality}
              onChange={(quality) => updateSettings({ quality })}
              options={Object.keys(CONVERT_QUALITY).map((value) => ({ value, label: t(`convertVideo.quality.${value}`) }))}
            />
            <SegmentedControl
              label={t('video.resolution')}
              value={settings.height}
              onChange={(height) => updateSettings({ height })}
              options={['original', 1080, 720, 480].map((value) => ({ value, label: value === 'original' ? t('settings.keepOriginal') : `${value}p`, disabled: value !== 'original' && meta?.height ? value >= meta.height : false }))}
            />
            <SegmentedControl
              label={t('convertVideo.frameRate')}
              value={settings.fps}
              onChange={(fps) => updateSettings({ fps })}
              options={['original', 24, 30, 60].map((value) => ({ value, label: value === 'original' ? t('settings.keepOriginal') : String(value) }))}
            />
            <Switch label={t('merge.keepAudio')} checked={settings.keepAudio} onChange={(keepAudio) => updateSettings({ keepAudio })} />
          </SettingsSection>
        )
      )}
    </>
  )
  const runJob = ({ settings, file, meta, signal, onProgress }) => convertVideo(file, settings, meta, { signal, onProgress })

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-convert.actionTo', { format: target.label })}
        actionIcon={Repeat2}
        processingTitle={t('processing.convertingVideo')}
        successMessage="toasts.videoConverted"
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={(context) => renderControls({ ...context, settings, updateSettings })}
        onProcess={(context) => runJob({ ...context, settings })}
        batch={{
          settings,
          updateSettings,
          renderSettings: renderControls,
          process: runJob,
          outputName: (file, result) => resultFileName(file.name, '', result?.format),
        }}
        renderResult={(context) => <VideoResult {...context} title={t('result.conversionComplete')} suffix="" />}
      />
    </ToolLayout>
  )
}
