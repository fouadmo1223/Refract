import { canvasToBlob } from '@/services/image/canvas'
import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, encodeArgsFor, reencodeFormatFor, seconds } from './encodingArgs'

/**
 * Text and logo overlays are rendered by the browser's canvas (full Unicode,
 * Arabic shaping, any installed font) into a transparent PNG at the video's
 * size, then composited by FFmpeg. This avoids shipping fonts into FFmpeg.
 *
 * @param {(context: CanvasRenderingContext2D, width: number, height: number) => void} draw
 */
export async function renderOverlayImage(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  return canvasToBlob(canvas, 'image/png')
}

/**
 * Composite a transparent PNG over the video, optionally only between start and end seconds.
 * @param {{ start?: number, end?: number }} timing
 */
export async function overlayImageOnVideo(file, overlay, meta, { start, end } = {}, { onProgress, signal } = {}) {
  const format = reencodeFormatFor(file)
  const output = `output.${format}`
  const timed = Number.isFinite(start) && Number.isFinite(end) && end > start
  const overlayFilter = `[0:v][1:v]overlay=0:0${timed ? `:enable='between(t,${seconds(start)},${seconds(end)})'` : ''}[v]`
  const blob = await runFFmpeg({
    inputs: [{ file }, { file: overlay, name: 'overlay.png' }],
    buildArgs: ([video, image]) => ['-i', video, '-i', image, '-filter_complex', overlayFilter, '-map', '[v]', '-map', '0:a?', ...encodeArgsFor(format), output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: meta?.duration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: meta?.duration }
}
