import { useState } from 'react'
import { Stamp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { readImageInfo } from '@/services/image/imageInfoService'
import { createCanvas, getContext } from '@/services/image/canvas'
import { DEFAULT_WATERMARK, applyWatermark, drawWatermark } from '@/services/image/imageWatermarkService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { FileCard } from '@/components/media/FileCard'
import { FileUploader } from '@/components/media/FileUploader'
import { PositionGrid } from '@/components/media/PositionGrid'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'image-watermark'

function WatermarkPreview({ bitmap, logoBitmap, settings }) {
  const { t } = useTranslation()
  if (!bitmap) {
    return (
      <MediaStage>
        <LoadingState />
      </MediaStage>
    )
  }
  const draw = () => {
    const canvas = createCanvas(bitmap.width, bitmap.height)
    const context = getContext(canvas)
    context.drawImage(bitmap, 0, 0)
    drawWatermark(context, canvas.width, canvas.height, settings, logoBitmap)
    return canvas
  }
  return (
    <MediaStage checkerboard>
      <CanvasView className="h-auto max-h-[62vh] w-auto max-w-full" deps={[bitmap, logoBitmap, settings]} draw={draw} label={t('watermark.preview')} />
    </MediaStage>
  )
}

export default function WatermarkPage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULT_WATERMARK)
  const [file, setFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const { bitmap } = usePreviewBitmap(file, 1400)
  const { bitmap: logoBitmap } = usePreviewBitmap(logoFile, 800)
  const textMissing = settings.type === 'text' && !settings.text.trim()
  const logoMissing = settings.type === 'image' && !logoFile

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={setFile}
        actionLabel={t('tools.image-watermark.action')}
        actionIcon={Stamp}
        processingTitle={t('processing.applyingWatermark')}
        successMessage="toasts.watermarkApplied"
        canProcess={!textMissing && !logoMissing}
        renderPreview={() => <WatermarkPreview bitmap={bitmap} logoBitmap={logoBitmap} settings={settings} />}
        renderSettings={() => (
          <>
            <SettingsSection title={t('watermark.content')}>
              <SegmentedControl
                value={settings.type}
                onChange={(type) => updateSettings({ type })}
                options={[
                  { value: 'text', label: t('watermark.text') },
                  { value: 'image', label: t('watermark.logo') },
                ]}
              />
              {settings.type === 'text' ? (
                <>
                  <Input label={t('watermark.textLabel')} value={settings.text} onChange={(event) => updateSettings({ text: event.target.value })} error={textMissing ? 'validation.watermarkTextRequired' : undefined} dir="auto" maxLength={120} />
                  <div className="grid grid-cols-2 gap-3">
                    <ColorInput label={t('watermark.color')} value={settings.color} onChange={(color) => updateSettings({ color })} />
                    <SegmentedControl
                      label={t('watermark.weight')}
                      value={settings.fontWeight}
                      onChange={(fontWeight) => updateSettings({ fontWeight })}
                      options={[
                        { value: 400, label: 'Aa', ariaLabel: t('watermark.regular') },
                        { value: 700, label: <strong>Aa</strong>, ariaLabel: t('watermark.bold') },
                      ]}
                    />
                  </div>
                </>
              ) : logoFile ? (
                <FileCard file={logoFile} onRemove={() => setLogoFile(null)} />
              ) : (
                <FileUploader profile={UPLOAD_PROFILES.image} onFiles={([next]) => setLogoFile(next)} variant="compact" title={t('watermark.dropLogo')} pasteEnabled={false} />
              )}
            </SettingsSection>
            <SettingsSection title={t('watermark.placement')}>
              <PositionGrid label={t('watermark.position')} value={settings.position} onChange={(position) => updateSettings({ position })} />
              <Slider label={t('watermark.size')} value={settings.size} min={3} max={100} onChange={(size) => updateSettings({ size })} formatValue={(value) => `${value}%`} />
              <Slider label={t('watermark.opacity')} value={settings.opacity} min={5} max={100} onChange={(opacity) => updateSettings({ opacity })} formatValue={(value) => `${value}%`} />
              <Slider label={t('watermark.rotation')} value={settings.rotation} min={-180} max={180} origin={0} onChange={(rotation) => updateSettings({ rotation })} formatValue={(value) => `${value}°`} />
              <Slider label={t('watermark.margin')} value={settings.margin} min={0} max={20} onChange={(margin) => updateSettings({ margin })} formatValue={(value) => `${value}%`} />
            </SettingsSection>
          </>
        )}
        onProcess={({ file: source, onProgress }) => applyWatermark(source, settings, logoFile, { onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.watermarkComplete')} suffix="watermarked" />}
      />
    </ToolLayout>
  )
}
