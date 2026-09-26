import { useEffect, useState } from 'react'
import { generateFilmstrip } from '@/services/video/videoFramesService'

/** Thumbnails for timeline filmstrips. Object URLs are revoked on change/unmount. */
export function useFilmstrip(file, { enabled = true, count = 10 } = {}) {
  const [frames, setFrames] = useState([])

  useEffect(() => {
    if (!file || !enabled) return undefined
    const controller = new AbortController()
    let generated = []
    generateFilmstrip(file, { count, signal: controller.signal }).then((urls) => {
      generated = urls
      if (controller.signal.aborted) urls.forEach((url) => URL.revokeObjectURL(url))
      else setFrames(urls)
    })
    return () => {
      controller.abort()
      generated.forEach((url) => URL.revokeObjectURL(url))
      setFrames([])
    }
  }, [file, enabled, count])

  return frames
}
