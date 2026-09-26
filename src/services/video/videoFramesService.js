import { AppError, ERROR_CODES } from '@/lib/errors'
import { canvasToBlob } from '@/services/image/canvas'
import { runFFmpeg } from './ffmpeg/ffmpegClient'

export const MAX_EXTRACTED_FRAMES = 300

const FRAME_TYPES = { jpeg: { ext: 'jpg', mime: 'image/jpeg', args: ['-q:v', '2'] }, png: { ext: 'png', mime: 'image/png', args: [] }, webp: { ext: 'webp', mime: 'image/webp', args: ['-quality', '90'] } }

/** Capture the current frame of a <video> element as an image Blob. */
export async function captureVideoFrame(video, { format = 'png', quality = 92 } = {}) {
  if (!video?.videoWidth) throw new AppError(ERROR_CODES.CORRUPTED_FILE)
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  const mime = FRAME_TYPES[format]?.mime ?? 'image/png'
  const blob = await canvasToBlob(canvas, mime, quality / 100)
  return { blob, format, width: canvas.width, height: canvas.height }
}

function seekTo(video, time) {
  return new Promise((resolve, reject) => {
    const handleSeeked = () => {
      video.removeEventListener('seeked', handleSeeked)
      resolve()
    }
    video.addEventListener('seeked', handleSeeked)
    video.onerror = reject
    video.currentTime = time
  })
}

/**
 * Generate small thumbnails across the video for timeline filmstrips.
 * Returns object URLs — callers must revoke them.
 */
export async function generateFilmstrip(file, { count = 10, height = 48, signal } = {}) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'auto'
  video.src = url
  const frames = []
  try {
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve
      video.onerror = reject
    })
    const width = Math.round((video.videoWidth / video.videoHeight) * height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    for (let index = 0; index < count; index += 1) {
      if (signal?.aborted) break
      await seekTo(video, ((index + 0.5) / count) * video.duration)
      context.drawImage(video, 0, 0, width, height)
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.6)
      frames.push(URL.createObjectURL(blob))
    }
    return frames
  } catch {
    frames.forEach((frame) => URL.revokeObjectURL(frame))
    return []
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

/**
 * Extract frames at a fixed rate with FFmpeg.
 * @param {{ interval: number, format: 'jpeg'|'png'|'webp' }} settings interval = seconds between frames
 */
export async function extractFrames(file, settings, meta, { onProgress, signal } = {}) {
  const type = FRAME_TYPES[settings.format] ?? FRAME_TYPES.jpeg
  const pattern = `frame_%04d.${type.ext}`
  const frames = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-an', '-vf', `fps=1/${settings.interval}`, '-frames:v', String(MAX_EXTRACTED_FRAMES), ...type.args, pattern],
    output: pattern,
    outputType: type.mime,
    collectPrefix: 'frame_',
    expectedDuration: meta?.duration,
    onProgress,
    signal,
  })
  return { frames, format: settings.format, width: meta?.width, height: meta?.height }
}
