import { AppError, ERROR_CODES } from '@/lib/errors'
import { probeMedia } from './ffmpeg/ffmpegClient'

function readWithVideoElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
    }
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, 8000)
    video.onloadedmetadata = () => {
      clearTimeout(timeout)
      const result = {
        duration: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        playable: video.videoWidth > 0,
      }
      cleanup()
      resolve(result)
    }
    video.onerror = () => {
      clearTimeout(timeout)
      cleanup()
      reject(new Error('unplayable'))
    }
    video.src = url
  })
}

/**
 * Read duration and dimensions. Uses the browser's own decoder first (instant)
 * and falls back to probing with FFmpeg for formats like AVI/MKV.
 */
export async function readVideoMetadata(file) {
  try {
    const meta = await readWithVideoElement(file)
    if (meta.playable && meta.duration) return meta
  } catch {
    /* fall through to FFmpeg probe */
  }
  const probed = await probeMedia(file)
  if (!probed.hasVideo && !probed.duration) throw new AppError(ERROR_CODES.CORRUPTED_FILE)
  return { duration: probed.duration, width: probed.width, height: probed.height, playable: false }
}
