import { RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { rotateVideo } from '@/services/video/videoTransformService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-rotate'
const DEFAULTS = { rotation: 90, flipH: false, flipV: false }

/** CSS-transformed live preview so users see the result before encoding. */
function RotatePreview({ file, meta, settings }) {
  const url = useObjectUrl(file)
  if (meta?.playable === false) return <VideoPreview file={file} meta={meta} />
  const swapped = settings.rotation % 180 !== 0
  const scale = swapped && meta?.width ? Math.min(1, meta.height / meta.width) : 1
  // Screen-space flip after rotation — same order as the FFmpeg filter chain.
  const transform = `scale(${settings.flipH ? -scale : scale}, ${settings.flipV ? -scale : scale}) rotate(${settings.rotation}deg)`
  return (
    <MediaStage className="bg-black">
      {url && <video src={url} className="max-h-[56vh] max-w-full transition-transform duration-300" style={{ transform }} muted loop autoPlay playsInline />}
    </MediaStage>
  )
}

export default function RotateVideoPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const isNoop = settings.rotation === 0 && !settings.flipH && !settings.flipV

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

