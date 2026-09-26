import { Repeat2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VIDEO_OUTPUT_FORMATS } from '@/constants/presets'
import { getExtension } from '@/lib/files'
import { convertVideo } from '@/services/video/videoConversionService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-convert'
const DEFAULTS = { format: 'mp4', copyStreams: false }
const COPYABLE = ['mp4', 'mov', 'mkv']

export default function ConvertVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const target = VIDEO_OUTPUT_FORMATS.find((format) => format.id === settings.format)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-convert.actionTo', { format: target.label })}
        actionIcon={Repeat2}
        processingTitle={t('processing.convertingVideo')}
        successMessage="toasts.videoConverted"
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => (
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
                  disabled: format.ext === getExtension(file.name),
                }))}
              />
              {COPYABLE.includes(settings.format) && (
                <Switch label={t('video.copyStreams')} description={t('video.copyStreamsHint')} checked={settings.copyStreams} onChange={(copyStreams) => updateSettings({ copyStreams })} />
              )}
              {settings.format === 'gif' && <p className="text-xs text-muted">{t('video.gifConvertHint')}</p>}
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => convertVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.conversionComplete')} suffix="" />}
      />
    </ToolLayout>
  )
}
