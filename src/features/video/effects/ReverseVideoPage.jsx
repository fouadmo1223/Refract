import { Rewind, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { REVERSE_RECOMMENDED_MAX_SECONDS, reverseVideo } from '@/services/video/videoEffectsService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-reverse'
const DEFAULTS = { reverseAudio: true }

export default function ReverseVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-reverse.action')}
        actionIcon={Rewind}
        processingTitle={t('processing.reversingVideo')}
        successMessage="toasts.videoReversed"
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => (
          <>
            <VideoInfo file={file} meta={meta} />
            <SettingsSection title={t('reverse.title')}>
              <Switch label={t('reverse.audio')} description={t('reverse.audioHint')} checked={settings.reverseAudio} onChange={(reverseAudio) => updateSettings({ reverseAudio })} />
              {meta?.duration > REVERSE_RECOMMENDED_MAX_SECONDS && (
                <p className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs leading-relaxed text-text-2">
                  <TriangleAlert size={14} className="mt-px shrink-0 text-warning" aria-hidden="true" />
                  {t('reverse.longWarning', { seconds: REVERSE_RECOMMENDED_MAX_SECONDS })}
                </p>
              )}
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => reverseVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.reverseComplete')} suffix="reversed" />}
      />
    </ToolLayout>
  )
}
