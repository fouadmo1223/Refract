import { FileVideo } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { readImageInfo } from '@/services/image/imageInfoService'
import { gifToVideo } from '@/services/video/videoGifService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { NumberInput } from '@/components/ui/NumberInput'
import { Slider } from '@/components/ui/Slider'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { SettingsSection } from '@/components/layout/Panels'
import { ImagePreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'gif-to-video'
const DEFAULTS = { format: 'mp4', loops: 1, speed: 1, scale: 1, background: '#FFFFFF' }

export default function GifToVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
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
          <>
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
          <SettingsSection title={t('gif.playback')}>
            <Slider label={t('speed.title')} value={settings.speed} min={0.25} max={3} step={0.25} origin={1} onChange={(speed) => updateSettings({ speed })} onDoubleClick={() => updateSettings({ speed: 1 })} formatValue={(value) => `${value}×`} />
            <SegmentedControl label={t('gif.upscale')} value={settings.scale} onChange={(scale) => updateSettings({ scale })} options={[1, 2, 3, 4].map((value) => ({ value, label: `${value}×` }))} />
            <p className="-mt-1 text-xs text-muted">{t('gif.upscaleHint')}</p>
            <ColorInput label={t('gif.background')} value={settings.background} onChange={(background) => updateSettings({ background })} />
          </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => gifToVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.conversionComplete')} suffix="" />}
      />
    </ToolLayout>
  )
}
