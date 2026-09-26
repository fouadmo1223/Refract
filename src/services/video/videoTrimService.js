import { AppError, ERROR_CODES } from '@/lib/errors'
import { probeMedia, runFFmpeg } from './ffmpeg/ffmpegClient'
import { OUTPUT_TYPES, copyFormatFor, encodeArgsFor, reencodeFormatFor, seconds } from './encodingArgs'

export const MIN_CLIP_DURATION = 0.1

export function validateTimeRange(start, end, duration) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end - start < MIN_CLIP_DURATION || (duration && end > duration + 0.05)) {
    throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
  }
}

/**
 * Trim a video.
 * - `keep` (default): keep [start, end]. Fast = stream copy (cuts snap to
 *   keyframes); precise = frame-accurate re-encode. Fades force precise.
 * - `remove`: cut [start, end] out and join what's before and after (re-encoded).
 * @param {{ start: number, end: number, precise: boolean, mode?: 'keep'|'remove', fadeIn?: number, fadeOut?: number }} settings
 */
export async function trimVideo(file, { start, end, precise, mode = 'keep', fadeIn = 0, fadeOut = 0 }, meta, { onProgress, signal } = {}) {
  validateTimeRange(start, end, meta?.duration)
  if (mode === 'remove') return removeSection(file, { start, end, fadeIn, fadeOut }, meta, { onProgress, signal })

  const duration = end - start
  const reencode = precise || fadeIn > 0 || fadeOut > 0
  const format = reencode ? reencodeFormatFor(file) : copyFormatFor(file)
  const output = `output.${format}`
  const video = []
  const audio = []
  if (fadeIn > 0) {
    video.push(`fade=t=in:st=0:d=${seconds(fadeIn)}`)
    audio.push(`afade=t=in:st=0:d=${seconds(fadeIn)}`)
  }
  if (fadeOut > 0) {
    video.push(`fade=t=out:st=${seconds(Math.max(0, duration - fadeOut))}:d=${seconds(fadeOut)}`)
    audio.push(`afade=t=out:st=${seconds(Math.max(0, duration - fadeOut))}:d=${seconds(fadeOut)}`)
  }
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) =>
      reencode
        ? ['-ss', seconds(start), '-i', input, '-t', seconds(duration), ...(video.length ? ['-vf', video.join(','), '-af', audio.join(',')] : []), ...encodeArgsFor(format), output]
        : ['-ss', seconds(start), '-i', input, '-t', seconds(duration), '-c', 'copy', '-avoid_negative_ts', 'make_zero', '-map', '0', output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: duration,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration }
}

/** Cut out [start, end] and join the remaining parts. */
async function removeSection(file, { start, end, fadeIn, fadeOut }, meta, { onProgress, signal }) {
  const total = meta?.duration
  if (!total) throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
  const { hasAudio } = await probeMedia(file, { signal })
  const parts = []
  if (start > 0.05) parts.push([0, start])
  if (end < total - 0.05) parts.push([end, total])
  if (!parts.length) throw new AppError(ERROR_CODES.INVALID_TIME_RANGE)
  const length = parts.reduce((sum, [a, b]) => sum + (b - a), 0)

  const chains = parts.map(
    ([a, b], index) =>
      `[0:v]trim=${seconds(a)}:${seconds(b)},setpts=PTS-STARTPTS[v${index}]` + (hasAudio ? `;[0:a]atrim=${seconds(a)}:${seconds(b)},asetpts=PTS-STARTPTS[a${index}]` : ''),
  )
  const inputs = parts.map((_, index) => (hasAudio ? `[v${index}][a${index}]` : `[v${index}]`)).join('')
  const fadeV = []
  const fadeA = []
  if (fadeIn > 0) {
    fadeV.push(`fade=t=in:st=0:d=${seconds(fadeIn)}`)
    fadeA.push(`afade=t=in:st=0:d=${seconds(fadeIn)}`)
  }
  if (fadeOut > 0) {
    fadeV.push(`fade=t=out:st=${seconds(Math.max(0, length - fadeOut))}:d=${seconds(fadeOut)}`)
    fadeA.push(`afade=t=out:st=${seconds(Math.max(0, length - fadeOut))}:d=${seconds(fadeOut)}`)
  }
  const graph = [
    ...chains,
    `${inputs}concat=n=${parts.length}:v=1:a=${hasAudio ? 1 : 0}[vc]${hasAudio ? '[ac]' : ''}`,
    `[vc]${fadeV.length ? `${fadeV.join(',')},` : ''}format=yuv420p[v]`,
    ...(hasAudio ? [`[ac]${fadeA.join(',') || 'anull'}[a]`] : []),
  ].join(';')

  const format = reencodeFormatFor(file)
  const output = `output.${format}`
  const blob = await runFFmpeg({
    inputs: [{ file }],
    buildArgs: ([input]) => ['-i', input, '-filter_complex', graph, '-map', '[v]', ...(hasAudio ? ['-map', '[a]'] : []), ...encodeArgsFor(format), output],
    output,
    outputType: OUTPUT_TYPES[format],
    expectedDuration: length,
    onProgress,
    signal,
  })
  return { blob, format, width: meta?.width, height: meta?.height, duration: length }
}
