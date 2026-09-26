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
 * Extract frames with FFmpeg.
 * FFmpeg always writes PNG (its MJPEG path crashes FFmpeg.wasm); JPEG/WebP
 * are then encoded in the browser, which also applies the quality setting.
 * @param {{ mode?: 'interval'|'count', interval: number, count?: number, format: 'jpeg'|'png'|'webp',
 *   start?: number, end?: number|null, maxWidth?: number|null, quality?: number }} settings
 *   interval = seconds between frames; count = N frames spread evenly over the range.
 */
export async function extractFrames(file, settings, meta, { onProgress, signal } = {}) {
  const type = FRAME_TYPES[settings.format] ?? FRAME_TYPES.jpeg
  const start = Math.max(0, settings.start ?? 0)
  const end = settings.end ?? meta?.duration
  const length = end ? Math.max(0.1, end - start) : null
  const count = Math.max(1, settings.count ?? 10)
  const rate = settings.mode === 'count' && length ? count / length : 1 / settings.interval
  const limit = settings.mode === 'count' ? Math.min(MAX_EXTRACTED_FRAMES, count) : MAX_EXTRACTED_FRAMES
  const partial = length && (start > 0 || end < (meta?.duration ?? Infinity) - 0.05)
  const filters = [
    ...(partial ? [`trim=start=${start.toFixed(3)}:end=${end.toFixed(3)}`, 'setpts=PTS-STARTPTS'] : []),
    `fps=${rate.toFixed(6)}`,
    // Cap inside the graph so FFmpeg still reads to the end of the input.
    `select='lt(n\,${limit})'`,
    ...(settings.maxWidth ? [`scale='min(${settings.maxWidth}\,iw)':-2`] : []),
  ]
  const pngs = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-an', '-vf', filters.join(','), 'frame_%04d.png'],
    output: 'frame_%04d.png',
    outputType: 'image/png',
    collectPrefix: 'frame_',
    expectedDuration: meta?.duration,
    onProgress: (value, stage) => onProgress?.(value == null ? null : value * (settings.format === 'png' ? 1 : 0.85), stage),
    signal,
  })
  if (settings.format === 'png') return { frames: pngs, format: 'png', width: meta?.width, height: meta?.height }

  const frames = []
  for (const [index, frame] of pngs.entries()) {
    if (signal?.aborted) break
    const bitmap = await createImageBitmap(frame.blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d').drawImage(bitmap, 0, 0)
    bitmap.close()
    const blob = await canvasToBlob(canvas, type.mime, (settings.quality ?? 90) / 100)
    frames.push({ name: frame.name.replace(/\.png$/, `.${type.ext}`), blob })
    onProgress?.(0.85 + (0.15 * (index + 1)) / pngs.length, 'finalizing')
  }
  return { frames, format: settings.format, width: meta?.width, height: meta?.height }
}
