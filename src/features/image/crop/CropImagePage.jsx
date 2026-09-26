import { useEffect, useState } from 'react'
import { Crop, FlipHorizontal2, FlipVertical2, RotateCcw, RotateCcwSquare, RotateCwSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { CONVERTIBLE_FORMATS } from '@/constants/imageFormats'
import { IMAGE_ASPECT_RATIOS } from '@/constants/presets'
import { formatDimensions } from '@/lib/format'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { cropImage } from '@/services/image/imageCropService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Slider } from '@/components/ui/Slider'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { SettingsSection } from '@/components/layout/Panels'
import { fitAspectRect, roundRect } from '@/components/media/cropGeometry'
import { ImageResult } from '../shared/ImageResult'
import { FormatSelect } from '../shared/FormatSelect'
import { CropWorkspace, rotatedSize } from './CropWorkspace'

const TOOL_ID = 'image-crop'
const DEFAULTS = { aspectId: 'free', format: 'original' }
const INITIAL_TRANSFORM = { rotation: 0, straighten: 0, flipH: false, flipV: false }

export default function CropImagePage() {
  const { t } = useTranslation()
  const [settings, updateSettings] = useToolSettings(TOOL_ID, DEFAULTS)
  const [file, setFile] = useState(null)
  const [transform, setTransform] = useState(INITIAL_TRANSFORM)
  const [rect, setRect] = useState(null)
  const [zoom, setZoom] = useState(1)
  const { bitmap } = usePreviewBitmap(file)
  const aspect = IMAGE_ASPECT_RATIOS.find((item) => item.id === settings.aspectId)?.value ?? null
  const totalRotation = transform.rotation + transform.straighten
  const effectiveTransform = { rotation: totalRotation, flipH: transform.flipH, flipV: transform.flipV }

  // Crop box resets when the geometry it lives in changes.
  const resetRect = (meta, nextAspect = aspect, rotation = totalRotation) => {
    const size = rotatedSize(meta.width, meta.height, rotation)
    setRect(fitAspectRect(size.width, size.height, nextAspect, nextAspect ? 1 : 0.9))
  }

  const handleFileChange = (next) => {
    setFile(next)
    setTransform(INITIAL_TRANSFORM)
    setRect(null)
    setZoom(1)
  }

  return (
    <ToolLayout toolId={TOOL_ID}>
      <MediaToolFlow
        toolId={TOOL_ID}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={handleFileChange}
        actionLabel={t('tools.image-crop.action')}
        actionIcon={Crop}
        processingTitle={t('processing.croppingImage')}
        successMessage="toasts.imageCropped"
        canProcess={Boolean(rect && rect.width >= 1 && rect.height >= 1)}
        renderPreview={({ meta }) => (
          <RectInitializer meta={meta} rect={rect} onInit={() => resetRect(meta)}>
            {rect && (
              <CropWorkspace bitmap={bitmap} meta={meta} transform={effectiveTransform} rect={rect} onRectChange={setRect} aspect={aspect} zoom={zoom} />
            )}
          </RectInitializer>
        )}
        renderSettings={({ meta }) => {
          const applyTransform = (patch) => {
            const next = { ...transform, ...patch }
            setTransform(next)
            resetRect(meta, aspect, next.rotation + next.straighten)
          }
          return (
            <>
              <SettingsSection title={t('crop.aspectRatio')}>
                <SegmentedControl
                  wrap
                  value={settings.aspectId}
                  onChange={(aspectId) => {
                    updateSettings({ aspectId })
                    resetRect(meta, IMAGE_ASPECT_RATIOS.find((item) => item.id === aspectId)?.value ?? null)
                  }}
                  options={IMAGE_ASPECT_RATIOS.map((ratio) => ({ value: ratio.id, label: ratio.label ?? t('crop.free') }))}
                />
                {rect && (
                  <p className="tabular rounded-md bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                    {t('crop.selection')}: <span className="font-semibold text-text">{formatDimensions(Math.round(rect.width), Math.round(rect.height))}</span>
                  </p>
                )}
              </SettingsSection>
              <SettingsSection title={t('crop.transform')}>
                <div className="flex flex-wrap gap-1.5">
                  <IconButton icon={RotateCcwSquare} label={t('crop.rotateLeft')} variant="secondary" onClick={() => applyTransform({ rotation: (transform.rotation + 270) % 360 })} />
                  <IconButton icon={RotateCwSquare} label={t('crop.rotateRight')} variant="secondary" onClick={() => applyTransform({ rotation: (transform.rotation + 90) % 360 })} />
                  <IconButton icon={FlipHorizontal2} label={t('crop.flipHorizontal')} variant="secondary" active={transform.flipH} aria-pressed={transform.flipH} onClick={() => applyTransform({ flipH: !transform.flipH })} />
                  <IconButton icon={FlipVertical2} label={t('crop.flipVertical')} variant="secondary" active={transform.flipV} aria-pressed={transform.flipV} onClick={() => applyTransform({ flipV: !transform.flipV })} />
                </div>
                <Slider
                  label={t('crop.straighten')}
                  value={transform.straighten}
                  min={-45}
                  max={45}
                  origin={0}
                  onChange={(straighten) => applyTransform({ straighten })}
                  formatValue={(value) => `${value}°`}
                  onDoubleClick={() => applyTransform({ straighten: 0 })}
                />
                <Slider label={t('crop.zoom')} value={zoom} min={1} max={3} step={0.1} onChange={setZoom} formatValue={(value) => `${Math.round(value * 100)}%`} />
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={RotateCcw}
                  className="self-start"
                  onClick={() => {
                    setTransform(INITIAL_TRANSFORM)
                    setZoom(1)
                    resetRect(meta, aspect, 0)
                  }}
                >
                  {t('common.reset')}
                </Button>
              </SettingsSection>
              <SettingsSection title={t('settings.output')}>
                <FormatSelect value={settings.format} onChange={(format) => updateSettings({ format })} formats={CONVERTIBLE_FORMATS} sourceFormat={meta?.format} />
              </SettingsSection>
            </>
          )
        }}
        onProcess={({ file: source, signal, onProgress }) =>
          cropImage(source, { rect: roundRect(rect), ...effectiveTransform, format: settings.format, quality: 92 }, { signal, onProgress })
        }
        renderResult={(context) => <ImageResult {...context} title={t('result.cropComplete')} suffix="cropped" compare={false} />}
      />
    </ToolLayout>
  )
}

/** Initializes the crop rect once metadata is available. */
function RectInitializer({ meta, rect, onInit, children }) {
  useEffect(() => {
    if (!rect && meta) onInit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, rect])
  return children
}
