import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UPLOAD_PROFILES } from '@/constants/fileConstraints'
import { usePreviewBitmap } from '@/hooks/usePreviewBitmap'
import { pixelateCanvas } from '@/services/image/adjustments'
import { blurWithFocus, monoCanvas } from '@/services/image/effectExtras'
import { toCanvas, transformCanvas } from '@/services/image/canvas'
import { applyImageEffect } from '@/services/image/imageEffectsService'
import { readImageInfo } from '@/services/image/imageInfoService'
import { useToolSettings } from '@/store/toolSettingsStore'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { MediaToolFlow } from '@/components/layout/MediaToolFlow'
import { MediaStage } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { LoadingState } from '@/components/feedback/States'
import { ImageResult } from '../shared/ImageResult'

/**
 * Preview renderer per effect — uses the exact functions the worker uses,
 * with sizes relative to the image so the downscaled preview matches the export.
 */
export const EFFECT_PREVIEWS = {
  blur: (source, settings) => blurWithFocus(toCanvas(source), settings),
  pixelate: (source, settings) => pixelateCanvas(toCanvas(source), Math.max(2, (settings.amount / 100) * Math.min(source.width, source.height) * 0.1)),
  grayscale: (source, settings) => monoCanvas(toCanvas(source), settings),
  rotate: (source, settings) => transformCanvas(source, { rotation: settings.rotation }),
  flip: (source, settings) => transformCanvas(source, { flipH: settings.flipH, flipV: settings.flipV }),
}

function EffectPreview({ bitmap, effect, settings, onPoint }) {
  const { t } = useTranslation()
  if (!bitmap) {
    return (
      <MediaStage>
        <LoadingState />
      </MediaStage>
    )
  }
  return (
    <MediaStage checkerboard>
      <div
        className={onPoint ? 'relative cursor-crosshair' : 'relative'}
        onClick={
          onPoint
            ? (event) => {
                const box = event.currentTarget.getBoundingClientRect()
                onPoint({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height })
              }
            : undefined
        }
      >
        <CanvasView
          className="block h-auto max-h-[62vh] w-auto max-w-full"
          deps={[bitmap, settings]}
          draw={() => EFFECT_PREVIEWS[effect](bitmap, settings)}
          label={t('common.preview')}
        />
      </div>
    </MediaStage>
  )
}

/**
 * Shared page for single-step effects (blur, pixelate, grayscale, rotate, flip).
 * @param {{ toolId, effect, defaults, renderControls, icon, suffix, onPreviewPoint? }} props
 * `onPreviewPoint(settings)` returns `({ x, y }) => patch` to make the preview clickable (0–1 coords), or null.
 */
export function EffectToolPage({ toolId, effect, defaults, renderControls, icon, suffix, onPreviewPoint }) {
  const { t } = useTranslation()
  const [stored, updateSettings] = useToolSettings(toolId, defaults)
  const settings = { ...defaults, ...stored }
  const pointHandler = onPreviewPoint?.(settings)
  const [file, setFile] = useState(null)
  const { bitmap } = usePreviewBitmap(file, 1200)

  return (
    <ToolLayout toolId={toolId}>
      <MediaToolFlow
        toolId={toolId}
        profile={UPLOAD_PROFILES.image}
        loadMeta={readImageInfo}
        onFileChange={setFile}
        actionLabel={t(`tools.${toolId}.action`)}
        actionIcon={icon}
        processingTitle={t('processing.applyingEffect')}
        successMessage="toasts.effectApplied"
        renderPreview={() => <EffectPreview bitmap={bitmap} effect={effect} settings={settings} onPoint={pointHandler ? (point) => updateSettings(pointHandler(point)) : undefined} />}
        renderSettings={() => renderControls({ settings, updateSettings })}
        onProcess={({ file: source, signal, onProgress }) => applyImageEffect(source, { effect, ...settings }, { signal, onProgress })}
        renderResult={(context) => <ImageResult {...context} title={t('result.effectComplete')} suffix={suffix} compare={effect !== 'rotate'} />}
      />
    </ToolLayout>
  )
}
