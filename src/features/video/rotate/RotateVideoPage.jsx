import { RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { rotateVideo } from '@/services/video/videoTransformService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-rotate'
const DEFAULTS = { rotation: 90, flipH: false, flipV: false, angle: 0, autoCrop: true, fill: '#000000' }

/** CSS-transformed live preview so users see the result before encoding. */
function RotatePreview({ file, meta, settings }) {
  const url = useObjectUrl(file)
  if (meta?.playable === false) return <VideoPreview file={file} meta={meta} />
  const swapped = settings.rotation % 180 !== 0
  const scale = swapped && meta?.width ? Math.min(1, meta.height / meta.width) : 1
  // Screen-space flip after rotation — same order as the FFmpeg filter chain.
  const extra = settings.angle || 0
  // Straightening with auto-crop zooms in just enough to hide the empty corners.
  const zoom = extra && settings.autoCrop ? Math.abs(Math.cos((extra * Math.PI) / 180)) + Math.abs(Math.sin((extra * Math.PI) / 180)) * Math.max(meta?.width / meta?.height || 1, meta?.height / meta?.width || 1) : 1
  const transform = `scale(${settings.flipH ? -scale : scale}, ${settings.flipV ? -scale : scale}) rotate(${settings.rotation + extra}deg) scale(${zoom})`
  return (
    <MediaStage className="overflow-hidden bg-black">
      {url && <video src={url} className="max-h-[56vh] max-w-full transition-transform duration-300" style={{ transform }} muted loop autoPlay playsInline />}
    </MediaStage>
  )
}

export default function RotateVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const isNoop = settings.rotation === 0 && !settings.flipH && !settings.flipV && !settings.angle

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        actionLabel={t('tools.video-rotate.action')}
        actionIcon={RotateCw}
        processingTitle={t('processing.rotatingVideo')}
        successMessage="toasts.videoRotated"
        canProcess={!isNoop}
        renderPreview={({ file, meta }) => <RotatePreview file={file} meta={meta} settings={settings} />}
        renderSettings={() => (
          <>
            <SettingsSection title={t('effects.rotation')}>
              <SegmentedControl value={settings.rotation} onChange={(rotation) => updateSettings({ rotation })} options={[0, 90, 180, 270].map((value) => ({ value, label: `${value}°` }))} />
            </SettingsSection>
            <SettingsSection title={t('crop.straighten')}>
              <Slider
                label={t('effects.customAngle')}
                value={settings.angle}
                min={-45}
                max={45}
                step={0.5}
                origin={0}
                onChange={(angle) => updateSettings({ angle })}
                onDoubleClick={() => updateSettings({ angle: 0 })}
                formatValue={(value) => `${value}°`}
              />
              {settings.angle !== 0 && (
                <>
                  <Switch label={t('effects.autoCrop')} description={t('effects.autoCropHint')} checked={settings.autoCrop} onChange={(autoCrop) => updateSettings({ autoCrop })} />
                  {!settings.autoCrop && <ColorInput label={t('effects.cornerFill')} value={settings.fill} onChange={(fill) => updateSettings({ fill })} />}
                </>
              )}
            </SettingsSection>
            <SettingsSection title={t('effects.flip')}>
              <Switch label={t('crop.flipHorizontal')} checked={settings.flipH} onChange={(flipH) => updateSettings({ flipH })} />
              <Switch label={t('crop.flipVertical')} checked={settings.flipV} onChange={(flipV) => updateSettings({ flipV })} />
            </SettingsSection>
            {isNoop && <p className="text-xs text-muted">{t('video.rotateNoop')}</p>}
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => rotateVideo(file, settings, meta, { signal, onProgress })}
        renderResult={(context) => <VideoResult {...context} title={t('result.rotateComplete')} suffix="rotated" />}
      />
    </ToolLayout>
  )
}

