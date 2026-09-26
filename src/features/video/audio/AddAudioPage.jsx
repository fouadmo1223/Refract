import { useState } from 'react'
import { AudioLines } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { addAudioToVideo } from '@/services/video/videoAudioService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { FileCard } from '@/components/media/FileCard'
import { FileUploader } from '@/components/media/FileUploader'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-add-audio'
const DEFAULTS = { mode: 'replace', loopAudio: true, audioVolume: 100 }

export default function AddAudioPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [audioFile, setAudioFile] = useState(null)

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-add-audio.action')}
        actionIcon={AudioLines}
        processingTitle={t('processing.addingAudio')}
        successMessage="toasts.audioAdded"
        canProcess={Boolean(audioFile)}
        renderPreview={({ file, meta }) => <VideoPreview file={file} meta={meta} />}
        renderSettings={() => (
          <>
            <SettingsSection title={t('addAudio.track')}>
              {audioFile ? (
                <FileCard file={audioFile} onRemove={() => setAudioFile(null)} />
              ) : (
                <FileUploader profile={UPLOAD_PROFILES.audio} onFiles={([next]) => setAudioFile(next)} variant="compact" pasteEnabled={false} />
              )}
            </SettingsSection>
            <SettingsSection title={t('addAudio.options')}>
              <SegmentedControl
                value={settings.mode}
                onChange={(mode) => updateSettings({ mode })}
                options={[
                  { value: 'replace', label: t('addAudio.replace') },
                  { value: 'mix', label: t('addAudio.mix') },
                ]}
              />
              <p className="-mt-1 text-xs text-muted">{t(`addAudio.${settings.mode}Hint`)}</p>
              <Slider label={t('addAudio.volume')} value={settings.audioVolume} min={0} max={200} onChange={(audioVolume) => updateSettings({ audioVolume })} formatValue={(value) => `${value}%`} />
              <Switch label={t('addAudio.loop')} description={t('addAudio.loopHint')} checked={settings.loopAudio} onChange={(loopAudio) => updateSettings({ loopAudio })} />
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => addAudioToVideo(file, audioFile, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.audioAdded')} suffix="with-audio" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
