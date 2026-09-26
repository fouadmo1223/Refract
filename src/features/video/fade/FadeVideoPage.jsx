import { Sunset } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fadeVideo } from '@/services/video/videoLookService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-fade'
const DEFAULTS = { fadeIn: 1, fadeOut: 1, fadeAudio: true }

export default function FadeVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const isValid = (meta) => Boolean(meta?.duration) && settings.fadeIn + settings.fadeOut > 0 && settings.fadeIn + settings.fadeOut <= meta.duration

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-fade.action')}
        actionIcon={Sunset}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={({ meta }) => isValid(meta)}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => (
          <>
            <VideoInfo file={file} meta={meta} />
            <SettingsSection title={t('fade.title')}>
              <Slider label={t('fade.in')} value={settings.fadeIn} min={0} max={5} step={0.25} onChange={(fadeIn) => updateSettings({ fadeIn })} formatValue={(value) => `${value}s`} />
              <Slider label={t('fade.out')} value={settings.fadeOut} min={0} max={5} step={0.25} onChange={(fadeOut) => updateSettings({ fadeOut })} formatValue={(value) => `${value}s`} />
              <Switch label={t('fade.audio')} checked={settings.fadeAudio} onChange={(fadeAudio) => updateSettings({ fadeAudio })} />
              {!isValid(meta) && <p className="text-xs font-medium text-danger">{t(settings.fadeIn + settings.fadeOut === 0 ? 'validation.fadeRequired' : 'validation.fadeTooLong')}</p>}
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => fadeVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.effectComplete')} suffix="fade" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
