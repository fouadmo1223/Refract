import { AppError, ERROR_CODES } from '@/lib/errors'
import { canvasToBlob } from '@/services/image/canvas'
import { runFFmpeg } from './ffmpeg/ffmpegClient'

export const MAX_EXTRACTED_FRAMES = 300

const FRAME_TYPES = { jpeg: { ext: 'jpg', mime: 'image/jpeg', args: ['-q:v', '2'] }, png: { ext: 'png', mime: 'image/png', args: [] }, webp: { ext: 'webp', mime: 'image/webp', args: ['-quality', '90'] } }

/** Capture the current frame of a <video> element as an image Blob. */
export async function captureVideoFrame(video, { format = 'png', quality = 92, maxWidth = 0 } = {}) {
  if (!video?.videoWidth) throw new AppError(ERROR_CODES.CORRUPTED_FILE)
  const scale = maxWidth && video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  const context = canvas.getContext('2d')
  context.imageSmoothingQuality = 'high'
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
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

export const DEFAULT_SHEET = { columns: 4, rows: 4, width: 1920, gap: 8, background: '#111111', timestamps: true, header: true }

function formatStamp(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Contact sheet: a grid of frames sampled evenly across the video, with optional
 * timestamps and a header line (file name, duration, resolution). Browser-only.
 */
export async function createContactSheet(file, settings, { onProgress, signal } = {}) {
  const s = { ...DEFAULT_SHEET, ...settings }
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'auto'
  video.src = url
  try {
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve
      video.onerror = () => reject(new AppError(ERROR_CODES.CORRUPTED_FILE))
    })
    const count = s.columns * s.rows
    const cellWidth = Math.floor((s.width - s.gap * (s.columns + 1)) / s.columns)
    const cellHeight = Math.round((cellWidth * video.videoHeight) / video.videoWidth)
    const headerHeight = s.header ? Math.round(s.width * 0.035) : 0
    const canvas = document.createElement('canvas')
    canvas.width = s.width
    canvas.height = headerHeight + s.gap * (s.rows + 1) + cellHeight * s.rows
    const context = canvas.getContext('2d')
    context.fillStyle = s.background
    context.fillRect(0, 0, canvas.width, canvas.height)
    const light = parseInt(s.background.slice(1, 3), 16) * 0.299 + parseInt(s.background.slice(3, 5), 16) * 0.587 + parseInt(s.background.slice(5, 7), 16) * 0.114 > 150
    if (s.header) {
      context.fillStyle = light ? '#111111' : '#F5F5F5'
      context.font = `600 ${Math.round(headerHeight * 0.45)}px system-ui, sans-serif`
      context.textBaseline = 'middle'
      const info = `${file.name}  ·  ${formatStamp(video.duration)}  ·  ${video.videoWidth}×${video.videoHeight}`
      context.fillText(info, s.gap, s.gap / 2 + headerHeight / 2, canvas.width - s.gap * 2)
    }
    const stampSize = Math.max(10, Math.round(cellHeight * 0.1))
    for (let index = 0; index < count; index += 1) {
      if (signal?.aborted) throw new AppError(ERROR_CODES.CANCELED)
      const time = ((index + 0.5) / count) * video.duration
      await seekTo(video, time)
      const column = index % s.columns
      const row = Math.floor(index / s.columns)
      const x = s.gap + column * (cellWidth + s.gap)
      const y = headerHeight + s.gap + row * (cellHeight + s.gap)
      context.drawImage(video, x, y, cellWidth, cellHeight)
      if (s.timestamps) {
        const label = formatStamp(time)
        context.font = `600 ${stampSize}px ui-monospace, monospace`
        const padding = stampSize * 0.35
        const textWidth = context.measureText(label).width
        context.fillStyle = 'rgba(0,0,0,0.6)'
        context.fillRect(x + cellWidth - textWidth - padding * 3, y + cellHeight - stampSize - padding * 2.5, textWidth + padding * 2, stampSize + padding * 1.5)
        context.fillStyle = '#FFFFFF'
        context.textBaseline = 'top'
        context.fillText(label, x + cellWidth - textWidth - padding * 2, y + cellHeight - stampSize - padding * 1.75)
      }
      onProgress?.((index + 1) / count, 'processing')
    }
    const mime = FRAME_TYPES[s.format]?.mime ?? 'image/jpeg'
    const blob = await canvasToBlob(canvas, mime, (s.quality ?? 90) / 100)
    return { blob, format: s.format ?? 'jpeg', width: canvas.width, height: canvas.height, time: 0 }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
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
