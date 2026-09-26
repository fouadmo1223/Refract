import { useState } from 'react'
import { Type } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { createCanvas, getContext } from '@/services/image/canvas'
import { readImageInfo } from '@/services/image/imageInfoService'
import { DEFAULT_TEXT_OVERLAY, TEXT_FONTS, applyTextOverlay, drawTextOverlay } from '@/services/image/textOverlayService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ColorInput } from '@/components/ui/ColorInput'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'image-text'
const DEFAULTS = { ...DEFAULT_TEXT_OVERLAY, topText: 'TOP TEXT', bottomText: 'BOTTOM TEXT' }

function TextPreview({ bitmap, settings }) {
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
    drawTextOverlay(context, canvas.width, canvas.height, settings)
    return canvas
  }
  return (
    <MediaStage checkerboard>
      <CanvasView className="h-auto max-h-[62vh] w-auto max-w-full" deps={[bitmap, settings]} draw={draw} label={t('common.preview')} />
    </MediaStage>
  )
}

export default function AddTextImagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [file, setFile] = useState(null)
  const { bitmap } = usePreviewBitmap(file, 1400)
  const hasText = Boolean(settings.topText.trim() || settings.bottomText.trim())

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={setFile}
        actionLabel={t('tools.image-text.action')}
        actionIcon={Type}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        canProcess={hasText}
        renderPreview={() => <TextPreview bitmap={bitmap} settings={settings} />}
        renderSettings={() => (
          <>
            <SettingsSection title={t('textTool.content')}>
              <Textarea label={t('textTool.top')} value={settings.topText} onChange={(event) => updateSettings({ topText: event.target.value })} textareaClassName="min-h-14" dir="auto" maxLength={200} />
              <Textarea
                label={t('textTool.bottom')}
                value={settings.bottomText}
                onChange={(event) => updateSettings({ bottomText: event.target.value })}
                textareaClassName="min-h-14"
                dir="auto"
                maxLength={200}
                error={hasText ? undefined : 'validation.textRequired'}
              />
            </SettingsSection>
            <SettingsSection title={t('textTool.style')}>
              <Select label={t('textTool.font')} value={settings.font} onChange={(font) => updateSettings({ font })} options={Object.keys(TEXT_FONTS).map((id) => ({ value: id, label: t(`textTool.fonts.${id}`) }))} />
              <Slider label={t('watermark.size')} value={settings.size} min={3} max={25} onChange={(size) => updateSettings({ size })} formatValue={(value) => `${value}%`} />
              <div className="grid grid-cols-2 gap-3">
                <ColorInput label={t('textTool.fill')} value={settings.fill} onChange={(fill) => updateSettings({ fill })} />
                <ColorInput label={t('textTool.outline')} value={settings.stroke} onChange={(stroke) => updateSettings({ stroke })} />
              </div>
              <Slider label={t('textTool.outlineWidth')} value={settings.strokeWidth} min={0} max={30} onChange={(strokeWidth) => updateSettings({ strokeWidth })} />
              <Switch label={t('textTool.uppercase')} checked={settings.uppercase} onChange={(uppercase) => updateSettings({ uppercase })} />
              <Switch label={t('textTool.background')} checked={settings.background} onChange={(background) => updateSettings({ background })} />
              {settings.background && <ColorInput label={t('settings.backgroundColor')} value={settings.backgroundColor} onChange={(backgroundColor) => updateSettings({ backgroundColor })} />}
            </SettingsSection>
          </>
        )}
        onProcess={({ file: source, onProgress }) => applyTextOverlay(source, settings, { onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.effectComplete')} suffix="text" />}
      />
    </ToolLayout>
  )
}
