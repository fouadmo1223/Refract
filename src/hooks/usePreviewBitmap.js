import { useEffect, useState } from 'react'

/**
 * Decode a downscaled ImageBitmap for interactive previews (crop, editor,
 * watermark). Full resolution is only decoded at export time, which keeps
 * live previews fast and memory-friendly. The bitmap is closed on change/unmount.
 */
export function usePreviewBitmap(file, maxDimension = 1600) {
  const [state, setState] = useState({ bitmap: null, error: null })

  useEffect(() => {
    if (!file) return undefined
    let cancelled = false
    let created = null
    ;(async () => {
      try {
        const full = await createImageBitmap(file, { imageOrientation: 'from-image' })
        const scale = Math.min(1, maxDimension / Math.max(full.width, full.height))
        if (scale < 1) {
          created = await createImageBitmap(full, {
            resizeWidth: Math.round(full.width * scale),
            resizeHeight: Math.round(full.height * scale),
            resizeQuality: 'high',
          })
          full.close()
        } else {
          created = full
        }
        if (cancelled) created.close()
        else setState({ bitmap: created, error: null })
      } catch (error) {
        if (!cancelled) setState({ bitmap: null, error })
      }
    })()
    return () => {
      cancelled = true
      created?.close()
      setState({ bitmap: null, error: null })
    }
  }, [file, maxDimension])

  return state
}
