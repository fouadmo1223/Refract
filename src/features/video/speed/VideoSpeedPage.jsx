import { Gauge } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VIDEO_SPEEDS } from '@/constants/presets'
import { formatDuration } from '@/lib/format'
import { changeVideoSpeed } from '@/services/video/videoSpeedService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-speed'
const DEFAULTS = { speed: 2, keepAudio: true }

export default function VideoSpeedPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)

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
              {meta?.duration && (
                <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                  {t('speed.newDuration')}: <span className="font-semibold text-text">{formatDuration(meta.duration / settings.speed)}</span>
                </p>
              )}
              {settings.speed === 1 && <p className="text-xs text-muted">{t('speed.sameSpeed')}</p>}
              <Switch label={t('speed.keepAudio')} description={t('speed.keepAudioHint')} checked={settings.keepAudio} onChange={(keepAudio) => updateSettings({ keepAudio })} />
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => changeVideoSpeed(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.speedComplete')} suffix={`${settings.speed}x`} />}
      />
    </ToolLayout>
  )
}
