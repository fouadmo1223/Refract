import { useEffect, useState } from 'react'
import { renderPdfThumbnails } from '@/services/pdf/pdfService'

/**
 * Page thumbnails for a PDF, filled in progressively as pages render.
 * Returns [{ url, width, height, rotation }] (sizes in points) and revokes URLs on change.
 */
export function usePdfThumbnails(file, { width = 180 } = {}) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!file) {
      setPages([])
      return undefined
    }
    const controller = new AbortController()
    const created = []
    setPages([])
    setLoading(true)
    renderPdfThumbnails(file, {
      width,
      signal: controller.signal,
      onThumb: (index, url, size) => {
        created.push(url)
        if (controller.signal.aborted) return URL.revokeObjectURL(url)
        setPages((current) => {
          const next = [...current]
          next[index] = { url, ...size }
          return next
        })
      },
    })
      .catch(() => {})
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => {
      controller.abort()
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [file, width])

  return { pages, loading }
}
