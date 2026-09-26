import { AppError, ERROR_CODES } from '@/lib/errors'
import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, encodeArgsFor, even, reencodeFormatFor } from './encodingArgs'

/** Run a single video-filter re-encode (crop, scale, rotate…). */
function runVideoFilter(file, filter, meta, { onProgress, signal, expectedDuration } = {}) {
  const format = reencodeFormatFor(file)
  const output = `output.${format}`
  return runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-vf', filter, ...encodeArgsFor(format), output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: expectedDuration ?? meta?.duration,
    onProgress,
    signal,
  }).then((blob) => ({ blob, format }))
}

/**
 * Crop a video. `rect` is in source pixels; values are forced even for H.264.
 */
export async function cropVideo(file, rect, meta, options) {
  if (!rect || rect.width < 2 || rect.height < 2) throw new AppError(ERROR_CODES.INVALID_CROP)
  const width = even(Math.min(rect.width, meta.width - rect.x))
  const height = even(Math.min(rect.height, meta.height - rect.y))
  const x = Math.max(0, Math.round(rect.x))
  const y = Math.max(0, Math.round(rect.y))
  const result = await runVideoFilter(file, `crop=${width}:${height}:${x}:${y}`, meta, options)
  return { ...result, width, height, duration: meta?.duration }
}

/** Resize a video to exact (even) dimensions. */
export async function resizeVideo(file, { width, height }, meta, options) {
  if (!(width >= 2 && height >= 2)) throw new AppError(ERROR_CODES.INVALID_DIMENSIONS)
  const w = even(width)
  const h = even(height)
  const result = await runVideoFilter(file, `scale=${w}:${h}:flags=lanczos,setsar=1`, meta, options)
  return { ...result, width: w, height: h, duration: meta?.duration }
}

/**
 * Rotate by 0/90/180/270 degrees and optionally flip.
 */
export async function rotateVideo(file, { rotation, flipH, flipV }, meta, options) {
  const filters = []
  if (rotation === 90) filters.push('transpose=1')
  if (rotation === 180) filters.push('hflip', 'vflip')
  if (rotation === 270) filters.push('transpose=2')
  if (flipH) filters.push('hflip')
  if (flipV) filters.push('vflip')
  if (!filters.length) filters.push('null')
  const swapped = rotation === 90 || rotation === 270
  const result = await runVideoFilter(file, filters.join(','), meta, options)
  return { ...result, width: swapped ? meta?.height : meta?.width, height: swapped ? meta?.width : meta?.height, duration: meta?.duration }
}

/** Change the frame rate. */
export async function changeVideoFps(file, { fps }, meta, options) {
  const result = await runVideoFilter(file, `fps=${fps}`, meta, options)
  return { ...result, width: meta?.width, height: meta?.height, duration: meta?.duration }
}
