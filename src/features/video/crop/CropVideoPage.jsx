import { useEffect, useState } from 'react'
import { Crop } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VIDEO_ASPECT_RATIOS, VIDEO_CROP_PRESETS } from '@/constants/presets'
import { formatDimensions } from '@/lib/format'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { cropVideo } from '@/services/video/videoTransformService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { CropArea } from '@/components/media/CropArea'
import { fitAspectRect, roundRect } from '@/components/media/cropGeometry'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'

const TOOL_ID = 'video-crop'
const DEFAULTS = { aspectId: '9:16', outputWidth: 0 }

function aspectValue(id) {
  return VIDEO_ASPECT_RATIOS.find((ratio) => ratio.id === id)?.value ?? null
}

function VideoCropStage({ file, meta, rect, onRectChange, aspect }) {
  const url = useObjectUrl(file)
  if (meta.playable === false) return <VideoPreview file={file} meta={meta} />
  const ratio = meta.width / meta.height
  return (
    <MediaStage className="bg-black">
      <CropArea mediaWidth={meta.width} mediaHeight={meta.height} rect={rect} onChange={onRectChange} aspect={aspect} style={{ width: `min(100%, ${(ratio * 60).toFixed(3)}vh)` }}>
        {url && <video src={url} className="size-full" muted loop autoPlay playsInline />}
      </CropArea>
    </MediaStage>
  )
}

function RectInitializer({ meta, rect, onInit, children }) {
  useEffect(() => {
    if (!rect && meta?.width) onInit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, rect])
  return children
}

export default function CropVideoPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const [rect, setRect] = useState(null)
  const aspect = aspectValue(settings.aspectId)

  const applyAspect = (meta, aspectId) => {
    updateSettings({ aspectId })
    setRect(fitAspectRect(meta.width, meta.height, aspectValue(aspectId), aspectValue(aspectId) ? 1 : 0.9))
  }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <VideoToolFlow
        toolId={TOOL_ID}
        onFileChange={() => setRect(null)}
        actionLabel={t('tools.video-crop.action')}
        actionIcon={Crop}
        processingTitle={t('processing.croppingVideo')}
        successMessage="toasts.videoCropped"
        canProcess={({ meta }) => Boolean(rect && meta?.width && rect.width >= 2 && rect.height >= 2)}
        renderPreview={({ file, meta }) => (
          <RectInitializer meta={meta} rect={rect} onInit={() => setRect(fitAspectRect(meta.width, meta.height, aspect, aspect ? 1 : 0.9))}>
            {rect && meta?.width ? <VideoCropStage file={file} meta={meta} rect={rect} onRectChange={setRect} aspect={aspect} /> : <VideoPreview file={file} meta={meta} />}
          </RectInitializer>
        )}
        renderSettings={({ meta }) => (
          <>
            <SettingsSection title={t('crop.aspectRatio')}>
              <SegmentedControl wrap value={settings.aspectId} onChange={(aspectId) => applyAspect(meta, aspectId)} options={VIDEO_ASPECT_RATIOS.map((ratio) => ({ value: ratio.id, label: ratio.label ?? t('crop.free') }))} />
            </SettingsSection>
            <SettingsSection title={t('video.platformPresets')}>
              <div className="grid grid-cols-2 gap-1.5">
                {VIDEO_CROP_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyAspect(meta, preset.ratio)}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-start text-[13px] text-text transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span className="truncate">{t(`presets.videoCrop.${preset.id}`)}</span>
                    <span className="tabular shrink-0 text-2xs text-muted">{preset.ratio}</span>
                  </button>
                ))}
              </div>
            </SettingsSection>
            {rect && (
              <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                {t('crop.selection')}: <span className="font-semibold text-text">{formatDimensions(Math.round(rect.width), Math.round(rect.height))}</span>
              </p>
            )}
            <SettingsSection title={t('settings.output')}>
              <Select
                label={t('cropVideo.outputWidth')}
                value={settings.outputWidth}
                onChange={(outputWidth) => updateSettings({ outputWidth })}
                options={[0, 2160, 1080, 720, 480].map((value) => ({ value, label: value ? `${value}px` : t('cropVideo.asCropped'), meta: value && rect ? formatDimensions(value, Math.round((value * rect.height) / rect.width)) : undefined }))}
              />
              <p className="-mt-1 text-xs text-muted">{t('cropVideo.outputHint')}</p>
            </SettingsSection>
            {meta?.playable === false && <p className="text-xs text-muted">{t('video.cropNeedsPreview')}</p>}
          </>
        )}
        onProcess={({ file, meta, signal, onProgress }) => cropVideo(file, roundRect(rect), meta, { signal, onProgress }, { outputWidth: settings.outputWidth })}
        renderResult={(context) => <VideoResult {...context} title={t('result.cropComplete')} suffix="cropped" />}
      />
    </ToolLayout>
  )
}
