import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyAdjustments } from '@/services/image/adjustments'
import { cropCanvas, transformCanvas } from '@/services/image/canvas'
import { MediaStage } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { CropArea } from '@/components/media/CropArea'
import { LoadingState } from '@/components/feedback/States'

/**
 * Live editor canvas. Works on a downscaled bitmap so adjustments update in
 * real time; export re-applies the same pipeline at full resolution.
 * Holding "Compare" shows the unedited image.
 */
export function EditorPreview({ bitmap, meta, state, cropMode, draftCrop, onDraftCropChange, showOriginal }) {
  const { t } = useTranslation()
  const scale = bitmap ? bitmap.width / meta.width : 1

  // Transform is cheap to cache between slider moves; adjustments run per frame.
  const transformed = useMemo(() => (bitmap ? transformCanvas(bitmap, state.transform) : null), [bitmap, state.transform])

  if (!bitmap || !transformed) {
    return (
      <MediaStage>
        <LoadingState />
      </MediaStage>
    )
  }

  if (cropMode && draftCrop) {
    const fullWidth = transformed.width / scale
    const fullHeight = transformed.height / scale
    return (
      <MediaStage checkerboard>
        <CropArea
          mediaWidth={fullWidth}
          mediaHeight={fullHeight}
          rect={draftCrop}
          onChange={onDraftCropChange}
          style={{ width: `min(100%, ${((fullWidth / fullHeight) * 60).toFixed(3)}vh)` }}
        >
          <CanvasView className="size-full" deps={[transformed]} draw={() => transformed} label={t('editor.preview')} />
        </CropArea>
      </MediaStage>
    )
  }

  const draw = () => {
    if (showOriginal) return bitmap
    let canvas = transformed
    if (state.crop) {
      canvas = cropCanvas(canvas, {
        x: state.crop.x * scale,
        y: state.crop.y * scale,
        width: Math.max(1, state.crop.width * scale),
        height: Math.max(1, state.crop.height * scale),
      })
    }
    return applyAdjustments(canvas, state.adjustments)
  }

  return (
    <MediaStage checkerboard>
      <CanvasView
        className="h-auto max-h-[62vh] w-auto max-w-full"
        deps={[transformed, state.crop, state.adjustments, showOriginal]}
        draw={draw}
        label={t('editor.preview')}
      />
    </MediaStage>
  )
}

export function useCompareToggle() {
  const [showOriginal, setShowOriginal] = useState(false)
  const bind = {
    onPointerDown: () => setShowOriginal(true),
    onPointerUp: () => setShowOriginal(false),
    onPointerLeave: () => setShowOriginal(false),
    onKeyDown: (event) => (event.key === ' ' || event.key === 'Enter') && setShowOriginal(true),
    onKeyUp: () => setShowOriginal(false),
  }
  return [showOriginal, bind]
}
