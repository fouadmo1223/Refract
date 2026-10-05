import { Volume2, VolumeX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { resultFileName } from '@/lib/files'
import { DEFAULT_VIDEO_AUDIO, adjustVideoAudio } from '@/services/video/videoAudioService'
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

const TOOL_ID = 'video-mute'
const seconds = (value) => `${value}s`

export default function MuteVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULT_VIDEO_AUDIO)
  const settings = { ...DEFAULT_VIDEO_AUDIO, ...stored }
  const mute = settings.mode === 'mute'
  const changesSomething = mute || settings.volume !== 100 || settings.normalize || settings.fadeIn > 0 || settings.fadeOut > 0

  // Controls and processing take settings as arguments so multi-file mode can give each file its own.
  const renderControls = ({ settings, updateSettings, file, meta }) => {
    const mute = settings.mode === 'mute'
    return (
      <>
        <VideoInfo file={file} meta={meta} />
        <SettingsSection title={t('mute.title')}>
          <SegmentedControl
            value={settings.mode}
            onChange={(mode) => updateSettings({ mode })}
            options={[
              { value: 'mute', label: t('mute.modes.mute') },
              { value: 'adjust', label: t('mute.modes.adjust') },
            ]}
          />
          <p className="-mt-1 text-[13px] leading-relaxed text-text-2">{t(mute ? 'mute.description' : 'mute.adjustDescription')}</p>
          {!mute && (
            <>
              <Slider
                label={t('mute.volume')}
                value={settings.volume}
                min={0}
                max={400}
                step={5}
                origin={100}
                onChange={(volume) => updateSettings({ volume })}
                onDoubleClick={() => updateSettings({ volume: 100 })}
                formatValue={(value) => `${value}%`}
              />
              <Switch label={t('mute.normalize')} description={t('mute.normalizeHint')} checked={settings.normalize} onChange={(normalize) => updateSettings({ normalize })} />
              <Slider label={t('fade.in')} value={settings.fadeIn} min={0} max={10} step={0.25} onChange={(fadeIn) => updateSettings({ fadeIn })} formatValue={seconds} />
              <Slider label={t('fade.out')} value={settings.fadeOut} min={0} max={10} step={0.25} onChange={(fadeOut) => updateSettings({ fadeOut })} formatValue={seconds} />
            </>
          )}
        </SettingsSection>
      </>
    )
  }
  const runJob = ({ settings, file, meta, signal, onProgress }) => adjustVideoAudio(file, settings, meta, { signal, onProgress })

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={mute ? t('tools.video-mute.action') : t('mute.applyAction')}
        actionIcon={mute ? VolumeX : Volume2}
        processingTitle={mute ? t('processing.removingAudio') : t('processing.applyingEffect')}
        successMessage={mute ? 'toasts.audioRemoved' : 'toasts.effectApplied'}
        canProcess={changesSomething}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={(context) => renderControls({ ...context, settings, updateSettings })}
        onProcess={(context) => runJob({ ...context, settings })}
        batch={{
          settings,
          updateSettings,
          renderSettings: renderControls,
          process: runJob,
          outputName: (file, result, fileSettings) => resultFileName(file.name, fileSettings.mode === 'mute' ? 'muted' : 'audio', result?.format),
        }}
        renderResult={(context) => <VideoResult {...context} title={mute ? t('result.audioRemoved') : t('result.effectComplete')} suffix={mute ? 'muted' : 'audio'} />}
      />
    </ToolLayout>
  )
}
