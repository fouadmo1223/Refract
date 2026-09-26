import { AppError, ERROR_CODES } from '@/lib/errors'
import { runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, copyFormatFor, encodeArgsFor, reencodeFormatFor, seconds } from './encodingArgs'

export const MIN_CLIP_DURATION = 0.1

export function validateTimeRange(start, end, duration) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end - start < MIN_CLIP_DURATION || (duration && end > duration + 0.05)) {
    throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
  }
}

/**
 * Trim a video to [start, end] seconds.
 * - fast: stream copy — instant, but cuts snap to the nearest keyframe.
 * - precise: re-encode — frame-accurate, slower.
 */
export async function trimVideo(file, { start, end, precise }, meta, { onProgress, signal } = {}) {
  validateTimeRange(start, end, meta?.duration)
  const duration = end - start
  const format = precise ? reencodeFormatFor(file) : copyFormatFor(file)
  const output = `output.${format}`

  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) =>
      precise
        ? ['-ss', seconds(start), '-i', input, '-t', seconds(duration), ...encodeArgsFor(format), output]
        : ['-ss', seconds(start), '-i', input, '-t', seconds(duration), '-c', 'copy', '-avoid_negative_ts', 'make_zero', '-map', '0', output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: duration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration }
}
