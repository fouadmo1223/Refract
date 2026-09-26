import { Gauge } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VIDEO_SPEEDS } from '@/constants/presets'
import { formatDuration } from '@/lib/format'
import { SPEED_AUDIO_MODES, changeVideoSpeed } from '@/services/video/videoSpeedService'
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

const TOOL_ID = 'video-speed'
const DEFAULTS = { speed: 2, audio: 'keep', smooth: false }

export default function VideoSpeedPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  // Older saved settings used a keepAudio boolean.
  const settings = { ...DEFAULTS, ...stored, audio: stored.audio ?? (stored.keepAudio === false ? 'mute' : 'keep') }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-speed.action')}
        actionIcon={Gauge}
        processingTitle={t('processing.changingSpeed')}
        successMessage="toasts.speedChanged"
        canProcess={settings.speed !== 1}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => (
          <>
            <VideoInfo file={file} meta={meta} />
            <SettingsSection title={t('speed.title')}>
              <SegmentedControl wrap value={settings.speed} onChange={(speed) => updateSettings({ speed })} options={VIDEO_SPEEDS.map((speed) => ({ value: speed, label: `${speed}×` }))} />
              <Slider
                label={t('speed.custom')}
                value={settings.speed}
                min={0.25}
                max={4}
                step={0.05}
                origin={1}
                onChange={(speed) => updateSettings({ speed: Number(speed.toFixed(2)) })}
                onDoubleClick={() => updateSettings({ speed: 1 })}
                formatValue={(value) => `${Number(value.toFixed(2))}×`}
              />
              {meta?.duration && (
                <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                  {t('speed.newDuration')}: <span className="font-semibold text-text">{formatDuration(meta.duration / settings.speed)}</span>
                </p>
              )}
              {settings.speed === 1 && <p className="text-xs text-muted">{t('speed.sameSpeed')}</p>}
            </SettingsSection>
            <SettingsSection title={t('speed.audioTitle')}>
              <SegmentedControl
                value={settings.audio}
                onChange={(audio) => updateSettings({ audio })}
                options={SPEED_AUDIO_MODES.map((value) => ({ value, label: t(`speed.audioModes.${value}`) }))}
              />
              <p className="-mt-1 text-xs text-muted">{t(`speed.audioHints.${settings.audio}`)}</p>
            </SettingsSection>
            {settings.speed < 1 && (
              <SettingsSection title={t('speed.motion')}>
                <Switch label={t('speed.smooth')} description={t('speed.smoothHint')} checked={settings.smooth} onChange={(smooth) => updateSettings({ smooth })} />
              </SettingsSection>
            )}
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => changeVideoSpeed(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.speedComplete')} suffix={`${settings.speed}x`} />}
      />
    </ToolLayout>
  )
}
