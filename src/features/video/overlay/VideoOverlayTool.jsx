import { useState } from 'react'
import { Stamp, Type } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { DEFAULT_WATERMARK, drawWatermark } from '@/services/image/imageWatermarkService'
import { overlayImageOnVideo, renderOverlayImage } from '@/services/video/videoOverlayService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { FileCard } from '@/components/media/FileCard'
import { FileUploader } from '@/components/media/FileUploader'
import { PositionGrid } from '@/components/media/PositionGrid'
import { VideoPreview } from '@/components/media/Previews'
import { VideoToolFlow } from '../shared/VideoToolFlow'
import { VideoResult } from '../shared/VideoResult'
import { TimeRangeFields, validateRange } from '../shared/TimeRangeEditor'

const PREVIEW_WIDTH = 960

const PRESETS = {
  text: { ...DEFAULT_WATERMARK, text: 'Your title here', size: 50, opacity: 100, position: 'bottom-center', margin: 6, box: true, boxColor: '#000000', wholeVideo: true },
  watermark: { ...DEFAULT_WATERMARK, size: 18, wholeVideo: true },
}

/** Video with the overlay drawn live on top (scaled preview of the exported PNG). */
function OverlayPreview({ file, meta, settings, logo }) {
  const { t } = useTranslation()
  const url = useObjectUrl(file)
  if (meta?.playable === false || !meta?.width) return <VideoPreview file={file} meta={meta} />
  const width = Math.min(PREVIEW_WIDTH, meta.width)
  const height = Math.round((meta.height / meta.width) * width)
  return (
    <MediaStage className="bg-black">
      <div className="relative mx-auto" style={{ aspectRatio: `${meta.width} / ${meta.height}`, width: `min(100%, ${((meta.width / meta.height) * 60).toFixed(3)}vh)` }}>
        {url && <video src={url} className="size-full" muted loop autoPlay playsInline />}
        <CanvasView
          className="pointer-events-none absolute inset-0 size-full"
          deps={[settings, logo, width, height]}
          label={t('common.preview')}
          draw={() => {
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            drawWatermark(canvas.getContext('2d'), width, height, settings, logo)
            return canvas
          }}
        />
      </div>
    </MediaStage>
  )
}

/**
 * Shared page for "Add text to video" (mode="text") and "Watermark video" (mode="watermark").
 */
export function VideoOverlayTool({ toolId, mode }) {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(toolId, PRESETS[mode])
  const [logoFile, setLogoFile] = useState(null)
  const [range, setRange] = useState(null)
  const { bitmap: logo } = usePreviewBitmap(logoFile, 1200)
  const isLogo = settings.type === 'image'
  const resolveRange = (meta) => range ?? { start: 0, end: Math.min(meta?.duration ?? 0, 3) }
  const contentMissing = isLogo ? !logoFile : !settings.text.trim()

  return (
    <ToolLayout toolId={toolId}>
      <VideoToolFlow
        toolId={toolId}
        onFileChange={() => setRange(null)}
        actionLabel={t(`tools.${toolId}.action`)}
        actionIcon={mode === 'text' ? Type : Stamp}
        processingTitle={t('processing.applyingOverlay')}
        successMessage="toasts.overlayApplied"
        canProcess={({ meta }) => !contentMissing && Boolean(meta?.width) && (settings.wholeVideo || !validateRange(resolveRange(meta), meta.duration))}
        renderPreview={({ file, meta }) => <OverlayPreview file={file} meta={meta} settings={settings} logo={isLogo ? logo : null} />}
        renderSettings={({ meta }) => (
          <>
            <SettingsSection title={t('watermark.content')}>
              {mode === 'watermark' && (
                <SegmentedControl
                  value={settings.type}
                  onChange={(type) => updateSettings({ type })}
                  options={[
                    { value: 'text', label: t('watermark.text') },
                    { value: 'image', label: t('watermark.logo') },
                  ]}
                />
              )}
              {isLogo ? (
                logoFile ? (
                  <FileCard file={logoFile} onRemove={() => setLogoFile(null)} />
                ) : (
                  <FileUploader profile={UPLOAD_PROFILES.image} onFiles={([next]) => setLogoFile(next)} variant="compact" title={t('watermark.dropLogo')} pasteEnabled={false} />
                )
              ) : (
                <>
                  <Textarea
                    label={t('watermark.textLabel')}
                    value={settings.text}
                    onChange={(event) => updateSettings({ text: event.target.value })}
                    textareaClassName="min-h-14"
                    dir="auto"
                    maxLength={120}
                    error={settings.text.trim() ? undefined : 'validation.textRequired'}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <ColorInput label={t('watermark.color')} value={settings.color} onChange={(color) => updateSettings({ color })} />
                    {settings.box && <ColorInput label={t('textTool.boxColor')} value={settings.boxColor} onChange={(boxColor) => updateSettings({ boxColor })} />}
                  </div>
                  <Switch label={t('textTool.boxBehind')} checked={settings.box} onChange={(box) => updateSettings({ box })} />
                </>
              )}
            </SettingsSection>
            <SettingsSection title={t('watermark.placement')}>
              <PositionGrid label={t('watermark.position')} value={settings.position} onChange={(position) => updateSettings({ position })} />
              <Slider label={t('watermark.size')} value={settings.size} min={3} max={100} onChange={(size) => updateSettings({ size })} formatValue={(value) => `${value}%`} />
              <Slider label={t('watermark.opacity')} value={settings.opacity} min={5} max={100} onChange={(opacity) => updateSettings({ opacity })} formatValue={(value) => `${value}%`} />
              <Slider label={t('watermark.margin')} value={settings.margin} min={0} max={20} onChange={(margin) => updateSettings({ margin })} formatValue={(value) => `${value}%`} />
              {mode === 'watermark' && (
                <Slider label={t('watermark.rotation')} value={settings.rotation} min={-180} max={180} origin={0} onChange={(rotation) => updateSettings({ rotation })} formatValue={(value) => `${value}°`} />
              )}
            </SettingsSection>
            <SettingsSection title={t('textTool.timing')}>
              <Switch label={t('textTool.wholeVideo')} checked={settings.wholeVideo} onChange={(wholeVideo) => updateSettings({ wholeVideo })} />
              {!settings.wholeVideo && meta?.duration && (
                <TimeRangeFields range={resolveRange(meta)} duration={meta.duration} onRangeChange={setRange} error={validateRange(resolveRange(meta), meta.duration)} />
              )}
            </SettingsSection>
          </>
        )}
        onProcess={async ({ file, meta, signal, onProgress }) => {
          const overlay = await renderOverlayImage(meta.width, meta.height, (context, width, height) => drawWatermark(context, width, height, settings, isLogo ? logo : null))
          return overlayImageOnVideo(file, overlay, meta, settings.wholeVideo ? {} : resolveRange(meta), { signal, onProgress })
        }}
        renderResult={(context) => <VideoResult {...context} title={t('result.overlayComplete')} suffix={mode === 'text' ? 'text' : 'watermarked'} showSizeChange={false} />}
      />
    </ToolLayout>
  )
}
