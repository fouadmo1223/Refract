import { VolumeX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { muteVideo } from '@/services/video/videoAudioService'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { VideoInfo } from '../shared/VideoInfo'

const TOOL_ID = 'video-mute'

export default function MuteVideoPage() {
  const { t } = useTranslation()
  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-mute.action')}
        actionIcon={VolumeX}
        processingTitle={t('processing.removingAudio')}
        successMessage="toasts.audioRemoved"
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={({ file, meta }) => (
          <>
            <VideoInfo file={file} meta={meta} />
            <SettingsSection title={t('mute.title')}>
              <p className="text-[13px] leading-relaxed text-text-2">{t('mute.description')}</p>
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => muteVideo(file, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.audioRemoved')} suffix="muted" />}
      />
    </ToolLayout>
  )
}
