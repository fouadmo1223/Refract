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
const DEFAULTS = { mode: 'replace', loopAudio: true, audioVolume: 100, originalVolume: 100, delay: 0, skip: 0, fadeIn: 0, fadeOut: 0 }
const seconds = (value) => `${value}s`

export default function AddAudioPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
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
              {settings.mode === 'mix' && (
                <Slider label={t('addAudio.originalVolume')} value={settings.originalVolume} min={0} max={200} onChange={(originalVolume) => updateSettings({ originalVolume })} formatValue={(value) => `${value}%`} />
              )}
              <Switch label={t('addAudio.loop')} description={t('addAudio.loopHint')} checked={settings.loopAudio} onChange={(loopAudio) => updateSettings({ loopAudio })} />
            </SettingsSection>
            <SettingsSection title={t('addAudio.timing')}>
              <Slider label={t('addAudio.delay')} value={settings.delay} min={0} max={30} step={0.5} onChange={(delay) => updateSettings({ delay })} formatValue={seconds} />
              <Slider label={t('addAudio.skip')} value={settings.skip} min={0} max={120} step={0.5} onChange={(skip) => updateSettings({ skip })} formatValue={seconds} />
              <Slider label={t('fade.in')} value={settings.fadeIn} min={0} max={10} step={0.25} onChange={(fadeIn) => updateSettings({ fadeIn })} formatValue={seconds} />
              <Slider label={t('fade.out')} value={settings.fadeOut} min={0} max={10} step={0.25} onChange={(fadeOut) => updateSettings({ fadeOut })} formatValue={seconds} />
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => addAudioToVideo(file, audioFile, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.audioAdded')} suffix="with-audio" showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
