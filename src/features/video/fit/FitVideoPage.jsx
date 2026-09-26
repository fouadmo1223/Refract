import { RectangleVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDimensions } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { even } from '@/services/video/encodingArgs'
import { FIT_SIZES, fitVideoToAspect } from '@/services/video/videoLookService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-fit'
const DEFAULTS = { aspect: '9:16', background: 'blur', color: '#000000', resolution: 'hd' }

/** Live mock of the output frame: blurred copy behind, full video on top. */
function FitPreview({ file, meta, settings }) {
  const url = useObjectUrl(file)
  if (meta?.playable === false) return <VideoPreview file={file} meta={meta} />
  const { width, height } = FIT_SIZES[settings.aspect]
  return (
    <MediaStage>
      <div className="relative mx-auto overflow-hidden rounded-md shadow-md" style={{ aspectRatio: `${width} / ${height}`, width: `min(100%, ${((width / height) * 58).toFixed(3)}vh)`, background: settings.color }}>
        {url && settings.background === 'blur' && <video src={url} className="absolute inset-0 size-full scale-110 object-cover blur-xl" muted loop autoPlay playsInline aria-hidden="true" />}
        {url && <video src={url} className="relative size-full object-contain" muted loop autoPlay playsInline />}
      </div>
    </MediaStage>
  )
}

export default function FitVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const size = FIT_SIZES[settings.aspect]

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-fit.action')}
        actionIcon={RectangleVertical}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        renderPreview={({ file, meta }) => <FitPreview file={file} meta={meta} settings={settings} />}
        renderSettings={() => (
          <>
            <SettingsSection title={t('fit.canvas')}>
              <SegmentedControl label={t('crop.aspectRatio')} value={settings.aspect} onChange={(aspect) => updateSettings({ aspect })} options={Object.keys(FIT_SIZES).map((value) => ({ value, label: value }))} />
              <SegmentedControl
                label={t('fit.resolution')}
                value={settings.resolution}
                onChange={(resolution) => updateSettings({ resolution })}
                options={[
                  { value: 'hd', label: formatDimensions(size.width, size.height) },
                  { value: 'sd', label: formatDimensions(even((size.width * 2) / 3), even((size.height * 2) / 3)) },
                ]}
              />
            </SettingsSection>
            <SettingsSection title={t('removeBg.background')}>
              <SegmentedControl
                value={settings.background}
                onChange={(background) => updateSettings({ background })}
                options={[
                  { value: 'blur', label: t('fit.blurred') },
                  { value: 'color', label: t('removeBg.modes.color') },
                ]}
              />
              {settings.background === 'color' && <ColorInput label={t('settings.backgroundColor')} value={settings.color} onChange={(color) => updateSettings({ color })} />}
              <p className="text-xs text-muted">{t('fit.hint')}</p>
            </SettingsSection>
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => fitVideoToAspect(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.effectComplete')} suffix={settings.aspect.replace(':', 'x')} showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
