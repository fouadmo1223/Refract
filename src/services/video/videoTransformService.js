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

/** Largest w×h rectangle inside a rotated frame (no empty corners). */
function inscribed(width, height, radians) {
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  if (sin < 1e-6) return { width, height }
  const shortSide = Math.min(width, height)
  const longSide = Math.max(width, height)
  if (shortSide <= 2 * sin * cos * longSide) {
    const half = shortSide / 2
    return width >= height ? { width: half / sin, height: half / cos } : { width: half / cos, height: half / sin }
  }
  const cos2 = cos * cos - sin * sin
  return { width: (width * cos - height * sin) / cos2, height: (height * cos - width * sin) / cos2 }
}

/**
 * Rotate by 0/90/180/270 degrees, optionally straighten by a small extra
 * angle (-45…45°, corners filled with a colour or cropped away) and flip.
 * @param {{ rotation: number, flipH: boolean, flipV: boolean, angle?: number, fill?: string, autoCrop?: boolean }} settings
 */
export async function rotateVideo(file, { rotation, flipH, flipV, angle = 0, fill = '#000000', autoCrop = true }, meta, options) {
  const filters = []
  if (rotation === 90) filters.push('transpose=1')
  if (rotation === 180) filters.push('hflip', 'vflip')
  if (rotation === 270) filters.push('transpose=2')
  if (flipH) filters.push('hflip')
  if (flipV) filters.push('vflip')
  const swapped = rotation === 90 || rotation === 270
  let width = swapped ? meta?.height : meta?.width
  let height = swapped ? meta?.width : meta?.height
  if (angle && width && height) {
    const radians = (angle * Math.PI) / 180
    const color = fill.replace('#', '0x')
    if (autoCrop) {
      const inner = inscribed(width, height, radians)
      width = even(Math.floor(inner.width))
      height = even(Math.floor(inner.height))
      filters.push(`rotate=${radians.toFixed(5)}:c=${color}`, `crop=${width}:${height}`)
    } else {
      filters.push(`rotate=${radians.toFixed(5)}:ow=rotw(${radians.toFixed(5)}):oh=roth(${radians.toFixed(5)}):c=${color}`, 'scale=trunc(iw/2)*2:trunc(ih/2)*2', 'setsar=1')
      const sin = Math.abs(Math.sin(radians))
      const cos = Math.abs(Math.cos(radians))
      ;[width, height] = [even(width * cos + height * sin), even(width * sin + height * cos)]
    }
  }
  if (!filters.length) filters.push('null')
  const result = await runVideoFilter(file, filters.join(','), meta, options)
  return { ...result, width, height, duration: meta?.duration }
}

/**
 * Change the frame rate. `drop` repeats/drops frames (fast); `blend` mixes
 * neighbouring frames; `motion` estimates in-between frames (smoothest, slow).
 */
export async function changeVideoFps(file, { fps, method = 'drop' }, meta, options) {
  const filter = method === 'motion' ? `minterpolate=fps=${fps}:mi_mode=mci:mc_mode=obmc:me_mode=bidir` : method === 'blend' ? `minterpolate=fps=${fps}:mi_mode=blend` : `fps=${fps}`
  const result = await runVideoFilter(file, filter, meta, options)
  return { ...result, width: meta?.width, height: meta?.height, duration: meta?.duration }
}
