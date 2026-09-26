import { Music } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AUDIO_OUTPUT_FORMATS } from '@/constants/presets'
import { extractAudio } from '@/services/video/videoAudioService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-extract-audio'
const DEFAULTS = { format: 'mp3', bitrate: 192 }

export default function ExtractAudioPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-extract-audio.action')}
        actionIcon={Music}
        processingTitle={t('processing.extractingAudio')}
        successMessage="toasts.audioExtracted"
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => (
          <>
            <VideoInfo file={file} meta={meta} />
            <SettingsSection title={t('audio.output')}>
              <SegmentedControl
                label={t('settings.outputFormat')}
                value={settings.format}
                onChange={(format) => updateSettings({ format })}
                options={AUDIO_OUTPUT_FORMATS.map((format) => ({ value: format.id, label: format.label }))}
              />
              <p className="-mt-1 text-xs text-muted">{t(`audio.formats.${settings.format}`)}</p>
              {settings.format !== 'wav' && (
                <SegmentedControl
                  label={t('audio.bitrate')}
                  value={settings.bitrate}
                  onChange={(bitrate) => updateSettings({ bitrate })}
                  options={[128, 192, 256, 320].map((value) => ({ value, label: `${value}k` }))}
                />
              )}
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => extractAudio(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.audioExtracted')} suffix="audio" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
