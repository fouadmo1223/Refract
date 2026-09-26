import { useState } from 'react'
import { Grid2x2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { ICO_SIZES } from '@/constants/presets'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { toCanvas } from '@/services/image/canvas'
import { DEFAULT_ICO_STYLE, createIco, renderIconSquare } from '@/services/image/icoService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Checkbox } from '@/components/ui/Checkbox'
import { ColorInput } from '@/components/ui/ColorInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage, SettingsSection } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'

const TOOL_ID = 'image-ico'
const DEFAULTS = { sizes: [16, 32, 48, 256], ...DEFAULT_ICO_STYLE }
const PREVIEW_SIZES = [16, 32, 48, 128]

/** Live icon previews at real pixel sizes, plus a large one to judge padding and corners. */
function IconPreview({ bitmap, style }) {
  const { t } = useTranslation()
  if (!bitmap) {
    return (
      <MediaStage>
        <LoadingState />
      </MediaStage>
    )
  }
  const source = toCanvas(bitmap)
  const styleKey = JSON.stringify(style)
  return (
    <MediaStage checkerboard>
      <div className="flex flex-col items-center gap-6 py-4">
        <CanvasView className="size-48 drop-shadow-md" deps={[bitmap, styleKey]} draw={() => renderIconSquare(source, 256, style)} label={t('common.preview')} />
        <div className="flex items-end gap-5 rounded-lg bg-surface/80 px-4 py-3 ring-1 ring-border backdrop-blur-sm">
          {PREVIEW_SIZES.map((size) => (
            <div key={size} className="flex flex-col items-center gap-1.5">
              <CanvasView style={{ width: size, height: size, imageRendering: size <= 32 ? 'pixelated' : 'auto' }} deps={[bitmap, styleKey, size]} draw={() => renderIconSquare(source, size, style)} label={`${size}px`} />
              <span className="tabular text-2xs text-muted">{size}px</span>
            </div>
          ))}
        </div>
      </div>
    </MediaStage>
  )
}

export default function IcoConverterPage() {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const settings = { ...DEFAULTS, ...stored }
  const [file, setFile] = useState(null)
  const { bitmap } = usePreviewBitmap(file, 512)
  const toggleSize = (size, checked) => updateSettings({ sizes: checked ? [...settings.sizes, size] : settings.sizes.filter((value) => value !== size) })
  const allSelected = settings.sizes.length === ICO_SIZES.length
  const style = { fit: settings.fit, padding: settings.padding, background: settings.background, backgroundColor: settings.backgroundColor, radius: settings.radius }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={setFile}
        actionLabel={t('tools.image-ico.action')}
        actionIcon={Grid2x2}
        processingTitle={t('processing.creatingIcon')}
        successMessage="toasts.iconCreated"
        canProcess={settings.sizes.length > 0}
        renderPreview={() => <IconPreview bitmap={bitmap} style={style} />}
        renderSettings={({ meta }) => (
          <>
            <SettingsSection
              title={t('ico.sizes')}
              action={
                <Checkbox
                  label={t('common.selectAll')}
                  checked={allSelected}
                  indeterminate={!allSelected && settings.sizes.length > 0}
                  onChange={() => updateSettings({ sizes: allSelected ? [] : [...ICO_SIZES] })}
                />
              }
            >
              <div className="grid grid-cols-2 gap-2.5">
                {ICO_SIZES.map((size) => (
                  <Checkbox key={size} label={`${size} × ${size}`} checked={settings.sizes.includes(size)} onChange={(checked) => toggleSize(size, checked)} />
                ))}
              </div>
              {settings.sizes.length === 0 && <p className="text-xs font-medium text-danger" role="alert">{t('validation.selectAtLeastOneSize')}</p>}
            </SettingsSection>
            <SettingsSection title={t('ico.style')}>
              {meta && meta.width !== meta.height && (
                <SegmentedControl
                  label={t('ico.fit')}
                  value={settings.fit}
                  onChange={(fit) => updateSettings({ fit })}
                  options={[
                    { value: 'contain', label: t('ico.fits.contain') },
                    { value: 'cover', label: t('ico.fits.cover') },
                  ]}
                />
              )}
              <Slider label={t('ico.padding')} value={settings.padding} min={0} max={30} onChange={(padding) => updateSettings({ padding })} formatValue={(value) => `${value}%`} />
              <Slider label={t('border.radius')} value={settings.radius} min={0} max={50} onChange={(radius) => updateSettings({ radius })} formatValue={(value) => (value >= 50 ? t('ico.circle') : `${value}%`)} />
              <SegmentedControl
                label={t('ico.background')}
                value={settings.background}
                onChange={(background) => updateSettings({ background })}
                options={[
                  { value: 'transparent', label: t('effects.fills.transparent') },
                  { value: 'color', label: t('effects.fills.color') },
                ]}
              />
              {settings.background === 'color' && <ColorInput label={t('settings.backgroundColor')} value={settings.backgroundColor} onChange={(backgroundColor) => updateSettings({ backgroundColor })} />}
            </SettingsSection>
          </>
        )}
        onProcess={({ file: source, onProgress }) => createIco(source, settings.sizes, style, { onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.iconComplete')} suffix="" compare={false} />}
      />
    </ToolLayout>
  )
}
