import { useState } from 'react'
import { Music } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AUDIO_OUTPUT_FORMATS } from '@/constants/presets'
import { extractAudio } from '@/services/video/videoAudioService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'
import { TimeRangeFields, validateRange } from '../shared/TimeRangeEditor'

const TOOL_ID = 'video-extract-audio'
const DEFAULTS = { format: 'mp3', bitrate: 192, channels: 'stereo', volume: 100, normalize: false, fadeIn: 0, fadeOut: 0 }
const seconds = (value) => `${value}s`

export default function ExtractAudioPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const [range, setRange] = useState(null)
  const resolveRange = (meta) => range ?? { start: 0, end: meta?.duration ?? 0 }
  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-extract-audio.action')}
        actionIcon={Music}
        processingTitle={t('processing.extractingAudio')}
        successMessage="toasts.audioExtracted"
        onFileChange={() => setRange(null)}
        canProcess={({ meta }) => !meta?.duration || !validateRange(resolveRange(meta), meta.duration)}
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
              <SegmentedControl
                label={t('audio.channels')}
                value={settings.channels}
                onChange={(channels) => updateSettings({ channels })}
                options={[
                  { value: 'stereo', label: t('audio.stereo') },
                  { value: 'mono', label: t('audio.mono') },
                ]}
              />
            </SettingsSection>
            {meta?.duration > 0 && (
              <SettingsSection title={t('audio.part')} description={t('audio.partHint')}>
                <TimeRangeFields range={resolveRange(meta)} duration={meta.duration} onRangeChange={setRange} error={validateRange(resolveRange(meta), meta.duration)} />
              </SettingsSection>
            )}
            <SettingsSection title={t('audio.sound')}>
              <Slider label={t('mute.volume')} value={settings.volume} min={0} max={400} step={5} origin={100} onChange={(volume) => updateSettings({ volume })} onDoubleClick={() => updateSettings({ volume: 100 })} formatValue={(value) => `${value}%`} />
              <Switch label={t('mute.normalize')} description={t('mute.normalizeHint')} checked={settings.normalize} onChange={(normalize) => updateSettings({ normalize })} />
              <Slider label={t('fade.in')} value={settings.fadeIn} min={0} max={10} step={0.25} onChange={(fadeIn) => updateSettings({ fadeIn })} formatValue={seconds} />
              <Slider label={t('fade.out')} value={settings.fadeOut} min={0} max={10} step={0.25} onChange={(fadeOut) => updateSettings({ fadeOut })} formatValue={seconds} />
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => extractAudio(file, { ...settings, ...resolveRange(meta) }, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.audioExtracted')} suffix="audio" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
