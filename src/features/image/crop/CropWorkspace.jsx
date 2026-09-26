import { useTranslation } from 'react-i18next'
import { transformCanvas } from '@/services/image/canvas'
import { MediaStage } from '@/components/layout/Panels'
import { CanvasView } from '@/components/media/CanvasView'
import { CropArea } from '@/components/media/CropArea'
import { LoadingState } from '@/components/feedback/States'

/** Size of an image after rotating by `rotation` degrees. */
export function rotatedSize(width, height, rotation) {
  const radians = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  return { width: Math.round(width * cos + height * sin), height: Math.round(width * sin + height * cos) }
}

/**
 * Crop stage: shows the rotated/flipped preview with a crop overlay whose
 * coordinates are in full-resolution pixels of the transformed image.
 */
export function CropWorkspace({ bitmap, meta, transform, rect, onRectChange, onRectCommit, aspect, zoom = 1 }) {
  const { t } = useTranslation()
  if (!bitmap) {
    return (
      <MediaStage>
        <LoadingState />
      </MediaStage>
    )
  }
  const size = rotatedSize(meta.width, meta.height, transform.rotation)
  const ratio = size.width / size.height

  return (
    <MediaStage checkerboard className="block max-h-[70vh] overflow-auto">
      <CropArea
        mediaWidth={size.width}
        mediaHeight={size.height}
        rect={rect}
        onChange={onRectChange}
        onChangeEnd={onRectCommit}
        aspect={aspect}
        style={{ width: `calc(min(100%, ${(ratio * 60).toFixed(3)}vh) * ${zoom})` }}
      >
        <CanvasView
          label={t('crop.preview')}
          className="size-full"
          deps={[bitmap, transform.rotation, transform.flipH, transform.flipV]}
          draw={() => transformCanvas(bitmap, transform)}
        />
      </CropArea>
    </MediaStage>
  )
}
