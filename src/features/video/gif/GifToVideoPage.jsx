import { FileVideo } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { readImageInfo } from '@/services/image/imageInfoService'
import { gifToVideo } from '@/services/video/videoGifService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { NumberInput } from '@/components/ui/NumberInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'gif-to-video'
const DEFAULTS = { format: 'mp4', loops: 1 }

export default function GifToVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const loopsValid = Number.isInteger(settings.loops) && settings.loops >= 1 && settings.loops <= 20

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.gif}
        loadMeta={readImageInfo}
        actionLabel={t('tools.gif-to-video.action')}
        actionIcon={FileVideo}
        processingTitle={t('processing.convertingGif')}
        successMessage="toasts.videoConverted"
        canProcess={loopsValid}
        renderPreview={({ file }) => <ImagePreview file={file} />}
        renderSettings={() => (
          <SettingsSection title={t('settings.output')}>
            <SegmentedControl
              label={t('settings.outputFormat')}
              value={settings.format}
              onChange={(format) => updateSettings({ format })}
              options={[
                { value: 'mp4', label: 'MP4' },
                { value: 'webm', label: 'WebM' },
              ]}
            />
            <NumberInput label={t('gif.repeat')} description={t('gif.repeatHint')} value={settings.loops} min={1} max={20} onChange={(loops) => updateSettings({ loops })} suffix="×" error={loopsValid ? undefined : 'validation.loopsRange'} />
          </SettingsSection>
        )}
        onProcess={({ file, meta, signal, onProgress }) => gifToVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.conversionComplete')} suffix="" />}
      />
    </ToolLayout>
  )
}
